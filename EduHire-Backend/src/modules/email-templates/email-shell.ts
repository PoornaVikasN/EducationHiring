/* ─────────────────────────────────────────────────────────────────────────────
   Email shell & component helpers — School Teacher branding
   All functions return email-safe HTML strings.
   Template variables ({{name}}, {{otp}}, …) are literal strings that survive
   into the stored HTML and are replaced at send-time by renderFromDb().
   ───────────────────────────────────────────────────────────────────────────── */

const FF = `font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`;

export interface ShellOpts {
  preheader: string;
  badge: string;
  badgeBg?: string;
  badgeGradEnd?: string;
  headline: string;
  tagline: string;
  headerLabel?: string;
  content: string;
}

// ── Typographic helpers ───────────────────────────────────────────────────────

export function hi(nameVar: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;color:#334155;${FF}">Hi <strong style="color:#0f172a">${nameVar}</strong>,</p>`;
}

export function para(html: string, mb = '20px'): string {
  return `<p style="margin:0 0 ${mb};font-size:15px;color:#475569;line-height:1.7;${FF}">${html}</p>`;
}

export function smallNote(html: string): string {
  return `<p style="margin:14px 0 0;font-size:12px;color:#94a3b8;line-height:1.7;${FF}">${html}</p>`;
}

// ── Cards ─────────────────────────────────────────────────────────────────────

export function jobCard(titleVar: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
<tr><td style="background:linear-gradient(135deg,#eef0fb,#e0e4f7);border:1.5px solid #b3bcec;border-radius:12px;padding:18px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td>
<p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#3949ab;letter-spacing:1.2px;text-transform:uppercase;${FF}">Position</p>
<p style="margin:0;font-size:19px;font-weight:700;color:#0f172a;line-height:1.3;${FF}">${titleVar}</p>
</td>
<td align="right" style="padding-left:12px;vertical-align:middle"><span style="font-size:28px">🏫</span></td>
</tr></table>
</td></tr>
</table>`;
}

export function infoCard(label: string, valueVar: string, icon = '🏫'): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
<tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td>
<p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.2px;text-transform:uppercase;${FF}">${label}</p>
<p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;${FF}">${valueVar}</p>
</td>
<td align="right" style="padding-left:12px;vertical-align:middle"><span style="font-size:24px">${icon}</span></td>
</tr></table>
</td></tr>
</table>`;
}

export function greenCard(label: string, textVar: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
<tr><td style="background:linear-gradient(135deg,#eef0fb,#e0e4f7);border:1.5px solid #b3bcec;border-radius:12px;padding:18px 22px">
<p style="margin:0 0 5px;font-size:10px;font-weight:700;color:#3949ab;letter-spacing:1.2px;text-transform:uppercase;${FF}">${label}</p>
<p style="margin:0;font-size:15px;color:#0f172a;line-height:1.6;${FF}">${textVar}</p>
</td></tr>
</table>`;
}

export function feeCard(feeVar: string, deadlineVar: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
<tr><td style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:18px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td>
<p style="margin:0 0 5px;font-size:10px;font-weight:700;color:#ea580c;letter-spacing:1.2px;text-transform:uppercase;${FF}">Payment Required</p>
<p style="margin:0 0 3px;font-size:24px;font-weight:800;color:#0f172a;${FF}">${feeVar}</p>
<p style="margin:0;font-size:13px;color:#7c2d12;${FF}">Pay by <strong>${deadlineVar}</strong> to unlock the school's contact details</p>
</td>
<td align="right" style="padding-left:12px;vertical-align:middle"><span style="font-size:28px">⏰</span></td>
</tr></table>
</td></tr>
</table>`;
}

export function subscriptionCard(): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
<tr><td style="background:#eef0fb;border:1.5px solid #b3bcec;border-radius:12px;padding:18px 22px;font-size:15px;color:#334155;line-height:1.7;${FF}">
{{subscriptionBody}}
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
<tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 22px">
<p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.2px;text-transform:uppercase;${FF}">Payment Receipt</p>
<div style="font-size:14px;color:#334155;${FF}">{{amountLine}}</div>
</td></tr>
</table>`;
}

// ── OTP box ───────────────────────────────────────────────────────────────────

export function otpBox(variable: string, expireMin: number): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
<tr><td align="center" style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:14px;padding:28px 20px">
<p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;${FF}">Verification Code</p>
<div style="font-size:46px;font-weight:800;letter-spacing:14px;color:#3949ab;font-family:'Courier New',Courier,monospace">${variable}</div>
<p style="margin:10px 0 0;font-size:12px;color:#94a3b8;${FF}">Expires in <strong style="color:#64748b">${expireMin} minutes</strong>&nbsp;&bull;&nbsp;Do not share this code</p>
</td></tr>
</table>`;
}

// ── Buttons ───────────────────────────────────────────────────────────────────

export function ctaBtn(label: string, url: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px">
<tr><td align="center">
<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#3949ab,#5c6bc0);color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;${FF};box-shadow:0 4px 14px rgba(57,73,171,0.32)">${label}</a>
</td></tr>
</table>`;
}

export function amberCtaBtn(label: string, url: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px">
<tr><td align="center">
<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;${FF};box-shadow:0 4px 14px rgba(245,158,11,0.32)">${label}</a>
</td></tr>
</table>`;
}

// ── Numbered steps ────────────────────────────────────────────────────────────

