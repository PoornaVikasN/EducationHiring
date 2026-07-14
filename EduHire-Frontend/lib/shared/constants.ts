// Fallback pricing constants — BE is source of truth (overridden by /api/public/pricing)
// Display only — never use these for payment amount computation (BE re-verifies).

import { JobStatus, SalaryRange } from './enums';

export const JOB_STATUS_BADGE: Record<JobStatus, { label: string; cls: string }> = {
  [JobStatus.ACTIVE]:               { label: 'Active',            cls: 'bg-green-100 text-green-700' },
  [JobStatus.FILLED]:               { label: 'Filled',            cls: 'bg-blue-100 text-blue-600' },
  [JobStatus.EXPIRED]:              { label: 'Expired',           cls: 'bg-slate-100 text-slate-500' },
  [JobStatus.AUTO_DISABLED]:        { label: 'Closed',            cls: 'bg-slate-100 text-slate-500' },
  [JobStatus.DISABLED_BY_ADMIN]:    { label: 'Disabled by Admin', cls: 'bg-red-100 text-red-600' },
};

export const SALARY_RANGE_LABELS: Record<SalaryRange, string> = {
  [SalaryRange.BELOW_25K]:     '< ₹25,000 / month',
  [SalaryRange.RANGE_25_50K]:  '₹25,000 – ₹50,000 / month',
  [SalaryRange.RANGE_50K_1L]:  '₹50,000 – ₹1 Lakh / month',
  [SalaryRange.RANGE_1L_1_5L]: '₹1 Lakh – ₹1.5 Lakh / month',
  [SalaryRange.RANGE_1_5L_2L]: '₹1.5 Lakh – ₹2 Lakh / month',
  [SalaryRange.ABOVE_2L]:      '> ₹2 Lakh / month',
};

export const SCHOOL_ACCREDITATION_OPTIONS = [
  'CBSE Affiliated', 'ICSE / ISC', 'IB (International Baccalaureate)', 'Cambridge (IGCSE/A-Level)',
  'State Board (TS)', 'State Board (AP)', 'NIOS', 'Minority Institution', 'ISO 9001', 'Others',
];

export const DEGREE_OPTIONS = [
  'B.Ed', 'M.Ed', 'D.Ed', 'B.A', 'M.A', 'B.Sc', 'M.Sc',
  'B.Com', 'M.Com', 'B.Tech', 'M.Tech', 'MBA', 'MCA', 'BCA',
  'NTT (Nursery Teacher Training)', 'PTT (Primary Teacher Training)',
  'B.P.Ed', 'M.P.Ed', 'B.A B.Ed', 'B.Sc B.Ed', 'PhD', 'Others',
];

export const SCHOOL_INFRA_OPTIONS = [
  'Smart Boards', 'Projectors', 'Computer Lab', 'Science Lab', 'Language Lab',
  'Library', 'Sports Ground', 'Indoor Sports Hall', 'Swimming Pool',
  'Auditorium', 'Canteen', 'Hostel', 'Transport', 'AC Classrooms',
  'Activity / Art Room', 'Music Room', 'Dance Studio', 'Others',
];

export const DEPARTMENT_REQUIREMENTS_OPTIONS = [
  'Pre-Primary', 'Primary', 'Upper Primary', 'Secondary', 'Senior Secondary',
  'Mathematics', 'Science', 'English', 'Social Studies', 'Computer Science',
  'Physical Education', 'Arts', 'Administration', 'Others',
];

export const JOB_TIMING_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '12:00',
  '14:00', '16:00', '18:00', '20:00', '22:00', '00:00',
];

export function to12hr(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export const JOB_TIMING_DISPLAY_OPTIONS = JOB_TIMING_OPTIONS.map((t) => ({ value: t, label: to12hr(t) }));



export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export function formatLpa(minMonthlyRupees: number, maxMonthlyRupees: number): string {
  const toLpa = (r: number) => (r * 12 / 100_000).toFixed(1);
  return `₹${toLpa(minMonthlyRupees)}–${toLpa(maxMonthlyRupees)} LPA`;
}
