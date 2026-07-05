// PII redaction helpers — use in logs, audit entries, and any place an internal
// identifier might leave the server. Keep enough characters that an operator can
// disambiguate similar entries while making it useless to a log scraper.

export function redactEmail(email: string | null | undefined): string {
  if (!email) return '<empty>';
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at < 1) return '<invalid>';
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const localKept = local.length <= 2 ? local[0] : `${local[0]}***${local[local.length - 1]}`;
  return `${localKept}@${domain}`;
}

export function redactPhone(phone: string | null | undefined): string {
  if (!phone) return '<empty>';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '<short>';
  return `***${digits.slice(-4)}`;
}
