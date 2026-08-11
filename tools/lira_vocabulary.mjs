// Contextual preferred-vocabulary query for producers/LLMs.
//
// Important: this is NOT a next-token grammar. It exposes the small set of
// preferred Lira words that make semantic sense for a given context. Aliases
// stay parser tolerance and are intentionally never returned here.

import {
  TARGET_SUPPORT,
  entriesByRole,
  resolveVocabularyWord,
} from "./lira_registry.mjs";

function supportedForTarget(entry, target) {
  if (!target) return true;
  const support = entry.targets?.[target];
  return Boolean(support && support !== TARGET_SUPPORT.UNSUPPORTED && support !== TARGET_SUPPORT.DEFERRED);
}

function scopeAllows(entry, scope) {
  return !scope || !entry.scopes || entry.scopes.includes(scope);
}

function kindEntry(kind) {
  if (!kind) return null;
  const entry = resolveVocabularyWord(kind);
  return entry?.role === "kind" ? entry : null;
}

function modifierFitsKind(entry, kind) {
  if (entry.role !== "modifier" || !kind) return true;
  const targetKind = kindEntry(kind);
  if (!targetKind) return false;
  if (!entry.requiresCapability) return true;
  return targetKind.capabilities?.includes(entry.requiresCapability) || false;
}

/**
 * Return only preferred spellings suitable for guided generation.
 *
 * @param {{
 *   target?: string | null,
 *   scope?: string | null,
 *   role?: string | null,
 *   kind?: string | null,
 *   usedModifiers?: string[],
 * }} context
 */
export function getVocabulary(context = {}) {
  const {
    target = null,
    scope = null,
    role = null,
    kind = null,
    usedModifiers = [],
  } = context;

  const usedSemantics = new Set(
    usedModifiers
      .map((word) => resolveVocabularyWord(word))
      .filter((entry) => entry?.role === "modifier")
      .map((entry) => entry.semantic),
  );

  const groupsInUse = new Set(
    usedModifiers
      .map((word) => resolveVocabularyWord(word))
      .filter((entry) => entry?.role === "modifier" && entry.group)
      .map((entry) => entry.group),
  );

  const entries = entriesByRole(role || "kind")
    .filter((entry) => supportedForTarget(entry, target))
    .filter((entry) => scopeAllows(entry, scope))
    .filter((entry) => modifierFitsKind(entry, kind))
    .filter((entry) => !usedSemantics.has(entry.semantic))
    .filter((entry) => !entry.group || !groupsInUse.has(entry.group));

  return entries.map((entry) => entry.preferred);
}

export function getVocabularyByRole(context = {}) {
  const roles = ["operation", "modifier", "kind", "relation"];
  return Object.fromEntries(
    roles.map((role) => [role, getVocabulary({ ...context, role })]),
  );
}
