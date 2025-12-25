// ====== CONFIG ======
const FUNCTION_URL = "https://wphojcbtmdtiifczfcqd.supabase.co/functions/v1/Spin";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwaG9qY2J0bWR0aWlmY3pmY3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTY5NzksImV4cCI6MjA4MjE3Mjk3OX0.Afo6r6HzkapE1TUCGsFMmNXK5HGZUGxyPV79-sJgQzA";

const $ = (id) => document.getElementById(id);

// ====== ELEMENTS ======
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

// Optional dev ids (nếu có)
const endpointText = $("endpointText");
const spinIdText = $("spinIdText");
const serverStatusText = $("serverStatusText");

// Footer year (nếu có)
const yearEl = $("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Env pill
if (envPill) envPill.textContent = location.hostname.includes("localhost") ? "Local" : "Production";

// ====== GAME DATA ======
const PRIZE_LABEL = "GPT Plus 1 tháng";

const segments = [
  { label: PRIZE_LABEL, kind: "prize" },
  { label: "CHAT GPT PLUS 1 THÁNG", kind: "Win" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
  { label: "Chúc bạn may mắn lần sau", kind: "lose" },
];

const prizeIndex = segments.findIndex((s) => s.kind === "prize");
const loseIndexes = segments.map((s, i) => (s.kind === "lose" ? i : -1)).filter((i) => i >= 0);

let currentRotation = 0; // radians
let spinning = false;

// ====== CANVAS SIZE / DPR ======
function resizeCanvasForDPR(canvas, targetCssPx) {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const css = Math.max(10, Math.floor(targetCssPx));
  canvas.style.width = css + "px";
  canvas.style.height = css + "px";
  canvas.width = Math.round(css * dpr);
  canvas.height = Math.round(css * dpr);
  return dpr;
}

function measureWheelCssSize() {
  const rect = wheelCanvas.getBoundingClientRect();
  const size = Math.floor(Math.min(rect.width || 0, rect.height || 0));
  return size > 0 ? size : Math.min(420, Math.round(window.innerWidth * 0.82));
}

// ====== DRAW WHEEL ======
function normalizeRad(r) {
  const t = Math.PI * 2;
  return ((r % t) + t) % t;
}

function drawWheel(rotationRad = 0) {
  const sizeCss = measureWheelCssSize();
  const dpr = resizeCanvasForDPR(wheelCanvas, sizeCss);

  const w = wheelCanvas.width;
  const h = wheelCanvas.height;
  const cx = w / 2;
  const cy = h / 2;

  const r = Math.min(w, h) * 0.46;

  // Hub (vòng đen trong canvas) — cân với nút overlay
  const innerR = r * 0.36;

  // Text radius trong lát
  const textR = innerR + (r - innerR) * 0.72;

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

  // Prize lines: lấy từ PRIZE_LABEL cho khỏi “mất giải”
  function prizeLinesFromLabel(label) {
    const s = String(label || "").trim();
    // tách mềm: "GPT Plus 1 tháng" -> ["GPT Plus", "1 tháng"]
    const m = s.match(/^(.*?)(\s+\d+.*)$/);
    if (m) return [m[1].trim(), m[2].trim()];
    // fallback
    return s.length > 10 ? [s.slice(0, Math.ceil(s.length / 2)), s.slice(Math.ceil(s.length / 2))] : [s];
  }

  function labelLines(i) {
    if (i === prizeIndex) return prizeLinesFromLabel(PRIZE_LABEL);
    return ["Chúc bạn", "may mắn", "lần sau"];
  }

  // max text width (chord) tại radius textR
  function maxTextWidthAtRadius(R) {
    const chord = 2 * R * Math.sin(arc / 2);
    return chord * 0.86;
  }

  for (let i = 0; i < n; i++) {
    const start = i * arc - Math.PI / 2;
    const end = start + arc;
    const mid = start + arc / 2;
    const midN = normalizeRad(mid);

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

    // ===== TEXT: tangent + auto flip + auto fit =====
    const lines = labelLines(i);

    ctx.save();
    ctx.rotate(mid);
    ctx.translate(textR, 0);
    ctx.rotate(Math.PI / 2);

    // flip nửa trái để luôn đọc xuôi (điều kiện ổn định hơn cos)
    if (midN > Math.PI / 2 && midN < (3 * Math.PI) / 2) {
      ctx.rotate(Math.PI);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isPrize ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.90)";

    const maxW = maxTextWidthAtRadius(textR);

    let fontPx = Math.round((isPrize ? 13 : 12) * dpr);
    const minFontPx = Math.round(9 * dpr);

    function setFont(px) {
      ctx.font = `800 ${px}px ui-sans-serif, system-ui, -apple-system, Segoe UI`;
    }

    const lineGap = Math.round(12.5 * dpr);

    while (fontPx > minFontPx) {
      setFont(fontPx);
      const longest = Math.max(...lines.map((t) => ctx.measureText(t).width));
      if (longest <= maxW) break;
      fontPx -= 1;
    }
    setFont(fontPx);

    const y0 = -((lines.length - 1) * lineGap) / 2;
    for (let k = 0; k < lines.length; k++) {
      ctx.fillText(lines[k], 0, y0 + k * lineGap);
    }

    ctx.restore();
  }

  // ===== HUB (vòng đen giữa canvas) =====
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(6,10,18,0.84)";
  ctx.fill();

  // vignette nhẹ (KHÔNG dùng xanh)
  const hubGrad = ctx.createRadialGradient(-innerR * 0.25, -innerR * 0.3, innerR * 0.1, 0, 0, innerR * 1.05);
  hubGrad.addColorStop(0, "rgba(255,255,255,0.08)");
  hubGrad.addColorStop(1, "rgba(0,0,0,0.00)");
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.fill();

  // Viền hub trung tính (nếu muốn bỏ luôn viền: comment 3 dòng dưới)
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = Math.max(1, 1.2 * dpr);
  ctx.stroke();
}

// ===== UI HELPERS =====
function setStatus(text, tone = "neutral") {
  if (!statusText) return;
  statusText.textContent = text;
  statusText.style.color =
    tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--bad)" : "var(--text)";
}

function setResult(html) {
  if (!resultBox) return;
  resultBox.innerHTML = html;
}

function badge(text, kind) {
  return `<span class="badge ${kind}">${text}</span>`;
}

function setBusy(b) {
  if (spinBtn) spinBtn.disabled = b;
  if (submitBtn) submitBtn.disabled = b;
  if (demoBtn) demoBtn.disabled = b;
  if (nameEl) nameEl.disabled = b;
  if (emailEl) emailEl.disabled = b;
  if (noteEl) noteEl.disabled = b;
}

// ===== CONFETTI =====
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

window.addEventListener("resize", () => {
  drawWheel(currentRotation);
  resizeConfetti();
});

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

// ===== SPIN MATH =====
function segmentCenterAngle(index) {
  const arc = (Math.PI * 2) / segments.length;
  const start = index * arc - Math.PI / 2;
  return start + arc / 2;
}

function spinToIndex(targetIndex) {
  if (spinning) return Promise.reject(new Error("SPINNING"));
  spinning = true;

  const arcCenter = segmentCenterAngle(targetIndex);
  const desired = normalizeRad((-Math.PI / 2) - arcCenter);

  const extraTurns = 6 + Math.floor(Math.random() * 3);
  const base = currentRotation;
  const baseNorm = normalizeRad(base);

  let target = base - baseNorm + desired + extraTurns * Math.PI * 2;
  if (target <= base) target += Math.PI * 2;

  const duration = 4600 + Math.random() * 700;
  const startTime = performance.now();
  const startRot = currentRotation;

  return new Promise((resolve) => {
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }
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

// ===== FORM / API =====
function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validateForm() {
  let ok = true;
  if (nameHint) nameHint.textContent = "";
  if (emailHint) emailHint.textContent = "";

  const name = String(nameEl?.value || "").trim();
  const email = normalizeEmail(emailEl?.value);

  if (!name || name.length < 2) {
    if (nameHint) nameHint.textContent = "Vui lòng nhập họ tên (tối thiểu 2 ký tự).";
    ok = false;
  }
  if (!email || !isValidEmail(email)) {
    if (emailHint) emailHint.textContent = "Email không hợp lệ.";
    ok = false;
  }
  return ok;
}

async function callSpinAPI({ name, email, note }) {
  const body = { name, identifier: email, note: note || null };

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: ANON_KEY,
      authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (endpointText) endpointText.textContent = FUNCTION_URL;
  if (serverStatusText) serverStatusText.textContent = `${res.status} ${res.statusText}`;

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}

  if (!res.ok) {
    const msg =
      json && (json.detail || json.message || json.error) ? json.detail || json.message || json.error : text;
    throw new Error(`HTTP_${res.status}: ${msg}`);
  }

  return json;
}

// ===== INIT =====
drawWheel(0);
if (prizeText) prizeText.textContent = PRIZE_LABEL;
setStatus("Sẵn sàng");
setResult(`${badge("READY", "warn")} Nhập thông tin và bấm <b>Quay</b>.`);

if (demoBtn) {
  demoBtn.addEventListener("click", () => {
    if (nameEl) nameEl.value = "Nguyễn Văn A";
    if (emailEl) emailEl.value = `demo${Math.floor(Math.random() * 10000)}@example.com`;
    if (noteEl) noteEl.value = "Demo";
    setResult(`${badge("Demo", "warn")} Đã điền dữ liệu mẫu. Bấm <b>Gửi & Quay</b>.`);
  });
}

if (spinBtn) {
  spinBtn.addEventListener("click", () => {
    if (form) form.requestSubmit();
  });
}

if (form) {
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
    const note = String(noteEl?.value || "").trim();

    setBusy(true);
    setStatus("Đang gọi server…", "warn");
    setResult(`${badge("Đang xử lý", "warn")} Hệ thống đang kiểm tra lượt quay…`);

    try {
      const resp = await callSpinAPI({ name, email, note });
      const data = resp?.data || {};
      const status = data?.status;

      if (spinIdText) spinIdText.textContent = data?.spin_id || "—";

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

      const targetIndex = status === "WIN" ? prizeIndex : loseIndexes[Math.floor(Math.random() * loseIndexes.length)];

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
}
