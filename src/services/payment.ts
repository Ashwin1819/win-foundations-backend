import Razorpay from 'razorpay';
import crypto from 'crypto';

// Constructed lazily (not at module load) because the Razorpay SDK throws synchronously
// if key_id/key_secret are missing — doing this eagerly would crash the entire server on
// startup whenever Razorpay isn't configured yet, not just the payment feature.
let razorpay: Razorpay | null = null;

function getRazorpayClient(): Razorpay {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay is not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

export interface RazorpayOrderResult {
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
}

/**
 * Creates a real Razorpay order for the given amount (in rupees).
 * Razorpay's API works in paise, so the amount is converted here.
 */
export async function createRazorpayOrder(
  amountInRupees: number,
  currency: string,
  notes: Record<string, string>
): Promise<RazorpayOrderResult> {
  const amountInPaise = Math.round(amountInRupees * 100);

  const order = await getRazorpayClient().orders.create({
    amount: amountInPaise,
    currency,
    receipt: notes.receipt,
    notes,
  });

  return {
    orderId: order.id,
    amount: amountInPaise,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID || '',
  };
}

function timingSafeEqualHex(expectedHex: string, actualHex: string): boolean {
  const expectedBuf = Buffer.from(expectedHex, 'utf8');
  const actualBuf = Buffer.from(actualHex || '', 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Verifies the signature Razorpay's checkout widget returns to the browser after
 * payment, per https://razorpay.com/docs/payments/payments/verify-payment-signature/
 * HMAC-SHA256 of "order_id|payment_id", keyed with the account's key secret.
 */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return timingSafeEqualHex(expected, signature);
}

/**
 * Verifies a Razorpay webhook's signature. This uses a SEPARATE secret from the
 * checkout signature above (the webhook secret configured in the Razorpay dashboard),
 * and is computed over the raw request body, not the parsed JSON.
 */
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqualHex(expected, signature);
}
