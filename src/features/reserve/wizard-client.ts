import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";
import {
  DIAL_BY_CODE,
  DIAL_CODES,
  dialNumber,
  type DialCode,
} from "./dial-codes";

type Slot = { time: string; available: boolean };

type ReserveExperience = {
  id: string;
  slug: string | null;
  name: string;
  labelKey: string;
  partySize?: { min: number; max: number } | null;
};

type Setup = {
  timeZone: string;
  onlineReservationsEnabled: boolean;
  partySize?: { min: number; max: number };
  timeSlotInterval?: number;
  advanceWindowDays?: number;
  schedule?: { openDay: string; closeDay?: string }[];
  experiences?: ReserveExperience[];
};

type Reservation = {
  id: string;
  status: string;
  localStart: string;
  partySize: number;
};

type Data = {
  locale: string;
  home: string;
  confirmPath: string;
  back: string;
  next: string;
  submit: string;
  loading: string;
  window: string;
  slotsEmpty: string;
  retry: string;
  guests: string;
  experience: { title: string; table: string; short: string; full: string };
  errors: Record<string, string>;
  form: {
    required: string;
    email: string;
    phoneRequired: string;
    phone: string;
    phonePlaceholder: string;
    summary: string;
  };
  done: {
    reservedTitle: string;
    requestedTitle: string;
    reservedBody: string;
    requestedBody: string;
  };
};

const EASE = "transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]";
const PILL = `min-w-16 h-10 rounded-full px-4 text-sm ring-1 ${EASE}`;
const PILL_OFF = "text-crema ring-crema/20 hover:bg-crema/10";
const PILL_ON = "bg-teja text-bg ring-teja";
const PILL_DIM = "text-crema/40 ring-crema/10 pointer-events-none";
const PILL_PAST = "text-crema/20 ring-0 line-through pointer-events-none";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEP_NAMES = ["people", "date", "time", "details"];
const DEFAULT_COUNTRY: Record<string, CountryCode> = {
  en: "ES",
  es: "ES",
  it: "IT",
};

const setPillVariant = (element: HTMLElement, variant: string) => {
  element.classList.remove(
    ...PILL_ON.split(" "),
    ...PILL_OFF.split(" "),
    ...PILL_DIM.split(" "),
  );
  element.classList.add(...variant.split(" "));
};

const wizard = document.querySelector<HTMLElement>("[data-wizard]");
const payloadBox =
  document.querySelector<HTMLScriptElement>("[data-wizard-data]");

