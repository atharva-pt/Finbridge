import nodemailer from "nodemailer";

// Configure transporter — uses SMTP env vars if set, otherwise falls back to
// Ethereal (fake SMTP that logs to console) for dev / hackathon demos.
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

  // Fallback: log-only transport for dev
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: process.env.ETHEREAL_USER ?? "",
      pass: process.env.ETHEREAL_PASS ?? "",
    },
  });
}

const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "FinBridge <noreply@finbridge.app>";

/**
 * Notify the highest-authority admin that a new user has signed up and needs
 * approval.
 */
export async function sendNewUserNotificationToAdmin(
  adminEmail: string,
  newUserName: string,
  newUserEmail: string
) {
  const transporter = getTransporter();
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 0;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px 32px; border-radius: 16px 16px 0 0;">
        <h1 style="color: #fff; font-size: 20px; margin: 0;">FinBridge</h1>
      </div>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 32px; border-radius: 0 0 16px 16px;">
        <h2 style="font-size: 18px; color: #111827; margin: 0 0 12px;">New User Awaiting Approval</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          A new user has signed up on FinBridge and is waiting for your approval to access the platform.
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 14px;"><strong>Name:</strong> ${newUserName}</p>
          <p style="margin: 0; font-size: 14px;"><strong>Email:</strong> ${newUserEmail}</p>
        </div>
        <a href="${appUrl}/admin/users" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none;">
          Review &amp; Approve
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          This user cannot access the platform until you approve their account.
        </p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: `[FinBridge] New user awaiting approval: ${newUserName}`,
      html,
    });
    console.log("Admin notification email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("Failed to send admin notification email:", err);
    // Non-blocking — don't throw; the user flow should continue
  }
}

/**
 * Notify a user that their account has been approved or rejected.
 */
export async function sendApprovalNotificationEmail(
  userEmail: string,
  userName: string,
  action: "APPROVED" | "REJECTED"
) {
  const transporter = getTransporter();
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const isApproved = action === "APPROVED";
  const subject = isApproved
    ? "[FinBridge] Your account has been approved!"
    : "[FinBridge] Account access update";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 0;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px 32px; border-radius: 16px 16px 0 0;">
        <h1 style="color: #fff; font-size: 20px; margin: 0;">FinBridge</h1>
      </div>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 32px; border-radius: 0 0 16px 16px;">
        <h2 style="font-size: 18px; color: #111827; margin: 0 0 12px;">
          ${isApproved ? "Account Approved" : "Account Access Update"}
        </h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Hi ${userName},<br/><br/>
          ${
            isApproved
              ? "Great news! Your FinBridge account has been approved by an administrator. You can now sign in and start using the platform."
              : "Unfortunately, your access request to FinBridge has not been approved at this time. Please contact your administrator for more details."
          }
        </p>
        ${
          isApproved
            ? `<a href="${appUrl}/login" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none;">Sign in to FinBridge</a>`
            : ""
        }
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to: userEmail,
      subject,
      html,
    });
    console.log("Approval notification email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("Failed to send approval notification email:", err);
  }
}
