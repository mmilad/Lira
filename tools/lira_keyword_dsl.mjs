#!/usr/bin/env node
/**
 * Reusable Lira v0 keyword→DSL checker (Node, zero deps).
 *
 * Usage:
 *   node tools/lira_keyword_dsl.mjs review path/to/file.lira
 *   node tools/lira_keyword_dsl.mjs check [examples/v0]
 *   node tools/lira_keyword_dsl.mjs ir path/to/file.lira
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KINDS = new Set([
  "class",
  "function",
  "method",
  "property",
  "variable",
  "constant",
]);
const MODIFIERS = new Set([
  "export",
  "abstract",
  "static",
  "async",
  "public",
  "protected",
  "private",
  "readonly",
]);
const VISIBILITY = new Set(["public", "protected", "private"]);
const MEMBER_KINDS = new Set(["method", "property"]);
const MODULE_ONLY_KINDS = new Set(["class", "function"]);

/** @type {Record<string, Record<string, "allowed" | "invalid" | "deferred">>} */
const MATRIX = {
  export: {
    module: "invalid",
    class: "allowed",
    function: "allowed",
    method: "invalid",
    property: "invalid",
    variable: "allowed",
    constant: "allowed",
  },
  abstract: {
    module: "invalid",
    class: "allowed",
    function: "invalid",
    method: "allowed",
    property: "invalid",
    variable: "invalid",
    constant: "invalid",
  },
  static: {
    module: "invalid",
    class: "invalid",
    function: "invalid",
    method: "allowed",
    property: "allowed",
    variable: "deferred",
    constant: "deferred",
  },
  async: {
    module: "invalid",
    class: "invalid",
    function: "allowed",
    method: "allowed",
    property: "invalid",
    variable: "invalid",
    constant: "invalid",
  },
  public: {
    module: "invalid",
    class: "invalid",
    function: "invalid",
    method: "allowed",
    property: "allowed",
    variable: "invalid",
    constant: "invalid",
  },
  protected: {
    module: "invalid",
    class: "invalid",
    function: "invalid",
    method: "allowed",
    property: "allowed",
    variable: "invalid",
    constant: "invalid",
  },
  private: {
    module: "invalid",
    class: "invalid",
    function: "invalid",
    method: "allowed",
    property: "allowed",
    variable: "invalid",
    constant: "invalid",
  },
  readonly: {
    module: "invalid",
    class: "invalid",
    function: "invalid",
    method: "invalid",
    property: "allowed",
    variable: "allowed",
    constant: "invalid",
  },
};

function issue(message, rules = [], line = null) {
  const out = { legal: false, error: message, rules };
  if (line != null) out.line = line;
  return { message, rules, line, toDict: () => out };
}

function indentWidth(line) {
  return line.length - line.replace(/^ */, "").length;
}

function parseImportItems(chunk) {
  const items = [];
  for (const raw of chunk.split(",")) {
    const part = raw.trim();
    if (!part) continue;
    let m = part.match(/^([A-Za-z_][\w]*)\s+as\s+([A-Za-z_][\w]*)$/);
    if (m) {
      items.push({ name: m[1], alias: m[2] });
      continue;
    }
    m = part.match(/^([A-Za-z_][\w]*)$/);
    if (m) {
      items.push({ name: m[1], alias: null });
      continue;
    }
    throw new Error(`invalid import item: ${JSON.stringify(part)}`);
  }
  return items;
}

function parseDefineHeader(rest) {
  const tokens = rest.split(/\s+/).filter(Boolean);
  if (!tokens.length) throw new Error("empty define");

  const modifiers = new Set();
  let i = 0;
  while (i < tokens.length && MODIFIERS.has(tokens[i])) {
    modifiers.add(tokens[i]);
    i += 1;
  }

  if (i >= tokens.length || !KINDS.has(tokens[i])) {
    throw new Error(
      `declaration kind missing or kind-before-name violated (saw ${JSON.stringify(tokens.slice(i))})`,
    );
  }
  const kind = tokens[i++];
  if (i >= tokens.length) throw new Error(`${kind} declaration is missing a name`);
  const name = tokens[i++];

  let extendsName = null;
  let implementsList = [];
  while (i < tokens.length) {
    if (tokens[i] === "extends") {
      i += 1;
      if (i >= tokens.length) throw new Error("extends requires a type name");
      extendsName = tokens[i++];
      continue;
    }
    if (tokens[i] === "implements") {
      i += 1;
      if (i >= tokens.length) throw new Error("implements requires at least one type name");
      implementsList = tokens
        .slice(i)
        .join(" ")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      i = tokens.length;
      continue;
    }
    throw new Error(`unexpected token in define header: ${JSON.stringify(tokens[i])}`);
  }

  return { modifiers, kind, name, extendsName, implementsList };
}

