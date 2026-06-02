// ClaudeCrew — Tauri 백엔드
// 안전 원칙: 공식 `claude` 바이너리를 헤드리스(claude -p)로 구동만 한다.
// 자격증명을 만지거나 인증을 위조하지 않는다. 각 작업은 격리된 git worktree에서 실행.

use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};

// ---------------- 상태 ----------------
#[derive(Clone, Serialize, Deserialize, Default)]
struct AgentInfo {
    id: String,
    repo: String,
    branch: String,
    prompt: String,
    #[serde(default)] model: String,
    #[serde(default)] permission: String,
    worktree: String,
    status: String,        // creating | running | done | error | stopped | committed
    #[serde(default)] cost: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")] pid: Option<u32>, // 런타임 전용
    #[serde(default)] port: Option<u16>,     // 감지된 dev 서버 포트(미리보기)
    #[serde(default)] tokens_in: Option<u64>,
    #[serde(default)] tokens_out: Option<u64>,
    #[serde(default)] ctx: Option<u64>,
    #[serde(default)] session_id: Option<String>,
    #[serde(default)] role: Option<String>,
    #[serde(default)] output: Vec<String>,   // 누적 터미널 로그(디스크 영속화)
}

struct AppState {
    agents: Mutex<HashMap<String, AgentInfo>>,
    counter: Mutex<u32>,
    cost_cap: Mutex<f64>, // 0 이하 = 끔
    capped: Mutex<bool>,  // 상한 도달 알림을 한 번만 보내기 위한 플래그
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            agents: Mutex::new(HashMap::new()),
            counter: Mutex::new(0),
            cost_cap: Mutex::new(5.0),
            capped: Mutex::new(false),
        }
    }
}

// ---------------- 유틸 ----------------
fn sanitize(s: &str) -> String {
    let cleaned: String = s
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' { c } else { '-' })
        .collect();
    cleaned.chars().take(60).collect()
}

fn home_dir() -> PathBuf {
    if cfg!(windows) {
        PathBuf::from(std::env::var("USERPROFILE").unwrap_or_else(|_| ".".into()))
    } else {
        PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| ".".into()))
    }
}

// Windows에서 자식 프로세스의 콘솔 창 깜빡임을 막는다(CREATE_NO_WINDOW).
// Tauri로 띄운 앱은 콘솔이 없어서 cmd/claude/git을 spawn할 때마다 새 창이 깜빡인다.
#[cfg(windows)]
fn hide_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
}
#[cfg(not(windows))]
fn hide_window(_cmd: &mut Command) {}

// Windows에서는 .cmd 실행을 위해 cmd /C 래퍼가 필요하다.
fn claude_command(args: &[String]) -> Command {
    let mut c = if cfg!(windows) {
        let mut c = Command::new("cmd");
        c.arg("/C").arg("claude");
        for a in args { c.arg(a); }
        c
    } else {
        let mut c = Command::new("claude");
        for a in args { c.arg(a); }
        c
    };
    hide_window(&mut c);
    c
}

fn git(repo: &str, args: &[&str]) -> Result<String, String> {
    let mut cmd = Command::new("git");
    cmd.arg("-C").arg(repo).args(args);
    hide_window(&mut cmd);
    let out = cmd
        .output()
        .map_err(|e| format!("git 실행 실패: {e}"))?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
    }
}

// stream-json 이벤트에서 사람이 읽을 텍스트만 추출
fn extract_text(evt: &Value) -> Option<String> {
    let t = evt.get("type")?.as_str()?;
    match t {
        "system" => {
            if evt.get("subtype").and_then(|v| v.as_str()) == Some("init") {
                Some("▶ 세션 시작".into())
            } else {
                None
            }
        }
        "assistant" => {
            let content = evt.get("message")?.get("content")?.as_array()?;
            let mut parts = Vec::new();
            for b in content {
                match b.get("type").and_then(|v| v.as_str()) {
                    Some("text") => {
                        if let Some(s) = b.get("text").and_then(|v| v.as_str()) {
                            parts.push(s.to_string());
                        }
                    }
                    Some("tool_use") => {
                        let name = b.get("name").and_then(|v| v.as_str()).unwrap_or("tool");
                        parts.push(format!("🔧 {name}"));
                    }
                    _ => {}
                }
            }
            if parts.is_empty() { None } else { Some(parts.join("\n")) }
        }
        _ => None,
    }
}

// ---------------- 커맨드: Claude 설치 확인 ----------------
#[tauri::command]
fn check_claude() -> Result<String, String> {
    let out = claude_command(&["--version".into()])
        .output()
        .map_err(|e| format!("claude 실행 실패: {e}"))?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        Err("claude 명령을 찾지 못했습니다. Claude Code 설치/로그인을 확인하세요.".into())
    }
}

