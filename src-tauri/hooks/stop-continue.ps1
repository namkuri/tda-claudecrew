# ClaudeCrew 훅 — Stop / TeammateIdle: "끝까지 모드"
# 작업을 멈추려 할 때 한 번 더 점검을 권고한다.
# 안전장치:
#  - stop_hook_active 가 이미 true 면 절대 다시 막지 않는다(무한 루프 방지).
#  - 환경변수 CLAUDECREW_KEEPGOING=1 일 때만 동작(일반 전역 사용에는 영향 없음).
# 규약: exit 0 = 멈춤 허용, exit 2 = 계속 진행하도록 되돌림.
$ErrorActionPreference = 'SilentlyContinue'
$raw = [Console]::In.ReadToEnd()
try { $j = $raw | ConvertFrom-Json } catch { exit 0 }
if ($j.stop_hook_active -eq $true) { exit 0 }
if ($env:CLAUDECREW_KEEPGOING -ne '1') { exit 0 }
[Console]::Error.WriteLine("[ClaudeCrew 끝까지 모드] 남은 할 일이 있으면 계속 진행하세요. 모두 끝냈다면 그대로 마무리하면 됩니다.")
exit 2
