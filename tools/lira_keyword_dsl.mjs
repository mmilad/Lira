#!/usr/bin/env node
/**
 * Lira keyword→DSL parser / validator (Node, zero deps).
 *
 * Stages: line scan → statement parse → scope tree → matrix validate → IR
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
  "interface",
  "function",
  "method",
  "constructor",
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
const MEMBER_KINDS = new Set(["method", "property", "constructor"]);
const MODULE_ONLY_KINDS = new Set(["class", "function", "interface"]);
const CALLABLE_KINDS = new Set(["function", "method", "constructor"]);
const BODY_OWNER_SCOPES = new Set([
  "function",
  "method",
  "constructor",
  "if_then",
  "if_else",
  "for_body",
]);

const COMPARE_OPS = new Set(["==", "!=", "<=", ">=", "<", ">"]);
const ADD_OPS = new Set(["+", "-"]);
const MUL_OPS = new Set(["*", "/"]);

/** @type {Record<string, Record<string, "allowed" | "invalid" | "deferred">>} */
const MATRIX = {
  export: {
    module: "invalid",
    class: "allowed",
    interface: "allowed",
    function: "allowed",
    method: "invalid",
    constructor: "invalid",
    property: "invalid",
    variable: "allowed",
    constant: "allowed",
  },
  abstract: {
    module: "invalid",
    class: "allowed",
    interface: "invalid",
    function: "invalid",
    method: "allowed",
    constructor: "invalid",
    property: "invalid",
    variable: "invalid",
    constant: "invalid",
  },
  static: {
    module: "invalid",
    class: "invalid",
    interface: "invalid",
    function: "invalid",
    method: "allowed",
    constructor: "invalid",
    property: "allowed",
    variable: "deferred",
    constant: "deferred",
  },
  async: {
    module: "invalid",
    class: "invalid",
    interface: "invalid",
    function: "allowed",
    method: "allowed",
    constructor: "invalid",
    property: "invalid",
    variable: "invalid",
    constant: "invalid",
  },
  public: {
    module: "invalid",
    class: "invalid",
    interface: "invalid",
    function: "invalid",
    method: "allowed",
    constructor: "allowed",
    property: "allowed",
    variable: "invalid",
    constant: "invalid",
  },
  protected: {
    module: "invalid",
    class: "invalid",
    interface: "invalid",
    function: "invalid",
    method: "allowed",
    constructor: "allowed",
    property: "allowed",
    variable: "invalid",
    constant: "invalid",
  },
  private: {
    module: "invalid",
    class: "invalid",
    interface: "invalid",
    function: "invalid",
    method: "allowed",
    constructor: "allowed",
    property: "allowed",
    variable: "invalid",
    constant: "invalid",
  },
  readonly: {
    module: "invalid",
    class: "invalid",
    interface: "invalid",
    function: "invalid",
    method: "invalid",
    constructor: "invalid",
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

function makeId(prefix, name) {
  return `${prefix}_${String(name).replace(/[^\w]/g, "_")}`;
}

/* ---------------- expressions ---------------- */

function tokenizeExpr(input) {
  const src = input.trim();
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let value = "";
      while (j < src.length) {
        if (src[j] === "\\" && j + 1 < src.length) {
          value += src[j + 1];
          j += 2;
          continue;
        }
        if (src[j] === '"') break;
        value += src[j];
        j += 1;
      }
      if (j >= src.length) throw new Error("unterminated string");
      tokens.push({ type: "string", value });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "-" && /[0-9]/.test(src[i + 1] || ""))) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1;
      tokens.push({ type: "number", value: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if ("(),.[]".includes(ch)) {
      tokens.push({ type: ch });
      i += 1;
      continue;
    }
    if (ch === "=" || ch === "!" || ch === "<" || ch === ">") {
      const two = src.slice(i, i + 2);
      if (COMPARE_OPS.has(two)) {
        tokens.push({ type: "op", value: two });
        i += 2;
        continue;
      }
      if (ch === "<" || ch === ">") {
        tokens.push({ type: "op", value: ch });
        i += 1;
        continue;
      }
      throw new Error(`invalid operator near ${JSON.stringify(src.slice(i))}`);
    }
    if (ADD_OPS.has(ch) || MUL_OPS.has(ch)) {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z_0-9]/.test(src[j])) j += 1;
      const word = src.slice(i, j);
      if (word === "and" || word === "or" || word === "not") {
        tokens.push({ type: "op", value: word });
      } else if (word === "true" || word === "false") {
        tokens.push({ type: "boolean", value: word === "true" });
      } else if (word === "null") {
        tokens.push({ type: "null" });
      } else if (
        word === "construct" ||
        word === "call" ||
        word === "list" ||
        word === "map"
      ) {
        tokens.push({ type: "keyword", value: word });
      } else {
        tokens.push({ type: "id", value: word });
      }
      i = j;
      continue;
    }
    throw new Error(`unexpected character ${JSON.stringify(ch)} in expression`);
  }
  return tokens;
}