function validateModifiers(kind, modifiers, scope, lineNo) {
  const issues = [];
  for (const mod of [...modifiers].sort()) {
    const status = MATRIX[mod][kind];
    if (status === "invalid") {
      issues.push(issue(`${mod} is invalid on ${kind}`, [`keyword-matrix-v0 ${mod}/${kind}`], lineNo));
    } else if (status === "deferred") {
      issues.push(
        issue(`${mod} on ${kind} is deferred in v0 and must be rejected`, [
          `keyword-matrix-v0 ${mod}/${kind}`,
          "D010",
        ], lineNo),
      );
    }
    if (mod === "export" && scope !== "module") {
      issues.push(issue("export is only valid at module/exportable scope", ["D006"], lineNo));
    }
    if (VISIBILITY.has(mod) && scope !== "class") {
      issues.push(
        issue("visibility modifiers are only valid on class members", ["D007"], lineNo),
      );
    }
  }

  if (MODULE_ONLY_KINDS.has(kind) && scope !== "module") {
    issues.push(
      issue(`define ${kind} is only valid at module scope in v0`, [
        "keyword-matrix-v0 scope validity",
      ], lineNo),
    );
  }
  if (MEMBER_KINDS.has(kind) && scope !== "class") {
    if (kind === "method") {
      issues.push(
        issue("define method is invalid at module scope; use define function", [
          "D009",
          "keyword-matrix-v0 scope validity",
        ], lineNo),
      );
    } else {
      issues.push(
        issue(`define ${kind} is only valid inside a class`, [
          "keyword-matrix-v0 scope validity",
        ], lineNo),
      );
    }
  }
  return issues;
}

function makeId(prefix, name) {
  return `${prefix}_${name.replace(/[^\w]/g, "_")}`;
}

