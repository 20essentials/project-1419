import { getAdminClient } from "@/shared/wix/admin-client";
import type reservations from "@wix/table-reservations";
import { isValidPhoneNumber } from "libphonenumber-js/min";
import { getReserveContext } from "./reservation-context";
import { slotIsAvailable } from "./reserve-slots";
import { ReserveError, RESERVE_ERROR_STATUS } from "./reserve-error";
import {
  isLocalDate,
  isLocalTime,
  localToInstant,
  localWindow,
} from "./site-time";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateReserveInput {
  date: string;
  time: string;
  partySize: number;
  experienceId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  note?: string;
  contactId?: string;
}

export interface CreateReserveReceipt {
  id: string;
  status: string;
  localStart: string;
  partySize: number;
  experienceId?: string;
}

interface WixViolation {
  field: string;
  ruleName?: string;
}

function wixFieldViolations(error: unknown): WixViolation[] {
  if (!error || typeof error !== "object") return [];
  const details = (error as { details?: Record<string, unknown> }).details;
  if (!details || typeof details !== "object") return [];
  const validationError = details.validationError as
    { fieldViolations?: WixViolation[] } | undefined;
  return (validationError?.fieldViolations ?? []).filter(
    (violation) => typeof violation?.field === "string",
  );
}

function wixApplicationError(error: unknown): {
  code?: string;
  description?: string;
  validationRule?: string;
} {
  if (!error || typeof error !== "object") return {};
  const details = (error as { details?: Record<string, unknown> }).details;
  if (!details || typeof details !== "object") return {};
  const applicationError = details.applicationError as
    { code?: string; description?: string } | undefined;
  const validationErrors = details.validationErrors as
    { ruleName?: string }[] | undefined;
  const validationError = details.validationError as
    { fieldViolations?: { ruleName?: string }[] } | undefined;
  return {
    code: applicationError?.code,
    description: applicationError?.description,
    validationRule:
      validationErrors?.find((entry) => entry.ruleName)?.ruleName ??
      validationError?.fieldViolations?.find((entry) => entry.ruleName)
        ?.ruleName,
  };
}

const USER_FIELD_BY_WIX_FIELD: Record<string, string> = {
  "reservation.reservee.phone": "phone",
  "reservation.reservee.email": "email",
  "reservation.reservee.firstName": "firstName",
  "reservation.reservee.lastName": "lastName",
  phone: "phone",
  email: "email",
  firstName: "firstName",
  lastName: "lastName",
};

const FIELD_DETAIL: Record<string, string> = {
  phone:
    "el teléfono no es válido (incluye el prefijo internacional, ej. +34600600600)",
  email: "el email no es válido",
  firstName: "el nombre no es válido",
  lastName: "los apellidos no son válidos",
};

export function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2 || parts[0].length === 0) return "***";
  const first = parts[0];
  return `${first.slice(0, first.length > 2 ? 2 : 1)}***@${parts[1]}`;
}

