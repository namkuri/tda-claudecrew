// ClaudeCrew UI — Tauri 글로벌 API 사용 (withGlobalTauri: true)
// ──────────────────────────────────────────────────────────────────────────
// 데스크톱 앱(Tauri WebView)에서는 window.__TAURI__ 가 항상 존재 → 실제 백엔드만 사용.
// 데모 모드는 GitHub Pages 같은 '백엔드 없는 정적 호스팅' 전용 폴백이며,
// 데스크톱 빌드에서는 절대 실행되지 않는다. (시각 미리보기 목적)
// ──────────────────────────────────────────────────────────────────────────
const DEMO = !(window.__TAURI__ && window.__TAURI__.core);
const { invoke, listen, dialog } = DEMO
  ? makeDemoApi()
  : { invoke: window.__TAURI__.core.invoke, listen: window.__TAURI__.event.listen, dialog: window.__TAURI__.dialog };
if (DEMO) console.warn("[ClaudeCrew] Demo mode (no Tauri backend) — using mock data. Real install runs as the desktop app.");

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
    newTask: "＋ 새 작업", newTabLabel: "＋ 새 작업", connected: "연결됨", disconnected: "연결 안 됨", demoConn: "데모 모드",
    gpEmpty: "작업을 선택하면 변경/커밋 상태가 여기에 보여요.", gpBase: "기준", gpAgainst: "기준 브랜치 대비 변경", gpCommitPh: "저장(커밋) 메시지…", gpCommit: "커밋", gpNoChange: "바뀐 점이 없어요.",
    avApply: "적용", avStop: "멈추기", avRevert: "되돌리기", avDiff: "전체 diff", termWaiting: "에이전트를 기다리는 중…",
    sb_creating: "저 준비하고 있어요…", sb_warming: "📚 프로젝트 학습 중…", sb_running: "저 지금 작업하는 중이에요!", sb_done: "저 작업 끝냈어요! ✅", sb_committed: "저장까지 마쳤어요! 💾", sb_error: "앗, 문제가 생겼어요 😵", sb_stopped: "잠깐 멈췄어요 ⏸",
    status_warming: "학습 중",
    orchestrator: "오케스트레이터", agentConsole: "에이전트 콘솔", sub_working: "작업 받는 중…", sub_done: "완료",
    followPh: "추가로 부탁하거나 물어볼 내용… (Enter 보내기 · Shift+Enter 줄바꿈)", followSend: "보내기 ↵",
    noSession: "이 작업은 아직 세션이 시작되지 않아 후속 대화를 보낼 수 없어요.",
    talkingTo: "대화 상대", role_orchestrator: "오케스트레이터", role_team: "팀장(병렬 위임)",
    wtPath: "작업 공간(worktree)", wtOpen: "📁 폴더 열기", wtTitle: "Git worktree — 원본 폴더와 격리된 별도 작업 공간",
    verify: "🧪 자동 검증", verifying: "검증 중…", verifyPass: "검증 통과", verifyFail: "검증 실패",
    verifySkipped: "감지된 빌드 시스템 없음(검증 생략)", verifyFailedTip: "검증 실패 — 그래도 적용하시려면 다시 누르세요.",
    sub_failed: "서브에이전트 실패",
    noDiagInfo: "에이전트가 진단 정보 없이 종료됐어요.",
    noDiagHints: "흔한 원인: (1) Claude Code 로그인 만료 — 터미널에서 `claude` 한 번 실행해 확인  (2) 명령행 인자가 너무 김(Windows 8191자 한도)  (3) PATH에서 claude 못 찾음",
    tokenSrc: "토큰", tokenSub: "구독 플랜", tokenApi: "API 키", tokenTitle: "어떤 토큰으로 청구할지 — 구독(앱 플랜) 또는 API 키",
    composerHint: "무엇을 원하는지 적기만 하면, 알아서 전문가와 스킬을 골라 처리해요. (아래 템플릿은 선택)",
    quickTpl: "빠른 템플릿 (선택)",
    sbSession: "세션", sbToday: "오늘", sbWeek: "최근 7일", sbCtx: "현재 작업 컨텍스트", sbUsedSub: "구독 사용량", sbUsedApi: "API 사용량",
    sbMsg: "건", sbNote: "ⓘ", sbNoteTitle: "Claude Code 로컬 캐시(~/.claude/stats-cache.json)에서 누적 사용량을 읽어 표시합니다. /usage 화면과 같은 출처예요. 구독 '남은 한도'는 Claude Code가 외부 노출하지 않습니다.",
    sbSrcTitle: "데이터 출처: Claude Code stats-cache 또는 이 앱의 자체 집계",
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
    newTask: "＋ New task", newTabLabel: "＋ New task", connected: "Connected", disconnected: "Not connected", demoConn: "Demo mode",
    gpEmpty: "Select a task to see its changes and commit status here.", gpBase: "Base", gpAgainst: "Changes vs base", gpCommitPh: "Commit message…", gpCommit: "Commit", gpNoChange: "No changes.",
    avApply: "Apply", avStop: "Stop", avRevert: "Revert", avDiff: "Full diff", termWaiting: "Waiting for the agent…",
    sb_creating: "Getting ready…", sb_warming: "📚 Learning the project…", sb_running: "I'm working on it!", sb_done: "All done! ✅", sb_committed: "Saved it! 💾", sb_error: "Oops, something went wrong 😵", sb_stopped: "Paused for now ⏸",
    status_warming: "Warming",
    orchestrator: "Orchestrator", agentConsole: "Agent console", sub_working: "Receiving task…", sub_done: "done",
    followPh: "Ask a follow-up or give the next step… (Enter to send · Shift+Enter for newline)", followSend: "Send ↵",
    noSession: "No session yet — this task hasn't produced its first response, so follow-up isn't possible.",
    talkingTo: "Talking to", role_orchestrator: "Orchestrator", role_team: "Lead (parallel delegate)",
    wtPath: "Workspace (worktree)", wtOpen: "📁 Open folder", wtTitle: "Git worktree — an isolated working tree separate from your main folder",
    verify: "🧪 Auto-verify", verifying: "Verifying…", verifyPass: "Verified", verifyFail: "Verification failed",
    verifySkipped: "No detected build system (skipped)", verifyFailedTip: "Verification failed — press Apply again to override.",
    sub_failed: "Sub-agent failed",
    noDiagInfo: "Agent exited without diagnostic output.",
    noDiagHints: "Common causes: (1) Claude Code login expired — run `claude` once in a terminal  (2) Argv too long (Windows 8191-char limit)  (3) `claude` not on PATH",
    tokenSrc: "Tokens", tokenSub: "Subscription", tokenApi: "API key", tokenTitle: "Which tokens to bill — your subscription (app plan) or an API key",
    composerHint: "Just write what you want — it picks the right experts and skills for you. (Templates below are optional.)",
    quickTpl: "Quick templates (optional)",
    sbSession: "Session", sbToday: "Today", sbWeek: "Last 7d", sbCtx: "Current task context", sbUsedSub: "Subscription usage", sbUsedApi: "API usage",
    sbMsg: "msgs", sbNote: "ⓘ", sbNoteTitle: "Pulled from Claude Code's local cache (~/.claude/stats-cache.json) — same source as the /usage screen. Remaining subscription quota isn't exposed by Claude Code.",
    sbSrcTitle: "Data source: Claude Code stats-cache, or this app's own tally",
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
  if ($("#repoName")) $("#repoName").textContent = repoBaseName();
  renderCustomRecipes();
  render();
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
    const ko = lang === "ko";
    const sample = ["▶ " + (ko ? "오케스트레이터 시작" : "Orchestrator start"), "🔧 Task → debugger", "🔧 Task → implementer",
                    ko ? "전문가 결과를 모아 검토 중…" : "Collecting expert results…", "🔧 Task → code-reviewer", ko ? "완료. 요약 정리!" : "Done. Summarizing!"];
    const id = "demo" + (++n);
    const role = args.team ? "team" : (args.agent || "orchestrator");
    const a = { id, branch: "demo-" + n, prompt: args.prompt || "demo", model: args.model || "sonnet",
                permission: args.permission || "acceptEdits", worktree: "/demo/내-프로젝트/.agentboard/demo-" + n,
                role, status: "creating", cost: null, output: [] };
    agents[id] = a;
    emit("agent_update", { ...a });
    // 데모도 웜업 → running 흐름을 보여줌
    setTimeout(() => { a.status = "warming"; emit("agent_update", { ...a }); }, 300);
    setTimeout(() => emit("agent_output", { id, text: "📚 학습 claude -p <ctx> --output-format stream-json … (인자 480자)" }), 500);
    setTimeout(() => emit("agent_output", { id, text: "📚 학습 완료: OK, 컨텍스트 학습 완료" }), 1200);
    setTimeout(() => { a.status = "running"; emit("agent_update", { ...a }); }, 1400);
    sample.forEach((line, i) => setTimeout(() => emit("agent_output", { id, text: line }), 1700 + i * 600));
    // 오케스트레이터가 전문가들을 호출(Task)하는 모습 — 멀티 콘솔 시뮬
    const crew = ko
      ? [["debugger","원인 분석: 이벤트 핸들러 누락 추적","onLogin에서 click 리스너 미등록 확인"],
         ["implementer","수정 구현: 리스너 등록 + 비활성 해제","btn.addEventListener('click', submit) 추가"],
         ["code-reviewer","변경 검토: 회귀/스타일 점검","문제 없음 — 적용 권장"]]
      : [["debugger","Find root cause: missing handler","onLogin never binds click listener"],
         ["implementer","Implement fix: bind + enable","added btn.addEventListener('click', submit)"],
         ["code-reviewer","Review change: regressions/style","Looks good — recommend applying"]];
    crew.forEach(([nm, desc, result], i) => {
      setTimeout(() => emit("teammate_update", { agentId: id, name: nm, desc, status: "working" }), 1800 + i * 600);
      setTimeout(() => emit("teammate_update", { agentId: id, name: nm, result, status: "done" }), 3500 + i * 600);
    });
    setTimeout(() => { a.port = 5173; a.ctx = 18500; a.tokens_in = 18500; a.tokens_out = 2400; emit("agent_update", { ...a }); }, 3100);
    setTimeout(() => { a.status = "done"; a.cost = 0.0123; a.ctx = 42800; a.tokens_in = 42800; a.tokens_out = 9100; a.session_id = "demo-sess-"+n; emit("agent_done", { ...a }); }, 1700 + sample.length * 600 + 400);
    return Promise.resolve(id);
  }
  const invoke = (cmd, args = {}) => {
    switch (cmd){
      case "read_usage":        // 데모: stats-cache 없음 표시(데스크톱에서는 진짜 파일을 읽음)
                                return Promise.resolve({ available:false, today_tokens:0, week_tokens:0, today_messages:0, week_messages:0, total_messages:0, total_sessions:0, models:[] });
      case "open_path":         console.log("[demo] open_path", args.path); return Promise.resolve();
      case "get_base_branch":   return Promise.resolve("main");
      case "verify_changes":    return Promise.resolve({ ran:true, success:true, note:"감지됨: Node", steps:[
        { name:"npm", command:"npm run build", success:true, stdout:"built", stderr:"" },
        { name:"npm", command:"npm test", success:true, stdout:"3 passed", stderr:"" },
      ]});
      case "send_message": {
        const cur = agents[args.id]; if (!cur) return Promise.resolve();
        emit("agent_output", { id: args.id, text: "\n💬 사용자: " + args.prompt });
        cur.status = "running"; emit("agent_update", { ...cur });
        setTimeout(() => emit("agent_output", { id: args.id, text: "🔧 후속 분석 중…" }), 600);
        setTimeout(() => emit("agent_output", { id: args.id, text: lang === "ko" ? "후속 처리 완료." : "Follow-up done." }), 1500);
        setTimeout(() => { cur.status = "done"; cur.tokens_in = (cur.tokens_in||0) + 8200; cur.tokens_out = (cur.tokens_out||0) + 1500; cur.ctx = 51000; emit("agent_done", { ...cur }); }, 1800);
        return Promise.resolve();
      }
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
let selectedId = null;          // 현재 선택된 작업(null = 새 작업/컴포저)
const openTabs = [];            // 열린 탭(작업 id 순서)
let authMode = localStorage.getItem("cc_authmode") || "subscription"; // subscription(앱 플랜) | api
let baseBranch = "main"; // 저장소의 기본/기준 브랜치 — 작업 선택 시 백엔드가 검출해 채움

function repoBaseName(){
  if (!repoPath) return t("noFolder");
  const p = repoPath.replace(/[\\/]+$/, "");
  const m = p.split(/[\\/]/).filter(Boolean).pop();
  return m || repoPath;
}

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
    // 기본 hook_scope='project' — 사용자의 다른 Claude Code 세션을 방해하지 않음.
    const msg = await invoke("setup_environment", { repo: repoPath || null, hookScope: "project" });
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
  $("#repoName").textContent = repoBaseName();
  // Claude 연결/모델 표시
  $("#csDot").classList.toggle("on", true);
  invoke("check_claude").then(v => {
    $("#csModel").textContent = DEMO ? "Claude Code" : String(v).split("·")[0].trim() || "Claude Code";
    $("#csPlan").textContent = DEMO ? t("demoConn") : t("connected");
  }).catch(() => { $("#csDot").classList.remove("on"); $("#csPlan").textContent = t("disconnected"); });
  loadAgents();
  invoke("get_cost_cap").then(v => { if (v != null) $("#costCap").value = v; }).catch(()=>{});
  syncTokenSeg();
  showComposer();
  // Claude Code 사용량(stats-cache) 동기화 — 즉시 + 15초 주기
  refreshUsage();
  if (!window.__usageTimer) window.__usageTimer = setInterval(refreshUsage, 15000);
}

// 토큰 소스 세그먼트(구독/API) 동기화 + 전환
function syncTokenSeg(){
  document.querySelectorAll("#tokenSeg button").forEach(b => b.classList.toggle("on", b.dataset.mode === authMode));
}
$("#tokenSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-mode]"); if (!b) return;
  authMode = b.dataset.mode; localStorage.setItem("cc_authmode", authMode);
  syncTokenSeg(); renderStatusStrip(); renderStatusbar();
});

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
  if (picked) { repoPath = picked; localStorage.setItem("cc_repo", repoPath); $("#repoName").textContent = repoBaseName(); state.clear(); openTabs.length = 0; selectedId = null; loadAgents(); }
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
    await invoke("create_agent", { repo: repoPath, prompt: promptText, model, permission, branch: null, agent, keepgoing, team, authmode: authMode });
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

