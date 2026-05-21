// ===== EMAIL SERVICE — Gmail SMTP via Nodemailer =====
import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null; // Email not configured — silently skip
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  return transporter;
}

export function isEmailConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

// ─── Core send function ───────────────────────────────────────────────────────
export async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email] Not configured — skipping: "${subject}" to ${to}`);
    return { skipped: true };
  }

  const from = `"${process.env.INSTITUTE_NAME || 'RBMI Admissions'}" <${process.env.GMAIL_USER}>`;

  try {
    const info = await t.sendMail({ from, to, subject, html, text });
    console.log(`[Email] Sent: "${subject}" → ${to} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email] Failed: "${subject}" → ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function baseTemplate(content) {
  const institute = process.env.INSTITUTE_NAME || 'RBMI';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; color: #1e293b; }
    .body p { line-height: 1.7; margin: 0 0 16px; font-size: 15px; }
    .highlight-box { background: #f8fafc; border-left: 4px solid #6366f1; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0; }
    .highlight-box p { margin: 0; font-size: 14px; color: #475569; }
    .highlight-box strong { color: #1e293b; }
    .btn { display: inline-block; background: #6366f1; color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0; }
    .stage-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; background: #ede9fe; color: #6d28d9; }
    .footer { background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${institute}</h1>
      <p>Admissions Office</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>${institute} · Admissions Office<br/>This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

// 1. Welcome email when a new lead is created
export async function sendWelcomeEmail(lead) {
  if (!lead.email) return { skipped: true, reason: 'no email' };

  const name = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'there';
  const institute = process.env.INSTITUTE_NAME || 'RBMI';

  const html = baseTemplate(`
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thank you for your interest in <strong>${institute}</strong>! We've received your enquiry and our admissions team will get in touch with you shortly.</p>
    <div class="highlight-box">
      <p><strong>What happens next?</strong></p>
      <p>• Our counselor will call you within 24 hours<br/>
         • We'll discuss your course options and eligibility<br/>
         • You'll receive a personalised admission plan</p>
    </div>
    <p>If you have any immediate questions, feel free to reply to this email or call our admissions helpline.</p>
    <p>We look forward to welcoming you to ${institute}!</p>
    <p style="margin-top:24px;">Warm regards,<br/><strong>Admissions Team</strong><br/>${institute}</p>
  `);

  return sendEmail({
    to: lead.email,
    subject: `Welcome to ${institute} — We've received your enquiry`,
    html,
    text: `Hi ${name}, thank you for your interest in ${institute}. Our counselor will contact you within 24 hours.`
  });
}

// 2. Stage change notification to student
export async function sendStageChangeEmail(lead, newStage) {
  if (!lead.email) return { skipped: true, reason: 'no email' };

  const name = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'there';
  const institute = process.env.INSTITUTE_NAME || 'RBMI';

  const stageMessages = {
    counseling_scheduled: {
      subject: `Your counseling session has been scheduled — ${institute}`,
      message: `Great news! Your counseling session has been scheduled. Our counselor will reach out to confirm the date and time. Please keep your phone handy.`,
      action: 'Prepare any questions you have about courses, fees, or eligibility.'
    },
    counseling_done: {
      subject: `Next step: Submit your application — ${institute}`,
      message: `Your counseling session is complete. The next step is to submit your application form.`,
      action: 'Click the link in your student portal to fill out and submit your application.'
    },
    application_submitted: {
      subject: `Application received — ${institute}`,
      message: `We've received your application. Our team will now review your documents.`,
      action: 'Make sure all required documents are uploaded in your student portal.'
    },
    documents_verified: {
      subject: `Documents verified — Proceed to fee payment — ${institute}`,
      message: `Your documents have been verified successfully! You're one step away from admission.`,
      action: 'Please proceed to pay the admission fee to confirm your seat.'
    },
    admitted: {
      subject: `Congratulations! You've been admitted to ${institute} 🎉`,
      message: `We are thrilled to inform you that you have been <strong>admitted to ${institute}</strong>! Welcome to the RBMI family.`,
      action: 'Please complete your enrollment formalities at the earliest to secure your seat.'
    },
    enrolled: {
      subject: `Enrollment confirmed — Welcome to ${institute}! 🎓`,
      message: `Your enrollment is now complete. You are officially a student of <strong>${institute}</strong>!`,
      action: 'Check your student portal for orientation details, timetable, and important announcements.'
    }
  };

  const info = stageMessages[newStage];
  if (!info) return { skipped: true, reason: 'no template for stage' };

  const html = baseTemplate(`
    <p>Hi <strong>${name}</strong>,</p>
    <p>${info.message}</p>
    <div class="highlight-box">
      <p><strong>Your next step:</strong></p>
      <p>${info.action}</p>
    </div>
    <p style="margin-top:24px;">Warm regards,<br/><strong>Admissions Team</strong><br/>${institute}</p>
  `);

  return sendEmail({
    to: lead.email,
    subject: info.subject,
    html,
    text: `Hi ${name}, ${info.message} Next step: ${info.action}`
  });
}

// 3. Task reminder to counselor
export async function sendTaskReminderEmail({ counselorEmail, counselorName, taskTitle, leadName, dueDate, notes }) {
  if (!counselorEmail) return { skipped: true, reason: 'no counselor email' };

  const institute = process.env.INSTITUTE_NAME || 'RBMI';
  const dueDateStr = new Date(dueDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const html = baseTemplate(`
    <p>Hi <strong>${counselorName || 'Counselor'}</strong>,</p>
    <p>You have a follow-up task due soon:</p>
    <div class="highlight-box">
      <p><strong>Task:</strong> ${taskTitle}</p>
      <p><strong>Student:</strong> ${leadName}</p>
      <p><strong>Due:</strong> ${dueDateStr}</p>
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
    </div>
    <p>Please log in to the CRM to complete this task.</p>
    <p style="margin-top:24px;">— ${institute} CRM</p>
  `);

  return sendEmail({
    to: counselorEmail,
    subject: `Reminder: ${taskTitle} — Due ${dueDateStr}`,
    html,
    text: `Hi ${counselorName}, reminder: "${taskTitle}" for ${leadName} is due on ${dueDateStr}.`
  });
}

// 4. Test email (for settings page)
export async function sendTestEmail(toEmail) {
  const institute = process.env.INSTITUTE_NAME || 'RBMI';

  const html = baseTemplate(`
    <p>Hi there,</p>
    <p>This is a <strong>test email</strong> from your ${institute} CRM. If you're reading this, your email integration is working correctly! 🎉</p>
    <div class="highlight-box">
      <p><strong>Email service:</strong> Gmail SMTP via Nodemailer</p>
      <p><strong>Status:</strong> ✅ Connected and working</p>
    </div>
    <p>You can now send automated emails for:</p>
    <p>• Welcome emails to new leads<br/>• Stage change notifications<br/>• Task reminders to counselors</p>
    <p style="margin-top:24px;">— ${institute} CRM</p>
  `);

  return sendEmail({
    to: toEmail,
    subject: `✅ Email integration test — ${institute} CRM`,
    html,
    text: `Test email from ${institute} CRM. Email integration is working correctly!`
  });
}
