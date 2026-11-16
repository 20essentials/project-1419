import translations from "../../translations.json" with { type: "json" };
import esBuild from "../../../.wix/multilingual/translations/es.json" with { type: "json" };
import itBuild from "../../../.wix/multilingual/translations/it.json" with { type: "json" };
import { env } from "cloudflare:workers";
import type { Locale } from "./t";

export type Dictionary = Record<string, string>;

interface KVLike {
  get(key: string, type: "json"): Promise<unknown>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
}

interface WixContent {
  entityId?: string;
  locale?: string;
  publishStatus?: string;
  fields?: Record<string, { textValue?: string } | undefined>;
}

const RUNTIME_LOCALES: Locale[] = ["es", "it"];
const MEMO_TTL_MS = 60_000;
const KV_TTL_SECONDS = 300;

const KEYS = new Set(Object.keys(translations as Dictionary));

const buildDictionaries: Partial<Record<Locale, Dictionary>> = {
  es: esBuild as Dictionary,
  it: itBuild as Dictionary,
};

let version: string | null = null;

const dictionaryVersion = (): string => {
  if (!version) {
    let hash = 5381;
    for (const key of KEYS) {
      for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0;
      }
    }
    version = hash.toString(36);
  }
  return version;
};

const HOT = `tr:all:v${dictionaryVersion()}`;
const WARM = `tr:all:last`;

const translationsKv = (): KVLike | null =>
  (env as { TRANSLATIONS?: KVLike }).TRANSLATIONS ?? null;

let memo: { payload: Record<string, Dictionary>; expires: number } | null =
  null;

const isPayload = (value: unknown): value is Record<string, Dictionary> =>
  typeof value === "object" && value !== null;

const fetchAll = async (): Promise<Record<string, Dictionary>> => {
  const runtime = env as Record<string, string | undefined>;
  const apiKey = runtime.WIX_API_KEY;
  const siteId = runtime.WIX_SITE_ID;
  if (!apiKey || !siteId) {
    throw new Error("faltan WIX_API_KEY/WIX_SITE_ID en el runtime");
  }
  const payload: Record<string, Dictionary> = {};
  let cursor: string | undefined;
  do {
    const response = await fetch(
      "https://www.wixapis.com/translation-content/v1/contents/query",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "wix-site-id": siteId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) },
          },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `translation-content query respondió ${response.status}: ${await response.text()}`,
      );
    }
    const data = (await response.json()) as {
      contents?: WixContent[];
      pagingMetadata?: { cursors?: { next?: string } };
    };
    for (const content of data.contents ?? []) {
      const locale = content.locale as Locale | undefined;
      if (
        !locale ||
        !RUNTIME_LOCALES.includes(locale) ||
        content.publishStatus !== "PUBLISHED" ||
        !content.entityId ||
        !KEYS.has(content.entityId)
      ) {
        continue;
      }
      const value = content.fields?.["static-field"]?.textValue;
      if (typeof value === "string" && value.length > 0) {
        payload[locale] ??= {};
        payload[locale][content.entityId] = value;
      }
    }
    cursor = data.pagingMetadata?.cursors?.next;
  } while (cursor);
  for (const locale of RUNTIME_LOCALES) {
    if (!payload[locale]) throw new Error(`Wix no devolvió contenido ${locale}`);
  }
  return payload;
};

const loadPayload = async (): Promise<Record<string, Dictionary>> => {
  const now = Date.now();
  if (memo && memo.expires > now) return memo.payload;
  const namespace = translationsKv();
  if (namespace) {
    try {
      const cached = await namespace.get(HOT, "json");
      if (isPayload(cached)) {
        memo = { payload: cached, expires: now + MEMO_TTL_MS };
        return cached;
      }
    } catch {}
  }
  try {
    const payload = await fetchAll();
    if (namespace) {
      try {
        await namespace.put(HOT, JSON.stringify(payload), {
          expirationTtl: KV_TTL_SECONDS,
        });
        await namespace.put(WARM, JSON.stringify(payload));
      } catch {}
    }
    memo = { payload, expires: now + MEMO_TTL_MS };
    return payload;
  } catch (error) {
    if (namespace) {
      try {
        const stale = await namespace.get(WARM, "json");
        if (isPayload(stale)) {
          console.warn(
            "[i18n] API de traducciones caída: servido desde KV (stale)",
          );
          memo = { payload: stale, expires: now + MEMO_TTL_MS };
          return stale;
        }
      } catch {}
    }
    console.warn(
      "[i18n] diccionario runtime no disponible, fallback al JSON del build:",
      error,
    );
    return {};
  }
};

export const loadDictionary = async (
  locale: Locale,
): Promise<Dictionary> => {
  if (!RUNTIME_LOCALES.includes(locale)) return {};
  const payload = await loadPayload();
  return payload[locale] ?? { ...buildDictionaries[locale] };
};
