#!/usr/bin/env bash
# ClaudeCrew 안전 훅 — PreToolUse(Bash): 위험한 셸 명령 차단
# 규약: exit 0 = 진행 허용, exit 2 = 차단(stderr 메시지를 Claude에 전달)
input=$(cat)
# tool_input.command 추출(jq 없이). 실패하면 원문 전체를 스캔(안전망).
cmd=$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p')
[ -z "$cmd" ] && cmd="$input"

block() {
  echo "[ClaudeCrew 안전차단] 위험해 보이는 명령이라 막았습니다. 꼭 필요하면 사용자가 직접 실행하세요." >&2
  exit 2
}

case "$cmd" in
  *"rm -rf"*|*"rm  -rf"*) block ;;
  *"DROP TABLE"*|*"drop table"*) block ;;
  *"sudo "*) block ;;
  *":>/"*|*":> /"*) block ;;
  *"mkfs"*|*"dd if="*) block ;;
  *"shutdown"*) block ;;
esac
# git push --force (옵션 순서 무관)
case "$cmd" in
  *"git push"*"--force"*) block ;;
esac
exit 0