// ---------------- 커맨드: 온보딩 환경 설정 ----------------
// ~/.claude 에 전문가(서브에이전트) 설치 + 에이전트 팀 플래그 활성화
#[tauri::command]
fn setup_environment() -> Result<String, String> {
    let claude_dir = home_dir().join(".claude");
    let agents_dir = claude_dir.join("agents");
    std::fs::create_dir_all(&agents_dir).map_err(|e| e.to_string())?;

    // settings.json 병합 (팀 플래그)
    let settings_path = claude_dir.join("settings.json");
    let mut settings: Value = if settings_path.exists() {
        let raw = std::fs::read_to_string(&settings_path).unwrap_or_else(|_| "{}".into());
        serde_json::from_str(&raw).unwrap_or(Value::Object(Default::default()))
    } else {
        Value::Object(Default::default())
    };
    if !settings.is_object() {
        settings = Value::Object(Default::default());
    }
    if !settings.get("env").map(|v| v.is_object()).unwrap_or(false) {
        settings["env"] = Value::Object(Default::default());
    }
    settings["env"]["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] = Value::String("1".into());

    // 훅 설치 + settings.hooks 병합
    install_hooks(&claude_dir, &mut settings)?;

    std::fs::write(
        &settings_path,
        serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    // 전문가 설치
    let agents: [(&str, &str); 7] = [
        ("oracle.md", include_str!("../agents/oracle.md")),
        ("librarian.md", include_str!("../agents/librarian.md")),
        ("implementer.md", include_str!("../agents/implementer.md")),
        ("debugger.md", include_str!("../agents/debugger.md")),
        ("code-reviewer.md", include_str!("../agents/code-reviewer.md")),
        ("plan.md", include_str!("../agents/plan.md")),
        ("security.md", include_str!("../agents/security.md")),
    ];
    for (name, body) in agents {
        std::fs::write(agents_dir.join(name), body).map_err(|e| e.to_string())?;
    }

    // 스킬 설치 (~/.claude/skills/<name>/SKILL.md)
    let skills_dir = claude_dir.join("skills");
    let skills: [(&str, &str); 13] = [
        ("git-master", include_str!("../skills/git-master/SKILL.md")),
        ("test-writer", include_str!("../skills/test-writer/SKILL.md")),
        ("frontend-ui", include_str!("../skills/frontend-ui/SKILL.md")),
        ("browser-test", include_str!("../skills/browser-test/SKILL.md")),
        ("doc-writer", include_str!("../skills/doc-writer/SKILL.md")),
        ("init-deep", include_str!("../skills/init-deep/SKILL.md")),
        ("hyperplan", include_str!("../skills/hyperplan/SKILL.md")),
        ("security-research", include_str!("../skills/security-research/SKILL.md")),
        ("remove-deadcode", include_str!("../skills/remove-deadcode/SKILL.md")),
        ("pre-publish-review", include_str!("../skills/pre-publish-review/SKILL.md")),
        ("github-triage", include_str!("../skills/github-triage/SKILL.md")),
        ("work-with-pr", include_str!("../skills/work-with-pr/SKILL.md")),
        ("precise-edit", include_str!("../skills/precise-edit/SKILL.md")),
    ];
    for (name, body) in skills {
        let dir = skills_dir.join(name);
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        std::fs::write(dir.join("SKILL.md"), body).map_err(|e| e.to_string())?;
    }

    // 멀티파일 스킬: 보조 스크립트(scripts/) — (스킬, 스크립트명, sh, ps1)
    let skill_scripts: [(&str, &str, &str, &str); 2] = [
        (
            "security-research",
            "scan-secrets",
            include_str!("../skills/security-research/scripts/scan-secrets.sh"),
            include_str!("../skills/security-research/scripts/scan-secrets.ps1"),
        ),
        (
            "github-triage",
            "gh-list",
            include_str!("../skills/github-triage/scripts/gh-list.sh"),
            include_str!("../skills/github-triage/scripts/gh-list.ps1"),
        ),
    ];
    for (skill, name, sh, ps1) in skill_scripts {
        let dir = skills_dir.join(skill).join("scripts");
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let sh_path = dir.join(format!("{name}.sh"));
        std::fs::write(&sh_path, sh).map_err(|e| e.to_string())?;
        let mut bytes = vec![0xEF, 0xBB, 0xBF]; // .ps1 BOM
        bytes.extend_from_slice(ps1.as_bytes());
        std::fs::write(dir.join(format!("{name}.ps1")), bytes).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&sh_path, std::fs::Permissions::from_mode(0o755));
        }
    }

    // 슬래시 커맨드 설치 (~/.claude/commands/<name>.md)
    let commands_dir = claude_dir.join("commands");
    std::fs::create_dir_all(&commands_dir).map_err(|e| e.to_string())?;
    let commands: [(&str, &str); 4] = [
        ("hyperplan.md", include_str!("../commands/hyperplan.md")),
        ("security-research.md", include_str!("../commands/security-research.md")),
        ("remove-deadcode.md", include_str!("../commands/remove-deadcode.md")),
        ("review.md", include_str!("../commands/review.md")),
    ];
    for (name, body) in commands {
        std::fs::write(commands_dir.join(name), body).map_err(|e| e.to_string())?;
    }

    Ok("준비 완료: 전문가 7종 + 스킬 13종 + 커맨드 4종 설치 + 팀 기능 + 안전/품질 훅".into())
}

// ~/.claude/claudecrew-hooks 에 OS별 훅 스크립트(두 벌)를 기록하고,
// 현재 OS용 절대경로를 settings.hooks 에 idempotent 하게 병합한다.
// exit code 규칙: 0=진행, 2=차단/계속.
fn install_hooks(claude_dir: &std::path::Path, settings: &mut Value) -> Result<(), String> {
    let hooks_dir = claude_dir.join("claudecrew-hooks");
    std::fs::create_dir_all(&hooks_dir).map_err(|e| e.to_string())?;

    // Windows PowerShell + Unix bash 두 벌을 모두 기록(부록 A: OS 분기)
    let ps_scripts: [(&str, &str); 6] = [
        ("pretooluse-bash.ps1", include_str!("../hooks/pretooluse-bash.ps1")),
        ("posttooluse-format.ps1", include_str!("../hooks/posttooluse-format.ps1")),
        ("stop-continue.ps1", include_str!("../hooks/stop-continue.ps1")),
        ("taskcompleted-test.ps1", include_str!("../hooks/taskcompleted-test.ps1")),
        ("sessionstart-context.ps1", include_str!("../hooks/sessionstart-context.ps1")),
        ("subagentstop-log.ps1", include_str!("../hooks/subagentstop-log.ps1")),
    ];
    let sh_scripts: [(&str, &str); 6] = [
        ("pretooluse-bash.sh", include_str!("../hooks/pretooluse-bash.sh")),
        ("posttooluse-format.sh", include_str!("../hooks/posttooluse-format.sh")),
        ("stop-continue.sh", include_str!("../hooks/stop-continue.sh")),
        ("taskcompleted-test.sh", include_str!("../hooks/taskcompleted-test.sh")),
        ("sessionstart-context.sh", include_str!("../hooks/sessionstart-context.sh")),
        ("subagentstop-log.sh", include_str!("../hooks/subagentstop-log.sh")),
    ];
    // PowerShell 스크립트는 UTF-8 BOM으로 기록(한글 깨짐 방지)
    for (name, body) in ps_scripts {
        let mut bytes = vec![0xEF, 0xBB, 0xBF];
        bytes.extend_from_slice(body.as_bytes());
        std::fs::write(hooks_dir.join(name), bytes).map_err(|e| e.to_string())?;
    }
    for (name, body) in sh_scripts {
        let p = hooks_dir.join(name);
        std::fs::write(&p, body).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&p, std::fs::Permissions::from_mode(0o755));
        }
    }

    // 현재 OS용 훅 실행 명령(절대경로)
    let script_cmd = |stem: &str| -> String {
        let ext = if cfg!(windows) { "ps1" } else { "sh" };
        let p = hooks_dir.join(format!("{stem}.{ext}"));
        let p = p.to_string_lossy().to_string();
        if cfg!(windows) {
            format!("powershell -NoProfile -ExecutionPolicy Bypass -File \"{p}\"")
        } else {
            format!("bash \"{p}\"")
        }
    };

    // settings.hooks 보장
    if !settings.get("hooks").map(|v| v.is_object()).unwrap_or(false) {
        settings["hooks"] = Value::Object(Default::default());
    }

    // 이전 ClaudeCrew 항목(경로에 claudecrew-hooks 포함)을 지우고 새로 등록 → idempotent
    let marker = "claudecrew-hooks";
    let add_hook = |settings: &mut Value, event: &str, matcher: Option<&str>, command: String| {
        let arr = settings["hooks"]
            .as_object_mut()
            .unwrap()
            .entry(event.to_string())
            .or_insert_with(|| Value::Array(vec![]));
        if !arr.is_array() {
            *arr = Value::Array(vec![]);
        }
        let list = arr.as_array_mut().unwrap();
        list.retain(|grp| {
            !grp.get("hooks")
                .and_then(|h| h.as_array())
                .map(|hs| {
                    hs.iter().any(|hk| {
                        hk.get("command")
                            .and_then(|c| c.as_str())
                            .map(|c| c.contains(marker))
                            .unwrap_or(false)
                    })
                })
                .unwrap_or(false)
        });
        let mut group = serde_json::Map::new();
        if let Some(m) = matcher {
            group.insert("matcher".into(), Value::String(m.into()));
        }
        group.insert(
            "hooks".into(),
            serde_json::json!([{ "type": "command", "command": command }]),
        );
        list.push(Value::Object(group));
    };

    add_hook(settings, "PreToolUse", Some("Bash"), script_cmd("pretooluse-bash"));
    add_hook(settings, "PostToolUse", Some("Write|Edit"), script_cmd("posttooluse-format"));
    add_hook(settings, "Stop", None, script_cmd("stop-continue"));
    add_hook(settings, "TeammateIdle", None, script_cmd("stop-continue"));
    add_hook(settings, "TaskCompleted", None, script_cmd("taskcompleted-test"));
    add_hook(settings, "SessionStart", None, script_cmd("sessionstart-context"));
    add_hook(settings, "SubagentStop", None, script_cmd("subagentstop-log"));

    Ok(())
}

