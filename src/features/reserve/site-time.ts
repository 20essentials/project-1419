export const SITE_TIMEZONE = "Europe/Madrid";

export const MAX_ADVANCE_DAYS = 60;

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const localDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SITE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const localWallFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SITE_TIMEZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const localTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SITE_TIMEZONE,
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
});

const localWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SITE_TIMEZONE,
  weekday: "long",
});

export const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export function isLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function isLocalTime(value: string): boolean {
  return LOCAL_TIME_PATTERN.test(value);
}

export function siteToday(reference: Date = new Date()): string {
  return localDateFormatter.format(reference);
}

export function weekdayOfLocalDate(date: string): string {
  return localWeekdayFormatter
    .format(new Date(`${date}T12:00:00Z`))
    .toUpperCase();
}

export function localWindow(reference: Date = new Date()): {
  today: string;
  maxDate: string;
} {
  const today = siteToday(reference);
  const anchor = Date.parse(`${today}T12:00:00Z`);
  const maxDate = new Date(anchor + MAX_ADVANCE_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return { today, maxDate };
}

export function minutesUntil(instant: Date, now: Date = new Date()): number {
  return Math.floor((instant.getTime() - now.getTime()) / 60_000);
}

function zoneOffsetMinutes(instant: Date): number {
  const parts = localWallFormatter.formatToParts(instant);
  const num = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  let hour = num("hour");
  if (hour === 24) hour = 0;
  const wall = Date.UTC(
    num("year"),
    num("month") - 1,
    num("day"),
    hour,
    num("minute"),
    num("second"),
  );
  return Math.round((wall - instant.getTime()) / 60_000);
}

export function localToInstant(date: string, time: string): Date {
  const naive = Date.parse(`${date}T${time}:00Z`);
  const first = zoneOffsetMinutes(new Date(naive));
  const refined = zoneOffsetMinutes(new Date(naive - first * 60_000));
  return new Date(naive - refined * 60_000);
}

export function instantToLocalTime(instant: Date): string {
  return localTimeFormatter.format(instant);
}
