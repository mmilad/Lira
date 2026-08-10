/**
 * Deterministic IR → source emitters for the test pipeline.
 */

function mod(node, name) {
  return Boolean(node.modifiers && node.modifiers[name]);
}

function emitTsType(t) {
  if (!t) return "void";
  if (t === "string" || t === "number" || t === "boolean") return t;
  if (t === "null") return "null";
  return t;
}

function emitPyType(t) {
  if (!t || t === "null") return "None";
  if (t === "string") return "str";
  if (t === "number") return "float";
  if (t === "boolean") return "bool";
  return t;
}

function emitTsBinaryOp(op) {
  if (op === "and") return "&&";
  if (op === "or") return "||";
  return op;
}

function emitTsExpr(expr) {
  if (!expr) return "undefined";
  switch (expr.kind) {
    case "literal":
      if (expr.type === "string") return JSON.stringify(expr.value);
      if (expr.type === "null") return "null";
      return String(expr.value);
    case "ref":
      return expr.name;
    case "member":
      return expr.parts.join(".");
    case "unary":
      if (expr.op === "not") return `!(${emitTsExpr(expr.expr)})`;
      return `${expr.op}(${emitTsExpr(expr.expr)})`;
    case "binary":
      return `(${emitTsExpr(expr.left)} ${emitTsBinaryOp(expr.op)} ${emitTsExpr(expr.right)})`;
    case "call": {
      const callee =
        expr.callee.kind === "member"
          ? expr.callee.parts.join(".")
          : expr.callee.name;
      const args = (expr.args || []).map(emitTsExpr).join(", ");
      return `${callee}(${args})`;
    }
    case "construct": {
      const args = (expr.args || []).map(emitTsExpr).join(", ");
      return `new ${expr.type}(${args})`;
    }
    default:
      return `/* expr:${expr.kind} */`;
  }
}

function emitPyExpr(expr) {
  if (!expr) return "None";
  switch (expr.kind) {
    case "literal":
      if (expr.type === "string") return JSON.stringify(expr.value);
      if (expr.type === "null") return "None";
      if (expr.type === "boolean") return expr.value ? "True" : "False";
      return String(expr.value);
    case "ref":
      return expr.name === "this" ? "self" : expr.name;
    case "member": {
      const parts = expr.parts.map((p) => (p === "this" ? "self" : p));
      return parts.join(".");
    }
    case "unary":
      if (expr.op === "not") return `(not ${emitPyExpr(expr.expr)})`;
      return `(${expr.op}${emitPyExpr(expr.expr)})`;
    case "binary":
      return `(${emitPyExpr(expr.left)} ${expr.op} ${emitPyExpr(expr.right)})`;
    case "call": {
      let callee;
      if (expr.callee.kind === "member") {
        callee = expr.callee.parts.map((p) => (p === "this" ? "self" : p)).join(".");
      } else {
        callee = expr.callee.name === "this" ? "self" : expr.callee.name;
      }
      const args = (expr.args || []).map(emitPyExpr).join(", ");
      return `${callee}(${args})`;
    }
    case "construct": {
      const args = (expr.args || []).map(emitPyExpr).join(", ");
      return `${expr.type}(${args})`;
    }
    default:
      return `None  # expr:${expr.kind}`;
  }
}

function emitTsParams(params) {
  return (params || [])
    .map((p) => `${p.name}: ${emitTsType(p.type)}`)
    .join(", ");
}

function emitPyParams(params, { staticMethod = false, isCtor = false } = {}) {
  const ps = (params || []).map((p) => `${p.name}: ${emitPyType(p.type)}`);
  if (staticMethod) return ps.join(", ");
  return ["self", ...ps].join(", ");
}

