// ClaudeCrew UI — Tauri 글로벌 API 사용 (withGlobalTauri: true)
// GitHub Pages 등 브라우저에서 백엔드 없이 열렸을 때는 '데모 모드'로 폴백한다.
const DEMO = !(window.__TAURI__ && window.__TAURI__.core);
const { invoke, listen, dialog } = DEMO
  ? makeDemoApi()
  : { invoke: window.__TAURI__.core.invoke, listen: window.__TAURI__.event.listen, dialog: window.__TAURI__.dialog };

// ---------- 다국어 (i18n) ----------
const I18N = {
  ko: {
    lead: "AI 전문가 팀에게 일을 맡기는 가장 쉬운 길.<br/>3단계만 따라오면 준비 끝!",
    step1_h: "Claude 준비 확인", step1_p: "컴퓨터에 Claude Code가 설치·로그인되어 있는지 확인해요.", btnCheck: "확인하기",
    step2_h: "작업할 폴더 고르기", step2_p: "AI가 작업할 프로젝트 폴더를 골라요.", btnFolder: "폴더 선택",
    step3_h: "준비 완료", step3_p: "전문가 팀을 설치하고 안전 설정을 켜요. (자동)", btnSetup: "전문가 설치",
    btnStart: "시작하기 →", noFolder: "폴더 없음", changeFolder: "폴더 변경",
    cap: "상한 $", capTitle: "이번 세션 비용이 이 금액에 닿으면 진행 중인 작업을 자동으로 멈춰요",
    usage: "사용량 ", usageTitle: "이번 세션 예상 사용량",
    apiHint: "⚡ 많이 쓰는 중 — API 키 연결을 권해요", apiHintTitle: "여러 작업을 동시에 돌리면 구독 한도를 빨리 써요",
    apiMode: "✓ API 모드", apiModeTitle: "환경에 API 키가 설정되어 API 경로로 동작 중이에요",
    r_bug: "🐞 버그 고치기", r_feature: "✨ 기능 추가", r_explain: "📖 코드 설명", r_test: "🧪 테스트 만들기",
    r_cleanup: "🧹 정리·리팩터링", r_review: "🔍 코드 검토", r_plan: "🧠 계획 세우기", r_security: "🛡️ 보안 점검", r_gate: "🚦 배포 전 검토",
    recipeNew: "＋ 레시피 만들기", recipeExport: "↧ 레시피 내보내기", exportTitle: "레시피 묶음을 파일로 내보내요",
    recipeImport: "↥ 레시피 가져오기", importTitle: "공유받은 레시피 묶음(JSON)을 추가해요",
    promptPh: "무엇을 부탁할까요? 예) 로그인 버튼이 안 눌려요. 고쳐주세요.",
    speedLabel: "꼼꼼함", speedFast: "빠르게", speedNormal: "보통", speedCareful: "꼼꼼하게",
    keepMode: "끝까지 모드", keepTitle: "멈추지 않고 끝까지 하도록 한 번 더 점검해요",
    searchOn: "검색 켜기", searchTitle: "공식 문서 검색(context7)을 켜요",
    exaKey: "웹검색 키", exaTitle: "웹검색(Exa) API 키 입력 — 본인 키만 사용",
    teamMode: "팀에게 맡기기", teamTitle: "팀장이 전문가들에게 나눠 맡겨요",
    lspMode: "정밀 편집", lspTitle: "LSP 기반 정밀 편집 도구(MCP)를 켜요",
    safeLock: "🔒 안전", safetyTitle: "AI가 어디까지 할 수 있는지 정해요",
    safeFolder: "이 폴더만", safeRead: "읽기만", safeFull: "전체 허용",
    run: "▶ 전문가에게 맡기기", empty: "아직 맡긴 일이 없어요. 위에서 레시피를 고르거나 부탁을 적고 ▶ 를 눌러보세요.",
    diffTitle: "바뀐 점", diffClose: "✕ 닫기",
    recipeNewTitle: "새 레시피 만들기", rfName: "이름", rfEmoji: "이모지", rfText: "부탁 문구",
    rfAgent: "전문가", rfSpeed: "꼼꼼함", rfPerm: "안전", rfSave: "저장", rfDelete: "이 레시피 삭제",
    // 동적
    status_creating: "준비 중", status_running: "일하는 중", status_done: "끝남", status_error: "오류", status_stopped: "멈춤", status_committed: "저장됨",
    checking: "확인 중…", checkedPrefix: "확인됨 · ", installing: "설치 중…",
    pickFolderTitle: "작업할 폴더 고르기",
    needFolder: "먼저 폴더를 선택하세요.", needPrompt: "무엇을 부탁할지 적어주세요.", runFail: "실행 실패: ",
    searchFail: "검색 설정 실패: ", exaPrompt: "Exa 웹검색 API 키를 입력하세요(비우면 끄기). exa.ai 에서 발급받을 수 있어요:", opFail: "실패: ",
    saveMsgPrompt: "변경 저장 메시지(비우면 자동):", saveFail: "저장 실패: ",
    cleanupConfirm: "이 작업의 변경을 모두 버리고 되돌릴까요?",
    safetyConfirm: "‘전체 허용’은 위험할 수 있어요. AI가 이 폴더 밖이나 시스템 변경도 시도할 수 있습니다. 정말 켤까요?",
    exportPrompt: "아래 JSON을 복사해 공유하세요:", importPrompt: "레시피 묶음(JSON)을 붙여넣으세요:",
    badJson: "JSON 형식이 올바르지 않아요.", noRecipe: "레시피를 찾을 수 없어요.",
    added: "레시피 {0}개를 추가했어요.", addedNone: "추가할 새 레시피가 없어요(내장과 겹치거나 형식 누락).",
    mates: "팀원", preview: "미리보기 :{0}",
    diffSuffix: " — 바뀐 점", diffLoading: "불러오는 중…", diffNone: "바뀐 점이 없어요.",
    diffSummary: "이번에 <b>파일 {0}개</b>가 바뀌어요. <span class='diff-add'>+{1}</span> <span class='diff-del'>-{2}</span> · 파일을 클릭하면 자세히 볼 수 있어요.",
    capped: "⚠ 비용 상한 ${0} 도달(현재 ${1}) — 진행 중인 작업을 멈췄어요. 계속하려면 위에서 상한을 올리세요.",
    demoBadge: "🖥️ 데모 모드 — 화면 미리보기예요. 실제 작업(파일 수정·저장)은 데스크톱 앱에서 동작해요.",
    demoCheck: "데모 모드 (브라우저 미리보기)", demoSetup: "데모: 실제 설치는 데스크톱 앱에서 진행됩니다.", demoCommit: "데모: 실제 저장(commit)은 데스크톱 앱에서 됩니다.",
    rfNeedName: "이름과 부탁 문구를 적어주세요.", rfSaved: "레시피를 저장했어요.", rfDeleted: "레시피를 삭제했어요.",
    rtext_bug: "다음 문제를 고쳐주세요: ", rtext_feature: "다음 기능을 추가해주세요: ",
    rtext_explain: "다음 코드를 쉬운 말로 설명해주세요: ", rtext_test: "다음 대상에 대한 테스트를 만들고 실행해주세요: ",
    rtext_cleanup: "다음을 안전한 범위에서 정리·리팩터링해주세요(동작은 그대로): ", rtext_review: "다음 코드/변경을 검토하고 개선점을 알려주세요: ",
    rtext_plan: "다음 작업을 hyperplan(적대적 다중 에이전트 계획)으로 계획 세워주세요: ", rtext_security: "다음을 security-research 스킬로 보안 점검해주세요(보고만, 파일 미수정): ",
    rtext_gate: "현재 변경을 pre-publish-review 스킬로 배포 전에 여러 관점으로 병렬 검토해주세요(막음 항목이 있으면 보류): ",
  },
  en: {
    lead: "The easiest way to hand work to a team of AI experts.<br/>Just 3 steps to get started!",
    step1_h: "Check Claude", step1_p: "Check that Claude Code is installed and logged in on your computer.", btnCheck: "Check",
    step2_h: "Pick a folder", step2_p: "Choose the project folder the AI will work in.", btnFolder: "Select folder",
    step3_h: "All set", step3_p: "Install the expert team and turn on safety settings. (automatic)", btnSetup: "Install experts",
    btnStart: "Start →", noFolder: "No folder", changeFolder: "Change folder",
    cap: "Cap $", capTitle: "Auto-pauses running work when this session's cost reaches this amount",
    usage: "Usage ", usageTitle: "Estimated cost this session",
    apiHint: "⚡ Heavy use — consider connecting an API key", apiHintTitle: "Running many tasks at once burns through your subscription quota fast",
    apiMode: "✓ API mode", apiModeTitle: "An API key is set in the environment, so it's running via the API path",
    r_bug: "🐞 Fix a bug", r_feature: "✨ Add a feature", r_explain: "📖 Explain code", r_test: "🧪 Write tests",
    r_cleanup: "🧹 Clean up", r_review: "🔍 Review code", r_plan: "🧠 Make a plan", r_security: "🛡️ Security check", r_gate: "🚦 Pre-publish review",
    recipeNew: "＋ New recipe", recipeExport: "↧ Export recipes", exportTitle: "Export your recipe pack to a file",
    recipeImport: "↥ Import recipes", importTitle: "Add a shared recipe pack (JSON)",
    promptPh: "What can I do for you? e.g. The login button doesn't work — please fix it.",
    speedLabel: "Care", speedFast: "Fast", speedNormal: "Normal", speedCareful: "Careful",
    keepMode: "Finish-it mode", keepTitle: "Nudges the AI to double-check and finish instead of stopping early",
    searchOn: "Search on", searchTitle: "Turn on official docs search (context7)",
    exaKey: "Web key", exaTitle: "Enter your Exa web-search API key — your own key only",
    teamMode: "Hand to a team", teamTitle: "A lead splits the work among experts",
    lspMode: "Precise edit", lspTitle: "Turn on LSP-based precise editing tools (MCP)",
    safeLock: "🔒 Safety", safetyTitle: "Decide how far the AI is allowed to go",
    safeFolder: "This folder only", safeRead: "Read only", safeFull: "Allow all",
    run: "▶ Hand to an expert", empty: "No tasks yet. Pick a recipe above or type a request and press ▶.",
    diffTitle: "Changes", diffClose: "✕ Close",
    recipeNewTitle: "Create a recipe", rfName: "Name", rfEmoji: "Emoji", rfText: "Request text",
    rfAgent: "Expert", rfSpeed: "Care", rfPerm: "Safety", rfSave: "Save", rfDelete: "Delete this recipe",
    status_creating: "Preparing", status_running: "Working", status_done: "Done", status_error: "Error", status_stopped: "Stopped", status_committed: "Saved",
    checking: "Checking…", checkedPrefix: "OK · ", installing: "Installing…",
    pickFolderTitle: "Pick a folder to work in",
    needFolder: "Please select a folder first.", needPrompt: "Please write what you'd like done.", runFail: "Run failed: ",
    searchFail: "Search setup failed: ", exaPrompt: "Enter your Exa web-search API key (empty to turn off). Get one at exa.ai:", opFail: "Failed: ",
    saveMsgPrompt: "Save message (empty = auto):", saveFail: "Save failed: ",
    cleanupConfirm: "Discard all changes from this task and revert?",
    safetyConfirm: "'Allow all' can be risky. The AI may try to change things outside this folder or your system. Really enable it?",
    exportPrompt: "Copy the JSON below to share:", importPrompt: "Paste a recipe pack (JSON):",
    badJson: "That isn't valid JSON.", noRecipe: "No recipes found.",
    added: "Added {0} recipe(s).", addedNone: "No new recipes to add (duplicate of built-ins or missing fields).",
    mates: "Team", preview: "Preview :{0}",
    diffSuffix: " — Changes", diffLoading: "Loading…", diffNone: "No changes.",
    diffSummary: "<b>{0} file(s)</b> changed. <span class='diff-add'>+{1}</span> <span class='diff-del'>-{2}</span> · Click a file to see details.",
    capped: "⚠ Cost cap ${0} reached (now ${1}) — running work was stopped. Raise the cap above to continue.",
    demoBadge: "🖥️ Demo mode — this is a UI preview. Real work (editing/saving files) runs in the desktop app.",
    demoCheck: "Demo mode (browser preview)", demoSetup: "Demo: real install happens in the desktop app.", demoCommit: "Demo: real saving (commit) happens in the desktop app.",
    rfNeedName: "Please enter a name and request text.", rfSaved: "Recipe saved.", rfDeleted: "Recipe deleted.",
    rtext_bug: "Please fix the following problem: ", rtext_feature: "Please add the following feature: ",
    rtext_explain: "Please explain the following code in plain language: ", rtext_test: "Please write and run tests for the following: ",
    rtext_cleanup: "Please clean up / refactor the following safely (keep behavior the same): ", rtext_review: "Please review the following code/change and suggest improvements: ",
    rtext_plan: "Please plan the following task using hyperplan (adversarial multi-agent planning): ", rtext_security: "Please do a security check on the following with the security-research skill (report only, no edits): ",
    rtext_gate: "Please run a pre-publish review on the current changes with the pre-publish-review skill (parallel, multi-perspective; hold if any blocker): ",
  },
};
let lang = localStorage.getItem("cc_lang") || "ko";
function t(key, ...args){
  let s = (I18N[lang] && I18N[lang][key]) ?? I18N.ko[key] ?? key;
  args.forEach((a, i) => { s = s.replace("{" + i + "}", a); });
  return s;
}
function applyI18n(){
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); });
  const lb = $("#btnLang"); if (lb) lb.textContent = lang === "ko" ? "EN" : "한국어";
  if ($("#folderLabel")) $("#folderLabel").textContent = repoPath || t("noFolder");
  renderCustomRecipes();
  if (state && state.size) render();
  const badge = document.querySelector(".demo-badge"); if (badge) badge.textContent = t("demoBadge");
}

