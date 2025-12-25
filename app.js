const FUNCTION_URL = "https://wphojcbtmdtiifczfcqd.supabase.co/functions/v1/Spin";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwaG9qY2J0bWR0aWlmY3pmY3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTY5NzksImV4cCI6MjA4MjE3Mjk3OX0.Afo6r6HzkapE1TUCGsFMmNXK5HGZUGxyPV79-sJgQzA";

const $ = (id) => document.getElementById(id);

const confettiCanvas = $("confetti");
const confettiCtx = confettiCanvas.getContext("2d");

const submitBtn = $("submitBtn");
const demoBtn = $("demoBtn");
const form = $("form");

const nameEl = $("name");
const emailEl = $("email");
const noteEl = $("note");

const nameHint = $("nameHint");
const emailHint = $("emailHint");

const statusText = $("statusText");
const prizeText = $("prizeText");
const resultBox = $("result");
const envPill = $("envPill");

$("year").textContent = String(new Date().getFullYear());
envPill.textContent = location.hostname.includes("localhost") ? "Local" : "Production";

const PRIZE_LABEL = "GPT Plus 1 tháng";
const LOSE_LABEL = "Chúc bạn may mắn lần sau";
prizeText.textContent = PRIZE_LABEL;

/* ===== Render mini game (Rút thẻ) ===== */
const wheelArea = document.querySelector(".wheel-area");
const oldCenter = document.querySelector(".wheel-center");
if (oldCenter) oldCenter.remove();
wheelArea.innerHTML = `
  <div class="game" id="gameRoot">
    <div class="game-head">
      <div>
        <h3 class="game-title">Rút thẻ may mắn</h3>
        <p class="game-sub">Mỗi email chỉ được 1 lần. Bấm <b>Gửi & Rút thẻ</b> để xem kết quả.</p>
      </div>
      <div class="pill" id="gameStatePill">READY</div>
    </div>

    <div class="deck">
      <div class="card3d" id="card3d">
        <div class="card-face card-front">
          <div class="card-front-inner">
            <div class="card-badge"><span class="card-mark"></span> Lucky Card</div>
            <div class="card-front-title">Rút thẻ</div>
            <div class="card-front-sub">Nhấn nút bên dưới để lật thẻ và nhận kết quả.</div>
          </div>
        </div>

        <div class="card-face card-back">
          <div class="card-back-inner" id="cardBackInner"></div>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" id="revealBtn" type="button">Gửi & Rút thẻ</button>
      <button class="btn btn-ghost" id="resetBtn" type="button">Làm mới thẻ</button>
    </div>
  </div>
`;

const gameStatePill = $("gameStatePill");
const card3d = $("card3d");
const cardBackInner = $("cardBackInner");
const revealBtn = $("revealBtn");
const resetBtn = $("resetBtn");

let busy = false;
let revealed = false;

function setGameState(t){ gameStatePill.textContent = t; }

function setStatus(text, tone = "neutral") {
  statusText.textContent = text;
  statusText.style.color =
    tone === "good" ? "var(--good)" :
    tone === "warn" ? "var(--warn)" :
    tone === "bad"  ? "var(--bad)" : "var(--text)";
}
function setResult(html){ resultBox.innerHTML = html; }
function badge(text, kind){ return `<span class="badge ${kind}">${text}</span>`; }

function normalizeEmail(v){ return String(v || "").trim().toLowerCase(); }
function isValidEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function validateForm() {
  let ok = true;
  nameHint.textContent = "";
  emailHint.textContent = "";

  const name = String(nameEl.value || "").trim();
  const email = normalizeEmail(emailEl.value);

  if (!name || name.length < 2) {
    nameHint.textContent = "Vui lòng nhập họ tên (tối thiểu 2 ký tự).";
    ok = false;
  }
  if (!email || !isValidEmail(email)) {
    emailHint.textContent = "Email không hợp lệ.";
    ok = false;
  }
  return ok;
}

function setBusy(b){
  busy = b;
  revealBtn.disabled = b;
  resetBtn.disabled = b;
  submitBtn.disabled = b;
  demoBtn.disabled = b;
  nameEl.disabled = b;
  emailEl.disabled = b;
  noteEl.disabled = b;
}

function renderBack(status, prizeMaybe) {
  if (status === "WIN") {
    cardBackInner.innerHTML = `
      <div class="result-pill win">WIN</div>
      <div class="result-title">Chúc mừng!</div>
      <div class="result-desc">Bạn đã trúng <b>${prizeMaybe || PRIZE_LABEL}</b>.</div>
    `;
  } else {
    cardBackInner.innerHTML = `
      <div class="result-pill lose">LOSE</div>
      <div class="result-title">Rất tiếc</div>
      <div class="result-desc">${LOSE_LABEL}.<br/>Hẹn gặp lại ở sự kiện tiếp theo.</div>
    `;
  }
}

function flipCard(){ card3d.classList.add("is-flipped"); revealed = true; }
function resetCard(){
  card3d.classList.remove("is-flipped");
  cardBackInner.innerHTML = "";
  revealed = false;
  setGameState("READY");
  setStatus("Sẵn sàng");
  setResult(`${badge("READY","warn")} Nhập thông tin và bấm <b>Gửi & Rút thẻ</b>.`);
}

resetBtn.addEventListener("click", () => { if (!busy) resetCard(); });

demoBtn.addEventListener("click", () => {
  nameEl.value = "Nguyễn Văn A";
  emailEl.value = `demo${Math.floor(Math.random()*10000)}@example.com`;
  noteEl.value = "Demo";
  setResult(`${badge("Demo","warn")} Đã điền dữ liệu mẫu. Bấm <b>Gửi & Rút thẻ</b>.`);
});

