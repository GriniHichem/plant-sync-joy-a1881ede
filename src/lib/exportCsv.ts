/**
 * Export an array of objects to a CSV file and trigger download.
 * @param data - Array of objects
 * @param columns - Column definitions: { key, label }
 * @param filename - Output filename (without extension)
 */
export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  columns: { key: string; label: string; format?: (val: any, row: T) => string }[],
  filename: string
) {
  if (data.length === 0) return;

  const separator = ";";
  const header = columns.map((c) => `"${c.label}"`).join(separator);
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const raw = c.key.includes(".")
          ? c.key.split(".").reduce((o, k) => o?.[k], row as any)
          : row[c.key];
        const val = c.format ? c.format(raw, row) : raw;
        const str = val == null ? "" : String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(separator)
  );

  const bom = "\uFEFF"; // UTF-8 BOM for Excel
  const csv = bom + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
