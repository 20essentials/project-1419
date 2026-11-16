const init = () => {
  const root = document.querySelector<HTMLElement>("[data-gift]");
  if (!root || root.dataset.giftBound) return;
  root.dataset.giftBound = "1";
  const form = root.querySelector<HTMLFormElement>("form[data-gift-form]");
  if (!form) return;
  const messages = JSON.parse(
    root.querySelector<HTMLScriptElement>("[data-gift-messages]")
      ?.textContent ?? "{}",
  ) as Record<string, string>;
  const errorEl = root.querySelector<HTMLParagraphElement>("[data-gift-error]");
  const liveEl = root.querySelector<HTMLParagraphElement>("[data-gift-live]");
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const label = button?.querySelector<HTMLElement>("[data-gift-label]");
  const amountWrap = root.querySelector<HTMLElement>("[data-gift-amount-wrap]");
  const amountInput =
    root.querySelector<HTMLInputElement>("[data-gift-amount]");
  const pendingLabel = root.getAttribute("data-pending-label") ?? "";
  const submitLabel = label?.textContent ?? "";
  let busy = false;

  const showError = (code: string) => {
    if (!errorEl) return;
    errorEl.textContent = messages[code] ?? messages.generic;
    errorEl.hidden = false;
    if (liveEl) liveEl.textContent = errorEl.textContent;
  };

  const resetButton = () => {
    if (!busy) return;
    busy = false;
    if (button) {
      button.disabled = false;
      button.setAttribute("aria-busy", "false");
    }
    if (label) label.textContent = submitLabel;
  };

  const toggleAmount = () => {
    if (!amountWrap) return;
    const custom =
      form?.querySelector<HTMLInputElement>(
        'input[name="gift-variant"]:checked',
      )?.value === "custom";
    amountWrap.hidden = !custom;
    if (custom) amountInput?.focus();
  };

  root
    .querySelectorAll<HTMLInputElement>('input[name="gift-variant"]')
    .forEach((radio) => {
      radio.addEventListener("change", toggleAmount);
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    if (errorEl) errorEl.hidden = true;
    const checked = form.querySelector<HTMLInputElement>(
      'input[name="gift-variant"]:checked',
    );
    if (!checked) return;
    const payload: { variantId?: string; amount?: number; locale: string } = {
      locale: root.dataset.locale ?? "en",
    };
    if (checked.value === "custom") {
      const amount = Number(amountInput?.value ?? NaN);
      const min = Number(amountInput?.min ?? 0);
      const max = Number(amountInput?.max ?? 0);
      if (!Number.isInteger(amount) || amount < min || amount > max) {
        showError("INVALID_INPUT");
        return;
      }
      payload.amount = amount;
    } else {
      payload.variantId = checked.value.replace(/^preset:/, "");
    }
    busy = true;
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    }
    if (label && pendingLabel) label.textContent = pendingLabel;
    try {
      const response = await fetch("/api/gift/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as {
        redirectUrl?: string;
        error?: string;
      } | null;
      if (response.ok && data?.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }
      showError(data?.error ?? "generic");
    } catch {
      showError("generic");
    } finally {
      resetButton();
    }
  });
};

init();
