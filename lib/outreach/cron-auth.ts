/**
 * Authorizes a cron request. Accepts either:
 * - the `x-vercel-cron` header (set by Vercel Cron), or
 * - an `Authorization: Bearer <CRON_SECRET>` header (set by an external scheduler).
 * In development, requests are always allowed so crons can be triggered manually.
 */
export function isAuthorizedCron(request: Request) {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  if (request.headers.has("x-vercel-cron")) {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  if (secret && secret.trim().length > 0) {
    const header = request.headers.get("authorization") ?? "";
    if (header === `Bearer ${secret}`) {
      return true;
    }
  }

  return false;
}