function emitTsStmt(stmt, indent) {
  const pad = "  ".repeat(indent);
  if (stmt.op === "return") {
    if (stmt.value == null) return `${pad}return;`;
    return `${pad}return ${emitTsExpr(stmt.value)};`;
  }
  if (stmt.op === "assign") {
    return `${pad}${stmt.name} = ${emitTsExpr(stmt.value)};`;
  }
  if (stmt.op === "set") {
    return `${pad}${stmt.target.parts.join(".")} = ${emitTsExpr(stmt.value)};`;
  }
  if (stmt.op === "call") {
    return `${pad}${emitTsExpr({ kind: "call", callee: stmt.callee, args: stmt.args })};`;
  }
  if (stmt.op === "if") {
    const thenBody = emitTsBody(stmt.then, indent + 1);
    let out = `${pad}if (${emitTsExpr(stmt.condition)}) {\n${thenBody}${pad}}`;
    if (stmt.else) {
      const elseBody = emitTsBody(stmt.else, indent + 1);
      out += ` else {\n${elseBody}${pad}}`;
    }
    return out;
  }
  if (stmt.op === "define") {
    return emitTsNestedDefine(stmt, indent);
  }
  return `${pad}/* unsupported stmt ${stmt.op} */`;
}

function emitPyStmt(stmt, indent) {
  const pad = "    ".repeat(indent);
  if (stmt.op === "return") {
    if (stmt.value == null) return `${pad}return`;
    return `${pad}return ${emitPyExpr(stmt.value)}`;
  }
  if (stmt.op === "assign") {
    return `${pad}${stmt.name} = ${emitPyExpr(stmt.value)}`;
  }
  if (stmt.op === "set") {
    const target = stmt.target.parts.map((p) => (p === "this" ? "self" : p)).join(".");
    return `${pad}${target} = ${emitPyExpr(stmt.value)}`;
  }
  if (stmt.op === "call") {
    return `${pad}${emitPyExpr({ kind: "call", callee: stmt.callee, args: stmt.args })}`;
  }
  if (stmt.op === "if") {
    const thenBody = emitPyBody(stmt.then, indent + 1);
    let out = `${pad}if ${emitPyExpr(stmt.condition)}:\n${thenBody}`;
    if (stmt.else) {
      const elseBody = emitPyBody(stmt.else, indent + 1);
      out += `${pad}else:\n${elseBody}`;
    }
    return out.replace(/\n$/, "");
  }
  if (stmt.op === "define") {
    return emitPyNestedDefine(stmt, indent);
  }
  return `${pad}# unsupported stmt ${stmt.op}`;
}

function emitTsBody(body, indent) {
  if (!body || !body.length) return `${"  ".repeat(indent)}\n`;
  return body.map((s) => emitTsStmt(s, indent)).join("\n") + "\n";
}

function emitPyBody(body, indent) {
  if (!body || !body.length) return `${"    ".repeat(indent)}pass\n`;
  return body.map((s) => emitPyStmt(s, indent)).join("\n") + "\n";
}

function emitTsNestedDefine(node, indent) {
  const pad = "  ".repeat(indent);
  const type = node.type ? `: ${emitTsType(node.type)}` : "";
  if (node.kind === "variable") {
    const init = node.init ? ` = ${emitTsExpr(node.init)}` : "";
    return `${pad}let ${node.name}${type}${init};`;
  }
  if (node.kind === "constant") {
    const init = node.init ? ` = ${emitTsExpr(node.init)}` : "";
    return `${pad}const ${node.name}${type}${init};`;
  }
  return `${pad}/* nested ${node.kind} */`;
}

function emitPyNestedDefine(node, indent) {
  const pad = "    ".repeat(indent);
  if (node.kind === "variable" || node.kind === "constant") {
    const init = node.init ? emitPyExpr(node.init) : "None";
    return `${pad}${node.name} = ${init}`;
  }
  return `${pad}# nested ${node.kind}`;
}

function emitTsVisibility(node) {
  if (mod(node, "private")) return "private ";
  if (mod(node, "protected")) return "protected ";
  if (mod(node, "public")) return "public ";
  return "";
}

