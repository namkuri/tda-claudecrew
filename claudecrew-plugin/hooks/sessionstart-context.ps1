# ClaudeCrew 훅 — SessionStart: 세션 시작 시 컨텍스트/규칙을 주입한다.
# stdout 이 Claude의 컨텍스트로 들어간다(부록A 4.1).
$ErrorActionPreference = 'SilentlyContinue'
$null = [Console]::In.ReadToEnd()
Write-Output "[ClaudeCrew 작업 규칙]"
Write-Output "- 격리된 작업 공간(worktree)에서만 작업하고 원본을 손상시키지 않는다."
Write-Output "- 위험한 명령/대량 삭제/외부 전송은 하지 않는다(안전 훅이 차단함)."
Write-Output "- 사용자에게 보고할 때는 전문용어 대신 쉬운 한국어를 쓴다."
Write-Output "- 작업을 끝까지 마치고, 무엇을 했는지 한 줄로 요약한다."
if (Test-Path -LiteralPath 'CLAUDE.md') {
    Write-Output "- 이 폴더에 CLAUDE.md 가 있으니 먼저 읽고 규칙을 따른다."
}
exit 0
