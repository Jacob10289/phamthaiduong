const FUNCTIONS_BASE_URL = "https://wphojcbtmdtiifczfcqd.supabase.co/functions/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwaG9qY2J0bWR0aWlmY3pmY3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTY5NzksImV4cCI6MjA4MjE3Mjk3OX0.Afo6r6HzkapE1TUCGsFMmNXK5HGZUGxyPV79-sJgQzA";
const ADMIN_SPINS_ENDPOINT = `${FUNCTIONS_BASE_URL}/admin-spins`;

function $(id) {
  return document.getElementById(id);
}

function setStatus(text, type = "info") {
  const el = $("statusText");
  if (!el) return;
  el.textContent = text;

  el.classList.remove("status-ok", "status-warn", "status-err", "status-info");
  el.classList.add(
    type === "ok"
      ? "status-ok"
      : type === "warn"
      ? "status-warn"
      : type === "err"
      ? "status-err"
      : "status-info"
  );
}

function getAdminToken() {
  const token = ($("adminToken")?.value || "").trim();
  return token;
}

function buildHeaders(adminToken) {
  const h = {
    "content-type": "application/json",
    apikey: ANON_KEY,
    authorization: `Bearer ${ANON_KEY}`,
  };

  if (adminToken) {
    h["x-admin-token"] = adminToken;
  }
  return h;
}

function toISOStartOfDayUTC(dateStr) {
  if (!dateStr) return "";
  return `${dateStr}T00:00:00Z`;
}

