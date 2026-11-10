type Slot = { time: string; available: boolean };

type Setup = {
  timeZone: string;
  onlineReservationsEnabled: boolean;
  partySize?: { min: number; max: number };
  timeSlotInterval?: number;
  advanceWindowDays?: number;
  schedule?: { openDay: string; closeDay?: string }[];
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
  back: string;
  next: string;
  submit: string;
  loading: string;
  window: string;
  slotsEmpty: string;
  retry: string;
  guests: string;
  errors: Record<string, string>;
  form: { required: string; email: string; phone: string; summary: string };
  done: {
    reservedTitle: string;
    requestedTitle: string;
    reservedBody: string;
    requestedBody: string;
  };
};

const EASE = 'transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]';
const PILL = `min-w-16 h-10 rounded-full px-4 text-sm ring-1 ${EASE}`;
const PILL_OFF = 'text-crema ring-crema/20 hover:bg-crema/10';
const PILL_ON = 'bg-teja text-bg ring-teja';
const PILL_DIM = 'text-crema/40 ring-crema/10 pointer-events-none';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const STEP_NAMES = ['people', 'date', 'time', 'details'];

const setPillVariant = (element: HTMLElement, variant: string) => {
  element.classList.remove(...PILL_ON.split(' '), ...PILL_OFF.split(' '), ...PILL_DIM.split(' '));
  element.classList.add(...variant.split(' '));
};

const wizard = document.querySelector<HTMLElement>('[data-wizard]');
const payloadBox = document.querySelector<HTMLScriptElement>('[data-wizard-data]');

