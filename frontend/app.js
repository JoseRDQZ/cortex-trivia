/**
 * Cortex Trivia — Full Integration Frontend (Sprint 2)
 *
 * Jose Rodriguez (me):
 * - For demo readiness, I’m wiring the frontend to Daniel’s backend routes.
 * - I’m keeping the logic simple and testable:
 *   Lobby -> Start game -> Quiz -> Results -> Lobby
 *
 * Ownership notes:
 * - Daniel owns backend session + question delivery routes.
 * - Renier owns scoring persistence and result calculations.
 * - I’m only wiring UI + API calls here.
 */

const API_BASE = "http://127.0.0.1:5000";

// I store demo state in sessionStorage so each browser window can act as a different “player”.
const STORAGE_KEY = "cortex_demo_state_v1";

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

function $(id) {
  return document.getElementById(id);
}

function setText(id, txt) {
  const el = $(id);
  if (el) el.textContent = txt;
}

function makeSessionCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return out;
}

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // If fetch fails at network level, this throws before we get here.
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`.trim());
  }

  return res.json();
}

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`.trim());
  }
  return res.json();
}

/* -----------------------------
   Lobby
------------------------------ */

function initLobby() {
  const createName = $("createName");
  const createBtn = $("createBtn");

  const joinCode = $("joinCode");
  const joinName = $("joinName");
  const joinBtn = $("joinBtn");

  const leaveBtn = $("leaveBtn");
  const startBtn = $("startBtn");

  const sessionCodeEl = $("sessionCode");
  const playerListEl = $("playerList");
  const statusText = $("statusText");

  // Jose: single local state model for the lobby page.
  let state =
    loadState() ||
    {
      session_code: "",
      players: [],
      // Jose: “active_player” is who this browser window represents for submits/results.
      active_player: "",
      game_id: "",
      // Jose: cache questions on the client only for UI navigation.
      questions: [],
      idx: 0,
    };

  function persist() {
    saveState(state);
  }

  function setStatus(msg) {
    if (statusText) statusText.textContent = msg;
  }

  function render() {
    setText("sessionCode", state.session_code || "—");
    setText("playerList", state.players.length ? state.players.join(", ") : "—");

    // Jose: I allow clicking everything; status text guides the user.
    if (!state.session_code) setStatus("Create or Join a session to begin.");
    else setStatus(`Session ready (${state.session_code}). Press Start Game to create backend game.`);
  }

  // Create
  createBtn?.addEventListener("click", (e) => {
    e.preventDefault();

    const host = (createName?.value || "").trim() || "Host";
    state.session_code = makeSessionCode();
    state.players = [host];
    state.active_player = host;

    // Reset any previous run
    state.game_id = "";
    state.questions = [];
    state.idx = 0;

    // Convenience: copy the code into join box for quick testing
    if (joinCode) joinCode.value = state.session_code;

    persist();
    render();
    setStatus(`Created session ${state.session_code} as ${host}.`);
  });

  // Join
  joinBtn?.addEventListener("click", (e) => {
    e.preventDefault();

    const code = (joinCode?.value || "").trim().toUpperCase();
    const player = (joinName?.value || "").trim() || "Player";

    if (!code) {
      setStatus("Enter a session code to join.");
      return;
    }

    state.session_code = code;

    if (!state.players.includes(player)) state.players.push(player);
    state.active_player = player;

    // Reset run state (joining should not reuse an old game_id)
    state.game_id = "";
    state.questions = [];
    state.idx = 0;

    persist();
    render();
    setStatus(`Joined session ${state.session_code} as ${player}.`);
  });

  // Leave
  leaveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    clearState();
    state = {
      session_code: "",
      players: [],
      active_player: "",
      game_id: "",
      questions: [],
      idx: 0,
    };
    render();
    setStatus("Left session.");
  });

  // Start Game (backend)
  startBtn?.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!state.session_code) {
      setStatus("Create or Join a session first.");
      return;
    }
    if (!state.players.length) {
      setStatus("You need at least one player to start.");
      return;
    }

    setStatus("Starting game via backend…");

    try {
      // Daniel’s backend expects: { session_code, players }
      const data = await postJson("/start", {
        session_code: state.session_code,
        players: state.players,
      });

      if (!data.game_id) {
        throw new Error("Backend did not return game_id.");
      }

      state.game_id = data.game_id;

      // Reset quiz progress
      state.questions = [];
      state.idx = 0;

      persist();
      setStatus("Game created. Opening quiz…");
      window.location.href = "./quiz.html";
    } catch (err) {
      console.error(err);
      setStatus(`Start failed: ${err.message}`);
    }
  });

  render();
}

/* -----------------------------
   Quiz
------------------------------ */

