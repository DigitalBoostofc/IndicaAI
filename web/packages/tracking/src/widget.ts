// Widget JS embarcável para sites dos clientes
// Build como IIFE para ser incluído via <script src="https://cdn.indica.ai/widget.js">
// Lê cookie _iaref, registra cliques, captura referral code

const COOKIE_NAME = "_iaref";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 ano

interface TrackingConfig {
  apiUrl: string;
  tenantId: string;
  programId?: string;
}

interface ClickEvent {
  slug: string;
  visitorId: string;
  referrer?: string;
  url: string;
  timestamp: number;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, maxAge: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax; Secure`;
}

function generateVisitorId(): string {
  // UUIDv4 simples
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getVisitorId(): string {
  const existing = getCookie(COOKIE_NAME);
  if (existing) {
    // Formato: visitor_id:slug:ts:hmac
    const parts = existing.split(":");
    return parts[0] || generateVisitorId();
  }
  const newId = generateVisitorId();
  setCookie(COOKIE_NAME, newId, COOKIE_MAX_AGE);
  return newId;
}

function getReferralCode(): string | null {
  // 1. URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get("ref");
  if (refFromUrl) return refFromUrl;

  // 2. Cookie
  const cookie = getCookie(COOKIE_NAME);
  if (cookie) {
    const parts = cookie.split(":");
    return parts[1] || null;
  }

  return null;
}

async function postEvent(config: TrackingConfig, event: ClickEvent): Promise<void> {
  try {
    await fetch(`${config.apiUrl}/events/click`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // Silencioso — tracking não pode quebrar o site do cliente
  }
}

function init(config: TrackingConfig): void {
  const visitorId = getVisitorId();
  const referralCode = getReferralCode();

  // Capturar referral code em hidden inputs de formulários
  if (referralCode) {
    document.querySelectorAll('input[name="referral_code"]').forEach((input) => {
      if (input instanceof HTMLInputElement && !input.value) {
        input.value = referralCode;
      }
    });
  }

  // Registrar pageview
  const event: ClickEvent = {
    slug: referralCode || "direct",
    visitorId,
    referrer: document.referrer || undefined,
    url: window.location.href,
    timestamp: Date.now(),
  };

  // POST assíncrono, fire-and-forget
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      `${config.apiUrl}/events/click`,
      JSON.stringify(event)
    );
  } else {
    postEvent(config, event);
  }
}

// Expor globalmente para uso via <script> tag
// Uso: indicaTracking.init({ apiUrl: "https://api.indica.ai", tenantId: "xxx" })
export { init, getReferralCode, getVisitorId };
