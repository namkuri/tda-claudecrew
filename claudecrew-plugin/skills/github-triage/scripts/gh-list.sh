#!/usr/bin/env bash
# github-triage 보조 — 열린 이슈/PR 목록을 읽기 전용으로 가져온다.
# 사용: bash gh-list.sh [owner/repo]   (생략 시 현재 폴더의 저장소)
if ! command -v gh >/dev/null 2>&1; then
  echo "gh(GitHub CLI)가 없습니다. https://cli.github.com 에서 설치 후 'gh auth login' 하세요."
  echo "또는 이슈/PR 목록을 직접 붙여넣어 진행하세요."
  exit 0
fi
repo="${1:-}"
arg=""; [ -n "$repo" ] && arg="--repo $repo"

echo "== 열린 이슈 (최신 30) =="
gh issue list $arg --state open --limit 30 \
  --json number,title,labels,createdAt \
  --template '{{range .}}#{{.number}}  {{.title}}  [{{range .labels}}{{.name}} {{end}}]{{"\n"}}{{end}}' 2>/dev/null \
  || gh issue list $arg --state open --limit 30

echo ""
echo "== 열린 PR (최신 30) =="
gh pr list $arg --state open --limit 30 \
  --json number,title,isDraft,createdAt \
  --template '{{range .}}#{{.number}}  {{.title}}  {{if .isDraft}}(draft){{end}}{{"\n"}}{{end}}' 2>/dev/null \
  || gh pr list $arg --state open --limit 30
exit 0
