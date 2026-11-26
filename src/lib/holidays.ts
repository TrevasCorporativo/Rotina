export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// Anonymous Gregorian Easter algorithm
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0);
}

const holidayCache = new Map<number, Map<string, string>>();

export function getBrazilianHolidaysMap(year: number): Map<string, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const map = new Map<string, string>();

  // Fixed national holidays in Brazil
  const fixed: Array<[string, string]> = [
    [`${year}-01-01`, 'Confraternização Universal'],
    [`${year}-04-21`, 'Tiradentes'],
    [`${year}-05-01`, 'Dia do Trabalho'],
    [`${year}-09-07`, 'Independência do Brasil'],
    [`${year}-10-12`, 'Nossa Sra. Aparecida'],
    [`${year}-11-02`, 'Finados'],
    [`${year}-11-15`, 'Proclamação da República'],
    [`${year}-11-20`, 'Consciência Negra'],
    [`${year}-12-25`, 'Natal'],
  ];

  for (const [date, name] of fixed) {
    map.set(date, name);
  }

  // Movable holidays based on Easter
  const easter = getEasterDate(year);
  map.set(formatYMD(addDays(easter, -48)), 'Carnaval (Segunda)');
  map.set(formatYMD(addDays(easter, -47)), 'Carnaval');
  map.set(formatYMD(addDays(easter, -2)), 'Sexta-feira Santa');
  map.set(formatYMD(easter), 'Páscoa');
  map.set(formatYMD(addDays(easter, 60)), 'Corpus Christi');

  holidayCache.set(year, map);
  return map;
}

export function getHolidayForDate(dateStr: string): string | null {
  const year = Number(dateStr.slice(0, 4));
  if (!year) return null;
  return getBrazilianHolidaysMap(year).get(dateStr) ?? null;
}