function reviewSource(text) {
  const issues = [];
  let module = null;
  const body = [];
  /** @type {{indent: number, node: any, scope: string}[]} */
  const stack = [];
  const counters = { imp: 0, exp: 0 };

  const lines = text.split(/\r?\n/);
  for (let idx = 1; idx <= lines.length; idx += 1) {
    const raw = lines[idx - 1];
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (raw.includes("\t")) {
      issues.push(issue("tabs are not allowed; use spaces", ["D005"], idx));
      continue;
    }

    const indent = indentWidth(raw);
    const line = raw.trim();
    while (stack.length && indent <= stack[stack.length - 1].indent) stack.pop();

    const scope = stack.length ? stack[stack.length - 1].scope : "module";
    const owner = stack.length ? stack[stack.length - 1].node : null;

    if (line.startsWith("module ")) {
      if (indent !== 0) {
        issues.push(issue("module header must be at top level", ["keyword-dsl-v0"], idx));
      }
      const name = line.slice("module ".length).trim();
      if (!/^[A-Za-z_][\w]*$/.test(name)) {
        issues.push(issue(`invalid module name: ${JSON.stringify(name)}`, ["keyword-dsl-v0"], idx));
        continue;
      }
      if (module) {
        issues.push(issue("only one module header allowed in v0", ["keyword-dsl-v0"], idx));
        continue;
      }
      module = { id: makeId("mod", name), op: "module", name };
      continue;
    }

    if (line.startsWith("import ")) {
      if (indent !== 0) {
        issues.push(issue("import must be at module scope", ["keyword-dsl-v0"], idx));
      }

      let m = line.match(/^import\s+all\s+from\s+"([^"]+)"\s+as\s+([A-Za-z_][\w]*)$/);
      if (m) {
        counters.imp += 1;
        body.push({
          id: `imp_${counters.imp}`,
          op: "import",
          source: m[1],
          style: "namespace",
          alias: m[2],
        });
        continue;
      }

      m = line.match(/^import\s+default\s+from\s+"([^"]+)"(?:\s+as\s+[A-Za-z_][\w]*)?$/);
      if (m) {
        issues.push(
          issue("default import is deferred in v0 and must be rejected", [
            "D013",
            "keyword-matrix-v0 import default",
          ], idx),
        );
        continue;
      }

      m = line.match(/^import\s+(.+?)\s+from\s+"([^"]+)"$/);
      if (!m) {
        issues.push(issue(`invalid import syntax: ${line}`, ["keyword-dsl-v0"], idx));
        continue;
      }
      const head = m[1].trim();
      const source = m[2];
      if (head === "all") {
        issues.push(
          issue('namespace import requires: import all from "src" as Name', [
            "keyword-matrix-v0 import all",
          ], idx),
        );
        continue;
      }
      try {
        const items = parseImportItems(head);
        counters.imp += 1;
        body.push({
          id: `imp_${counters.imp}`,
          op: "import",
          source,
          style: "named",
          items,
        });
      } catch (err) {
        issues.push(issue(err.message, ["D008"], idx));
      }
      continue;
    }

    if (line.startsWith("export ")) {
      if (indent !== 0) {
        issues.push(issue("export operation must be at module scope", ["D006"], idx));
      }
      const rest = line.slice("export ".length).trim();
      if (rest.startsWith("default")) {
        issues.push(
          issue("default export is deferred in v0 and must be rejected", ["D013"], idx),
        );
        continue;
      }
      if (rest.includes(" from ")) {
        issues.push(
          issue('export Name from "src" is deferred in v0', [
            "D013",
            "keyword-matrix-v0 export from",
          ], idx),
        );
        continue;
      }
      try {
        const items = parseImportItems(rest);
        counters.exp += 1;
        body.push({ id: `exp_${counters.exp}`, op: "export", items });
      } catch (err) {
        issues.push(issue(err.message, ["D008"], idx));
      }
      continue;
    }

    if (line.startsWith("define ")) {
      const rest = line.slice("define ".length).trim();
      let parsed;
      try {
        parsed = parseDefineHeader(rest);
      } catch (err) {
        let msg = err.message;
        let rules =
          msg.includes("kind") || msg.includes("missing a name")
            ? ["D004"]
            : ["keyword-dsl-v0"];
        if (/\bmethod\b/.test(rest) && !/\bmethod\s+[A-Za-z_]/.test(rest) && rest.split(/\s+/).includes("export")) {
          rules = ["D004", "D006"];
          msg =
            "declaration is incomplete: export is a modifier and method name is missing; also export is invalid on method";
        }
        issues.push(issue(msg, rules, idx));
        continue;
      }

      const { modifiers, kind, name, extendsName, implementsList } = parsed;
      issues.push(...validateModifiers(kind, modifiers, scope, idx));

      if (kind === "method" && modifiers.has("abstract")) {
        if (!owner || owner.kind !== "class" || !owner.modifiers?.abstract) {
          issues.push(
            issue("abstract method requires an abstract class owner", [
              "keyword-matrix-v0 abstract method note",
            ], idx),
          );
        }
      }

      const node = {
        id: makeId("decl", name),
        op: "define",
        kind,
        name,
        modifiers: Object.fromEntries([...modifiers].sort().map((m) => [m, true])),
      };
      if (kind === "class") {
        node.extends = extendsName;
        node.implements = implementsList;
        node.members = [];
      } else if (kind === "function" || kind === "method") {
        node.params = [];
        node.body = modifiers.has("abstract") ? null : [];
      }

      if (owner && Array.isArray(owner.members) && indent > stack[stack.length - 1].indent) {
        owner.members.push(node);
      } else {
        if (indent !== 0 && !owner) {
          issues.push(issue("indented declaration without an owning class", ["D005"], idx));
        }
        body.push(node);
      }

      if (kind === "class") stack.push({ indent, node, scope: "class" });
      continue;
    }

    issues.push(issue(`unsupported v0 keyword statement: ${line}`, ["keyword-dsl-v0"], idx));
  }

  if (!module) issues.push(issue("missing module header", ["keyword-dsl-v0"]));

  if (issues.length) {
    return {
      legal: false,
      issues,
      toDict: () => ({ legal: false, issues: issues.map((i) => i.toDict()) }),
    };
  }
  const ir = { module, body };
  return { legal: true, ir, issues: [], toDict: () => ({ legal: true, ir }) };
}

function normalizeIr(node) {
  if (Array.isArray(node)) return node.map(normalizeIr);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "modifiers" && v && typeof v === "object") {
        out[k] = Object.fromEntries(
          Object.entries(v)
            .filter(([, mv]) => mv)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([mk]) => [mk, true]),
        );
      } else {
        out[k] = normalizeIr(v);
      }
    }
    return out;
  }
  return node;
}

function readCaseLegalFlag(caseMdPath) {
  const text = fs.readFileSync(caseMdPath, "utf8");
  const m = text.match(/\*\*legal\*\*:\s*(yes|no)/i);
  if (!m) return null;
  return m[1].toLowerCase() === "yes";
}

