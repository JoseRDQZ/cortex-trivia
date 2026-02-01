/**
 * Cortex Trivia — Sprint 2 Demo (Team Boundaries)
 *
 * Why this file exists:
 * - My job is to prove the quiz page can render a real question set from our seed data,
 *   and that the quiz can move through 10 unique questions without repeats.
 *
 * What I’m intentionally NOT doing here:
 * - I’m not implementing scoring, correctness checks, or button-driven gameplay.
 *   Those behaviors belong to the teammate owning scoring + button wiring.
 *
 * Why auto-advance is used:
 * - I still need the quiz to progress “one-by-one” for the demo, but I don’t want to
 *   steal the scoring/button work. Auto-advancing lets me demonstrate the UI flow
 *   while keeping ownership boundaries clear.
 */

const page = document.body?.dataset?.page || "";
const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "ct_demo_quiz_v1";

// I’m using sessionStorage so the chosen 10-question set stays consistent if the page refreshes mid-demo.
function saveQuizState(state) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadQuizState() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// I clear quiz state on results so the next run is a fresh randomized set.
function clearQuizState() {
  sessionStorage.removeItem(STORAGE_KEY);
}

// I shuffle to get a fair random sampling without needing “used question” bookkeeping for this demo scope.
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// I fetch from /db via relative path because quiz.html lives in /frontend.
async function fetchQuestionBank() {
  const res = await fetch("../db/questions.seed.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load questions.seed.json (${res.status})`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("questions.seed.json must be an array.");
  return data;
}

// I pick 10 by shuffling and slicing so each question is unique within a single run (no repeats in the quiz).
function buildQuizSet(questionBank) {
  const picked = shuffleInPlace([...questionBank]).slice(0, 10);

  return {
    idx: 0,
    questions: picked,
    startedAt: Date.now(),
  };
}

function setText(el, txt) {
  if (el) el.textContent = txt;
}

// -------------------- LOBBY (index.html) --------------------
function initLobby() {
  // I’m leaving lobby wiring empty on purpose. Session create/join/start is owned by another teammate.
  // This page should remain stable so they can attach their handlers to the existing element IDs.
}

// -------------------- QUIZ (quiz.html) --------------------
function initQuiz() {
  const questionText = $("questionText");
  const answersEl = $("answers");
  const statusEl = $("quizStatus");
  const progressPill = $("progressPill");
  const timerPill = $("timerPill");

  const submitBtn = $("submitBtn");
  const nextBtn = $("nextBtn");

  // I’m disabling these controls because scoring + button-driven progression is out of my scope.
  if (submitBtn) submitBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;

  // I keep the timer short to make the “10 questions” flow visible in a quick demo run.
  const QUESTION_SECONDS = 6;
  let timerId = null;
  let secondsLeft = QUESTION_SECONDS;

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function startTimer(onExpired) {
    stopTimer();
    secondsLeft = QUESTION_SECONDS;
    setText(timerPill, `Auto-next in: ${secondsLeft}s`);

    timerId = setInterval(() => {
      secondsLeft -= 1;
      setText(timerPill, `Auto-next in: ${secondsLeft}s`);
      if (secondsLeft <= 0) {
        stopTimer();
        onExpired();
      }
    }, 1000);
  }

  function renderQuestion(state) {
    const q = state.questions[state.idx];
    if (!q) return;

    setText(progressPill, `Question ${state.idx + 1} / 10`);
    setText(questionText, q.question);

    // I render answers as disabled buttons to show the intended UI without taking ownership of selection logic.
    answersEl.innerHTML = "";
    q.choices.forEach((choiceText) => {
      const btn = document.createElement("button");
      btn.className = "answer";
      btn.type = "button";
      btn.disabled = true;
      btn.textContent = choiceText;
      answersEl.appendChild(btn);
    });

    setText(
      statusEl,
      "Demo: questions are randomized with no repeats. Submit/Next/scoring will be implemented by the scoring owner."
    );

    startTimer(() => advance(state));
  }

  function advance(state) {
    state.idx += 1;
    saveQuizState(state);

    if (state.idx >= 10) {
      // I navigate after 10 questions to match the intended website flow while staying out of scoring logic.
      window.location.href = "./results.html";
      return;
    }

    renderQuestion(state);
  }

  (async () => {
    setText(statusEl, "Fetching question bank…");

    let state = loadQuizState();
    if (!state) {
      const bank = await fetchQuestionBank();
      state = buildQuizSet(bank);
      saveQuizState(state);
    }

    renderQuestion(state);
  })().catch((err) => {
    console.error(err);
    setText(statusEl, `Error: ${err.message}`);
    setText(questionText, "Could not load questions.");
    stopTimer();
  });

  window.addEventListener("beforeunload", () => stopTimer());
}

// -------------------- RESULTS (results.html) --------------------
function initResults() {
  // I clear quiz state here so each new run starts with a fresh randomized set of questions.
  clearQuizState();
}

// -------------------- BOOT --------------------
if (page === "lobby") initLobby();
if (page === "quiz") initQuiz();
if (page === "results") initResults();

