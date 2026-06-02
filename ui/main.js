// ClaudeCrew UI — Tauri 글로벌 API 사용 (withGlobalTauri: true)
// GitHub Pages 등 브라우저에서 백엔드 없이 열렸을 때는 '데모 모드'로 폴백한다.
const DEMO = !(window.__TAURI__ && window.__TAURI__.core);
const { invoke, listen, dialog } = DEMO
  ? makeDemoApi()
  : { invoke: window.__TAURI__.core.invoke, listen: window.__TAURI__.event.listen, dialog: window.__TAURI__.dialog };

// 백엔드 없이도 인터페이스를 체험할 수 있는 목업 API
function makeDemoApi(){
  const listeners = {};
  const on = (name, cb) => { (listeners[name] = listeners[name] || []).push(cb); return Promise.resolve(() => {}); };
  const emit = (name, payload) => (listeners[name] || []).forEach(cb => cb({ payload }));
  const agents = {};
  let n = 0;
  const sample = ["▶ 세션 시작", "🔧 Read", "관련 코드를 찾아 원인을 분석했어요…", "🔧 Edit", "수정을 적용했어요. 끝!"];
  function demoRun(args){
    const id = "demo" + (++n);
    const a = { id, branch: "demo-" + n, prompt: args.prompt || "데모 작업", model: args.model || "sonnet",
                permission: args.permission || "acceptEdits", status: "creating", cost: null, output: [] };
    agents[id] = a;
    emit("agent_update", { ...a });
    setTimeout(() => { a.status = "running"; emit("agent_update", { ...a }); }, 400);
    sample.forEach((line, i) => setTimeout(() => emit("agent_output", { id, text: line }), 800 + i * 600));
    setTimeout(() => { a.status = "done"; a.cost = 0.0123; emit("agent_done", { ...a }); }, 800 + sample.length * 600 + 400);
    return Promise.resolve(id);
  }
  const invoke = (cmd, args = {}) => {
    switch (cmd){
      case "check_claude":      return Promise.resolve("데모 모드 (브라우저 미리보기)");
      case "setup_environment": return Promise.resolve("데모: 실제 설치는 데스크톱 앱에서 진행됩니다.");
      case "get_cost_cap":      return Promise.resolve(5);
      case "set_cost_cap":      return Promise.resolve();
      case "list_agents":       return Promise.resolve([]);
      case "get_diff":          return Promise.resolve(
        "diff --git a/src/login.js b/src/login.js\n--- a/src/login.js\n+++ b/src/login.js\n@@ -10,7 +10,8 @@\n function onLogin(){\n-  btn.onclick = null;\n+  btn.addEventListener('click', submit);\n+  btn.disabled = false;\n }\n" +
        "diff --git a/README.md b/README.md\n--- a/README.md\n+++ b/README.md\n@@ -1,2 +1,3 @@\n # 내 프로젝트\n+로그인 버튼 문제를 고쳤어요.\n");
      case "commit_agent":      return Promise.resolve("데모: 실제 저장(commit)은 데스크톱 앱에서 됩니다.");
      case "stop_agent":        if (agents[args.id]) { agents[args.id].status = "stopped"; emit("agent_update", { ...agents[args.id] }); } return Promise.resolve();
      case "cleanup_agent":     emit("agent_removed", { id: args.id }); return Promise.resolve();
      case "create_agent":      return demoRun(args);
      default:                  return Promise.resolve(null);
    }
  };
  const dialog = { open: () => Promise.resolve("/데모/내-프로젝트") };
  return { invoke, listen: on, dialog };
}

const $ = (s) => document.querySelector(s);
const state = new Map();        // id -> agent
let repoPath = localStorage.getItem("cc_repo") || "";
let checkedOk = false, folderOk = !!repoPath, setupOk = localStorage.getItem("cc_setup") === "1";

const STATUS_KO = { creating: "준비 중", running: "일하는 중", done: "끝남", error: "오류", stopped: "멈춤", committed: "저장됨" };
const RECIPES = {
  bug:     { speed: "sonnet", perm: "acceptEdits", agent: "debugger",      text: "다음 문제를 고쳐주세요: " },
  feature: { speed: "sonnet", perm: "acceptEdits", agent: "implementer",   text: "다음 기능을 추가해주세요: " },
  explain: { speed: "haiku",  perm: "plan",        agent: "librarian",     text: "다음 코드를 쉬운 말로 설명해주세요: " },
  test:    { speed: "sonnet", perm: "acceptEdits", agent: "implementer",   text: "다음 대상에 대한 테스트를 만들고 실행해주세요: " },
  cleanup: { speed: "sonnet", perm: "acceptEdits", agent: "implementer",   text: "다음을 안전한 범위에서 정리·리팩터링해주세요(동작은 그대로): " },
  review:  { speed: "sonnet", perm: "plan",        agent: "code-reviewer", text: "다음 코드/변경을 검토하고 개선점을 알려주세요: " },
};

