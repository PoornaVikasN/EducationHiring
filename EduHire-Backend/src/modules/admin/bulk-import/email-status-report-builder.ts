import ExcelJS from 'exceljs';

export interface EmailStatusRowLike {
  fullName: string;
  email: string;
  role: string;
  activationEmailSentAt: Date | null;
}

export async function buildEmailStatusReportWorkbook(rows: EmailStatusRowLike[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Email Status');

  sheet.columns = [
    { header: 'Full Name', key: 'fullName', width: 26 },
    { header: 'Email', key: 'email', width: 32 },
    { header: 'Role', key: 'role', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Sent At', key: 'sentAt', width: 24 },
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3949AB' } };

  for (const row of rows) {
    sheet.addRow({
      fullName: row.fullName,
      email: row.email,
      role: row.role,
      status: row.activationEmailSentAt ? 'Sent' : 'Pending',
      sentAt: row.activationEmailSentAt ? row.activationEmailSentAt.toISOString() : '',
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