// ---------------- 커맨드: 에이전트 생성/실행 ----------------
#[tauri::command]
#[allow(clippy::too_many_arguments)]
fn create_agent(
    app: AppHandle,
    repo: String,
    prompt: String,
    model: String,
    permission: String,
    branch: Option<String>,
    agent: Option<String>,
    keepgoing: Option<bool>,
    team: Option<bool>,
    authmode: Option<String>,
) -> Result<String, String> {
    if !PathBuf::from(&repo).join(".git").exists() {
        return Err(format!("선택한 폴더가 git 프로젝트가 아닙니다: {repo}"));
    }

    let state = app.state::<AppState>();
    let id = {
        let mut c = state.counter.lock().unwrap();
        *c += 1;
        format!("a{}", *c)
    };
    let branch = sanitize(&branch.unwrap_or_else(|| format!("task-{id}")));
    let worktree = PathBuf::from(&repo)
        .join(".agentboard")
        .join(&branch)
        .to_string_lossy()
        .to_string();

    // 팀 모드 > 단일 전문가 위임 > 자동 오케스트레이션(기본) — 라벨/프롬프트 결정
    let team_on = team.unwrap_or(false);
    let keepgoing = keepgoing.unwrap_or(false);
    let use_subscription = authmode.as_deref() != Some("api"); // 기본: 구독(앱 플랜) 사용
    let role = if team_on { "team".to_string() }
        else if let Some(name) = agent.as_deref().filter(|n| !n.is_empty()) { name.to_string() }
        else { "orchestrator".to_string() };

    let info = AgentInfo {
        id: id.clone(),
        repo: repo.clone(),
        branch: branch.clone(),
        prompt: prompt.clone(),
        model: model.clone(),
        permission: permission.clone(),
        worktree: worktree.clone(),
        status: "creating".into(),
        cost: None,
        pid: None,
        port: None,
        tokens_in: None,
        tokens_out: None,
        ctx: None,
        session_id: None,
        role: Some(role.clone()),
        output: vec![],
    };
    state.agents.lock().unwrap().insert(id.clone(), info.clone());
    let _ = app.emit("agent_update", info);
    // 사용자 요청을 '맨 앞'에 두어 절대 묻히지 않게 하고, 오케스트레이션 안내는 짧게 뒤에 붙인다.
    let effective_prompt = if team_on {
        format!(
            "{prompt}\n\n\
— 위 요청을 작은 단위로 쪼개 적합한 전문가(서브에이전트: oracle 설계·근본원인, librarian 검색, \
implementer 구현, debugger 디버깅, code-reviewer 검토, plan 계획, security 보안)에게 가능하면 병렬로 위임해 \
끝까지 완수하고, 끝나면 누가 무엇을 했는지 한국어로 요약하세요."
        )
    } else {
        match agent.as_deref() {
            Some(name) if !name.is_empty() => format!(
                "{prompt}\n\n— 위 요청을 `{name}` 전문가(서브에이전트)에게 위임해 끝까지 처리하고, 끝나면 무엇을 했는지 한국어로 요약하세요."
            ),
            // 기본: 오케스트레이터가 전문가·스킬을 스스로 고른다 (병렬 위임 강조)
            _ => format!(
                "{prompt}\n\n\
— 위 요청을 끝까지 처리하세요. 당신은 오케스트레이터로서, 일을 작은 조각으로 나눈 뒤 적합한 전문가(서브에이전트: oracle/librarian/implementer/debugger/code-reviewer/plan/security)에게 \
**Task 도구로 위임**하세요. 서로 독립적인 조각은 **한 어시스턴트 턴에 Task들을 모아 동시에 호출**해 병렬로 진행하세요. \
스킬은 자유롭게 쓰고, 마땅한 게 없는데 재사용할 가치가 있으면 새 스킬을 만들어도 됩니다. 모호한 점은 합리적으로 가정해 진행하고, \
끝나면 누가/무엇을 했고 결과가 무엇인지 한국어로 짧게 요약하세요."
            ),
        }
    };

    // 무거운 작업은 별도 스레드에서 (id는 반환에도 쓰므로 복제해서 넘김)
    let app2 = app.clone();
    let id_for_thread = id.clone();
    std::thread::spawn(move || {
        run_agent(app2, id_for_thread, repo, effective_prompt, model, permission, branch, worktree, keepgoing, use_subscription, None);
    });

    Ok(id)
}

fn set_status(app: &AppHandle, id: &str, status: &str) {
    let state = app.state::<AppState>();
    let mut map = state.agents.lock().unwrap();
    if let Some(a) = map.get_mut(id) {
        a.status = status.into();
        let _ = app.emit("agent_update", a.clone());
        save_agent_state(a);
    }
}

// 작업 상태를 .agentboard/<branch>/.cc-state.json 에 저장한다 (재시작 후 복원용).
// best-effort: 실패해도 동작에 영향 없음.
fn save_agent_state(a: &AgentInfo) {
    if a.worktree.is_empty() { return; }
    let path = PathBuf::from(&a.worktree).join(".cc-state.json");
    if let Ok(json) = serde_json::to_string_pretty(a) {
        let _ = std::fs::create_dir_all(&a.worktree);
        let _ = std::fs::write(&path, json);
    }
}