function emitTsMember(member, indent) {
  const pad = "  ".repeat(indent);
  const vis = emitTsVisibility(member);
  const abs = mod(member, "abstract") ? "abstract " : "";
  const st = mod(member, "static") ? "static " : "";
  const asy = mod(member, "async") ? "async " : "";
  const ro = mod(member, "readonly") ? "readonly " : "";
  const params = emitTsParams(member.params);
  const ret = emitTsType(member.returns);

  if (member.kind === "constructor") {
    const body = emitTsBody(member.body, indent + 1);
    return `${pad}${vis}constructor(${params}) {\n${body}${pad}}`;
  }
  if (member.kind === "method") {
    if (member.body === null) {
      return `${pad}${vis}${abs}${st}${asy}${member.name}(${params}): ${ret};`;
    }
    const body = emitTsBody(member.body, indent + 1);
    return `${pad}${vis}${st}${asy}${member.name}(${params}): ${ret} {\n${body}${pad}}`;
  }
  if (member.kind === "property") {
    const type = member.type ? `: ${emitTsType(member.type)}` : "";
    const init = member.init ? ` = ${emitTsExpr(member.init)}` : "";
    return `${pad}${vis}${st}${ro}${member.name}${type}${init};`;
  }
  return `${pad}// unsupported member kind: ${member.kind}`;
}

function emitTsDecl(node) {
  if (node.op === "import") {
    if (node.style === "namespace") {
      return `import * as ${node.alias} from ${JSON.stringify(node.source)};`;
    }
    const parts = node.items.map((it) =>
      it.alias ? `${it.name} as ${it.alias}` : it.name,
    );
    return `import { ${parts.join(", ")} } from ${JSON.stringify(node.source)};`;
  }
  if (node.op === "export") {
    const parts = node.items.map((it) =>
      it.alias ? `${it.name} as ${it.alias}` : it.name,
    );
    return `export { ${parts.join(", ")} };`;
  }
  if (node.op !== "define") return `// unsupported op: ${node.op}`;

  if (node.kind === "interface") {
    const exp = mod(node, "export") ? "export " : "";
    const members = (node.members || []).map((m) => emitTsMember(m, 1)).join("\n");
    return `${exp}interface ${node.name} {\n${members}${members ? "\n" : ""}}`;
  }
  if (node.kind === "class") {
    const exp = mod(node, "export") ? "export " : "";
    const abs = mod(node, "abstract") ? "abstract " : "";
    const ext = node.extends ? ` extends ${node.extends}` : "";
    const impl = node.implements?.length
      ? ` implements ${node.implements.join(", ")}`
      : "";
    const members = (node.members || []).map((m) => emitTsMember(m, 1)).join("\n");
    return `${exp}${abs}class ${node.name}${ext}${impl} {\n${members}${members ? "\n" : ""}}`;
  }
  if (node.kind === "function") {
    const exp = mod(node, "export") ? "export " : "";
    const asy = mod(node, "async") ? "async " : "";
    const params = emitTsParams(node.params);
    const ret = emitTsType(node.returns);
    const body = emitTsBody(node.body, 1);
    return `${exp}${asy}function ${node.name}(${params}): ${ret} {\n${body}}\n`;
  }
  if (node.kind === "variable") {
    const exp = mod(node, "export") ? "export " : "";
    const type = node.type ? `: ${emitTsType(node.type)}` : "";
    const init = node.init ? ` = ${emitTsExpr(node.init)}` : "";
    return `${exp}let ${node.name}${type}${init};`;
  }
  if (node.kind === "constant") {
    const exp = mod(node, "export") ? "export " : "";
    const type = node.type ? `: ${emitTsType(node.type)}` : "";
    const init = node.init ? ` = ${emitTsExpr(node.init)}` : "";
    return `${exp}const ${node.name}${type}${init};`;
  }
  return `// unsupported define kind: ${node.kind}`;
}

export function emitTypeScript(ir) {
  const lines = [];
  lines.push(`// module ${ir.module.name}`);
  for (const node of ir.body || []) {
    lines.push(emitTsDecl(node));
    lines.push("");
  }
  return lines.join("\n").replace(/\n+$/, "\n");
}

