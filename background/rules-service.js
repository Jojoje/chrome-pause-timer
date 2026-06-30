import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  normalizeLimit,
  normalizeResetTime,
  normalizeWaitSeconds,
  normalizeChoices,
  getDayKeyForNow,
  readRuleUsage,
  parseRuleInput,
  parseUrl,
  buildRuleLabel,
  normalizePathPrefix,
  urlMatchesRule,
  hostToMatchPatterns
} from "./common.js";

const CONTENT_SCRIPT_ID = "mindful-site-timer-content";

export async function initializeStorage() {
  const { settings, rules, usage } = await chrome.storage.local.get(STORAGE_KEYS);

  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  } else {
    await chrome.storage.local.set({
      settings: {
        ...DEFAULT_SETTINGS,
        ...settings,
        extensionChoicesMinutes: Array.isArray(settings.extensionChoicesMinutes)
          ? settings.extensionChoicesMinutes
          : DEFAULT_SETTINGS.extensionChoicesMinutes
      }
    });
  }

  if (!Array.isArray(rules)) {
    await chrome.storage.local.set({ rules: [] });
  }

  if (!usage || typeof usage !== "object") {
    await chrome.storage.local.set({ usage: {} });
  }
}

export async function syncRegisteredContentScript() {
  const { rules } = await chrome.storage.local.get(["rules"]);
  const safeRules = Array.isArray(rules) ? rules : [];
  const patterns = getRuleMatchPatterns(safeRules);

  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  if (existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  }

  if (patterns.length === 0) {
    return;
  }

  await chrome.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      js: ["content-script.js"],
      matches: patterns,
      runAt: "document_start",
      allFrames: false,
      persistAcrossSessions: true
    }
  ]);
}

export async function getConfig() {
  const { settings, rules } = await chrome.storage.local.get(["settings", "rules"]);
  return {
    settings: settings || DEFAULT_SETTINGS,
    rules: Array.isArray(rules) ? rules : []
  };
}

export async function addRule(payload) {
  const inputUrl = String(payload?.url || "").trim();
  if (!inputUrl) {
    throw new Error("Site URL is required");
  }

  const baseLimitMinutes = normalizeLimit(payload?.baseLimitMinutes);
  const includeSubdomains = Boolean(payload?.includeSubdomains);
  const parsedRule = parseRuleInput(inputUrl, includeSubdomains);

  const host = parsedRule.host;
  const pathPrefix = parsedRule.pathPrefix;
  const label = buildRuleLabel(parsedRule);

  const { rules } = await chrome.storage.local.get(["rules"]);
  const currentRules = Array.isArray(rules) ? rules : [];

  const existing = currentRules.find(
    (rule) =>
      rule.host === host &&
      normalizePathPrefix(rule.pathPrefix) === pathPrefix &&
      Boolean(rule.includeSubdomains) === includeSubdomains
  );

  const nextRules = existing
    ? currentRules.map((rule) =>
        rule.id === existing.id
          ? { ...rule, label, baseLimitMinutes, enabled: true }
          : rule
      )
    : [
        ...currentRules,
        {
          id: crypto.randomUUID(),
          host,
          pathPrefix,
          includeSubdomains,
          label,
          enabled: true,
          baseLimitMinutes,
          createdAt: Date.now()
        }
      ];

  await chrome.storage.local.set({ rules: nextRules });
  await syncRegisteredContentScript();

  return { rules: nextRules };
}

export async function removeRule(payload) {
  const ruleId = String(payload?.ruleId || "");
  if (!ruleId) {
    throw new Error("Rule id is required");
  }

  const { rules } = await chrome.storage.local.get(["rules"]);
  const currentRules = Array.isArray(rules) ? rules : [];
  const nextRules = currentRules.filter((rule) => rule.id !== ruleId);

  await chrome.storage.local.set({ rules: nextRules });
  await syncRegisteredContentScript();

  return { rules: nextRules };
}

export async function updateSettings(payload) {
  const { settings } = await chrome.storage.local.get(["settings"]);
  const current = settings || DEFAULT_SETTINGS;

  const next = {
    ...current,
    resetTime: normalizeResetTime(payload?.resetTime ?? current.resetTime),
    waitSeconds: normalizeWaitSeconds(payload?.waitSeconds ?? current.waitSeconds)
  };

  await chrome.storage.local.set({ settings: next });
  return { settings: next };
}

