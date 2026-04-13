/**
 * Cortex Trivia — Sprint 6 - 7
 */

const API_BASE = "";

// I store state in sessionStorage so each browser window can act independently (host vs player).
const STORAGE_KEY = "cortex_demo_state_v2";

function loadState() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function saveState(state) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearState() {
  sessionStorage.removeItem(STORAGE_KEY);
}

function defaultState() {
  return {
    role: "",              // "host" | "player"
    session_code: "",      // short code
    bank_id: "cs",         // category / question bank id
    players: [],           // list of players (host page mainly)
    active_player: "",     // current player name (player page / quiz)
    game_id: "",           // backend game id
    questions: [],         // cached question set
    idx: 0,                // current question index
    question_time: 30,     // host-customizable seconds per question (added from classmate)
    buffer_enabled: true   // host-customizable buffer toggle (added from classmate)
  };
}

function $(id) {
  return document.getElementById(id);
}

function setText(id, txt) {
  const el = $(id);
  if (el) el.textContent = txt;
}

function setStatus(id, msg) {
  const el = $(id);
  if (el) el.textContent = msg;
}

function getQueryParam(name) {
  try {
    return new URL(window.location.href).searchParams.get(name);
  } catch {
    return null;
  }
}

function makeSessionCode() {
  // I avoid ambiguous characters so teammates can read the code aloud during a demo.
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return out;
}

async function apiRequest(path, { method = "GET", body = null } = {}) {
  const opts = { method, headers: {} };

  if (body !== null) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text().catch(() => "");
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || text || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return json;
}

async function tryPost(paths, payload) {
  // I try endpoints in order so our frontend survives backend renames.
  let lastErr = null;
  for (const p of paths) {
    try {
      return await apiRequest(p, { method: "POST", body: payload });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Request failed");
}

async function tryGet(paths) {
  let lastErr = null;
  for (const p of paths) {
    try {
      return await apiRequest(p, { method: "GET" });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Request failed");
}

/* =========================================================
   PAGE: Lobby (frontend/index.html)
========================================================= */
function initLobby() {
  const createBtn = $("createBtn");
  const joinBtn = $("joinBtn");
  const startBtn = $("startBtn");   // legacy (optional)
  const leaveBtn = $("leaveBtn");   // legacy (optional)

  if (!createBtn && !joinBtn) return;

  let state = loadState() || defaultState();

  function render() {
    setText("sessionCode", state.session_code || "—");
    setText("playerList", state.players.length ? state.players.join(", ") : "—");
    const bankSelect = $("bankSelect");
    if (bankSelect) bankSelect.value = state.bank_id || "cs";
  }

  // Host creates a session and immediately goes to host.html
  createBtn?.addEventListener("click", async (e) => {
    e.preventDefault();

    const hostName = ($("createName")?.value || "").trim() || "Host";
    const bankId = $("bankSelect")?.value || "cs";

    setStatus("statusText", "Creating session…");

    // I reset state so a previous game_id doesn't leak into a new session.
    state = defaultState();
    state.role = "host";
    state.active_player = hostName;
    state.bank_id = bankId;

    try {
      // Preferred (Sprint 3): /session/create
      // Fallback: /create
      const resp = await tryPost(
        ["/session/create", "/create"],
        { host: hostName, host_name: hostName, bank_id: bankId, bank: bankId }
      );

      // I normalize whatever the backend returns into our frontend state.
      const code = resp.session_code || resp.code || makeSessionCode();
      state.session_code = String(code).toUpperCase();
      state.players = resp.players || [hostName];

      saveState(state);
      render();

      setStatus("statusText", `Session created: ${state.session_code}. Sending host to dashboard…`);
      window.location.href = "./host.html";
    } catch (err) {
      // If backend is down, I still allow UI testing (demo safety), but I keep the status honest.
      state.session_code = makeSessionCode();
      state.players = [hostName];
      saveState(state);
      render();
      setStatus("statusText", `Backend create failed (${err.message}). Using local demo code: ${state.session_code}`);
      window.location.href = "./host.html";
    }
  });

  // Player joins and goes to player.html
  joinBtn?.addEventListener("click", async (e) => {
    e.preventDefault();

    const code = ($("joinCode")?.value || "").trim().toUpperCase();
    const playerName = ($("joinName")?.value || "").trim() || "Player";

    if (!code) {
      setStatus("statusText", "Enter a session code to join.");
      return;
    }

    setStatus("statusText", "Joining session…");

    state = defaultState();
    state.role = "player";
    state.session_code = code;
    state.active_player = playerName;

    try {
      // Preferred (Sprint 3): /session/join
      // Fallback: /join
      const resp = await tryPost(
        ["/session/join", "/join"],
        { session_code: code, player: playerName, player_name: playerName }
      );

      state.players = resp.players || resp.player_list || [playerName];
      state.bank_id = resp.bank_id || state.bank_id;

      saveState(state);
      render();

      setStatus("statusText", `Joined ${code} as ${playerName}. Sending player to waiting room…`);
      window.location.href = "./player.html";
    } catch (err) {
      // Even if backend join fails, I keep player page usable for UI testing.
      state.players = [playerName];
      saveState(state);
      render();
      setStatus("statusText", `Backend join failed (${err.message}). Opening waiting room anyway…`);
      window.location.href = "./player.html";
    }
  });

  // Legacy buttons (optional): keep them safe if present.
  startBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    setStatus("statusText", "Sprint 3: start the game from the Host page.");
  });

  leaveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    clearState();
    state = defaultState();
    render();
    setStatus("statusText", "Left session.");
  });

  render();
  setStatus("statusText", "Ready.");
}

