let overlayVisible = false;
let monitorId = null;

if (window.top === window) {
  boot();
}

async function boot() {
  await checkAndMaybeBlock();

  monitorId = window.setInterval(async () => {
    if (!overlayVisible) {
      await checkAndMaybeBlock();
    }
  }, 5000);
}

async function checkAndMaybeBlock() {
  const response = await sendMessage({ type: "GET_PAGE_STATE", payload: { url: window.location.href } });
  if (!response.ok || !response.tracked) {
    return;
  }

  if (response.blocked) {
    showOverlay(response);
  }
}

function showOverlay(state) {
  if (overlayVisible) {
    return;
  }

  overlayVisible = true;

  const root = document.createElement("div");
  root.id = "mindful-timer-overlay-root";
  root.innerHTML = createOverlayHtml(state);
  document.documentElement.appendChild(root);

  const style = document.createElement("style");
  style.id = "mindful-timer-overlay-style";
  style.textContent = overlayStyles();
  document.documentElement.appendChild(style);

  const ring = root.querySelector(".mt-ring");
  const countdownText = root.querySelector(".mt-countdown");
  const choicesWrap = root.querySelector(".mt-choices");
  const mediaController = createMediaPauseController();

  let secondsLeft = Number(state.waitSeconds || 30);
  countdownText.textContent = `Pause for ${secondsLeft}s`;

  const ticker = window.setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft <= 0) {
      window.clearInterval(ticker);
      countdownText.textContent = "Ready to choose";
      ring.classList.add("mt-ring-done");
      choicesWrap.classList.remove("mt-hidden");
      return;
    }
    countdownText.textContent = `Pause for ${secondsLeft}s`;
  }, 1000);

  for (const btn of root.querySelectorAll("[data-minutes]")) {
    btn.addEventListener("click", async () => {
      const minutes = Number(btn.getAttribute("data-minutes"));
      btn.disabled = true;
      const result = await sendMessage({
        type: "EXTEND_TIME",
        payload: {
          ruleId: state.rule.id,
          minutes
        }
      });

      if (result.ok) {
        teardown();
      } else {
        btn.disabled = false;
      }
    });
  }

  function teardown() {
    window.clearInterval(ticker);
    mediaController.stop();
    root.remove();
    style.remove();
    overlayVisible = false;
  }
}

function createMediaPauseController() {
  const pausedMedia = new Set();
  const youtubeIframes = new Set();

  enforcePause();
  const intervalId = window.setInterval(enforcePause, 1000);

  return {
    stop() {
      window.clearInterval(intervalId);

      for (const media of pausedMedia) {
        if (!media || typeof media.play !== "function") {
          continue;
        }

        try {
          media.play();
        } catch {
          // Ignore autoplay restrictions when trying to resume.
        }
      }

      for (const frame of youtubeIframes) {
        if (!frame?.contentWindow) {
          continue;
        }
        sendYoutubeCommand(frame, "playVideo");
      }
    }
  };

  function enforcePause() {
    const mediaElements = document.querySelectorAll("video, audio");
    for (const media of mediaElements) {
      if (!media.paused && !media.ended) {
        try {
          media.pause();
          pausedMedia.add(media);
        } catch {
          // Ignore unpausable media elements.
        }
      }
    }

    const iframes = document.querySelectorAll('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]');
    for (const frame of iframes) {
      youtubeIframes.add(frame);
      sendYoutubeCommand(frame, "pauseVideo");
    }
  }
}

function sendYoutubeCommand(frame, command) {
  try {
    frame.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: command,
        args: []
      }),
      "*"
    );
  } catch {
    // Ignore cross-origin frame messaging failures.
  }
}

function createOverlayHtml(state) {
  const choices = Array.isArray(state.choicesMinutes) && state.choicesMinutes.length > 0
    ? state.choicesMinutes
    : [1, 2, 5, 10];

  const buttons = choices
    .map((minutes) => `<button class="mt-btn" data-minutes="${minutes}">${minutes} min</button>`)
    .join("");

  return `
    <div class="mt-backdrop" role="dialog" aria-live="polite" aria-label="Mindful pause">
      <div class="mt-card">
        <div class="mt-ring-wrap">
          <div class="mt-ring"></div>
        </div>
        <h1 class="mt-title">Breathe and think about what you want to do today.</h1>
        <p class="mt-subtitle">${escapeHtml(state.rule.label)} is paused by Mindful Site Timer.</p>
        <p class="mt-countdown"></p>
        <div class="mt-choices mt-hidden">
          <p class="mt-choice-title">Continue for:</p>
          <div class="mt-choice-buttons">${buttons}</div>
        </div>
      </div>
    </div>
  `;
}

function overlayStyles() {
  return `
    #mindful-timer-overlay-root {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
    }

    .mt-backdrop {
      width: 100vw;
      height: 100vh;
      display: grid;
      place-items: center;
      background: radial-gradient(circle at 18% 22%, #edf8ff 0%, #d7ecfc 36%, #c2e2fa 70%, #a9d3f6 100%);
      color: #17324a;
      padding: 24px;
      box-sizing: border-box;
    }

    .mt-card {
      width: min(560px, 100%);
      background: rgba(249, 253, 255, 0.94);
      border: 2px solid rgba(62, 133, 191, 0.2);
      border-radius: 24px;
      padding: 28px 24px;
      box-shadow: 0 16px 42px rgba(30, 99, 156, 0.2);
      text-align: center;
    }

    .mt-ring-wrap {
      margin: 4px auto 14px;
      width: 92px;
      height: 92px;
      display: grid;
      place-items: center;
    }

    .mt-ring {
      width: 76px;
      height: 76px;
      border: 7px solid #6fb7ec;
      border-top-color: #1f6ca9;
      border-radius: 999px;
      animation: mt-breathe 2.4s ease-in-out infinite;
    }

    .mt-ring-done {
      animation-play-state: paused;
      transform: scale(1);
    }

    .mt-title {
      margin: 0;
      font-size: clamp(1.4rem, 2.8vw, 2rem);
      line-height: 1.2;
    }

    .mt-subtitle {
      margin: 10px 0 2px;
      font-size: 0.95rem;
      opacity: 0.84;
    }

    .mt-countdown {
      margin: 14px 0 6px;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .mt-choices {
      margin-top: 14px;
    }

    .mt-hidden {
      display: none;
    }

    .mt-choice-title {
      margin: 0 0 10px;
      font-size: 0.95rem;
    }

    .mt-choice-buttons {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .mt-btn {
      border: 0;
      border-radius: 999px;
      background: #2f7ecf;
      color: #fff;
      cursor: pointer;
      padding: 10px 14px;
      font-weight: 700;
      min-width: 70px;
      transition: transform 120ms ease, opacity 120ms ease;
    }

    .mt-btn:hover {
      transform: translateY(-1px);
      opacity: 0.95;
    }

    .mt-btn:disabled {
      opacity: 0.6;
      cursor: wait;
      transform: none;
    }

    @keyframes mt-breathe {
      0%, 100% {
        transform: scale(0.8);
      }
      50% {
        transform: scale(1.18);
      }
    }

    @media (max-width: 520px) {
      .mt-card {
        border-radius: 18px;
        padding: 22px 16px;
      }

      .mt-choice-buttons {
        gap: 8px;
      }

      .mt-btn {
        padding: 9px 12px;
      }
    }
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sendMessage(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || { ok: false });
      });
    } catch {
      resolve({ ok: false });
    }
  });
}
