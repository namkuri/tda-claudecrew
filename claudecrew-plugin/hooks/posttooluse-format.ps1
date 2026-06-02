# ClaudeCrew 훅 — PostToolUse(Write|Edit): 저장된 파일을 prettier로 자동 정리
# 포맷 실패는 작업을 막지 않는다(항상 exit 0).
$ErrorActionPreference = 'SilentlyContinue'
$raw = [Console]::In.ReadToEnd()
try {
    $j = $raw | ConvertFrom-Json
    $f = [string]$j.tool_input.file_path
} catch { exit 0 }
if ([string]::IsNullOrWhiteSpace($f) -or -not (Test-Path -LiteralPath $f)) { exit 0 }

$ext = [IO.Path]::GetExtension($f).ToLower()
$ok = @('.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.scss', '.html', '.md', '.yaml', '.yml')
if ($ok -contains $ext) {
    # 설치된 prettier가 있을 때만(--no-install) 조용히 정리
    & npx --no-install prettier --write "$f" *> $null
}
exit 0
