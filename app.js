const FUNCTION_URL = "https://wphojcbtmdtiifczfcqd.supabase.co/functions/v1/Spin";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwaG9qY2J0bWR0aWlmY3pmY3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTY5NzksImV4cCI6MjA4MjE3Mjk3OX0.Afo6r6HzkapE1TUCGsFMmNXK5HGZUGxyPV79-sJgQzA";

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

const PRIZE_LABEL = "GPT Plus 1 tháng";

/**
 * Giữ nguyên nội dung:
 * 1 ô thưởng + 7 ô thua cùng câu.
 */
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

const prizeIndex = segments.findIndex(s => s.kind === "prize");
const loseIndexes = segments.map((s, i) => s.kind === "lose" ? i : -1).filter(i => i >= 0);

let currentRotation = 0;
let spinning = false;

/* ========= Canvas sizing ========= */
function resizeCanvasForDPR(canvas, targetCssPx) {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.style.width = targetCssPx + "px";
  canvas.style.height = targetCssPx + "px";
  canvas.width = Math.round(targetCssPx * dpr);
  canvas.height = Math.round(targetCssPx * dpr);
  return dpr;
}

function measureWheelCssSize() {
  const rect = wheelCanvas.getBoundingClientRect();
  const size = Math.floor(Math.min(rect.width || 0, rect.height || 0));
  return size > 0 ? size : Math.min(480, Math.round(window.innerWidth * 0.88));
}

/* ========= Wheel NEW: casino rim + donut + rivets ========= */
function drawWheel(rotationRad = 0) {
  const sizeCss = measureWheelCssSize();
  const dpr = resizeCanvasForDPR(wheelCanvas, sizeCss);

  const w = wheelCanvas.width;
  const h = wheelCanvas.height;
  const cx = w / 2, cy = h / 2;

  // Kích thước hình học
  const R = Math.min(w, h) * 0.47;       // outer radius
  const holeR = R * 0.42;               // hole radius (center button sits above)
  const bandInner = holeR * 1.02;
  const bandOuter = R * 0.985;
  const textR = bandInner + (bandOuter - bandInner) * 0.60;

  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,w,h);

  ctx.translate(cx, cy);
  ctx.rotate(rotationRad);

  const n = segments.length;
  const arc = (Math.PI * 2) / n;

  // Back glow
  ctx.save();
  const glow = ctx.createRadialGradient(0,0,holeR*0.8, 0,0,R*1.15);
  glow.addColorStop(0, "rgba(255,255,255,0.03)");
  glow.addColorStop(0.65, "rgba(110,231,255,0.06)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0,0,R*1.15,0,Math.PI*2);
  ctx.fill();
  ctx.restore();

  // Segments
  for (let i = 0; i < n; i++) {
    const start = i * arc - Math.PI/2;
    const end = start + arc;
    const isPrize = i === prizeIndex;

    // Fill gradient
    const g = isPrize
      ? ctx.createLinearGradient(-R, -R, R, R)
      : ctx.createLinearGradient(-R, R, R, -R);

    if (isPrize) {
      g.addColorStop(0, "rgba(255,215,120,0.34)");
      g.addColorStop(1, "rgba(155,140,255,0.18)");
    } else {
      const alt = i % 2 === 0;
      g.addColorStop(0, alt ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)");
      g.addColorStop(1, alt ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)");
    }

    // Draw slice (full to center first)
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,bandOuter,start,end);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // Divider stroke
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = Math.max(1, 1.2*dpr);
    ctx.stroke();

    // Clip donut band so text cannot go into hole / outside
    ctx.save();
    ctx.beginPath();
    ctx.arc(0,0,bandOuter, start, end, false);
    ctx.arc(0,0,bandInner, end, start, true);
    ctx.closePath();
    ctx.clip();

    // Text
    const mid = start + arc/2;
    ctx.rotate(mid);

    // keep upright
    const ang = ((mid % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    const flip = ang > Math.PI/2 && ang < (Math.PI*3)/2;
    if (flip) ctx.rotate(Math.PI);

    const lines = isPrize ? ["GPT Plus", "1 tháng"] : ["Chúc bạn", "may mắn lần sau"];

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isPrize ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.90)";

    // Font tuned to avoid “chen chúc”
    const fontPx = Math.round((isPrize ? 12.6 : 12.0) * dpr);
    ctx.font = `900 ${fontPx}px ui-sans-serif, system-ui, -apple-system, Segoe UI`;

    const lineGap = Math.round(13*dpr);
    const y0 = -(lines.length - 1) * lineGap / 2;

    ctx.save();
    ctx.translate(textR, 0);
    for (let k=0;k<lines.length;k++){
      ctx.fillText(lines[k], 0, y0 + k*lineGap);
    }
    ctx.restore();

    ctx.restore(); // end clip
  }

  // Cut center hole (so center always clean, không lệch)
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(0,0,holeR,0,Math.PI*2);
  ctx.fill();
  ctx.restore();

  // Inner rim
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = Math.max(1, 2.2*dpr);
  ctx.beginPath();
  ctx.arc(0,0,bandInner,0,Math.PI*2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(110,231,255,0.10)";
  ctx.lineWidth = Math.max(1, 5.2*dpr);
  ctx.beginPath();
  ctx.arc(0,0,bandInner*0.995,0,Math.PI*2);
  ctx.stroke();
  ctx.restore();

  // Outer rim (steel)
  ctx.save();
  const rim = ctx.createRadialGradient(0,0,bandOuter*0.90, 0,0,bandOuter*1.08);
  rim.addColorStop(0, "rgba(255,255,255,0.03)");
  rim.addColorStop(0.6, "rgba(255,255,255,0.10)");
  rim.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(1, 10*dpr);
  ctx.beginPath();
  ctx.arc(0,0,bandOuter*1.01,0,Math.PI*2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = Math.max(1, 2.2*dpr);
  ctx.beginPath();
  ctx.arc(0,0,bandOuter*1.055,0,Math.PI*2);
  ctx.stroke();
  ctx.restore();

  // Rivets (đinh tán) quanh viền ngoài
  ctx.save();
  const rivetR = bandOuter*1.055;
  const dot = Math.max(1.2*dpr, 2.0*dpr);
  for (let i=0;i<24;i++){
    const a = (i/24) * Math.PI*2;
    const x = Math.cos(a)*rivetR;
    const y = Math.sin(a)*rivetR;
    ctx.beginPath();
    ctx.arc(x,y,dot,0,Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fill();
  }
  ctx.restore();
}

/* ========= UI helpers ========= */
function setStatus(text, tone = "neutral") {
  statusText.textContent = text;
  statusText.style.color =
    tone === "good" ? "var(--good)" :
    tone === "warn" ? "var(--warn)" :
    tone === "bad"  ? "var(--bad)" : "var(--text)";
}

function setResult(html) { resultBox.innerHTML = html; }
function badge(text, kind) { return `<span class="badge ${kind}">${text}</span>`; }

/* ========= Confetti ========= */
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

window.addEventListener("resize", () => {
  drawWheel(currentRotation);
  resizeConfetti();
});

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

/* ========= Spin logic ========= */
function normalizeRad(r) {
  const t = Math.PI * 2;
  return ((r % t) + t) % t;
}

function segmentCenterAngle(index) {
  const arc = (Math.PI * 2) / segments.length;
  const start = index * arc - Math.PI/2;
  return start + arc/2;
}

function spinToIndex(targetIndex) {
  if (spinning) return Promise.reject(new Error("SPINNING"));
  spinning = true;

  const arcCenter = segmentCenterAngle(targetIndex);
  const desired = normalizeRad((-Math.PI/2) - arcCenter);

  const extraTurns = 6 + Math.floor(Math.random() * 3);

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
      else { spinning = false; resolve(); }
    }
    requestAnimationFrame(frame);
  });
}