function iterCases(root) {
  /** @type {string[]} */
  const out = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name === "case.md") out.push(path.dirname(full));
    }
  }
  walk(root);
  return out.sort();
}

function checkCorpus(root) {
  const cases = iterCases(root);
  if (!cases.length) {
    console.error(`no cases found under ${root}`);
    return 1;
  }

  let failures = 0;
  for (const caseDir of cases) {
    const rel = path.relative(root, caseDir);
    const source = path.join(caseDir, "source.lira");
    const caseMd = path.join(caseDir, "case.md");
    if (!fs.existsSync(source)) {
      console.log(`FAIL ${rel}: missing source.lira`);
      failures += 1;
      continue;
    }
    const expectedLegal = readCaseLegalFlag(caseMd);
    const result = reviewSource(fs.readFileSync(source, "utf8"));

    if (expectedLegal == null) {
      console.log(`FAIL ${rel}: case.md missing legal yes/no`);
      failures += 1;
      continue;
    }
    if (expectedLegal && !result.legal) {
      console.log(`FAIL ${rel}: expected legal, got errors:`);
      for (const i of result.issues) console.log(`  - line ${i.line}: ${i.message}`);
      failures += 1;
      continue;
    }
    if (!expectedLegal && result.legal) {
      console.log(`FAIL ${rel}: expected illegal, but accepted`);
      failures += 1;
      continue;
    }

    if (expectedLegal) {
      const expectedPath = path.join(caseDir, "expected.ir.json");
      if (!fs.existsSync(expectedPath)) {
        console.log(`FAIL ${rel}: missing expected.ir.json`);
        failures += 1;
        continue;
      }
      const expectedIr = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
      if (JSON.stringify(normalizeIr(result.ir)) !== JSON.stringify(normalizeIr(expectedIr))) {
        console.log(`FAIL ${rel}: IR mismatch`);
        console.log(`  got:      ${JSON.stringify(normalizeIr(result.ir))}`);
        console.log(`  expected: ${JSON.stringify(normalizeIr(expectedIr))}`);
        failures += 1;
        continue;
      }
    } else {
      const errPath = path.join(caseDir, "expected.error.json");
      if (!fs.existsSync(errPath)) {
        console.log(`FAIL ${rel}: missing expected.error.json`);
        failures += 1;
        continue;
      }
      const expectedErr = JSON.parse(fs.readFileSync(errPath, "utf8"));
      const expectedRules = new Set(expectedErr.rules || []);
      const gotRules = new Set(result.issues.flatMap((i) => i.rules));
      if (expectedRules.size && [...expectedRules].every((r) => !gotRules.has(r))) {
        console.log(`FAIL ${rel}: no overlapping rules`);
        console.log(`  got rules: ${[...gotRules].sort()}`);
        console.log(`  expected some of: ${[...expectedRules].sort()}`);
        failures += 1;
        continue;
      }
    }

    console.log(`ok   ${rel}`);
  }

  const total = cases.length;
  console.log(`\n${total - failures}/${total} passed`);
  return failures ? 1 : 0;
}

function printHelp() {
  console.log(`Lira v0 keyword→DSL checker

Usage:
  node tools/lira_keyword_dsl.mjs review <file.lira>
  node tools/lira_keyword_dsl.mjs check [examples/v0]
  node tools/lira_keyword_dsl.mjs ir <file.lira>`);
}

function main(argv) {
  const [command, ...rest] = argv;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repo = path.resolve(here, "..");

  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return command ? 0 : 2;
  }

  if (command === "review") {
    const file = rest[0];
    if (!file) {
      console.error("review requires a .lira path");
      return 2;
    }
    const result = reviewSource(fs.readFileSync(file, "utf8"));
    console.log(JSON.stringify(result.toDict(), null, 2));
    return result.legal ? 0 : 1;
  }

  if (command === "ir") {
    const file = rest[0];
    if (!file) {
      console.error("ir requires a .lira path");
      return 2;
    }
    const result = reviewSource(fs.readFileSync(file, "utf8"));
    if (!result.legal) {
      console.error(JSON.stringify(result.toDict(), null, 2));
      return 1;
    }
    console.log(JSON.stringify(result.ir, null, 2));
    return 0;
  }

  if (command === "check") {
    const root = path.resolve(rest[0] || path.join(repo, "examples", "v0"));
    return checkCorpus(root);
  }

  console.error(`unknown command: ${command}`);
  printHelp();
  return 2;
}

export { reviewSource, normalizeIr };

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  process.exitCode = main(process.argv.slice(2));
}