// ---------- 토큰/컨텍스트 상태바 ----------
const CTX_WINDOW = 200000; // 컨텍스트 창(토큰) 가정
function fmtTok(n){ n = n || 0; if (n >= 1e6) return (n/1e6).toFixed(1)+"M"; if (n >= 1e3) return (n/1e3).toFixed(1)+"k"; return String(n); }
function weekKey(){ const d = new Date(); const jan1 = new Date(d.getFullYear(),0,1); const wk = Math.ceil((((d - jan1)/86400000) + jan1.getDay() + 1)/7); return d.getFullYear()+"-W"+wk; }
let weekData; try { weekData = JSON.parse(localStorage.getItem("cc_week")||"{}"); } catch(_){ weekData = {}; }
if (weekData.key !== weekKey()) weekData = { key: weekKey(), tokens: 0, ids: [] };
function addWeekly(id, tok){ if (!tok || weekData.ids.includes(id)) return; weekData.ids.push(id); weekData.tokens += tok; localStorage.setItem("cc_week", JSON.stringify(weekData)); }

// Claude Code 통계 캐시 — read_usage 결과(주기 갱신)
let usageStats = { available: false, today_tokens: 0, week_tokens: 0, today_messages: 0, week_messages: 0,
                   total_messages: 0, total_sessions: 0, models: [] };
