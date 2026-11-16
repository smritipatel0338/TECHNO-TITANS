import nodemailer from 'nodemailer';

const transporter =
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
        },
      })
    : null;

export async function sendResetOtpEmail(toEmail, name, otp) {
  if (!transporter) {
    console.warn(`[Mailer Fallback] GMAIL_USER/GMAIL_APP_PASSWORD not set. OTP for ${toEmail}: ${otp}`);
    return { sent: false };
  }

  await transporter.sendMail({
    from: `"FutureYou 🌱" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} is your FutureYou password reset code`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 440px; margin: auto; padding: 24px; border: 3px solid #2b1810; border-radius: 18px; background: #fffdf7; color: #2b1810;">
        <h2 style="margin: 0 0 8px; color: #58cc02;">FutureYou 🌱</h2>
        <p>Hi <b>${name || 'Gardener'}</b>,</p>
        <p>Use this 6-digit code to reset your password. It expires in <b>15 minutes</b>:</p>
        <div style="font-size: 30px; font-weight: 900; letter-spacing: 6px; text-align: center; padding: 14px; margin: 16px 0; background: #f0fdf4; border: 2px dashed #58cc02; border-radius: 12px;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #6b5e55;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return { sent: true };
}