function esc(s){return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
function markTool(t){return esc(t).replace(/🔧[^\n]*/g,m=>'<span class="tool">'+m+'</span>');}

// ---------- 온보딩 ----------
function refreshWizard(){
  $("#step1").classList.toggle("done", checkedOk);
  $("#step2").classList.toggle("done", folderOk);
  $("#step3").classList.toggle("done", setupOk);
  $("#btnStart").disabled = !(checkedOk && folderOk && setupOk);
  if (folderOk) $("#folderStatus").textContent = repoPath, $("#folderStatus").className = "status ok";
}

$("#btnCheck").addEventListener("click", async () => {
  $("#checkStatus").textContent = "확인 중…"; $("#checkStatus").className = "status";
  try {
    const v = await invoke("check_claude");
    checkedOk = true;
    $("#checkStatus").textContent = "확인됨 · " + v; $("#checkStatus").className = "status ok";
  } catch (e) {
    checkedOk = false;
    $("#checkStatus").textContent = String(e); $("#checkStatus").className = "status bad";
  }
  refreshWizard();
});

$("#btnFolder").addEventListener("click", async () => {
  const picked = await dialog.open({ directory: true, multiple: false, title: "작업할 폴더 고르기" });
  if (picked) { repoPath = picked; folderOk = true; localStorage.setItem("cc_repo", repoPath); refreshWizard(); }
});

$("#btnSetup").addEventListener("click", async () => {
  $("#setupStatus").textContent = "설치 중…"; $("#setupStatus").className = "status";
  try {
    const msg = await invoke("setup_environment");
    setupOk = true; localStorage.setItem("cc_setup", "1");
    $("#setupStatus").textContent = msg; $("#setupStatus").className = "status ok";
  } catch (e) {
    $("#setupStatus").textContent = String(e); $("#setupStatus").className = "status bad";
  }
  refreshWizard();
});

$("#btnStart").addEventListener("click", () => {
  $("#onboarding").classList.add("hidden");
  $("#app").classList.remove("hidden");
  enterApp();
});

// ---------- 메인 ----------
function enterApp(){
  $("#folderLabel").textContent = repoPath || "폴더 없음";
  loadAgents();
  invoke("get_cost_cap").then(v => { if (v != null) $("#costCap").value = v; }).catch(()=>{});
}

// 비용 상한 변경 → 백엔드에 반영, 경고 배너 숨김
$("#costCap").addEventListener("change", () => {
  const v = parseFloat($("#costCap").value);
  invoke("set_cost_cap", { value: isNaN(v) ? 0 : v }).catch(()=>{});
  $("#costBanner").classList.add("hidden");
});

// "검색 켜기" 토글 → 프로젝트 .mcp.json 에 공식 문서 검색(context7) 연결/해제
$("#tglSearch").addEventListener("change", async (e) => {
  if (!repoPath) { e.target.checked = false; alert("먼저 폴더를 선택하세요."); return; }
  try {
    const res = await invoke(e.target.checked ? "enable_search" : "disable_search", { repo: repoPath });
    if (typeof res === "string" && !DEMO) showHint(res);
  } catch (err) { alert("검색 설정 실패: " + err); e.target.checked = !e.target.checked; }
});

function showHint(msg){
  const b = $("#costBanner");
  b.textContent = msg; b.classList.remove("hidden");
  setTimeout(() => b.classList.add("hidden"), 3500);
}

$("#btnChangeFolder").addEventListener("click", async () => {
  const picked = await dialog.open({ directory: true, multiple: false, title: "작업할 폴더 고르기" });
  if (picked) { repoPath = picked; localStorage.setItem("cc_repo", repoPath); $("#folderLabel").textContent = repoPath; }
});

document.querySelectorAll(".recipe").forEach(b => b.addEventListener("click", () => {
  const r = RECIPES[b.dataset.r];
  $("#speed").value = r.speed;
  const cur = $("#prompt").value.trim();
  if (!cur || Object.values(RECIPES).some(x => cur.startsWith(x.text.trim()))) $("#prompt").value = r.text;
  $("#prompt").dataset.perm = r.perm;
  if (r.agent) $("#prompt").dataset.agent = r.agent; else delete $("#prompt").dataset.agent;
  $("#prompt").focus();
}));

$("#btnRun").addEventListener("click", async () => {
  const prompt = $("#prompt").value.trim();
  if (!repoPath) { alert("먼저 폴더를 선택하세요."); return; }
  if (!prompt) { alert("무엇을 부탁할지 적어주세요."); return; }
  const model = $("#speed").value;
  const permission = $("#prompt").dataset.perm || "acceptEdits";
  const agent = $("#prompt").dataset.agent || null;
  const keepgoing = $("#tglKeep").checked;
  const team = $("#tglTeam").checked;
  try {
    await invoke("create_agent", { repo: repoPath, prompt, model, permission, branch: null, agent, keepgoing, team });
    $("#prompt").value = ""; delete $("#prompt").dataset.perm; delete $("#prompt").dataset.agent;
  } catch (e) { alert("실행 실패: " + e); }
});

async function loadAgents(){
  try {
    const list = await invoke("list_agents");
    state.clear(); list.forEach(a => state.set(a.id, a)); render();
  } catch (_) {}
}

function costTotal(){
  let s = 0; state.forEach(a => { if (a.cost) s += a.cost; });
  return s;
}

function render(){
  const board = $("#board");
  const total = costTotal();
  $("#costTotal").textContent = "$" + total.toFixed(2);
  const cap = parseFloat($("#costCap")?.value);
  $("#costTotal").classList.toggle("warn", !isNaN(cap) && cap > 0 && total >= cap * 0.8);
  if (state.size === 0){ board.innerHTML = '<div class="empty" id="emptyMsg">아직 맡긴 일이 없어요. 위에서 레시피를 고르거나 부탁을 적고 ▶ 를 눌러보세요.</div>'; return; }
  board.innerHTML = "";
  [...state.values()].forEach(a => {
    const logHtml = (a.output || []).map(markTool).join("\n");
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="top">
        <span class="pill ${a.status}">${STATUS_KO[a.status] || a.status}</span>
        <span class="title">${esc(a.branch)}</span>
        ${a.cost != null ? `<span class="cost">$${Number(a.cost).toFixed(4)}</span>` : ""}
      </div>
      <div class="ask">${esc(a.prompt)}</div>
      <div class="log" id="log-${a.id}">${logHtml}</div>
      <div class="acts">
        <button data-act="diff">바뀐 점</button>
        <button data-act="apply" class="primary">적용하기</button>
        <button data-act="stop">멈추기</button>
        <button data-act="cleanup">되돌리기</button>
      </div>`;
    card.querySelector('[data-act="diff"]').onclick = () => viewDiff(a.id);
    card.querySelector('[data-act="apply"]').onclick = () => applyChanges(a.id);
    card.querySelector('[data-act="stop"]').onclick = () => invoke("stop_agent", { id: a.id });
    card.querySelector('[data-act="cleanup"]').onclick = () => {
      if (confirm("이 작업의 변경을 모두 버리고 되돌릴까요?")) invoke("cleanup_agent", { id: a.id });
    };
    board.appendChild(card);
    const log = card.querySelector(".log"); log.scrollTop = log.scrollHeight;
  });
}

// ---------- 적용하기(변경 저장) ----------
async function applyChanges(id){
  const a = state.get(id);
  const suggested = a ? ("ClaudeCrew: " + (a.prompt || "").trim().slice(0, 50)) : "";
  const message = prompt("변경 저장 메시지(비우면 자동):", suggested);
  if (message === null) return;        // 취소
  try {
    const res = await invoke("commit_agent", { id, message: message || "" });
    alert(res);
  } catch (e) {
    alert("저장 실패: " + e);
  }
}

// ---------- 바뀐 점 (거시→미시: 요약 → 파일 → 줄) ----------
// unified diff 문자열을 파일별로 쪼개 +/- 줄 수를 센다.
function parseDiff(diff){
  const files = [];
  const chunks = diff.split(/^diff --git .*$/m).filter(c => c.trim());
  // split 은 헤더 줄을 제거하므로, 헤더의 파일명을 따로 뽑기 위해 다시 매칭
  const headers = diff.match(/^diff --git a\/(.*?) b\/(.*)$/gm) || [];
  chunks.forEach((body, i) => {
    let name = "(파일)";
    const h = headers[i];
    if (h){ const m = h.match(/ b\/(.*)$/); if (m) name = m[1]; }
    else { const m = body.match(/\+\+\+ b\/(.*)/); if (m) name = m[1]; }
    let adds = 0, dels = 0;
    body.split("\n").forEach(l => {
      if (l.startsWith("+") && !l.startsWith("+++")) adds++;
      else if (l.startsWith("-") && !l.startsWith("---")) dels++;
    });
    files.push({ name, adds, dels, body });
  });
  return files;
}

function renderDiffLine(l){
  const e = esc(l);
  if (l.startsWith("+") && !l.startsWith("+++")) return '<span class="diff-add">'+e+'</span>';
  if (l.startsWith("-") && !l.startsWith("---")) return '<span class="diff-del">'+e+'</span>';
  if (l.startsWith("@@") || l.startsWith("index ") || l.startsWith("+++") || l.startsWith("---")) return '<span class="diff-meta">'+e+'</span>';
  return e;
}

async function viewDiff(id){
  $("#diffTitle").textContent = (state.get(id)?.branch || "") + " — 바뀐 점";
  $("#diffSummary").innerHTML = "";
  $("#diffBody").innerHTML = "불러오는 중…";
  $("#diffModal").classList.remove("hidden");
  try {
    const diff = await invoke("get_diff", { id });
    if (!diff || diff.trim() === "(바뀐 점 없음)"){
      $("#diffSummary").textContent = "바뀐 점이 없어요.";
      $("#diffBody").innerHTML = "";
      return;
    }
    const files = parseDiff(diff);
    const totalAdd = files.reduce((s,f)=>s+f.adds,0), totalDel = files.reduce((s,f)=>s+f.dels,0);
    $("#diffSummary").innerHTML = `이번에 <b>파일 ${files.length}개</b>가 바뀌어요. <span class="diff-add">+${totalAdd}</span> <span class="diff-del">-${totalDel}</span> · 파일을 클릭하면 자세히 볼 수 있어요.`;
    $("#diffBody").innerHTML = files.map((f, i) => `
      <div class="diff-file">
        <div class="diff-file-h" data-i="${i}">
          <span class="caret">▸</span>
          <span class="fname">${esc(f.name)}</span>
          <span class="fcount"><span class="diff-add">+${f.adds}</span> <span class="diff-del">-${f.dels}</span></span>
        </div>
        <pre class="diff-file-b hidden" id="dfb-${i}">${f.body.split("\n").map(renderDiffLine).join("\n")}</pre>
      </div>`).join("");
    $("#diffBody").querySelectorAll(".diff-file-h").forEach(h => h.onclick = () => {
      const body = document.getElementById("dfb-" + h.dataset.i);
      const open = body.classList.toggle("hidden");
      h.querySelector(".caret").textContent = open ? "▸" : "▾";
    });
  } catch (e) { $("#diffSummary").textContent = ""; $("#diffBody").textContent = String(e); }
}
$("#diffClose").addEventListener("click", () => $("#diffModal").classList.add("hidden"));

// ---------- 이벤트 수신 ----------
listen("agent_update", (ev) => { const a = ev.payload; const cur = state.get(a.id) || {}; state.set(a.id, { ...cur, ...a, output: cur.output || [] }); render(); });
listen("agent_output", (ev) => {
  const { id, text } = ev.payload; const a = state.get(id); if (!a) return;
  (a.output = a.output || []).push(text);
  const log = document.getElementById("log-" + id);
  if (log) { log.insertAdjacentHTML("beforeend", (log.innerHTML ? "\n" : "") + markTool(text)); log.scrollTop = log.scrollHeight; }
  else render();
});
listen("agent_done", (ev) => { const a = ev.payload; const cur = state.get(a.id) || {}; state.set(a.id, { ...cur, ...a, output: cur.output || [] }); render(); });
listen("agent_removed", (ev) => { state.delete(ev.payload.id); render(); });
listen("cost_capped", (ev) => {
  const { total, cap } = ev.payload || {};
  const b = $("#costBanner");
  b.textContent = `⚠ 비용 상한 $${Number(cap).toFixed(2)} 도달(현재 $${Number(total).toFixed(2)}) — 진행 중인 작업을 멈췄어요. 계속하려면 위에서 상한을 올리세요.`;
  b.classList.remove("hidden");
  loadAgents();
});

// ---------- 시작 ----------
if (DEMO) {
  const d = document.createElement("div");
  d.className = "demo-badge";
  d.textContent = "🖥️ 데모 모드 — 화면 미리보기예요. 실제 작업(파일 수정·저장)은 데스크톱 앱에서 동작해요.";
  document.body.appendChild(d);
}
refreshWizard();
if (checkedOk && folderOk && setupOk) { /* 이전 온보딩 완료 시에도 안전 위해 다시 보여줌 */ }