function toISOEndOfDayUTC(dateStr) {
  if (!dateStr) return "";
  return `${dateStr}T23:59:59Z`;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadCSV(filename, rows) {
  const csv = rows.map((r) =>
    r.map((cell) => {
      const v = cell == null ? "" : String(cell);
      // escape quotes
      const escaped = v.replace(/"/g, '""');
      // wrap if contains comma/newline
      return /[,"\n]/.test(escaped) ? `"${escaped}"` : escaped;
    }).join(",")
  ).join("\n");

  downloadText(filename, csv);
}

let currentRows = []; // rows data from API
let currentPage = 0;
let lastQuery = null;

async function fetchAdminSpins({ q, status, fromISO, toISO, limit, offset }, adminToken) {
  const url = new URL(ADMIN_SPINS_ENDPOINT);

  if (q) url.searchParams.set("q", q);
  if (status && status !== "all") url.searchParams.set("status", status);
  if (fromISO) url.searchParams.set("from", fromISO);
  if (toISO) url.searchParams.set("to", toISO);

  url.searchParams.set("limit", String(limit ?? 50));
  url.searchParams.set("offset", String(offset ?? 0));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: buildHeaders(adminToken),
  });

  const text = await res.text();
  const json = safeJsonParse(text);

  if (!res.ok) {
 
    const msg =
      json?.error ||
      json?.message ||
      json?.detail?.message ||
      `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.raw = json || text;
    throw err;
  }

  return json;
}

function renderTable(rows) {
  const tbody = $("resultBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 8;
    td.textContent = "Không có dữ liệu.";
    td.style.opacity = "0.8";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const r of rows) {
    const tr = document.createElement("tr");

    const cols = [
      r.created_at || r.createdAt || "",
      r.name || "",
      r.identifier || r.email || "",
      r.note || "",
      r.prize || "",
      r.status || "",
      r.spin_id || r.spinId || r.id || "",
    ];

    for (const c of cols) {
      const td = document.createElement("td");
      td.textContent = c == null ? "" : String(c);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }
}

function renderStats(rows) {
  const el = $("statsBox");
  if (!el) return;

  const total = rows.length;
  const byStatus = rows.reduce((acc, r) => {
    const s = (r.status || "UNKNOWN").toString();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const parts = [`Tổng bản ghi: ${total}`];
  for (const [k, v] of Object.entries(byStatus)) {
    parts.push(`${k}: ${v}`);
  }
  el.textContent = parts.join(" | ");
}

function readFilters() {
  const q = ($("searchInput")?.value || "").trim();
  const status = ($("statusSelect")?.value || "all").trim();

  const fromISO = ($("fromISO")?.value || "").trim();
  const toISO = ($("toISO")?.value || "").trim();

  const limit = parseInt(($("limitSelect")?.value || "50").trim(), 10) || 50;

  return { q, status, fromISO, toISO, limit };
}

async function loadPage(pageDelta = 0) {
  const adminToken = getAdminToken();
  if (!adminToken) {
    setStatus("Thiếu Admin Token. Hãy nhập token rồi thử lại.", "warn");
    return;
  }

  if (ANON_KEY === "PASTE_YOUR_SUPABASE_ANON_KEY_HERE") {
    setStatus("Bạn chưa cấu hình ANON_KEY trong admin.js.", "err");
    return;
  }

  currentPage = Math.max(0, currentPage + pageDelta);

  const { q, status, fromISO, toISO, limit } = readFilters();
  const offset = currentPage * limit;

  lastQuery = { q, status, fromISO, toISO, limit, offset };

  setStatus("Đang tải dữ liệu...", "info");

  try {
    const data = await fetchAdminSpins(lastQuery, adminToken);

    const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    currentRows = rows;

    renderTable(rows);
    renderStats(rows);

    setStatus(`Tải xong. Trang ${currentPage + 1}, số dòng: ${rows.length}.`, "ok");
  } catch (e) {
    console.error(e);
    const st = e?.status;
    if (st === 401) {
      setStatus("401 Unauthorized: token sai hoặc request không gửi đúng header.", "err");
    } else {
      setStatus(`Lỗi tải dữ liệu: ${e.message || "Unknown error"}`, "err");
    }
  }
}

function exportCurrentPageCSV() {
  if (!currentRows || currentRows.length === 0) {
    setStatus("Không có dữ liệu để export.", "warn");
    return;
  }

  const headers = ["created_at", "name", "identifier", "note", "prize", "status", "spin_id"];
  const rows = [headers];

  for (const r of currentRows) {
    rows.push([
      r.created_at || r.createdAt || "",
      r.name || "",
      r.identifier || r.email || "",
      r.note || "",
      r.prize || "",
      r.status || "",
      r.spin_id || r.spinId || r.id || "",
    ]);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  downloadCSV(`admin-spins-page-${currentPage + 1}-${ts}.csv`, rows);
  setStatus("Đã export CSV (trang hiện tại).", "ok");
}

function logout() {
 
  const el = $("adminToken");
  if (el) el.value = "";
  currentRows = [];
  currentPage = 0;
  renderTable([]);
  renderStats([]);
  setStatus("Đã đăng xuất (đã xoá token trên trình duyệt).", "info");
}

function bindEvents() {
  $("btnLoad")?.addEventListener("click", () => {
    currentPage = 0;
    loadPage(0);
  });

  $("btnPrev")?.addEventListener("click", () => loadPage(-1));
  $("btnNext")?.addEventListener("click", () => loadPage(1));

  $("btnStats")?.addEventListener("click", () => renderStats(currentRows));
  $("btnExport")?.addEventListener("click", exportCurrentPageCSV);

  $("btnLogout")?.addEventListener("click", logout);
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  setStatus("Sẵn sàng. Nhập Admin Token rồi bấm 'Tải dữ liệu'.", "info");
});
function assertIds() {
  const required = [
    "adminToken","searchInput","statusSelect","fromISO","toISO","limitSelect",
    "btnLoad","btnPrev","btnNext","btnStats","btnExport","btnLogout",
    "statusText","statsBox","resultBody"
  ];
  const missing = required.filter(id => !document.getElementById(id));
  if (missing.length) {
    alert("Thiếu id trong admin.html: " + missing.join(", "));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  assertIds();
  bindEvents();
  setStatus("Sẵn sàng. Nhập Admin Token rồi bấm 'Tải dữ liệu'.", "info");
});
