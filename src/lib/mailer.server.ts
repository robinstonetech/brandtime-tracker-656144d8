/** Mailtrap delivery. Server-only: never import from client code. */

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function resolveConfig() {
  const token = process.env.MAILTRAP_API_TOKEN;
  if (!token) return null;
  const sandboxInbox = process.env.MAILTRAP_SANDBOX_INBOX_ID;
  const host = sandboxInbox
    ? `https://sandbox.api.mailtrap.io/api/send/${sandboxInbox}`
    : "https://send.api.mailtrap.io/api/send";
  return {
    token,
    endpoint: host,
    from: process.env.MAILTRAP_FROM_EMAIL ?? "no-reply@mytimesheets.app",
    fromName: process.env.MAILTRAP_FROM_NAME ?? "Robinstone Business Suite — Time",
  };
}

/**
 * Best-effort send. Returns `{ delivered: false }` when Mailtrap is not
 * configured so invitation flows can still surface a shareable link.
 */
export async function sendEmail({ to, subject, html, text }: SendArgs) {
  const config = resolveConfig();
  if (!config) return { delivered: false, reason: "Mailtrap is not configured" };

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Token": config.token,
      },
      body: JSON.stringify({
        from: { email: config.from, name: config.fromName },
        to: [{ email: to }],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      console.error("Mailtrap send failed", response.status, await response.text());
      return { delivered: false, reason: `Mailtrap responded ${response.status}` };
    }
    return { delivered: true as const };
  } catch (error) {
    console.error("Mailtrap send threw", error);
    return { delivered: false, reason: "Mailtrap request failed" };
  }
}

export function invitationEmail(orgName: string, inviterName: string, url: string) {
  const subject = `${inviterName} invited you to ${orgName} on Robinstone Time`;
  const text = `${inviterName} invited you to join ${orgName}.\n\nAccept your invitation: ${url}\n\nThis link expires in 7 days.`;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#26302a">
      <h1 style="font-size:20px;margin:0 0 12px">You've been invited to ${orgName}</h1>
      <p>${inviterName} invited you to track time with <strong>${orgName}</strong> on Robinstone Business Suite — Time.</p>
      <p style="margin:24px 0">
        <a href="${url}" style="background:#3f5f4a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Accept invitation</a>
      </p>
      <p style="font-size:13px;color:#6b7a70">This invitation expires in 7 days. If you weren't expecting it, you can ignore this email.</p>
    </div>`;
  return { subject, text, html };
}
