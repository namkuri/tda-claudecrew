// claudecrew-plugin/ 을 src-tauri 의 원본(agents/skills/hooks)으로 채운다(부록A 8장).
// 사용: node scripts/build-plugin.mjs
// 안전: 읽기/복사만 한다. 외부 전송 없음.
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src-tauri");
const plugin = join(root, "claudecrew-plugin");

function copyDir(from, to){
  if (!existsSync(from)) { console.warn("건너뜀(없음):", from); return; }
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log("복사:", from, "→", to);
}

// 1) 전문가·스킬·훅 복사
copyDir(join(src, "agents"), join(plugin, "agents"));
copyDir(join(src, "skills"), join(plugin, "skills"));
copyDir(join(src, "hooks"),  join(plugin, "hooks"));

// 2) plugin.json 버전을 package.json 과 맞춤
try {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const manifestPath = join(plugin, ".claude-plugin", "plugin.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.version = pkg.version || manifest.version;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log("plugin.json 버전 →", manifest.version);
} catch (e) {
  console.warn("plugin.json 버전 동기화 건너뜀:", e.message);
}

console.log("\n✅ 플러그인 번들 준비 완료:", plugin);
console.log("   (이 폴더를 Claude Code 플러그인으로 설치/공유할 수 있습니다)");
