export interface DateRangeFilter {
  dateDebut?: Date;
  dateFin?: Date;
}

export function optionalString(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export function optionalBoolean(value: unknown): boolean | undefined {
  const raw = optionalString(value);

  if (raw === undefined) {
    return undefined;
  }

  if (["true", "1", "yes", "oui"].includes(raw.toLowerCase())) {
    return true;
  }

  if (["false", "0", "no", "non"].includes(raw.toLowerCase())) {
    return false;
  }

  return undefined;
}

export function parseDateRange(query: Record<string, unknown>): DateRangeFilter {
  return {
    dateDebut: parseDate(query.dateDebut),
    dateFin: parseDate(query.dateFin),
  };
}

export function buildDateRange(range: DateRangeFilter) {
  if (!range.dateDebut && !range.dateFin) {
    return undefined;
  }

  return {
    ...(range.dateDebut ? { gte: startOfDay(range.dateDebut) } : {}),
    ...(range.dateFin ? { lt: nextDay(range.dateFin) } : {}),
  };
}

export function singleDayRange(date?: Date): { start: Date; end: Date } {
  const start = startOfDay(date ?? new Date());
  return { start, end: nextDay(start) };
}

function parseDate(value: unknown): Date | undefined {
  const raw = optionalString(value);

  if (!raw) {
    return undefined;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function nextDay(date: Date): Date {
  const end = startOfDay(date);
  end.setDate(end.getDate() + 1);
  return end;
}
