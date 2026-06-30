import { DEFAULT_SETTINGS, getDayKeyForNow, readRuleUsage } from "./common.js";
import { findMatchingRule } from "./rules-service.js";

let activeContext = null;

export async function flushActiveTime() {
  if (!activeContext) {
    return;
  }

  const snapshot = activeContext;
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - snapshot.startedAt) / 1000);
  if (elapsedSeconds <= 0) {
    return;
  }

  await addUsageSeconds(snapshot.ruleId, elapsedSeconds);

  if (
    activeContext &&
    activeContext.tabId === snapshot.tabId &&
    activeContext.ruleId === snapshot.ruleId &&
    activeContext.startedAt === snapshot.startedAt
  ) {
    activeContext.startedAt = now;
  }
}

export async function refreshActiveContext() {
  await flushActiveTime();

  const tracked = await findTrackedActiveTab();
  if (!tracked) {
    activeContext = null;
    return;
  }

  activeContext = {
    tabId: tracked.tabId,
    ruleId: tracked.rule.id,
    startedAt: Date.now()
  };
}

export async function clearIfTrackingTabRemoved(tabId) {
  if (!activeContext || activeContext.tabId !== tabId) {
    return;
  }

  await flushActiveTime();
  activeContext = null;
}

export async function cleanupUsage() {
  const { usage } = await chrome.storage.local.get(["usage"]);
  if (!usage || typeof usage !== "object") {
    return;
  }

  const keys = Object.keys(usage).sort();
  if (keys.length <= 14) {
    return;
  }

  const keep = new Set(keys.slice(-14));
  const next = {};

  for (const key of keep) {
    next[key] = usage[key];
  }

  await chrome.storage.local.set({ usage: next });
}

async function findTrackedActiveTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!activeTab || !activeTab.url || !/^https?:/i.test(activeTab.url)) {
    return null;
  }

  const rule = await findMatchingRule(activeTab.url);
  if (!rule) {
    return null;
  }

  return { tabId: activeTab.id, rule };
}

async function addUsageSeconds(ruleId, secondsToAdd) {
  if (!ruleId || !Number.isFinite(secondsToAdd) || secondsToAdd <= 0) {
    return;
  }

  const { settings, usage } = await chrome.storage.local.get(["settings", "usage"]);
  const safeSettings = settings || DEFAULT_SETTINGS;
  const dayKey = getDayKeyForNow(safeSettings.resetTime);

  const safeUsage = usage && typeof usage === "object" ? usage : {};
  const byDay = safeUsage[dayKey] && typeof safeUsage[dayKey] === "object" ? safeUsage[dayKey] : {};
  const byRule = readRuleUsage(safeUsage, dayKey, ruleId);

  byRule.seconds = Number(byRule.seconds || 0) + Math.floor(secondsToAdd);
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
}
