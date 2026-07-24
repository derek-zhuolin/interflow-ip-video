#!/usr/bin/env node
// media_lib.mjs — 素材库合并列举(库层 + 当天项目层,项目同 id 覆盖库)。
// 选型(STORYBOARD media 字段)只从这份合并清单里挑;schema 见 references/media-library.md。
//
// 用法:
//   node <SKILL_DIR>/scripts/media_lib.mjs list [--project .] [--json]
//     默认人读表格;--json 输出合并后的 {broll:[],stickers:[]}(含解析后绝对路径+来源)。
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const PROJ = resolve(opt("--project", "."));
const AS_JSON = args.includes("--json");

function loadManifest(dir, source, warns) {
  const mp = join(dir, "manifest.json");
  if (!existsSync(mp)) return [];
  let m;
  try { m = JSON.parse(readFileSync(mp, "utf8")); }
  catch (e) { warns.push(`${mp} 解析失败: ${e.message}`); return []; }
  const items = [];
  for (const it of m.items || []) {
    if (!it.id || !it.type || !it.path) { warns.push(`${mp}: 条目缺 id/type/path,跳过: ${JSON.stringify(it).slice(0, 80)}`); continue; }
    const abs = join(dir, it.path);
    if (!existsSync(abs)) { warns.push(`${mp}: ${it.id} 的文件不存在 (${it.path}),跳过`); continue; }
    items.push({ ...it, abs, source });
  }
  return items;
}

function merged(kind, warns) {
  const lib = loadManifest(join(SKILL, "assets", kind), "library", warns);
  const proj = loadManifest(join(PROJ, "assets", kind), "project", warns);
  const byId = new Map();
  for (const it of lib) byId.set(it.id, it);
  for (const it of proj) byId.set(it.id, it); // 项目层覆盖库层
  return [...byId.values()];
}

const cmd = args.find((a) => !a.startsWith("--") && a !== PROJ) || "list";
if (cmd !== "list") { console.error(`✗ 未知子命令 ${cmd}(只有 list)`); process.exit(1); }

const warns = [];
const out = { broll: merged("broll", warns), stickers: merged("stickers", warns) };

if (AS_JSON) {
  console.log(JSON.stringify(out, null, 2));
} else {
  for (const [kind, items] of Object.entries(out)) {
    console.log(`== ${kind}(${items.length})==`);
    for (const it of items)
      console.log(`  ${it.id}  [${it.type}${it.duration ? ` ${it.duration}s` : ""}] (${it.source})  tags: ${(it.tags || []).join("/")} — ${it.desc || ""}`);
    if (!items.length) console.log("  (空)");
  }
}
for (const w of warns) console.error("⚠ " + w);
