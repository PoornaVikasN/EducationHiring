import ExcelJS from 'exceljs';
import { HEADERS } from './template-builder';

export interface FailedRowLike {
  rowNumber: number;
  data: Record<string, unknown>;
  errorReason: string;
}

export async function buildErrorReportWorkbook(failedRows: FailedRowLike[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Errors');

  sheet.columns = [
    { header: 'Row Number', key: 'rowNumber', width: 12 },
    ...HEADERS.map((h) => ({ header: h.header, key: h.key, width: h.width })),
    { header: 'Error Reason', key: 'errorReason', width: 50 },
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

  for (const row of failedRows) {
    sheet.addRow({ rowNumber: row.rowNumber, ...row.data, errorReason: row.errorReason });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