#[allow(clippy::too_many_arguments)]
fn run_agent(
    app: AppHandle,
    id: String,
    repo: String,
    prompt: String,
    model: String,
    permission: String,
    branch: String,
    worktree: String,
    keepgoing: bool,
    use_subscription: bool,
    resume_sid: Option<String>, // Some이면 후속 메시지(같은 worktree, --resume 사용)
) {
    // 1) worktree 준비 (후속 메시지면 이미 있으니 생성 생략)
    if resume_sid.is_none() {
        std::fs::create_dir_all(PathBuf::from(&repo).join(".agentboard")).ok();
        let created = git(&repo, &["worktree", "add", "-b", &format!("ab/{branch}"), &worktree, "HEAD"])
            .or_else(|_| git(&repo, &["worktree", "add", &worktree, "HEAD"]));
        if let Err(e) = created {
            emit_output(&app, &id, &format!("[작업 공간 생성 실패] {e}"));
            set_status(&app, &id, "error");
            return;
        }
    }

    set_status(&app, &id, "running");

    // 2) claude -p 헤드리스 실행 (후속 메시지면 --resume <session_id> 추가)
    let mut args: Vec<String> = vec![
        "-p".into(),
        prompt,
        "--output-format".into(),
        "stream-json".into(),
        "--verbose".into(),
        "--model".into(),
        model,
        "--permission-mode".into(),
        permission,
    ];
    if let Some(sid) = resume_sid.as_deref() {
        if !sid.is_empty() { args.push("--resume".into()); args.push(sid.into()); }
    }
    let mut cmd = claude_command(&args);
    cmd.current_dir(&worktree)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    // "끝까지 모드"가 켜지면 Stop/TeammateIdle 훅이 작동하도록 환경변수 전달
    if keepgoing {
        cmd.env("CLAUDECREW_KEEPGOING", "1");
    }
    // 토큰 소스: 구독(앱 플랜) 선택 시 API 키 환경변수를 자식에서 제거 →
    // Claude Code가 로그인된 구독(Claude Max 등)으로 청구한다. (우리는 키를 만들지 않는다)
    if use_subscription {
        cmd.env_remove("ANTHROPIC_API_KEY");
        cmd.env_remove("ANTHROPIC_AUTH_TOKEN");
    }

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            emit_output(&app, &id, &format!("[claude 실행 실패] {e} — 설치/로그인을 확인하세요."));
            set_status(&app, &id, "error");
            return;
        }
    };

    // pid 저장 (중지용)
    {
        let state = app.state::<AppState>();
        let mut agents = state.agents.lock().unwrap();
        if let Some(a) = agents.get_mut(&id) {
            a.pid = Some(child.id());
        }
    }

    // stderr 드레인 스레드
    if let Some(err) = child.stderr.take() {
        let app_e = app.clone();
        let id_e = id.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(err);
            for line in reader.lines().map_while(Result::ok) {
                if !line.trim().is_empty() {
                    emit_output(&app_e, &id_e, &format!("[알림] {line}"));
                }
            }
        });
    }

    // stdout 라인 단위 파싱 → 이벤트
    let mut teammates: HashMap<String, String> = HashMap::new(); // tool_use_id → 전문가명
    if let Some(out) = child.stdout.take() {
        let reader = BufReader::new(out);
        for line in reader.lines().map_while(Result::ok) {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            match serde_json::from_str::<Value>(line) {
                Ok(evt) => {
                    // session_id 캐치: 첫 system init 이벤트(또는 result)에 들어 있다
                    if let Some(sid) = evt.get("session_id").and_then(|v| v.as_str()) {
                        let state = app.state::<AppState>();
                        let mut agents = state.agents.lock().unwrap();
                        if let Some(a) = agents.get_mut(&id) {
                            if a.session_id.as_deref() != Some(sid) {
                                a.session_id = Some(sid.to_string());
                                let _ = app.emit("agent_update", a.clone());
                            }
                        }
                    }
                    process_teammates(&app, &id, &evt, &mut teammates);
                    // 토큰/컨텍스트 사용량 추적
                    if let Some((tin, tout, ctx)) = usage_of(&evt) {
                        let is_result = evt.get("type").and_then(|v| v.as_str()) == Some("result");
                        let snapshot = {
                            let state = app.state::<AppState>();
                            let mut agents = state.agents.lock().unwrap();
                            agents.get_mut(&id).map(|a| {
                                if is_result {
                                    a.tokens_in = Some(tin);
                                    a.tokens_out = Some(tout);
                                } else {
                                    // 진행 중 턴: 출력은 누적 최대, 컨텍스트는 최신값
                                    a.tokens_out = Some(a.tokens_out.unwrap_or(0).max(tout));
                                }
                                if ctx > 0 { a.ctx = Some(ctx); }
                                a.clone()
                            })
                        };
                        if let Some(info) = snapshot { let _ = app.emit("agent_update", info); }
                    }
                    if evt.get("type").and_then(|v| v.as_str()) == Some("result") {
                        if let Some(cost) = evt.get("total_cost_usd").and_then(|v| v.as_f64()) {
                            {
                                let state = app.state::<AppState>();
                                let mut agents = state.agents.lock().unwrap();
                                if let Some(a) = agents.get_mut(&id) {
                                    a.cost = Some(cost);
                                }
                            }
                            check_cost_cap(&app);
                        }
                        if let Some(r) = evt.get("result").and_then(|v| v.as_str()) {
                            emit_output(&app, &id, r);
                        }
                    } else if let Some(t) = extract_text(&evt) {
                        emit_output(&app, &id, &t);
                    }
                }
                Err(_) => emit_output(&app, &id, line),
            }
        }
    }

    let ok = child.wait().map(|s| s.success()).unwrap_or(false);
    set_status(&app, &id, if ok { "done" } else { "error" });
    // done 이벤트(비용 포함) — 가드를 명명해 state보다 먼저 drop되게 한다
    let state = app.state::<AppState>();
    let agents = state.agents.lock().unwrap();
    if let Some(a) = agents.get(&id) {
        let _ = app.emit("agent_done", a.clone());
        save_agent_state(a); // 마지막 상태(비용/토큰/세션ID/output)까지 영속화
    }
}

// 이벤트에서 토큰 사용량을 읽는다. (in, out, 컨텍스트=입력+캐시) — result 또는 assistant 메시지 모두 지원.
fn usage_of(evt: &Value) -> Option<(u64, u64, u64)> {
    let u = evt
        .get("usage")
        .or_else(|| evt.get("message").and_then(|m| m.get("usage")))?;
    let g = |k: &str| u.get(k).and_then(|v| v.as_u64()).unwrap_or(0);
    let input = g("input_tokens");
    let output = g("output_tokens");
    let ctx = input + g("cache_read_input_tokens") + g("cache_creation_input_tokens");
    Some((input, output, ctx))
}

