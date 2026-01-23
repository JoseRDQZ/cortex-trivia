// I keep the UI state local for now so the team can agree on API shape later.
const state = {
  inSession: false,
  sessionCode: null,
  players: [],
  question: null,
  selectedAnswerId: null,
  timerId: null,
  secondsLeft: 0,
};

const $ = (id) => document.getElementById(id);

// I group DOM references so I don’t keep searching the page repeatedly.
const ui = {
  status: $("statusText"),
  sessionCode: $("sessionCode"),
  playerList: $("playerList"),
  timer: $("timer"),
  questionText: $("questionText"),
  answers: $("answers"),

  createBtn: $("createBtn"),
  joinBtn: $("joinBtn"),
  startBtn: $("startBtn"),
  leaveBtn: $("leaveBtn"),
  demoBtn: $("demoBtn"),
  submitBtn: $("submitBtn"),
};

function setStatus(msg) {
  ui.status.textContent = msg;
}

// I render from state so I can swap "local state" for "backend state" later.
function renderSession() {
  ui.sessionCode.textContent = state.sessionCode ?? "—";
  ui.playerList.textContent = state.players.length ? state.players.join(", ") : "—";
  ui.startBtn.disabled = !state.inSession;
  ui.leaveBtn.disabled = !state.inSession;
}

function clearAnswers() {
  ui.answers.innerHTML = "";
  state.selectedAnswerId = null;
  ui.submitBtn.disabled = true;
}

function renderQuestion() {
  clearAnswers();

  if (!state.question) {
    ui.questionText.textContent = "—";
    ui.timer.textContent = "—";
    return;
  }

  ui.questionText.textContent = state.question.text;
  ui.submitBtn.disabled = false;

  state.question.answers.forEach((a) => {
    const btn = document.createElement("button");
    btn.className = "answer";
    btn.textContent = a.text;

    btn.addEventListener("click", () => {
      state.selectedAnswerId = a.id;
      ui.answers.querySelectorAll(".answer").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });

    ui.answers.appendChild(btn);
  });
}

// I keep a tiny timer only to preview UI; real games should trust backend timing.
function startTimer(seconds) {
  stopTimer();
  state.secondsLeft = seconds;
  ui.timer.textContent = `${state.secondsLeft}s`;

  state.timerId = setInterval(() => {
    state.secondsLeft -= 1;
    ui.timer.textContent = `${state.secondsLeft}s`;
    if (state.secondsLeft <= 0) {
      stopTimer();
      ui.submitBtn.disabled = true;
      setStatus("Time’s up (demo).");
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

function loadDemoQuestion() {
  // I use a demo question so the layout is testable without backend work yet.
  state.question = {
    text: "Demo: Which layer typically handles UI in a web app?",
    answers: [
      { id: "a", text: "Frontend" },
      { id: "b", text: "Database" },
      { id: "c", text: "Kernel drivers" },
      { id: "d", text: "Compiler pipeline" },
    ],
  };
  renderQuestion();
  startTimer(15);
  setStatus("Loaded demo question.");
}

ui.createBtn.addEventListener("click", () => {
  const name = $("createName").value.trim() || "Player1";

  // I generate a fake code now; later the backend will return the real session code.
  state.inSession = true;
  state.sessionCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  state.players = [name];

  renderSession();
  setStatus(`Created session ${state.sessionCode} (demo).`);
});

ui.joinBtn.addEventListener("click", () => {
  const code = $("joinCode").value.trim().toUpperCase();
  const name = $("joinName").value.trim() || "Player";

  if (!code) return setStatus("Enter a session code first.");

  // I accept the code locally for now; later the backend will validate it.
  state.inSession = true;
  state.sessionCode = code;
  state.players = [name];

  renderSession();
  setStatus(`Joined session ${code} (demo).`);
});

ui.startBtn.addEventListener("click", () => {
  // I don’t start a real game yet; the backend will own the game state.
  setStatus("Start clicked (no backend yet).");
});

ui.leaveBtn.addEventListener("click", () => {
  stopTimer();
  state.inSession = false;
  state.sessionCode = null;
  state.players = [];
  state.question = null;
  state.selectedAnswerId = null;

  renderSession();
  renderQuestion();
  setStatus("Left session.");
});

ui.demoBtn.addEventListener("click", loadDemoQuestion);

ui.submitBtn.addEventListener("click", () => {
  if (!state.selectedAnswerId) return setStatus("Pick an answer first.");

  // I only show what would be submitted; later this will POST to the backend.
  setStatus(`Submitted "${state.selectedAnswerId}" (demo).`);
});

// initial paint
renderSession();
renderQuestion();
setStatus("Ready.");

