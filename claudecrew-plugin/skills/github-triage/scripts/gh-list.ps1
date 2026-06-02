# github-triage 보조 — 열린 이슈/PR 목록을 읽기 전용으로 가져온다.
# 사용: powershell -File gh-list.ps1 [owner/repo]   (생략 시 현재 폴더의 저장소)
param([string]$Repo = "")
$ErrorActionPreference = 'SilentlyContinue'
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Output "gh(GitHub CLI)가 없습니다. https://cli.github.com 에서 설치 후 'gh auth login' 하세요."
    Write-Output "또는 이슈/PR 목록을 직접 붙여넣어 진행하세요."
    exit 0
}
$arg = @(); if ($Repo) { $arg = @("--repo", $Repo) }
Write-Output "== 열린 이슈 (최신 30) =="
& gh issue list @arg --state open --limit 30
Write-Output ""
Write-Output "== 열린 PR (최신 30) =="
& gh pr list @arg --state open --limit 30
exit 0