function parseExpression(input) {
  const tokens = tokenizeExpr(input);
  if (!tokens.length) throw new Error("empty expression");
  const parser = {
    tokens,
    i: 0,
    peek() {
      return this.tokens[this.i] || null;
    },
    take() {
      return this.tokens[this.i++] || null;
    },
    match(...types) {
      const t = this.peek();
      if (!t) return null;
      if (types.includes(t.type) || (t.type === "op" && types.includes(t.value))) {
        return this.take();
      }
      return null;
    },
  };
  const expr = parseOr(parser);
  if (parser.peek()) {
    throw new Error(`unexpected token in expression: ${JSON.stringify(parser.peek())}`);
  }
  return expr;
}

function parseOr(p) {
  let left = parseAnd(p);
  while (p.peek()?.type === "op" && p.peek().value === "or") {
    p.take();
    left = { kind: "binary", op: "or", left, right: parseAnd(p) };
  }
  return left;
}

function parseAnd(p) {
  let left = parseCompare(p);
  while (p.peek()?.type === "op" && p.peek().value === "and") {
    p.take();
    left = { kind: "binary", op: "and", left, right: parseCompare(p) };
  }
  return left;
}

function parseCompare(p) {
  let left = parseAdd(p);
  while (p.peek()?.type === "op" && COMPARE_OPS.has(p.peek().value)) {
    const op = p.take().value;
    left = { kind: "binary", op, left, right: parseAdd(p) };
  }
  return left;
}

function parseAdd(p) {
  let left = parseMul(p);
  while (p.peek()?.type === "op" && ADD_OPS.has(p.peek().value)) {
    const op = p.take().value;
    left = { kind: "binary", op, left, right: parseMul(p) };
  }
  return left;
}

function parseMul(p) {
  let left = parseUnary(p);
  while (p.peek()?.type === "op" && MUL_OPS.has(p.peek().value)) {
    const op = p.take().value;
    left = { kind: "binary", op, left, right: parseUnary(p) };
  }
  return left;
}

function parseUnary(p) {
  if (p.peek()?.type === "op" && p.peek().value === "not") {
    p.take();
    return { kind: "unary", op: "not", expr: parseUnary(p) };
  }
  if (p.peek()?.type === "op" && p.peek().value === "-") {
    p.take();
    return { kind: "unary", op: "-", expr: parseUnary(p) };
  }
  return parsePostfix(p);
}

function parseArgListFromTokens(p) {
  const args = [];
  if (p.peek()?.type === ")") return args;
  args.push(parseOr(p));
  while (p.match(",")) {
    args.push(parseOr(p));
  }
  return args;
}

function parseCalleeFromParts(parts) {
  if (!parts.length) throw new Error("empty callee");
  if (parts.length === 1) return { kind: "ref", name: parts[0] };
  return { kind: "member", parts };
}

/** Member names may reuse expression keywords (e.g. this.store.list). */
function takeMemberName(p) {
  const next = p.peek();
  if (!next) return null;
  if (next.type === "id") return p.take().value;
  if (next.type === "keyword") return p.take().value;
  return null;
}

