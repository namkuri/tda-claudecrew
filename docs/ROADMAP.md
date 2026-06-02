# ROADMAP — ClaudeCrew 다음 단계 작업 백로그

> Claude Code가 이 파일을 보고 **위에서부터** 작업한다. 각 작업은 [목표] / [구현 위치] /
> [작업] / [완료 기준] / [참고]를 가진다. 안전 원칙(CLAUDE.md 1장)을 항상 지킨다.
> 진행하며 체크박스(`[ ]`→`[x]`)와 CLAUDE.md "현재 구현 상태"를 갱신한다.

---

## 마일스톤 v0.2 — "진짜 oMo답게 + 검토/적용 완성" (다음 단계, 우선)

### [x] T1. setup_environment 에 훅(hook) 설치 추가  ✅ 완료
- **목표**: 안전 차단·끝까지 모드·품질 게이트를 자동 구성(부록 A의 셋업을 코드로).
- **구현 위치**: `src-tauri/src/lib.rs` 의 `setup_environment()` + `src-tauri/hooks/` 신규(스크립트, `include_str!`로 포함).
- **작업**:
  - `~/.claude/settings.json` 의 `hooks`에 병합:
    - `PreToolUse`(matcher `Bash`): 위험 명령(`rm -rf|DROP TABLE|sudo |:>/`) 감지 시 `exit 2`.
    - `PostToolUse`(matcher `Write|Edit`): 포맷터(prettier 등) 실행.
    - `Stop` + `TeammateIdle`: 할 일 남으면 `exit 2`로 계속(끝까지 모드).
    - `TaskCompleted`: 테스트 실패 시 `exit 2`(품질 게이트).
  - 훅 스크립트는 OS 분기(Windows=PowerShell, macOS/Linux=bash)로 두 벌 제공하고 절대경로로 등록.
- **완료 기준**: 온보딩 후 `~/.claude/settings.json`에 위 4개 훅이 들어가고, 위험 명령이 실제로 차단됨(수동 확인).
- **참고**: 부록 A "4. 훅 셋업". exit code 규칙: 0=진행, 2=차단/계속.
- **구현 메모(2026-06-02)**: 스크립트는 `src-tauri/hooks/*.{ps1,sh}`(4종×2 OS), `setup_environment()`가
  `~/.claude/claudecrew-hooks/`로 추출(.ps1은 UTF-8 BOM 기록)하고 현재 OS 절대경로를 `settings.json`의
  `hooks`에 idempotent 병합(기존 사용자 훅 보존). 등록 이벤트: PreToolUse(Bash)·PostToolUse(Write|Edit)·
  Stop·TeammateIdle·TaskCompleted. PreToolUse 위험차단을 PowerShell로 실제 검증(rm -rf/DROP TABLE/sudo/
  git push --force → exit 2, 정상 명령 → exit 0). 끝까지 모드는 `CLAUDECREW_KEEPGOING=1`일 때만 동작 +
  `stop_hook_active` 가드로 무한루프 방지. 품질 게이트는 실제 test 스크립트가 있을 때만 `npm test` 실행.

### [x] T2. skills 설치 추가  ✅ 완료 (git-master, test-writer, frontend-ui)
- **목표**: oMo의 내장 스킬에 대응하는 기본 스킬 탑재.
- **구현 위치**: `src-tauri/skills/<name>/SKILL.md`(include_str!) → `setup_environment()`가 `~/.claude/skills/`에 기록.
- **작업**: `git-master`, `test-writer`, `frontend-ui` 최소 3종 작성·설치. 전문가 정의의 `skills:` 필드와 연결.
- **완료 기준**: `~/.claude/skills/`에 폴더/파일 생성, Claude Code 세션에서 인식.

### [x] T3. "적용하기(변경 저장)" 커맨드 + UI  ✅ 완료 (commit_agent)
- **목표**: 검토 후 변경을 실제로 저장(commit)하는 길. 현재는 되돌리기만 있음.
- **구현 위치**: `lib.rs` 새 커맨드 `commit_agent(id, message)`; `ui/main.js`·`index.html` 버튼.
- **작업**:
  - worktree에서 `git add -A && git commit -m <message>`. (병합은 v1에서.)
  - 카드 액션에 `[적용하기]` 추가. 메시지 미입력 시 `git-master` 스킬로 자동 메시지 제안(선택).
- **완료 기준**: 적용 후 worktree 브랜치에 커밋 생성, UI 상태 갱신.
- **주의**: 안전 — 메인 브랜치 직접 변경/force 금지. 사용자 확인 후에만.