async function refreshUsage(){
  try {
    // 사용자 로컬 날짜(YYYY-MM-DD)를 백엔드에 전달 — UTC 의존 제거(KST 등 시간대 정확성)
    const today = new Date().toLocaleDateString("sv-SE"); // "sv-SE"가 ISO 형식과 동일
    const u = await invoke("read_usage", { today });
    if (u) usageStats = u;
  }
  catch(_){ /* DEMO에서는 없음 */ }
  renderStatusbar();
}

function renderStatusbar(){
  const bar = $("#statusbar"); if (!bar) return;
  // 세션(이 앱이 실행한 작업) — 우리가 본 입력/출력 토큰
  let tin = 0, tout = 0; state.forEach(a => { tin += a.tokens_in || 0; tout += a.tokens_out || 0; });
  const usedLabel = authMode === "api" ? t("sbUsedApi") : t("sbUsedSub");
  const sel = (selectedId && state.has(selectedId)) ? state.get(selectedId) : null;
  const ctx = sel && sel.ctx ? sel.ctx : 0;
  const pct = Math.min(100, Math.round(ctx / CTX_WINDOW * 100));
  const ctxCls = pct >= 90 ? "full" : (pct >= 70 ? "warn" : "");
  // 오늘/주간: Claude Code stats-cache 우선, 없으면 앱 누적값 fallback
  const todayTok = usageStats.available ? usageStats.today_tokens : 0;
  const weekTok = usageStats.available ? usageStats.week_tokens : weekData.tokens;
  const todayMsg = usageStats.available ? usageStats.today_messages : 0;
  const src = usageStats.available ? "Claude Code" : "local";
  bar.innerHTML =
    `<span class="sb-seg" title="${esc(t("sbNoteTitle"))}">${usedLabel} ${t("sbNote")}</span>
     <span class="sb-sep">·</span>
     <span class="sb-seg">${t("sbSession")}: <span class="up">↑${fmtTok(tin)}</span> <span class="down">↓${fmtTok(tout)}</span> <b>${fmtTok(tin + tout)}</b></span>
     <span class="sb-sep">·</span>
     <span class="sb-seg">${t("sbToday")}: <b>${fmtTok(todayTok)}</b>${todayMsg ? ` <span class="sb-note">(${todayMsg} ${t("sbMsg")})</span>` : ""}</span>
     <span class="sb-sep">·</span>
     <span class="sb-seg">${t("sbWeek")}: <b>${fmtTok(weekTok)}</b></span>
     <span class="sb-seg sb-ctx">${t("sbCtx")}: <b>${fmtTok(ctx)}</b> / ${fmtTok(CTX_WINDOW)} (${pct}%) <span class="ctxbar"><i class="${ctxCls}" style="width:${pct}%"></i></span><span class="sb-src" title="${esc(t("sbSrcTitle"))}">${src}</span></span>`;
}