// 백엔드 없이도 인터페이스를 체험할 수 있는 목업 API
function makeDemoApi(){
  const listeners = {};
  const on = (name, cb) => { (listeners[name] = listeners[name] || []).push(cb); return Promise.resolve(() => {}); };
  const emit = (name, payload) => (listeners[name] || []).forEach(cb => cb({ payload }));
  const agents = {};
  let n = 0;
  function demoRun(args){
    const sample = ["▶ " + t("status_running"), "🔧 Read", lang === "ko" ? "관련 코드를 찾아 원인을 분석했어요…" : "Found related code and analyzed the cause…",
                    "🔧 Edit", lang === "ko" ? "수정을 적용했어요. 끝!" : "Applied the fix. Done!"];
    const id = "demo" + (++n);
    const a = { id, branch: "demo-" + n, prompt: args.prompt || "demo", model: args.model || "sonnet",
                permission: args.permission || "acceptEdits", status: "creating", cost: null, output: [] };
    agents[id] = a;
    emit("agent_update", { ...a });
    setTimeout(() => { a.status = "running"; emit("agent_update", { ...a }); }, 400);
    sample.forEach((line, i) => setTimeout(() => emit("agent_output", { id, text: line }), 800 + i * 600));
    if (args.team) {
      [["debugger", ""], ["implementer", ""], ["code-reviewer", ""]].forEach(([nm], i) => {
        setTimeout(() => emit("teammate_update", { agentId: id, name: nm, status: "working" }), 900 + i * 500);
        setTimeout(() => emit("teammate_update", { agentId: id, name: nm, status: "done" }), 1900 + i * 500);
      });
    }
    setTimeout(() => { a.port = 5173; emit("agent_update", { ...a }); }, 2200);
    setTimeout(() => { a.status = "done"; a.cost = 0.0123; emit("agent_done", { ...a }); }, 800 + sample.length * 600 + 400);
    return Promise.resolve(id);
  }
  const invoke = (cmd, args = {}) => {
    switch (cmd){
      case "check_claude":      return Promise.resolve(t("demoCheck"));
      case "setup_environment": return Promise.resolve(t("demoSetup"));
      case "get_cost_cap":      return Promise.resolve(5);
      case "set_cost_cap":      return Promise.resolve();
      case "list_agents":       return Promise.resolve([]);
      case "get_diff":          return Promise.resolve(
        "diff --git a/src/login.js b/src/login.js\n--- a/src/login.js\n+++ b/src/login.js\n@@ -10,7 +10,8 @@\n function onLogin(){\n-  btn.onclick = null;\n+  btn.addEventListener('click', submit);\n+  btn.disabled = false;\n }\n" +
        "diff --git a/README.md b/README.md\n--- a/README.md\n+++ b/README.md\n@@ -1,2 +1,3 @@\n # My Project\n+Fixed the login button issue.\n");
      case "commit_agent":      return Promise.resolve(t("demoCommit"));
      case "stop_agent":        if (agents[args.id]) { agents[args.id].status = "stopped"; emit("agent_update", { ...agents[args.id] }); } return Promise.resolve();
      case "cleanup_agent":     emit("agent_removed", { id: args.id }); return Promise.resolve();
      case "create_agent":      return demoRun(args);
      default:                  return Promise.resolve(null);
    }
  };
  const dialog = { open: () => Promise.resolve("/demo/my-project") };
  return { invoke, listen: on, dialog };
}

