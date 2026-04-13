/**
 * Cortex Trivia — Sprint 6 - 7
 */

const API_BASE = "";

// I store state in sessionStorage so each browser window can act independently (host vs player).
const STORAGE_KEY = "cortex_demo_state_v3";

// ==========================================================
// Sprint 5 scoring assumptions for frontend-side fallbacks
// ==========================================================
const DEFAULT_QUESTION_TIME = 30;
const DEFAULT_QUESTIONS_PER_GAME = 10;
const DEFAULT_MAX_POINTS_PER_QUESTION = 10;
const DEFAULT_MAX_TOTAL_SCORE = DEFAULT_QUESTIONS_PER_GAME * DEFAULT_MAX_POINTS_PER_QUESTION;

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
    role: "",                 // "host" | "player"
    session_code: "",         // short code
    bank_id: "cs",            // category / question bank id
    players: [],              // list of players (host page mainly)
    active_player: "",        // current player name (player page / quiz)
    game_id: "",              // backend game id
    questions: [],            // cached question set
    idx: 0,                   // current question index
    question_time: 30,        // host-customizable seconds per question
    buffer_enabled: true,     // host-customizable buffer toggle

    // ======================================================
    // Sprint 5 metrics block
    // ======================================================
    metrics: {
      question_count: 0,
      max_points_per_question: DEFAULT_MAX_POINTS_PER_QUESTION,
      max_total_score: DEFAULT_MAX_TOTAL_SCORE,
      attempts: []            // per-question results collected during quiz
    }
  };
}

function ensureMetrics(state) {
  if (!state.metrics || typeof state.metrics !== "object") {
    state.metrics = {
      question_count: 0,
      max_points_per_question: DEFAULT_MAX_POINTS_PER_QUESTION,
      max_total_score: DEFAULT_MAX_TOTAL_SCORE,
      attempts: []
    };
  }

  if (!Array.isArray(state.metrics.attempts)) {
    state.metrics.attempts = [];
  }

  if (!state.metrics.max_points_per_question) {
    state.metrics.max_points_per_question = DEFAULT_MAX_POINTS_PER_QUESTION;
  }

  if (!state.metrics.question_count) {
    state.metrics.question_count = Array.isArray(state.questions) ? state.questions.length : 0;
  }

  state.metrics.max_total_score =
    (state.metrics.question_count || DEFAULT_QUESTIONS_PER_GAME) *
    (state.metrics.max_points_per_question || DEFAULT_MAX_POINTS_PER_QUESTION);

  return state;
}