// 팀 모드에서 서브에이전트(Task) 호출/완료를 추적해 UI에 전문가별 진행을 알린다.
fn process_teammates(app: &AppHandle, agent_id: &str, evt: &Value, map: &mut HashMap<String, String>) {
    match evt.get("type").and_then(|v| v.as_str()) {
        Some("assistant") => {
            if let Some(content) = evt
                .get("message")
                .and_then(|m| m.get("content"))
                .and_then(|c| c.as_array())
            {
                for b in content {
                    if b.get("type").and_then(|v| v.as_str()) == Some("tool_use")
                        && b.get("name").and_then(|v| v.as_str()) == Some("Task")
                    {
                        let tuid = b.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        let input = b.get("input");
                        let name = input
                            .and_then(|i| i.get("subagent_type"))
                            .and_then(|v| v.as_str())
                            .or_else(|| input.and_then(|i| i.get("description")).and_then(|v| v.as_str()))
                            .unwrap_or("전문가")
                            .to_string();
                        let desc_full = input
                            .and_then(|i| i.get("description"))
                            .and_then(|v| v.as_str())
                            .or_else(|| input.and_then(|i| i.get("prompt")).and_then(|v| v.as_str()))
                            .unwrap_or("");
                        let desc: String = desc_full.chars().take(180).collect();
                        if !tuid.is_empty() {
                            map.insert(tuid, name.clone());
                        }
                        let _ = app.emit(
                            "teammate_update",
                            serde_json::json!({ "agentId": agent_id, "name": name, "desc": desc, "status": "working" }),
                        );
                    }
                }
            }
        }
        Some("user") => {
            if let Some(content) = evt
                .get("message")
                .and_then(|m| m.get("content"))
                .and_then(|c| c.as_array())
            {
                for b in content {
                    if b.get("type").and_then(|v| v.as_str()) == Some("tool_result") {
                        if let Some(tuid) = b.get("tool_use_id").and_then(|v| v.as_str()) {
                            if let Some(name) = map.remove(tuid) {
                                // 서브에이전트 결과 텍스트를 짧게 뽑아 함께 전달
                                let result_text = b.get("content").map(|c| {
                                    if let Some(s) = c.as_str() { s.to_string() }
                                    else if let Some(arr) = c.as_array() {
                                        arr.iter().filter_map(|x| x.get("text").and_then(|t| t.as_str())).collect::<Vec<_>>().join(" ")
                                    } else { String::new() }
                                }).unwrap_or_default();
                                let snippet: String = result_text.chars().take(220).collect();
                                let _ = app.emit(
                                    "teammate_update",
                                    serde_json::json!({ "agentId": agent_id, "name": name, "desc": "", "result": snippet, "status": "done" }),
                                );
                            }
                        }
                    }
                }
            }
        }
        _ => {}
    }
}

fn emit_output(app: &AppHandle, id: &str, text: &str) {
    note_port(app, id, text);
    // 메모리 + 디스크에 누적(복원용). 매우 큰 작업은 잘림 방지 위해 5000줄/줄당 4KB 상한.
    {
        let state = app.state::<AppState>();
        let mut agents = state.agents.lock().unwrap();
        if let Some(a) = agents.get_mut(id) {
            let line: String = text.chars().take(4000).collect();
            a.output.push(line);
            if a.output.len() > 5000 { let drop = a.output.len() - 5000; a.output.drain(..drop); }
            // 디스크 저장은 5줄마다(쓰기 비용 감소)
            if a.output.len() % 5 == 0 { save_agent_state(a); }
        }
    }
    let _ = app.emit(
        "agent_output",
        serde_json::json!({ "id": id, "text": text }),
    );
}

// 출력 줄에서 dev 서버 포트(localhost:NNNN)를 best-effort로 뽑는다.
fn detect_port(line: &str) -> Option<u16> {
    let lower = line.to_lowercase();
    for marker in ["localhost:", "127.0.0.1:", "0.0.0.0:"] {
        if let Some(pos) = lower.find(marker) {
            let rest = &line[pos + marker.len()..];
            let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
            if let Ok(p) = digits.parse::<u16>() {
                if p >= 1024 {
                    return Some(p);
                }
            }
        }
    }
    None
}

// 포트를 한 번 발견하면 저장하고 UI에 알린다.
fn note_port(app: &AppHandle, id: &str, line: &str) {
    if let Some(p) = detect_port(line) {
        let state = app.state::<AppState>();
        let mut changed = false;
        {
            let mut agents = state.agents.lock().unwrap();
            if let Some(a) = agents.get_mut(id) {
                if a.port.is_none() {
                    a.port = Some(p);
                    changed = true;
                }
            }
        } // 가드를 먼저 풀어 아래 재잠금과의 데드락 방지
        if changed {
            let agents = state.agents.lock().unwrap();
            if let Some(a) = agents.get(id) {
                let _ = app.emit("agent_update", a.clone());
            }
        }
    }
}

// ---------------- 커맨드: 후속 메시지 보내기(세션 재개) ----------------
// 기존 작업 탭에서 같은 worktree·같은 Claude Code 세션으로 추가 지시를 보낸다(`--resume`).
// 사용자가 단발성이 아니라 진짜 대화로 쓸 수 있게 함.
#[tauri::command]
fn send_message(app: AppHandle, id: String, prompt: String) -> Result<(), String> {
    if prompt.trim().is_empty() { return Err("메시지가 비어 있습니다.".into()); }
    let state = app.state::<AppState>();
    let (repo, branch, worktree, model, permission, sid) = {
        let agents = state.agents.lock().unwrap();
        let a = agents.get(&id).ok_or("없는 작업")?;
        if a.status == "running" || a.status == "creating" {
            return Err("작업이 아직 진행 중입니다. 끝난 뒤 보내주세요.".into());
        }
        (a.repo.clone(), a.branch.clone(), a.worktree.clone(),
         if a.model.is_empty() { "sonnet".into() } else { a.model.clone() },
         if a.permission.is_empty() { "acceptEdits".into() } else { a.permission.clone() },
         a.session_id.clone())
    };
    let Some(session_id) = sid else { return Err("세션 ID가 없어요(이 작업은 아직 한 번도 응답을 받지 못했어요).".into()); };
    // 새 사용자 메시지가 시작됨을 표시하기 위해 상태/로그에 구분선
    emit_output(&app, &id, &format!("\n💬 사용자: {}", prompt));
    set_status(&app, &id, "running");
    let app2 = app.clone();
    let id2 = id.clone();
    std::thread::spawn(move || {
        run_agent(app2, id2, repo, prompt, model, permission, branch, worktree, false, true, Some(session_id));
    });
    Ok(())
}