function parsePostfix(p) {
  if (p.peek()?.type === "keyword" && p.peek().value === "construct") {
    p.take();
    const typeTok = p.take();
    if (!typeTok || typeTok.type !== "id") throw new Error("construct requires a type name");
    let args = [];
    if (p.match("(")) {
      args = parseArgListFromTokens(p);
      if (!p.match(")")) throw new Error("expected ) after construct args");
    }
    return { kind: "construct", type: typeTok.value, args };
  }

  if (p.peek()?.type === "keyword" && p.peek().value === "call") {
    p.take();
    return parseCallTail(p);
  }

  if (p.peek()?.type === "keyword" && p.peek().value === "list") {
    p.take();
    if (!p.match("(")) throw new Error("list literal requires ()");
    const elements = parseArgListFromTokens(p);
    if (!p.match(")")) throw new Error("expected ) after list elements");
    return { kind: "list", elements };
  }

  if (p.peek()?.type === "keyword" && p.peek().value === "map") {
    p.take();
    if (!p.match("(")) throw new Error("map literal requires ()");
    if (!p.match(")")) {
      throw new Error("map() only supports empty literals in v1; populate with set");
    }
    return { kind: "map", entries: [] };
  }

  let expr = parsePrimaryAtom(p);

  while (true) {
    if (p.peek()?.type === "(") {
      p.take();
      const args = parseArgListFromTokens(p);
      if (!p.match(")")) throw new Error("expected ) after call args");
      const callee =
        expr.kind === "ref"
          ? { kind: "ref", name: expr.name }
          : expr.kind === "member"
            ? { kind: "member", parts: expr.parts }
            : null;
      if (!callee) throw new Error("invalid call target");
      expr = { kind: "call", callee, args };
      continue;
    }
    if (p.peek()?.type === "[") {
      p.take();
      const index = parseOr(p);
      if (!p.match("]")) throw new Error("expected ] after index");
      expr = { kind: "index", target: expr, index };
      continue;
    }
    break;
  }
  return expr;
}

function parseCallTail(p) {
  const parts = [];
  const first = p.take();
  if (!first || (first.type !== "id" && first.type !== "keyword")) {
    throw new Error("call requires a callee");
  }
  parts.push(first.value);
  while (p.match(".")) {
    const name = takeMemberName(p);
    if (!name) throw new Error("invalid member in callee");
    parts.push(name);
  }
  let args = [];
  if (p.match("(")) {
    args = parseArgListFromTokens(p);
    if (!p.match(")")) throw new Error("expected ) after call args");
  }
  return { kind: "call", callee: parseCalleeFromParts(parts), args };
}

function parseCallExpr(src) {
  return parseExpression(`call ${src}`);
}

function parsePrimaryAtom(p) {
  const t = p.peek();
  if (!t) throw new Error("expected expression");
  if (t.type === "string") {
    p.take();
    return { kind: "literal", type: "string", value: t.value };
  }
  if (t.type === "number") {
    p.take();
    return { kind: "literal", type: "number", value: t.value };
  }
  if (t.type === "boolean") {
    p.take();
    return { kind: "literal", type: "boolean", value: t.value };
  }
  if (t.type === "null") {
    p.take();
    return { kind: "literal", type: "null", value: null };
  }
  if (t.type === "(") {
    p.take();
    const inner = parseOr(p);
    if (!p.match(")")) throw new Error("expected )");
    return inner;
  }
  if (t.type === "id") {
    p.take();
    const parts = [t.value];
    while (p.peek()?.type === ".") {
      p.take();
      const name = takeMemberName(p);
      if (!name) throw new Error("expected identifier after .");
      parts.push(name);
    }
    if (parts.length === 1) return { kind: "ref", name: parts[0] };
    return { kind: "member", parts };
  }
  throw new Error(`invalid expression atom: ${JSON.stringify(t)}`);
}

/* ---------------- types + headers ---------------- */