function resetMetricsForNewGame(state) {
  state.metrics = {
    question_count: 0,
    max_points_per_question: DEFAULT_MAX_POINTS_PER_QUESTION,
    max_total_score: DEFAULT_MAX_TOTAL_SCORE,
    attempts: []
  };
  return state;
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

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function formatPercent(v) {
  if (!Number.isFinite(v)) return "—";
  return `${round2(v)}%`;
}

function formatSeconds(v) {
  if (!Number.isFinite(v)) return "—";
  return `${round2(v)}s`;
}

function formatRatio(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "—";
  return `${round2(a)} / ${round2(b)}`;
}

function capitalizeCategory(bankId) {
  const map = {
    cs: "Computer Science",
    cybersec: "Cybersecurity",
    it: "Information Technology",
    datasci: "Data Science"
  };
  return map[bankId] || bankId || "—";
}

function getPerformanceRating(scorePercent) {
  if (!Number.isFinite(scorePercent)) return "—";
  if (scorePercent >= 90) return "Excellent";
  if (scorePercent >= 75) return "Strong";
  if (scorePercent >= 60) return "Good";
  if (scorePercent >= 40) return "Developing";
  return "Needs Improvement";
}

function recordQuestionMetric(state, payload) {
  state = ensureMetrics(state);

  const questionId = payload.question_id ?? `q-${payload.question_index ?? state.idx}`;
  const attempts = state.metrics.attempts;

  const existingIndex = attempts.findIndex((a) => String(a.question_id) === String(questionId));

  const normalized = {
    question_id: questionId,
    question_index: safeNumber(payload.question_index, state.idx),
    selected_answer_index: payload.selected_answer_index,
    is_correct: !!payload.is_correct,
    unanswered: !!payload.unanswered,
    response_time: safeNumber(payload.response_time, 0),
    time_remaining: safeNumber(payload.time_remaining, 0),
    question_time: safeNumber(payload.question_time, state.question_time || DEFAULT_QUESTION_TIME),
    multiplier: safeNumber(payload.multiplier, NaN),
    points_awarded: safeNumber(payload.points_awarded, NaN),
    points_lost: safeNumber(payload.points_lost, NaN),
    max_points: safeNumber(payload.max_points, state.metrics.max_points_per_question || DEFAULT_MAX_POINTS_PER_QUESTION)
  };

  if (existingIndex >= 0) attempts[existingIndex] = normalized;
  else attempts.push(normalized);

  state.metrics.question_count = Math.max(
    state.metrics.question_count || 0,
    Array.isArray(state.questions) ? state.questions.length : 0,
    attempts.length
  );

  state.metrics.max_total_score =
    (state.metrics.question_count || DEFAULT_QUESTIONS_PER_GAME) *
    (state.metrics.max_points_per_question || DEFAULT_MAX_POINTS_PER_QUESTION);

  return state;
}

function calculateLocalResultsMetrics(state, backendData = {}) {
  state = ensureMetrics(state);

  const attempts = Array.isArray(state.metrics.attempts) ? state.metrics.attempts : [];
  const questionCount =
    safeNumber(backendData.question_count, 0) ||
    state.metrics.question_count ||
    (Array.isArray(state.questions) ? state.questions.length : 0) ||
    DEFAULT_QUESTIONS_PER_GAME;

  const correct =
    safeNumber(backendData.correct, NaN) ||
    attempts.filter((a) => a.is_correct).length;

  const wrong =
    Number.isFinite(Number(backendData.wrong))
      ? Number(backendData.wrong)
      : attempts.filter((a) => !a.is_correct && !a.unanswered).length;

  const unanswered =
    Number.isFinite(Number(backendData.unanswered))
      ? Number(backendData.unanswered)
      : Math.max(questionCount - correct - wrong, attempts.filter((a) => a.unanswered).length);

  const answered =
    Number.isFinite(Number(backendData.answered))
      ? Number(backendData.answered)
      : correct + wrong;

  const accuracyPercent =
    answered > 0 ? round2((correct / answered) * 100) : 0;

  const maxPointsPerQuestion =
    safeNumber(backendData.max_points_per_question, 0) ||
    state.metrics.max_points_per_question ||
    DEFAULT_MAX_POINTS_PER_QUESTION;

  const maxScore =
    safeNumber(backendData.max_score, 0) ||
    safeNumber(backendData.maximum_possible, 0) ||
    questionCount * maxPointsPerQuestion;

  const pointsEarnedFromAttempts = attempts.reduce((sum, a) => {
    if (Number.isFinite(a.points_awarded)) return sum + a.points_awarded;
    if (a.is_correct) return sum + maxPointsPerQuestion;
    return sum;
  }, 0);

  const finalScore =
    safeNumber(backendData.final_score, NaN) ||
    safeNumber(backendData.score, NaN) ||
    pointsEarnedFromAttempts ||
    0;

  const pointsEarned =
    safeNumber(backendData.points_earned, NaN) ||
    pointsEarnedFromAttempts ||
    finalScore;

  const pointsLostFromAttempts = attempts.reduce((sum, a) => {
    if (Number.isFinite(a.points_lost)) return sum + a.points_lost;
    if (a.is_correct) {
      const awarded = Number.isFinite(a.points_awarded) ? a.points_awarded : maxPointsPerQuestion;
      return sum + Math.max(maxPointsPerQuestion - awarded, 0);
    }
    return sum;
  }, 0);

  const pointsLost =
    safeNumber(backendData.points_lost, NaN) ||
    pointsLostFromAttempts ||
    Math.max(maxScore - pointsEarned, 0);

  const timedAttempts = attempts.filter((a) => Number.isFinite(a.response_time));
  const avgResponseTime =
    timedAttempts.length > 0
      ? round2(timedAttempts.reduce((sum, a) => sum + a.response_time, 0) / timedAttempts.length)
      : NaN;

  const correctTimedAttempts = attempts.filter(
    (a) => a.is_correct && Number.isFinite(a.response_time)
  );

  const fastestCorrectTime =
    correctTimedAttempts.length > 0
      ? Math.min(...correctTimedAttempts.map((a) => a.response_time))
      : NaN;

  const slowestCorrectTime =
    correctTimedAttempts.length > 0
      ? Math.max(...correctTimedAttempts.map((a) => a.response_time))
      : NaN;

  const multipliers = attempts
    .map((a) => a.multiplier)
    .filter((m) => Number.isFinite(m));

  const avgMultiplier =
    multipliers.length > 0
      ? round2(multipliers.reduce((sum, m) => sum + m, 0) / multipliers.length)
      : NaN;

  const scorePercent =
    maxScore > 0 ? round2((finalScore / maxScore) * 100) : 0;

  return {
    player_name: backendData.player_name || state.active_player || "Player",
    category: backendData.category || capitalizeCategory(state.bank_id),
    session_code: backendData.session_code || state.session_code || "—",

    correct,
    wrong,
    unanswered,
    answered,
    question_count: questionCount,
    accuracy_percent: accuracyPercent,

    final_score: round2(finalScore),
    max_score: round2(maxScore),
    points_earned: round2(pointsEarned),
    points_lost: round2(pointsLost),
    score_percent: scorePercent,

    avg_response_time: avgResponseTime,
    fastest_correct_time: fastestCorrectTime,
    slowest_correct_time: slowestCorrectTime,
    avg_multiplier: avgMultiplier,

    performance_rating:
      backendData.performance_rating || getPerformanceRating(scorePercent)
  };
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

  let state = ensureMetrics(loadState() || defaultState());

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
    state = resetMetricsForNewGame(defaultState());
    state.role = "host";
    state.active_player = hostName;
    state.bank_id = bankId;

    try {
      const resp = await tryPost(
        ["/session/create", "/create"],
        { host: hostName, host_name: hostName, bank_id: bankId, bank: bankId }
      );

      const code = resp.session_code || resp.code || makeSessionCode();
      state.session_code = String(code).toUpperCase();
      state.players = resp.players || [hostName];

      saveState(state);
      render();

      setStatus("statusText", `Session created: ${state.session_code}. Sending host to dashboard…`);
      window.location.href = "./host.html";
    } catch (err) {
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

    state = resetMetricsForNewGame(defaultState());
    state.role = "player";
    state.session_code = code;
    state.active_player = playerName;

    try {
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
      state.players = [playerName];
      saveState(state);
      render();
      setStatus("statusText", `Backend join failed (${err.message}). Opening waiting room anyway…`);
      window.location.href = "./player.html";
    }
  });

  startBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    setStatus("statusText", "Sprint 3: start the game from the Host page.");
  });

  leaveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    clearState();
    state = ensureMetrics(defaultState());
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

  let state = ensureMetrics(loadState() || defaultState());

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
    syncControlUI();
  }

  async function refreshSession() {
    try {
      const resp = await tryGet([`/session/${encodeURIComponent(state.session_code)}`]);

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
        resp = await tryPost(
          [`/session/${encodeURIComponent(state.session_code)}/start`],
          {
            question_time: state.question_time,
            buffer_enabled: state.buffer_enabled
          }
        );
      } catch {
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
      state = resetMetricsForNewGame(state);

      saveState(state);
      render();

      setStatus("hostStatus", `Game started (game_id: ${gameId}).`);
    } catch (err) {
      setStatus("hostStatus", `Start failed: ${err.message}`);
    }
  });

  render();
  refreshSession();
  setInterval(refreshSession, 1500);
}

