#!/usr/bin/env bash
# ClaudeCrew 훅 — TaskCompleted: 품질 게이트
# package.json 에 실제 test 스크립트가 있으면 실행하고, 실패하면 완료를 막는다.
# 규약: exit 0 = 완료 허용, exit 2 = 차단(테스트 통과 후 다시 완료).
cat >/dev/null   # stdin 비우기
[ -f package.json ] || exit 0
command -v node >/dev/null 2>&1 || exit 0
has=$(node -e "try{var s=(require('./package.json').scripts||{});var t=s.test||'';process.stdout.write(t && !/no test specified/.test(t)?'1':'')}catch(e){}" 2>/dev/null)
[ "$has" = "1" ] || exit 0

if ! npm test --silent >/dev/null 2>&1; then
  echo "[ClaudeCrew 품질 게이트] 테스트가 실패했습니다. 통과시킨 뒤 완료로 표시하세요." >&2
  exit 2
fi
exit 0
