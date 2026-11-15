import { getAdminClient } from '@/shared/wix/admin-client';
import { instantToLocalTime } from './site-time';

export interface ReserveReceipt {
  id: string;
  status: string;
  instant: string;
  localDate: string;
  localTime: string;
  partySize: number;
  experienceId?: string;
}

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const localDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const getReserveReceipt = async (value: string | undefined | null): Promise<ReserveReceipt | null> => {
  const id = (value ?? '').trim();
  if (!ID_PATTERN.test(id)) return null;
  try {
    const reservation = await getAdminClient().reservations.getReservation(id);
    const startDate = reservation?.details?.startDate;
    if (!reservation || !startDate) return null;
    const instant = startDate instanceof Date ? startDate : new Date(String(startDate));
    if (Number.isNaN(instant.getTime())) return null;
    const experienceId = (reservation.details as { experienceId?: string | null } | undefined)?.experienceId;
    return {
      id: reservation._id ?? id,
      status: typeof reservation.status === 'string' ? reservation.status : '',
      instant: instant.toISOString(),
      localDate: localDateFormatter.format(instant),
      localTime: instantToLocalTime(instant),
      partySize: reservation.details?.partySize ?? 0,
      ...(typeof experienceId === 'string' && experienceId ? { experienceId } : {}),
    };
  } catch (error) {
    console.error('[reserve] receipt lookup failed', error);
    return null;
  }
};
