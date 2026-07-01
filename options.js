const settingsForm = document.getElementById("settings-form");
const addRuleForm = document.getElementById("add-rule-form");
const resetTimeInput = document.getElementById("reset-time");
const waitSecondsInput = document.getElementById("wait-seconds");
const siteUrlInput = document.getElementById("site-url");
const includeSubdomainsInput = document.getElementById("include-subdomains");
const siteLimitInput = document.getElementById("site-limit");
const rulesListEl = document.getElementById("rules-list");
const settingsMessageEl = document.getElementById("settings-message");
const ruleMessageEl = document.getElementById("rule-message");

let currentRows = [];
let editingRuleId = null;

boot().catch((error) => {
  setMessage(settingsMessageEl, error.message || "Failed to load settings", true);
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const response = await send({
    type: "UPDATE_SETTINGS",
    payload: {
      resetTime: resetTimeInput.value,
      waitSeconds: Number(waitSecondsInput.value)
    }
  });

  if (!response.ok) {
    setMessage(settingsMessageEl, response.error || "Could not save settings", true);
    return;
  }

  setMessage(settingsMessageEl, "Settings saved");
  await loadDashboard();
});

addRuleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(ruleMessageEl, "");

  const rawUrl = siteUrlInput.value.trim();
  const includeSubdomains = Boolean(includeSubdomainsInput.checked);
  const baseLimitMinutes = siteLimitInput.value.trim() === "" ? null : Number(siteLimitInput.value);

  let parsedRule;
  try {
    parsedRule = parseRuleInput(rawUrl);
  } catch (error) {
    setMessage(ruleMessageEl, error.message || "Invalid URL", true);
    return;
  }

  const origins = hostToOrigins(parsedRule.host, includeSubdomains);
  const permissionGranted = await requestOrigins(origins);
  if (!permissionGranted) {
    setMessage(ruleMessageEl, "Host permission was not granted", true);
    return;
  }

  const response = await send({
    type: "ADD_RULE",
    payload: {
      url: rawUrl,
      baseLimitMinutes,
      includeSubdomains
    }
  });

  if (!response.ok) {
    setMessage(ruleMessageEl, response.error || "Could not add site", true);
    return;
  }

  siteUrlInput.value = "";
  includeSubdomainsInput.checked = true;
  siteLimitInput.value = "";
  setMessage(ruleMessageEl, "Site saved");
  await loadDashboard();
});

async function boot() {
  const config = await send({ type: "GET_CONFIG" });
  if (!config.ok) {
    throw new Error(config.error || "Could not fetch config");
  }

  resetTimeInput.value = config.settings.resetTime || "00:00";
  waitSecondsInput.value = Number(config.settings.waitSeconds || 30);

  await loadDashboard();
}

async function loadDashboard() {
  const response = await send({ type: "GET_DASHBOARD" });
  if (!response.ok) {
    throw new Error(response.error || "Could not fetch dashboard");
  }

  currentRows = Array.isArray(response.rows) ? response.rows : [];

  if (editingRuleId && !currentRows.some((row) => row.rule.id === editingRuleId)) {
    editingRuleId = null;
  }

  renderRules();
}

function renderRules() {
  if (!Array.isArray(currentRows) || currentRows.length === 0) {
    rulesListEl.innerHTML = "<p class=\"lead\">No sites added yet.</p>";
    return;
  }

  const html = currentRows
    .map((row) => {
      const rule = row.rule;
      const isEditing = rule.id === editingRuleId;
      return isEditing ? renderEditableRule(row) : renderCompactRule(row);
    })
    .join("");

  rulesListEl.innerHTML = html;

  wireRuleActions();
}

function renderCompactRule(row) {
  const rule = row.rule;
  const used = formatMinutes(row.today.usedSeconds || 0);
  const url = ruleToUrl(rule);

  return `
    <article class="rule" data-rule-id="${rule.id}">
      <div class="rule-head">
        <div class="rule-summary">
          <div class="rule-title">${escapeHtml(url)}</div>
          <p class="rule-meta">Used today: ${used}</p>
        </div>
        <div class="rule-actions">
          <button class="btn ghost" data-action="edit">Edit</button>
          <button class="btn ghost danger" data-action="remove">Remove</button>
        </div>
      </div>
    </article>
  `;
}

function renderEditableRule(row) {
  const rule = row.rule;
  const url = ruleToUrl(rule);
  const limitValue = rule.baseLimitMinutes === null ? "" : String(rule.baseLimitMinutes);

  return `
    <article class="rule rule-editing" data-rule-id="${rule.id}">
      <div class="rule-edit-fields">
        <label>
          Site URL
          <input data-edit-url value="${escapeHtml(url)}" />
        </label>

        <label class="subdomain-toggle edit-toggle" for="edit-subdomains-${rule.id}">
          <input id="edit-subdomains-${rule.id}" data-edit-subdomains type="checkbox" ${rule.includeSubdomains ? "checked" : ""} />
          <span>Include subdomains</span>
        </label>

        <label>
          Allowed minutes per day
          <input data-edit-limit type="number" min="1" step="1" placeholder="Leave empty for immediate block" value="${escapeHtml(limitValue)}" />
        </label>
      </div>

      <div class="rule-actions">
        <button class="btn primary" data-action="save">Save</button>
        <button class="btn ghost" data-action="cancel">Cancel</button>
      </div>
    </article>
  `;
}

