/**
 * Cortex Trivia — Frontend Integration (Sprint 2 + Sprint 3)
 *
 * Jose Rodriguez (me):
 * - I’m keeping the existing Sprint 2 demo flow stable (Lobby → Quiz → Results).
 * - I’m adding Sprint 3 scaffolding (Host page + Player page) without rewriting what already works.
 *
 * Why I’m doing it this way:
 * - I want the UI to be testable at every step (no “big bang” refactor right before a demo).
 * - I want the backend contract to be flexible while teammates iterate (support old + new endpoints).
 */

const API_BASE = "http://127.0.0.1:5000";

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
    idx: 0                 // current question index
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
   IDs used:
   - createName, bankSelect, createBtn
   - joinCode, joinName, joinBtn
   - sessionCode, playerList, statusText
   - startBtn, leaveBtn (legacy demo buttons; we keep them safe)
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

    // I reset state so a previous game_id doesn’t leak into a new session.
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
   IDs used:
   - hostSessionCode, hostBank, hostPlayers, hostStatus
   - hostStartBtn, hostBackBtn, copyCodeBtn
========================================================= */
function initHost() {
  if (!$("hostStartBtn")) return;

  let state = loadState() || defaultState();

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
  }

  async function refreshSession() {
    // I poll session state so the host can see players join (Sprint 3 direction).
    try {
      const resp = await tryGet([`/session/${encodeURIComponent(state.session_code)}`]);

      // Normalize into state (don’t assume backend field names).
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
      // Preferred (Sprint 3): /session/<code>/start
      // Fallback: /start
      let resp = null;

      try {
        resp = await tryPost(
          [`/session/${encodeURIComponent(state.session_code)}/start`],
          {}
        );
      } catch {
        resp = await tryPost(
          ["/start"],
          {
            session_code: state.session_code,
            players: state.players,
            bank_id: state.bank_id
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
      // Host does NOT auto-open quiz; host is a “monitor” page by design.
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
   IDs used:
   - playerSessionCode, playerName, playerStatus
   - playerCheckBtn, playerOpenQuizBtn, playerBackBtn
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
   This keeps your Sprint 2 behavior:
   - game_id must exist
   - fetch questions
   - submit answer
   - next question
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

  const QUESTION_TIME = 30; // seconds per question
  const BUFFER_TIME = 5;
  let interval = null;       // stores setInterval for countdown display
  let currentTimeRemaining = QUESTION_TIME;
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

    q.choices.forEach((choiceText, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer";
      btn.textContent = choiceText;

      btn.addEventListener("click", () => {
        if (submitted) return;

        selectedAnswerIndex = i;

        Array.from(answersEl.querySelectorAll("button.answer")).forEach((b) => {
          b.classList.remove("selected");
        });

        btn.classList.add("selected");

        submitBtn.disabled = false;
        setQuizStatus("Selection ready. Press Submit.");
      });

      answersEl.appendChild(btn);
    });

    // BUFFER: hide answers for 5 seconds
    answersEl.style.visibility = "hidden";

    submitBtn.disabled = true;
    nextBtn.disabled = true;
    setQuizStatus("Get ready...");

    // --- BUFFER TIMER FIRST ---
    let bufferRemaining = BUFFER_TIME;

    if (timerEl) timerEl.textContent = ` ${bufferRemaining}`;
    bufferInterval = setInterval(() => {

      bufferRemaining--;
      
      if (timerEl) timerEl.textContent = ` ${bufferRemaining}`;

      if (bufferRemaining <= 0){
        clearInterval(bufferInterval);

        answersEl.style.visibility = "visible";
        setQuizStatus("Pick an answer.");
      
    
        // --- START TIMER ---
        let remaining = QUESTION_TIME;
        currentTimeRemaining = QUESTION_TIME;

        if (timerEl) timerEl.textContent = ` ${QUESTION_TIME}`;

        interval = setInterval(async () => {

          remaining = Math.max(remaining - 1, 0);
          currentTimeRemaining = remaining;

          if (timerEl) timerEl.textContent = ` ${remaining}`;

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
    }, 1000);
  }
  
  async function loadQuestionsIfNeeded() {
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
    clearTimers(); // <-- STOP timer when user submits
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

    clearTimers(); // clear previous timer before loading next question

    state.idx += 1;
    saveState(state);

    if (state.idx >= state.questions.length) {
      window.location.href = "./results.html";
      return;
    }

    renderQuestion();
  });

  (async () => {
    try {
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

  async function loadResults() {
    if (statusEl) statusEl.textContent = "Loading results…";

    try {
      const data = await apiRequest(`/results/${encodeURIComponent(player)}`, { method: "GET" });

      setText("correctCount", String(data.correct ?? "—"));
      setText("wrongCount", String(data.wrong ?? "—"));
      setText("scorePoints", String(data.final_score ?? "—"));

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