/* =========================================================
   PAGE: Player (frontend/player.html)
========================================================= */
function initPlayer() {
  if (!$("playerCheckBtn")) return;

  let state = ensureMetrics(loadState() || defaultState());

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
  const questionText = $("questionText");
  const answersEl = $("answers");
  const statusEl = $("quizStatus");
  const progressPill = $("progressPill");
  const submitBtn = $("submitBtn");
  const nextBtn = $("nextBtn");
  const timerEl = $("timer");

  let interval = null;
  let currentTimeRemaining = 0;
  let bufferInterval = null;

  if (!questionText || !answersEl || !statusEl || !progressPill || !submitBtn || !nextBtn) return;

  let state = ensureMetrics(loadState() || defaultState());

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

        selectedAnswerIndex = idx;

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
            const questionTimeValue = state.question_time || DEFAULT_QUESTION_TIME;
            const responseTime = questionTimeValue - currentTimeRemaining;

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

              state = recordQuestionMetric(state, {
                question_id: q.id,
                question_index: state.idx,
                selected_answer_index: selectedAnswerIndex ?? -1,
                is_correct: resp.is_correct === true,
                unanswered: selectedAnswerIndex === null,
                response_time: responseTime,
                time_remaining: currentTimeRemaining,
                question_time: questionTimeValue,
                multiplier: resp.multiplier,
                points_awarded: resp.points_awarded ?? resp.score_awarded,
                points_lost: resp.points_lost,
                max_points: resp.max_points
              });

              saveState(state);

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

    state = ensureMetrics(state);
    saveState(state);
  }

  async function loadQuestionsIfNeeded() {
    const latest = loadState();
    if (latest) state = ensureMetrics(latest);

    if (!state.game_id) {
      throw new Error("Missing game_id. Game was not started properly.");
    }

    if (Array.isArray(state.questions) && state.questions.length > 0) {
      state.metrics.question_count = state.questions.length;
      state.metrics.max_total_score =
        state.metrics.question_count * state.metrics.max_points_per_question;
      saveState(state);
      return;
    }

    setQuizStatus("Fetching questions from backend…");

    const data = await apiRequest(`/game/${encodeURIComponent(state.game_id)}/questions`, { method: "GET" });

    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error("Backend returned invalid questions payload.");
    }

    state.questions = data.questions.slice(0, 10);
    state.idx = 0;
    state.metrics.question_count = state.questions.length;
    state.metrics.max_total_score =
      state.metrics.question_count * state.metrics.max_points_per_question;

    saveState(state);
  }

  submitBtn.addEventListener("click", async () => {
    if (selectedAnswerIndex === null) {
      setQuizStatus("Pick an answer first.");
      return;
    }

    const q = state.questions[state.idx];
    const questionTimeValue = state.question_time || DEFAULT_QUESTION_TIME;
    const responseTime = questionTimeValue - currentTimeRemaining;

    submitted = true;
    clearTimers();
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

      state = recordQuestionMetric(state, {
        question_id: q.id,
        question_index: state.idx,
        selected_answer_index: selectedAnswerIndex,
        is_correct: resp.is_correct === true,
        unanswered: false,
        response_time: responseTime,
        time_remaining: currentTimeRemaining,
        question_time: questionTimeValue,
        multiplier: resp.multiplier,
        points_awarded: resp.points_awarded ?? resp.score_awarded,
        points_lost: resp.points_lost,
        max_points: resp.max_points
      });

      saveState(state);

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

  let state = ensureMetrics(loadState() || defaultState());
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

    let backendData = {};

    try {
      backendData = await apiRequest(`/results/${encodeURIComponent(player)}`, { method: "GET" });
    } catch (err) {
      // I do not fail the page if backend results are limited or unavailable.
      backendData = {};
      if (statusEl) {
        statusEl.textContent = `Backend results limited (${err.message}). Showing local metrics…`;
      }
    }

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

    if (statusEl) {
      statusEl.textContent = `Results loaded for ${player}.`;
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
  if ($("createBtn") || $("joinBtn")) initLobby();
  if ($("hostStartBtn")) initHost();
  if ($("playerCheckBtn")) initPlayer();
  if ($("questionText") && $("answers")) initQuiz();
  if ($("backToLobbyBtn") || $("resultsStatus")) initResults();
});