// ---------------- 커맨드: Claude Code 사용량 통계 ----------------
// `~/.claude/stats-cache.json` 을 읽어 누적 토큰/모델/일별 활동을 돌려준다.
// Claude Code(`/usage`)가 보여주는 것과 동일한 로컬 캐시.
#[derive(Clone, Serialize, Default)]
struct UsageStats {
    available: bool,
    input_tokens: u64,
    output_tokens: u64,
    cache_read_tokens: u64,
    cache_creation_tokens: u64,
    cost_usd: f64,
    total_sessions: u64,
    total_messages: u64,
    today_messages: u64,    // 오늘(YYYY-MM-DD) 메시지 수
    today_tokens: u64,      // 오늘 모델별 합계
    week_messages: u64,     // 최근 7일 메시지 수
    week_tokens: u64,
    models: Vec<String>,    // 사용된 모델 목록
    last_computed: String,  // stats-cache의 lastComputedDate
}

// 사용자 PC의 '오늘'은 UI(JS)가 알려준다. Rust std에는 로컬 시간이 없어 외부 의존 없이 정확히 알 수 없기 때문.
// (UTC 기준으로 계산하면 한국 KST 사용자는 9시간 어긋난다.)
#[tauri::command]
fn read_usage(today: Option<String>) -> UsageStats {
    let mut out = UsageStats::default();
    let home = std::env::var("USERPROFILE").ok().or_else(|| std::env::var("HOME").ok());
    let Some(home) = home.map(PathBuf::from) else { return out };
    let path = home.join(".claude").join("stats-cache.json");
    let Ok(text) = std::fs::read_to_string(&path) else { return out };
    let Ok(v): Result<Value, _> = serde_json::from_str(&text) else { return out };

    // 모델별 합계
    if let Some(usage) = v.get("modelUsage").and_then(|x| x.as_object()) {
        for (name, m) in usage {
            out.models.push(name.clone());
            let g = |k: &str| m.get(k).and_then(|x| x.as_u64()).unwrap_or(0);
            out.input_tokens += g("inputTokens");
            out.output_tokens += g("outputTokens");
            out.cache_read_tokens += g("cacheReadInputTokens");
            out.cache_creation_tokens += g("cacheCreationInputTokens");
            out.cost_usd += m.get("costUSD").and_then(|x| x.as_f64()).unwrap_or(0.0);
        }
    }
    out.total_sessions = v.get("totalSessions").and_then(|x| x.as_u64()).unwrap_or(0);
    out.total_messages = v.get("totalMessages").and_then(|x| x.as_u64()).unwrap_or(0);
    out.last_computed = v.get("lastComputedDate").and_then(|x| x.as_str()).unwrap_or("").to_string();

    // 오늘/주간 — today는 UI에서 받은 사용자 로컬 날짜. 없으면 집계 생략(부정확보다 명시적 0이 낫다).
    if let Some(today) = today.as_deref() {
        if let Some(arr) = v.get("dailyActivity").and_then(|x| x.as_array()) {
            for d in arr {
                let date = d.get("date").and_then(|x| x.as_str()).unwrap_or("");
                let mc = d.get("messageCount").and_then(|x| x.as_u64()).unwrap_or(0);
                if date == today { out.today_messages += mc; }
                if cmp_recent7(date, today) { out.week_messages += mc; }
            }
        }
        if let Some(arr) = v.get("dailyModelTokens").and_then(|x| x.as_array()) {
            for d in arr {
                let date = d.get("date").and_then(|x| x.as_str()).unwrap_or("");
                let tok: u64 = d.get("tokensByModel").and_then(|x| x.as_object())
                    .map(|o| o.values().filter_map(|v| v.as_u64()).sum()).unwrap_or(0);
                if date == today { out.today_tokens += tok; }
                if cmp_recent7(date, today) { out.week_tokens += tok; }
            }
        }
    }

    out.available = true;
    out
}

// 두 YYYY-MM-DD 문자열을 비교해 src가 today 기준 최근 7일 이내인지(같은 날 포함).
fn cmp_recent7(src: &str, today: &str) -> bool {
    fn ymd(s: &str) -> Option<(i64, u32, u32)> {
        let mut p = s.split('-');
        Some((p.next()?.parse().ok()?, p.next()?.parse().ok()?, p.next()?.parse().ok()?))
    }
    fn to_days(y: i64, m: u32, d: u32) -> i64 {
        // 1970-01-01 부터의 일수(근사 — 비교용이라 충분).
        let mut total: i64 = 0;
        for yy in 1970..y {
            let leap = (yy % 4 == 0 && yy % 100 != 0) || (yy % 400 == 0);
            total += if leap {366} else {365};
        }
        let mdays = [31,28,31,30,31,30,31,31,30,31,30,31];
        let leap = (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);
        for mm in 1..m { total += mdays[(mm - 1) as usize] as i64 + if leap && mm == 2 {1} else {0}; }
        total + (d as i64 - 1)
    }
    let (Some(a), Some(b)) = (ymd(src), ymd(today)) else { return false };
    let da = to_days(a.0, a.1, a.2); let db = to_days(b.0, b.1, b.2);
    db - da >= 0 && db - da < 7
}

// ---------------- 커맨드: API 모드 감지 (안전: 키를 저장/취급하지 않음) ----------------
// 환경에 ANTHROPIC_API_KEY 가 이미 있으면 Claude Code가 API 경로로 인증한다.
// 우리는 그 사실만 읽어 UI에 표시할 뿐, 키를 만들거나 저장하지 않는다(안전 원칙 1장).
#[tauri::command]
fn check_api_mode() -> bool {
    std::env::var("ANTHROPIC_API_KEY")
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false)
}

// ---------------- 커맨드: 미리보기(브라우저로 열기) ----------------
#[tauri::command]
fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

// 폴더(또는 파일) 경로를 OS 파일 탐색기로 연다.
#[tauri::command]
fn open_path(app: AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| e.to_string())
}

// ---------------- 커맨드: 목록 ----------------
#[tauri::command]
fn list_agents(app: AppHandle) -> Vec<AgentInfo> {
    let state = app.state::<AppState>();
    let agents = state.agents.lock().unwrap();
    agents.values().cloned().collect()
}

