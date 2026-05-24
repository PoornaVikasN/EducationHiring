export interface CsvColumn<T> {
  header: string;
  key: keyof T | ((row: T) => string);
}

export function downloadCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
): void {
  const escape = (val: unknown): string => {
    if (val == null) return '';
    const str = String(val);
    return str.includes('"') || str.includes(',') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const header = columns.map((c) => escape(c.header)).join(',');
  const body = rows.map((row) =>
    columns
      .map((c) =>
        escape(typeof c.key === 'function' ? c.key(row) : row[c.key]),
      )
      .join(','),
  );

  const isoDate = new Date().toISOString().slice(0, 10);
  const bom = '﻿'; // UTF-8 BOM — ensures Excel opens ₹ correctly
  const csv = bom + [header, ...body].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${isoDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
