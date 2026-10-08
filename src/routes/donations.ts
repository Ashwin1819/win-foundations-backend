import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createDonationSchema, updateDonationStatusSchema } from '../types/validation';
import { formSubmissionLimiter } from '../middleware/rateLimiter';
import { sendDonationReceipt, notifyAdminNewDonation } from '../services/email';
import { generateDonationReceipt } from '../services/receipt';
import { createRazorpayOrder, verifyCheckoutSignature, verifyWebhookSignature } from '../services/payment';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

/**
 * Marks a donation as successfully paid, running the receipt/credit/email side effects.
 * Shared by both the frontend-callback verification route and the Razorpay webhook,
 * since either one could be the first (or only) signal to arrive — this is idempotent:
 * if the donation is already SUCCESS, it does nothing further.
 */
async function markDonationSuccessful(donationId: number, razorpayPaymentId: string) {
  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  if (!donation) return null;
  if (donation.paymentStatus === 'SUCCESS') return donation;

  const receiptNumber = `RCP-${donation.id}-${Date.now()}`;
  const receiptUrl = await generateDonationReceipt(
    donation.donorName,
    donation.amount + donation.tipAmount,
    receiptNumber,
    donation.donationType,
    new Date(),
    donation.pan || undefined
  );

  if (donation.campaignId) {
    await prisma.campaign.update({
      where: { id: donation.campaignId },
      data: { raisedAmount: { increment: donation.amount } }
    });
  }

  let emailStatus: 'SENT' | 'FAILED' = 'SENT';
  try {
    await sendDonationReceipt(donation.email, donation.donorName, donation.amount, receiptNumber, receiptUrl);
  } catch (error) {
    console.error('Receipt email send failed:', error);
    emailStatus = 'FAILED';
  }

  return prisma.donation.update({
    where: { id: donation.id },
    data: {
      paymentStatus: 'SUCCESS',
      transactionId: razorpayPaymentId,
      receiptNumber,
      receiptPdfUrl: receiptUrl,
      emailStatus
    }
  });
}

async function markDonationFailed(donationId: number) {
  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  // Never downgrade a donation that's already been confirmed successful.
  if (!donation || donation.paymentStatus === 'SUCCESS') return donation;
  return prisma.donation.update({ where: { id: donationId }, data: { paymentStatus: 'FAILED' } });
}

// POST /api/donations
router.post('/', formSubmissionLimiter, asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createDonationSchema.parse(req.body);

  let baseAmount: number;
  let resolvedItems: { productId: number; quantity: number; priceAtTime: number }[] = [];

  if (validatedData.mode === 'PRODUCTS') {
    const productIds = validatedData.items!.map((i) => i.productId);
    const products = await prisma.campaignProduct.findMany({
      where: { id: { in: productIds } }
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products could not be found' });
    }

    // TODO: once the real payment gateway + webhook verification is wired up, revisit
    // this. Stock is only checked here, not decremented, because decrementing at PENDING
    // (before payment is confirmed) would let abandoned carts lock out real stock with no
    // automatic release. Decrement availableQty in the webhook/verify success path instead.
    for (const item of validatedData.items!) {
      const product = products.find((p) => p.id === item.productId)!;
      if (item.quantity > product.availableQty) {
        return res.status(400).json({ error: `Only ${product.availableQty} units of "${product.name}" are available` });
      }
    }

    // Price is always taken from the database, never from the client, to prevent tampering.
    resolvedItems = validatedData.items!.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return { productId: item.productId, quantity: item.quantity, priceAtTime: product.pricePerUnit };
    });

    baseAmount = resolvedItems.reduce((sum, i) => sum + i.quantity * i.priceAtTime, 0);
  } else {
    baseAmount = validatedData.amount!;
  }

  const totalAmount = baseAmount + validatedData.tipAmount;

  // Never trust client-side validation alone — explicitly reject a zero/negative
  // computed total even though the Zod schema already blocks most ways to reach this
  // (e.g. a free/₹0-priced product would otherwise slip through).
  if (totalAmount <= 0) {
    return res.status(400).json({ error: 'Donation amount must be greater than zero' });
  }

  // Create donation record with PENDING status
  const donation = await prisma.donation.create({
    data: {
      donorName: validatedData.donorName,
      email: validatedData.email,
      phone: validatedData.phone,
      address: validatedData.address,
      pan: validatedData.pan,
      amount: baseAmount,
      tipAmount: validatedData.tipAmount,
      mode: validatedData.mode,
      donationType: validatedData.donationType,
      campaignId: validatedData.campaignId,
      paymentMethod: validatedData.paymentMethod,
      paymentStatus: 'PENDING',
      is80GEligible: !!validatedData.pan,
      items: resolvedItems.length > 0 ? {
        create: resolvedItems.map((i) => ({
          campaignProductId: i.productId,
          quantity: i.quantity,
          priceAtTime: i.priceAtTime
        }))
      } : undefined
    },
    include: { items: true }
  });

  // Create a real Razorpay order
  try {
    const order = await createRazorpayOrder(totalAmount, 'INR', {
      donationId: String(donation.id),
      receipt: `rcpt_${donation.id}`
    });

    await prisma.donation.update({
      where: { id: donation.id },
      data: { razorpayOrderId: order.orderId }
    });

    res.status(201).json({
      success: true,
      donation: { ...donation, razorpayOrderId: order.orderId },
      razorpay: {
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId
      }
    });

    // Notify admin — fire-and-forget after the response, but the outcome is still
    // persisted so a failed notification is visible in the database, not just the logs.
    notifyAdminNewDonation(validatedData.donorName, totalAmount, validatedData.donationType)
      .then(() => prisma.donation.update({
        where: { id: donation.id },
        data: { adminNotifiedStatus: 'SENT' }
      }))
      .catch(async (err) => {
        console.error('Admin notification failed:', err);
        await prisma.donation.update({
          where: { id: donation.id },
          data: { adminNotifiedStatus: 'FAILED' }
        }).catch((updateErr) => console.error('Failed to record adminNotifiedStatus:', updateErr));
      });
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    res.status(400).json({ error: 'Failed to initialize payment' });
  }
}));