// ---------------- 커맨드: 작업 공간 복원 ----------------
// 앱 재시작 후에도 .agentboard/ 아래 worktree 들을 보드에 복원한다(V1.3).
#[tauri::command]
fn restore_agents(app: AppHandle, repo: String) -> Vec<AgentInfo> {
    if let Ok(out) = git(&repo, &["worktree", "list", "--porcelain"]) {
        let state = app.state::<AppState>();
        for line in out.lines() {
            if let Some(p) = line.strip_prefix("worktree ") {
                let wt = p.trim().to_string();
                if !wt.contains(".agentboard") {
                    continue;
                }
                let exists = state
                    .agents
                    .lock()
                    .unwrap()
                    .values()
                    .any(|a| a.worktree == wt);
                if exists {
                    continue;
                }
                let branch = PathBuf::from(&wt)
                    .file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|| "복원".into());
                let id = {
                    let mut c = state.counter.lock().unwrap();
                    *c += 1;
                    format!("r{}", *c)
                };
                // 디스크 영속화 파일이 있으면 그걸로 진짜 복원, 없으면 메타만으로
                let state_path = PathBuf::from(&wt).join(".cc-state.json");
                let info = std::fs::read_to_string(&state_path)
                    .ok()
                    .and_then(|s| serde_json::from_str::<AgentInfo>(&s).ok())
                    .map(|mut a| {
                        // 재시작 후엔 실행 중일 수 없으니 상태/pid 정리
                        a.id = id.clone();
                        a.pid = None;
                        if a.status == "running" || a.status == "creating" { a.status = "stopped".into(); }
                        a
                    })
                    .unwrap_or_else(|| AgentInfo {
                        id: id.clone(),
                        repo: repo.clone(),
                        branch: branch.clone(),
                        // 영속화 파일이 없는(이전 버전에서 만든) worktree → 브랜치명을 그대로 노출
                        prompt: branch.clone(),
                        model: String::new(),
                        permission: String::new(),
                        worktree: wt.clone(),
                        status: "done".into(),
                        cost: None,
                        pid: None,
                        port: None,
                        tokens_in: None,
                        tokens_out: None,
                        ctx: None,
                        session_id: None,
                        role: None,
                        output: vec![],
                    });
                state.agents.lock().unwrap().insert(id, info);
            }
        }
    }
    list_agents(app)
}