// 팀원 데이터 정규화: {status} 문자열 또는 {status,desc,result,isError} 객체 모두 허용
function mate(tm, name){ const v = tm[name]; return typeof v === "string" ? { status: v } : (v || {}); }

// 오케스트레이터 → 전문가 호출관계 바
function renderOrchBar(a){
  const tm = a.teammates; if (!tm || !Object.keys(tm).length) return "";
  const chips = Object.keys(tm).map(name => {
    const m = mate(tm, name);
    return `<span class="orch-chip ${m.status}">${m.status === "done" ? "✓" : "●"} ${esc(name)}</span>`;
  }).join('<span class="orch-arrow">·</span>');
  return `<div class="orch-bar"><span class="orch-lead">🧠 ${t("orchestrator")}</span><span class="orch-to">→</span>${chips}</div>`;
}

// 자동 검증 결과 패널 (F1)
function renderVerifyPanel(a){
  const v = a._verify; if (!v) return "";
  const head = v.ran
    ? (v.success ? `<span class="vf-ok">✓ ${t("verifyPass")}</span>` : `<span class="vf-bad">✗ ${t("verifyFail")}</span>`)
    : `<span class="vf-skip">⊘ ${t("verifySkipped")}</span>`;
  const steps = (v.steps || []).map(s => {
    const tail = (s.stderr || s.stdout || "").trim().split("\n").slice(-3).join("\n");
    return `<div class="vf-step ${s.success ? "ok" : "bad"}">
      <div class="vf-cmd">${s.success ? "✓" : "✗"} <code>${esc(s.command)}</code></div>
      ${tail ? `<pre class="vf-out">${esc(tail.slice(-600))}</pre>` : ""}
    </div>`;
  }).join("");
  return `<div class="verify-panel">
    <div class="vf-head">${head} <span class="vf-note">${esc(v.note || "")}</span></div>
    ${steps}
  </div>`;
}