revealBtn.addEventListener("click", () => form.requestSubmit());

/* ===== Confetti ===== */
let confettiParticles = [];
let confettiActive = false;

function resizeConfetti() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  confettiCanvas.width = Math.round(window.innerWidth * dpr);
  confettiCanvas.height = Math.round(window.innerHeight * dpr);
  confettiCanvas.style.width = "100vw";
  confettiCanvas.style.height = "100vh";
  confettiCtx.setTransform(dpr,0,0,dpr,0,0);
}
resizeConfetti();
window.addEventListener("resize", resizeConfetti);

function startConfetti() {
  resizeConfetti();
  confettiParticles = Array.from({length: 120}, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * 200,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 5,
    r: 2 + Math.random() * 4,
    a: Math.random() * Math.PI * 2,
    va: (Math.random() - 0.5) * 0.2,
    life: 120 + Math.random() * 60,
  }));
  confettiActive = true;
  requestAnimationFrame(tickConfetti);
}

function tickConfetti() {
  if (!confettiActive) return;
  confettiCtx.clearRect(0,0,window.innerWidth, window.innerHeight);

  for (const p of confettiParticles) {
    p.x += p.vx;
    p.y += p.vy;
    p.a += p.va;
    p.life -= 1;

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.a);
    confettiCtx.globalAlpha = Math.max(0, Math.min(1, p.life / 90));
    confettiCtx.fillStyle = "rgba(255,255,255,0.90)";
    confettiCtx.fillRect(-p.r, -p.r, p.r*2, p.r*2);
    confettiCtx.restore();
  }

  confettiParticles = confettiParticles.filter(p => p.life > 0 && p.y < window.innerHeight + 50);
  if (confettiParticles.length === 0) {
    confettiActive = false;
    confettiCtx.clearRect(0,0,window.innerWidth, window.innerHeight);
    return;
  }
  requestAnimationFrame(tickConfetti);
}

/* ===== API (DEBUG DỨT ĐIỂM) ===== */
async function callSpinAPI({ name, email, note }) {
  const body = { name, identifier: email, note: note || null };

  let res;
  let raw = "";
  try {
    res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "apikey": ANON_KEY,
        "authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    raw = await res.text();
  } catch (err) {
    // Đây là nơi CORS/Network sẽ rơi vào
    throw new Error(`NETWORK_OR_CORS: ${String(err?.message || err)}`);
  }

  let json = null;
  try { json = JSON.parse(raw); } catch {}

  if (!res.ok) {
    const msg = json?.detail || json?.message || json?.error || raw || `${res.status} ${res.statusText}`;
    throw new Error(`HTTP_${res.status}: ${msg}`);
  }

  return json;
}

/* ===== Submit ===== */
form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (busy) return;

  if (!validateForm()) {
    setResult(`${badge("Thiếu thông tin","warn")} Vui lòng kiểm tra lại dữ liệu nhập.`);
    return;
  }

  const name = String(nameEl.value).trim();
  const email = normalizeEmail(emailEl.value);
  const note = String(noteEl.value || "").trim();

  setBusy(true);
  setGameState("CHECKING…");
  setStatus("Đang gọi server…", "warn");
  setResult(`${badge("Đang xử lý","warn")} Hệ thống đang kiểm tra lượt chơi…`);

  try {
    const resp = await callSpinAPI({ name, email, note });
    const data = resp?.data || {};
    const status = data?.status;

    if (status === "ALREADY_SPUN") {
      setGameState("LOCKED");
      setStatus("Đã chơi trước đó", "bad");
      setResult(`${badge("ALREADY_SPUN","bad")} Email này đã chơi rồi. Hệ thống không ghi nhận thêm để tránh gian lận.`);
      return;
    }

    if (status !== "WIN" && status !== "LOSE") {
      setGameState("ERROR");
      setStatus("Phản hồi không hợp lệ", "bad");
      setResult(`${badge("ERROR","bad")} Server trả về trạng thái không mong đợi: <b>${String(status)}</b>`);
      return;
    }

    setGameState("REVEAL…");
    setStatus("Đang lật thẻ…", "warn");

    if (revealed) resetCard();
    renderBack(status, data?.prize || PRIZE_LABEL);
    await new Promise(r => setTimeout(r, 250));
    flipCard();

    if (status === "WIN") {
      setGameState("WIN");
      setStatus("Chúc mừng! Bạn đã trúng", "good");
      startConfetti();
      setResult(
        `${badge("WIN","good")} Chúc mừng <b>${name}</b>! Bạn đã trúng <b>${data?.prize || PRIZE_LABEL}</b>.<br/>
         <span class="muted">Hệ thống đã gửi thông báo về admin (Telegram) để liên hệ trao thưởng.</span>`
      );
    } else {
      setGameState("LOSE");
      setStatus("Chưa trúng lần này", "warn");
      setResult(
        `${badge("LOSE","warn")} Rất tiếc <b>${name}</b>, bạn chưa trúng lần này.<br/>
         <span class="muted">Hẹn gặp lại ở sự kiện tiếp theo.</span>`
      );
    }

  } catch (e) {
    setGameState("ERROR");
    setStatus("Lỗi server / cấu hình", "bad");
    setResult(
      `${badge("ERROR","bad")} ${String(e.message || e)}<br/>
       <span class="muted">Debug: nếu thấy <b>NETWORK_OR_CORS</b> thì sửa CORS trong function Spin.</span>`
    );
  } finally {
    setBusy(false);
  }
});

/* INIT */
resetCard();
