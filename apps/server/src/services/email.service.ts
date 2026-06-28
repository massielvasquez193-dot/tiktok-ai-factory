/**
 * Email Service — Launch Sprint
 *
 * Supports two modes:
 *   mock   — Log emails to console (default, no external dependency)
 *   resend — Send via Resend API (requires RESEND_API_KEY)
 *
 * Used for: email verification, password reset, member invites, invoices.
 */

// ── Config ──────────────────────────────────────────────────────────────────

const EMAIL_MODE = process.env.EMAIL_MODE || 'mock';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@ttvideoai.com';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ── Mock Mode ───────────────────────────────────────────────────────────────

function sendMock(options: EmailOptions): void {
  console.log('[EmailMock] ─────────────────────────────────────');
  console.log(`[EmailMock] To:      ${options.to}`);
  console.log(`[EmailMock] Subject: ${options.subject}`);
  console.log(`[EmailMock] Body:    ${(options.text || options.html).slice(0, 200)}...`);
  console.log('[EmailMock] ─────────────────────────────────────');
}

// ── Resend Mode ─────────────────────────────────────────────────────────────

async function sendResend(options: EmailOptions): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — falling back to mock');
    return sendMock(options);
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error(`[Email] Resend error: ${(error as any).message || response.statusText}`);
    throw new Error(`Failed to send email: ${response.statusText}`);
  }

  console.log(`[Email] Sent via Resend: ${options.subject} → ${options.to}`);
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (EMAIL_MODE === 'mock') {
    return sendMock(options);
  }
  return sendResend(options);
}

export function getEmailConfig() {
  return {
    mode: EMAIL_MODE,
    provider: EMAIL_MODE === 'resend' ? 'Resend' : 'Mock (console)',
    isConfigured: EMAIL_MODE === 'resend' && !!RESEND_API_KEY,
    from: EMAIL_FROM,
  };
}

// ── Templates ───────────────────────────────────────────────────────────────

export function verificationEmail(verifyLink: string): EmailOptions {
  return {
    to: '', // filled by caller
    subject: 'Verify your email — TikTok AI Factory',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif">
        <h2 style="color:#4F46E5">TikTok AI Factory</h2>
        <p>Welcome! Please verify your email address to get started.</p>
        <a href="${verifyLink}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px;font-weight:bold">Verify Email</a>
        <p style="color:#888;font-size:12px;margin-top:24px">If you didn't create this account, you can safely ignore this email.</p>
      </div>
    `,
    text: `Welcome to TikTok AI Factory! Verify your email: ${verifyLink}`,
  };
}

export function passwordResetEmail(resetLink: string): EmailOptions {
  return {
    to: '',
    subject: 'Reset your password — TikTok AI Factory',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif">
        <h2 style="color:#4F46E5">TikTok AI Factory</h2>
        <p>You requested a password reset. Click below to set a new password.</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px;font-weight:bold">Reset Password</a>
        <p style="color:#888;font-size:12px;margin-top:24px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
    text: `Reset your TikTok AI Factory password: ${resetLink}`,
  };
}

export function inviteEmail(inviteLink: string, workspaceName: string): EmailOptions {
  return {
    to: '',
    subject: `You've been invited to ${workspaceName} — TikTok AI Factory`,
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif">
        <h2 style="color:#4F46E5">TikTok AI Factory</h2>
        <p>You've been invited to join <strong>${workspaceName}</strong>.</p>
        <a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px;font-weight:bold">Accept Invitation</a>
        <p style="color:#888;font-size:12px;margin-top:24px">You'll need to create an account if you don't have one.</p>
      </div>
    `,
    text: `You've been invited to ${workspaceName} on TikTok AI Factory: ${inviteLink}`,
  };
}
