# claudecrew-plugin

ClaudeCrew의 전문가(서브에이전트)·스킬·훅·MCP를 **하나의 Claude Code 플러그인**으로 묶어
"한 번 설치"로 전부 깔리게 하는 배포 형태입니다(부록 A 8장).

## 무엇이 들어가나
- `agents/` — 전문가 정의(oracle, librarian, implementer, debugger, code-reviewer)
- `skills/` — 기본 스킬 6종(git-master, test-writer, frontend-ui, browser-test, doc-writer, init-deep)
- `hooks/hooks.json` — 안전/품질/끝까지/컨텍스트 훅 선언
- `.mcp.json` — 공식 문서 검색(context7) 등 외부 도구

## 두 가지 설치 경로
1. **앱 내장(현재 기본)**: 데스크톱 앱의 `setup_environment()`가 위 구성요소를 `~/.claude/`에 직접 기록.
   → 일반 사용자는 이 경로만 쓰면 된다(파일을 만질 일 없음).
2. **플러그인(고급/배포)**: 이 폴더를 Claude Code 플러그인으로 설치하면 동일 구성을 마켓/공유로 배포 가능.
   업데이트는 `version`만 올리면 일괄 갱신된다.

## 빌드(구성요소 채우기)
플러그인으로 배포할 때는 `src-tauri/agents`, `src-tauri/skills`, `src-tauri/hooks`의 내용을
이 폴더의 `agents/`, `skills/`, `hooks/`로 복사해 채운다(앱이 쓰는 원본과 동일하게 유지).

## 안전 메모(부록 A 8장)
플러그인이 제공하는 서브에이전트는 보안 정책상 `hooks`/`mcpServers`/`permissionMode`를 무시할 수 있다.
따라서 **위험 권한 통제는 앱이 `~/.claude/settings.json`에서 직접** 한다(플러그인에 의존하지 않음).
