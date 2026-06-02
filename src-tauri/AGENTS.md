# AGENTS.md — ClaudeCrew 전문가/스킬/훅 거버넌스

> 이 폴더(`src-tauri/agents`, `../skills`, `../hooks`, `../commands`)가 ClaudeCrew의 "AI 관리" 원본이다.
> 컴파일 시 `include_str!`로 바이너리에 포함되고, `setup_environment()`가 `~/.claude/`에 기록한다.
> oh-my-openagent의 .agents/ 구성을 Claude Code 네이티브로 1:1 대응한다.

## 1. 구성요소 한눈에
| 종류 | 위치 | 설치 위치 | 현재 |
|---|---|---|---|
| 전문가(서브에이전트) | `agents/*.md` | `~/.claude/agents/` | 7종 |
| 스킬 | `skills/<name>/SKILL.md`(+scripts/) | `~/.claude/skills/` | 13종 |
| 슬래시 커맨드 | `commands/*.md` | `~/.claude/commands/` | 4종 |
| 훅 | `hooks/*.{ps1,sh}` | `~/.claude/claudecrew-hooks/` + settings.json | 6 이벤트 |
| MCP | (프로젝트) `.mcp.json` | `<repo>/.mcp.json` | context7 / exa / serena |

## 2. 전문가(7)
oracle(설계·근본원인, opus/high) · librarian(검색, haiku, context7) · implementer(구현, sonnet, worktree) ·
debugger(디버깅, sonnet) · code-reviewer(리뷰, 읽기전용) · **plan**(계획 형식화, opus/high) · **security**(보안 감사, 읽기전용).

## 3. 스킬(13)
git-master · test-writer · frontend-ui · browser-test · doc-writer · init-deep ·
**hyperplan**(적대적 다중 에이전트 계획) · security-research(+scan-secrets) · remove-deadcode ·
pre-publish-review · github-triage(+gh-list) · work-with-pr · precise-edit.

## 4. 규칙(거버넌스)
- **모든 신규 전문가/스킬/커맨드/훅은 이 `src-tauri/` 트리에 추가**한다. 그래야 설치본/플러그인에 함께 포함된다.
- 추가 시 `lib.rs setup_environment()`의 해당 배열에 등록한다(개수 상수도 갱신).
- 스킬에 스크립트가 있으면 `skill_scripts` 배열에 등록(.ps1은 BOM, .sh는 chmod).
- 훅 추가 시 `install_hooks()`의 `add_hook(...)` 호출 + 스크립트 배열에 등록.
- 읽기 전용 전문가/스킬(plan, security, code-reviewer, *-review)은 파일을 수정하지 않는다.
- **안전 원칙(CLAUDE.md 1장) 우선**: 자격증명(Anthropic 키) 미취급, 위험 권한은 settings.json 훅으로 통제.

## 5. 배포(플러그인)
`node scripts/build-plugin.mjs` → `claudecrew-plugin/`에 위 원본을 채워 한 덩어리 플러그인으로 배포 가능(부록A 8장).
플러그인 서브에이전트는 보안상 hooks/mcpServers/permissionMode를 무시할 수 있으므로, 위험 통제는 앱이 settings에서 직접 한다.
