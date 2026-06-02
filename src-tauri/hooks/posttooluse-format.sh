#!/usr/bin/env bash
# ClaudeCrew 훅 — PostToolUse(Write|Edit): 저장된 파일을 prettier로 자동 정리
# 포맷 실패는 작업을 막지 않는다(항상 exit 0).
input=$(cat)
f=$(printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -z "$f" ] && exit 0
[ -f "$f" ] || exit 0

case "$f" in
  *.js|*.jsx|*.ts|*.tsx|*.json|*.css|*.scss|*.html|*.md|*.yaml|*.yml)
    if command -v npx >/dev/null 2>&1; then
      npx --no-install prettier --write "$f" >/dev/null 2>&1
    fi
    ;;
esac
exit 0