/* =========================================================
   PAGE: Host (frontend/host.html)
========================================================= */
function initHost() {
  if (!$("hostStartBtn")) return;

  let state = loadState() || defaultState();

  // syncControlUI: visually highlights the active timer/buffer btn
  function syncControlUI() {
    const currentTime = state.question_time || 30;

    document.querySelectorAll(".timer-btn").forEach((b) => {
      b.classList.toggle("selected", Number(b.dataset.time) === currentTime);
    });

    const bufferOnBtn = $("bufferOn");
    const bufferOffBtn = $("bufferOff");

    bufferOnBtn?.classList.toggle("selected", !!state.buffer_enabled);
    bufferOffBtn?.classList.toggle("selected", !state.buffer_enabled);
  }

  // Timer buttons: host clicks to set question time (e.g. 15s, 30s)
  document.querySelectorAll(".timer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = Number(btn.dataset.time);
      state.question_time = val;
      saveState(state);
      syncControlUI();
      render();
      setStatus("hostStatus", `Question timer set to ${val}s`);
    });
  });

  // Buffer toggle: host enables or disables the pre-question buffer
  $("bufferOn")?.addEventListener("click", () => {
    state.buffer_enabled = true;
    saveState(state);
    render();
    setStatus("hostStatus", "Buffer timer enabled");
  });

  $("bufferOff")?.addEventListener("click", () => {
    state.buffer_enabled = false;
    saveState(state);
    render();
    setStatus("hostStatus", "Buffer timer disabled");
  });

  // If I got here without a host session, I want a clear message instead of silent failure.
  if (state.role !== "host" || !state.session_code) {
    setText("hostSessionCode", "—");
    setText("hostBank", "—");
    setText("hostPlayers", "No active host session. Go back to Lobby and Create a session.");
    setStatus("hostStatus", "Missing session state.");
    return;
  }

  function render() {
    setText("hostSessionCode", state.session_code || "—");
    setText("hostBank", state.bank_id || "—");
    setText("hostPlayers", state.players.length ? state.players.join(", ") : "Waiting for players…");
    syncControlUI(); // keep timer/buffer buttons in sync on every render
  }

  async function refreshSession() {
    // I poll session state so the host can see players join (Sprint 3 direction).
    try {
      const resp = await tryGet([`/session/${encodeURIComponent(state.session_code)}`]);

      // Normalize into state (don't assume backend field names).
      state.players = resp.players || state.players;
      state.bank_id = resp.bank_id || state.bank_id;

      if (resp.game_id) {
        state.game_id = resp.game_id;
      }

      saveState(state);
      render();

      if (resp.started && resp.game_id) {
        setStatus("hostStatus", `Game started (game_id: ${resp.game_id}).`);
      } else {
        setStatus("hostStatus", "Waiting… share the code with players.");
      }
    } catch {
      // I don't fail hard because we still want the UI usable even if session polling isn't ready.
      render();
      setStatus("hostStatus", "Host ready. (Session polling not available yet.)");
    }
  }

  $("hostBackBtn")?.addEventListener("click", () => {
    clearState();
    window.location.href = "./index.html";
  });

  $("copyCodeBtn")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.session_code);
      setStatus("hostStatus", "Copied session code.");
    } catch {
      setStatus("hostStatus", "Could not copy (browser blocked clipboard).");
    }
  });

  $("hostStartBtn")?.addEventListener("click", async () => {
    setStatus("hostStatus", "Starting game…");

    try {
      let resp = null;

      try {
        // Preferred (Sprint 3): /session/<code>/start
        // Now sends question_time and buffer_enabled to backend (added from classmate)
        resp = await tryPost(
          [`/session/${encodeURIComponent(state.session_code)}/start`],
          {
            question_time: state.question_time,
            buffer_enabled: state.buffer_enabled
          }
        );
      } catch {
        // Fallback: /start also sends time settings (added from classmate)
        resp = await tryPost(
          ["/start"],
          {
            session_code: state.session_code,
            players: state.players,
            bank_id: state.bank_id,
            question_time: state.question_time,
            buffer_enabled: state.buffer_enabled
          }
        );
      }

      const gameId = resp.game_id || resp.gameId || resp.id;
      if (!gameId) throw new Error("Backend did not return game_id.");

      state.game_id = gameId;
      state.questions = [];
      state.idx = 0;

      saveState(state);
      render();

      setStatus("hostStatus", `Game started (game_id: ${gameId}).`);
      // Host does NOT auto-open quiz; host is a "monitor" page by design.
    } catch (err) {
      setStatus("hostStatus", `Start failed: ${err.message}`);
    }
  });

  render();
  refreshSession();
  // I refresh periodically so the host sees joins without clicking anything.
  setInterval(refreshSession, 1500);
}

