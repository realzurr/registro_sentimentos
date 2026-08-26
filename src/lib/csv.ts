export function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (
    str.includes(";") ||
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvLinhas(
  registros: Array<Record<string, unknown>>,
  colunas: string[],
  separador = ";",
): string[] {
  return registros.map((r) => colunas.map((c) => escapeCsv(r[c])).join(separador));
}
