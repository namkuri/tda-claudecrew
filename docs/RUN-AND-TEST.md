# 데스크톱 앱 실행 & 테스트 가이드

ClaudeCrew를 **실제 데스크톱 앱**으로 띄우고, 새로 만든 기능들을 하나씩 확인하는 방법입니다.
(브라우저 데모 페이지가 아니라, 진짜로 파일을 수정·저장하는 앱입니다.)

---

## A. 앱을 손에 넣는 두 가지 길

### 길 1 — GitHub Actions에서 빌드본 받기 (권장, 제어 정책 우회)
이 PC는 Smart App Control/WDAC가 로컬 `cargo` 빌드를 막으므로(`os error 4551`), 클라우드 빌드가 가장 쉽습니다.
1. 코드 push → GitHub 저장소 **Actions** 탭 → **build** → **Run workflow**(branch `main`).
   - 또는 태그로 자동 실행: `git tag v0.4.0 && git push --tags`
2. 끝나면(5~10분) 실행 페이지 하단 **Artifacts → `claudecrew-windows-latest`** 내려받기.
3. 압축을 풀고 `.msi` 또는 `.exe`(NSIS) 설치파일 실행 → 설치 → ClaudeCrew 실행.

### 길 2 — 로컬에서 직접 실행 (제어 정책을 끈 경우만)
Smart App Control을 끈 상태(또는 끌 수 있는 PC)에서:
```powershell
cd C:\projects\tda-claudecrew
npm install
npm run dev        # 개발 모드로 창이 뜸(코드 수정 시 자동 반영)
# 배포본을 만들려면:
npm run build      # src-tauri/target/release/bundle/ 에 설치파일 생성
```
> `npm run dev`가 `os error 4551`로 막히면 길 1(클라우드 빌드)을 쓰세요.

---

## B. 사전 준비 (앱 실행 전 1회)
- **Claude Code 설치 + 로그인**이 되어 있어야 합니다(앱은 공식 `claude`를 구동만 함).
  - 확인: PowerShell에서 `claude --version` 이 동작하면 OK.
- 작업해볼 **git 프로젝트 폴더**를 하나 준비(아무 폴더나, `git init` 되어 있으면 됨).

---

## C. 첫 실행 — 온보딩 3단계
앱을 켜면 마법사가 뜹니다.
1. **Claude 준비 확인** → "확인하기" 클릭. "확인됨 · (버전)"이 나오면 성공.
2. **작업할 폴더 고르기** → "폴더 선택"으로 git 프로젝트 폴더 지정.
3. **준비 완료** → "전문가 설치" 클릭.
   - 이때 `~/.claude/` 에 아래가 설치됩니다(탐색기로 확인 가능):
     - `agents/` (전문가 5종), `skills/` (스킬 6종), `claudecrew-hooks/` (훅 스크립트), `settings.json`(훅·팀 플래그 병합)
4. "시작하기 →" 클릭.

