/** Invitation token helpers — pure, usable from both client and server code. */

/** Cryptographically-random URL-safe invitation token. */
export function generateInvitationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 hex digest — the database stores only this, never the raw token. */
export async function hashInvitationToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function invitationUrl(origin: string, token: string): string {
  return `${origin}/invite/${token}`;
}