// 저장소의 기본(기준) 브랜치를 검출한다. origin/HEAD → main → master 순으로 폴백.
fn detect_base_branch(repo: &str) -> String {
    // 1) origin/HEAD가 가리키는 브랜치 (예: 'origin/main')
    if let Ok(s) = git(repo, &["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]) {
        let s = s.trim();
        if let Some(b) = s.strip_prefix("origin/") { if !b.is_empty() { return b.to_string(); } }
    }
    // 2) 로컬에 main/master 가 있는지
    for name in ["main", "master"] {
        if git(repo, &["rev-parse", "--verify", "--quiet", name]).is_ok() {
            return name.to_string();
        }
    }
    // 3) 최후 폴백: 현재 HEAD가 가리키는 브랜치 (안전한 default)
    git(repo, &["rev-parse", "--abbrev-ref", "HEAD"])
        .map(|s| s.trim().to_string()).unwrap_or_else(|_| "main".into())
}

#[tauri::command]
fn get_base_branch(app: AppHandle, id: String) -> Result<String, String> {
    let state = app.state::<AppState>();
    let repo = state.agents.lock().unwrap().get(&id).map(|a| a.repo.clone()).ok_or("없는 작업")?;
    Ok(detect_base_branch(&repo))
}

// ---------------- 커맨드: 바뀐 점(diff) ----------------
// 워크트리에서 '기준 브랜치 → 현재' 변경 전체를 보여준다.
// 1) git add -A 로 새 파일 포함, 2) HEAD 이후 staged + 워킹트리 + base..HEAD 커밋 모두 합쳐 보여준다.
#[tauri::command]
fn get_diff(app: AppHandle, id: String) -> Result<String, String> {
    let state = app.state::<AppState>();
    let (worktree, repo) = state.agents.lock().unwrap().get(&id)
        .map(|a| (a.worktree.clone(), a.repo.clone()))
        .ok_or("없는 작업")?;
    let base = detect_base_branch(&repo);
    // 격리 worktree라 staging 부작용 없음 → 새 파일까지 잡히게 add
    git(&worktree, &["add", "-A"]).ok();
    // base..HEAD (커밋된 변경) + working tree(stage 포함)를 한 번에 — 'base...HEAD'는 머지 베이스 기준 비교라 더 견고.
    // 다만 working tree 변경도 포함하려면 worktree 의 인덱스/working 까지 합쳐야 한다 → 'base' 와 worktree 인덱스 비교.
    let diff = git(&worktree, &["diff", &base]).unwrap_or_default();
    Ok(if diff.trim().is_empty() { "(바뀐 점 없음)".into() } else { diff })
}

// ---------------- 커맨드: 중지 ----------------
fn kill_pid(pid: u32) {
    if cfg!(windows) {
        let mut c = Command::new("taskkill");
        c.args(["/PID", &pid.to_string(), "/T", "/F"]);
        hide_window(&mut c);
        let _ = c.output();
    } else {
        let _ = Command::new("kill").arg(pid.to_string()).output();
    }
}

#[tauri::command]
fn stop_agent(app: AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<AppState>();
    let pid = state.agents.lock().unwrap().get(&id).and_then(|a| a.pid);
    if let Some(pid) = pid {
        kill_pid(pid);
    }
    set_status(&app, &id, "stopped");
    Ok(())
}

// ---------------- 비용 가드(상한·자동 정지) ----------------
#[tauri::command]
fn set_cost_cap(app: AppHandle, value: f64) {
    let state = app.state::<AppState>();
    *state.cost_cap.lock().unwrap() = value.max(0.0);
    *state.capped.lock().unwrap() = false; // 상한을 바꾸면 알림 재무장
}

#[tauri::command]
fn get_cost_cap(app: AppHandle) -> f64 {
    *app.state::<AppState>().cost_cap.lock().unwrap()
}

// 누적 비용이 상한에 도달하면 진행 중 작업을 멈추고 한 번만 알린다.
fn check_cost_cap(app: &AppHandle) {
    let state = app.state::<AppState>();
    let cap = *state.cost_cap.lock().unwrap();
    if cap <= 0.0 {
        return;
    }
    let total: f64 = {
        let map = state.agents.lock().unwrap();
        map.values().filter_map(|a| a.cost).sum()
    };
    if total < cap {
        return;
    }
    // 한 번만 발동
    {
        let mut c = state.capped.lock().unwrap();
        if *c {
            return;
        }
        *c = true;
    }
    // 진행 중/준비 중 에이전트 정지 (락을 잡은 채 프로세스를 죽이지 않도록 분리)
    let to_stop: Vec<(String, u32)> = {
        let map = state.agents.lock().unwrap();
        map.values()
            .filter(|a| a.status == "running" || a.status == "creating")
            .filter_map(|a| a.pid.map(|p| (a.id.clone(), p)))
            .collect()
    };
    for (id, pid) in &to_stop {
        kill_pid(*pid);
        set_status(app, id, "stopped");
    }
    let _ = app.emit(
        "cost_capped",
        serde_json::json!({ "total": total, "cap": cap }),
    );
}

// ---------------- 커맨드: 정리(되돌리기) ----------------
#[tauri::command]
fn cleanup_agent(app: AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<AppState>();
    let (repo, worktree, pid) = {
        let map = state.agents.lock().unwrap();
        let a = map.get(&id).ok_or("없는 작업")?;
        (a.repo.clone(), a.worktree.clone(), a.pid)
    };
    if let Some(pid) = pid {
        kill_pid(pid);
    }
    let _ = git(&repo, &["worktree", "remove", "--force", &worktree]);
    state.agents.lock().unwrap().remove(&id);
    let _ = app.emit("agent_removed", serde_json::json!({ "id": id }));
    Ok(())
}

// ---------------- 커맨드: 검색 켜기/끄기 (MCP) ----------------
// 부록A 5장. 프로젝트 <repo>/.mcp.json 에 공식문서 검색 MCP(context7, 키 불필요)를 켠다.
// 안전: 우리가 자격증명을 만들지 않는다. Exa 웹검색은 '사용자 본인 키'를 입력했을 때만 추가한다.
fn load_mcp(repo: &str) -> (PathBuf, Value) {
    let path = PathBuf::from(repo).join(".mcp.json");
    let mut root: Value = if path.exists() {
        serde_json::from_str(&std::fs::read_to_string(&path).unwrap_or_else(|_| "{}".into()))
            .unwrap_or(Value::Object(Default::default()))
    } else {
        Value::Object(Default::default())
    };
    if !root.is_object() {
        root = Value::Object(Default::default());
    }
    if !root.get("mcpServers").map(|v| v.is_object()).unwrap_or(false) {
        root["mcpServers"] = Value::Object(Default::default());
    }
    (path, root)
}

#[tauri::command]
fn enable_search(repo: String) -> Result<String, String> {
    if !PathBuf::from(&repo).exists() {
        return Err(format!("폴더가 없습니다: {repo}"));
    }
    let (path, mut root) = load_mcp(&repo);
    // context7: 공식 문서 검색, API 키 불필요
    root["mcpServers"]["context7"] = serde_json::json!({
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp"]
    });
    std::fs::write(&path, serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok("검색 켜짐: 공식 문서 검색(context7)을 연결했어요.".into())
}

// 정밀 편집(LSP/시맨틱 MCP): serena(심볼/참조 도구)를 .mcp.json 에 연결/해제.
// serena는 uv(uvx)로 구동되는 오픈소스 도구. 설치/실행은 사용자 환경에 의존.
#[tauri::command]
fn enable_lsp(repo: String) -> Result<String, String> {
    if !PathBuf::from(&repo).exists() {
        return Err(format!("폴더가 없습니다: {repo}"));
    }
    let (path, mut root) = load_mcp(&repo);
    root["mcpServers"]["serena"] = serde_json::json!({
        "command": "uvx",
        "args": [
            "--from", "git+https://github.com/oraios/serena",
            "serena", "start-mcp-server",
            "--context", "ide-assistant",
            "--project", repo
        ]
    });
    std::fs::write(&path, serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok("정밀 편집 켜짐: 심볼/참조 도구(serena)를 연결했어요. (uv 필요)".into())
}

#[tauri::command]
fn disable_lsp(repo: String) -> Result<String, String> {
    let path = PathBuf::from(&repo).join(".mcp.json");
    if !path.exists() {
        return Ok("정밀 편집은 이미 꺼져 있어요.".into());
    }
    let (_p, mut root) = load_mcp(&repo);
    if let Some(servers) = root.get_mut("mcpServers").and_then(|v| v.as_object_mut()) {
        servers.remove("serena");
    }
    std::fs::write(&path, serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok("정밀 편집 끔.".into())
}

// Exa 웹검색: 사용자 본인 키를 .mcp.json 에 등록(키가 비면 제거). 키는 사용자 소유물이다.
#[tauri::command]
fn set_exa_key(repo: String, key: String) -> Result<String, String> {
    if !PathBuf::from(&repo).exists() {
        return Err(format!("폴더가 없습니다: {repo}"));
    }
    let (path, mut root) = load_mcp(&repo);
    if key.trim().is_empty() {
        if let Some(servers) = root.get_mut("mcpServers").and_then(|v| v.as_object_mut()) {
            servers.remove("exa");
        }
        std::fs::write(&path, serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        return Ok("웹검색(Exa) 끔.".into());
    }
    root["mcpServers"]["exa"] = serde_json::json!({
        "command": "npx",
        "args": ["-y", "exa-mcp-server"],
        "env": { "EXA_API_KEY": key.trim() }
    });
    std::fs::write(&path, serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok("웹검색(Exa) 켜짐: 입력한 키로 연결했어요. (.mcp.json은 git에 올리지 마세요)".into())
}

#[tauri::command]
fn disable_search(repo: String) -> Result<String, String> {
    let path = PathBuf::from(&repo).join(".mcp.json");
    if !path.exists() {
        return Ok("검색은 이미 꺼져 있어요.".into());
    }
    let mut root: Value =
        serde_json::from_str(&std::fs::read_to_string(&path).unwrap_or_else(|_| "{}".into()))
            .unwrap_or(Value::Object(Default::default()));
    if let Some(servers) = root.get_mut("mcpServers").and_then(|v| v.as_object_mut()) {
        servers.remove("context7");
    }
    std::fs::write(
        &path,
        serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok("검색 꺼짐.".into())
}

// ---------------- 커맨드: 적용하기(변경 저장/commit) ----------------
// 격리된 worktree(ab/<branch>)에서만 커밋한다. 메인 브랜치를 직접 바꾸지 않는다(안전 원칙).
#[tauri::command]
fn commit_agent(app: AppHandle, id: String, message: String) -> Result<String, String> {
    let state = app.state::<AppState>();
    let (worktree, prompt) = {
        let map = state.agents.lock().unwrap();
        let a = map.get(&id).ok_or("없는 작업")?;
        (a.worktree.clone(), a.prompt.clone())
    };

    // 메시지 미입력 시 부탁 내용으로 기본 메시지 구성(git-master 스킬 연계는 추후)
    let msg = if message.trim().is_empty() {
        let short: String = prompt.trim().chars().take(50).collect();
        format!("ClaudeCrew: {short}")
    } else {
        message
    };

    git(&worktree, &["add", "-A"])?;
    let staged = git(&worktree, &["diff", "--cached", "--name-only"]).unwrap_or_default();
    if staged.trim().is_empty() {
        return Err("저장할 바뀐 점이 없습니다.".into());
    }
    git(
        &worktree,
        &[
            "-c",
            "user.name=ClaudeCrew",
            "-c",
            "user.email=claudecrew@local",
            "commit",
            "-m",
            msg.as_str(),
        ],
    )?;
    let hash = git(&worktree, &["rev-parse", "--short", "HEAD"]).unwrap_or_default();
    set_status(&app, &id, "committed");
    Ok(format!("저장됨: {} ({})", msg, hash.trim()))
}

// ---------------- 진입점 ----------------
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            check_claude,
            setup_environment,
            create_agent,
            list_agents,
            get_diff,
            stop_agent,
            cleanup_agent,
            commit_agent,
            set_cost_cap,
            get_cost_cap,
            enable_search,
            disable_search,
            set_exa_key,
            enable_lsp,
            disable_lsp,
            open_url,
            restore_agents,
            check_api_mode,
            read_usage,
            send_message,
            open_path,
            get_base_branch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
