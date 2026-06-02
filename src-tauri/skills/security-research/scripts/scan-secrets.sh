#!/usr/bin/env bash
# security-research 보조 스크립트 — 흔한 비밀 노출 패턴을 읽기 전용으로 훑는다.
# 출력은 출발점일 뿐. 반드시 사람이 맥락을 확인할 것(거짓 양성 많음).
# 사용: bash scan-secrets.sh [폴더(기본 .)]
root="${1:-.}"
echo "🔍 비밀 노출 스캔: $root (읽기 전용)"

# rg(ripgrep) 있으면 사용, 없으면 grep
if command -v rg >/dev/null 2>&1; then SEARCH="rg -n -i --no-heading"; else SEARCH="grep -rniE"; fi

patterns=(
  'aws_secret_access_key|aws_access_key_id'
  'api[_-]?key[[:space:]]*[:=]'
  'secret[_-]?key[[:space:]]*[:=]'
  'password[[:space:]]*[:=][[:space:]]*["'\''][^"'\'' ]{4,}'
  'authorization:[[:space:]]*bearer[[:space:]]'
  'BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY'
  'ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}'
  'xox[baprs]-[A-Za-z0-9-]{10,}'
  'sk-[A-Za-z0-9]{20,}'
)

found=0
for p in "${patterns[@]}"; do
  hits=$($SEARCH "$p" "$root" 2>/dev/null | grep -vE '(node_modules|\.git/|target/|dist/|build/)' )
  if [ -n "$hits" ]; then
    echo ""
    echo "── 패턴: $p"
    echo "$hits" | head -20
    found=1
  fi
done

[ "$found" = "0" ] && echo "✅ 흔한 비밀 패턴은 발견되지 않음(그래도 수동 점검 권장)."
echo ""
echo "※ 이 결과는 자동 스캔입니다. 각 항목의 맥락을 직접 확인하세요."
exit 0
