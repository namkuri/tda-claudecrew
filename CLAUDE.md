# CLAUDE.md — ClaudeCrew 프로젝트 가이드

> 이 파일은 Claude Code가 세션 시작 시 자동으로 읽습니다. 이 프로젝트를 이어서 개발할 때
> **먼저 이 문서와 `docs/ROADMAP.md`를 읽고**, ROADMAP의 작업을 위에서부터 진행하세요.

## 0. 한 줄 요약
프로그래밍을 모르는 일반인이 **AI 전문가 팀에게 일을 맡기는** 데스크톱 앱.
Superset의 사용성 + oh-my-opencode(omo)의 오케스트레이션을 합치되, **안전·합법**하게.
스택: **Tauri v2 (Rust 백엔드 + 정적 HTML UI)**.

## 1. 절대 지켜야 할 안전 원칙 (위반 금지)
이 제품의 합법성은 아래 선을 지키는 데서 나온다. 어떤 작업도 이걸 넘지 않는다.
- **공식 `claude` 바이너리만 구동**한다(헤드리스 `claude -p`). 에이전트 추론을 자체 구현하지 않는다.
- **자격증명(OAuth 토큰/비밀번호/API 키)을 저장·전송·위조하지 않는다.** 인증은 전적으로 Claude Code가 한다.
- **공식 클라이언트인 척 헤더를 위조하지 않는다**(과거 차단 사유).
- 모든 작업은 **격리된 git worktree**(`<repo>/.agentboard/<branch>`)에서만 수행 → 원본 무손상·되돌리기 가능.
- 일반인 보호를 위해 **기본 권한은 acceptEdits("이 폴더 안에서만 편집")**. 위험 작업은 차단이 기본.
- 비용은 항상 투명하게 노출. 헤비 병렬은 구독 한도를 빠르게 소모하므로 가드 필요.

## 2. 아키텍처
```
ui/ (정적 HTML, window.__TAURI__ 글로벌 API)
  └─ invoke(command) / listen(event)  ──▶  src-tauri/src/lib.rs (Rust 커맨드)
                                              ├─ git worktree 생성/정리
                                              ├─ claude -p --output-format stream-json 실행
                                              └─ 진행상황을 이벤트로 emit
공식 Claude Code(사용자 로그인) → Anthropic
```
- **이벤트 계약**: Rust `emit` ↔ JS `listen` 이름이 정확히 일치해야 함:
  `agent_update`, `agent_output`(`{id,text}`), `agent_done`, `agent_removed`(`{id}`).
- **withGlobalTauri: true** 라서 번들러 없이 `window.__TAURI__.core/.event/.dialog` 사용.

## 3. 파일 지도
- `ui/index.html` `ui/styles.css` `ui/main.js` — 온보딩 + 보드 + 레시피 + 바뀐 점(diff) UI
- `src-tauri/src/lib.rs` — **모든 백엔드 로직**(커맨드 7종). 여기가 핵심.
- `src-tauri/src/main.rs` — 진입점(`claudecrew_lib::run()`)
- `src-tauri/agents/*.md` — 전문가 정의(컴파일 시 `include_str!`로 포함, `setup_environment`가 `~/.claude/agents/`에 기록)
- `src-tauri/hooks/*.{ps1,sh}` — 안전/품질 훅 스크립트(OS 두 벌, `include_str!`로 포함, `~/.claude/claudecrew-hooks/`에 기록)
- `src-tauri/skills/<name>/SKILL.md` — 스킬 10종(멀티파일: security-research/scripts/ 포함). `~/.claude/skills/`에 기록
- `src-tauri/commands/*.md` — 슬래시 커맨드(hyperplan/security-research/remove-deadcode/review). `~/.claude/commands/`에 기록
- `.github/workflows/{build,pages}.yml` — 클라우드 빌드(제어 정책 우회) + Pages 데모 배포
- `docs/SETUP-GUIDE.md` — **사용자가 직접 할 일**(git init·push, Pages/Actions 켜기, 설치파일 내려받기)
- `docs/RUN-AND-TEST.md` — **데스크톱 앱 실행·기능별 테스트 시나리오**(온보딩~미리보기·팀·검색·복원까지)
- `claudecrew-plugin/` — 전문가·스킬·훅·MCP를 한 덩어리로 묶은 배포용 플러그인(부록A 8)
- `scripts/build-plugin.mjs` — `claudecrew-plugin/`을 src-tauri 원본으로 채우는 빌드 스크립트(`npm run plugin`)
- `scripts/check-bundle.mjs` — 전문가/스킬/커맨드 형식 + lib.rs 설치 등록 드리프트 검증(`npm run check`)
- `src-tauri/AGENTS.md` — 전문가/스킬/훅 거버넌스(추가 규칙·구성요소 표)
- `src-tauri/tauri.conf.json` — 창/번들/아이콘/`frontendDist: ../ui`
- `src-tauri/capabilities/default.json` — dialog/opener 권한
- `docs/ROADMAP.md` — **다음 단계 작업 백로그(우선순위·완료기준 포함)**

## 4. 현재 구현 상태 (v0.3 — oMo/Superset 수준 강화)
구현됨:
- 커맨드: `check_claude`, `setup_environment`(전문가 5종 + **스킬 6종** + 팀 플래그 + **안전/품질/컨텍스트 훅 6종**),
  `create_agent`(worktree → `claude -p` 스트리밍, **agent 위임 / team 팀모드 / keepgoing 끝까지모드**), `list_agents`, `get_diff`,
  `stop_agent`, `cleanup_agent`, **`commit_agent`(적용)**, **`set_cost_cap`/`get_cost_cap`**, **`enable_search`/`disable_search`(MCP 검색)**.