function splitTopLevel(text, sep) {
  const parts = [];
  let depthParen = 0;
  let depthBracket = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "(") depthParen += 1;
    else if (ch === ")") depthParen -= 1;
    else if (ch === "[") depthBracket += 1;
    else if (ch === "]") depthBracket -= 1;
    else if (ch === sep && depthParen === 0 && depthBracket === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter((p) => p.length);
}

function parseType(text) {
  const s = text.trim();
  if (!s) throw new Error("empty type");
  if (s.endsWith("?") && s.length > 1) {
    return { kind: "nullable", inner: parseType(s.slice(0, -1).trim()) };
  }
  if (s.startsWith("list[") && s.endsWith("]")) {
    return { kind: "list", element: parseType(s.slice(5, -1)) };
  }
  if (s.startsWith("map[") && s.endsWith("]")) {
    const inner = s.slice(4, -1);
    const parts = splitTopLevel(inner, ",");
    if (parts.length !== 2) {
      throw new Error(`map type requires key and value: ${JSON.stringify(s)}`);
    }
    return { kind: "map", key: parseType(parts[0]), value: parseType(parts[1]) };
  }
  if (/^[A-Za-z_][\w]*$/.test(s)) return s;
  throw new Error(`invalid type: ${JSON.stringify(s)}`);
}

function splitTrailingType(header) {
  let depthParen = 0;
  let depthBracket = 0;
  let colon = -1;
  for (let i = 0; i < header.length; i += 1) {
    const ch = header[i];
    if (ch === "(") depthParen += 1;
    else if (ch === ")") depthParen -= 1;
    else if (ch === "[") depthBracket += 1;
    else if (ch === "]") depthBracket -= 1;
    else if (ch === ":" && depthParen === 0 && depthBracket === 0) {
      colon = i;
      break;
    }
  }
  if (colon === -1) return { header, valueType: null };
  const left = header.slice(0, colon).trim();
  const right = header.slice(colon + 1).trim();
  if (!/(?:^|\s)[A-Za-z_][\w]*$/.test(left)) return { header, valueType: null };
  return { header: left, valueType: parseType(right) };
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

function splitParamsAndRest(text) {
  // returns { beforeParams, paramsText, afterParams } if (...) present at top level
  const open = text.indexOf("(");
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) {
        return {
          before: text.slice(0, open).trim(),
          paramsText: text.slice(open + 1, i).trim(),
          after: text.slice(i + 1).trim(),
        };
      }
    }
  }
  throw new Error("unclosed parameter list");
}

function parseParams(paramsText) {
  if (!paramsText) return [];
  return splitTopLevel(paramsText, ",").map((part) => {
    const colon = part.indexOf(":");
    if (colon === -1) throw new Error(`invalid parameter: ${JSON.stringify(part)}`);
    const name = part.slice(0, colon).trim();
    const typeText = part.slice(colon + 1).trim();
    if (!/^[A-Za-z_][\w]*$/.test(name)) {
      throw new Error(`invalid parameter name: ${JSON.stringify(name)}`);
    }
    return { name, type: parseType(typeText) };
  });
}

function parseDefineHeader(rest) {
  let working = rest.trim();
  let initExpr = null;
  const eq = working.indexOf("=");
  // only treat = as init when not inside quotes; simple scan
  if (eq !== -1) {
    let inStr = null;
    let depth = 0;
    for (let i = 0; i < working.length; i += 1) {
      const ch = working[i];
      if (inStr) {
        if (ch === "\\" && i + 1 < working.length) {
          i += 1;
          continue;
        }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inStr = ch;
        continue;
      }
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      else if (ch === "=" && depth === 0) {
        initExpr = parseExpression(working.slice(i + 1));
        working = working.slice(0, i).trim();
        break;
      }
    }
  }

  let params = [];
  let returnType = null;
  const split = splitParamsAndRest(working);
  let header = working;
  if (split) {
    header = split.before;
    params = parseParams(split.paramsText);
    if (split.after.startsWith("->")) {
      returnType = parseType(split.after.slice(2).trim());
    } else if (split.after) {
      throw new Error(`unexpected tokens after parameters: ${JSON.stringify(split.after)}`);
    }
  } else {
    const arrowAt = header.indexOf("->");
    if (arrowAt !== -1) {
      returnType = parseType(header.slice(arrowAt + 2).trim());
      header = header.slice(0, arrowAt).trim();
    }
  }

  const splitType = splitTrailingType(header);
  header = splitType.header;
  const valueType = splitType.valueType;

  const tokens = header.split(/\s+/).filter(Boolean);
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

  let name;
  if (kind === "constructor") {
    name = "constructor";
  } else {
    if (i >= tokens.length) throw new Error(`${kind} declaration is missing a name`);
    name = tokens[i++];
  }

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

  return {
    modifiers,
    kind,
    name,
    extendsName,
    implementsList,
    params,
    returnType,
    valueType,
    initExpr,
  };
}