export function stepsBlock(sectionLabel: string, items: Array<{ title: string; body: string }>): string {
  const rows = items
    .map(
      (it, i) => `
<tr><td style="padding:${i === 0 ? '4' : '12'}px 0 12px;${i < items.length - 1 ? 'border-bottom:1px solid #f1f5f9;' : ''}">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding-right:14px">
<div style="background:#3949ab;border-radius:50%;width:28px;height:28px;min-width:28px;line-height:28px;text-align:center">
<span style="font-size:12px;font-weight:700;color:#fff;line-height:28px;display:block">${i + 1}</span>
</div>
</td>
<td style="vertical-align:middle">
<p style="margin:0;font-size:14px;color:#334155;line-height:1.55;${FF}"><strong style="color:#0f172a">${it.title}</strong> — ${it.body}</p>
</td>
</tr></table>
</td></tr>`,
    )
    .join('');
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
<tr><td style="padding-bottom:10px">
<p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;${FF}">${sectionLabel}</p>
</td></tr>
${rows}
</table>`;
}

// ── Feature icon list ─────────────────────────────────────────────────────────

export function featureList(items: Array<{ icon: string; text: string }>): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
${items
  .map(
    it => `
<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:14px;width:38px">
<div style="background:#eef0fb;border-radius:8px;width:34px;height:34px;line-height:34px;text-align:center">
<span style="font-size:16px;line-height:34px;display:block">${it.icon}</span>
</div>
</td>
<td><p style="margin:0;font-size:14px;color:#334155;line-height:1.5;${FF}">${it.text}</p></td>
</tr></table>
</td></tr>`,
  )
  .join('')}
</table>`;
}

// ── Callout boxes ─────────────────────────────────────────────────────────────

export function tip(html: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px">
<tr><td style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 18px">
<p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;${FF}">${html}</p>
</td></tr>
</table>`;
}

// ── Outer shell ───────────────────────────────────────────────────────────────

export function shell({
  preheader,
  badge,
  badgeBg = '#3949ab',
  badgeGradEnd = '#5c6bc0',
  headline,
  tagline,
  headerLabel = 'Notification',
  content,
}: ShellOpts): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<title>School Teacher</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box}
body{margin:0;padding:0;background:#f1f5f9;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}
img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
@media only screen and (max-width:600px){
.ew{width:100%!important}.ep{padding:0 16px 24px!important}.hp{padding:18px 20px!important}.hr{padding:28px 20px 22px!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f1f5f9">${preheader}&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table class="ew" role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

<!-- HEADER -->
<tr><td style="background:#3949ab;border-radius:16px 16px 0 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td class="hp" style="padding:20px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="background:rgba(255,255,255,0.15);border-radius:9px;padding:7px 13px">
<span style="font-size:17px;font-weight:800;color:#fff;letter-spacing:-0.5px;font-family:'Inter',-apple-system,sans-serif">School <span style="color:#ffca28">Teacher</span></span>
</td></tr></table></td>
<td align="right"><span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.65);letter-spacing:1.5px;text-transform:uppercase;font-family:'Inter',-apple-system,sans-serif">${headerLabel}</span></td>
</tr></table>
</td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#f59e0b,#ffca28,#f59e0b)"></td></tr>
</table>
</td></tr>

<!-- HERO -->
<tr><td style="background:#fff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td class="hr" style="padding:38px 40px 30px;text-align:center;background:linear-gradient(160deg,#eef0fb,#fff 55%)">
<div style="display:inline-block;background:linear-gradient(135deg,${badgeBg},${badgeGradEnd});border-radius:50%;width:68px;height:68px;margin-bottom:18px;box-shadow:0 6px 20px rgba(57,73,171,0.22)">
<span style="font-size:32px;line-height:68px;display:block">${badge}</span>
</div>
<h1 style="margin:0 0 9px;font-size:23px;font-weight:800;color:#0f172a;letter-spacing:-0.4px;line-height:1.25;font-family:'Inter',-apple-system,sans-serif">${headline}</h1>
<p style="margin:0;font-size:14px;color:#64748b;line-height:1.65;font-family:'Inter',-apple-system,sans-serif">${tagline}</p>
</td></tr>
</table>
</td></tr>

<!-- CONTENT -->
<tr><td class="ep" style="background:#fff;padding:14px 40px 40px">${content}</td></tr>

<!-- DIVIDER -->
<tr><td style="background:#fff;padding:0 40px"><div style="height:1px;background:#e2e8f0"></div></td></tr>

<!-- FOOTER -->
<tr><td style="background:#fff;border-radius:0 0 16px 16px;padding:22px 40px 30px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<p style="margin:0 0 4px;font-size:15px;font-weight:800;color:#3949ab;font-family:'Inter',-apple-system,sans-serif">School <span style="color:#f59e0b">Teacher</span></p>
<p style="margin:0 0 14px;font-size:12px;color:#94a3b8;font-family:'Inter',-apple-system,sans-serif">Global Teachers Hiring Platform (for free)</p>
<p style="margin:0;font-size:11px;color:#cbd5e1;line-height:1.8;font-family:'Inter',-apple-system,sans-serif">&copy; 2026 School Teacher &bull; All rights reserved<br>You're receiving this because you have an account on School Teacher.</p>
</td></tr></table>
</td></tr>

<tr><td style="height:6px;background:linear-gradient(180deg,rgba(0,0,0,0.03),transparent);border-radius:0 0 8px 8px"></td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}
