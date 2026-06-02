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
