// 번들 검증 하네스 — 전문가/스킬/커맨드의 형식과 설치 등록 누락(드리프트)을 점검한다.
// 사용: node scripts/check-bundle.mjs   (실패 시 exit 1)
// 안전: 읽기 전용. 파일을 고치거나 전송하지 않는다.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src-tauri");
const lib = readFileSync(join(src, "src", "lib.rs"), "utf8");
let errors = 0, warns = 0;
const err = (m) => { console.error("✗ " + m); errors++; };
const warn = (m) => { console.warn("△ " + m); warns++; };
const ok = (m) => console.log("✓ " + m);

// 간단한 YAML 프론트매터 파서(name/description만 확인)
function frontmatter(text){
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  m[1].split("\n").forEach(line => {
    const mm = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (mm) fm[mm[1]] = mm[2].trim();
  });
  return fm;
}

// include_str! 로 등록된 파일 경로를 모은다
const registered = new Set([...lib.matchAll(/include_str!\("\.\.\/([^"]+)"\)/g)].map(m => m[1]));

// 1) 전문가
const agentsDir = join(src, "agents");
const agentFiles = readdirSync(agentsDir).filter(f => f.endsWith(".md") && f !== "AGENTS.md");
for (const f of agentFiles){
  const fm = frontmatter(readFileSync(join(agentsDir, f), "utf8"));
  if (!fm || !fm.name || !fm.description) err(`agents/${f}: name/description 프론트매터 누락`);
  if (!registered.has(`agents/${f}`)) err(`agents/${f}: lib.rs 설치 배열에 등록되지 않음(드리프트)`);
}
ok(`전문가 ${agentFiles.length}개 점검`);

// 2) 스킬
const skillsDir = join(src, "skills");
const skillDirs = readdirSync(skillsDir).filter(d => statSync(join(skillsDir, d)).isDirectory());
for (const d of skillDirs){
  const sp = join(skillsDir, d, "SKILL.md");
  if (!existsSync(sp)) { err(`skills/${d}: SKILL.md 없음`); continue; }
  const fm = frontmatter(readFileSync(sp, "utf8"));
  if (!fm || !fm.name || !fm.description) err(`skills/${d}: name/description 프론트매터 누락`);
  if (!registered.has(`skills/${d}/SKILL.md`)) err(`skills/${d}: lib.rs 설치 배열에 등록되지 않음(드리프트)`);
  // 스크립트가 있으면 lib.rs skill_scripts 등록 확인
  const scriptsDir = join(skillsDir, d, "scripts");
  if (existsSync(scriptsDir)){
    for (const s of readdirSync(scriptsDir)){
      if (!registered.has(`skills/${d}/scripts/${s}`)) warn(`skills/${d}/scripts/${s}: lib.rs에 등록 안 됨(설치 누락 가능)`);
    }
  }
}
ok(`스킬 ${skillDirs.length}개 점검`);

// 3) 커맨드
const cmdDir = join(src, "commands");
if (existsSync(cmdDir)){
  const cmds = readdirSync(cmdDir).filter(f => f.endsWith(".md"));
  for (const f of cmds){
    if (!registered.has(`commands/${f}`)) err(`commands/${f}: lib.rs 설치 배열에 등록되지 않음(드리프트)`);
  }
  ok(`커맨드 ${cmds.length}개 점검`);
}

// 4) 훅 스크립트 등록 확인
const hooksDir = join(src, "hooks");
for (const f of readdirSync(hooksDir).filter(f => f.endsWith(".ps1") || f.endsWith(".sh"))){
  if (!registered.has(`hooks/${f}`)) warn(`hooks/${f}: lib.rs에 등록 안 됨(설치 누락 가능)`);
}
ok("훅 스크립트 점검");

console.log(`\n결과: 오류 ${errors} · 경고 ${warns}`);
if (errors > 0){ console.error("번들 검증 실패 — 위 오류를 고치세요."); process.exit(1); }
console.log("✅ 번들 검증 통과");
