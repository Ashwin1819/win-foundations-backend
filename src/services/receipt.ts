import fs from 'fs';
import path from 'path';
const PDFDocument = require('pdfkit');

export async function generateDonationReceipt(
  donorName: string,
  amount: number,
  receiptNumber: string,
  donationType: string,
  date: Date,
  pan?: string
) {
  const uploadsDir = path.join(process.cwd(), process.env.UPLOAD_DIR || './uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `receipt-${receiptNumber}.pdf`;
  const filePath = path.join(uploadsDir, fileName);

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Win Foundations', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Donation Receipt', { align: 'center' });
    doc.moveDown();

    // Receipt details
    doc.fontSize(10);
    doc.text(`Receipt Number: ${receiptNumber}`);
    doc.text(`Date: ${date.toLocaleDateString()}`);
    doc.moveDown();

    // Donor details
    doc.fontSize(12).font('Helvetica-Bold').text('Donor Information');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${donorName}`);
    if (pan) {
      doc.text(`PAN: ${pan}`);
      doc.text('80G Eligible: Yes');
    }
    doc.moveDown();

    // Donation details
    doc.fontSize(12).font('Helvetica-Bold').text('Donation Details');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Amount: ₹${amount}`);
    doc.text(`Type: ${donationType}`);
    doc.moveDown();

    // Footer
    doc.fontSize(8).text('Thank you for your generous donation!', { align: 'center' });
    doc.text('All donations are tax deductible.', { align: 'center' });

    doc.end();

    stream.on('finish', () => {
      resolve(`/uploads/${fileName}`);
    });

    stream.on('error', reject);
  });
}