// 서브에이전트 미니 콘솔(CMD 창) 그리드
function renderSubConsoles(a){
  const tm = a.teammates; if (!tm || !Object.keys(tm).length) return "";
  const cards = Object.keys(tm).map(name => {
    const m = mate(tm, name);
    const cls = m.isError ? "error" : m.status;
    const headIcon = m.isError ? "✗ error" : (m.status === "done" ? "✓ done" : "● working");
    const body = m.isError
      ? `<span style="color:var(--err)">❌ ${esc(m.result || t("sub_failed"))}</span>`
      : (m.status === "done"
          ? (m.result ? esc(m.result) : "✓ " + t("sub_done"))
          : (m.desc ? esc(m.desc) : t("sub_working")));
    return `<div class="console sub ${cls}">
      <div class="con-head"><span class="con-dot ${cls}"></span>${esc(name)}<span class="con-st">${headIcon}</span></div>
      <div class="con-body">${body}</div>
    </div>`;
  }).join("");
  return `<div class="subs">${cards}</div>`;
}

function shortId(id){ const m = String(id).match(/\d+/); return m ? m[0] : String(id).slice(-4); }
function tabTitle(a){ const s = (a.prompt || a.branch || a.id).trim(); return s.length > 18 ? s.slice(0, 18) + "…" : s; }
function roleLabel(a){
  const r = a.role || "orchestrator";
  if (r === "orchestrator") return t("role_orchestrator");
  if (r === "team") return t("role_team");
  return r; // 전문가명(debugger, implementer 등)
}

// 상태 → Claude 캐릭터 말풍선
function speech(a){
  const job = (a.prompt || "").trim();
  const sub = job ? (job.length > 64 ? job.slice(0, 64) + "…" : job) : "";
  const key = "sb_" + a.status;
  const msg = t(key) !== key ? t(key) : (t("status_" + a.status) || a.status);
  return { msg, sub };
}

// 사이드바 diff 통계(±)를 한 번만 가져와 캐싱
async function ensureStat(id){
  const a = state.get(id);
  if (!a || a._stat || a._statLoading) return;
  a._statLoading = true;
  try {
    const diff = await invoke("get_diff", { id });
    if (diff && typeof diff === "string" && diff.trim() && diff.trim() !== "(바뀐 점 없음)"){
      const files = parseDiff(diff);
      a._stat = { adds: files.reduce((s,f)=>s+f.adds,0), dels: files.reduce((s,f)=>s+f.dels,0), files };
    } else { a._stat = { adds: 0, dels: 0, files: [] }; }
  } catch (_) { a._stat = { adds: 0, dels: 0, files: [] }; }
  a._statLoading = false;
  renderSidebar();
  if (selectedId === id) renderGit();
}