function wireRuleActions() {
  for (const button of rulesListEl.querySelectorAll("button[data-action='remove']")) {
    button.addEventListener("click", async (event) => {
      const article = event.currentTarget.closest(".rule");
      const ruleId = article?.getAttribute("data-rule-id");
      if (!ruleId) {
        return;
      }

      const response = await send({
        type: "REMOVE_RULE",
        payload: { ruleId }
      });

      if (!response.ok) {
        setMessage(ruleMessageEl, response.error || "Could not remove rule", true);
        return;
      }

      if (editingRuleId === ruleId) {
        editingRuleId = null;
      }

      setMessage(ruleMessageEl, "Rule removed");
      await loadDashboard();
    });
  }

  for (const button of rulesListEl.querySelectorAll("button[data-action='edit']")) {
    button.addEventListener("click", (event) => {
      const article = event.currentTarget.closest(".rule");
      const ruleId = article?.getAttribute("data-rule-id");
      if (!ruleId) {
        return;
      }

      editingRuleId = ruleId;
      setMessage(ruleMessageEl, "");
      renderRules();
    });
  }

  for (const button of rulesListEl.querySelectorAll("button[data-action='cancel']")) {
    button.addEventListener("click", () => {
      editingRuleId = null;
      setMessage(ruleMessageEl, "");
      renderRules();
    });
  }

  for (const button of rulesListEl.querySelectorAll("button[data-action='save']")) {
    button.addEventListener("click", async (event) => {
      const article = event.currentTarget.closest(".rule");
      const ruleId = article?.getAttribute("data-rule-id");
      if (!ruleId) {
        return;
      }

      const urlInput = article.querySelector("input[data-edit-url]");
      const subdomainsInput = article.querySelector("input[data-edit-subdomains]");
      const limitInput = article.querySelector("input[data-edit-limit]");

      const rawUrl = String(urlInput?.value || "").trim();
      const includeSubdomains = Boolean(subdomainsInput?.checked);
      const baseLimitMinutes = String(limitInput?.value || "").trim() === "" ? null : Number(limitInput.value);

      let parsedRule;
      try {
        parsedRule = parseRuleInput(rawUrl);
      } catch (error) {
        setMessage(ruleMessageEl, error.message || "Invalid URL", true);
        return;
      }

      const origins = hostToOrigins(parsedRule.host, includeSubdomains);
      const permissionGranted = await requestOrigins(origins);
      if (!permissionGranted) {
        setMessage(ruleMessageEl, "Host permission was not granted", true);
        return;
      }

      const response = await send({
        type: "UPDATE_RULE",
        payload: {
          ruleId,
          url: rawUrl,
          includeSubdomains,
          baseLimitMinutes
        }
      });

      if (!response.ok) {
        setMessage(ruleMessageEl, response.error || "Could not update rule", true);
        return;
      }

      editingRuleId = null;
      setMessage(ruleMessageEl, "Rule updated");
      await loadDashboard();
    });
  }
}

function ruleToUrl(rule) {
  const host = canonicalizeHost(rule.host);
  const path = normalizePathPrefix(rule.pathPrefix);
  return path === "/" ? `https://${host}` : `https://${host}${path}`;
}

function setMessage(el, text, isError = false) {
  el.textContent = text || "";
  el.classList.remove("ok", "err");

  if (!text) {
    return;
  }

  el.classList.add(isError ? "err" : "ok");
}

function parseRuleInput(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    throw new Error("Site URL is required");
  }

  const withScheme = /^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withScheme);
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported");
  }

  const host = canonicalizeHost(parsed.hostname);
  if (!host) {
    throw new Error("Invalid host");
  }

  return {
    host,
    pathPrefix: normalizePathPrefix(parsed.pathname || "/")
  };
}

function hostToOrigins(host, includeSubdomains) {
  const canonicalHost = canonicalizeHost(host);
  const list = [
    `https://${canonicalHost}/`,
    `http://${canonicalHost}/`,
    ...getWwwAliases(canonicalHost).flatMap((alias) => [`https://${alias}/`, `http://${alias}/`])
  ];

  if (includeSubdomains && !isIp(canonicalHost) && canonicalHost !== "localhost") {
    list.push(`https://*.${canonicalHost}/`, `http://*.${canonicalHost}/`);
  }

  return Array.from(new Set(list));
}

function normalizePathPrefix(pathname) {
  const raw = String(pathname || "/").trim();
  if (!raw || raw === "/") {
    return "/";
  }

  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const withoutTrailing = withSlash.replace(/\/+$/, "");
  return withoutTrailing || "/";
}

function canonicalizeHost(host) {
  return String(host || "").toLowerCase().replace(/^www\./, "");
}

function getWwwAliases(host) {
  if (!host || isIp(host) || host === "localhost") {
    return [];
  }

  return host.startsWith("www.") ? [host.replace(/^www\./, "")] : [`www.${host}`];
}

function isIp(host) {
  return /^\d+\.\d+\.\d+\.\d+$/.test(host);
}

function formatMinutes(seconds) {
  const mins = Math.floor(Number(seconds || 0) / 60);
  const secs = Math.floor(Number(seconds || 0) % 60);
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function requestOrigins(origins) {
  return new Promise((resolve) => {
    chrome.permissions.request({ origins }, (granted) => resolve(Boolean(granted)));
  });
}

function send(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response || { ok: false, error: "No response" });
    });
  });
}
