// ===== CONFIG (chỉ cần sửa 1 dòng) =====
const ADMIN_FUNCTION_URL = "https://wphojcbtmdtiifczfcqd.supabase.co/functions/v1/admin-spins";
// =======================================

const $ = (id) => document.getElementById(id);

let state = {
  offset: 0,
  lastRows: [],
};

function setMsg(text, isError = false) {
  const el = $("msg");
  el.textContent = text || "";
  el.style.color = isError ? "#ff6b6b" : "rgba(255,255,255,.75)";
}

function getToken() {
  return (sessionStorage.getItem("ADMIN_TOKEN") || "").trim();
}

function setToken(v) {
  const val = (v || "").trim();
  if (val) sessionStorage.setItem("ADMIN_TOKEN", val);
  $("token").value = val ? "********" : "";
}

function authHeaders() {
  const t = getToken();
  return {
    "Authorization": `Bearer ${t}`,
    "Content-Type": "application/json",
  };
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pill(status) {
  const cls =
    status === "WIN" ? "win" :
    status === "LOSE" ? "lose" :
    "already";
  return `<span class="pill ${cls}">${esc(status)}</span>`;
}

function toCSV(rows) {
  const cols = ["created_at","name","identifier","status","prize","note","ip","ua","id"];
  const head = cols.join(",");
  const lines = rows.map(r => cols.map(c => {
    const v = (r?.[c] ?? "");
    const s = String(v).replaceAll('"','""');
    return `"${s}"`;
  }).join(","));
  return [head, ...lines].join("\n");
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildQuery({ offset }) {
  const url = new URL(ADMIN_FUNCTION_URL);
  url.searchParams.set("limit", $("limit").value);
  url.searchParams.set("offset", String(offset));

  const q = $("q").value.trim();
  const status = $("status").value.trim();
  const from = $("from").value.trim();
  const to = $("to").value.trim();

  if (q) url.searchParams.set("q", q);
  if (status) url.searchParams.set("status", status);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);

  return url.toString();
}

async function loadData({ resetOffset = false } = {}) {
  try {
    setMsg("Đang tải dữ liệu...");
    const tokenField = $("token").value.trim();
    // nếu user vừa dán token thật (không phải ********) thì lưu lại
    if (tokenField && tokenField !== "********") setToken(tokenField);

    if (!getToken()) {
      setMsg("Chưa có ADMIN_TOKEN. Dán token rồi bấm Tải dữ liệu.", true);
      return;
    }

    if (resetOffset) state.offset = 0;

    const url = buildQuery({ offset: state.offset });
    const res = await fetch(url, { method: "GET", headers: authHeaders() });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      setMsg(`Lỗi tải dữ liệu (${res.status}).`, true);
      return;
    }
    if (!json.ok) {
      setMsg(`Không OK: ${json.error || "UNKNOWN"}`, true);
      return;
    }

    $("total").textContent = String(json.count ?? 0);
    state.lastRows = json.data || [];
    renderRows(state.lastRows);

    const shown = state.lastRows.length;
    setMsg(`OK • offset=${state.offset} • hiển thị ${shown} dòng`);
  } catch (e) {
    setMsg(`Lỗi: ${String(e?.message || e)}`, true);
  }
}

function renderRows(rows) {
  const tbody = $("tbody");
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="muted">Không có dữ liệu.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => {
    return `
      <tr>
        <td class="mono">${esc(r.created_at)}</td>
        <td>${esc(r.name)}</td>
        <td class="mono">${esc(r.identifier)}</td>
        <td>${pill(r.status)}</td>
        <td>${esc(r.prize || "")}</td>
        <td>${esc(r.note || "")}</td>
        <td class="mono">${esc(r.ip || "")}</td>
        <td class="mono muted" title="${esc(r.ua || "")}">${esc((r.ua || "").slice(0, 28))}${(r.ua||"").length>28?"…":""}</td>
        <td class="mono">${esc(r.id)}</td>
      </tr>
    `;
  }).join("");
}

async function loadStats() {
  try {
    setMsg("Đang lấy thống kê...");
    if (!getToken()) {
      setMsg("Chưa có ADMIN_TOKEN.", true);
      return;
    }
    const url = new URL(ADMIN_FUNCTION_URL);
    url.searchParams.set("mode", "stats");

    const res = await fetch(url.toString(), { method: "GET", headers: authHeaders() });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j || !j.ok) {
      setMsg(`Lỗi thống kê (${res.status}).`, true);
      return;
    }
    const d = j.data || {};
    setMsg(`Stats • total=${d.total} • WIN=${d.WIN} • LOSE=${d.LOSE} • ALREADY=${d.ALREADY_SPUN}`);
  } catch (e) {
    setMsg(`Lỗi: ${String(e?.message || e)}`, true);
  }
}

// Wire events
$("btnLoad").addEventListener("click", () => loadData({ resetOffset: true }));
$("btnPrev").addEventListener("click", async () => {
  const limit = parseInt($("limit").value, 10);
  state.offset = Math.max(state.offset - limit, 0);
  await loadData();
});
$("btnNext").addEventListener("click", async () => {
  const limit = parseInt($("limit").value, 10);
  state.offset = state.offset + limit;
  await loadData();
});
$("btnStats").addEventListener("click", loadStats);
$("btnCsv").addEventListener("click", () => {
  if (!state.lastRows.length) return setMsg("Không có dữ liệu để export.", true);
  const csv = toCSV(state.lastRows);
  download(`spins_page_offset_${state.offset}.csv`, csv);
  setMsg("Đã export CSV (trang hiện tại).");
});
$("btnLogout").addEventListener("click", () => {
  sessionStorage.removeItem("ADMIN_TOKEN");
  setToken("");
  $("tbody").innerHTML = "";
  $("total").textContent = "0";
  setMsg("Đã đăng xuất.");
});

// auto-fill token if exists
if (getToken()) setToken(getToken());
setMsg("Dán ADMIN_TOKEN rồi bấm “Tải dữ liệu”.");