// POST /api/donations/verify/:donationId
// Called by the frontend after Razorpay's checkout widget succeeds. This is NOT the
// authoritative source of truth on its own (a browser can lie) — the webhook below is
// — but it lets us confirm quickly and show the donor a receipt without waiting.
router.post('/verify/:donationId', asyncHandler(async (req: Request, res: Response) => {
  const { donationId } = req.params;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing Razorpay verification fields' });
  }

  const donation = await prisma.donation.findUnique({
    where: { id: parseInt(donationId) }
  });

  if (!donation) {
    return res.status(404).json({ error: 'Donation not found' });
  }

  if (donation.razorpayOrderId !== razorpay_order_id) {
    return res.status(400).json({ error: 'Order ID does not match this donation' });
  }

  const isValid = verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

  if (!isValid) {
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  const updatedDonation = await markDonationSuccessful(donation.id, razorpay_payment_id);

  res.json({
    success: true,
    donation: updatedDonation,
    receiptUrl: updatedDonation?.receiptPdfUrl
  });
}));

// POST /api/donations/webhook
// Razorpay's server-to-server webhook — the authoritative source of truth for payment
// status, independent of anything the browser reports. Verified with a SEPARATE secret
// (RAZORPAY_WEBHOOK_SECRET) from the checkout signature above, over the raw request body.
router.post('/webhook', asyncHandler(async (req: Request & { rawBody?: Buffer }, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;

  if (!req.rawBody || !signature || !verifyWebhookSignature(req.rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = req.body.event;
  const paymentEntity = req.body.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id;

  if (!orderId) {
    // Not an event we care about (or malformed) — acknowledge so Razorpay doesn't retry forever.
    return res.status(200).json({ received: true });
  }

  const donation = await prisma.donation.findFirst({ where: { razorpayOrderId: orderId } });
  if (!donation) {
    return res.status(200).json({ received: true });
  }

  if (event === 'payment.captured' || event === 'order.paid') {
    await markDonationSuccessful(donation.id, paymentEntity.id);
  } else if (event === 'payment.failed') {
    await markDonationFailed(donation.id);
  }

  res.status(200).json({ received: true });
}));

// GET /api/donations/all — admin only, newest first
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const donations = await prisma.donation.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      campaign: { select: { title: true } },
      items: true
    }
  });

  res.json(donations);
}));

// GET /api/donations/:id — admin only (used by the admin app's resend-receipt flow)
router.get('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const donation = await prisma.donation.findUnique({
    where: { id },
    include: {
      campaign: { select: { title: true } },
      items: true
    }
  });

  if (!donation) {
    return res.status(404).json({ error: 'Donation not found' });
  }

  res.json(donation);
}));

// PUT /api/donations/:id/status — admin only. Deliberately restricted to
// PENDING/FAILED — see updateDonationStatusSchema for why SUCCESS is excluded.
router.put('/:id/status', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateDonationStatusSchema.parse(req.body);

  const existing = await prisma.donation.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Donation not found' });
  }

  const donation = await prisma.donation.update({ where: { id }, data });

  res.json(donation);
}));

// DELETE /api/donations/:id — admin only, hard delete
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.donation.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Donation not found' });
  }

  await prisma.donation.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
