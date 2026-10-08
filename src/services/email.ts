import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@winfoundations.in',
      to,
      subject,
      html
    });
    console.log(`✓ Email sent to ${to}`);
    return result;
  } catch (error) {
    console.error(`✗ Email send failed to ${to}:`, error);
    throw error;
  }
}

export async function sendDonationReceipt(
  donorEmail: string,
  donorName: string,
  amount: number,
  receiptNumber: string,
  receiptPdfUrl?: string
) {
  const html = `
    <h2>Thank You for Your Donation</h2>
    <p>Dear ${donorName},</p>
    <p>We are grateful for your generous donation of <strong>₹${amount}</strong>.</p>
    <p>Your receipt number is: <strong>${receiptNumber}</strong></p>
    ${receiptPdfUrl ? `<p><a href="${receiptPdfUrl}">Download Receipt PDF</a></p>` : ''}
    <p>This donation is 80G eligible.</p>
    <p>Thank you for supporting Win Foundations!</p>
  `;

  return sendEmail(donorEmail, 'Donation Receipt - Win Foundations', html);
}

export async function sendVolunteerConfirmation(
  volunteerEmail: string,
  volunteerName: string
) {
  const html = `
    <h2>Thank You for Volunteering!</h2>
    <p>Dear ${volunteerName},</p>
    <p>We have received your volunteer application. Our team will review it and get back to you shortly.</p>
    <p>In the meantime, feel free to reach out to us at ${process.env.ADMIN_EMAIL}</p>
    <p>Thank you for your interest in supporting Win Foundations!</p>
  `;

  return sendEmail(volunteerEmail, 'Volunteer Application Received', html);
}

export async function sendContactConfirmation(
  contactEmail: string,
  contactName: string
) {
  const html = `
    <h2>Thank You for Contacting Us</h2>
    <p>Dear ${contactName},</p>
    <p>We have received your message and will get back to you soon.</p>
    <p>Thank you!</p>
  `;

  return sendEmail(contactEmail, 'Message Received - Win Foundations', html);
}

export async function notifyAdminNewDonation(
  donorName: string,
  amount: number,
  donationType: string
) {
  const html = `
    <h2>New Donation Received</h2>
    <p>Donor: ${donorName}</p>
    <p>Amount: ₹${amount}</p>
    <p>Type: ${donationType}</p>
  `;

  return sendEmail(process.env.ADMIN_EMAIL!, 'New Donation Notification', html);
}

export async function notifyAdminNewVolunteer(
  volunteerName: string,
  volunteerEmail: string
) {
  const html = `
    <h2>New Volunteer Application</h2>
    <p>Name: ${volunteerName}</p>
    <p>Email: ${volunteerEmail}</p>
  `;

  return sendEmail(process.env.ADMIN_EMAIL!, 'New Volunteer Application', html);
}

export async function sendPasswordResetEmail(
  adminEmail: string,
  resetUrl: string
) {
  const html = `
    <h2>Reset Your Admin Password</h2>
    <p>We received a request to reset your Win Foundations admin password.</p>
    <p><a href="${resetUrl}">Click here to choose a new password</a></p>
    <p>This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
  `;

  return sendEmail(adminEmail, 'Reset Your Admin Password - Win Foundations', html);
}

export async function notifyAdminNewMessage(
  contactName: string,
  contactEmail: string,
  subject: string
) {
  const html = `
    <h2>New Contact Message</h2>
    <p>Name: ${contactName}</p>
    <p>Email: ${contactEmail}</p>
    <p>Subject: ${subject}</p>
  `;

  return sendEmail(process.env.ADMIN_EMAIL!, 'New Contact Message', html);
}