- **스킬 6종(T2/v0.3)**: git-master, test-writer, frontend-ui, browser-test, doc-writer, init-deep → `~/.claude/skills/`. 전문가 `skills:` 연결.
- **훅 6종(T1/v0.3)**: PreToolUse(위험차단)·PostToolUse(prettier)·Stop·TeammateIdle(끝까지, `CLAUDECREW_KEEPGOING=1`)·TaskCompleted(품질)·**SessionStart(컨텍스트 주입)·SubagentStop(정리)**.
- **MCP 검색(v0.3)**: `enable_search(repo)`가 `<repo>/.mcp.json`에 context7(키 불필요) 연결. librarian에 `mcpServers: context7` 인라인. UI "검색 켜기" 토글.
- **거시→미시 리뷰(v0.3)**: `get_diff`를 파일별로 파싱 → 요약(파일 수·+/-) → 파일 클릭 시 줄단위 색상 비교(Superset 스타일).
- **레시피 6종(v0.3)**: 버그/기능/설명/테스트/정리·리팩터/코드검토 → 각자 전문가·모드 매핑.
- **팀 오케스트레이션(v0.3)**: "팀에게 맡기기" 토글 → 팀장이 전문가들에게 위임하는 프롬프트로 실행.
- **플러그인 패키징(v0.3)**: `claudecrew-plugin/`(.claude-plugin/plugin.json + hooks.json + .mcp.json) — 배포용 한 덩어리.
- **미리보기 포트(V1.2)**: `run_agent`가 출력에서 `localhost:포트` 감지 → `AgentInfo.port` → 카드 "미리보기" 버튼 → `open_url`(opener).
- **팀 병렬 시각화**: `run_agent`가 Task(서브에이전트) tool_use/tool_result 추적 → `teammate_update` 이벤트 → 카드에 전문가별 ●/✓ 칩.
- **Exa 웹검색 키**: `set_exa_key(repo,key)` → `.mcp.json`에 exa 서버(env EXA_API_KEY, 사용자 본인 키). UI "웹검색 키" 버튼. `.mcp.json`은 .gitignore.
- **작업 공간 복원(V1.3)**: `restore_agents(repo)` — `git worktree list`로 `.agentboard/` 작업 복원. 시작 시 호출.
- **omo 수준 AI 관리(v0.4)**: 전문가 **7종**(+plan 계획가, +security 보안가), 스킬 **10종**, 슬래시 커맨드 **4종**.
  - **hyperplan 스킬**: 적대적 다중 에이전트 계획(5 관점 비판자 Task 병렬 소환 → 3라운드 교차비평 → 증류 → plan 위임). omo 시그니처 이식.
  - 워크플로 스킬: **security-research**(+scripts/scan-secrets {sh,ps1} 멀티파일), **remove-deadcode**, **pre-publish-review**(다중 관점 게이트).
  - 커맨드: `/hyperplan /security-research /remove-deadcode /review` → `~/.claude/commands/`.
  - UI 레시피 **8종**(+🧠 계획 세우기[hyperplan], +🛡️ 보안 점검).
- **고도화(v0.5)**:
  - **안전 수준 프리셋(V1.4)**: 이 폴더만(acceptEdits)/읽기만(plan)/전체 허용(bypassPermissions, 위험확인). 읽기전용 레시피는 권한을 올리지 않음.
  - 스킬 **12종**: +github-triage(+scripts/gh-list), +work-with-pr.
  - **레시피 마켓/공유(V2.1)**: 커스텀 레시피 localStorage + 내보내기/가져오기(JSON 묶음). 가져온 레시피는 점선 버튼으로 렌더.
  - **API 전환 힌트(V2.3)**: 동시 실행 3개 이상이면 "API 권장" 배지.
- **고도화(v0.6 — 대>중>소)**:
  - **다국어(V2.4)**: KO/EN i18n(`data-i18n` 속성 + `t()`/`applyI18n` + 헤더 언어 토글). 레시피 프롬프트 텍스트도 언어별.
  - **정밀 편집(V2.2)**: precise-edit 스킬 + `enable_lsp`/`disable_lsp`(serena 시맨틱 MCP를 `.mcp.json`에) + UI "정밀 편집" 토글. → 스킬 **13종**.
  - **API 모드 감지(V2.3, 안전)**: `check_api_mode`가 환경의 `ANTHROPIC_API_KEY` 존재만 읽어 "✓ API 모드" 표시. **키를 저장/취급하지 않음**(안전 원칙).
  - **레시피 인앱 편집기**: ＋레시피 만들기 모달(이름/이모지/문구/전문가/속도/안전), 커스텀 레시피 우클릭 편집·삭제.
  - **배포 전 검토 게이트**: 🚦 레시피 → pre-publish-review 스킬(다중 관점 병렬).
  - **플러그인 빌드**: `node scripts/build-plugin.mjs`가 `claudecrew-plugin/`을 원본으로 채우고 버전 동기화. `src-tauri/AGENTS.md` 거버넌스.
