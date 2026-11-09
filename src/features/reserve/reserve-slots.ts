import { getAdminClient } from '@/shared/wix/admin-client';
import { findExperience, getReserveContext } from './reservation-context';
import type { ReserveContext, ReserveExperience } from './reservation-context';
import { ReserveError, RESERVE_ERROR_STATUS } from './reserve-error';
import {
  MAX_ADVANCE_DAYS,
  instantToLocalTime,
  isLocalDate,
  isLocalTime,
  localToInstant,
  localWindow,
  minutesUntil,
  weekdayOfLocalDate,
} from './site-time';

interface RawTimeSlot {
  startDate?: Date | null;
  status?: string | null;
}

export interface ReserveSlot {
  time: string;
  available: boolean;
}

function noticeMinutes(context: ReserveContext): number {
  const notice = context.location.minimumReservationNotice;
  const number = notice.number;
  if (notice.unit === 'HOURS') return number * 60;
  if (notice.unit === 'DAYS') return number * 24 * 60;
  return number;
}

async function standardSlots(context: ReserveContext, date: string, partySize: number): Promise<ReserveSlot[]> {
  const client = getAdminClient();
  const response = await client.timeSlots.getTimeSlots(context.location.id, new Date(`${date}T12:00:00Z`), partySize, {
    slotsBefore: 50,
    slotsAfter: 50,
  });
  const raws = (response.timeSlots ?? []) as RawTimeSlot[];
  const notice = noticeMinutes(context);
  const now = new Date();
  const slots = new Map<string, ReserveSlot>();
  for (const raw of raws) {
    if (!raw.startDate) continue;
    const time = instantToLocalTime(raw.startDate);
    const previous = slots.get(time);
    const available = raw.status === 'AVAILABLE' && minutesUntil(raw.startDate, now) >= notice;
    slots.set(time, { time, available: (previous?.available ?? false) || available });
  }
  return [...slots.values()].sort((a, b) => a.time.localeCompare(b.time));
}

export function projectExperienceSlots(experience: ReserveExperience, date: string, noticeMinutes: number): ReserveSlot[] {
  const weekday = weekdayOfLocalDate(date);
  const now = new Date();
  const slots = new Set<string>();
  for (const entry of experience.schedule) {
    if (entry.recurrence === 'WEEKLY') {
      for (const start of entry.weeklyOptions?.startDaysAndTimes ?? []) {
        const time = start.time ?? '';
        if (!isLocalTime(time) || (start.day ?? '').toUpperCase() !== weekday) continue;
        if (entry.weeklyOptions?.startDate && date < entry.weeklyOptions.startDate) continue;
        if (entry.weeklyOptions?.endDate && date > entry.weeklyOptions.endDate) continue;
        slots.add(time);
      }
    }
    if (entry.recurrence === 'ONE_TIME') {
      if (entry.oneTimeOptions?.startDate === date) {
        const time = entry.oneTimeOptions.startTime ?? '';
        if (isLocalTime(time)) slots.add(time);
      }
    }
  }
  return [...slots]
    .sort((a, b) => a.localeCompare(b))
    .map((time) => ({
      time,
      available: minutesUntil(localToInstant(date, time), now) >= noticeMinutes,
    }));
}

function partySizeBounds(context: ReserveContext, experience: ReserveExperience | null): { min: number; max: number } {
  const location = context.location.partySize;
  if (experience) {
    return {
      min: Math.max(location.min, experience.partySize?.min ?? location.min),
      max: Math.min(location.max, experience.partySize?.max ?? location.max),
    };
  }
  return location;
}

export async function listReserveSlots(date: string, partySize: number, experienceId?: string): Promise<ReserveSlot[]> {
  const context = await getReserveContext();
  if (!isLocalDate(date) || !Number.isInteger(partySize)) {
    throw new ReserveError('INVALID_INPUT', RESERVE_ERROR_STATUS.INVALID_INPUT, 'date o partySize inválidos');
  }
  const experience = findExperience(context, experienceId);
  if (experienceId && !experience) {
    throw new ReserveError('EXPERIENCE_NOT_FOUND', RESERVE_ERROR_STATUS.EXPERIENCE_NOT_FOUND, 'experiencia desconocida');
  }
  const bounds = partySizeBounds(context, experience);
  if (!Number.isInteger(partySize) || partySize < bounds.min || partySize > bounds.max) {
    throw new ReserveError('INVALID_INPUT', RESERVE_ERROR_STATUS.INVALID_INPUT, `partySize entre ${bounds.min} y ${bounds.max}`);
  }
  const { today, maxDate } = localWindow();
  if (date < today || date > maxDate) {
    throw new ReserveError('INVALID_INPUT', RESERVE_ERROR_STATUS.INVALID_INPUT, `date fuera de los ${MAX_ADVANCE_DAYS} días de margen`);
  }
  if (experience) {
    return projectExperienceSlots(experience, date, noticeMinutes(context));
  }
  return standardSlots(context, date, partySize);
}

export async function slotIsAvailable(date: string, time: string, partySize: number, experienceId?: string): Promise<boolean> {
  const slots = await listReserveSlots(date, partySize, experienceId);
  const slot = slots.find((candidate) => candidate.time === time);
  return slot?.available ?? false;
}