function validateModifiers(kind, modifiers, scope, lineNo) {
  const issues = [];
  const row = MATRIX;
  for (const mod of [...modifiers].sort()) {
    const status = row[mod]?.[kind];
    if (!status) {
      issues.push(issue(`${mod} is not defined for ${kind}`, ["keyword-matrix-v0"], lineNo));
      continue;
    }
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
    if (VISIBILITY.has(mod) && scope !== "class" && scope !== "interface") {
      issues.push(
        issue("visibility modifiers are only valid on type members", ["D007"], lineNo),
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
  if (MEMBER_KINDS.has(kind) && scope !== "class" && scope !== "interface") {
    if (kind === "method") {
      issues.push(
        issue("define method is invalid at module scope; use define function", [
          "D009",
          "keyword-matrix-v0 scope validity",
        ], lineNo),
      );
    } else if (kind === "constructor") {
      issues.push(
        issue("define constructor is only valid inside a class", ["F6", "keyword-matrix-v0"], lineNo),
      );
    } else {
      issues.push(
        issue(`define ${kind} is only valid inside a class`, [
          "keyword-matrix-v0 scope validity",
        ], lineNo),
      );
    }
  }
  if (kind === "constructor" && scope === "interface") {
    issues.push(issue("constructor is invalid inside interface", ["F7"], lineNo));
  }
  return issues;
}

function findBodyOwner(stack) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const frame = stack[i];
    if (!BODY_OWNER_SCOPES.has(frame.scope)) continue;
    if (Array.isArray(frame.bodyRef)) return frame;
    if (Array.isArray(frame.node?.body)) {
      return { ...frame, bodyRef: frame.node.body };
    }
  }
  return null;
}

function findCallableFrame(stack) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (CALLABLE_KINDS.has(stack[i].scope)) return stack[i];
  }
  return null;
}

function attachNode(stack, body, node, indent, issues, lineNo) {
  const owner = stack.length ? stack[stack.length - 1].node : null;
  const ownerFrame = stack.length ? stack[stack.length - 1] : null;
  if (owner && Array.isArray(owner.members) && ownerFrame && indent > ownerFrame.indent) {
    owner.members.push(node);
    return;
  }
  if (indent !== 0 && !owner) {
    issues.push(issue("indented declaration without an owning type", ["D005"], lineNo));
  }
  const bodyOwner = findBodyOwner(stack);
  if (bodyOwner && indent > bodyOwner.indent && Array.isArray(bodyOwner.bodyRef)) {
    bodyOwner.bodyRef.push(node);
    if ((node.kind === "constant" || node.kind === "variable") && bodyOwner.bindings) {
      bodyOwner.bindings.set(node.name, node.kind);
    }
    const callable = findCallableFrame(stack);
    if (callable?.bindings && (node.kind === "constant" || node.kind === "variable")) {
      callable.bindings.set(node.name, node.kind);
    }
    return;
  }
  body.push(node);
}

