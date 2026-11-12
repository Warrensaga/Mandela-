type Cell = string | number | boolean | null | undefined;

function escape(value: Cell): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Guard against spreadsheet formula injection from customer-entered text.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
}

/** Triggers a CSV download in the browser (UTF-8 with BOM so Excel reads it correctly). */
export function downloadCsv(filename: string, headers: string[], rows: Cell[][]): void {
  const blob = new Blob(['﻿', toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