export async function findMatchingRule(url) {
  const parsed = parseUrl(url);
  if (!parsed) {
    return null;
  }

  const { rules } = await chrome.storage.local.get(["rules"]);
  const safeRules = Array.isArray(rules) ? rules : [];

  const matching = safeRules.filter((rule) => rule.enabled && urlMatchesRule(parsed, rule));
  if (matching.length === 0) {
    return null;
  }

  matching.sort((a, b) => {
    const aPathLen = normalizePathPrefix(a.pathPrefix).length;
    const bPathLen = normalizePathPrefix(b.pathPrefix).length;

    if (aPathLen !== bPathLen) {
      return bPathLen - aPathLen;
    }

    if (Boolean(a.includeSubdomains) !== Boolean(b.includeSubdomains)) {
      return Number(Boolean(a.includeSubdomains)) - Number(Boolean(b.includeSubdomains));
    }

    return Number(b.createdAt || 0) - Number(a.createdAt || 0);
  });

  return matching[0];
}

export async function getPageState(url) {
  const rule = await findMatchingRule(url);
  if (!rule) {
    return { tracked: false };
  }

  const { settings, usage } = await chrome.storage.local.get(["settings", "usage"]);
  const safeSettings = settings || DEFAULT_SETTINGS;
  const dayKey = getDayKeyForNow(safeSettings.resetTime);

  const ruleUsage = readRuleUsage(usage, dayKey, rule.id);
  const baseMinutes = rule.baseLimitMinutes === null ? 0 : Number(rule.baseLimitMinutes);
  const extraMinutes = Number(ruleUsage.extraMinutes || 0);
  const usedSeconds = Number(ruleUsage.seconds || 0);
  const totalAllowedSeconds = (baseMinutes + extraMinutes) * 60;

  return {
    tracked: true,
    blocked: totalAllowedSeconds === 0 ? true : usedSeconds >= totalAllowedSeconds,
    rule: {
      id: rule.id,
      host: rule.host,
      pathPrefix: normalizePathPrefix(rule.pathPrefix),
      includeSubdomains: Boolean(rule.includeSubdomains),
      label: rule.label
    },
    waitSeconds: normalizeWaitSeconds(safeSettings.waitSeconds),
    choicesMinutes: normalizeChoices(safeSettings.extensionChoicesMinutes),
    usage: {
      usedSeconds,
      baseMinutes,
      extraMinutes,
      remainingSeconds: Math.max(0, totalAllowedSeconds - usedSeconds)
    }
  };
}

export async function extendTime(payload) {
  const ruleId = String(payload?.ruleId || "");
  const minutes = Number(payload?.minutes || 0);

  if (!ruleId || !Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("Invalid extension request");
  }

  const { settings, usage } = await chrome.storage.local.get(["settings", "usage"]);
  const safeSettings = settings || DEFAULT_SETTINGS;
  const dayKey = getDayKeyForNow(safeSettings.resetTime);

  const safeUsage = usage && typeof usage === "object" ? usage : {};
  const byDay = safeUsage[dayKey] && typeof safeUsage[dayKey] === "object" ? safeUsage[dayKey] : {};
  const byRule = byDay[ruleId] && typeof byDay[ruleId] === "object" ? byDay[ruleId] : { seconds: 0, extraMinutes: 0 };

  byRule.extraMinutes = Number(byRule.extraMinutes || 0) + Math.floor(minutes);
  byRule.updatedAt = Date.now();

  await chrome.storage.local.set({
    usage: {
      ...safeUsage,
      [dayKey]: {
        ...byDay,
        [ruleId]: byRule
      }
    }
  });

  return { success: true };
}

export async function getDashboard() {
  const { settings, rules, usage } = await chrome.storage.local.get(["settings", "rules", "usage"]);
  const safeSettings = settings || DEFAULT_SETTINGS;
  const safeRules = Array.isArray(rules) ? rules : [];
  const dayKey = getDayKeyForNow(safeSettings.resetTime);

  return {
    dayKey,
    settings: safeSettings,
    rows: safeRules.map((rule) => {
      const ruleUsage = readRuleUsage(usage, dayKey, rule.id);
      return {
        rule,
        today: {
          usedSeconds: Number(ruleUsage.seconds || 0),
          extraMinutes: Number(ruleUsage.extraMinutes || 0)
        }
      };
    })
  };
}

function getRuleMatchPatterns(rules) {
  const set = new Set();

  for (const rule of rules) {
    if (!rule.enabled || !rule.host) {
      continue;
    }

    for (const pattern of hostToMatchPatterns(rule.host, Boolean(rule.includeSubdomains))) {
      set.add(pattern);
    }
  }

  return Array.from(set);
}
