import ExcelJS from 'exceljs';

// Single source of truth for the .xlsx column headers <-> BulkImportRowDto keys.
// Used both to generate the downloadable template and to parse an uploaded file.
export const HEADERS: Array<{ header: string; key: string; width: number }> = [
  { header: 'User Type* (SCHOOL or TEACHER)', key: 'userType', width: 28 },
  { header: 'Full Name*', key: 'fullName', width: 22 },
  { header: 'Email*', key: 'email', width: 28 },
  { header: 'Phone*', key: 'phone', width: 16 },
  { header: 'School Registration Number* (SCHOOL rows only)', key: 'schoolRegistrationNumber', width: 32 },
  { header: 'School Name (required for SCHOOL rows)', key: 'schoolName', width: 26 },
  { header: 'School Address (required for SCHOOL rows)', key: 'schoolAddress', width: 30 },
  { header: 'School City (required for SCHOOL rows)', key: 'schoolCity', width: 18 },
  { header: 'School State (required for SCHOOL rows)', key: 'schoolState', width: 18 },
  { header: 'School Pincode (required for SCHOOL rows)', key: 'schoolPincode', width: 16 },
  { header: 'School Contact Email (optional, SCHOOL rows)', key: 'schoolContactEmail', width: 28 },
  { header: 'School Contact Phone (optional, SCHOOL rows)', key: 'schoolContactPhone', width: 20 },
  { header: 'Experience Years (optional, TEACHER rows)', key: 'experienceYears', width: 18 },
  { header: 'City (optional)', key: 'city', width: 18 },
  { header: 'State (optional)', key: 'state', width: 18 },
  { header: 'Current School Name (optional, free text, TEACHER rows — not validated)', key: 'currentSchoolName', width: 36 },
];

export async function buildTemplateWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'School Teacher Admin';
  workbook.created = new Date();

  const instructions = workbook.addWorksheet('Instructions');
  instructions.columns = [{ width: 100 }];
  const lines = [
    'Bulk User Import — Instructions',
    '',
    '1. Fill in the "Users" sheet — one row per user. Do not change the column headers.',
    '2. User Type must be exactly SCHOOL or TEACHER.',
    '3. SCHOOL rows create both a user account AND a School Profile — fill in every',
    '   "required for SCHOOL rows" column for those rows.',
    '4. "School Registration Number" applies to SCHOOL rows only (the number being created',
    '   for that school) — leave it blank on TEACHER rows, it has no meaning there.',
    '5. TEACHER rows are standalone accounts. This platform is a job marketplace, not an',
    '   employment registry — a teacher is never "linked" to a school at import time. The',
    '   only real teacher-school relationship happens later, through actual job applications',
    '   (Interested -> Shortlisted -> Won). If you want to note where a teacher currently',
    '   works, use "Current School Name" — plain free text, not checked against anything.',
    '6. Email and Phone must be unique across all users, and not already registered.',
    '7. Do not add extra sheets, images, comments, or rich formatting — plain data only.',
    `8. Maximum rows per upload: see the admin Bulk Import screen (server-enforced, admin-configurable).`,
    '',
    'After upload, each row is validated. Rows that fail validation are skipped — valid',
    'rows are still imported. Download the Error Report after import to see exactly which',
    'rows failed and why, fix only those rows, and re-upload.',
    '',
    'Every successfully imported user receives an email with a secure link to set their',
    'own password and activate their account (no temporary passwords are ever sent).',
  ];
  lines.forEach((line, i) => {
    const row = instructions.getRow(i + 1);
    row.getCell(1).value = line;
    if (i === 0) row.getCell(1).font = { bold: true, size: 14 };
  });

  const sheet = workbook.addWorksheet('Users');
  sheet.columns = HEADERS.map((h) => ({ header: h.header, key: h.key, width: h.width }));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3949AB' } };

  // Example SCHOOL row + two example TEACHER rows (one with a free-text "current school"
  // note, one without any school mention at all) — both are equally valid standalone accounts.
  sheet.addRow({
    userType: 'SCHOOL',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example-school.edu',
    phone: '9876543210',
    schoolRegistrationNumber: 'REG-0001',
    schoolName: 'Greenwood Public School',
    schoolAddress: '12 MG Road',
    schoolCity: 'Hyderabad',
    schoolState: 'Telangana',
    schoolPincode: '500001',
    schoolContactEmail: 'contact@greenwoodschool.edu',
    schoolContactPhone: '9876543210',
  });
  sheet.addRow({
    userType: 'TEACHER',
    fullName: 'Arjun Rao',
    email: 'arjun.rao@example.com',
    phone: '9123456789',
    experienceYears: 5,
    city: 'Hyderabad',
    state: 'Telangana',
    currentSchoolName: 'Greenwood Public School',
  });
  sheet.addRow({
    userType: 'TEACHER',
    fullName: 'Meera Iyer',
    email: 'meera.iyer@example.com',
    phone: '9988776655',
    experienceYears: 2,
    city: 'Bengaluru',
    state: 'Karnataka',
  });

  // Dropdown validation on User Type for every data row up to row 1000
  for (let r = 2; r <= 1000; r++) {
    sheet.getCell(`A${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"SCHOOL,TEACHER"'],
    };
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