// 선택/탭/컴포저 전환
function openTab(id){ if (!openTabs.includes(id)) openTabs.push(id); }
function selectAgent(id){
  if (!state.has(id)) return;
  openTab(id); selectedId = id; render();
  // 작업이 속한 저장소의 기준 브랜치를 검출해 라벨에 반영(가짜 'main' 하드코딩 제거)
  invoke("get_base_branch", { id }).then(b => { if (b && b !== baseBranch) { baseBranch = b; render(); } }).catch(()=>{});
}
function closeTab(id){
  const i = openTabs.indexOf(id); if (i >= 0) openTabs.splice(i, 1);
  if (selectedId === id) selectedId = openTabs.length ? openTabs[Math.min(i, openTabs.length - 1)] : null;
  render();
}
function showComposer(opts){
  selectedId = null;
  if (opts && opts.reset){ const p = $("#prompt"); if (p){ p.value = ""; delete p.dataset.perm; delete p.dataset.agent; } }
  render();
  const p = $("#prompt"); if (p) { try { p.focus(); } catch(_){} }
}

// ---------- 렌더 ----------
function render(){
  renderStatusStrip();
  renderSidebar();
  renderTabs();
  renderStage();
  renderGit();
  renderStatusbar();
}

function renderStatusStrip(){
  const total = costTotal();
  $("#costTotal").textContent = "$" + total.toFixed(2);
  const cap = parseFloat($("#costCap")?.value);
  $("#costTotal").classList.toggle("warn", !isNaN(cap) && cap > 0 && total >= cap * 0.8);
  const running = [...state.values()].filter(a => a.status === "running" || a.status === "creating").length;
  $("#apiHint")?.classList.toggle("hidden", running < 3 || authMode === "api"); // API면 구독 한도 걱정 불필요
}

function renderSidebar(){
  $("#repoName").textContent = repoBaseName();
  $("#repoCount").textContent = state.size;
  const wsBaseTitle = document.querySelector("#wsBase .ws-title");
  if (wsBaseTitle) wsBaseTitle.textContent = baseBranch;
  const list = $("#wsList"); if (!list) return;
  list.innerHTML = "";
  [...state.values()].forEach(a => {
    ensureStat(a.id);
    const st = a._stat || { adds: 0, dels: 0 };
    const row = document.createElement("div");
    row.className = "ws-item" + (a.id === selectedId ? " active" : "");
    row.dataset.id = a.id;
    row.title = `${roleLabel(a)} · ${a.worktree || ""}`;
    row.innerHTML =
      `<span class="ws-st ${a.status}" title="${t("status_" + a.status) || a.status}"></span>` +
      `<span class="ws-name">${esc((a.prompt || a.branch || a.id).trim() || a.id)}</span>` +
      `<span class="ws-branch">${esc(a.branch || "")}</span>` +
      `<span class="ws-stat"><span class="gp-add">+${st.adds}</span><span class="gp-del">-${st.dels}</span></span>` +
      `<span class="ws-id">#${shortId(a.id)}</span>`;
    list.appendChild(row);
  });
}

function renderTabs(){
  const tabs = $("#agentTabs"); if (!tabs) return;
  tabs.innerHTML = "";
  openTabs.filter(id => state.has(id)).forEach(id => {
    const a = state.get(id);
    const tab = document.createElement("div");
    tab.className = "atab" + (id === selectedId ? " active" : "");
    tab.dataset.id = id;
    tab.innerHTML = `<span class="tab-st ${a.status}"></span><span>${esc(tabTitle(a))}</span><span class="tab-x" data-x="${id}">✕</span>`;
    tabs.appendChild(tab);
  });
  const nt = document.createElement("div");
  nt.className = "atab new" + (selectedId === null ? " active" : "");
  nt.dataset.new = "1";
  nt.textContent = t("newTabLabel");
  tabs.appendChild(nt);
}

function renderStage(){
  const comp = $("#composerView"), av = $("#agentView");
  if (selectedId && state.has(selectedId)){
    comp.classList.add("hidden"); av.classList.remove("hidden");
    renderAgentView(state.get(selectedId));
  } else {
    av.classList.add("hidden"); comp.classList.remove("hidden");
  }
}

