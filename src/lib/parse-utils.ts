export function parseEmocoes(dbValue: string): string[] {
  try {
    const parsed = JSON.parse(dbValue);
    return Array.isArray(parsed) ? parsed : [dbValue];
  } catch {
    return [dbValue];
  }
}

export function parseSintomas(dbValue: string | null): string[] {
  if (!dbValue) return [];
  try {
    const parsed = JSON.parse(dbValue);
    return Array.isArray(parsed) ? parsed : [dbValue];
  } catch {
    return [dbValue];
  }
}

export function toOptionalJson(value: string | string[] | null | undefined): string | null {
  if (value == null) return null;
  return Array.isArray(value) ? JSON.stringify(value) : value;
}
