# ClaudeCrew 훅 — TaskCompleted: 품질 게이트
# package.json 에 실제 test 스크립트가 있으면 실행하고, 실패하면 완료를 막는다.
# 규약: exit 0 = 완료 허용, exit 2 = 차단(테스트 통과 후 다시 완료).
$ErrorActionPreference = 'SilentlyContinue'
$null = [Console]::In.ReadToEnd()
if (-not (Test-Path -LiteralPath 'package.json')) { exit 0 }
try {
    $pkg = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json
    $test = [string]$pkg.scripts.test
} catch { exit 0 }
if ([string]::IsNullOrWhiteSpace($test) -or ($test -match 'no test specified')) { exit 0 }

& npm test --silent *> $null
if ($LASTEXITCODE -ne 0) {
    [Console]::Error.WriteLine("[ClaudeCrew 품질 게이트] 테스트가 실패했습니다. 통과시킨 뒤 완료로 표시하세요.")
    exit 2
}
exit 0