function renderAgentView(a){
  const av = $("#agentView");
  const sp = speech(a);
  const logHtml = (a.output || []).map(markTool).join("\n");
  const hasTeam = a.teammates && Object.keys(a.teammates).length;
  av.innerHTML =
    `<div class="char-strip">
       <div class="cc-char ${a.status}"><div class="cc-body"></div></div>
       <div class="speech">
         <span class="role-tag">${t("talkingTo")}: <b>${esc(roleLabel(a))}</b></span>
         <div class="msg">${esc(sp.msg)}</div>
         ${sp.sub ? `<span class="sub">${esc(sp.sub)}</span>` : ""}
       </div>
       <div class="av-meta">
         <span class="av-model">${esc(a.branch || a.id)}</span>
         ${a.model ? `<span>· ${esc(a.model)}</span>` : ""}
         ${a.cost != null ? `<span class="av-cost">$${Number(a.cost).toFixed(4)}</span>` : ""}
       </div>
     </div>
     ${renderOrchBar(a)}
     <div class="console-area">
       <div class="console main">
         <div class="con-head"><span class="con-dot ${a.status}"></span>${hasTeam ? t("orchestrator") : t("agentConsole")}<span class="con-st">${t("status_" + a.status) || a.status}</span></div>
         <div class="con-body term" id="term-${a.id}">${
           logHtml
             ? logHtml
             : (a.status === "error"
                 ? `<span style="color:var(--err)">❌ ${esc(t("noDiagInfo"))}</span>\n<span style="color:var(--dim)">${esc(t("noDiagHints"))}</span>`
                 : `<span style="color:var(--faint)">${esc(t("termWaiting"))}</span>`)
         }</div>
       </div>
       ${renderSubConsoles(a)}
     </div>
     <div class="follow-up">
       <textarea id="followUp-${a.id}" rows="2" placeholder="${esc(t("followPh"))}" ${a.status === "running" || a.status === "creating" ? "disabled" : ""}></textarea>
       <button class="btn go" data-act="send" ${a.status === "running" || a.status === "creating" || !a.session_id ? "disabled" : ""} title="${a.session_id ? "" : esc(t("noSession"))}">${t("followSend")}</button>
     </div>
     ${renderVerifyPanel(a)}
     <div class="av-acts">
       ${a.port ? `<button data-act="preview" class="primary">${t("preview", a.port)}</button>` : ""}
       <button data-act="verify">${a._verifying ? t("verifying") : t("verify")}</button>
       <button data-act="apply" class="primary"${a._verify && !a._verify.success && a._verify.ran ? ` title="${esc(t("verifyFailedTip"))}"` : ""}>${t("avApply")}${a._verify && !a._verify.success && a._verify.ran ? " ⚠" : ""}</button>
       <button data-act="diff">${t("avDiff")}</button>
       <button data-act="stop">${t("avStop")}</button>
       <button data-act="cleanup">${t("avRevert")}</button>
     </div>`;
  const term = $("#term-" + a.id); if (term) term.scrollTop = term.scrollHeight;
  av.querySelector('[data-act="apply"]').onclick = () => applyChanges(a.id);
  av.querySelector('[data-act="diff"]').onclick = () => viewDiff(a.id);
  av.querySelector('[data-act="stop"]').onclick = () => invoke("stop_agent", { id: a.id });
  av.querySelector('[data-act="cleanup"]').onclick = () => { if (confirm(t("cleanupConfirm"))) invoke("cleanup_agent", { id: a.id }); };
  const verifyBtn = av.querySelector('[data-act="verify"]');
  if (verifyBtn) verifyBtn.onclick = async () => {
    a._verifying = true; renderStage();
    try { a._verify = await invoke("verify_changes", { id: a.id }); }
    catch (e) { a._verify = { ran:false, success:false, steps:[], note: String(e) }; }
    a._verifying = false; renderStage();
  };
  const pv = av.querySelector('[data-act="preview"]'); if (pv) pv.onclick = () => invoke("open_url", { url: "http://localhost:" + a.port });
  // 후속 메시지 보내기 — Enter(Shift+Enter는 줄바꿈), 또는 버튼
  const ta = av.querySelector("#followUp-" + a.id);
  const sendBtn = av.querySelector('[data-act="send"]');
  const send = async () => {
    const msg = (ta.value || "").trim(); if (!msg) return;
    sendBtn.disabled = true; ta.disabled = true;
    try { await invoke("send_message", { id: a.id, prompt: msg }); ta.value = ""; }
    catch (e) { alert(t("opFail") + e); sendBtn.disabled = false; ta.disabled = false; }
  };
  if (sendBtn) sendBtn.onclick = send;
  if (ta) ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });
}