if (wizard && payloadBox && payloadBox.textContent) {
  const data = JSON.parse(payloadBox.textContent) as Data;

  const r = {
    live: wizard.querySelector<HTMLElement>("[data-live]")!,
    boot: wizard.querySelector<HTMLElement>('[data-state="boot"]')!,
    premium: wizard.querySelector<HTMLElement>('[data-state="premium"]')!,
    fatal: wizard.querySelector<HTMLElement>('[data-state="fatal"]')!,
    fatalText: wizard.querySelector<HTMLElement>("[data-fatal]")!,
    retry: wizard.querySelector<HTMLButtonElement>("[data-retry]")!,
    shell: wizard.querySelector<HTMLElement>('[data-state="wizard"]')!,
    done: wizard.querySelector<HTMLElement>('[data-state="done"]')!,
    doneTitle: wizard.querySelector<HTMLElement>("[data-done-title]")!,
    doneBody: wizard.querySelector<HTMLElement>("[data-done-body]")!,
    doneWhen: wizard.querySelector<HTMLElement>("[data-done-when]")!,
    doneParty: wizard.querySelector<HTMLElement>("[data-done-party]")!,
    doneRef: wizard.querySelector<HTMLElement>("[data-done-ref]")!,
    steps: wizard.querySelectorAll<HTMLElement>("[data-step]"),
    panels: [...wizard.querySelectorAll<HTMLElement>("[data-panel]")],
    party: wizard.querySelector<HTMLElement>("[data-party]")!,
    experienceGroup: wizard.querySelector<HTMLElement>(
      "[data-experience-group]",
    )!,
    experiences: wizard.querySelector<HTMLElement>("[data-experiences]")!,
    calendar: wizard.querySelector<HTMLElement>("[data-calendar]")!,
    monthEl: wizard.querySelector<HTMLElement>("[data-month]")!,
    monthPrev: wizard.querySelector<HTMLButtonElement>("[data-month-prev]")!,
    monthNext: wizard.querySelector<HTMLButtonElement>("[data-month-next]")!,
    windowEl: wizard.querySelector<HTMLElement>("[data-window]")!,
    slots: wizard.querySelector<HTMLElement>("[data-slots]")!,
    slotsSkeleton: wizard.querySelector<HTMLElement>("[data-slots-skeleton]")!,
    slotsRetry: wizard.querySelector<HTMLButtonElement>("[data-slots-retry]")!,
    summary: wizard.querySelector<HTMLElement>("[data-summary]")!,
    submit: wizard.querySelector<HTMLButtonElement>("[data-submit]")!,
    form: wizard.querySelector<HTMLFormElement>("[data-form]")!,
  };

  const nextButtons = new Map<number, HTMLButtonElement>();
  const prevButtons = new Map<number, HTMLButtonElement>();
  const panelErrors = new Map<number, HTMLElement>();

  const dialTrigger = wizard.querySelector<HTMLButtonElement>(
    "[data-dial-trigger]",
  )!;
  const dialPanel = wizard.querySelector<HTMLElement>("[data-dial-panel]")!;
  const dialSearch =
    dialPanel.querySelector<HTMLInputElement>("[data-dial-search]")!;
  const dialList = dialPanel.querySelector<HTMLElement>("[data-dial-list]")!;
  const dialEmpty = dialPanel.querySelector<HTMLElement>("[data-dial-empty]")!;
  const dialLabel =
    dialTrigger.querySelector<HTMLElement>("[data-dial-label]")!;
  const dialChevron = dialTrigger.querySelector<HTMLElement>(
    "[data-dial-chevron]",
  )!;
  const dialRoot = dialTrigger.parentElement as HTMLElement;

  const countryNames = new Intl.DisplayNames([data.locale], { type: "region" });
  const searchNames = ["en", "es", "it"].map(
    (locale) => new Intl.DisplayNames([locale], { type: "region" }),
  );
  const dialOptions = DIAL_CODES.map((entry) => ({
    entry,
    name: countryNames.of(entry.code) ?? entry.code,
    haystack:
      searchNames.map((names) => names.of(entry.code) ?? "").join(" ") +
      ` +${entry.dial}`,
  }));
  dialOptions.sort((a, b) => a.name.localeCompare(b.name, data.locale));

  let dialCountry: string = DEFAULT_COUNTRY[data.locale] ?? "ES";
  let dialOpen = false;
  let dialActive = dialCountry;
  const dialOptionMap = new Map<string, HTMLDivElement>();

  dialOptions.forEach(({ entry, name }) => {
    const option = document.createElement("div");
    option.id = `dial-option-${entry.code}`;
    option.setAttribute("role", "option");
    option.dataset.code = entry.code;
    option.textContent = `${name} +${entry.dial}`;
    option.className =
      "cursor-pointer rounded-xl px-4 py-2.5 text-sm text-crema/80 transition-colors duration-300 hover:bg-crema/10";
    option.addEventListener("click", () => {
      pickDial(entry.code);
      closeDial(true);
    });
    dialList.append(option);
    dialOptionMap.set(entry.code, option);
  });

  const paintDial = () => {
    const current =
      dialOptions.find((item) => item.entry.code === dialCountry) ??
      dialOptions[0];
    dialLabel.textContent = `${current.name} +${current.entry.dial}`;
    dialOptionMap.forEach((option, code) => {
      const selected = code === dialCountry;
      option.setAttribute("aria-selected", String(selected));
      option.classList.toggle("bg-teja/15", selected);
      option.classList.toggle("text-teja", selected);
      option.classList.toggle("text-crema/80", !selected);
    });
  };

  const visibleDialCodes = () =>
    dialOptions
      .filter((item) => !dialOptionMap.get(item.entry.code)!.hidden)
      .map((item) => item.entry.code);

  const paintDialActive = () => {
    dialOptionMap.forEach((option, code) => {
      const active = code === dialActive && code !== dialCountry;
      option.classList.toggle("bg-crema/10", active);
      option.classList.toggle("text-crema", active);
    });
    const activeOption = dialOptionMap.get(dialActive);
    if (activeOption && dialOpen) {
      activeOption.scrollIntoView({ block: "nearest" });
      dialSearch.setAttribute("aria-activedescendant", activeOption.id);
    }
  };

  const setDialActiveIndex = (index: number) => {
    const codes = visibleDialCodes();
    if (codes.length === 0) return;
    dialActive = codes[((index % codes.length) + codes.length) % codes.length];
    paintDialActive();
  };

  const pickDial = (code: string) => {
    dialCountry = code;
    paintDial();
  };

  const normalizeText = (value: string) =>
    value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

  const filterDial = (query: string) => {
    const needle = normalizeText(query.trim());
    dialOptionMap.forEach((option, code) => {
      const item = dialOptions.find(
        (candidate) => candidate.entry.code === code,
      )!;
      option.hidden =
        needle !== "" && !normalizeText(item.haystack).includes(needle);
    });
    const codes = visibleDialCodes();
    dialEmpty.hidden = codes.length > 0;
    dialActive = codes.includes(dialActive)
      ? dialActive
      : (codes[0] ?? dialActive);
    paintDialActive();
  };

  const openDial = () => {
    if (dialOpen) return;
    dialOpen = true;
    dialPanel.hidden = false;
    dialSearch.value = "";
    filterDial("");
    dialTrigger.setAttribute("aria-expanded", "true");
    dialRoot.classList.add("z-30");
    dialChevron.classList.add("-rotate-180");
    dialActive = dialCountry;
    paintDialActive();
    dialSearch.focus();
  };

  const closeDial = (focus: boolean) => {
    if (!dialOpen) return;
    dialOpen = false;
    dialPanel.hidden = true;
    dialTrigger.setAttribute("aria-expanded", "false");
    dialSearch.removeAttribute("aria-activedescendant");
    dialRoot.classList.remove("z-30");
    dialChevron.classList.remove("-rotate-180");
    if (focus) dialTrigger.focus();
  };

  const selectedEntry = (): DialCode => ({
    code: dialCountry,
    dial: DIAL_BY_CODE.get(dialCountry) ?? "34",
  });

  dialTrigger.addEventListener("click", () => {
    if (dialOpen) closeDial(false);
    else openDial();
  });

  dialTrigger.addEventListener("keydown", (event) => {
    if (dialOpen) return;
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openDial();
    }
  });

  dialSearch.addEventListener("input", () => filterDial(dialSearch.value));

  dialSearch.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setDialActiveIndex(visibleDialCodes().indexOf(dialActive) + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setDialActiveIndex(visibleDialCodes().indexOf(dialActive) - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (visibleDialCodes().includes(dialActive)) {
        pickDial(dialActive);
        closeDial(true);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeDial(true);
    } else if (event.key === "Tab") {
      closeDial(false);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      dialOpen &&
      event.target instanceof Node &&
      !dialRoot.contains(event.target)
    )
      closeDial(false);
  });

  paintDial();

  r.panels.forEach((panel) => {
    const index = Number(panel.dataset.panel);
    if (index) {
      const next = panel.querySelector<HTMLButtonElement>("[data-next]");
      const prev = panel.querySelector<HTMLButtonElement>("[data-prev]");
      const error = panel.querySelector<HTMLElement>("[data-panel-error]");
      if (next) nextButtons.set(index, next);
      if (prev) prevButtons.set(index, prev);
      if (error) panelErrors.set(index, error);
    }
  });

  const state = {
    party: 0,
    date: "",
    time: "",
    experience: null as ReserveExperience | null,
  };
  let setup: Setup;
  let openWeekdays = new Set<string>();
  let today = "";
  let maxDate = "";
  let viewY = 0;
  let viewM = 0;
  let slotsToken = 0;

  const fmtDay = new Intl.DateTimeFormat(data.locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const fmtMonth = new Intl.DateTimeFormat(data.locale, {
    month: "long",
    year: "numeric",
  });

  const pad = (value: number) => String(value).padStart(2, "0");
  const iso = (y: number, m: number, d: number) =>
    `${y}-${pad(m + 1)}-${pad(d)}`;
  const monthOf = (date: string) =>
    Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;

  const announce = (message: string) => {
    r.live.textContent = message;
  };

  const panelError = (index: number, message?: string) => {
    const target = panelErrors.get(index);
    if (!target) return;
    target.textContent = message ?? "";
    target.hidden = !message;
  };

  const setState = (name: "boot" | "premium" | "fatal" | "wizard" | "done") => {
    [r.boot, r.premium, r.fatal, r.shell, r.done].forEach((block) => {
      block.hidden = block.dataset.state !== name;
    });
    if (name === "premium") r.premium.querySelector<HTMLElement>("h2")?.focus();
    if (name === "fatal") r.retry.focus();
    if (name === "done") r.doneTitle.focus();
  };

  const goStep = (step: number) => {
    r.panels.forEach((panel) => {
      panel.hidden = Number(panel.dataset.panel) !== step;
    });
    r.steps.forEach((item) => {
      const order = STEP_NAMES.indexOf(item.dataset.step ?? "");
      const active = order + 1 === step;
      if (active) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      const dot = item.querySelector<HTMLElement>("span");
      if (dot) {
        dot.classList.toggle("bg-teja", active);
        dot.classList.toggle("text-bg", active);
        dot.classList.toggle("ring-teja", active);
        dot.classList.toggle("bg-crema/10", order + 1 < step);
      }
    });
    panelErrors.forEach((_, index) => panelError(index));
    r.panels[step - 1]
      ?.querySelector<HTMLElement>("h2")
      ?.focus({ preventScroll: true });
  };

  const paintParty = () => {
    r.party.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      const active = Number(button.textContent) === state.party;
      button.setAttribute("aria-pressed", String(active));
      setPillVariant(button, active ? PILL_ON : PILL_OFF);
    });
    const next = nextButtons.get(1);
    if (next) next.disabled = state.party === 0;
  };

  const renderParty = () => {
    const { min = 1, max = 8 } = setup.partySize ?? {};
    for (let size = min; size <= max; size++) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(size);
      button.className = `${PILL} ${PILL_OFF}`;
      button.addEventListener("click", () => {
        if (state.party !== size) {
          state.party = size;
          state.time = "";
        }
        paintParty();
      });
      r.party.append(button);
    }
    paintParty();
  };

  const experienceKey = (experience: ReserveExperience) =>
    experience.slug ?? experience.labelKey.split(".").pop() ?? "";

  const experienceLabel = (experience: ReserveExperience) => {
    const known = data.experience as Record<string, string>;
    const label = known[experienceKey(experience)];
    return (
      (label && typeof label === "string" ? label : experience.name) ||
      data.experience.table
    );
  };

  const requestedExperience = () => {
    const param = new URLSearchParams(location.search).get("experience") ?? "";
    if (!param) return null;
    return (
      (setup.experiences ?? []).find(
        (experience) =>
          experience.id === param ||
          experience.slug === param ||
          (experience.labelKey !== "" &&
            experience.labelKey.endsWith(`.${param}`)),
      ) ?? null
    );
  };

  const paintExperience = () => {
    r.experiences
      .querySelectorAll<HTMLButtonElement>("button[data-experience]")
      .forEach((button) => {
        const active =
          button.dataset.experience === (state.experience?.id ?? "");
        button.setAttribute("aria-pressed", String(active));
        setPillVariant(button, active ? PILL_ON : PILL_OFF);
      });
  };

  const renderExperience = () => {
    const list = setup.experiences ?? [];
    r.experienceGroup.hidden = list.length === 0;
    const table = document.createElement("button");
    table.type = "button";
    table.dataset.experience = "";
    table.textContent = data.experience.table;
    table.className = `${PILL} ${PILL_OFF}`;
    table.addEventListener("click", () => {
      if (state.experience) {
        state.experience = null;
        state.time = "";
      }
      paintExperience();
    });
    r.experiences.append(table);
    list.forEach((experience) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.experience = experience.id;
      button.textContent = experienceLabel(experience);
      button.className = `${PILL} ${PILL_OFF}`;
      button.addEventListener("click", () => {
        if (state.experience?.id !== experience.id) {
          state.experience = experience;
          state.time = "";
          const { min = 1, max = 8 } = experience.partySize ?? {};
          if (state.party !== 0 && (state.party < min || state.party > max)) {
            state.party = 0;
            state.time = "";
            paintParty();
          }
        }
        paintExperience();
      });
      r.experiences.append(button);
    });
    paintExperience();
  };

  const paintDate = () => {
    r.calendar
      .querySelectorAll<HTMLButtonElement>("button[data-date]")
      .forEach((button) => {
        if (button.disabled) return;
        const active = button.dataset.date === state.date;
        button.setAttribute("aria-pressed", String(active));
        setPillVariant(button, active ? PILL_ON : PILL_OFF);
      });
    const next = nextButtons.get(2);
    if (next) next.disabled = !state.date;
  };

  const renderMonth = () => {
    const monthToday = monthOf(today);
    const monthMax = monthOf(maxDate);
    r.monthEl.textContent = fmtMonth.format(
      new Date(Date.UTC(viewY, viewM, 1)),
    );
    r.monthPrev.disabled = viewY * 12 + viewM <= monthToday;
    r.monthNext.disabled = viewY * 12 + viewM >= monthMax;
    r.calendar.replaceChildren();

    const lead = (new Date(Date.UTC(viewY, viewM, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(viewY, viewM + 1, 0)).getUTCDate();
    for (let i = 0; i < lead; i++)
      r.calendar.append(document.createElement("span"));
    for (let day = 1; day <= days; day++) {
      const date = iso(viewY, viewM, day);
      const weekday = new Date(`${date}T12:00:00Z`)
        .toLocaleString("en-US", { weekday: "long", timeZone: "UTC" })
        .toUpperCase();
      const open = openWeekdays.has(weekday);
      const within = date >= today && date <= maxDate;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(day);
      button.dataset.date = date;
      button.setAttribute(
        "aria-label",
        fmtDay.format(new Date(`${date}T12:00:00Z`)),
      );
      button.className = `grid size-10 place-items-center justify-self-center rounded-full text-sm ring-1 ${EASE}`;
      if (open && within) {
        setPillVariant(button, state.date === date ? PILL_ON : PILL_OFF);
        button.addEventListener("click", () => {
          if (state.date !== date) {
            state.date = date;
            state.time = "";
          }
          paintDate();
        });
      } else if (date < today) {
        button.disabled = true;
        setPillVariant(button, PILL_PAST);
        button.setAttribute("aria-disabled", "true");
      } else {
        button.disabled = true;
        setPillVariant(button, PILL_DIM);
      }
      r.calendar.append(button);
    }
    paintDate();
  };

  r.monthPrev.addEventListener("click", () => {
    if (viewM === 0) {
      viewM = 11;
      viewY--;
    } else viewM--;
    renderMonth();
  });

  r.monthNext.addEventListener("click", () => {
    if (viewM === 11) {
      viewM = 0;
      viewY++;
    } else viewM++;
    renderMonth();
  });

  const paintTime = () => {
    r.slots
      .querySelectorAll<HTMLButtonElement>("button[data-time]")
      .forEach((button) => {
        const active = button.dataset.time === state.time;
        button.setAttribute("aria-pressed", String(active));
        if (!button.disabled)
          setPillVariant(button, active ? PILL_ON : PILL_OFF);
      });
    const next = nextButtons.get(3);
    if (next) next.disabled = !state.time;
  };

  const renderSlots = (slots: Slot[]) => {
    r.slots.replaceChildren();
    slots.forEach((slot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.time = slot.time;
      button.textContent = slot.time;
      button.className = `${PILL}`;
      if (slot.available) {
        setPillVariant(button, PILL_OFF);
        button.addEventListener("click", () => {
          state.time = slot.time;
          paintTime();
        });
      } else {
        button.disabled = true;
        setPillVariant(button, PILL_DIM);
      }
      r.slots.append(button);
    });
    paintTime();
  };

  const loadSlots = async (notice?: string) => {
    const token = ++slotsToken;
    r.slots.replaceChildren();
    panelError(3, notice);
    r.slotsRetry.hidden = true;
    r.slotsSkeleton.hidden = false;
    r.slots.setAttribute("aria-busy", "true");
    announce(data.loading);
    const next = nextButtons.get(3);
    if (next) next.disabled = true;
    try {
      const query = new URLSearchParams({
        date: state.date,
        partySize: String(state.party),
        ...(state.experience ? { experienceId: state.experience.id } : {}),
      });
      const response = await fetch(`/api/reserve/slots?${query}`);
      const body = (await response.json().catch(() => null)) as {
        slots?: Slot[];
        error?: string;
      } | null;
      if (token !== slotsToken) return;
      r.slotsSkeleton.hidden = true;
      r.slots.removeAttribute("aria-busy");
      if (!response.ok || !body?.slots) {
        const code = body?.error ?? "RESERVATION_UNAVAILABLE";
        panelError(3, data.errors[code] ?? data.errors.fallback);
        r.slotsRetry.hidden = false;
        return;
      }
      if (!body.slots.some((slot) => slot.available)) {
        panelError(3, data.slotsEmpty);
        return;
      }
      renderSlots(body.slots);
      announce(notice ?? "");
    } catch {
      if (token !== slotsToken) return;
      r.slotsSkeleton.hidden = true;
      r.slots.removeAttribute("aria-busy");
      panelError(3, data.errors.fallback);
      r.slotsRetry.hidden = false;
    }
  };

  r.slotsRetry.addEventListener("click", () => void loadSlots());

  const guestCount = (count: number) =>
    data.guests.replace("{count}", String(count));

  const summary = () => {
    const when = fmtDay.format(new Date(`${state.date}T12:00:00Z`));
    const type = state.experience
      ? ` · ${experienceLabel(state.experience)}`
      : "";
    r.summary.textContent = `${when} · ${state.time} · ${guestCount(state.party)}${type}`;
  };

  const fieldError = (name: string, message?: string) => {
    const note = document.getElementById(
      `reserve-${name.replace(/\B([A-Z])/g, "-$1").toLowerCase()}-error`,
    );
    const input = r.form.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[name="${name}"]`,
    );
    if (!note || !(input instanceof HTMLElement)) return;
    note.textContent = message ?? "";
    note.hidden = !message;
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  };

  const validate = (): string | null => {
    let firstBroken: string | null = null;
    const mark = (name: string, message?: string) => {
      fieldError(name, message);
      if (message && !firstBroken) firstBroken = name;
    };
    const firstNameInput =
      r.form.querySelector<HTMLInputElement>('[name="firstName"]');
    const emailInput = r.form.querySelector<HTMLInputElement>('[name="email"]');
    const phoneInput = r.form.querySelector<HTMLInputElement>('[name="phone"]');
    const noteInput =
      r.form.querySelector<HTMLTextAreaElement>('[name="note"]');
    const firstName = firstNameInput?.value.trim() ?? "";
    const email = emailInput?.value.trim() ?? "";
    const lastName =
      r.form
        .querySelector<HTMLInputElement>('[name="lastName"]')
        ?.value.trim() ?? "";
    const phoneRaw = phoneInput?.value.trim() ?? "";
    const note = noteInput?.value.trim() ?? "";
    let phone = "";
    if (phoneRaw.startsWith("+")) {
      const parsed = parsePhoneNumberFromString(phoneRaw);
      if (parsed?.number) {
        phone = parsed.number;
        if (parsed.country && DIAL_BY_CODE.has(parsed.country)) {
          dialCountry = parsed.country;
          paintDial();
        }
      }
    } else {
      const digits = phoneRaw.replace(/\D/g, "");
      if (digits) phone = dialNumber(selectedEntry(), digits);
    }
    mark("firstName", firstName ? undefined : data.form.required);
    mark(
      "email",
      email && EMAIL_PATTERN.test(email) ? undefined : data.form.email,
    );
    mark(
      "phone",
      phone && parsePhoneNumberFromString(phone)?.isValid()
        ? undefined
        : phoneRaw
          ? data.form.phone
          : data.form.phoneRequired,
    );
    if (firstBroken) {
      panelError(4, data.form.summary);
      r.form
        .querySelector<HTMLElement>(`[name="${firstBroken}"]`)
        ?.focus({ preventScroll: true });
      return null;
    }
    return JSON.stringify({
      date: state.date,
      time: state.time,
      partySize: state.party,
      ...(state.experience ? { experienceId: state.experience.id } : {}),
      firstName,
      lastName,
      email,
      phone,
      ...(note ? { note } : {}),
    });
  };

  const showDone = (reservation: Reservation) => {
    const reserved = reservation.status === "RESERVED";
    r.doneTitle.textContent = reserved
      ? data.done.reservedTitle
      : data.done.requestedTitle;
    r.doneBody.textContent = reserved
      ? data.done.reservedBody
      : data.done.requestedBody;
    const localDate = reservation.localStart.slice(0, 10);
    const localTime = reservation.localStart.slice(11, 16);
    r.doneWhen.textContent = `${fmtDay.format(new Date(`${localDate}T12:00:00Z`))} · ${localTime}`;
    r.doneParty.textContent = guestCount(reservation.partySize);
    r.doneRef.textContent = reservation.id;
    setState("done");
    window.history.replaceState(
      {},
      "",
      `${data.confirmPath}?ref=${encodeURIComponent(reservation.id)}`,
    );
  };

  const send = async () => {
    const body = validate();
    if (!body) return;
    r.submit.disabled = true;
    r.submit.setAttribute("aria-busy", "true");
    announce(data.loading);
    try {
      const response = await fetch("/api/reserve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      const payload = (await response.json().catch(() => null)) as {
        reservation?: Reservation;
        error?: string;
        field?: string;
      } | null;
      if (response.ok && payload?.reservation) {
        showDone(payload.reservation);
        return;
      }
      const code = payload?.error ?? "fallback";
      if (code === "NO_AVAILABILITY") {
        announce(data.errors.NO_AVAILABILITY);
        state.time = "";
        goStep(3);
        await loadSlots(data.errors.NO_AVAILABILITY);
        return;
      }
      if (code === "PREMIUM_ONLY") {
        setState("premium");
        return;
      }
      if (code === "INVALID_INPUT" && payload?.field) {
        const fieldMessages: Record<string, string> = {
          phone: data.form.phone,
          email: data.form.email,
          firstName: data.form.required,
          lastName: data.form.required,
        };
        const field = payload.field;
        fieldError(field, fieldMessages[field] ?? data.form.summary);
        panelError(4, data.form.summary);
        r.form
          .querySelector<HTMLElement>(`[name="${field}"]`)
          ?.focus({ preventScroll: true });
        return;
      }
      panelError(4, data.errors[code] ?? data.errors.fallback);
    } catch {
      panelError(4, data.errors.fallback);
    } finally {
      r.submit.disabled = false;
      r.submit.removeAttribute("aria-busy");
    }
  };

  const phoneInput = r.form.querySelector<HTMLInputElement>('[name="phone"]');
  phoneInput?.addEventListener("blur", () => {
    const value = phoneInput.value.trim();
    if (!value.startsWith("+")) return;
    const parsed = parsePhoneNumberFromString(value);
    if (!parsed?.country || !DIAL_BY_CODE.has(parsed.country)) return;
    dialCountry = parsed.country;
    paintDial();
    if (parsed.isValid()) phoneInput.value = parsed.nationalNumber;
  });

  r.form.addEventListener("submit", (event) => {
    event.preventDefault();
    void send();
  });

  nextButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = Number(button.dataset.go);
      if (target === 3) {
        goStep(3);
        void loadSlots();
        return;
      }
      if (target === 4) summary();
      goStep(target);
    });
  });

  prevButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = Number(button.dataset.go);
      if (target <= 2) {
        state.time = "";
        if (target === 2) {
          state.date = "";
          renderMonth();
        }
      }
      goStep(target);
    });
  });

  r.retry.addEventListener("click", () => void boot());

  const boot = async () => {
    setState("boot");
    announce(data.loading);
    try {
      const response = await fetch("/api/reserve/setup");
      if (!response.ok) throw new Error("setup");
      setup = (await response.json()) as Setup;
      if (!setup.onlineReservationsEnabled) {
        setState("premium");
        return;
      }
      openWeekdays = new Set(
        (setup.schedule ?? []).map((period) => period.openDay),
      );
      today = new Intl.DateTimeFormat("en-CA", {
        timeZone: setup.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      maxDate = new Date(
        Date.parse(`${today}T12:00:00Z`) +
          (setup.advanceWindowDays ?? 60) * 86_400_000,
      )
        .toISOString()
        .slice(0, 10);
      viewY = Number(today.slice(0, 4));
      viewM = Number(today.slice(5, 7)) - 1;
      r.windowEl.textContent = data.window;
    } catch {
      r.fatalText.textContent = data.errors.fallback;
      setState("fatal");
      return;
    }
    state.experience = requestedExperience();
    renderParty();
    renderExperience();
    renderMonth();
    setState("wizard");
    goStep(1);
    announce("");
  };

  void boot();
}
