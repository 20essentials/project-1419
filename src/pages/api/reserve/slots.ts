import type { APIRoute } from "astro";
import { listReserveSlots } from "@/features/reserve/reserve-slots";
import {
  jsonOk,
  isReserveError,
  jsonError,
  RESERVE_ERROR_STATUS,
} from "@/features/reserve/reserve-error";
import {
  SITE_TIMEZONE,
  isLocalDate,
  localWindow,
} from "@/features/reserve/site-time";

export const GET: APIRoute = async ({ url }) => {
  const params = url.searchParams;
  const date = params.get("date") ?? "";
  const partySize = Number(params.get("partySize") ?? "NaN");
  const experienceId = params.get("experienceId") ?? undefined;
  try {
    if (!isLocalDate(date)) {
      return jsonError(
        "INVALID_INPUT",
        RESERVE_ERROR_STATUS.INVALID_INPUT,
        "date requerido (YYYY-MM-DD)",
      );
    }
    const { today, maxDate } = localWindow();
    if (date < today || date > maxDate) {
      return jsonError(
        "INVALID_INPUT",
        RESERVE_ERROR_STATUS.INVALID_INPUT,
        `date entre ${today} y ${maxDate}`,
      );
    }
    if (!Number.isInteger(partySize)) {
      return jsonError(
        "INVALID_INPUT",
        RESERVE_ERROR_STATUS.INVALID_INPUT,
        "partySize requerido",
      );
    }
    const slots = await listReserveSlots(date, partySize, experienceId);
    return jsonOk({ timeZone: SITE_TIMEZONE, date, partySize, slots }, 200, {
      "Cache-Control": "no-store",
    });
  } catch (error) {
    if (isReserveError(error))
      return jsonError(error.code, error.status, error.message);
    console.error("[reserve/slots] failed", error);
    return jsonError(
      "RESERVATION_UNAVAILABLE",
      RESERVE_ERROR_STATUS.RESERVATION_UNAVAILABLE,
    );
  }
};