function renderGit(){
  const gp = $("#gitpanel"); if (!gp) return;
  if (!(selectedId && state.has(selectedId))){ gp.innerHTML = `<div class="gp-empty">${t("gpEmpty")}</div>`; return; }
  const a = state.get(selectedId); const st = a._stat;
  const filesHtml = st && st.files && st.files.length
    ? st.files.map(f => `<div class="gp-file" data-fdiff="1"><span class="fn">${esc(f.name)}</span><span class="fst"><span class="gp-add">+${f.adds}</span><span class="gp-del">-${f.dels}</span></span></div>`).join("")
    : `<div class="gp-empty" style="padding:4px 6px">${t("gpNoChange")}</div>`;
  gp.innerHTML =
    `<div class="gp-head">${t("gpBase")}: <b>${esc(baseBranch)}</b> · #${shortId(a.id)}</div>
     <div class="gp-sec">
       <h4 title="${esc(t("wtTitle"))}">${t("wtPath")}</h4>
       <div class="gp-wt"><code class="gp-wtpath" title="${esc(a.worktree || "")}">${esc(a.worktree || "")}</code>
         <button class="linkbtn" id="gpOpenWt" ${a.worktree ? "" : "disabled"}>${t("wtOpen")}</button></div>
     </div>
     <div class="gp-commit">
       <textarea id="gpMsg" placeholder="${esc(t("gpCommitPh"))}"></textarea>
       <button class="btn go" id="gpCommitBtn">✓ ${t("gpCommit")}</button>
     </div>
     <div class="gp-sec">
       <h4>${t("gpAgainst")}<span class="n">${st ? st.files.length : 0}</span></h4>
       ${filesHtml}
     </div>`;
  const wtBtn = $("#gpOpenWt"); if (wtBtn) wtBtn.onclick = () => { if (a.worktree) invoke("open_path", { path: a.worktree }).catch(e => alert(t("opFail") + e)); };
  $("#gpCommitBtn").onclick = async () => {
    const msg = $("#gpMsg").value;
    try { const res = await invoke("commit_agent", { id: a.id, message: msg || "" }); showHint(typeof res === "string" ? res : t("status_committed")); a._stat = null; loadAgents(); }
    catch (e) { alert(t("saveFail") + e); }
  };
  gp.querySelectorAll('[data-fdiff]').forEach(el => el.onclick = () => viewDiff(a.id));
}

// 사이드바/탭 클릭(이벤트 위임) + 새 작업
$("#wsList").addEventListener("click", (e) => { const row = e.target.closest(".ws-item"); if (row) selectAgent(row.dataset.id); });
$("#agentTabs").addEventListener("click", (e) => {
  const x = e.target.closest("[data-x]"); if (x){ e.stopPropagation(); closeTab(x.dataset.x); return; }
  if (e.target.closest(".atab.new")){ showComposer({ reset: true }); return; }
  const tab = e.target.closest(".atab"); if (tab && tab.dataset.id) selectAgent(tab.dataset.id);
});
$("#btnNew").addEventListener("click", () => showComposer({ reset: true }));

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
listen("agent_update", (ev) => {
  const a = ev.payload; const isNew = !state.has(a.id);
  const cur = state.get(a.id) || {}; state.set(a.id, { ...cur, ...a, output: cur.output || [] });
  if (isNew) selectAgent(a.id); else render(); // 새 작업이면 자동으로 열어 보여줌
});
listen("agent_output", (ev) => {
  const { id, text } = ev.payload; const a = state.get(id); if (!a) return;
  const wasEmpty = !(a.output && a.output.length);
  (a.output = a.output || []).push(text);
  if (id !== selectedId) return;                 // 안 보이는 탭은 상태만 누적
  const term = document.getElementById("term-" + id);
  if (term && !wasEmpty) { term.insertAdjacentHTML("beforeend", "\n" + markTool(text)); term.scrollTop = term.scrollHeight; }
  else renderStage();                            // 첫 줄이면 대기 문구를 지우고 다시 그림
});
listen("agent_done", (ev) => {
  const a = ev.payload; const cur = state.get(a.id) || {};
  const merged = { ...cur, ...a, output: cur.output || [], _stat: null };
  state.set(a.id, merged);
  addWeekly(a.id, (merged.tokens_in || 0) + (merged.tokens_out || 0)); // 주간 누적(작업당 1회)
  render();
});
listen("agent_removed", (ev) => {
  const id = ev.payload.id; state.delete(id);
  const i = openTabs.indexOf(id); if (i >= 0) openTabs.splice(i, 1);
  if (selectedId === id) selectedId = openTabs.length ? openTabs[openTabs.length - 1] : null;
  render();
});
listen("teammate_update", (ev) => {
  const { agentId, name, status, desc, result, isError } = ev.payload || {};
  const a = state.get(agentId); if (!a) return;
  a.teammates = a.teammates || {};
  const prev = mate(a.teammates, name);
  a.teammates[name] = { status, desc: desc || prev.desc || "", result: result || prev.result || "",
                        isError: !!isError || !!prev.isError };
  if (agentId === selectedId) renderStage(); else renderSidebar();
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
