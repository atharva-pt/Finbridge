import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Resend helper — uses fetch(), no extra packages needed
// ---------------------------------------------------------------------------

const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "FinBridge <noreply@finbridge.app>";

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "FinBridge <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error: ${res.status} ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Nodemailer transporter — SMTP env vars or Ethereal fallback
// ---------------------------------------------------------------------------

function getTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: Ethereal log-only transport for dev
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: process.env.ETHEREAL_USER ?? "",
      pass: process.env.ETHEREAL_PASS ?? "",
    },
  });
}

// ---------------------------------------------------------------------------
// Unified send — Resend > SMTP > Ethereal
// ---------------------------------------------------------------------------

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, subject, html);
    console.log(`Email sent via Resend to ${to}: "${subject}"`);
    return;
  }

  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });
  console.log("Email sent via nodemailer:", info.messageId);
}

// ---------------------------------------------------------------------------
// Shared email layout
// ---------------------------------------------------------------------------

function emailLayout(body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;border-radius:16px 16px 0 0;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">FinBridge</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:32px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
            FinBridge &mdash; AI-Powered Financial Exchange<br/>
            &copy; ${new Date().getFullYear()} FinBridge. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;mso-padding-alt:0;text-align:center;">${label}</a>`;
}

// ---------------------------------------------------------------------------
// Email: New user awaiting approval (admin notification)
// ---------------------------------------------------------------------------

export async function sendNewUserNotificationToAdmin(
  adminEmail: string,
  newUserName: string,
  newUserEmail: string
) {
  const appUrl =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const body = `
    <h2 style="font-size:18px;color:#111827;margin:0 0 12px;">New User Awaiting Approval</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      A new user has signed up on FinBridge and is waiting for your approval to access the platform.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Name:</strong> ${newUserName}</p>
        <p style="margin:0;font-size:14px;color:#374151;"><strong>Email:</strong> ${newUserEmail}</p>
      </td></tr>
    </table>
    ${ctaButton("Review &amp; Approve", `${appUrl}/admin/users`)}
    <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
      This user cannot access the platform until you approve their account.
    </p>
  `;

  const html = emailLayout(body);
  const subject = `[FinBridge] New user awaiting approval: ${newUserName}`;

  try {
    await sendEmail(adminEmail, subject, html);
  } catch (err) {
    console.error("Failed to send admin notification email:", err);
    // Non-blocking — don't throw; the user flow should continue
  }
}

// ---------------------------------------------------------------------------
// Email: Account approved / rejected
// ---------------------------------------------------------------------------

export async function sendApprovalNotificationEmail(
  userEmail: string,
  userName: string,
  action: "APPROVED" | "REJECTED"
) {
  const appUrl =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const isApproved = action === "APPROVED";
  const subject = isApproved
    ? "[FinBridge] Your account has been approved!"
    : "[FinBridge] Account access update";

  const body = `
    <h2 style="font-size:18px;color:#111827;margin:0 0 12px;">
      ${isApproved ? "Account Approved" : "Account Access Update"}
    </h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${userName},<br/><br/>
      ${
        isApproved
          ? "Great news! Your FinBridge account has been approved by an administrator. You can now sign in and start using the platform."
          : "Unfortunately, your access request to FinBridge has not been approved at this time. Please contact your administrator for more details."
      }
    </p>
    ${isApproved ? ctaButton("Sign in to FinBridge", `${appUrl}/login`) : ""}
  `;

  const html = emailLayout(body);

  try {
    await sendEmail(userEmail, subject, html);
  } catch (err) {
    console.error("Failed to send approval notification email:", err);
  }
}

// ---------------------------------------------------------------------------
// Email: Firm welcome (new firm admin onboarding)
// ---------------------------------------------------------------------------

export async function sendFirmWelcomeEmail(
  adminEmail: string,
  adminName: string,
  firmName: string,
  password: string
) {
  const appUrl =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const subject = `[FinBridge] Welcome to FinBridge — ${firmName} is ready!`;

  const body = `
    <h2 style="font-size:18px;color:#111827;margin:0 0 12px;">Welcome to FinBridge!</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Hi ${adminName},<br/><br/>
      Your firm <strong>${firmName}</strong> has been set up on FinBridge. You have been assigned as the Firm Administrator. Use the credentials below to sign in and get started.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Email:</strong> ${adminEmail}</p>
        <p style="margin:0;font-size:14px;color:#374151;"><strong>Password:</strong> ${password}</p>
      </td></tr>
    </table>
    <p style="color:#ef4444;font-size:13px;margin:0 0 24px;">
      For security, please change your password after your first login.
    </p>
    ${ctaButton("Get Started", `${appUrl}/login`)}
  `;

  const html = emailLayout(body);

  try {
    await sendEmail(adminEmail, subject, html);
  } catch (err) {
    console.error("Failed to send firm welcome email:", err);
  }
}