function emitPyMember(member, indent, { protocol = false } = {}) {
  const pad = "    ".repeat(indent);
  const st = mod(member, "static");
  const asy = mod(member, "async") ? "async " : "";
  const params = emitPyParams(member.params, {
    staticMethod: st,
    isCtor: member.kind === "constructor",
  });
  const ret = emitPyType(member.returns);

  if (member.kind === "constructor") {
    const body = emitPyBody(member.body, indent + 1);
    return `${pad}def __init__(${params}) -> None:\n${body}`;
  }
  if (member.kind === "method") {
    if (member.body === null) {
      if (protocol) {
        return `${pad}${asy}def ${member.name}(${params}) -> ${ret}:\n${pad}    ...`;
      }
      return `${pad}@abstractmethod\n${pad}${asy}def ${member.name}(${params}) -> ${ret}:\n${pad}    ...`;
    }
    const deco = st ? `${pad}@staticmethod\n` : "";
    const body = emitPyBody(member.body, indent + 1);
    return `${deco}${pad}${asy}def ${member.name}(${params}) -> ${ret}:\n${body}`;
  }
  if (member.kind === "property") {
    const type = member.type ? `: ${emitPyType(member.type)}` : "";
    if (member.init) {
      return `${pad}${member.name}${type} = ${emitPyExpr(member.init)}`;
    }
    return `${pad}${member.name}${type}`;
  }
  return `${pad}# unsupported member kind: ${member.kind}`;
}

function emitPyDecl(node) {
  if (node.op === "import") {
    if (node.style === "namespace") {
      return `import ${JSON.stringify(node.source)} as ${node.alias}  # lira-namespace`;
    }
    const parts = node.items.map((it) =>
      it.alias ? `${it.name} as ${it.alias}` : it.name,
    );
    return `from ${JSON.stringify(node.source)} import ${parts.join(", ")}`;
  }
  if (node.op === "export") {
    const names = node.items.map((it) => it.alias || it.name);
    return `# export: ${names.join(", ")}`;
  }
  if (node.op !== "define") return `# unsupported op: ${node.op}`;

  if (node.kind === "interface") {
    const members = node.members || [];
    if (!members.length) {
      return `class ${node.name}(Protocol):\n    pass`;
    }
    const body = members.map((m) => emitPyMember(m, 1, { protocol: true })).join("\n\n");
    return `class ${node.name}(Protocol):\n${body}`;
  }
  if (node.kind === "class") {
    const bases = [];
    if (node.extends) bases.push(node.extends);
    if (node.implements?.length) bases.push(...node.implements);
    if (mod(node, "abstract")) bases.unshift("ABC");
    const baseList = bases.length ? `(${bases.join(", ")})` : "";
    const members = node.members || [];
    if (!members.length) {
      return `class ${node.name}${baseList}:\n    pass`;
    }
    const body = members.map((m) => emitPyMember(m, 1)).join("\n\n");
    return `class ${node.name}${baseList}:\n${body}`;
  }
  if (node.kind === "function") {
    const asy = mod(node, "async") ? "async " : "";
    const params = (node.params || [])
      .map((p) => `${p.name}: ${emitPyType(p.type)}`)
      .join(", ");
    const ret = emitPyType(node.returns);
    const body = emitPyBody(node.body, 1);
    return `${asy}def ${node.name}(${params}) -> ${ret}:\n${body}`;
  }
  if (node.kind === "variable" || node.kind === "constant") {
    const init = node.init ? emitPyExpr(node.init) : "None";
    return `${node.name} = ${init}`;
  }
  return `# unsupported define kind: ${node.kind}`;
}

function needsTypingProtocol(ir) {
  return (ir.body || []).some((n) => n.op === "define" && n.kind === "interface");
}

function needsAbc(ir) {
  return (ir.body || []).some(
    (n) =>
      n.op === "define" &&
      n.kind === "class" &&
      (mod(n, "abstract") ||
        (n.members || []).some((m) => m.body === null || mod(m, "abstract"))),
  );
}

export function emitPython(ir) {
  const lines = [];
  lines.push(`# module ${ir.module.name}`);
  const imports = [];
  if (needsAbc(ir)) imports.push("from abc import ABC, abstractmethod");
  if (needsTypingProtocol(ir)) imports.push("from typing import Protocol");
  for (const imp of imports) lines.push(imp);
  if (imports.length) lines.push("");
  for (const node of ir.body || []) {
    lines.push(emitPyDecl(node));
    lines.push("");
  }
  return lines.join("\n").replace(/\n+$/, "\n");
}

export const TARGETS = [
  { namespace: "ts", extension: ".ts", emit: emitTypeScript },
  { namespace: "py", extension: ".py", emit: emitPython },
];
