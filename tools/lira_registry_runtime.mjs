// Runtime views derived from the declarative Lira registry.
//
// This module is intentionally boring: it converts registry data into the
// Set/table shapes the existing parser already uses. The parser can migrate to
// these exports without changing DSL semantics or enabling aliases.

import {
  MODIFIER_COMPATIBILITY,
  entriesByRole,
} from "./lira_registry.mjs";

function preferredSet(role) {
  return new Set(entriesByRole(role).map((entry) => entry.preferred));
}

export const KIND_WORDS = preferredSet("kind");
export const MODIFIER_WORDS = preferredSet("modifier");
export const VISIBILITY_WORDS = new Set(
  entriesByRole("modifier")
    .filter((entry) => entry.group === "visibility")
    .map((entry) => entry.preferred),
);

export const MEMBER_KINDS = new Set(
  entriesByRole("kind")
    .filter((entry) => entry.scopes?.some((scope) => scope === "class" || scope === "interface"))
    .filter((entry) => !entry.scopes?.includes("module"))
    .map((entry) => entry.preferred),
);

export const MODULE_ONLY_KINDS = new Set(
  entriesByRole("kind")
    .filter((entry) => entry.scopes?.length === 1 && entry.scopes[0] === "module")
    .map((entry) => entry.preferred),
);

export const CALLABLE_KINDS = new Set(
  entriesByRole("kind")
    .filter((entry) => entry.capabilities?.includes("callable"))
    .map((entry) => entry.preferred),
);

// Control-flow body scopes are parser structure rather than vocabulary, so
// they stay explicit here. Callable scopes come from registry capabilities.
export const BODY_OWNER_SCOPES = new Set([
  ...CALLABLE_KINDS,
  "if_then",
  "if_else",
  "for_body",
]);

export const MODIFIER_MATRIX = MODIFIER_COMPATIBILITY;

export function modifierStatus(modifier, kind) {
  return MODIFIER_MATRIX[modifier]?.[kind] || null;
}