if (wizard && payloadBox && payloadBox.textContent) {
  const data = JSON.parse(payloadBox.textContent) as Data;

  const r = {
    live: wizard.querySelector<HTMLElement>('[data-live]')!,
    boot: wizard.querySelector<HTMLElement>('[data-state="boot"]')!,
    premium: wizard.querySelector<HTMLElement>('[data-state="premium"]')!,
    fatal: wizard.querySelector<HTMLElement>('[data-state="fatal"]')!,
    fatalText: wizard.querySelector<HTMLElement>('[data-fatal]')!,
    retry: wizard.querySelector<HTMLButtonElement>('[data-retry]')!,
    shell: wizard.querySelector<HTMLElement>('[data-state="wizard"]')!,
    done: wizard.querySelector<HTMLElement>('[data-state="done"]')!,
    doneTitle: wizard.querySelector<HTMLElement>('[data-done-title]')!,
    doneBody: wizard.querySelector<HTMLElement>('[data-done-body]')!,
    doneWhen: wizard.querySelector<HTMLElement>('[data-done-when]')!,
    doneParty: wizard.querySelector<HTMLElement>('[data-done-party]')!,
    doneRef: wizard.querySelector<HTMLElement>('[data-done-ref]')!,
    steps: wizard.querySelectorAll<HTMLElement>('[data-step]'),
    panels: [...wizard.querySelectorAll<HTMLElement>('[data-panel]')],
    party: wizard.querySelector<HTMLElement>('[data-party]')!,
    calendar: wizard.querySelector<HTMLElement>('[data-calendar]')!,
    monthEl: wizard.querySelector<HTMLElement>('[data-month]')!,
    monthPrev: wizard.querySelector<HTMLButtonElement>('[data-month-prev]')!,
    monthNext: wizard.querySelector<HTMLButtonElement>('[data-month-next]')!,
    windowEl: wizard.querySelector<HTMLElement>('[data-window]')!,
    slots: wizard.querySelector<HTMLElement>('[data-slots]')!,
    slotsSkeleton: wizard.querySelector<HTMLElement>('[data-slots-skeleton]')!,
    slotsRetry: wizard.querySelector<HTMLButtonElement>('[data-slots-retry]')!,
    summary: wizard.querySelector<HTMLElement>('[data-summary]')!,
    submit: wizard.querySelector<HTMLButtonElement>('[data-submit]')!,
    form: wizard.querySelector<HTMLFormElement>('[data-form]')!,
  };

  const nextButtons = new Map<number, HTMLButtonElement>();
  const prevButtons = new Map<number, HTMLButtonElement>();
  const panelErrors = new Map<number, HTMLElement>();

  r.panels.forEach((panel) => {
    const index = Number(panel.dataset.panel);
    if (index) {
      const next = panel.querySelector<HTMLButtonElement>('[data-next]');
      const prev = panel.querySelector<HTMLButtonElement>('[data-prev]');
      const error = panel.querySelector<HTMLElement>('[data-panel-error]');
      if (next) nextButtons.set(index, next);
      if (prev) prevButtons.set(index, prev);
      if (error) panelErrors.set(index, error);
    }
  });

  const state = { party: 0, date: '', time: '' };
  let setup: Setup;
  let openWeekdays = new Set<string>();
  let today = '';
  let maxDate = '';
  let viewY = 0;
  let viewM = 0;
  let slotsToken = 0;

  const fmtDay = new Intl.DateTimeFormat(data.locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtMonth = new Intl.DateTimeFormat(data.locale, { month: 'long', year: 'numeric' });

  const pad = (value: number) => String(value).padStart(2, '0');
  const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const monthOf = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;

  const announce = (message: string) => {
    r.live.textContent = message;
  };

  const panelError = (index: number, message?: string) => {
    const target = panelErrors.get(index);
    if (!target) return;
    target.textContent = message ?? '';
    target.hidden = !message;
  };

  const setState = (name: 'boot' | 'premium' | 'fatal' | 'wizard' | 'done') => {
    [r.boot, r.premium, r.fatal, r.shell, r.done].forEach((block) => {
      block.hidden = block.dataset.state !== name;
    });
    if (name === 'premium') r.premium.querySelector<HTMLElement>('h2')?.focus();
    if (name === 'fatal') r.retry.focus();
    if (name === 'done') r.doneTitle.focus();
  };

  const goStep = (step: number) => {
    r.panels.forEach((panel) => {
      panel.hidden = Number(panel.dataset.panel) !== step;
    });
    r.steps.forEach((item) => {
      const order = STEP_NAMES.indexOf(item.dataset.step ?? '');
      const active = order + 1 === step;
      if (active) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      const dot = item.querySelector<HTMLElement>('span');
      if (dot) {
        dot.classList.toggle('bg-teja', active);
        dot.classList.toggle('text-bg', active);
        dot.classList.toggle('ring-teja', active);
        dot.classList.toggle('bg-crema/10', order + 1 < step);
      }
    });
    panelErrors.forEach((_, index) => panelError(index));
    r.panels[step - 1]?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  };

  const paintParty = () => {
    r.party.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      const active = Number(button.textContent) === state.party;
      button.setAttribute('aria-pressed', String(active));
      setPillVariant(button, active ? PILL_ON : PILL_OFF);
    });
    const next = nextButtons.get(1);
    if (next) next.disabled = state.party === 0;
  };

  const renderParty = () => {
    const { min = 1, max = 8 } = setup.partySize ?? {};
    for (let size = min; size <= max; size++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(size);
      button.className = `${PILL} ${PILL_OFF}`;
      button.addEventListener('click', () => {
        if (state.party !== size) {
          state.party = size;
          state.time = '';
        }
        paintParty();
      });
      r.party.append(button);
    }
    paintParty();
  };

  const paintDate = () => {
    r.calendar.querySelectorAll<HTMLButtonElement>('button[data-date]').forEach((button) => {
      const active = button.dataset.date === state.date;
      button.setAttribute('aria-pressed', String(active));
      setPillVariant(button, active ? PILL_ON : PILL_OFF);
    });
    const next = nextButtons.get(2);
    if (next) next.disabled = !state.date;
  };

  const renderMonth = () => {
    const monthToday = monthOf(today);
    const monthMax = monthOf(maxDate);
    r.monthEl.textContent = fmtMonth.format(new Date(Date.UTC(viewY, viewM, 1)));
    r.monthPrev.disabled = viewY * 12 + viewM <= monthToday;
    r.monthNext.disabled = viewY * 12 + viewM >= monthMax;
    r.calendar.replaceChildren();

    const lead = (new Date(Date.UTC(viewY, viewM, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(viewY, viewM + 1, 0)).getUTCDate();
    for (let i = 0; i < lead; i++) r.calendar.append(document.createElement('span'));
    for (let day = 1; day <= days; day++) {
      const date = iso(viewY, viewM, day);
      const weekday = new Date(`${date}T12:00:00Z`)
        .toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' })
        .toUpperCase();
      const open = openWeekdays.has(weekday);
      const within = date >= today && date <= maxDate;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(day);
      button.dataset.date = date;
      button.setAttribute('aria-label', fmtDay.format(new Date(`${date}T12:00:00Z`)));
      button.className = `grid size-10 place-items-center justify-self-center rounded-full text-sm ring-1 ${EASE}`;
      if (open && within) {
        setPillVariant(button, state.date === date ? PILL_ON : PILL_OFF);
        button.addEventListener('click', () => {
          if (state.date !== date) {
            state.date = date;
            state.time = '';
          }
          paintDate();
        });
      } else {
        button.disabled = true;
        setPillVariant(button, PILL_DIM);
      }
      r.calendar.append(button);
    }
    paintDate();
  };

  r.monthPrev.addEventListener('click', () => {
    if (viewM === 0) {
      viewM = 11;
      viewY--;
    } else viewM--;
    renderMonth();
  });

  r.monthNext.addEventListener('click', () => {
    if (viewM === 11) {
      viewM = 0;
      viewY++;
    } else viewM++;
    renderMonth();
  });

  const paintTime = () => {
    r.slots.querySelectorAll<HTMLButtonElement>('button[data-time]').forEach((button) => {
      const active = button.dataset.time === state.time;
      button.setAttribute('aria-pressed', String(active));
      if (!button.disabled) setPillVariant(button, active ? PILL_ON : PILL_OFF);
    });
    const next = nextButtons.get(3);
    if (next) next.disabled = !state.time;
  };

  const renderSlots = (slots: Slot[]) => {
    r.slots.replaceChildren();
    slots.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.time = slot.time;
      button.textContent = slot.time;
      button.className = `${PILL}`;
      if (slot.available) {
        setPillVariant(button, PILL_OFF);
        button.addEventListener('click', () => {
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

  const loadSlots = async () => {
    const token = ++slotsToken;
    r.slots.replaceChildren();
    panelError(3);
    r.slotsRetry.hidden = true;
    r.slotsSkeleton.hidden = false;
    r.slots.setAttribute('aria-busy', 'true');
    announce(data.loading);
    const next = nextButtons.get(3);
    if (next) next.disabled = true;
    try {
      const query = new URLSearchParams({ date: state.date, partySize: String(state.party) });
      const response = await fetch(`/api/reserve/slots?${query}`);
      const body = (await response.json().catch(() => null)) as { slots?: Slot[]; error?: string } | null;
      if (token !== slotsToken) return;
      r.slotsSkeleton.hidden = true;
      r.slots.removeAttribute('aria-busy');
      if (!response.ok || !body?.slots) {
        const code = body?.error ?? 'RESERVATION_UNAVAILABLE';
        panelError(3, data.errors[code] ?? data.errors.fallback);
        r.slotsRetry.hidden = false;
        return;
      }
      if (!body.slots.some((slot) => slot.available)) {
        panelError(3, data.slotsEmpty);
        return;
      }
      renderSlots(body.slots);
      announce('');
    } catch {
      if (token !== slotsToken) return;
      r.slotsSkeleton.hidden = true;
      r.slots.removeAttribute('aria-busy');
      panelError(3, data.errors.fallback);
      r.slotsRetry.hidden = false;
    }
  };

  r.slotsRetry.addEventListener('click', () => void loadSlots());

  const guestCount = (count: number) => data.guests.replace('{count}', String(count));

  const summary = () => {
    const when = fmtDay.format(new Date(`${state.date}T12:00:00Z`));
    r.summary.textContent = `${when} · ${state.time} · ${guestCount(state.party)}`;
  };

  const fieldError = (name: string, message?: string) => {
    const note = document.getElementById(`reserve-${name.replace(/\B([A-Z])/g, '-$1').toLowerCase()}-error`);
    const input = r.form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (!note || !(input instanceof HTMLElement)) return;
    note.textContent = message ?? '';
    note.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };

  const validate = (): string | null => {
    let firstBroken: string | null = null;
    const mark = (name: string, message?: string) => {
      fieldError(name, message);
      if (message && !firstBroken) firstBroken = name;
    };
    const firstNameInput = r.form.querySelector<HTMLInputElement>('[name="firstName"]');
    const emailInput = r.form.querySelector<HTMLInputElement>('[name="email"]');
    const phoneInput = r.form.querySelector<HTMLInputElement>('[name="phone"]');
    const noteInput = r.form.querySelector<HTMLTextAreaElement>('[name="note"]');
    const firstName = firstNameInput?.value.trim() ?? '';
    const email = emailInput?.value.trim() ?? '';
    const lastName = r.form.querySelector<HTMLInputElement>('[name="lastName"]')?.value.trim() ?? '';
    const phone = (phoneInput?.value ?? '').replace(/[()\s-]/g, '');
    const note = noteInput?.value.trim() ?? '';
    mark('firstName', firstName ? undefined : data.form.required);
    mark('email', email && EMAIL_PATTERN.test(email) ? undefined : data.form.email);
    mark('phone', phone && PHONE_PATTERN.test(phone) ? undefined : data.form.phone);
    if (firstBroken) {
      panelError(4, data.form.summary);
      r.form.querySelector<HTMLElement>(`[name="${firstBroken}"]`)?.focus({ preventScroll: true });
      return null;
    }
    return JSON.stringify({
      date: state.date,
      time: state.time,
      partySize: state.party,
      firstName,
      lastName,
      email,
      phone,
      ...(note ? { note } : {}),
    });
  };

  const showDone = (reservation: Reservation) => {
    const reserved = reservation.status === 'RESERVED';
    r.doneTitle.textContent = reserved ? data.done.reservedTitle : data.done.requestedTitle;
    r.doneBody.textContent = reserved ? data.done.reservedBody : data.done.requestedBody;
    const localDate = reservation.localStart.slice(0, 10);
    const localTime = reservation.localStart.slice(11, 16);
    r.doneWhen.textContent = `${fmtDay.format(new Date(`${localDate}T12:00:00Z`))} · ${localTime}`;
    r.doneParty.textContent = guestCount(reservation.partySize);
    r.doneRef.textContent = reservation.id;
    setState('done');
  };

  const send = async () => {
    const body = validate();
    if (!body) return;
    r.submit.disabled = true;
    r.submit.setAttribute('aria-busy', 'true');
    announce(data.loading);
    try {
      const response = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      const payload = (await response.json().catch(() => null)) as
        | { reservation?: Reservation; error?: string }
        | null;
      if (response.ok && payload?.reservation) {
        showDone(payload.reservation);
        return;
      }
      const code = payload?.error ?? 'fallback';
      if (code === 'NO_AVAILABILITY') {
        announce(data.errors.NO_AVAILABILITY);
        goStep(3);
        await loadSlots();
        return;
      }
      if (code === 'PREMIUM_ONLY') {
        setState('premium');
        return;
      }
      panelError(4, data.errors[code] ?? data.errors.fallback);
    } catch {
      panelError(4, data.errors.fallback);
    } finally {
      r.submit.disabled = false;
      r.submit.removeAttribute('aria-busy');
    }
  };

  r.form.addEventListener('submit', (event) => {
    event.preventDefault();
    void send();
  });

  nextButtons.forEach((button) => {
    button.addEventListener('click', () => {
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
    button.addEventListener('click', () => {
      const target = Number(button.dataset.go);
      if (target <= 2) {
        state.time = '';
        if (target === 2) {
          state.date = '';
          renderMonth();
        }
      }
      goStep(target);
    });
  });

  r.retry.addEventListener('click', () => void boot());

  const boot = async () => {
    setState('boot');
    announce(data.loading);
    try {
      const response = await fetch('/api/reserve/setup');
      if (!response.ok) throw new Error('setup');
      setup = (await response.json()) as Setup;
      if (!setup.onlineReservationsEnabled) {
        setState('premium');
        return;
      }
      openWeekdays = new Set((setup.schedule ?? []).map((period) => period.openDay));
      today = new Intl.DateTimeFormat('en-CA', {
        timeZone: setup.timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      maxDate = new Date(
        Date.parse(`${today}T12:00:00Z`) + (setup.advanceWindowDays ?? 60) * 86_400_000,
      )
        .toISOString()
        .slice(0, 10);
      viewY = Number(today.slice(0, 4));
      viewM = Number(today.slice(5, 7)) - 1;
      r.windowEl.textContent = data.window;
    } catch {
      r.fatalText.textContent = data.errors.fallback;
      setState('fatal');
      return;
    }
    renderParty();
    renderMonth();
    setState('wizard');
    goStep(1);
    announce('');
  };

  void boot();
}
