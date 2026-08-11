#!/usr/bin/env node

import {
  VOCABULARY,
  entriesByRole,
  preferredVocabulary,
  resolveVocabularyWord,
  validateRegistry,
} from "./lira_registry.mjs";

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

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  console.error(`\n${errors.length} registry failure(s)`);
  process.exitCode = 1;
} else {
  console.log(`ok   ${VOCABULARY.length} registry entries`);
  console.log(`ok   ${entriesByRole("kind").length} kinds`);
  console.log(`ok   ${entriesByRole("modifier").length} modifiers`);
  console.log(`ok   aliases remain hidden from preferred vocabulary`);
}