/* ========= Form / API ========= */
function normalizeEmail(v) { return String(v || "").trim().toLowerCase(); }
function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

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

function setBusy(b) {
  spinBtn.disabled = b;
  submitBtn.disabled = b;
  demoBtn.disabled = b;
  nameEl.disabled = b;
  emailEl.disabled = b;
  noteEl.disabled = b;
}

async function callSpinAPI({ name, email, note }) {
  const body = { name, identifier: email, note: note || null };

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
  try { json = JSON.parse(text); } catch {}

  if (!res.ok) {
    const msg = (json && (json.detail || json.message || json.error))
      ? (json.detail || json.message || json.error)
      : text;
    throw new Error(`HTTP_${res.status}: ${msg}`);
  }

  return json;
}

/* ========= INIT ========= */
drawWheel(0);
prizeText.textContent = PRIZE_LABEL;
setStatus("Sẵn sàng");
setResult(`${badge("READY", "warn")} Nhập thông tin và bấm <b>Quay</b>.`);

demoBtn.addEventListener("click", () => {
  nameEl.value = "Nguyễn Văn A";
  emailEl.value = `demo${Math.floor(Math.random()*10000)}@example.com`;
  noteEl.value = "Demo";
  setResult(`${badge("Demo", "warn")} Đã điền dữ liệu mẫu. Bấm <b>Gửi & Quay</b>.`);
});

spinBtn.addEventListener("click", () => { form.requestSubmit(); });

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
