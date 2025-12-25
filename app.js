/* =========================
   CONFIG
========================= */
const FUNCTION_URL = "https://wphojcbtmdtiifczfcqd.supabase.co/functions/v1/Spin";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwaG9qY2J0bWR0aWlmY3pmY3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTY5NzksImV4cCI6MjA4MjE3Mjk3OX0.Afo6r6HzkapE1TUCGsFMmNXK5HGZUGxyPV79-sJgQzA";

/* =========================
   DOM
========================= */
const $ = (id) => document.getElementById(id);

const wheelCanvas = $("wheel");
const ctx = wheelCanvas.getContext("2d");

const confettiCanvas = $("confetti");
const confettiCtx = confettiCanvas.getContext("2d");

const spinBtn = $("spinBtn");
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

/* =========================
   DATA
========================= */
const PRIZE_LABEL = "GPT Plus 1 tháng";

const segments = [
  { label: PRIZE_LABEL, kind: "prize" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
];

const prizeIndex = segments.findIndex((s) => s.kind === "prize");
const loseIndexes = segments
  .map((s, i) => (s.kind === "lose" ? i : -1))
  .filter((i) => i >= 0);

let currentRotation = 0;
let spinning = false;

/* =========================
   CANVAS HELPERS
========================= */
function resizeCanvasForDPR(canvas, targetCssPx) {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.style.width = targetCssPx + "px";
  canvas.style.height = targetCssPx + "px";
  canvas.width = Math.round(targetCssPx * dpr);
  canvas.height = Math.round(targetCssPx * dpr);
  return dpr;
}

function measureWheelCssSize() {
  // Ưu tiên đúng size CSS mà #wheel đang hiển thị
  const rect = wheelCanvas.getBoundingClientRect();
  const w = rect.width || 0;
  const h = rect.height || 0;
  const size = Math.floor(Math.min(w, h));
  // fallback nếu rect chưa có (mới load)
  return size > 0 ? size : Math.min(420, Math.round(window.innerWidth * 0.82));
}

function normalizeRad(r) {
  const t = Math.PI * 2;
  return ((r % t) + t) % t;
}

function segmentCenterAngle(index) {
  const arc = (Math.PI * 2) / segments.length;
  const start = index * arc - Math.PI / 2;
  return start + arc / 2;
}

/* =========================
   WHEEL DRAW (FIXED)
========================= */
function drawWheel(rotationRad = 0) {
  const sizeCss = measureWheelCssSize();
  const dpr = resizeCanvasForDPR(wheelCanvas, sizeCss);

  const w = wheelCanvas.width;
  const h = wheelCanvas.height;
  const cx = w / 2;
  const cy = h / 2;

  // Bán kính vòng
  const r = Math.min(w, h) * 0.46;

  // Hub nhỏ lại để không che chữ
  const innerR = r * 0.40;

  // Vị trí text trong “vành”
  const textR = innerR + (r - innerR) * 0.63;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.translate(cx, cy);
  ctx.rotate(rotationRad);

  const n = segments.length;
  const arc = (Math.PI * 2) / n;

  // Vòng highlight ngoài
  const ringR1 = r * 1.05;
  const ringR0 = r * 0.88;
  const grad = ctx.createRadialGradient(0, 0, ringR0, 0, 0, ringR1);
  grad.addColorStop(0, "rgba(255,255,255,0.04)");
  grad.addColorStop(1, "rgba(255,255,255,0.10)");
  ctx.beginPath();
  ctx.arc(0, 0, ringR1, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Label 2 dòng để dứt điểm tràn chữ
  function labelLines(i) {
    const isPrize = i === prizeIndex;
    if (isPrize) return ["GPT Plus", "1 tháng"];
    return ["Chúc bạn", "may mắn lần sau"];
  }

  for (let i = 0; i < n; i++) {
    const start = i * arc - Math.PI / 2;
    const end = start + arc;

    // Lát
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, start, end);
    ctx.closePath();

    const isPrize = i === prizeIndex;
    const fill = isPrize
      ? ctx.createLinearGradient(-r, -r, r, r)
      : ctx.createLinearGradient(-r, r, r, -r);

    if (isPrize) {
      fill.addColorStop(0, "rgba(110,231,255,0.22)");
      fill.addColorStop(1, "rgba(155,140,255,0.20)");
    } else {
      fill.addColorStop(0, "rgba(255,255,255,0.06)");
      fill.addColorStop(1, "rgba(255,255,255,0.02)");
    }

    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = Math.max(1, 1.2 * dpr);
    ctx.stroke();

    // === CLIP donut để chữ không bao giờ đè vào hub ===
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.99, start, end, false);
    ctx.arc(0, 0, innerR * 1.08, end, start, true);
    ctx.closePath();
    ctx.clip();

    // Vẽ chữ theo mid
    const mid = start + arc / 2;
    ctx.rotate(mid);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isPrize ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.88)";

    const lines = labelLines(i);

    const baseFont = Math.round(12 * dpr);
    const font = isPrize ? baseFont + 1 : baseFont;
    ctx.font = `800 ${font}px ui-sans-serif, system-ui, -apple-system, Segoe UI`;

    const lineGap = Math.round(13 * dpr);
    const y0 = -(lines.length - 1) * lineGap / 2;

    ctx.save();
    ctx.translate(textR, 0);
    for (let k = 0; k < lines.length; k++) {
      ctx.fillText(lines[k], 0, y0 + k * lineGap);
    }
    ctx.restore();

    ctx.restore();
  }

  // Hub
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(8,12,24,0.90)";
  ctx.fill();

  // Viền hub nhẹ
  ctx.strokeStyle = "rgba(110,231,255,0.16)";
  ctx.lineWidth = Math.max(1, 1.2 * dpr);
  ctx.stroke();

  // Glow hub
  const ig = ctx.createRadialGradient(
    -innerR * 0.35, -innerR * 0.45, innerR * 0.15,
    0, 0, innerR * 1.15
  );
  ig.addColorStop(0, "rgba(255,255,255,0.10)");
  ig.addColorStop(1, "rgba(255,255,255,0.00)");
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fillStyle = ig;
  ctx.fill();
}

