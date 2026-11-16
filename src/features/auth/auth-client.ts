import { createClient, OAuthStrategy } from "@wix/sdk";

interface AuthPayload {
  clientId: string;
  captchaSiteKey: string;
  callbackPath: string;
  returnTo: string;
  loginPath: string;
}

type Recaptcha = {
  enterprise?: {
    ready?: (cb: () => void) => void;
    execute?: (
      siteKey: string,
      options?: { action?: string },
    ) => Promise<string>;
  };
};

const loadRecaptcha = (siteKey: string) =>
  new Promise<Recaptcha | null>((resolve) => {
    const w = window as typeof window & { grecaptcha?: Recaptcha };
    if (w.grecaptcha?.enterprise?.execute) {
      w.grecaptcha.enterprise.ready?.(() => resolve(w.grecaptcha ?? null));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.onerror = () => resolve(null);
    script.onload = () => {
      const api = (window as typeof window & { grecaptcha?: Recaptcha })
        .grecaptcha;
      api?.enterprise?.ready?.(() => resolve(api ?? null));
    };
    document.head.appendChild(script);
    setTimeout(() => resolve(null), 6000);
  });

const box = document.querySelector<HTMLElement>("[data-auth-social]");
const payloadBox =
  document.querySelector<HTMLScriptElement>("[data-auth-config]");
const form = document.querySelector<HTMLFormElement>("[data-auth-form]");

if (box && payloadBox?.textContent) {
  const data = JSON.parse(payloadBox.textContent) as AuthPayload;
  const client = createClient({
    auth: OAuthStrategy({ clientId: data.clientId }),
  });
  let recaptcha: Recaptcha | null = null;

  if (form && data.captchaSiteKey) {
    void loadRecaptcha(data.captchaSiteKey).then((api) => {
      recaptcha = api;
    });
    const captchaInput = form.elements.namedItem("captchaToken");
    form.addEventListener("submit", (event) => {
      if (event.defaultPrevented) return;
      if (
        recaptcha?.enterprise?.execute &&
        captchaInput instanceof HTMLInputElement
      ) {
        event.preventDefault();
        void recaptcha.enterprise!.execute!(data.captchaSiteKey, {
          action: "login",
        })
          .catch(() => "")
          .then((token) => {
            captchaInput.value = token;
            form.submit();
          });
      }
    });
  }

  const fail = () => {
    window.location.href = `${data.loginPath}?error=oauth_start`;
  };

  const buttons = [...box.querySelectorAll<HTMLButtonElement>("[data-idp]")];
  buttons.forEach((button) => {
    const idp = button.dataset.idp === "facebook" ? "facebook" : "google";
    button.addEventListener("click", () => {
      void (async () => {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        try {
          const oauthData = client.auth.generateOAuthData(
            `${window.location.origin}${data.callbackPath}`,
            data.returnTo,
          );
          window.localStorage.setItem(
            "wixOAuthData",
            JSON.stringify(oauthData),
          );
          const { authUrl } = await client.auth.getAuthUrl(oauthData, { idp });
          window.location.href = authUrl;
        } catch {
          button.disabled = false;
          button.removeAttribute("aria-busy");
          fail();
        }
      })();
    });
  });
}