/* =========================================================
   PAGE: Player (frontend/player.html)
========================================================= */
function initPlayer() {
  if (!$("playerCheckBtn")) return;

  let state = loadState() || defaultState();

  if (state.role !== "player" || !state.session_code) {
    setText("playerSessionCode", "—");
    setText("playerName", "—");
    setStatus("playerStatus", "Missing player session. Go back to Lobby and Join a session.");
    $("playerOpenQuizBtn") && ($("playerOpenQuizBtn").disabled = true);
    return;
  }

  function render() {
    setText("playerSessionCode", state.session_code || "—");
    setText("playerName", state.active_player || "Player");
    const openBtn = $("playerOpenQuizBtn");
    if (openBtn) openBtn.disabled = !state.game_id;
  }

  async function checkStatus() {
    setStatus("playerStatus", "Checking status…");

    try {
      const resp = await tryGet([`/session/${encodeURIComponent(state.session_code)}`]);

      state.bank_id = resp.bank_id || state.bank_id;

      if (resp.game_id) {
        state.game_id = resp.game_id;
        saveState(state);
        render();
        setStatus("playerStatus", "Game started! You can open the quiz now.");
        return;
      }

      setStatus("playerStatus", "Host has not started the game yet.");
    } catch (err) {
      // If the status endpoint isn't ready, I give a clear message instead of breaking the page.
      setStatus("playerStatus", `Status endpoint not ready (${err.message}). Waiting for host…`);
    }
  }

  $("playerBackBtn")?.addEventListener("click", () => {
    clearState();
    window.location.href = "./index.html";
  });

  $("playerCheckBtn")?.addEventListener("click", checkStatus);

  $("playerOpenQuizBtn")?.addEventListener("click", () => {
    if (!state.game_id) {
      setStatus("playerStatus", "Game not started yet.");
      return;
    }

    // I keep this redirect simple: quiz reads game_id from sessionStorage.
    saveState(state);
    window.location.href = "./quiz.html";
  });

  render();
  setStatus("playerStatus", "Joined. Waiting for host to start…");
}

