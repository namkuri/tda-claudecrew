# 내가 해야 할 일 — GitHub 빌드 & Pages 데모 가이드

이 문서는 **제어 정책(Smart App Control/WDAC) 때문에 내 PC에서 빌드가 막히는 문제**를
GitHub(클라우드)로 우회하고, 화면 데모를 인터넷에 올리는 방법을 순서대로 안내합니다.

> 핵심 정리
> - **데스크톱 앱(실제 동작)** = GitHub **Actions**가 클라우드에서 빌드 → 설치파일 내려받기 (제어 정책 무관 ✅)
> - **화면 데모(체험용)** = GitHub **Pages**가 `ui/`를 호스팅 (실제 작업은 안 됨, 미리보기만)

---

## 0. 준비물
- GitHub 계정
- 이 폴더(`tda-claudecrew`)
- (로컬 git 명령용) git 설치 — 이미 있을 가능성 높음

---

## 1. git 저장소로 만들고 GitHub에 올리기
이 프로젝트는 아직 git 저장소가 아닙니다. 폴더에서 아래를 한 번만 실행하세요.

PowerShell 기준:
```powershell
cd C:\projects\tda-claudecrew
git init
git add -A
git commit -m "ClaudeCrew v0.2: 훅/스킬/적용/레시피/비용가드 + CI/Pages"
git branch -M main
```

그 다음 GitHub에서 **빈 저장소(New repository)** 를 만들고(README 등 체크 해제), 안내에 나온 주소로:
```powershell
git remote add origin https://github.com/<내아이디>/<저장소이름>.git
git push -u origin main
```

> 💡 GitHub CLI(`gh`)가 있으면 `gh repo create <이름> --public --source . --push` 한 줄로 끝납니다.

---

## 2. GitHub Pages 켜기 (화면 데모)
1. GitHub 저장소 → **Settings → Pages**
2. **Build and deployment → Source** 를 **GitHub Actions** 로 선택
3. 끝. `push` 하면 `.github/workflows/pages.yml` 이 자동으로 `ui/` 를 배포합니다.
4. 배포 후 **Settings → Pages** 또는 Actions 로그에 뜨는 주소(예: `https://<내아이디>.github.io/<저장소이름>/`)로 접속.

> 데모 페이지는 하단에 "🖥️ 데모 모드" 배지가 보이고, 온보딩·레시피·가짜 진행을 체험할 수 있어요.
> **실제 파일 수정/저장은 데스크톱 앱에서만** 됩니다(브라우저엔 백엔드가 없으니까요).

---

## 3. 설치파일 빌드 (실제 앱) — 제어 정책 우회
1. GitHub 저장소 → **Actions** 탭
2. 좌측에서 **build** 워크플로 선택 → 우측 **Run workflow** 버튼 클릭(브랜치 `main`)
   - 또는 `v0.2.0` 같은 **태그를 push** 하면 자동 실행됩니다: `git tag v0.2.0 && git push --tags`
3. 실행이 끝나면(보통 수 분) 해당 실행 페이지 하단 **Artifacts** 에서 OS별 설치파일을 내려받기:
   - `claudecrew-windows-latest` → `.exe`(NSIS)/`.msi`
   - `claudecrew-macos-latest` → `.dmg`/`.app`
   - `claudecrew-ubuntu-latest` → `.AppImage`/`.deb`
4. 내려받은 설치파일로 설치 → 실행.

> 🔁 빌드는 GitHub 서버에서 일어나므로 **내 PC의 Smart App Control/WDAC가 끼어들지 않습니다.**
> 즉, 로컬에서 `npm run build` 가 막혀도 이 경로로 정상 산출물을 얻을 수 있어요.

---

## 4. (선택) 그래도 로컬에서 빌드/실행하고 싶다면
로컬 `cargo`/`tauri build` 가 `os error 4551`(애플리케이션 제어 정책 차단)로 막히면, 다음 중 하나가 필요합니다.
- **Smart App Control 끄기**: 설정 → 개인정보 및 보안 → Windows 보안 → 앱 및 브라우저 컨트롤 → Smart App Control → **끄기**
  (한 번 끄면 재설치 전까지 다시 못 켭니다. 신중히.)
- 또는 회사/학교 PC라면 **WDAC 정책**이 원인일 수 있어 관리자에게 예외를 요청.
- 끈 뒤: `npm install` → `npm run icon`(아이콘 생성) → `npm run dev`(개발 실행) / `npm run build`(배포 빌드).

설치 후 앱에서 할 일은 동일합니다: ① Claude 준비 확인 → ② 폴더 고르기 → ③ 전문가 설치(훅/스킬 자동 설치) → 시작.

---

## 5. 잘 됐는지 확인 체크리스트
- [ ] GitHub에 코드가 올라갔다(`git push` 성공).
- [ ] Pages 주소가 열리고 "데모 모드" 배지가 보인다.
- [ ] Actions의 build가 초록색이고 Artifacts에 설치파일이 있다.
- [ ] (앱 실행 시) 온보딩 3단계 후 `~/.claude/`에 `agents/`, `skills/`, `claudecrew-hooks/`, `settings.json`이 생겼다.
- [ ] 위험 명령(`rm -rf` 등)을 시키면 안전 훅이 막는다.