function initQuiz() {
  const questionText = $("questionText");
  const answersEl = $("answers");
  const statusEl = $("quizStatus");
  const progressPill = $("progressPill");
  const submitBtn = $("submitBtn");
  const nextBtn = $("nextBtn");
  const timerEl = $("timer"); // optional element to show countdown

  const QUESTION_TIME = 30; // seconds per question
  let interval = null;       // stores setInterval for countdown display


  // Disable until wired
  submitBtn.disabled = true;
  nextBtn.disabled = true;

  let state = loadState();

  // Jose: guard against direct navigation without starting a game.
  if (!state || !state.game_id) {
    setText("questionText", "No active game found.");
    setText("quizStatus", "Go back to the Lobby and press Start Game first.");
    return;
  }

  let selectedAnswerIndex = null;
  let submitted = false;

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function clearTimers() {
    if (interval) clearInterval(interval);
    interval = null;
  }

  function renderQuestion() {
    clearTimers();
    const q = state.questions[state.idx];
    if (!q) return;

    selectedAnswerIndex = null;
    submitted = false;

    setText("progressPill", `Question ${state.idx + 1} / ${state.questions.length}`);
    setText("questionText", q.question);

    answersEl.innerHTML = "";

    q.choices.forEach((choiceText, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer";
      btn.textContent = choiceText;

      btn.addEventListener("click", () => {
        if (submitted) return;

        selectedAnswerIndex = i;

        // Clear selection
        Array.from(answersEl.querySelectorAll("button.answer")).forEach((b) =>
          b.classList.remove("selected")
        );
        btn.classList.add("selected");

        submitBtn.disabled = false;
        setStatus("Selection ready. Press Submit.");
      });

      answersEl.appendChild(btn);
    });

    submitBtn.disabled = true;
    nextBtn.disabled = true;
    setStatus("Pick an answer.");


    // --- START TIMER ---
    // Start countdown for current question
    let remaining = QUESTION_TIME;
    if (timerEl) timerEl.textContent = ` ${QUESTION_TIME}`;

    interval = setInterval(async () => {
    remaining = Math.max(remaining - 1, 0);

    if (timerEl) timerEl.textContent = ` ${remaining}`;

    if (remaining === 0) {
      clearInterval(interval);

     if (!submitted) {
        submitted = true;
       submitBtn.disabled = true;

       setStatus("Time's up! Auto-submitting...");

       const q = state.questions[state.idx];

       try {
         const resp = await postJson(
            `/game/${encodeURIComponent(state.game_id)}/submit`,
           {
              question_id: q.id,
              answer_index: selectedAnswerIndex ?? -1,
             player: state.active_player || state.players[0] || "Player",
            }
          );

          if (resp.is_correct === true) {
           setStatus("Correct ✅");
          } else {
           setStatus(`Wrong ❌ (Correct: ${resp.correct_text})`);
          }

         nextBtn.disabled = false;

        } catch (err) {
          console.error(err);
          setStatus(`Auto-submit failed: ${err.message}`);
          submitted = false;
         submitBtn.disabled = false;
        }
      }
    }
  }, 1000);
}

  async function loadQuestionsIfNeeded() {
    if (Array.isArray(state.questions) && state.questions.length === 10) return;

    setStatus("Fetching questions from backend…");

    // Daniel’s backend provides /game/<game_id>/questions
    const data = await getJson(`/game/${encodeURIComponent(state.game_id)}/questions`);

    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error("Backend returned invalid questions payload.");
    }

    // Jose: clamp to 10 to match Sprint 2 demo.
    state.questions = data.questions.slice(0, 10);
    state.idx = 0;

    saveState(state);
  }

  submitBtn.addEventListener("click", async () => {
    if (selectedAnswerIndex === null) {
      setStatus("Pick an answer first.");
      return;
    }

    const q = state.questions[state.idx];
    submitted = true;
    clearTimers(); // <-- STOP timer when user submits
    submitBtn.disabled = true;

    setStatus("Submitting answer…");

    try {
      // Daniel’s backend expects: { question_id, answer_index, player }
      const resp = await postJson(`/game/${encodeURIComponent(state.game_id)}/submit`, {
        question_id: q.id,
        answer_index: selectedAnswerIndex,
        player: state.active_player || state.players[0] || "Player",
      });

      // Jose: feedback only; scoring is handled server-side by Renier’s scoring module.
      if (resp.is_correct === true) setStatus("Correct ✅");
      else setStatus(`Wrong ❌ (Correct: ${resp.correct_text})`);

      nextBtn.disabled = false;
    } catch (err) {
      console.error(err);
      setStatus(`Submit failed: ${err.message}`);
      // Allow retry
      submitted = false;
      submitBtn.disabled = false;
    }
  });

  nextBtn.addEventListener("click", () => {
    if (!submitted) {
      setStatus("Submit before Next.");
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
      console.error(err);
      setText("questionText", "Could not load questions.");
      setStatus(`Error: ${err.message}`);
    }
  })();
}

/* -----------------------------
   Results
------------------------------ */

function initResults() {
  const correctEl = $("correctCount");
  const wrongEl = $("wrongCount");
  const scoreEl = $("scorePoints");
  const statusEl = $("resultsStatus");
  const backBtn = $("backToLobbyBtn");

  const state = loadState();

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  if (!state) {
    setStatus("No session state found. Go back to the Lobby.");
    return;
  }

  const player = state.active_player || state.players?.[0] || "Player";

  (async () => {
    setStatus("Loading results from backend…");

    try {
      const data = await getJson(`/results/${encodeURIComponent(player)}`);

      // Jose: backend response fields are correct/wrong/final_score
      setText("correctCount", String(data.correct ?? "—"));
      setText("wrongCount", String(data.wrong ?? "—"));
      setText("scorePoints", String(data.final_score ?? "—"));

      setStatus(`Results loaded for ${player}.`);
    } catch (err) {
      console.error(err);
      setStatus(`Could not load results: ${err.message}`);
    }
  })();

  backBtn?.addEventListener("click", (e) => {
    e.preventDefault();

    // Jose: I clear only run-specific state so you can start a new demo cleanly.
    clearState();
    window.location.href = "./index.html";
  });
}

/* -----------------------------
   Boot
------------------------------ */

(function boot() {
  const page = document.body?.dataset?.page || "";

  if (page === "lobby") initLobby();
  if (page === "quiz") initQuiz();
  if (page === "results") initResults();
})();
