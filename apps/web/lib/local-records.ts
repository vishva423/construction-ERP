export function readLocalRecords<T>(key: string, isRecord: (value: unknown) => value is T): T[] {
  const stored = window.localStorage.getItem(key);
  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
    throw new Error('Saved local records have an invalid format.');
  }
  return parsed;
}

export function writeLocalRecords<T>(key: string, records: T[]) {
  window.localStorage.setItem(key, JSON.stringify(records));
}