/* =========================================================
   PAGE: Quiz (frontend/quiz.html)
========================================================= */
function initQuiz() {
  // I only run quiz logic if quiz-specific elements exist.
  const questionText = $("questionText");
  const answersEl = $("answers");
  const statusEl = $("quizStatus");
  const progressPill = $("progressPill");
  const submitBtn = $("submitBtn");
  const nextBtn = $("nextBtn");
  const timerEl = $("timer"); // optional element to show countdown

  let interval = null;       // stores setInterval for countdown display
  let currentTimeRemaining = 0;
  let bufferInterval = null;

  if (!questionText || !answersEl || !statusEl || !progressPill || !submitBtn || !nextBtn) return;

  let state = loadState() || defaultState();

  if (!state.game_id) {
    setText("questionText", "No active game found.");
    setText("quizStatus", "Go to Host page and Start Game first.");
    submitBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  let selectedAnswerIndex = null;
  let submitted = false;

  function setQuizStatus(msg) {
    statusEl.textContent = msg;
  }

  function clearTimers() {
    if (interval) clearInterval(interval);
    if (bufferInterval) clearInterval(bufferInterval);
    interval = null;
    bufferInterval = null;
  }

  function renderQuestion() {
    clearTimers();
    const q = state.questions[state.idx];
    if (!q) return;

    selectedAnswerIndex = null;
    submitted = false;

    progressPill.textContent = `Question ${state.idx + 1} / ${state.questions.length}`;
    questionText.textContent = q.question;

    answersEl.innerHTML = "";

    // Fisher-Yates shuffle (kept from your version)
    let displayIndexes = q.choices.map((_, i) => i);
    for (let i = displayIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [displayIndexes[i], displayIndexes[j]] = [displayIndexes[j], displayIndexes[i]];
    }

    displayIndexes.forEach((idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer";
      btn.textContent = q.choices[idx];

      btn.addEventListener("click", () => {
        if (submitted) return;

        selectedAnswerIndex = idx; // original index preserved for correct answer checking

        Array.from(answersEl.querySelectorAll("button.answer")).forEach((b) => {
          b.classList.remove("selected");
        });

        btn.classList.add("selected");
        submitBtn.disabled = false;
        setQuizStatus("Selection ready. Press Submit.");
      });

      answersEl.appendChild(btn);
    });

    submitBtn.disabled = true;
    nextBtn.disabled = true;

    // startQuestionTimer: uses host-configured time
    function startQuestionTimer() {
      answersEl.style.visibility = "visible";
      setQuizStatus("Pick an answer.");

      const questionTime = state.question_time || 30;
      let remaining = questionTime;
      currentTimeRemaining = questionTime;

      if (timerEl) timerEl.textContent = `${remaining}`;

      interval = setInterval(async () => {
        remaining = Math.max(remaining - 1, 0);
        currentTimeRemaining = remaining;

        if (timerEl) timerEl.textContent = `${remaining}`;

        if (remaining === 0) {
          clearInterval(interval);

          if (!submitted) {
            submitted = true;
            submitBtn.disabled = true;
            setQuizStatus("Time's up! Auto-submitting...");

            const q = state.questions[state.idx];

            try {
              const resp = await apiRequest(
                `/game/${encodeURIComponent(state.game_id)}/submit`,
                {
                  method: "POST",
                  body: {
                    question_id: q.id,
                    answer_index: selectedAnswerIndex ?? -1,
                    player: state.active_player || state.players[0] || "Player",
                    currTime: currentTimeRemaining
                  }
                }
              );

              if (resp.is_correct === true) {
                setQuizStatus("Correct ✅");
              } else {
                setQuizStatus(`Wrong ❌ (Correct: ${resp.correct_text})`);
              }

              nextBtn.disabled = false;
            } catch (err) {
              console.error(err);
              setQuizStatus(`Auto-submit failed: ${err.message}`);
              submitted = false;
              submitBtn.disabled = false;
            }
          }
        }
      }, 1000);
    }

    // Buffer handling: respects host's buffer_enabled setting
    const bufferTime = state.buffer_enabled ? 5 : 0;

    if (bufferTime > 0) {
      answersEl.style.visibility = "hidden";
      setQuizStatus("Get ready...");

      let bufferRemaining = bufferTime;
      if (timerEl) timerEl.textContent = `${bufferRemaining}`;

      bufferInterval = setInterval(() => {
        bufferRemaining--;
        if (timerEl) timerEl.textContent = `${bufferRemaining}`;

        if (bufferRemaining <= 0) {
          clearInterval(bufferInterval);
          startQuestionTimer();
        }
      }, 1000);
    } else {
      // Buffer disabled by host — go straight to question
      startQuestionTimer();
    }
  }

  // syncFromSession: pulls question_time + buffer_enabled from backend
  async function syncFromSession() {
    const resp = await tryGet([`/session/${encodeURIComponent(state.session_code)}`]);

    state = {
      ...state,
      ...resp
    };

    saveState(state);
  }

  async function loadQuestionsIfNeeded() {
    // Re-read state in case syncFromSession updated it
    const latest = loadState();
    if (latest) state = latest;

    if (!state.game_id) {
      throw new Error("Missing game_id. Game was not started properly.");
    }

    if (Array.isArray(state.questions) && state.questions.length > 0) return;

    setQuizStatus("Fetching questions from backend…");

    const data = await apiRequest(`/game/${encodeURIComponent(state.game_id)}/questions`, { method: "GET" });

    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error("Backend returned invalid questions payload.");
    }

    state.questions = data.questions.slice(0, 10);
    state.idx = 0;

    saveState(state);
  }

  submitBtn.addEventListener("click", async () => {
    if (selectedAnswerIndex === null) {
      setQuizStatus("Pick an answer first.");
      return;
    }

    const q = state.questions[state.idx];
    submitted = true;
    clearTimers(); // stop timer when user submits manually
    submitBtn.disabled = true;

    setQuizStatus("Submitting answer…");

    try {
      const playerName = state.active_player || state.players[0] || "Player";

      const resp = await apiRequest(`/game/${encodeURIComponent(state.game_id)}/submit`, {
        method: "POST",
        body: {
          question_id: q.id,
          answer_index: selectedAnswerIndex,
          player: playerName,
          currTime: currentTimeRemaining
        }
      });

      if (resp.is_correct === true) setQuizStatus("Correct ✅");
      else setQuizStatus(`Wrong ❌ (Correct: ${resp.correct_text})`);

      nextBtn.disabled = false;
    } catch (err) {
      submitted = false;
      submitBtn.disabled = false;
      setQuizStatus(`Submit failed: ${err.message}`);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (!submitted) {
      setQuizStatus("Submit before Next.");
      return;
    }

    clearTimers();

    state.idx += 1;
    saveState(state);

    if (state.idx >= state.questions.length) {
      window.location.href = "./results.html";
      return;
    }

    renderQuestion();
  });

  // syncFromSession first so question_time and buffer_enabled are loaded
  (async () => {
    try {
      await syncFromSession();
      await loadQuestionsIfNeeded();
      renderQuestion();
    } catch (err) {
      questionText.textContent = "Could not load questions.";
      setQuizStatus(`Error: ${err.message}`);
    }
  })();
}

/* =========================================================
   PAGE: Results (frontend/results.html)
========================================================= */
function initResults() {
  const statusEl = $("resultsStatus");
  const backBtn = $("backToLobbyBtn");

  if (!statusEl && !backBtn) return;

  const state = loadState() || defaultState();
  const player = state.active_player || (state.players && state.players[0]) || "Player";

  const clampPercent = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(n, 100));
  };

  const setBarWidth = (id, pct) => {
    const el = $(id);
    if (el && el.style) el.style.width = `${clampPercent(pct)}%`;
  };

  async function loadResults() {
    if (statusEl) statusEl.textContent = "Loading results…";

    try {
      const data = await apiRequest(`/results/${encodeURIComponent(player)}`, { method: "GET" });

      const correct = Number(data.correct ?? 0);
      const wrong = Number(data.wrong ?? 0);
      const score = Number(data.final_score ?? data.score ?? 0);
      const total = correct + wrong;
      const accuracyPct = total > 0 ? (correct / total) * 100 : 0;

      setText("correctCount", Number.isFinite(correct) ? String(correct) : "—");
      setText("wrongCount", Number.isFinite(wrong) ? String(wrong) : "—");
      setText("scorePoints", Number.isFinite(score) ? String(score) : "—");

      // Visual meter fills; safe no-ops if the elements are absent.
      setBarWidth("scoreBar", score);
      setBarWidth("barAccuracy", accuracyPct);
      setBarWidth("barSpeed", data.speed_pct ?? 60);          // optional backend field or placeholder
      setBarWidth("barConsistency", data.consistency_pct ?? 60);

      if (statusEl) statusEl.textContent = `Results loaded for ${player}.`;
    } catch (err) {
      if (statusEl) statusEl.textContent = `Could not load results: ${err.message}`;
    }
  }

  backBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    clearState();
    window.location.href = "./index.html";
  });

  loadResults();
}

/* =========================================================
   BOOTSTRAP
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // I detect pages by their unique elements so I don't depend on data-page everywhere.
  if ($("createBtn") || $("joinBtn")) initLobby();
  if ($("hostStartBtn")) initHost();
  if ($("playerCheckBtn")) initPlayer();
  if ($("questionText") && $("answers")) initQuiz();
  if ($("backToLobbyBtn") || $("resultsStatus")) initResults();
});

