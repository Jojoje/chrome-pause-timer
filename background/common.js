export const DEFAULT_SETTINGS = {
  resetTime: "00:00",
  waitSeconds: 30,
  extensionChoicesMinutes: [1, 2, 5, 10]
};

export const STORAGE_KEYS = ["settings", "rules", "usage"];
export const TICK_ALARM_NAME = "tick";

export function normalizeLimit(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error("Daily minutes must be a positive number or empty for immediate block");
  }

  return Math.floor(num);
}

export function normalizeResetTime(value) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return DEFAULT_SETTINGS.resetTime;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return DEFAULT_SETTINGS.resetTime;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function normalizeWaitSeconds(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return DEFAULT_SETTINGS.waitSeconds;
  }

  return Math.min(180, Math.max(5, Math.floor(num)));
}

export function normalizeChoices(values) {
  const list = Array.isArray(values) ? values : DEFAULT_SETTINGS.extensionChoicesMinutes;
  const normalized = list
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.floor(item));

  return normalized.length > 0 ? normalized.slice(0, 8) : DEFAULT_SETTINGS.extensionChoicesMinutes;
}

export function getDayKeyForNow(resetTime) {
  const [hours, minutes] = normalizeResetTime(resetTime).split(":").map(Number);
  const shifted = new Date(Date.now() - (hours * 60 + minutes) * 60 * 1000);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const d = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function readRuleUsage(usage, dayKey, ruleId) {
  if (!usage || typeof usage !== "object") {
    return { seconds: 0, extraMinutes: 0 };
  }

  const byDay = usage[dayKey];
  if (!byDay || typeof byDay !== "object") {
    return { seconds: 0, extraMinutes: 0 };
  }

  const byRule = byDay[ruleId];
  if (!byRule || typeof byRule !== "object") {
    return { seconds: 0, extraMinutes: 0 };
  }

  return byRule;
}

export function canonicalizeHost(host) {
  return String(host || "").toLowerCase().replace(/^www\./, "");
}

export function isIpAddress(host) {
  return /^\d+\.\d+\.\d+\.\d+$/.test(host);
}

export function getWwwAliases(host) {
  if (!host || isIpAddress(host) || host === "localhost") {
    return [];
  }

  return host.startsWith("www.") ? [host.replace(/^www\./, "")] : [`www.${host}`];
}

export function normalizePathPrefix(pathname) {
  const raw = String(pathname || "/").trim();
  if (!raw || raw === "/") {
    return "/";
  }

  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const withoutTrailing = withSlash.replace(/\/+$/, "");
  return withoutTrailing || "/";
}

export function parseRuleInput(input, includeSubdomains) {
  const raw = String(input || "").trim();
  const withProtocol = /^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);

  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("Only http and https sites are supported");
  }

  const host = canonicalizeHost(parsed.hostname);
  if (!host) {
    throw new Error("Invalid host");
  }

  return {
    host,
    pathPrefix: normalizePathPrefix(parsed.pathname || "/"),
    includeSubdomains: Boolean(includeSubdomains)
  };
}

export function parseUrl(url) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return null;
    }

    return {
      hostname: canonicalizeHost(parsed.hostname),
      pathname: parsed.pathname || "/"
    };
  } catch {
    return null;
  }
}

export function buildRuleLabel(rule) {
  const host = String(rule.host || "");
  const pathPrefix = normalizePathPrefix(rule.pathPrefix);
  const scope = rule.includeSubdomains ? " + subdomains" : "";
  return pathPrefix === "/" ? `${host}${scope}` : `${host}${pathPrefix}${scope}`;
}

export function urlMatchesRule(parsedUrl, rule) {
  if (!parsedUrl) {
    return false;
  }

  const currentHost = parsedUrl.hostname;
  const ruleHost = canonicalizeHost(rule.host);
  const includeSubdomains = Boolean(rule.includeSubdomains);
  const currentPath = normalizePathPrefix(parsedUrl.pathname || "/");
  const rulePath = normalizePathPrefix(rule.pathPrefix);

  const hostMatches = includeSubdomains
    ? currentHost === ruleHost || currentHost.endsWith(`.${ruleHost}`)
    : currentHost === ruleHost;

  if (!hostMatches) {
    return false;
  }

  return rulePath === "/" || currentPath === rulePath || currentPath.startsWith(`${rulePath}/`);
}

export function hostToMatchPatterns(host, includeSubdomains) {
  const canonicalHost = canonicalizeHost(host);
  if (!canonicalHost) {
    return [];
  }

  const patterns = [
    `http://${canonicalHost}/*`,
    `https://${canonicalHost}/*`,
    ...getWwwAliases(canonicalHost).flatMap((alias) => [`http://${alias}/*`, `https://${alias}/*`])
  ];

  if (includeSubdomains && !isIpAddress(canonicalHost) && canonicalHost !== "localhost") {
    patterns.push(`http://*.${canonicalHost}/*`, `https://*.${canonicalHost}/*`);
  }

  return Array.from(new Set(patterns));
}