✅ **확인 포인트**: `C:\Users\<나>\.claude\skills\` 안에 git-master, test-writer, frontend-ui, browser-test, doc-writer, init-deep 폴더 6개가 있으면 정상.

---

## D. 기능별 테스트 시나리오

### 1) 기본 작업 — "버그 고치기" 레시피
- 레시피 **🐞 버그 고치기** 클릭 → 입력칸에 증상 적기(예: "로그인 버튼이 안 눌려요") → **▶ 전문가에게 맡기기**.
- 카드가 생기고 "일하는 중 → 끝남"으로 진행, 로그가 실시간으로 흐릅니다.
- ✅ 끝나면 비용($)이 표시됩니다.

### 2) 바뀐 점 (거시→미시 리뷰)
- 카드의 **바뀐 점** 클릭.
- ✅ 위에 "파일 N개가 바뀌어요 +x -y" 요약 → 파일 클릭하면 줄단위 색상 비교(초록=추가/빨강=삭제)가 펼쳐짐.

### 3) 적용하기 (변경 저장)
- 카드의 **적용하기** 클릭 → 저장 메시지 입력(비우면 자동) → 확인.
- ✅ 작업용 worktree 브랜치(`ab/<이름>`)에 커밋이 생기고 "저장됨" 안내가 뜸.
- 확인: 해당 폴더의 `.agentboard/<작업>/` 에서 `git log` 로 커밋 확인 가능.

### 4) 미리보기 (포트)
- "기능 추가" 등으로 **dev 서버를 띄우는 작업**을 시키면, 로그에 `localhost:NNNN` 이 잡힙니다.
- ✅ 카드에 **미리보기 :NNNN** 버튼이 나타나고, 누르면 기본 브라우저로 그 주소가 열림.

### 5) 팀에게 맡기기 (병렬 전문가)
- **팀에게 맡기기** 토글 ON → 작업 실행.
- ✅ 카드에 "팀원" 줄이 생기고, 전문가들이 ● 일하는 중 → ✓ 완료로 바뀝니다(팀장이 위임).
- 참고: 에이전트 팀은 실험적 기능이라, 동작/표시는 Claude Code 버전에 따라 달라질 수 있습니다.

### 6) 끝까지 모드
- **끝까지 모드** 토글 ON → 작업 실행.
- 내부적으로 `CLAUDECREW_KEEPGOING=1` 이 전달되어, 일을 일찍 멈추면 훅이 한 번 더 점검하게 합니다.

### 7) 검색 켜기 / 웹검색 키
- **검색 켜기** 토글 ON → 폴더에 `.mcp.json` 이 생기고 공식 문서 검색(context7, 키 불필요)이 연결됩니다.
- **웹검색 키** 클릭 → exa.ai에서 받은 **본인 Exa 키** 입력 → `.mcp.json` 에 웹검색 서버가 추가됩니다.
  - ⚠️ `.mcp.json` 은 키가 들어가므로 git에 올리지 마세요(이미 `.gitignore`에 추가됨).

### 8) 비용 가드
- 상단 **상한 $** 값을 작게(예: 0.01) 설정하고 작업을 돌려 보세요.
- ✅ 누적 비용이 상한에 닿으면 진행 중 작업이 자동으로 멈추고 경고 배너가 뜸.

### 9) 안전 훅 (위험 명령 차단)
- 위험한 일(대량 삭제 등)을 유도하는 부탁을 하면, PreToolUse 훅이 `rm -rf` 같은 명령을 차단합니다.
- (개발자 확인용) `~/.claude/settings.json` 의 `hooks` 에 PreToolUse/Stop/TaskCompleted/SessionStart 등이 들어 있는지 확인.

### 10) 작업 공간 복원
- 작업을 몇 개 만든 뒤 앱을 껐다 켜고 같은 폴더로 들어오면,
- ✅ 이전 작업들이 "(이전 작업 — 복원됨)" 카드로 보드에 다시 나타납니다(되돌리기·바뀐 점 가능).

### 11) 되돌리기
- 카드의 **되돌리기** → 그 작업의 worktree가 삭제되고 원본은 그대로 유지됩니다.

---

## E. 문제가 생기면
| 증상 | 점검 |
|---|---|
| "claude 명령을 찾지 못함" | Claude Code 설치/로그인, `claude --version` 확인 |
| 작업이 바로 오류 | 폴더가 git 프로젝트인지(`.git` 존재) 확인 |
| 빌드가 `os error 4551` | 로컬 대신 GitHub Actions 빌드(길 1) 사용 |
| 미리보기 버튼이 안 뜸 | 작업이 실제로 dev 서버를 띄워 `localhost:포트`를 로그에 출력했는지 |
| 팀원이 안 보임 | 에이전트 팀은 실험적 — Claude Code 버전/플래그 확인 |

---

## F. 개발자용 빠른 점검 (코드 수정 시)
```powershell
node --check ui/main.js
node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8'))"
```
UI만 빠르게 눈으로 보려면 정적 서버로 데모 모드 확인:
```powershell
npx http-server ui -p 8080 -c-1   # 브라우저로 localhost:8080 (백엔드 없는 데모)
```
