import type { MiddlewareHandler } from "astro";
import { setDictionaryLoader } from "@/shared/i18n/t";
import { loadDictionary } from "@/shared/i18n/get-translations";

setDictionaryLoader(loadDictionary);

export const onRequest: MiddlewareHandler = async (_context, next) => next();
