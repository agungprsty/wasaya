import nodemailer from "nodemailer";

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: (process.env.SMTP_PORT || "587") === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function getFromAddress(): string {
  return process.env.SMTP_FROM || "noreply@temanwa.com";
}

export async function sendPasswordResetEmail(to: string, name: string, resetLink: string) {
  const transporter = getTransport();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden">
          <tr>
            <td style="padding:40px 32px 0;text-align:center;background-color:#075E54">
              <h1 style="margin:0;font-size:22px;font-weight:600;color:#ffffff">TEMANWA</h1>
              <p style="margin:8px 0 32px;font-size:14px;color:#ffffff">WhatsApp Gateway Service</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px">
              <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#18181b">Reset your password</h2>
              <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6">
                Hi ${name}, we received a request to reset the password for your account.
                Click the button below to set a new password.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px">
                <tr>
                  <td align="center" style="background-color:#25D366;border-radius:12px;padding:0">
                    <a href="${resetLink}" style="display:inline-block;padding:12px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:13px;color:#71717a;line-height:1.6">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:13px;color:#075E54;word-break:break-all;line-height:1.6">
                ${resetLink}
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.6">
                This link will expire in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
              </p>
              <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0" />
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6">
                TEMANWA &mdash; WhatsApp Gateway Service<br />
                Need help? Visit <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://temanwa.com"}/contact-support" style="color:#075E54;text-decoration:none">our support page</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"TEMANWA" <${getFromAddress()}>`,
    to,
    subject: "Reset your TEMANWA password",
    html,
  });
}