/* =========================
   UI HELPERS
========================= */
function setStatus(text, tone = "neutral") {
  statusText.textContent = text;
  statusText.style.color =
    tone === "good" ? "var(--good)" :
    tone === "warn" ? "var(--warn)" :
    tone === "bad"  ? "var(--bad)" : "var(--text)";
}

function setResult(html) {
  resultBox.innerHTML = html;
}

function badge(text, kind) {
  return `<span class="badge ${kind}">${text}</span>`;
}

function setBusy(b) {
  spinBtn.disabled = b;
  submitBtn.disabled = b;
  demoBtn.disabled = b;
  nameEl.disabled = b;
  emailEl.disabled = b;
  noteEl.disabled = b;
}

/* =========================
   CONFETTI
========================= */
let confettiParticles = [];
let confettiActive = false;

function resizeConfetti() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  confettiCanvas.width = Math.round(window.innerWidth * dpr);
  confettiCanvas.height = Math.round(window.innerHeight * dpr);
  confettiCanvas.style.width = "100vw";
  confettiCanvas.style.height = "100vh";
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeConfetti();

function startConfetti() {
  resizeConfetti();
  confettiParticles = Array.from({ length: 120 }, () => ({
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
  confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

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
    confettiCtx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
    confettiCtx.restore();
  }

  confettiParticles = confettiParticles.filter((p) => p.life > 0 && p.y < window.innerHeight + 50);
  if (confettiParticles.length === 0) {
    confettiActive = false;
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    return;
  }
  requestAnimationFrame(tickConfetti);
}

/* =========================
   FORM VALIDATION
========================= */
function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

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

/* =========================
   API
========================= */
async function callSpinAPI({ name, email, note }) {
  const body = {
    name,
    identifier: email,
    note: note || null,
  };

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "apikey": ANON_KEY,
      "authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }

  if (!res.ok) {
    const msg = (json && (json.detail || json.message || json.error))
      ? (json.detail || json.message || json.error)
      : text;
    throw new Error(`HTTP_${res.status}: ${msg}`);
  }

  return json;
}

/* =========================
   SPIN ANIMATION
========================= */
function spinToIndex(targetIndex) {
  if (spinning) return Promise.reject(new Error("SPINNING"));
  spinning = true;

  const arcCenter = segmentCenterAngle(targetIndex);
  const desired = normalizeRad((-Math.PI / 2) - arcCenter);

  const extraTurns = 6 + Math.floor(Math.random() * 3); // 6..8

  const base = currentRotation;
  const baseNorm = normalizeRad(base);

  let target = base - baseNorm + desired + extraTurns * Math.PI * 2;
  if (target <= base) target += Math.PI * 2;

  const duration = 4600 + Math.random() * 700;
  const startTime = performance.now();
  const startRot = currentRotation;

  return new Promise((resolve) => {
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function frame(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const k = easeOutCubic(t);
      currentRotation = startRot + (target - startRot) * k;
      drawWheel(currentRotation);

      if (t < 1) requestAnimationFrame(frame);
      else {
        spinning = false;
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

/* =========================
   INIT + EVENTS
========================= */
function safeRedraw() {
  try { drawWheel(currentRotation); } catch (e) {
    console.error("drawWheel error:", e);
    setStatus("Lỗi hiển thị vòng quay", "bad");
    setResult(`${badge("JS ERROR", "bad")} Mở console để xem lỗi.`);
  }
}

safeRedraw();
prizeText.textContent = PRIZE_LABEL;
setStatus("Sẵn sàng");
setResult(`${badge("READY", "warn")} Nhập thông tin và bấm <b>Quay</b>.`);

window.addEventListener("resize", () => {
  safeRedraw();
  resizeConfetti();
});

demoBtn.addEventListener("click", () => {
  nameEl.value = "Nguyễn Văn A";
  emailEl.value = `demo${Math.floor(Math.random() * 10000)}@example.com`;
  noteEl.value = "Demo";
  setResult(`${badge("Demo", "warn")} Đã điền dữ liệu mẫu. Bấm <b>Gửi & Quay</b>.`);
});

spinBtn.addEventListener("click", () => {
  form.requestSubmit();
});

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (spinning) return;

  if (!ANON_KEY || ANON_KEY.includes("PASTE_YOUR_SUPABASE_ANON_KEY_HERE")) {
    setResult(`${badge("Cấu hình thiếu", "bad")} Bạn chưa set <b>ANON_KEY</b> trong <code>app.js</code>.`);
    return;
  }

  if (!validateForm()) {
    setResult(`${badge("Thiếu thông tin", "warn")} Vui lòng kiểm tra lại dữ liệu nhập.`);
    return;
  }

  const name = String(nameEl.value).trim();
  const email = normalizeEmail(emailEl.value);
  const note = String(noteEl.value || "").trim();

  setBusy(true);
  setStatus("Đang gọi server…", "warn");
  setResult(`${badge("Đang xử lý", "warn")} Hệ thống đang kiểm tra lượt quay…`);

  try {
    const resp = await callSpinAPI({ name, email, note });
    const data = resp?.data || {};
    const status = data?.status;

    if (status === "ALREADY_SPUN") {
      setStatus("Đã quay trước đó", "bad");
      setResult(`${badge("ALREADY_SPUN", "bad")} Email này đã quay rồi. Hệ thống không ghi nhận thêm để tránh gian lận.`);
      return;
    }

    if (status !== "WIN" && status !== "LOSE") {
      setStatus("Phản hồi không hợp lệ", "bad");
      setResult(`${badge("ERROR", "bad")} Server trả về trạng thái không mong đợi: <b>${String(status)}</b>`);
      return;
    }

    const targetIndex = (status === "WIN")
      ? prizeIndex
      : loseIndexes[Math.floor(Math.random() * loseIndexes.length)];

    setStatus("Đang quay…", "warn");
    setResult(`${badge(status, status === "WIN" ? "good" : "warn")} Vòng quay đang dừng ở kết quả…`);

    await spinToIndex(targetIndex);

    if (status === "WIN") {
      setStatus("Chúc mừng! Bạn đã trúng", "good");
      startConfetti();
      setResult(
        `${badge("WIN", "good")} Chúc mừng <b>${name}</b>! Bạn đã trúng <b>${data?.prize || PRIZE_LABEL}</b>.<br/>
         <span class="muted">Hệ thống đã gửi thông báo về admin (Telegram) để liên hệ trao thưởng.</span>`
      );
    } else {
      setStatus("Chưa trúng lần này", "warn");
      setResult(
        `${badge("LOSE", "warn")} Rất tiếc <b>${name}</b>, bạn chưa trúng lần này.<br/>
         <span class="muted">Hẹn gặp lại ở sự kiện tiếp theo.</span>`
      );
    }
  } catch (e) {
    setStatus("Lỗi server / cấu hình", "bad");
    setResult(`${badge("ERROR", "bad")} ${String(e.message || e)}`);
  } finally {
    setBusy(false);
  }
});
