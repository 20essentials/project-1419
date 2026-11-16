import type { APIRoute } from "astro";
import { createReserveBooking } from "@/features/reserve/create-reservation";
import {
  jsonOk,
  isReserveError,
  jsonError,
  RESERVE_ERROR_STATUS,
} from "@/features/reserve/reserve-error";
import { getMemberSession, requestIsSecure } from "@/shared/auth/session";
import { getMemberContactId } from "@/features/account/account-data";

interface CreateReserveBody {
  date?: unknown;
  time?: unknown;
  partySize?: unknown;
  experienceId?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  note?: unknown;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as CreateReserveBody | null;
    if (!body) {
      return jsonError(
        "INVALID_INPUT",
        RESERVE_ERROR_STATUS.INVALID_INPUT,
        "JSON inválido",
      );
    }
    let contactId: string | undefined;
    const session = await getMemberSession(cookies, requestIsSecure(request));
    if (session) {
      try {
        contactId = (await getMemberContactId(session)) ?? undefined;
      } catch {
        contactId = undefined;
      }
    }
    const receipt = await createReserveBooking({
      date: asString(body.date),
      time: asString(body.time),
      partySize: Number(body.partySize),
      experienceId: asString(body.experienceId) || undefined,
      firstName: asString(body.firstName),
      lastName: asString(body.lastName),
      email: asString(body.email),
      phone: asString(body.phone),
      note: asString(body.note) || undefined,
      contactId,
    });
    return jsonOk(
      {
        reservation: {
          id: receipt.id,
          status: receipt.status,
          localStart: receipt.localStart,
          partySize: receipt.partySize,
          ...(receipt.experienceId
            ? { experienceId: receipt.experienceId }
            : {}),
        },
      },
      200,
    );
  } catch (error) {
    if (isReserveError(error))
      return jsonError(error.code, error.status, error.message, error.field);
    console.error("[reserve/create] unexpected failure", error);
    return jsonError(
      "RESERVATION_UNAVAILABLE",
      RESERVE_ERROR_STATUS.RESERVATION_UNAVAILABLE,
    );
  }
};
