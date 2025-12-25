const SUPABASE_URL = "https://wphojcbtmdtiifczfcqd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwaG9qY2J0bWR0aWlmY3pmY3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTY5NzksImV4cCI6MjA4MjE3Mjk3OX0.Afo6r6HzkapE1TUCGsFMmNXK5HGZUGxyPV79-sJgQzA";

/* =========================
   DOM helpers
========================= */
function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Thiếu id trong admin.html: ${id}`);
  return el;
}
function setStatus(msg, isError = false) {
  const el = $("statusText");
  el.textContent = msg || "";
  el.style.opacity = "1";
  el.style.color = isError ? "#ff6b6b" : "#9be15d";
}
function safeTrim(v) {
  return (v ?? "").toString().trim();
}

/* =========================
   State
========================= */
let pageOffset = 0;
let lastRows = [];

/* =========================
   Core request
========================= */
async function callAdminSpins(params, adminToken) {
  const url = new URL(`${SUPABASE_URL}/functions/v1/admin-spins`);

  // query params
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      url.searchParams.set(k, String(v));
    }
  });

  // IMPORTANT: gửi đủ 3 header giống Hoppscotch
  const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "x-admin-token": adminToken, // <-- token bạn nhập trên web
    "accept": "application/json",
  };

  const res = await fetch(url.toString(), { method: "GET", headers });
  const json = await res.json().catch(() => null);
  return { res, json, url: url.toString() };
}

/* =========================
   Render table
========================= */
function renderRows(rows) {
  lastRows = Array.isArray(rows) ? rows : [];
  const body = $("resultBody");
  body.innerHTML = "";

  if (!lastRows.length) {
    body.innerHTML = `<tr><td colspan="5" style="opacity:.7">Không có dữ liệu</td></tr>`;
    return;
  }

  for (const r of lastRows) {
    const created = r.created_at ? new Date(r.created_at).toLocaleString() : "";
    const name = r.name ?? "";
    const identifier = r.identifier ?? "";
    const status = r.status ?? "";
    const prize = r.prize ?? "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${created}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(identifier)}</td>
      <td>${escapeHtml(status)}</td>
      <td>${escapeHtml(prize)}</td>
    `;
    body.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   Build params from filters
========================= */
function collectParams() {
  const q = safeTrim($("searchInput").value);
  const status = safeTrim($("statusSelect").value);
  const fromISO = safeTrim($("fromISO").value);
  const toISO = safeTrim($("toISO").value);
  const limit = parseInt($("limitSelect").value || "50", 10);

  return {
    q,
    status: status === "all" ? "" : status,
    from: fromISO,
    to: toISO,
    limit: Number.isFinite(limit) ? limit : 50,
    offset: pageOffset,
  };
}

/* =========================
   Actions
========================= */
async function loadData() {
  try {
    setStatus("Đang tải dữ liệu...");
    const adminToken = safeTrim($("adminToken").value);

    if (!adminToken) {
      setStatus("Thiếu Admin Token.", true);
      return;
    }
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("<<<")) {
      setStatus("Bạn chưa set SUPABASE_ANON_KEY trong admin.js.", true);
      return;
    }

    const params = collectParams();
    const { res, json } = await callAdminSpins(params, adminToken);

    if (!res.ok) {
      // hiển thị rõ lỗi
      if (res.status === 401) {
        setStatus("401 Unauthorized: token sai hoặc request không gửi đúng header.", true);
      } else {
        setStatus(`${res.status} Error: ${json?.error || "Unknown"}`, true);
      }
      renderRows([]);
      return;
    }

    // expected: { ok: true, data: [...] }
    if (!json?.ok) {
      setStatus(`API trả về ok=false: ${json?.error || "Unknown"}`, true);
      renderRows([]);
      return;
    }

    renderRows(json.data || []);
    setStatus(`OK. Đã tải ${json.data?.length || 0} bản ghi.`);
  } catch (e) {
    setStatus(`Lỗi: ${e.message || e}`, true);
    console.error(e);
  }
}

function exportCsvCurrentPage() {
  if (!lastRows.length) {
    setStatus("Không có dữ liệu để export.", true);
    return;
  }

  const headers = ["created_at", "name", "identifier", "status", "prize", "spin_id"];
  const lines = [
    headers.join(","),
    ...lastRows.map(r =>
      headers.map(h => `"${String(r[h] ?? "").replaceAll('"', '""')}"`).join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `spins_page_${pageOffset}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setStatus("Đã export CSV (trang hiện tại).");
}

function reset() {
  pageOffset = 0;
  $("adminToken").value = "";
  $("searchInput").value = "";
  $("statusSelect").value = "all";
  $("fromISO").value = "";
  $("toISO").value = "";
  $("limitSelect").value = "50";
  renderRows([]);
  setStatus("");
}

/* =========================
   Wire up UI
========================= */
document.addEventListener("DOMContentLoaded", () => {
  $("btnLoad").addEventListener("click", () => { pageOffset = 0; loadData(); });
  $("btnPrev").addEventListener("click", () => { pageOffset = Math.max(0, pageOffset - 50); loadData(); });
  $("btnNext").addEventListener("click", () => { pageOffset += 50; loadData(); });
  $("btnExport").addEventListener("click", exportCsvCurrentPage);
  $("btnLogout").addEventListener("click", reset);

  // Enter to load
  $("adminToken").addEventListener("keydown", (e) => { if (e.key === "Enter") loadData(); });
  $("searchInput").addEventListener("keydown", (e) => { if (e.key === "Enter") loadData(); });
});