### [x] T4. 레시피 → 실제 전문가/팀 호출 강화  ✅ 완료 (create_agent agent 옵션)
- **목표**: 레시피가 단순 프롬프트 접두사가 아니라 적합한 전문가/팀을 부르게.
- **구현 위치**: `ui/main.js` RECIPES + `lib.rs` `create_agent` 인자 확장.
- **작업**:
  - 레시피별로 사용할 전문가 지정(예: 코드 설명→`@agent-librarian`/plan, 버그→`debugger`, 기능→팀).
  - `create_agent`에 `agent`(서브에이전트명) 옵션을 추가해 `claude -p --agent <name>` 또는
    프롬프트에 팀 생성 지시를 포함.
- **완료 기준**: 각 레시피 실행 시 의도한 전문가/모드로 동작(로그에서 확인).

### [x] T5. 비용 가드(상한·자동 일시정지)  ✅ 완료 (set/get_cost_cap + cost_capped)
- **목표**: 토큰 폭주 방지.
- **구현 위치**: `lib.rs`(누적 cost 추적 + 상한) , `ui`(게이지·경고).
- **작업**: 작업/세션 cost 상한 설정값 도달 시 진행 중 에이전트 `stop` + "계속할까요?" 알림.
- **완료 기준**: 상한 초과 시 자동 정지 + UI 경고.

---

## 인프라 — CI / 배포 / 데모 (제어 정책 우회)

> **중요**: ClaudeCrew는 Tauri 데스크톱 앱이라 GitHub Pages에서 "실제로 구동"될 수 없다(정적 호스팅엔
> 로컬 `claude` 구동·git worktree를 하는 Rust 백엔드가 없음). 그래서 두 갈래로 나눈다.

### [x] I1. GitHub Actions 클라우드 빌드  ✅ 완료
- **목표**: 로컬 PC의 애플리케이션 제어 정책(Smart App Control/WDAC)이 `cargo`의 빌드스크립트 실행을
  막는 문제(os error 4551)를 **클라우드 빌드로 우회**. 컴파일이 GitHub 러너에서 일어나므로 로컬 정책 무관.
- **구현 위치**: `.github/workflows/build.yml`.
- **작업**: windows/macos/ubuntu 매트릭스 + `tauri-apps/tauri-action`. `npm run icon`으로 macOS `.icns` 생성.
  산출물은 실행의 Artifacts(또는 `v*` 태그 시 릴리스)로 제공.
- **완료 기준**: Actions 실행 후 각 OS 설치파일을 내려받아 실행 가능.

### [x] I2. GitHub Pages 데모(화면 미리보기)  ✅ 완료
- **목표**: 백엔드 없이도 브라우저에서 인터페이스를 체험. 실제 작업은 불가(데모 목업).
- **구현 위치**: `.github/workflows/pages.yml`(ui/ 배포) + `ui/main.js` 데모 모드 폴백(`window.__TAURI__` 부재 감지).
- **완료 기준**: Pages URL에서 온보딩·보드·레시피·가짜 진행이 동작, 하단에 "데모 모드" 배지 표시.

---

## 마일스톤 v0.3 — "oMo/Superset 수준 강화" ✅ 완료 (기획서·부록A 반영)
> 기획보고서 + 부록A(Skills·Hooks 셋업)를 근거로 핵심 격차를 메움.

- [x] **스킬 6종 완성**: browser-test·doc-writer·init-deep 추가(부록A 3.2). 전문가 `skills:` 연결.
- [x] **MCP 검색 켜기**: `enable_search`/`disable_search` → `<repo>/.mcp.json`에 context7(키 불필요). librarian 인라인(부록A 5).
- [x] **훅 6종**: SessionStart(컨텍스트 주입)·SubagentStop 추가(부록A 4.1).
- [x] **거시→미시 리뷰**: 요약→파일별(+/-)→줄단위 색상 비교(기획 5.5, Superset). 데모 검증 완료.
- [x] **레시피 6종**: 정리·리팩터링·코드검토 추가(기획 5.4).
- [x] **팀 오케스트레이션(기초)**: "팀에게 맡기기"로 팀장→전문가 위임 프롬프트(V1.1 기초).
- [x] **끝까지 모드 토글**: `keepgoing` → `CLAUDECREW_KEEPGOING=1` 전달로 Stop/TeammateIdle 훅 작동.
- [x] **플러그인 패키징**: `claudecrew-plugin/`(부록A 8).

**다음(v1에서 심화)**: 실제 에이전트 팀 병렬 시각화(전문가별 카드), Exa 웹검색 키 연결, 미리보기(포트).

---

## 마일스톤 v0.4 — "oMo 수준 에이전트/스킬 관리" ✅ 완료 (oh-my-openagent 벤치마킹)
> code-yeongyu/oh-my-openagent의 hyperplan·멀티파일 스킬·슬래시 커맨드·전문 워크플로 수준으로 이식.