export async function createReserveBooking(
  input: CreateReserveInput,
): Promise<CreateReserveReceipt> {
  const context = await getReserveContext();
  const { location } = context;
  if (!location.onlineReservationsEnabled) {
    throw new ReserveError(
      "NO_AVAILABILITY",
      RESERVE_ERROR_STATUS.NO_AVAILABILITY,
      "reservas online desactivadas",
    );
  }

  const partySize = Number(input.partySize);
  const experience = input.experienceId
    ? context.experiences.find(
        (candidate) => candidate.id === input.experienceId,
      )
    : null;
  if (input.experienceId && !experience) {
    throw new ReserveError(
      "EXPERIENCE_NOT_FOUND",
      RESERVE_ERROR_STATUS.EXPERIENCE_NOT_FOUND,
      "experiencia desconocida",
    );
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const phone = input.phone.trim().replace(/[()\s-]/g, "");
  const note = input.note?.trim() ?? "";
  if (!isLocalDate(input.date)) {
    throw new ReserveError(
      "INVALID_INPUT",
      RESERVE_ERROR_STATUS.INVALID_INPUT,
      "date inválido (YYYY-MM-DD)",
    );
  }
  if (!isLocalTime(input.time)) {
    throw new ReserveError(
      "INVALID_INPUT",
      RESERVE_ERROR_STATUS.INVALID_INPUT,
      "time inválido (HH:mm)",
    );
  }
  const { today, maxDate } = localWindow();
  if (input.date < today || input.date > maxDate) {
    throw new ReserveError(
      "NO_AVAILABILITY",
      RESERVE_ERROR_STATUS.NO_AVAILABILITY,
      `reservas hasta ${maxDate}`,
    );
  }
  const minPartySize = experience
    ? Math.max(
        location.partySize.min,
        experience.partySize?.min ?? location.partySize.min,
      )
    : location.partySize.min;
  const maxPartySize = experience
    ? Math.min(
        location.partySize.max,
        experience.partySize?.max ?? location.partySize.max,
      )
    : location.partySize.max;
  if (
    !Number.isInteger(partySize) ||
    partySize < minPartySize ||
    partySize > maxPartySize
  ) {
    throw new ReserveError(
      "INVALID_INPUT",
      RESERVE_ERROR_STATUS.INVALID_INPUT,
      `partySize entre ${minPartySize} y ${maxPartySize}`,
    );
  }
  if (!firstName) {
    throw new ReserveError(
      "INVALID_INPUT",
      RESERVE_ERROR_STATUS.INVALID_INPUT,
      "el nombre es obligatorio",
      "firstName",
    );
  }
  if (!phone) {
    throw new ReserveError(
      "INVALID_INPUT",
      RESERVE_ERROR_STATUS.INVALID_INPUT,
      "el teléfono es obligatorio",
      "phone",
    );
  }
  if (!phone.startsWith("+") || !isValidPhoneNumber(phone)) {
    throw new ReserveError(
      "INVALID_INPUT",
      RESERVE_ERROR_STATUS.INVALID_INPUT,
      "el teléfono no es válido (incluye el prefijo internacional, ej. +34600600600)",
      "phone",
    );
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new ReserveError(
      "INVALID_INPUT",
      RESERVE_ERROR_STATUS.INVALID_INPUT,
      "email inválido",
      "email",
    );
  }
  if (note.length > 500) {
    throw new ReserveError(
      "INVALID_INPUT",
      RESERVE_ERROR_STATUS.INVALID_INPUT,
      "nota demasiado larga",
    );
  }

  const available = await slotIsAvailable(
    input.date,
    input.time,
    partySize,
    input.experienceId,
  );
  if (!available) {
    throw new ReserveError(
      "NO_AVAILABILITY",
      RESERVE_ERROR_STATUS.NO_AVAILABILITY,
      "sin hueco a esa hora",
    );
  }
  console.info(
    "[reserve] intento",
    input.date,
    input.time,
    "party",
    partySize,
    note ? "con nota" : "sin nota",
  );

  const details: Record<string, unknown> = {
    reservationLocationId: location.id,
    startDate: localToInstant(input.date, input.time),
    partySize,
  };
  if (experience) {
    details.experienceId = experience.id;
  }
  const reservee: Record<string, unknown> = {
    firstName,
    lastName,
    email,
    phone,
    ...(input.contactId ? { contactId: input.contactId } : {}),
  };

  const payload = { details, reservee } as unknown as Parameters<
    typeof reservations.createReservation
  >[0];
  try {
    const created =
      await getAdminClient().reservations.createReservation(payload);
    const done = created as { _id?: string | null; status?: string | null };
    console.info(
      "[reserve] create",
      input.date,
      input.time,
      partySize,
      experience ? `experience ${experience.id}` : "table",
      maskEmail(email),
      "->",
      done.status,
    );
    if (!done._id) {
      throw new ReserveError(
        "RESERVATION_UNAVAILABLE",
        RESERVE_ERROR_STATUS.RESERVATION_UNAVAILABLE,
        "wix no devolvió reserva",
      );
    }
    return {
      id: done._id,
      status: done.status ?? "RESERVED",
      localStart: `${input.date}T${input.time}:00`,
      partySize,
      ...(experience ? { experienceId: experience.id } : {}),
    };
  } catch (error) {
    throw mapWixFailure(error);
  }
}

export function mapWixFailure(error: unknown): ReserveError {
  if (error instanceof ReserveError) return error;
  const details =
    error && typeof error === "object"
      ? (error as { details?: unknown }).details
      : undefined;
  const violations = wixFieldViolations(error);
  if (violations.length > 0) {
    console.error(
      "[reserve] wix validation",
      JSON.stringify(details) ?? "",
      violations
        .map((violation) => `${violation.field}:${violation.ruleName ?? "?"}`)
        .join(", "),
    );
    const first = violations[0];
    const field =
      USER_FIELD_BY_WIX_FIELD[first.field] ??
      USER_FIELD_BY_WIX_FIELD[first.field.split(".").pop() ?? ""];
    return new ReserveError(
      "INVALID_INPUT",
      RESERVE_ERROR_STATUS.INVALID_INPUT,
      FIELD_DETAIL[field ?? ""] ?? "datos inválidos",
      field,
    );
  }
  const {
    code,
    description: detail,
    validationRule,
  } = wixApplicationError(error);
  if (
    code === "INVALID_ARGUMENT" ||
    code === "VALIDATION_ERROR" ||
    validationRule
  ) {
    console.error(
      "[reserve] wix invalid argument",
      JSON.stringify(details) ?? "",
    );
    return new ReserveError(
      "INVALID_INPUT",
      RESERVE_ERROR_STATUS.INVALID_INPUT,
      detail ?? "datos inválidos",
    );
  }
  if (code === "MUST_BE_PREMIUM" || code === "PREMIUM_ONLY") {
    console.error("[reserve] premium gate", detail ?? code);
    return new ReserveError(
      "PREMIUM_ONLY",
      RESERVE_ERROR_STATUS.PREMIUM_ONLY,
      "reservas online aún no activas (premium)",
    );
  }
  if (
    code === "TIME_NOT_AVAILABLE" ||
    code === "NOT_AVAILABLE" ||
    code === "RESERVATION_NOT_AVAILABLE" ||
    code === "SEAT_NOT_AVAILABLE" ||
    validationRule === "RESERVATION_VIOLATION"
  ) {
    return new ReserveError(
      "NO_AVAILABILITY",
      RESERVE_ERROR_STATUS.NO_AVAILABILITY,
      detail ?? "sin disponibilidad",
    );
  }
  console.error(
    "[reserve] wix failure",
    JSON.stringify(details) || JSON.stringify(error),
    code ?? "<sin codigo>",
    detail ?? "",
  );
  return new ReserveError(
    "RESERVATION_UNAVAILABLE",
    RESERVE_ERROR_STATUS.RESERVATION_UNAVAILABLE,
    "servicio de reservas no disponible",
  );
}
