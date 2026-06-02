# security-research 보조 스크립트 — 흔한 비밀 노출 패턴을 읽기 전용으로 훑는다.
# 출력은 출발점일 뿐. 반드시 사람이 맥락을 확인할 것(거짓 양성 많음).
# 사용: powershell -File scan-secrets.ps1 [폴더(기본 .)]
param([string]$Root = ".")
$ErrorActionPreference = 'SilentlyContinue'
Write-Output "비밀 노출 스캔: $Root (읽기 전용)"

$patterns = @(
    'aws_secret_access_key|aws_access_key_id',
    'api[_-]?key\s*[:=]',
    'secret[_-]?key\s*[:=]',
    'password\s*[:=]\s*["''][^"'' ]{4,}',
    'authorization:\s*bearer\s',
    'BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY',
    'ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}',
    'xox[baprs]-[A-Za-z0-9-]{10,}',
    'sk-[A-Za-z0-9]{20,}'
)
$skip = 'node_modules|\\.git\\|target\\|dist\\|build\\'
$found = $false
$files = Get-ChildItem -Path $Root -Recurse -File | Where-Object { $_.FullName -notmatch $skip }
foreach ($p in $patterns) {
    $hits = $files | Select-String -Pattern $p -CaseSensitive:$false | Select-Object -First 20
    if ($hits) {
        Write-Output ""
        Write-Output "-- 패턴: $p"
        $hits | ForEach-Object { Write-Output ("{0}:{1}: {2}" -f $_.Filename, $_.LineNumber, $_.Line.Trim()) }
        $found = $true
    }
}
if (-not $found) { Write-Output "흔한 비밀 패턴은 발견되지 않음(그래도 수동 점검 권장)." }
Write-Output ""
Write-Output "※ 이 결과는 자동 스캔입니다. 각 항목의 맥락을 직접 확인하세요."
exit 0
