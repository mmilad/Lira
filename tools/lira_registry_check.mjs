#!/usr/bin/env node

import {
  VOCABULARY,
  entriesByRole,
  preferredVocabulary,
  resolveVocabularyWord,
  validateRegistry,
} from "./lira_registry.mjs";
import {
  BODY_OWNER_SCOPES,
  CALLABLE_KINDS,
  KIND_WORDS,
  MEMBER_KINDS,
  MODIFIER_MATRIX,
  MODIFIER_WORDS,
  MODULE_ONLY_KINDS,
  VISIBILITY_WORDS,
} from "./lira_registry_runtime.mjs";
import { getVocabulary } from "./lira_vocabulary.mjs";

const errors = validateRegistry();

if (!entriesByRole("kind").length) errors.push("registry has no declaration kinds");
if (!entriesByRole("modifier").length) errors.push("registry has no modifiers");
if (!entriesByRole("operation").length) errors.push("registry has no operations");

for (const entry of VOCABULARY) {
  if (resolveVocabularyWord(entry.preferred)?.id !== entry.id) {
    errors.push(`preferred spelling does not resolve to ${entry.id}: ${entry.preferred}`);
  }
  for (const alias of entry.aliases || []) {
    if (resolveVocabularyWord(alias)?.id !== entry.id) {
      errors.push(`alias does not resolve to ${entry.id}: ${alias}`);
    }
  }
}

const pyModuleWords = preferredVocabulary({ target: "py", scope: "module" });
const tsModuleWords = preferredVocabulary({ target: "ts", scope: "module" });
if (!pyModuleWords.includes("class")) errors.push("python/module vocabulary should include class");
if (!tsModuleWords.includes("class")) errors.push("typescript/module vocabulary should include class");

// Aliases are deliberately accepted by the resolver but are not returned by
// preferredVocabulary(). This lets us later measure whether models discover
// useful aliases without teaching them those spellings up front.
if (preferredVocabulary().includes("exported")) {
  errors.push("aliases must not leak into preferred vocabulary");
}
if (resolveVocabularyWord("exported")?.semantic !== "export") {
  errors.push("exported alias should resolve to export semantics");
}

// Temporary parser-parity guard. These are the shapes the existing parser had
// before registry extraction. Keeping them here makes the migration mechanical:
// changing registry semantics must be an explicit design change, not a side
// effect of moving constants around.
function expectSet(label, actual, expected) {
  const got = [...actual].sort();
  const want = [...expected].sort();
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    errors.push(`${label} drift: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
  }
}

expectSet("kinds", KIND_WORDS, [
  "class",
  "interface",
  "function",
  "method",
  "constructor",
  "property",
  "variable",
  "constant",
]);
expectSet("modifiers", MODIFIER_WORDS, [
  "export",
  "abstract",
  "static",
  "async",
  "public",
  "protected",
  "private",
  "readonly",
]);
expectSet("visibility", VISIBILITY_WORDS, ["public", "protected", "private"]);
expectSet("member kinds", MEMBER_KINDS, ["method", "constructor", "property"]);
expectSet("module-only kinds", MODULE_ONLY_KINDS, ["class", "interface", "function"]);
expectSet("callable kinds", CALLABLE_KINDS, ["function", "method", "constructor"]);
expectSet("body-owner scopes", BODY_OWNER_SCOPES, [
  "function",
  "method",
  "constructor",
  "if_then",
  "if_else",
  "for_body",
]);

for (const mod of MODIFIER_WORDS) {
  if (!MODIFIER_MATRIX[mod]) errors.push(`modifier matrix missing ${mod}`);
  for (const kind of KIND_WORDS) {
    if (!MODIFIER_MATRIX[mod]?.[kind]) {
      errors.push(`modifier matrix missing ${mod}/${kind}`);
    }
  }
}

// Guided vocabulary returns preferred spellings only and filters obvious
// semantic impossibilities without pretending to be a next-token grammar.
expectSet(
  "module kinds",
  getVocabulary({ target: "ts", scope: "module", role: "kind" }),
  ["class", "interface", "function", "variable", "constant"],
);
expectSet(
  "class-member kinds",
  getVocabulary({ target: "ts", scope: "class", role: "kind" }),
  ["method", "constructor", "property", "variable", "constant"].filter((word) =>
    KIND_WORDS.has(word) && resolveVocabularyWord(word)?.scopes?.includes("class"),
  ),
);
expectSet(
  "method modifiers",
  getVocabulary({ target: "ts", scope: "class", role: "modifier", kind: "method" }),
  ["abstract", "static", "async", "public", "protected", "private"],
);
const afterPrivate = getVocabulary({
  target: "ts",
  scope: "class",
  role: "modifier",
  kind: "method",
  usedModifiers: ["private"],
});
if (afterPrivate.includes("public") || afterPrivate.includes("protected") || afterPrivate.includes("private")) {
  errors.push("visibility group should allow only one visibility modifier");
}
if (getVocabulary({ target: "ts", scope: "module", role: "modifier", kind: "class" }).includes("exported")) {
  errors.push("guided vocabulary must return preferred spelling, never alias exported");
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  console.error(`\n${errors.length} registry failure(s)`);
  process.exitCode = 1;
} else {
  console.log(`ok   ${VOCABULARY.length} registry entries`);
  console.log(`ok   ${entriesByRole("kind").length} kinds`);
  console.log(`ok   ${entriesByRole("modifier").length} modifiers`);
  console.log(`ok   parser-compatible runtime views derived from registry`);
  console.log(`ok   contextual preferred vocabulary`);
  console.log(`ok   aliases remain hidden from preferred vocabulary`);
}
