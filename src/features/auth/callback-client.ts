import { createClient, OAuthStrategy } from '@wix/sdk';

interface CallbackPayload {
  clientId: string;
  loginPath: string;
  fallbackPath: string;
}

interface StoredOAuthData {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  redirectUri: string;
  originalUri: string;
}

const payloadBox = document.querySelector<HTMLScriptElement>('[data-callback-config]');

if (payloadBox?.textContent) {
  const data = JSON.parse(payloadBox.textContent) as CallbackPayload;
  const client = createClient({ auth: OAuthStrategy({ clientId: data.clientId }) });

  const fail = (code: string) => {
    window.localStorage.removeItem('wixOAuthData');
    window.location.replace(`${data.loginPath}?error=${encodeURIComponent(code)}`);
  };

  const run = async () => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const providerError = params.get('error');
    const code = params.get('code');
    const state = params.get('state');

    if (providerError) {
      fail(providerError === 'access_denied' ? 'access_denied' : 'oauth_error');
      return;
    }
    if (!code || !state) {
      fail('oauth_callback');
      return;
    }

    const stored = window.localStorage.getItem('wixOAuthData');
    if (!stored) {
      fail('oauth_callback');
      return;
    }
    const oauthData = JSON.parse(stored) as StoredOAuthData;
    if (state !== oauthData.state) {
      fail('oauth_state');
      return;
    }

    try {
      const tokens = await client.auth.getMemberTokens(code, state, oauthData);
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(tokens),
      });
      if (!response.ok) throw new Error('session');
      window.localStorage.removeItem('wixOAuthData');
      const target =
        oauthData.originalUri && oauthData.originalUri.startsWith('/') && !oauthData.originalUri.startsWith('//')
          ? oauthData.originalUri
          : data.fallbackPath;
      window.location.replace(target);
    } catch {
      fail('oauth_failed');
    }
  };

  void run();
}