const $ = (s) => document.querySelector(s);
const state = new Map();        // id -> agent
let repoPath = localStorage.getItem("cc_repo") || "";
let checkedOk = false, folderOk = !!repoPath, setupOk = localStorage.getItem("cc_setup") === "1";

// 레시피: 메타데이터(텍스트는 i18n rtext_*), 커스텀은 customRecipes에 text 보관
const RECIPES = {
  bug:     { speed: "sonnet", perm: "acceptEdits", agent: "debugger" },
  feature: { speed: "sonnet", perm: "acceptEdits", agent: "implementer" },
  explain: { speed: "haiku",  perm: "plan",        agent: "librarian" },
  test:    { speed: "sonnet", perm: "acceptEdits", agent: "implementer" },
  cleanup: { speed: "sonnet", perm: "acceptEdits", agent: "implementer" },
  review:  { speed: "sonnet", perm: "plan",        agent: "code-reviewer" },
  plan:    { speed: "opus",   perm: "plan",        agent: null },
  security:{ speed: "sonnet", perm: "plan",        agent: "security" },
  gate:    { speed: "sonnet", perm: "plan",        agent: null },
};

function esc(s){return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
function markTool(t){return esc(t).replace(/🔧[^\n]*/g,m=>'<span class="tool">'+m+'</span>');}

// ---------- 언어 토글 ----------
$("#btnLang").addEventListener("click", () => {
  lang = lang === "ko" ? "en" : "ko";
  localStorage.setItem("cc_lang", lang);
  applyI18n();
});

// ---------- 온보딩 ----------
function refreshWizard(){
  $("#step1").classList.toggle("done", checkedOk);
  $("#step2").classList.toggle("done", folderOk);
  $("#step3").classList.toggle("done", setupOk);
  $("#btnStart").disabled = !(checkedOk && folderOk && setupOk);
  if (folderOk) $("#folderStatus").textContent = repoPath, $("#folderStatus").className = "status ok";
}

$("#btnCheck").addEventListener("click", async () => {
  $("#checkStatus").textContent = t("checking"); $("#checkStatus").className = "status";
  try {
    const v = await invoke("check_claude");
    checkedOk = true;
    $("#checkStatus").textContent = t("checkedPrefix") + v; $("#checkStatus").className = "status ok";
  } catch (e) {
    checkedOk = false;
    $("#checkStatus").textContent = String(e); $("#checkStatus").className = "status bad";
  }
  refreshWizard();
});

$("#btnFolder").addEventListener("click", async () => {
  const picked = await dialog.open({ directory: true, multiple: false, title: t("pickFolderTitle") });
  if (picked) { repoPath = picked; folderOk = true; localStorage.setItem("cc_repo", repoPath); refreshWizard(); }
});

$("#btnSetup").addEventListener("click", async () => {
  $("#setupStatus").textContent = t("installing"); $("#setupStatus").className = "status";
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
let apiMode = false;
function enterApp(){
  $("#folderLabel").textContent = repoPath || t("noFolder");
  loadAgents();
  invoke("get_cost_cap").then(v => { if (v != null) $("#costCap").value = v; }).catch(()=>{});
  // 환경에 API 키가 있으면 'API 모드' 표시(키는 저장하지 않음 — 안전 원칙)
  invoke("check_api_mode").then(on => { apiMode = !!on; $("#apiMode")?.classList.toggle("hidden", !apiMode); }).catch(()=>{});
}

$("#costCap").addEventListener("change", () => {
  const v = parseFloat($("#costCap").value);
  invoke("set_cost_cap", { value: isNaN(v) ? 0 : v }).catch(()=>{});
  $("#costBanner").classList.add("hidden");
});

// 안전 수준 — "전체 허용"은 위험 확인 후에만. 선택은 기억해 둔다.
(() => { const s = localStorage.getItem("cc_safety"); if (s) $("#safety").value = s; })();
$("#safety").addEventListener("change", (e) => {
  if (e.target.value === "bypassPermissions") {
    if (!confirm(t("safetyConfirm"))) { e.target.value = "acceptEdits"; }
  }
  localStorage.setItem("cc_safety", e.target.value);
});

// "검색 켜기" 토글 → 프로젝트 .mcp.json 에 공식 문서 검색(context7) 연결/해제
$("#tglSearch").addEventListener("change", async (e) => {
  if (!repoPath) { e.target.checked = false; alert(t("needFolder")); return; }
  try {
    const res = await invoke(e.target.checked ? "enable_search" : "disable_search", { repo: repoPath });
    if (typeof res === "string" && !DEMO) showHint(res);
  } catch (err) { alert(t("searchFail") + err); e.target.checked = !e.target.checked; }
});

// "정밀 편집" 토글 → LSP/시맨틱 MCP 연결/해제
$("#tglLsp").addEventListener("change", async (e) => {
  if (!repoPath) { e.target.checked = false; alert(t("needFolder")); return; }
  try {
    const res = await invoke(e.target.checked ? "enable_lsp" : "disable_lsp", { repo: repoPath });
    if (typeof res === "string" && !DEMO) showHint(res);
  } catch (err) { alert(t("opFail") + err); e.target.checked = !e.target.checked; }
});

// "웹검색 키" → Exa API 키 입력(본인 키). 비우면 끄기.
$("#btnExa").addEventListener("click", async () => {
  if (!repoPath) { alert(t("needFolder")); return; }
  const key = prompt(t("exaPrompt"));
  if (key === null) return;
  try {
    const r = await invoke("set_exa_key", { repo: repoPath, key: key || "" });
    if (typeof r === "string" && !DEMO) showHint(r);
  } catch (e) { alert(t("opFail") + e); }
});

function showHint(msg){
  const b = $("#costBanner");
  b.textContent = msg; b.classList.remove("hidden");
  setTimeout(() => b.classList.add("hidden"), 3500);
}

$("#btnChangeFolder").addEventListener("click", async () => {
  const picked = await dialog.open({ directory: true, multiple: false, title: t("pickFolderTitle") });
  if (picked) { repoPath = picked; localStorage.setItem("cc_repo", repoPath); $("#folderLabel").textContent = repoPath; }
});

// ---------- 레시피 (내장 + 사용자 커스텀 = 마켓/공유) ----------
let customRecipes = {};
try { customRecipes = JSON.parse(localStorage.getItem("cc_recipes") || "{}") || {}; } catch (_) { customRecipes = {}; }
const allRecipes = () => ({ ...RECIPES, ...customRecipes });
function recipeText(key){
  const c = customRecipes[key];
  if (c && c.text) return c.text;
  return t("rtext_" + key) || "";
}

function applyRecipe(key){
  const r = allRecipes()[key];
  if (!r) return;
  if (r.speed) $("#speed").value = r.speed;
  const txt = recipeText(key);
  const cur = $("#prompt").value.trim();
  const texts = Object.keys(allRecipes()).map(recipeText).filter(Boolean);
  if (!cur || texts.some(x => cur.startsWith(x.trim()))) $("#prompt").value = txt;
  if (r.perm) $("#prompt").dataset.perm = r.perm; else delete $("#prompt").dataset.perm;
  if (r.agent) $("#prompt").dataset.agent = r.agent; else delete $("#prompt").dataset.agent;
  $("#prompt").focus();
}

// 커스텀 레시피를 버튼으로 렌더(내장 뒤에 붙임)
function renderCustomRecipes(){
  const box = document.querySelector(".recipes");
  box.querySelectorAll(".recipe.custom").forEach(b => b.remove());
  Object.entries(customRecipes).forEach(([key, r]) => {
    if (RECIPES[key]) return;
    const b = document.createElement("button");
    b.className = "recipe custom";
    b.dataset.r = key;
    b.textContent = (r.emoji ? r.emoji + " " : "🧩 ") + (r.label || key);
    box.appendChild(b);
  });
}

// 이벤트 위임 — 동적으로 추가된 커스텀 레시피도 동작 (클릭=적용, 길게=편집)
document.querySelector(".recipes").addEventListener("click", (e) => {
  const b = e.target.closest(".recipe");
  if (b && b.dataset.r) applyRecipe(b.dataset.r);
});
document.querySelector(".recipes").addEventListener("contextmenu", (e) => {
  const b = e.target.closest(".recipe.custom");
  if (b) { e.preventDefault(); openRecipeEditor(b.dataset.r); }
});

// 내보내기
$("#recipeExport").addEventListener("click", () => {
  const pack = { version: 1, recipes: allRecipes() };
  const json = JSON.stringify(pack, null, 2);
  try {
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "claudecrew-recipes.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch (_) { prompt(t("exportPrompt"), json); }
});

// 가져오기
$("#recipeImport").addEventListener("click", () => {
  const raw = prompt(t("importPrompt"));
  if (!raw) return;
  let pack;
  try { pack = JSON.parse(raw); } catch (_) { alert(t("badJson")); return; }
  const incoming = pack && pack.recipes ? pack.recipes : pack;
  if (!incoming || typeof incoming !== "object") { alert(t("noRecipe")); return; }
  let added = 0;
  Object.entries(incoming).forEach(([key, r]) => {
    if (RECIPES[key]) return;
    if (!r || !r.text) return;
    customRecipes[key] = { label: r.label || key, emoji: r.emoji || "", speed: r.speed || "sonnet",
                           perm: r.perm || "acceptEdits", agent: r.agent || null, text: r.text };
    added++;
  });
  localStorage.setItem("cc_recipes", JSON.stringify(customRecipes));
  renderCustomRecipes();
  alert(added > 0 ? t("added", added) : t("addedNone"));
});

// ---------- 레시피 만들기/편집 ----------
let editingKey = null;
function openRecipeEditor(key){
  editingKey = key || null;
  const r = key ? customRecipes[key] : null;
  $("#rfName").value = r ? (r.label || "") : "";
  $("#rfEmoji").value = r ? (r.emoji || "") : "";
  $("#rfText").value = r ? (r.text || "") : "";
  $("#rfAgent").value = r ? (r.agent || "") : "";
  $("#rfSpeed").value = r ? (r.speed || "sonnet") : "sonnet";
  $("#rfPerm").value = r ? (r.perm || "acceptEdits") : "acceptEdits";
  $("#rfDelete").style.display = key ? "" : "none";
  $("#recipeModal").classList.remove("hidden");
}
$("#recipeNew").addEventListener("click", () => openRecipeEditor(null));
$("#recipeModalClose").addEventListener("click", () => $("#recipeModal").classList.add("hidden"));
$("#rfSave").addEventListener("click", () => {
  const label = $("#rfName").value.trim();
  const text = $("#rfText").value;
  if (!label || !text.trim()) { alert(t("rfNeedName")); return; }
  const key = editingKey || ("user_" + label.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").slice(0, 24) + "_" + Date.now().toString(36).slice(-4));
  customRecipes[key] = { label, emoji: $("#rfEmoji").value.trim(), text,
                         agent: $("#rfAgent").value || null, speed: $("#rfSpeed").value, perm: $("#rfPerm").value };
  localStorage.setItem("cc_recipes", JSON.stringify(customRecipes));
  renderCustomRecipes();
  $("#recipeModal").classList.add("hidden");
  showHint(t("rfSaved"));
});
$("#rfDelete").addEventListener("click", () => {
  if (editingKey && customRecipes[editingKey]) {
    delete customRecipes[editingKey];
    localStorage.setItem("cc_recipes", JSON.stringify(customRecipes));
    renderCustomRecipes();
  }
  $("#recipeModal").classList.add("hidden");
  showHint(t("rfDeleted"));
});

$("#btnRun").addEventListener("click", async () => {
  const promptText = $("#prompt").value.trim();
  if (!repoPath) { alert(t("needFolder")); return; }
  if (!promptText) { alert(t("needPrompt")); return; }
  const model = $("#speed").value;
  const recipePerm = $("#prompt").dataset.perm;
  const safety = $("#safety").value;
  const permission = recipePerm === "plan" ? "plan" : safety;
  const agent = $("#prompt").dataset.agent || null;
  const keepgoing = $("#tglKeep").checked;
  const team = $("#tglTeam").checked;
  try {
    await invoke("create_agent", { repo: repoPath, prompt: promptText, model, permission, branch: null, agent, keepgoing, team });
    $("#prompt").value = ""; delete $("#prompt").dataset.perm; delete $("#prompt").dataset.agent;
  } catch (e) { alert(t("runFail") + e); }
});

async function loadAgents(){
  try {
    const useRestore = repoPath && !DEMO;
    const list = await invoke(useRestore ? "restore_agents" : "list_agents", useRestore ? { repo: repoPath } : undefined);
    if (Array.isArray(list)) { state.clear(); list.forEach(a => state.set(a.id, a)); render(); }
  } catch (_) {}
}

function costTotal(){
  let s = 0; state.forEach(a => { if (a.cost) s += a.cost; });
  return s;
}

function renderTeammates(a){
  const tm = a.teammates;
  if (!tm || !Object.keys(tm).length) return "";
  const chips = Object.entries(tm).map(([name, st]) =>
    `<span class="mate ${st}">${st === "done" ? "✓" : "●"} ${esc(name)}</span>`).join("");
  return `<div class="mates">${t("mates")} ${chips}</div>`;
}

function render(){
  const board = $("#board");
  const total = costTotal();
  $("#costTotal").textContent = "$" + total.toFixed(2);
  const cap = parseFloat($("#costCap")?.value);
  $("#costTotal").classList.toggle("warn", !isNaN(cap) && cap > 0 && total >= cap * 0.8);
  const running = [...state.values()].filter(a => a.status === "running" || a.status === "creating").length;
  $("#apiHint")?.classList.toggle("hidden", running < 3 || apiMode); // API 모드면 한도 걱정 불필요
  if (state.size === 0){ board.innerHTML = `<div class="empty">${t("empty")}</div>`; return; }
  board.innerHTML = "";
  [...state.values()].forEach(a => {
    const logHtml = (a.output || []).map(markTool).join("\n");
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="top">
        <span class="pill ${a.status}">${t("status_" + a.status) || a.status}</span>
        <span class="title">${esc(a.branch)}</span>
        ${a.cost != null ? `<span class="cost">$${Number(a.cost).toFixed(4)}</span>` : ""}
      </div>
      <div class="ask">${esc(a.prompt)}</div>
      ${renderTeammates(a)}
      <div class="log" id="log-${a.id}">${logHtml}</div>
      <div class="acts">
        <button data-act="diff">${t("diffTitle")}</button>
        ${a.port ? `<button data-act="preview" class="primary">${t("preview", a.port)}</button>` : ""}
        <button data-act="apply" class="primary">${lang === "ko" ? "적용하기" : "Apply"}</button>
        <button data-act="stop">${lang === "ko" ? "멈추기" : "Stop"}</button>
        <button data-act="cleanup">${lang === "ko" ? "되돌리기" : "Revert"}</button>
      </div>`;
    card.querySelector('[data-act="diff"]').onclick = () => viewDiff(a.id);
    const previewBtn = card.querySelector('[data-act="preview"]');
    if (previewBtn) previewBtn.onclick = () => invoke("open_url", { url: "http://localhost:" + a.port });
    card.querySelector('[data-act="apply"]').onclick = () => applyChanges(a.id);
    card.querySelector('[data-act="stop"]').onclick = () => invoke("stop_agent", { id: a.id });
    card.querySelector('[data-act="cleanup"]').onclick = () => {
      if (confirm(t("cleanupConfirm"))) invoke("cleanup_agent", { id: a.id });
    };
    board.appendChild(card);
    const log = card.querySelector(".log"); log.scrollTop = log.scrollHeight;
  });
}

// ---------- 적용하기(변경 저장) ----------
async function applyChanges(id){
  const a = state.get(id);
  const suggested = a ? ("ClaudeCrew: " + (a.prompt || "").trim().slice(0, 50)) : "";
  const message = prompt(t("saveMsgPrompt"), suggested);
  if (message === null) return;
  try {
    const res = await invoke("commit_agent", { id, message: message || "" });
    alert(res);
  } catch (e) { alert(t("saveFail") + e); }
}

// ---------- 바뀐 점 (거시→미시) ----------
function parseDiff(diff){
  const files = [];
  const chunks = diff.split(/^diff --git .*$/m).filter(c => c.trim());
  const headers = diff.match(/^diff --git a\/(.*?) b\/(.*)$/gm) || [];
  chunks.forEach((body, i) => {
    let name = "(file)";
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
  $("#diffTitle").textContent = (state.get(id)?.branch || "") + t("diffSuffix");
  $("#diffSummary").innerHTML = "";
  $("#diffBody").innerHTML = t("diffLoading");
  $("#diffModal").classList.remove("hidden");
  try {
    const diff = await invoke("get_diff", { id });
    if (!diff || diff.trim() === "(바뀐 점 없음)"){
      $("#diffSummary").textContent = t("diffNone");
      $("#diffBody").innerHTML = "";
      return;
    }
    const files = parseDiff(diff);
    const totalAdd = files.reduce((s,f)=>s+f.adds,0), totalDel = files.reduce((s,f)=>s+f.dels,0);
    $("#diffSummary").innerHTML = t("diffSummary", files.length, totalAdd, totalDel);
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
listen("teammate_update", (ev) => {
  const { agentId, name, status } = ev.payload || {};
  const a = state.get(agentId); if (!a) return;
  a.teammates = a.teammates || {};
  a.teammates[name] = status;
  render();
});
listen("cost_capped", (ev) => {
  const { total, cap } = ev.payload || {};
  const b = $("#costBanner");
  b.textContent = t("capped", Number(cap).toFixed(2), Number(total).toFixed(2));
  b.classList.remove("hidden");
  loadAgents();
});

// ---------- 시작 ----------
if (DEMO) {
  const d = document.createElement("div");
  d.className = "demo-badge";
  document.body.appendChild(d);
}
applyI18n();
refreshWizard();
