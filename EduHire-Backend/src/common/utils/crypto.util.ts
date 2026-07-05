import { timingSafeEqual } from 'crypto';

/**
 * Constant-time equality check for two hex/ASCII strings. Use for HMAC
 * signature comparisons (Razorpay, Meta webhooks, etc.) — never `===` or
 * `!==`, which leak the position of the first byte mismatch via timing
 * differences and let an attacker reconstruct the expected value one byte
 * at a time.
 *
 * Returns false on length mismatch; `timingSafeEqual` itself throws on
 * unequal-length buffers.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
