# ClaudeCrew (MVP)

누구나 쓰는 **Claude 에이전트 오케스트레이션** 데스크톱 앱. 프로그래밍을 몰라도
레시피를 고르거나 한국어로 부탁하면, AI 전문가가 격리된 작업 공간에서 일을 처리하고
"바뀐 점"을 쉬운 말로 보여줍니다. **Tauri**(Rust + HTML)로 만든 가벼운 네이티브 앱입니다.

> 안전 원칙: 이 앱은 **이미 설치·로그인된 공식 `claude`(Claude Code)를 헤드리스로 구동**할
> 뿐, 자격증명을 만지거나 인증을 위조하지 않습니다. 각 작업은 격리된 git worktree에서 실행되어
> 원본을 건드리지 않고 언제든 되돌릴 수 있습니다.

---

## 사전 준비 (한 번만)

1. **Claude Code 설치 + 로그인** — 터미널에서 `claude --version` 이 동작해야 합니다.
   (Pro/Max 등 유료 플랜 필요)
2. **git** 설치
3. **Node.js 18+** (Tauri CLI 실행용)
4. **Rust** (stable) — https://rustup.rs
5. OS별 Tauri 시스템 의존성:
   - **Windows**: Microsoft Edge WebView2 (대개 기본 설치됨), Visual Studio Build Tools(C++)
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
   - **Linux**: `webkit2gtk`, `libgtk-3-dev` 등 (Tauri 문서의 Linux 의존성 참고)

자세한 환경 구성은 Tauri 공식 "Prerequisites" 문서를 따르세요.

## 실행 (개발 모드)

```bash
npm install
npm run dev        # = tauri dev (개발 창이 뜹니다)
```

## 배포용 빌드

```bash
npm run build      # = tauri build (설치 파일 생성)
```

### macOS 아이콘 재생성(선택)
이 저장소에는 Windows용 아이콘(.ico)과 PNG만 포함됩니다. macOS .icns가 필요하면:

```bash
npm run icon       # = tauri icon ./app-icon.png  (전체 아이콘 세트 재생성)
```

---

## 사용법

1. 첫 실행 시 **온보딩 3단계**: ① Claude 확인 → ② 폴더 선택 → ③ 전문가 설치 → 시작.
   - ③에서 `~/.claude/agents/`에 전문가 5종을 설치하고 에이전트 팀 기능을 켭니다.
2. **레시피**(버그 고치기/기능 추가/코드 설명/테스트 만들기)를 누르거나, 직접 부탁을 적습니다.
3. **▶ 전문가에게 맡기기** → 카드가 생기고 진행 상황이 실시간으로 흐릅니다.
4. **바뀐 점**으로 변경 확인 → 마음에 들면 그대로 두고, 아니면 **되돌리기**.

---

## 프로젝트 구조

```
claudecrew/
├─ package.json            # Tauri CLI 스크립트
├─ app-icon.png            # 아이콘 원본(재생성용)
├─ ui/                     # 프런트엔드(정적 HTML/CSS/JS)
│  ├─ index.html
│  ├─ styles.css
│  └─ main.js              # Tauri invoke/listen 으로 백엔드 호출
└─ src-tauri/              # Rust 백엔드
   ├─ Cargo.toml
   ├─ build.rs
   ├─ tauri.conf.json      # 창/번들/아이콘/보안 설정
   ├─ capabilities/
   │  └─ default.json      # dialog/opener 권한
   ├─ agents/              # 컴파일에 포함되는 전문가 정의(.md)
   │  ├─ oracle.md  librarian.md  implementer.md  debugger.md  code-reviewer.md
   ├─ icons/               # 앱 아이콘
   └─ src/
      ├─ main.rs           # 진입점
      └─ lib.rs            # 커맨드: check_claude / setup_environment /
                           #         create_agent / list_agents / get_diff /
                           #         stop_agent / cleanup_agent
```

### 백엔드 커맨드 요약
- `check_claude()` — `claude --version` 확인
- `setup_environment()` — 전문가 설치 + 팀 플래그 활성화(~/.claude)
- `create_agent(repo, prompt, model, permission, branch?)` — worktree 생성 후
  `claude -p --output-format stream-json …` 실행, 진행상황을 이벤트로 스트리밍
- `get_diff(id)` — 해당 작업 공간의 변경(diff)
- `stop_agent(id)` / `cleanup_agent(id)` — 중지 / worktree 제거(되돌리기)

---

## 한계 / 주의 (MVP)
- **검증 범위**: 프로젝트 구조·프런트엔드·백엔드 로직은 작성·검토했으나, Rust/Tauri 빌드는
  사용자 환경에서 수행됩니다(이 저장소는 빌드 산출물을 포함하지 않습니다).
- **Windows의 `claude` 실행**: `.cmd` 셰임 때문에 백엔드가 `cmd /C claude …`로 호출합니다.
  특수문자가 많은 부탁은 따옴표 처리에 주의하세요.
- **에이전트 팀**은 실험적 기능입니다. 다수 병렬 실행은 구독 한도를 빠르게 소모하므로
  헤비 사용은 API 키/상위 플랜을 권장합니다.
- 권한 기본값은 "이 폴더 안에서만 편집"(acceptEdits)입니다. 위험 작업 차단 훅 등은
  부록(Skills·Hooks 셋업)을 참고해 settings.json에 추가하세요.
- 기능/플래그는 2026년 상반기 Claude Code 기준이며 변경될 수 있습니다.

## 다음 단계(로드맵)
- v1: "끝까지 모드" 훅, 미리보기(포트), 단일 설치형 배포, 안전 가드 전체
- v2: 레시피 마켓, LSP/정밀편집 보강, API 자동 전환, 다국어
