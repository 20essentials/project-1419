import { getAdminClient } from '@/shared/wix/admin-client';
import { SITE_TIMEZONE } from './site-time';

export interface ReserveLocationContext {
  id: string;
  timeZone: string;
  approvalMode: string;
  onlineReservationsEnabled: boolean;
  partySize: { min: number; max: number };
  minimumReservationNotice: { number: number; unit: string };
  defaultTurnoverTime: number | null;
  timeSlotInterval: number;
  schedule: { openDay: string; openTime: string; closeDay: string; closeTime: string }[];
}

export interface ScheduleEntry {
  recurrence: string;
  weeklyOptions?: { startDate?: string | null; endDate?: string | null; startDaysAndTimes?: { day?: string; time?: string | null }[] };
  oneTimeOptions?: { startDate?: string | null; startTime?: string | null };
}

export interface ReserveExperience {
  id: string;
  slug: string | null;
  labelKey: string;
  partySize: { min: number; max: number } | null;
  pricePerGuest: string | null;
  currency: string | null;
  durationInMinutes: number | null;
  schedule: ScheduleEntry[];
}

export interface ReserveContext {
  location: ReserveLocationContext;
  experiences: ReserveExperience[];
}

interface RawReservationLocation {
  _id?: string | null;
  default?: boolean | null;
  configuration?: {
    onlineReservations?: {
      onlineReservationsEnabled?: boolean | null;
      timeSlotInterval?: number | null;
      defaultTurnoverTime?: number | null;
      approval?: { mode?: string | null };
      partySize?: { min?: number | null; max?: number | null };
      minimumReservationNotice?: { number?: number | null; unit?: string | null };
      businessSchedule?: { periods?: { openDay?: string; openTime?: string; closeDay?: string; closeTime?: string }[] };
    };
  };
}

interface RawExperience {
  _id?: string | null;
  slug?: string | null;
  currency?: string | null;
  configuration?: {
    displayInfo?: { name?: string | null };
    paymentPolicy?: { perGuestOptions?: { price?: string | null } };
    onlineReservations?: {
      partySize?: { min?: number | null; max?: number | null };
      businessSchedule?: {
        durationInMinutes?: number | null;
        entries?: ScheduleEntry[];
      };
    };
  };
}

function kebab(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function readReservationLocation(client: ReturnType<typeof getAdminClient>): Promise<ReserveLocationContext> {
  const response = await client.reservationLocations.listReservationLocations();
  const raws = (response.reservationLocations ?? []) as RawReservationLocation[];
  const raw = raws.find((loc) => loc.default) ?? raws[0];
  if (!raw?._id) {
    throw new Error('reservation location no configurada en el sitio Wix');
  }
  const businessLocations = await client.locations.listLocations();
  const businessDefault = (businessLocations.locations ?? []).find((loc) => loc.default);
  const config = raw.configuration ?? {};
  const online = config.onlineReservations ?? {};
  const notice = online.minimumReservationNotice ?? {};
  return {
    id: raw._id as string,
    timeZone: businessDefault?.timeZone ?? SITE_TIMEZONE,
    approvalMode: online.approval?.mode ?? 'AUTOMATIC',
    onlineReservationsEnabled: online.onlineReservationsEnabled === true,
    partySize: { min: online.partySize?.min ?? 1, max: online.partySize?.max ?? 8 },
    minimumReservationNotice: { number: notice.number ?? 0, unit: notice.unit ?? 'MINUTES' },
    defaultTurnoverTime: online.defaultTurnoverTime ?? null,
    timeSlotInterval: online.timeSlotInterval ?? 15,
    schedule: (online.businessSchedule?.periods ?? []).map((period) => ({
      openDay: period.openDay ?? '',
      openTime: period.openTime ?? '',
      closeDay: period.closeDay ?? '',
      closeTime: period.closeTime ?? '',
    })),
  };
}

async function readExperiences(client: ReturnType<typeof getAdminClient>): Promise<ReserveExperience[]> {
  const result = await client.experiences.queryExperiences().limit(50).find();
  const raws = (result.items ?? []) as RawExperience[];
  return raws
    .filter((raw) => raw._id)
    .map((raw) => {
      const online = raw.configuration?.onlineReservations;
      const name = raw.configuration?.displayInfo?.name ?? '';
      const label = raw.slug ?? kebab(name);
      return {
        id: raw._id as string,
        slug: raw.slug ?? null,
        labelKey: label ? `reserve.experience.${label}` : '',
        partySize: online?.partySize ? { min: online.partySize.min ?? 1, max: online.partySize.max ?? 8 } : null,
        pricePerGuest: raw.configuration?.paymentPolicy?.perGuestOptions?.price ?? null,
        currency: raw.currency ?? null,
        durationInMinutes: online?.businessSchedule?.durationInMinutes ?? null,
        schedule: online?.businessSchedule?.entries ?? [],
      };
    });
}

export async function getReserveContext(): Promise<ReserveContext> {
  const client = getAdminClient();
  const [location, experiences] = await Promise.all([readReservationLocation(client), readExperiences(client)]);
  return { location, experiences };
}

export function findExperience(context: ReserveContext, experienceId: string | undefined): ReserveExperience | null {
  if (!experienceId) return null;
  return context.experiences.find((experience) => experience.id === experienceId) ?? null;
}