- **워크스테이션 UI(v0.7 — Superset식 3-컬럼)**:
  - **좌 사이드바**: 저장소명+작업 수, 워크스페이스 목록(상태점·이름·브랜치·diff ±·#id), Claude 연결/모델/사용량/상한.
  - **중앙**: 에이전트별 **터미널 탭**(상태점·닫기) + "＋새 작업"(컴포저). 선택 작업은 **Claude 캐릭터(코랄 `--claude`, 상태별 색/바운스) + 말풍선**("저 작업 끝냈어요!" 등)으로 직관 표시 + 팀원 칩·터미널 로그·액션.
  - **우 Git 패널**: 기준 main, 커밋 메시지+커밋(commit_agent), "main 대비 변경" 파일 목록(±, 클릭 시 거시→미시 diff 모달).
  - 사이드바 ± 통계는 `ensureStat`로 get_diff 1회 캐싱. 새 작업 생성 시 자동 탭 오픈. 데모 검증 완료.
- **사용성 개선(v0.8)**:
  - **토큰 소스 선택(구독/API)**: 사이드바 세그 토글. 구독(앱 플랜) 선택 시 `run_agent`가 자식 프로세스에서 `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN`을 **제거** → Claude Code가 로그인된 구독(Claude Max 등)으로 청구. 키는 저장하지 않음(안전).
  - **자동 오케스트레이션 기본**: 레시피 없이 그냥 적으면 `create_agent`가 "오케스트레이터가 전문가·스킬을 스스로 고르고, 없으면 스킬을 만들어 진행" 프롬프트를 주입. 레시피는 접이식 "빠른 템플릿(선택)"으로 강등.
  - **멀티 CMD 콘솔**: 에이전트 뷰 = **오케스트레이터 터미널(메인) + 서브에이전트별 미니 콘솔(설명→결과) + 호출관계 바**. `process_teammates`가 Task tool_use/result에서 설명·결과 스니펫을 추출해 `teammate_update`로 전달.
  - "+새 작업" 수정(컴포저 복귀+프롬프트 초기화+포커스).
- **사용성 수정(v0.8.1)**:
  - **오케스트레이션 프롬프트 버그 수정**: 지시문이 앞에 길게 깔려 요청이 묻혀 모델이 "요청이 비었다"며 되묻던 문제 → **사용자 요청을 맨 앞에 두고 안내는 짧게 뒤로**. (team/agent/auto 세 분기 모두)
  - **토큰/컨텍스트 상태바(최하단)**: `usage_of`로 stream-json의 `usage`(input/output/cache) 추출 → AgentInfo.tokens_in/out/ctx. 상태바에 **세션 ↑/↓ 합계 · 오늘/최근7일(Claude Code stats-cache) · 현재 작업 컨텍스트(토큰/200k % + 막대)**. 구독 잔여 한도는 Claude Code가 비공개라 '사용량'으로 표기(ⓘ 안내).
  - **read_usage 커맨드(v0.8.2)**: `~/.claude/stats-cache.json`(Claude Code `/usage` 화면의 원본)을 읽어 `UsageStats`(모델별 합계 · 오늘/주간 토큰·메시지·세션 수)로 반환. 15초 주기 갱신. 상태바에 "Claude Code" 출처 배지.
- **대화 가능한 작업 + 진짜 병렬 오케스트레이션(v0.8.3)**:
  - **세션 재개**: stream-json system 이벤트의 `session_id`를 `AgentInfo`에 저장. `send_message(id, prompt)` 커맨드가 같은 worktree에서 `claude -p -r <session_id>`로 후속 메시지 실행 → 한 작업 탭에서 **대화로 이어 말할 수 있음**.
  - UI: 에이전트 뷰 하단에 후속 입력창(Enter 보내기, Shift+Enter 줄바꿈). 사용자 메시지는 메인 콘솔에 `💬 사용자: …`로 기록.
  - **자동 오케스트레이션 강화**: 프롬프트에 "독립적인 조각은 한 어시스턴트 턴에 Task들을 묶어 동시에 호출해 병렬 진행"을 명시.
- **데스크톱 사용성/투명성(v0.8.4)**:
  - **CMD 창 깜빡임 제거**: Windows에서 자식 프로세스(`cmd /C claude`, `git`, `taskkill`)에 `CREATE_NO_WINDOW`(0x08000000) 플래그 적용 → 콘솔 창 더는 안 뜸. `hide_window()` 헬퍼로 일괄.
  - **대화 상대 라벨**: `AgentInfo.role` 추가(`orchestrator`/`team`/전문가명). 에이전트 뷰 말풍선 위에 "대화 상대: 오케스트레이터/팀장(병렬 위임)/<전문가>" 칩 표시.
  - **작업 상태 디스크 영속화**: `.agentboard/<branch>/.cc-state.json`에 prompt/status/session_id/role/output/cost/tokens 저장(매 줄 출력의 5건마다, set_status·agent_done에서). `restore_agents`가 이 파일을 읽어 **터미널 로그·세션ID·역할까지 진짜 복원**.
  - **worktree 가시화**: 사이드바 행 툴팁 = `역할 · worktree 경로`. Git 패널에 worktree 경로 + 📁 폴더 열기 버튼(`open_path` 커맨드).
- **진짜 vs 가짜 전수 점검(v0.8.5)** — 사용자 명령 "데모/스텁 없도록":
  - **read_usage 시간 정확화**: 백엔드의 UTC `today_iso` 제거 → UI가 `new Date().toLocaleDateString("sv-SE")`로 사용자 로컬 날짜를 백엔드에 전달. KST 등 시간대에서 "오늘"이 정확. 잘못된 `>= today` 조건도 제거.
  - **기준 브랜치 동적 검출**: `get_base_branch` 커맨드 추가 — `origin/HEAD` → `main` → `master` → 현재 HEAD 순으로 폴백. `detect_base_branch` 헬퍼. 사이드바 wsBase·Git 패널 헤더가 동적 baseBranch 표시(이전 "main" 하드코딩 제거).
  - **get_diff 정확화**: `git diff --cached`(staging만) → `git diff <base>`(기준 브랜치 대비, 새 파일 포함하도록 `add -A` 선행). UI 라벨도 "기준 브랜치 대비 변경"으로 솔직하게.
  - **restore_agents 폴백 라벨 제거**: `.cc-state.json` 없는 마이그레이션 케이스에서 "(이전 작업 — 복원됨)" placeholder → branch명 그대로(솔직).
  - **데모 모드 가시성**: 데스크톱 빌드에서는 `window.__TAURI__` 가드로 절대 미실행. 데모 mock의 `read_usage`도 `available: false`로 명시(데스크톱과 헷갈리지 않도록). 데모 진입 시 콘솔에 `[ClaudeCrew] Demo mode` 경고.
  - **.gitattributes**: `.sh` 파일 LF 강제(Windows에서 푸시해도 Unix에서 깨지지 않음).
- **전문가용 신뢰도(v0.9) — 검증·격리·정직성 강화**:
  - **F1 자동 검증 게이트**: `verify_changes` 커맨드가 worktree에서 프로젝트 종류(Node/Rust/Python/Go)를 감지해 빌드/테스트를 실행. UI '🧪 자동 검증' 버튼 + 결과 패널(단계별 ✓/✗ + stderr 마지막 3줄). 검증 실패면 '적용' 버튼에 ⚠ 표시(강제 적용은 가능하되 가시화).
  - **F2 프로젝트 컨텍스트 주입**: `build_context_prompt`가 원본 저장소의 `CLAUDE.md`/`AGENTS.md`/`README.md`(최대 24KB)를 읽어 첫 호출에 `--append-system-prompt`로 첨부 → 격리된 worktree에서도 AI가 프로젝트 컨벤션을 안다. 후속 메시지는 세션 컨텍스트에 누적되므로 첨부 안 함.
  - **F3 다중 에이전트 강제**: 팀 모드 프롬프트를 "권장"에서 "⚠ 반드시 Task 도구로 위임" 명령형으로. 자동 모드 프롬프트도 병렬 위임 가이드 유지.
  - **F4 훅 범위 분리(기본 안전)**: `setup_environment(repo, hook_scope)` — 기본 `"project"`는 훅을 **`<repo>/.claude/settings.json`** 에만 등록 → 사용자의 다른 Claude Code 세션을 안 건드림. 옵션 `"global"`(전체)·`"none"`(끄기). 기존 전역 항목은 자동 정리.
  - **F7 에러 가시성**: stream-json `result` 이벤트의 `is_error`/`subtype=error_*` 감지 → "❌ 오류: …" + 한도/인증/네트워크 힌트 자동 분기 표시.
  - **F8 Task 실패 시각화**: 서브에이전트 `tool_result.is_error` → 미니 콘솔 빨간 테두리·✗ 라벨 + 에러 메시지 표시(이전에는 무조건 ✓ done이었음 → 거짓 성공).
- **웜업 방식 — 컨텍스트를 별도 메시지로(v0.9.2)**:
  - `--append-system-prompt(-file)` 의존 제거. 큰 CLAUDE.md를 시스템 프롬프트로 매번 다시 보내지 않고, 첫 작업에 **별도 "학습" 메시지**(읽기 전용 plan 모드)로 한 번 흘려보내 session_id 확보 → 사용자 요청은 `--resume`으로 보냄.
  - 장점: ① OS 명령행 한도(Windows 8191자 / 32K) **완전 무관** ② 매번 동일 컨텍스트 재전송 제거(토큰 절약) ③ 후속 메시지도 같은 세션이라 컨텍스트 공유.
  - `spawn_claude_once` 헬퍼로 한 claude 호출(spawn → 파싱 → wait)을 추출. `quiet=true` 웜업은 결과를 짧게(`📚 학습 완료: …`) 요약.
  - 비용/토큰은 웜업 + 메인 합산. 웜업 실패 시 메인은 컨텍스트 없이 진행.
  - 새 상태 **`warming`**: 캐릭터 코랄 색 + 말풍선 "📚 프로젝트 학습 중…" + 사이드바·탭 점 코랄 펄스.
- **UX·투명성 강화(v0.9.5)**:
  - **반응형**: 사이드바 `cs-sub`/`cs-token`, 컴포저 `controls` 모두 `flex-wrap` + 명시적 `flex:none` 으로 좁은 창에서도 자연 줄바꿈(요소 1개씩 수직 나열 방지).
  - **도구 라벨링**: `🔧 Read/Bash/Glob/Grep/Task/...` 백엔드 로그를 UI에서 `📖 파일 읽기(Read)`/`💻 명령 실행(Bash)`/`🔍 파일 검색(Glob)`/`🔎 코드 검색(Grep)`/`🧑‍💼 전문가 위임(Task)` 등 친화 라벨 + 한 줄 툴팁으로 보여줌(`TOOL_LABELS` 매핑).
  - **서브에이전트 메타·원리**: `teammate_update` 가 `model`/`prompt`/`startedAt`/`endedAt` 함께 emit. 미니 콘솔에 ① 모델·시작시각·소요시간 ② **왜**(description) ③ **무엇을**(prompt 펼치기) ④ **결과**(요약) 표시. 헤더 ⓘ에 "단방향 위임 — 자식 LLM 세션이 독립 처리 후 결과만 반환. 사용자가 직접 대화 불가, 별도 CMD/창 없음" 안내.
- **Pretty 모드 + 전문가 아이콘 + 스크롤 + worktree 보강(v0.10)**:
  - **Pretty 모드(헤더 ✨ 토글)**: 콘솔 출력을 **도구 호출 그룹**(🔧 헤드 + ↳ 결과)으로 묶고 **마지막 그룹만 펼침**·이전은 한 줄 접힘. **Markdown 렌더**(h1~h3·`code`·```block```·**bold**·*italic*·-목록). **추론(💭)/답변/사용자/시스템/오류/진단** 별도 스타일.
  - **전문가 아이콘 매핑**(`EXPERT_BADGES`): orchestrator 🧠 · team 🧑‍💼 · oracle 🔮 · librarian 📚 · implementer 🛠️ · debugger 🐞 · code-reviewer 🔍 · plan 📋 · security 🛡️. 사이드바·오케스트 바·서브 콘솔 헤더 모두 적용.
  - **스티키 스크롤**: 사용자가 위로 올린 동안엔 자동 추적 중지(`_stickyEls`), 다시 하단 도달 시 재개. 위로 올렸을 때 우측 하단 "↓ 새 내용 보기" 떠다니는 버튼.
  - **worktree 안전 강화**: `cleanup_agent`가 `worktree remove` 외에 `git branch -D ab/<branch>` + `git worktree prune` 까지 호출(동명 작업 충돌·stale 레코드 방지). `restore_agents`도 시작 시 `prune` 호출.
- **멀티 윈도우(v0.11.0 — Phase 1/4 of 3-1)**:
  - `open_task_window(id)` 커맨드(`WebviewWindowBuilder`)가 `task-<id>` 라벨로 새 창 생성. URL `?detached=1&taskId=<id>` 쿼리. 이미 열려 있으면 포커스.
  - UI: 부트 시 URL 쿼리 감지 → `html.detached` 클래스 → 사이드바/Git 패널/탭바/온보딩 숨김 → 중앙 풀스크린. selectedId = DETACHED_ID.
  - Tauri emit 은 모든 창에 broadcast → **메인 ↔ 별도 창 상태 자동 동기화**(추가 IPC 불필요).
  - 액션바에 **🪟 별도 창** 버튼. 새 빌드 자동 빌드 중.
- **시간축 재생 + Git 미니맵(v0.12.0 — Phase 3/4·4/4 of 3-1)**:
  - **P3 타임라인 영속화**: `emit_output`이 worktree의 `.cc-timeline.jsonl`에 `{t, text}` 한 줄씩 append. `get_timeline(id)` 커맨드로 UI 로드.
  - **P3 시간축 슬라이더**: 에이전트 뷰 하단에 ▶/⏸·⏮·range·속도(1/2/4×)·LIVE 컨트롤. LIVE 모드(자동 따라감) ↔ scrub 위치까지의 output만 표시. `_timeline[id]` 상태로 작업별 재생 위치 보존. `visibleOutput(a)`이 cut-off 적용.
  - **P4 미니맵 패널 탭**: 메인 콘솔 헤드에 콘솔 ↔ 🗺 미니맵 전환. 백엔드 추가 없이 UI가 `_activityRe` 정규식으로 output 파싱 → Read/Write/Edit는 파일 트리(`buildFileTree`), Glob/Grep/Bash는 카운트. 좌: 디렉토리 트리(폴더 우선 정렬·마지막 활동 아이콘·반복 카운트 ×N), 우: 최근 30개 활동 로그.
  - **시간축↔미니맵 연동**: 슬라이더로 과거 시점 이동 시 미니맵도 그 시점까지의 활동만 표시(scrub→`_aForRender.output` 슬라이스→미니맵 재계산).
  - 데모 검증: 트리 `src/login.js`(Read+Edit ×2), 기타 `🔍1 🔎0 💻1`, 슬라이더 3으로 이동 시 트리 비어짐.

- **P2 패널 도킹(v0.13.0 — Phase 2 of 3-1 완료)**:
  - **Git 패널 도킹 시스템**: 우측(기본) / 하단 / 숨김 3가지. `html.dock-right|dock-bottom|dock-hidden` 클래스로 CSS Grid 영역 동적 변경(`grid-template-rows/columns` 변경 + `grid-row/column` 재배치).
  - **컨트롤 UI**: Git 패널 우상단 도킹 컨트롤(→/↓/✕) — 클릭으로 즉시 토글, **HTML5 드래그**로 우측/하단 드롭존(`.dz`)에 끌어다 놓기. 드래그 시 청록색 점선 하이라이트.
  - **상태 영속화**: `cc_gitDock` LocalStorage. 앱 재시작 후에도 사용자가 선택한 위치 유지.
  - **사이드바 ↩ Git 재오픈 버튼**: 숨김 모드일 때만 등장, 클릭 시 우측 복귀.
  - 데모 검증: 기본 right → bottom → hidden(display:none + 재오픈 버튼 등장) → right 복귀, localStorage 동기화 확인.
- **부트 lag 해소 + 양방향 보강 + 분할 모드(v0.14.0)**:
  - **빠른 복원**: `restore_agents`가 작업당 `output` 마지막 200줄만 반환(부트 즉시). 사용자가 작업 선택 시 `selectAgent → ensureFullOutput()` → `load_agent_output(id)` 커맨드로 전체 output 디스크에서 lazy 로드. `_outputTruncated`/`_outputFullLoaded` 플래그로 중복 호출 방지.
  - **비동기 enterApp**: `check_claude`/`get_cost_cap`/`check_api_mode`/`loadAgents`/`refreshUsage`를 `Promise.allSettled`로 병렬. 화면이 즉시 응답하고 컴포저 입력 가능. 우상단에 떠다니는 **부트 토스트**(스피너 + "준비 중…"/"이전 작업 복원 중…"). 완료 자동 숨김.
  - **detached 양방향**: 별도 창에서 보던 작업이 메인에서 `agent_removed`로 제거되면 친화 메시지 "⚠ 이 작업이 메인에서 제거되었어요. 창을 닫아도 좋아요."
  - **분할 패널 모드**: 메인 콘솔 헤더에 **⊟ 분할** 탭 추가 — 콘솔(좌)과 미니맵(우) 동시 표시. `cc_pane_<id>` localStorage 영속화. 좁은 창에서는 자동 상하 분할.
- **Conductor 스타일 레이아웃 차용(v0.23.0)**:
  - **우측 패널 Files/Changes/Review 탭**: 기존 Git/검증을 Conductor 트리오로 재편 + 🗺 Map · 🖥 Term. `rightTabsHtml`에 우상단 브랜치 pill(`⤴ <branch>`). cc_rightPanel `git→files`/`verify→review` 마이그레이션.
  - **Files = 디렉터리 그룹 트리**: 변경 파일을 디렉터리별로 묶어 대문자 경로 헤더(스크린샷 스타일) + 파일 아이콘(확장자별) + ±카운트. 행 클릭 → Changes 탭으로 점프.
  - **Changes = 인라인 diff + Approve/Comment**: 모달 대신 패널 안에서 diff 표시. `_changesCache`로 get_diff 1회 로드. Approve=커밋(저장), Comment=후속 입력칸 포커스. agent_done 시 캐시 무효화.
  - **중앙 헤더 OPEN/RUN**: `center-head` 래퍼 — agent-tabs 우측에 OPEN 드롭다운(워크트리/IDE/미리보기) + RUN(이어하기, 후속 입력 포커스).
  - **사이드바 PORTS 패널**: a.port 가진 작업의 포트 칩 — 클릭 시 `http://localhost:<port>` 열기. `renderPorts()`가 render()에서 호출.
- **미니맵·작업 관리·병렬 모드 강화(v0.22.0)**:
  - **에이전트 아이콘 상태별 분기**: 실행 중(running/creating/warming)에만 path 애니메이션, done/error/stopped는 마지막 활동 노드에 고정 + "완료/실패/정지" 라벨. 라벨은 외곽선(stroke #000) + 밝은 색(#f5e8dc)로 가시성 확보. 서브에이전트는 작은 보조 배지로 마지막 노드 주변 분산 배치.
  - **미니맵 파일 클릭 → 코드 미리보기**: `read_file_preview(id, rel)` 백엔드 커맨드(worktree 경계 검증 + 256KB·400줄 컷). UI에서 파일 노드 클릭 시 활동 로그 위에 line-number 박스로 prettify 미리보기. 보안: `..`/RootDir/Prefix 거부, canonicalize 후 worktree 안 검증.
  - **사이드바 작업 삭제 + 우클릭 메뉴**: 각 `.ws-item` 우상단 ✕ 버튼(hover 시 노출) + 우클릭 컨텍스트 메뉴(열기/별도창/중지/프롬프트 복제/삭제). 삭제는 `uiConfirm` 모달 다이얼로그 후 `cleanup_agent`.
  - **🚀 병렬 분할 토글 + 📊 통합 모니터링 보드**: 토글 ON 시 `create_agent` 호출에 `parallel: true` 전달 → 백엔드가 effective_prompt에 "첫 어시스턴트 턴부터 3~7개 Task 동시 호출 강제, 순차 처리 금지" 강력 지시 추가. 헤더 `📊 보드` → 모든 작업을 grid 카드(2~3열)로 표시. 카드별 status, 경과시간, 토큰, 위임 서브 수, 최근 도구. 카드 클릭 → 해당 작업 선택.
- **PTY/xterm.js 내장 + 온보딩 자동 진행(v0.21.0)**:
  - **portable-pty 백엔드**: `pty_open(label,cwd,cmd,args,cols,rows)` / `pty_write` / `pty_resize` / `pty_close` 커맨드. 스레드가 master에서 읽어 `emit("pty_data")`. ConPTY(Windows)/Unix pty 모두 지원.
  - **xterm.js 내장 터미널**: `ui/vendor/xterm.js + xterm-addon-fit + xterm.css` 로컬 번들. 우측 패널 4번째 탭 `🖥 터미널` — claude REPL을 앱 안에서 직접. /login 같은 슬래시 커맨드도 OK.
  - **터미널 마운트 자동 흐름**: 탭 클릭 → `mountPty("main")` → `Terminal` + `FitAddon` 생성 → 백엔드 `pty_open(cwd=worktree)` → 양방향 통신. 창 크기 변경 시 `fit()` + `pty_resize`.
  - **온보딩 자동 진행**: 한 번이라도 시작한 사용자(`cc_skipOnboarding=1` + `cc_repo` 존재)는 즉시 메인 화면. check/setup은 백그라운드.
  - **헤더 폴더 칩 + 변경 버튼**: 사이드바 폴더명 옆 ⚙ 버튼·이름 클릭 둘 다 폴더 변경 다이얼로그. 토스트로 변경 알림.
- **미니맵 path 애니메이션 + 서브에이전트 상세(v0.20.0)**:
  - **에이전트 path 애니메이션**: 마지막 12개 활동의 노드 좌표를 시퀀스화 → SMIL `animateTransform` keyTimes/keySplines로 부드러운 보간(spline 0.4 0 0.6 1). 활동 하나당 ≈0.7s, 무한 반복. 진짜로 "노드 사이를 돌아다니는" 시각.
  - **서브에이전트 통계 띠**: result 텍스트 분석 — 코드 블록(```\``\``\``), 파일 언급(확장자 패턴), 명령(`$` 또는 ```bash), 글자/줄 수. 코랄 칩으로 표시. 툴팁에 "SDK 한계로 추정치" 안내.
  - **결과 Markdown 렌더**: 기존 `esc()` 단순 텍스트 → `mdToHtml`. 코드 펜스 syntax 박스, 인라인 code, 리스트 모두 표시. 400자 초과 시 미리보기 280자 + 펼치기 details.
- **패널 리사이저 + 미니맵 다이어트(v0.19.0)**:
  - **컬럼 리사이저**: 좌(사이드바)-중(콘솔)-우(패널) 사이 5px grip bar 2개(좌/우). 드래그=폭 조절, 더블클릭=리셋. `cc_colL/cc_colR` localStorage. 클램프 좌180~520 / 우220~640.
  - **미니맵 다이어트**: SVG 노드 테두리(stroke) 제거 → 마지막 활동 노드만 `rgba(232,148,103,.10)` 살짝 강조 + drop-shadow 펄스. 행간 NODE_H 26→20, GAP_Y 8→2, INDENT 22→18. 200줄 활동 미니맵이 한 화면에 더 많이 들어옴.
- **앱 내 재로그인 도우미(v0.18.0)**:
  - **`open_login_terminal` 커맨드**: Windows `cmd /K claude` 새 콘솔 / macOS `osascript Terminal.app` / Linux `x-terminal-emulator → gnome-terminal → konsole → xterm` 폴백. 새 창에 Claude REPL 띄워 사용자가 `/login` 직접 입력 → 브라우저 OAuth 자동.
  - **`verify_claude_auth` 커맨드**: `~/.claude/.credentials.json` 존재/mtime 확인. 키를 우리가 받지 않음(안전 원칙).
  - **재로그인 도우미 모달**: 3단계(터미널 열기 → /login 안내 → 인증 확인 후 새로고침). 토스트 액션 `[재로그인 도우미]` 클릭 → 모달. 단축어 + ko/en/ja 전체 번역.
  - **토스트 액션 버튼**: `showToast(msg, kind, ms, {action: {label, onClick}})` 시그니처 확장. 액션 클릭 시 토스트 닫히고 콜백 실행.
- **인증 친화 진단 + 사용자 풍선 + 구독 모드 비용 숨김(v0.17.0)**:
  - **401 인증 친화 안내**: claude 출력에서 `401 Invalid authentication credentials` 패턴 감지 → UI 토스트(`🔐 Claude 인증이 만료되었어요. 터미널에서 \`claude /login\` 후 ClaudeCrew를 다시 시작해주세요.`) + output에 안내 라인. 백엔드 종료 진단도 `saw_401` 분기 추가 — 출력 끝에 친화 가이드.
  - **사용자 메시지 우측 풍선**: pretty 모드에서 `💬 사용자: ...`를 우측 정렬 + 그라데이션 풍선(코랄→브론즈) + 🙋 아바타. classifyLine 정규식 `^\s*💬` — 백엔드가 `\n` prefix 붙여 보내도 매칭.
  - **구독 모드 비용 숨김**: `authMode='subscription'`일 때 헤더 `$1.92` 같은 추정치 숨기고 `오늘 토큰 N` 표시(stats-cache 기반, 참고용). 상한 입력도 같이 숨김. API 모드 전환 시 즉시 USD/상한 복귀. 추정치를 실제 청구처럼 보이지 않게.
  - **showToast 헬퍼**: native alert 대체용 — `info|warn|err` 색상, 자동 닫힘, 사용자 닫기 버튼.
- **3-in-1 우측 패널 + 타임라인 시간 표시 + 작업 그룹 + 일본어(v0.16.0)**:
  - **3-in-1 도킹**: 우측 `gitpanel` 한 패널 안에서 `🌿 Git`/`🗺 미니맵`/`🧪 검증` 탭 전환. `cc_rightPanel` localStorage 영속화. 좁은 창에서 패널 3개 펼치지 않고도 모든 정보 접근.
  - **패널 팝아웃**: `open_task_window(id, panel)`에 두 번째 인자(`minimap`/`verify`). 해당 패널만 띄우는 단일 창 모드(`?panel=minimap`). CSS `.detached-panel-minimap`이 콘솔 숨기고 패널 전체 폭으로.
  - **타임라인 시간 표시**: `selectAgent`가 `ensureTimeline(id)` → `get_timeline` lazy 로드. 타임라인 바에 `경과/전체` 시간 핀(코랄 색 `.tltime`). 백엔드 `.cc-timeline.jsonl` UI에서 실제 활용.
  - **사이드바 작업 그룹**: 4건 이상 + 필터 `전체`일 때 `▶ 진행 중 · ✓ 완료 · ⚠ 오류` 3그룹으로 분리(빈 그룹 숨김).
  - **일본어(ja) 다국어**: `I18N.ja` ~50키 추가. 토글 3-cycle `ko → en → ja → ko`. 누락 키는 영어 → 한국어로 폴백.
- **미니맵 시각 강화 + 자동 검증 + 사이드바 필터(v0.15.0)**:
  - **SVG 미니맵 트리**: 기존 HTML 트리 → SVG. `layoutSvgTree`가 깊이별 들여쓰기로 노드 좌표 계산, 노드 카드(rounded rect + 도구 아이콘 + 파일/폴더명 + 반복 카운트). 부모-자식 베지에 곡선 엣지.
  - **마지막 활동 노드 펄스**: claude 코랄색 + drop-shadow 펄스 애니메이션. 시간축 재생 시 cut-off에 따라 마지막 활동이 자동으로 이동.
  - **에이전트 배지 오버레이**: 작업의 role(오케스트레이터/팀/전문가) 아이콘이 마지막 활동 노드 위에 떠다님. 코랄 펄스 + 한국어/영어 이름.
  - **활동 로그 펄스**: 가장 최근 한 줄에 코랄 좌측 보더 + 부드러운 펄스. 재생/실시간 모두에서 다음 활동 위치를 한눈에.
  - **자동 검증 토글(✨ Pretty 옆 🧪 자동검증)**: 켜면 `agent_done` 시 자동으로 `verify_changes` 호출. 실패 시 토스트로 알림. localStorage 영속화.
  - **사이드바 작업 검색·필터**: 작업 4건 이상이면 표시. 텍스트 검색(prompt/branch/id) + 상태 필터(전체/진행/완료/오류). 데모: '로그인' 검색 → 절반만 표시.
- **훅(T1)**: `src-tauri/hooks/*.{ps1,sh}`(OS 두 벌)를 `~/.claude/claudecrew-hooks/`에 설치(.ps1은 BOM)하고
  `settings.json`의 `hooks`에 절대경로로 병합. PreToolUse(Bash 위험차단)·PostToolUse(Write|Edit prettier)·
  Stop·TeammateIdle(끝까지 모드, `CLAUDECREW_KEEPGOING=1`)·TaskCompleted(품질 게이트). exit 0=진행, 2=차단/계속.
- **스킬(T2)**: `src-tauri/skills/{git-master,test-writer,frontend-ui}/SKILL.md` → `~/.claude/skills/`. 전문가의 `skills:` 필드와 연결.
- **적용하기(T3)**: `commit_agent(id,message)` — worktree(ab/<branch>)에서 `add -A && commit`. 메시지 비우면 부탁 내용으로 기본 메시지. UI 카드에 `[적용하기]`.
- **레시피→전문가(T4)**: RECIPES에 `agent` 매핑(bug→debugger, feature/test→implementer, explain→librarian). `create_agent`가 프롬프트에 위임 지시 주입.
- **비용 가드(T5)**: 누적 cost ≥ 상한 시 실행 중 에이전트 자동 정지 + `cost_capped` 이벤트(1회). UI 헤더에 상한 입력 + 경고 배너 + 80% 도달 시 미터 경고색.
- **CI/Pages(인프라)**: `.github/workflows/build.yml`(클라우드 멀티OS 빌드 → Artifacts, 제어 정책 우회), `pages.yml`(ui/ 데모 배포).
  `ui/main.js`에 **데모 모드 폴백**(`window.__TAURI__` 부재 시 목업 — 브라우저에서 화면 체험).
- UI: 온보딩 3단계, 폴더 선택(dialog), 레시피 4종, 꼼꼼함 슬라이더(haiku/sonnet/opus),
  실시간 진행 카드, 바뀐 점 모달, 적용하기/멈추기/되돌리기, 사용량 합계 + 상한, 데모 배지.

**아직 안 된 것(다음 — ROADMAP v1):**
- **실제 에이전트 팀(lead+teammates) 오케스트레이션**(V1.1) — 지금은 단일 `claude -p`에 전문가 위임까지.
- **미리보기(포트)**(V1.2), **작업 공간 영속화/복원**(V1.3), **권한 UI**(V1.4), **단일 설치형 배포 검증**(V1.5).
- MCP 설치(V2.2).

> 빌드 주의: 로컬 Windows에서 Smart App Control/WDAC가 `cargo` 빌드스크립트 실행을 막을 수 있음(`os error 4551`).
> 이 경우 `docs/SETUP-GUIDE.md`의 GitHub Actions 클라우드 빌드 경로를 사용.

## 5. 코딩 컨벤션 / 주의
- **Tauri v2** API만 사용(`tauri::{Manager, Emitter}`, `app.emit`, `app.state`).
- 커맨드 파라미터는 **단어 하나(소문자)** 로 유지해 camelCase↔snake_case 혼선을 피한다(`repo, prompt, id` 등).
- 새 이벤트를 추가하면 **Rust emit과 JS listen을 같이** 바꾼다.
- 무거운 작업은 **별도 스레드**에서(`create_agent` 패턴 참고). 커맨드는 빨리 반환.
- Windows에서 `claude`는 `.cmd`라 **`cmd /C claude …`** 로 호출(`claude_command()` 참고).
- UI 문구는 **일반인용 쉬운 한국어**(전문용어 금지: diff→"바뀐 점", commit→"변경 저장", PR→"제안 보내기").
- PowerShell 스크립트를 새로 만들면 **UTF-8 BOM**으로 저장(한글 깨짐 방지).

## 6. 실행 / 검증
```bash
npm install
npm run dev      # tauri dev
npm run build    # 배포 빌드
```
빌드 없이 빠른 점검:
```bash
node --check ui/main.js
node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8'))"
```
사전 조건: Rust, Node 18+, git, **Claude Code 설치+로그인**, OS별 Tauri 의존성(README 참고).

## 7. 이어서 작업하는 법 (이 프로젝트에서)
1. `docs/ROADMAP.md`의 최상단(다음 마일스톤) 작업을 선택한다.
2. **격리해서** 작업한다: `claude --worktree <기능명>` 또는 데스크톱 앱의 새 세션.
3. 변경 후 6장의 검증을 돌리고, 가능하면 `npm run dev`로 수동 확인.
4. 1장의 안전 원칙을 절대 위반하지 않는다.
5. 완료 시 이 문서의 "현재 구현 상태"와 ROADMAP 체크박스를 갱신한다.

## 8. 참고 문서(외부)
- Claude Code: worktrees / sub-agents / agent-teams / hooks / skills / headless(`claude -p`) — code.claude.com
- 본 프로젝트 기획: "ClaudeCrew 기획보고서", 부록 A "Skills·Hooks 설정 셋업"(별도 docx)
