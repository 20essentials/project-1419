import type { APIRoute } from 'astro';
import { getReserveContext } from '@/features/reserve/reservation-context';
import { jsonOk, isReserveError, jsonError, RESERVE_ERROR_STATUS } from '@/features/reserve/reserve-error';
import { MAX_ADVANCE_DAYS } from '@/features/reserve/site-time';

export const GET: APIRoute = async () => {
  try {
    const { location, experiences } = await getReserveContext();
    return jsonOk(
      {
        timeZone: location.timeZone,
        onlineReservationsEnabled: location.onlineReservationsEnabled,
        approvalMode: location.approvalMode,
        partySize: location.partySize,
        minimumReservationNotice: location.minimumReservationNotice,
        defaultTurnoverTime: location.defaultTurnoverTime,
        timeSlotInterval: location.timeSlotInterval,
        advanceWindowDays: MAX_ADVANCE_DAYS,
        schedule: location.schedule,
        experiences,
      },
      200,
      { 'Cache-Control': 'public, max-age=600' },
    );
  } catch (error) {
    console.error('[reserve/setup] failed', error);
    if (isReserveError(error)) return jsonError(error.code, error.status);
    return jsonError('RESERVATION_UNAVAILABLE', RESERVE_ERROR_STATUS.RESERVATION_UNAVAILABLE);
  }
};