- [x] **전문가 7종**: +`plan`(계획 형식화가, opus/high), +`security`(보안 감사가).
- [x] **hyperplan 스킬**(시그니처): 5 적대 멤버(skeptic/validator/researcher/architect/creative) Task 병렬 → 라운드1 독립분석 → 라운드2 교차공격 → 라운드3 방어/정제/철회 → 통찰 증류 → `plan` 위임. 데모 검증.
- [x] **워크플로 스킬 3종**: security-research(+`scripts/scan-secrets.{sh,ps1}` 멀티파일 패턴), remove-deadcode, pre-publish-review(다중 관점 게이트).
- [x] **슬래시 커맨드 4종**: `/hyperplan /security-research /remove-deadcode /review` → `~/.claude/commands/`.
- [x] **설치 확장**: `setup_environment`가 agents 7 + skills 10(+멀티파일) + commands 4 설치.
- [x] **UI 레시피 8종**: +🧠 계획 세우기(hyperplan, opus/plan모드), +🛡️ 보안 점검(security 전문가).

**다음 후보(omo 추가 격차)**: github-triage(스크립트 포함) 스킬, work-with-pr 워크플로, pre-publish-review를 실제 N-에이전트 병렬로 확장, 스킬 eval/벤치마크, AGENTS.md 거버넌스 문서.

---

## 마일스톤 v1 — "팀 오케스트레이션 + 단일 설치형 앱"

### [~] V1.1 실제 에이전트 팀 오케스트레이션 (기초 완료, 심화 남음)
- **목표**: lead(팀장)가 teammates(전문가)를 worktree 격리로 병렬 부리는 진짜 오케스트레이션.
- **완료(v0.3)**: "팀에게 맡기기" → 팀장 위임 프롬프트 + `teammate_update` 이벤트로 전문가별 ●/✓ 시각화(`process_teammates`가 Task tool_use/result 추적). 데모 검증.
- **남음**: 실제 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 환경에서 팀원별 메시지/세부 진행 정밀화, worktree별 격리 확인, 동시성·비용 가드 연계. 실측은 데스크톱 빌드 필요.

### [x] V1.2 미리보기(포트)  ✅ 완료
- 출력에서 `localhost:포트` 감지 → `AgentInfo.port` → 카드 "미리보기" 버튼 → `open_url`(opener). 데모 검증.

### [x] V1.3 작업 공간 영속화/복원  ✅ 완료
- `restore_agents(repo)`가 `git worktree list --porcelain`로 `.agentboard/` 작업을 보드에 복원(시작 시 호출).

### [ ] V1.4 안전 가드 전체 + 권한 UI
- **목표**: "안전 수준"(이 폴더만/읽기만/전체)을 UI에서 선택, 위험 작업 확인 다이얼로그.
- **완료 기준**: 권한 프리셋이 `permission-mode`/훅에 반영.

### [ ] V1.5 단일 설치형 배포
- **목표**: .exe/.app 인스톨러.
- **작업**: `npm run icon`(전체 아이콘), 코드사인/노타라이즈(선택), `tauri build` 산출물 검증.
- **완료 기준**: 깨끗한 PC에서 설치·실행.

---

## 마일스톤 v2 — "고도화"
### [ ] V2.1 레시피 마켓/공유  ### [~] V2.2 LSP·정밀편집(MCP) — 검색 MCP(context7/Exa) 기초 완료, LSP 남음  ### [ ] V2.3 API 자동 전환(헤비 시)
### [ ] V2.4 다국어  ### [ ] V2.5 플러그인 번들 배포(.claude-plugin)

---

## 작업 시 공통 점검표
- [ ] 안전 원칙(CLAUDE.md 1장) 위반 없음(자격증명 미취급, 공식 바이너리 구동, worktree 격리).
- [ ] 새 이벤트는 Rust emit ↔ JS listen 동시 반영.
- [ ] UI 문구는 일반인용 쉬운 한국어.
- [ ] `node --check ui/main.js` + JSON 파싱 통과, 가능하면 `npm run dev` 수동 확인.
- [ ] CLAUDE.md "현재 구현 상태"와 이 ROADMAP 체크박스 갱신.

## 알려진 리스크
- 에이전트 팀은 실험적(세션 재개·상태 동기화 제약). 안정화 전엔 소수 팀원.
- Windows `.cmd` 인자 따옴표 처리 주의(`claude_command`).
- 다수 병렬 = 구독 한도 급소모 → 비용 가드/ API 경로 권장.
- 기능·플래그는 2026 상반기 기준, 변경 가능 → 공식 문서 재확인.
