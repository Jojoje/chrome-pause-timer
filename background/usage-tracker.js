import { DEFAULT_SETTINGS, getDayKeyForNow, readRuleUsage } from "./common.js";
import { findMatchingRule } from "./rules-service.js";

let trackedContexts = new Map();

export async function flushActiveTime() {
  if (trackedContexts.size === 0) {
    return;
  }

  const now = Date.now();
  const snapshots = Array.from(trackedContexts.values());

  for (const snapshot of snapshots) {
    await flushContextSnapshot(snapshot, now);

    const current = trackedContexts.get(snapshot.tabId);
    if (
      current &&
      current.ruleId === snapshot.ruleId &&
      current.startedAt === snapshot.startedAt
    ) {
      current.startedAt = now;
      trackedContexts.set(snapshot.tabId, current);
    }
  }
}

export async function refreshActiveContext() {
  await flushActiveTime();

  const tracked = await findTrackedActiveTabs();
  const now = Date.now();
  const next = new Map();

  for (const item of tracked) {
    const existing = trackedContexts.get(item.tabId);
    next.set(item.tabId, {
      tabId: item.tabId,
      ruleId: item.rule.id,
      startedAt: existing && existing.ruleId === item.rule.id ? existing.startedAt : now
    });
  }

  trackedContexts = next;
}

export async function clearIfTrackingTabRemoved(tabId) {
  const context = trackedContexts.get(tabId);
  if (!context) {
    return;
  }

  await flushContextSnapshot(context, Date.now());
  trackedContexts.delete(tabId);
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

async function findTrackedActiveTabs() {
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] });
  const matches = [];
  const seenTabIds = new Set();

  for (const windowInfo of windows) {
    if (windowInfo.state === "minimized") {
      continue;
    }

    const tabs = Array.isArray(windowInfo.tabs) ? windowInfo.tabs : [];
    const activeTab = tabs.find((tab) => tab.active);
    if (!activeTab || !activeTab.id || !activeTab.url || !/^https?:/i.test(activeTab.url)) {
      continue;
    }

    if (seenTabIds.has(activeTab.id)) {
      continue;
    }

    const rule = await findMatchingRule(activeTab.url);
    if (!rule) {
      continue;
    }

    seenTabIds.add(activeTab.id);
    matches.push({ tabId: activeTab.id, rule });
  }

  return matches;
}

async function flushContextSnapshot(snapshot, now) {
  const elapsedSeconds = Math.floor((now - snapshot.startedAt) / 1000);
  if (elapsedSeconds <= 0) {
    return;
  }

  await addUsageSeconds(snapshot.ruleId, elapsedSeconds);
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