function attachStatement(stack, body, stmt, indent, issues, lineNo) {
  const bodyOwner = findBodyOwner(stack);
  if (!bodyOwner || indent <= bodyOwner.indent || !Array.isArray(bodyOwner.bodyRef)) {
    const rule =
      stmt.op === "if"
        ? "F10"
        : stmt.op === "for"
          ? "F13"
          : stmt.op === "throw"
            ? "F15"
            : "F1";
    issues.push(
      issue(
        `${stmt.op} is only valid inside a function, method, constructor, or if body`,
        [rule],
        lineNo,
      ),
    );
    return;
  }
  if (stmt.op === "assign") {
    const callable = findCallableFrame(stack);
    const kind = callable?.bindings?.get(stmt.name);
    if (kind === "constant") {
      issues.push(
        issue("cannot assign to constant", ["F2", "D020"], lineNo),
      );
      return;
    }
  }
  bodyOwner.bodyRef.push(stmt);
}

/* ---------------- main review ---------------- */

function reviewSource(text) {
  const issues = [];
  let module = null;
  const body = [];
  /** @type {{indent: number, node: any, scope: string}[]} */
  const stack = [];
  const counters = { imp: 0, exp: 0, stmt: 0 };

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
    const isElse = line === "else";

    if (isElse) {
      while (stack.length && stack[stack.length - 1].indent > indent) stack.pop();
    } else {
      while (stack.length && indent <= stack[stack.length - 1].indent) stack.pop();
    }

    const scope = stack.length ? stack[stack.length - 1].scope : "module";
    const owner = stack.length ? stack[stack.length - 1].node : null;

    if (isElse) {
      const frame = stack.length ? stack[stack.length - 1] : null;
      if (!frame || frame.scope !== "if_then" || frame.indent !== indent) {
        issues.push(issue("else without matching if", ["F10"], idx));
        continue;
      }
      if (frame.node.else) {
        issues.push(issue("if already has an else branch", ["F10"], idx));
        continue;
      }
      frame.node.else = [];
      frame.scope = "if_else";
      frame.bodyRef = frame.node.else;
      continue;
    }

    if (line.startsWith("if ")) {
      let condition;
      try {
        condition = parseExpression(line.slice("if ".length));
      } catch (err) {
        issues.push(issue(err.message, ["F10", "F9"], idx));
        continue;
      }
      counters.stmt += 1;
      const ifNode = {
        id: `stmt_${counters.stmt}`,
        op: "if",
        condition,
        then: [],
        else: null,
      };
      attachStatement(stack, body, ifNode, indent, issues, idx);
      // Only push if attach succeeded (node present in some body)
      const bodyOwner = findBodyOwner(stack);
      if (bodyOwner && Array.isArray(bodyOwner.bodyRef) && bodyOwner.bodyRef.includes(ifNode)) {
        stack.push({
          indent,
          node: ifNode,
          scope: "if_then",
          bodyRef: ifNode.then,
        });
      }
      continue;
    }

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

    if (line.startsWith("return")) {
      if (line !== "return" && !line.startsWith("return ")) {
        issues.push(issue(`invalid return statement: ${line}`, ["F1"], idx));
        continue;
      }
      counters.stmt += 1;
      let value = null;
      if (line.startsWith("return ")) {
        try {
          value = parseExpression(line.slice("return ".length));
        } catch (err) {
          issues.push(issue(err.message, ["F3"], idx));
          continue;
        }
      }
      attachStatement(
        stack,
        body,
        { id: `stmt_${counters.stmt}`, op: "return", value },
        indent,
        issues,
        idx,
      );
      continue;
    }

    if (line.startsWith("throw")) {
      if (!line.startsWith("throw ")) {
        issues.push(issue(`invalid throw statement: ${line}`, ["F15"], idx));
        continue;
      }
      try {
        const value = parseExpression(line.slice("throw ".length));
        if (value.kind !== "literal" || value.type !== "string") {
          throw new Error("throw requires a string message in v1");
        }
        counters.stmt += 1;
        attachStatement(
          stack,
          body,
          { id: `stmt_${counters.stmt}`, op: "throw", value },
          indent,
          issues,
          idx,
        );
      } catch (err) {
        issues.push(issue(err.message, ["F15"], idx));
      }
      continue;
    }

    if (line.startsWith("assign ")) {
      const m = line.match(/^assign\s+([A-Za-z_][\w]*)\s*=\s*(.+)$/);
      if (!m) {
        issues.push(issue(`invalid assign syntax: ${line}`, ["F2"], idx));
        continue;
      }
      try {
        const value = parseExpression(m[2]);
        counters.stmt += 1;
        attachStatement(
          stack,
          body,
          { id: `stmt_${counters.stmt}`, op: "assign", name: m[1], value },
          indent,
          issues,
          idx,
        );
      } catch (err) {
        issues.push(issue(err.message, ["F2", "F3"], idx));
      }
      continue;
    }

    if (line.startsWith("set ")) {
      const rest = line.slice("set ".length);
      let eq = -1;
      let depthParen = 0;
      let depthBracket = 0;
      let inStr = null;
      for (let i = 0; i < rest.length; i += 1) {
        const ch = rest[i];
        if (inStr) {
          if (ch === "\\" && i + 1 < rest.length) {
            i += 1;
            continue;
          }
          if (ch === inStr) inStr = null;
          continue;
        }
        if (ch === '"' || ch === "'") {
          inStr = ch;
          continue;
        }
        if (ch === "(") depthParen += 1;
        else if (ch === ")") depthParen -= 1;
        else if (ch === "[") depthBracket += 1;
        else if (ch === "]") depthBracket -= 1;
        else if (ch === "=" && depthParen === 0 && depthBracket === 0) {
          eq = i;
          break;
        }
      }
      if (eq === -1) {
        issues.push(issue(`invalid set syntax: ${line}`, ["F6", "F12"], idx));
        continue;
      }
      try {
        const target = parseExpression(rest.slice(0, eq));
        if (
          target.kind !== "ref" &&
          target.kind !== "member" &&
          target.kind !== "index"
        ) {
          throw new Error("set target must be a name, member, or index");
        }
        const value = parseExpression(rest.slice(eq + 1));
        counters.stmt += 1;
        attachStatement(
          stack,
          body,
          {
            id: `stmt_${counters.stmt}`,
            op: "set",
            target,
            value,
          },
          indent,
          issues,
          idx,
        );
      } catch (err) {
        issues.push(issue(err.message, ["F6", "F12"], idx));
      }
      continue;
    }

    if (line.startsWith("for ")) {
      const m = line.match(/^for\s+([A-Za-z_][\w]*)\s+in\s+(.+)$/);
      if (!m) {
        issues.push(issue(`invalid for syntax: ${line}`, ["F13"], idx));
        continue;
      }
      try {
        const iterable = parseExpression(m[2]);
        counters.stmt += 1;
        const forNode = {
          id: `stmt_${counters.stmt}`,
          op: "for",
          name: m[1],
          iterable,
          body: [],
        };
        attachStatement(stack, body, forNode, indent, issues, idx);
        const bodyOwner = findBodyOwner(stack);
        if (bodyOwner && Array.isArray(bodyOwner.bodyRef) && bodyOwner.bodyRef.includes(forNode)) {
          stack.push({
            indent,
            node: forNode,
            scope: "for_body",
            bodyRef: forNode.body,
          });
        }
      } catch (err) {
        issues.push(issue(err.message, ["F13"], idx));
      }
      continue;
    }

    if (line.startsWith("call ")) {
      try {
        const expr = parseCallExpr(line.slice("call ".length).trim());
        counters.stmt += 1;
        attachStatement(
          stack,
          body,
          { id: `stmt_${counters.stmt}`, op: "call", callee: expr.callee, args: expr.args },
          indent,
          issues,
          idx,
        );
      } catch (err) {
        issues.push(issue(err.message, ["F4"], idx));
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

      const {
        modifiers,
        kind,
        name,
        extendsName,
        implementsList,
        params,
        returnType,
        valueType,
        initExpr,
      } = parsed;
      issues.push(...validateModifiers(kind, modifiers, scope, idx));

      if (kind === "method" && modifiers.has("abstract")) {
        if (scope === "interface") {
          // ok — interface methods are abstract-like
        } else if (!owner || owner.kind !== "class" || !owner.modifiers?.abstract) {
          issues.push(
            issue("abstract method requires an abstract class owner", [
              "keyword-matrix-v0 abstract method note",
            ], idx),
          );
        }
      }

      if (kind === "method" && scope === "interface" && !modifiers.has("abstract")) {
        // treat as abstract-like; body must be null
      }

      if (initExpr && kind !== "variable" && kind !== "constant" && kind !== "property") {
        issues.push(
          issue(`initializer is only valid on variable, constant, or property`, ["F2", "F5"], idx),
        );
      }

      if (
        valueType &&
        kind !== "property" &&
        kind !== "variable" &&
        kind !== "constant"
      ) {
        issues.push(
          issue(`value type annotation is only valid on property, variable, or constant`, ["F5"], idx),
        );
      }

      const node = {
        id: makeId("decl", name === "constructor" ? `${owner?.name || "x"}_constructor` : name),
        op: "define",
        kind,
        name,
        modifiers: Object.fromEntries([...modifiers].sort().map((m) => [m, true])),
      };

      if (kind === "class" || kind === "interface") {
        node.extends = extendsName;
        node.implements = implementsList;
        node.members = [];
      } else if (CALLABLE_KINDS.has(kind)) {
        node.params = params;
        if (returnType) node.returns = returnType;
        const abstractLike =
          modifiers.has("abstract") || (scope === "interface" && kind === "method");
        node.body = abstractLike ? null : [];
        if (scope === "interface" && kind === "method" && node.body !== null) {
          // force null
          node.body = null;
        }
      } else if (kind === "property") {
        if (returnType) {
          issues.push(issue("property cannot use -> return type; use `name: type`", ["F5"], idx));
        }
        if (params.length) {
          issues.push(issue("property cannot have parameters", ["F5"], idx));
        }
        if (valueType) node.type = valueType;
        if (initExpr) node.init = initExpr;
      } else if (kind === "variable" || kind === "constant") {
        if (valueType) node.type = valueType;
        if (initExpr) node.init = initExpr;
      }

      // interface method with body statements later will fail when attaching

      attachNode(stack, body, node, indent, issues, idx);

      if (kind === "class") stack.push({ indent, node, scope: "class" });
      else if (kind === "interface") stack.push({ indent, node, scope: "interface" });
      else if (CALLABLE_KINDS.has(kind) && node.body !== null) {
        stack.push({
          indent,
          node,
          scope: kind,
          bodyRef: node.body,
          bindings: new Map(),
        });
      }
      continue;
    }

    issues.push(issue(`unsupported keyword statement: ${line}`, ["keyword-dsl-v0"], idx));
  }

  if (!module) issues.push(issue("missing module header", ["keyword-dsl-v0"]));

  // post-validate: interface members must not have bodies; assign tracking is emit-time soft
  function walk(nodes, inInterface = false) {
    for (const n of nodes || []) {
      if (n.op === "define" && n.kind === "interface") {
        for (const m of n.members || []) {
          if (m.kind === "method" && m.body !== null && m.body !== undefined) {
            issues.push(
              issue("interface methods must not have bodies", ["F7"], null),
            );
          }
          if (m.kind === "constructor") {
            issues.push(issue("constructor is invalid inside interface", ["F7"], null));
          }
        }
        walk(n.members, true);
      } else if (n.op === "define" && (n.kind === "class" || n.kind === "interface")) {
        walk(n.members, n.kind === "interface");
      } else if (n.op === "define" && Array.isArray(n.body)) {
        walk(n.body, inInterface);
      }
    }
  }
  walk(body);

  if (issues.length) {
    return {
      legal: false,
      issues,
      toDict: () => ({ legal: false, issues: issues.map((i) => i.toDict()) }),
    };
  }
  return { legal: true, ir: { module, body }, issues: [], toDict: () => ({ legal: true, ir: { module, body } }) };
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
  console.log(`Lira keyword→DSL checker

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

export { reviewSource, normalizeIr, parseExpression };

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  process.exitCode = main(process.argv.slice(2));
}
