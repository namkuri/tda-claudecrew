# ClaudeCrew 안전 훅 — PreToolUse(Bash): 위험한 셸 명령 차단
# 규약: exit 0 = 진행 허용, exit 2 = 차단(stderr 메시지를 Claude에 전달)
$ErrorActionPreference = 'SilentlyContinue'
$raw = [Console]::In.ReadToEnd()
$cmd = ''
try {
    $j = $raw | ConvertFrom-Json
    $cmd = [string]$j.tool_input.command
} catch {
    $cmd = $raw   # JSON 파싱 실패 시 원문 전체를 스캔(안전망)
}
if ([string]::IsNullOrWhiteSpace($cmd)) { exit 0 }

# 위험 패턴(대소문자 무시). 부록 A의 기본 차단 목록 + 흔한 파괴적 명령.
$patterns = @(
    'rm\s+-rf',
    'DROP\s+TABLE',
    'sudo\s',
    ':\s*>\s*/',
    'mkfs',
    'dd\s+if=',
    'git\s+push\s+.*--force',
    '\bshutdown\b',
    '\bformat\b'
)
foreach ($p in $patterns) {
    if ($cmd -imatch $p) {
        [Console]::Error.WriteLine("[ClaudeCrew 안전차단] 위험해 보이는 명령이라 막았습니다: '$cmd'. 꼭 필요하면 사용자가 직접 실행하세요.")
        exit 2
    }
}
exit 0
