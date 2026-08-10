#!/usr/bin/env node
/**
 * Idempotent Lira test pipeline.
 *
 *   test/lira_scripts/<scope>/<rel>.lira
 *     scope: shared | ts | py | …
 *     -> test/lira_dsl/<rel>.json
 *     -> test/lira_output/<target>/<rel><ext>
 *
 *   shared → every target; ts/py → that target only.
 *   Goldens strip the scope segment (flat paths).
 *
 * Usage:
 *   node tools/lira_pipeline.mjs generate   # write committed goldens
 *   node tools/lira_pipeline.mjs test       # regenerate in memory and diff
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reviewSource, normalizeIr } from "./lira_keyword_dsl.mjs";
import { TARGETS } from "./emitters.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const SCRIPTS = path.join(repo, "test", "lira_scripts");
const DSL = path.join(repo, "test", "lira_dsl");
const OUTPUT = path.join(repo, "test", "lira_output");

const SCOPES = new Set(["shared", ...TARGETS.map((t) => t.namespace)]);

function walkLiraFiles(root) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(root)) return out;
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith(".lira")) out.push(full);
    }
  }
  walk(root);
  return out.sort();
}

function scriptPath(file) {
  const rel = path.relative(SCRIPTS, file).replace(/\\/g, "/");
  return rel.replace(/\.lira$/i, "");
}

function resolveScript(file) {
  const full = scriptPath(file);
  const slash = full.indexOf("/");
  if (slash <= 0) {
    throw new Error(
      `${full}: scripts must live under a scope folder (shared|${TARGETS.map((t) => t.namespace).join("|")})`,
    );
  }
  const scope = full.slice(0, slash);
  const name = full.slice(slash + 1);
  if (!SCOPES.has(scope)) {
    throw new Error(
      `${full}: unknown scope ${JSON.stringify(scope)} (expected shared|${[...SCOPES].filter((s) => s !== "shared").join("|")})`,
    );
  }
  if (!name) {
    throw new Error(`${full}: empty path after scope`);
  }
  return { scope, name, label: full };
}

function emitTargetsForScope(scope) {
  if (scope === "shared") return TARGETS;
  const hit = TARGETS.filter((t) => t.namespace === scope);
  if (!hit.length) {
    throw new Error(`no emitter for scope ${JSON.stringify(scope)}`);
  }
  return hit;
}

function assertUniqueRels(files) {
  /** @type {Map<string, string>} */
  const seen = new Map();
  for (const file of files) {
    const { name, label } = resolveScript(file);
    const prev = seen.get(name);
    if (prev) {
      throw new Error(`path collision for ${JSON.stringify(name)}: ${prev} vs ${label}`);
    }
    seen.set(name, label);
  }
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function buildArtifacts(file) {
  const { scope, name, label } = resolveScript(file);
  const source = fs.readFileSync(file, "utf8");
  const result = reviewSource(source);
  if (!result.legal) {
    const details = result.issues
      .map((i) => `  line ${i.line}: ${i.message}`)
      .join("\n");
    throw new Error(`${label}: illegal Lira\n${details}`);
  }
  const ir = normalizeIr(result.ir);
  const dslJson = stableJson(ir);
  const targets = emitTargetsForScope(scope);
  /** @type {{ target: string, relPath: string, content: string }[]} */
  const outputs = targets.map((t) => ({
    target: t.namespace,
    relPath: `${name}${t.extension}`,
    content: t.emit(ir),
  }));
  return { name, label, dslJson, outputs };
}

function generate() {
  const files = walkLiraFiles(SCRIPTS);
  if (!files.length) {
    console.error(`no .lira files under ${SCRIPTS}`);
    return 1;
  }
  try {
    assertUniqueRels(files);
  } catch (err) {
    console.error(err.message);
    return 1;
  }
  for (const file of files) {
    const { name, dslJson, outputs } = buildArtifacts(file);
    const dslPath = path.join(DSL, `${name}.json`);
    ensureDir(dslPath);
    fs.writeFileSync(dslPath, dslJson, "utf8");
    console.log(`dsl  ${path.relative(repo, dslPath)}`);
    for (const out of outputs) {
      const outPath = path.join(OUTPUT, out.target, out.relPath);
      ensureDir(outPath);
      fs.writeFileSync(outPath, out.content, "utf8");
      console.log(`out  ${path.relative(repo, outPath)}`);
    }
  }
  console.log(`\ngenerated ${files.length} script(s)`);
  return 0;
}

function test() {
  const files = walkLiraFiles(SCRIPTS);
  if (!files.length) {
    console.error(`no .lira files under ${SCRIPTS}`);
    return 1;
  }
  try {
    assertUniqueRels(files);
  } catch (err) {
    console.log(`FAIL collision: ${err.message}`);
    return 1;
  }
  let failures = 0;
  for (const file of files) {
    let artifacts;
    try {
      artifacts = buildArtifacts(file);
    } catch (err) {
      console.log(`FAIL ${scriptPath(file)}: ${err.message}`);
      failures += 1;
      continue;
    }
    const { name, dslJson, outputs } = artifacts;
    const dslPath = path.join(DSL, `${name}.json`);
    if (!fs.existsSync(dslPath)) {
      console.log(`FAIL ${name}: missing committed dsl (run npm run generate)`);
      failures += 1;
      continue;
    }
    const committedDsl = fs.readFileSync(dslPath, "utf8");
    if (committedDsl !== dslJson) {
      console.log(`FAIL ${name}: lira_dsl mismatch`);
      failures += 1;
    } else {
      console.log(`ok   dsl/${name}.json`);
    }
    for (const out of outputs) {
      const outPath = path.join(OUTPUT, out.target, out.relPath);
      const label = `${out.target}/${out.relPath}`;
      if (!fs.existsSync(outPath)) {
        console.log(`FAIL ${name}: missing ${label} (run npm run generate)`);
        failures += 1;
        continue;
      }
      const committed = fs.readFileSync(outPath, "utf8");
      if (committed !== out.content) {
        console.log(`FAIL ${name}: output mismatch ${label}`);
        failures += 1;
      } else {
        console.log(`ok   ${label}`);
      }
    }
  }
  const total = files.length;
  console.log(`\n${total} script(s), ${failures} failure(s)`);
  return failures ? 1 : 0;
}

function printHelp() {
  console.log(`Lira test pipeline

Usage:
  node tools/lira_pipeline.mjs generate
  node tools/lira_pipeline.mjs test`);
}

function main(argv) {
  const [command] = argv;
  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return command ? 0 : 2;
  }
  if (command === "generate") return generate();
  if (command === "test") return test();
  console.error(`unknown command: ${command}`);
  printHelp();
  return 2;
}

process.exitCode = main(process.argv.slice(2));
