/**
 * Deterministic IR → source emitters for the test pipeline.
 * Not a product backend API — just idempotent transforms for committed goldens.
 */

function mod(node, name) {
  return Boolean(node.modifiers && node.modifiers[name]);
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

  if (member.kind === "method") {
    if (mod(member, "abstract")) {
      return `${pad}${vis}${abs}${st}${asy}${member.name}(): void;`;
    }
    return `${pad}${vis}${st}${asy}${member.name}(): void {\n${pad}}\n`;
  }
  if (member.kind === "property") {
    return `${pad}${vis}${st}${ro}${member.name}: unknown;`;
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
    return `${exp}${asy}function ${node.name}(): void {\n}\n`;
  }
  if (node.kind === "variable") {
    const exp = mod(node, "export") ? "export " : "";
    const kw = mod(node, "readonly") ? "const" : "let";
    return `${exp}${kw} ${node.name}: unknown;`;
  }
  if (node.kind === "constant") {
    const exp = mod(node, "export") ? "export " : "";
    return `${exp}const ${node.name}: unknown;`;
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

function emitPyMember(member, indent) {
  const pad = "    ".repeat(indent);
  const st = mod(member, "static") ? "@staticmethod\n" + pad : "";
  const asy = mod(member, "async") ? "async " : "";
  if (member.kind === "method") {
    if (mod(member, "abstract")) {
      return `${pad}@abstractmethod\n${pad}${asy}def ${member.name}(self) -> None:\n${pad}    ...`;
    }
    const first = mod(member, "static") ? "" : "self";
    return `${st}${pad}${asy}def ${member.name}(${first}) -> None:\n${pad}    pass`;
  }
  if (member.kind === "property") {
    return `${pad}${member.name}: object`;
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
    return `${asy}def ${node.name}() -> None:\n    pass`;
  }
  if (node.kind === "variable" || node.kind === "constant") {
    return `${node.name}: object`;
  }
  return `# unsupported define kind: ${node.kind}`;
}

export function emitPython(ir) {
  const needsAbc = (ir.body || []).some(
    (n) =>
      n.op === "define" &&
      n.kind === "class" &&
      (mod(n, "abstract") ||
        (n.members || []).some((m) => mod(m, "abstract"))),
  );
  const lines = [];
  lines.push(`# module ${ir.module.name}`);
  if (needsAbc) lines.push("from abc import ABC, abstractmethod");
  if (needsAbc) lines.push("");
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
