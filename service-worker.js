import { TICK_ALARM_NAME } from "./background/common.js";
import {
  initializeStorage,
  syncRegisteredContentScript,
  getConfig,
  addRule,
  removeRule,
  updateSettings,
  getPageState,
  extendTime,
  getDashboard
} from "./background/rules-service.js";
import {
  flushActiveTime,
  refreshActiveContext,
  clearIfTrackingTabRemoved,
  cleanupUsage
} from "./background/usage-tracker.js";

chrome.runtime.onInstalled.addListener(async () => {
  await bootstrap();
});

chrome.runtime.onStartup.addListener(async () => {
  await bootstrap();
  await refreshActiveContext();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== TICK_ALARM_NAME) {
    return;
  }

  await flushActiveTime();
  await refreshActiveContext();
  await cleanupUsage();
});

chrome.tabs.onActivated.addListener(async () => {
  await refreshActiveContext();
});

chrome.tabs.onUpdated.addListener(async () => {
  await refreshActiveContext();
});

chrome.windows.onFocusChanged.addListener(async () => {
  await refreshActiveContext();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await clearIfTrackingTabRemoved(tabId);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: error.message || "Unknown error" }));

  return true;
});

async function bootstrap() {
  await initializeStorage();
  await syncRegisteredContentScript();
  chrome.alarms.create(TICK_ALARM_NAME, { periodInMinutes: 1 });
}

async function handleMessage(message) {
  switch (message?.type) {
    case "GET_CONFIG":
      return getConfig();
    case "ADD_RULE": {
      const result = await addRule(message.payload);
      await refreshActiveContext();
      return result;
    }
    case "REMOVE_RULE": {
      const result = await removeRule(message.payload);
      await refreshActiveContext();
      return result;
    }
    case "UPDATE_SETTINGS":
      return updateSettings(message.payload);
    case "GET_PAGE_STATE":
      return getPageState(message.payload?.url);
    case "EXTEND_TIME":
      return extendTime(message.payload);
    case "GET_DASHBOARD":
      return getDashboard();
    default:
      throw new Error("Unsupported message type");
  }
}
