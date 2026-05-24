/**
 * IST (Asia/Kolkata, UTC+5:30) date formatting utilities.
 * All human-readable dates/times in this application are displayed in IST.
 */

const IST = 'Asia/Kolkata';

/**
 * Format a date as a full date + short time in IST.
 * e.g. "Saturday, 28 February 2026 at 3:12 pm"
 */
export function formatDateTimeIST(date: Date | string): string {
  return new Date(date).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: IST,
  });
}

/**
 * Format a date as a short time only in IST.
 * e.g. "3:12 pm"
 */
export function formatTimeIST(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: IST,
  });
}

/**
 * Format a date as date only in IST.
 * e.g. "28 Feb 2026"
 */
export function formatDateIST(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: IST,
  });
}

/**
 * Format a date as "h:mm A, Do MMMM YYYY" in IST — used in email templates.
 * e.g. "3:12 PM, 28 February 2026"
 */
export function formatDateTimeEmailIST(date: Date | string): string {
  const d = new Date(date);
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: IST,
  }).toUpperCase(); // "03:12 PM"
  const datePart = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: IST,
  }); // "28 February 2026"
  return `${time}, ${datePart}`;
}

/**
 * Get today's date formatted for locale display in IST.
 * e.g. "28/02/2026"
 */
export function todayIST(): string {
  return new Date().toLocaleDateString('en-IN', { timeZone: IST });
}

/**
 * Get current month as "MMMM YYYY" string in IST.
 * e.g. "February 2026"
 */
export function currentMonthIST(): string {
  return new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: IST,
  });
}
