// Declarative vocabulary/semantic registry for Lira.
//
// Design goals:
// - one registry entry per Lira concept, not per target language
// - preferred spelling is what guided producers/LLMs should receive
// - aliases are tolerated vocabulary, not separate semantics
// - target metadata only describes support; emitters own code generation
// - no executable per-keyword handlers

export const TARGET_SUPPORT = Object.freeze({
  NATIVE: "native",
  MAPPED: "mapped",
  UNSUPPORTED: "unsupported",
  DEFERRED: "deferred",
});

const bothNative = Object.freeze({ ts: "native", py: "native" });
const bothMapped = Object.freeze({ ts: "mapped", py: "mapped" });

export const VOCABULARY = Object.freeze([
  // Declaration kinds
  {
    id: "kind.class",
    semantic: "class",
    role: "kind",
    preferred: "class",
    aliases: [],
    scopes: ["module"],
    capabilities: ["exportable", "abstractable", "member_container", "extendable"],
    targets: bothNative,
  },
  {
    id: "kind.interface",
    semantic: "interface",
    role: "kind",
    preferred: "interface",
    aliases: [],
    scopes: ["module"],
    capabilities: ["exportable", "member_container", "extendable"],
    targets: { ts: "native", py: "mapped" },
  },
  {
    id: "kind.function",
    semantic: "function",
    role: "kind",
    preferred: "function",
    aliases: [],
    scopes: ["module"],
    capabilities: ["exportable", "asyncable", "callable", "body_owner"],
    targets: bothNative,
  },
  {
    id: "kind.method",
    semantic: "method",
    role: "kind",
    preferred: "method",
    aliases: [],
    scopes: ["class", "interface"],
    capabilities: ["visible", "abstractable", "staticable", "asyncable", "callable", "body_owner"],
    targets: bothNative,
  },
  {
    id: "kind.constructor",
    semantic: "constructor",
    role: "kind",
    preferred: "constructor",
    aliases: [],
    scopes: ["class"],
    capabilities: ["visible", "callable", "body_owner"],
    targets: bothNative,
  },
  {
    id: "kind.property",
    semantic: "property",
    role: "kind",
    preferred: "property",
    aliases: [],
    scopes: ["class", "interface"],
    capabilities: ["visible", "readonlyable", "staticable"],
    targets: bothNative,
  },
  {
    id: "kind.variable",
    semantic: "variable",
    role: "kind",
    preferred: "variable",
    aliases: [],
    scopes: ["module", "function", "method", "constructor", "if_then", "if_else", "for_body"],
    capabilities: ["exportable", "readonlyable"],
    targets: bothNative,
  },
  {
    id: "kind.constant",
    semantic: "constant",
    role: "kind",
    preferred: "constant",
    aliases: ["const"],
    scopes: ["module", "function", "method", "constructor", "if_then", "if_else", "for_body"],
    capabilities: ["exportable"],
    targets: bothNative,
  },

  // Modifiers
  {
    id: "modifier.export",
    semantic: "export",
    role: "modifier",
    preferred: "export",
    aliases: ["exported"],
    requiresCapability: "exportable",
    scopes: ["module"],
    targets: { ts: "native", py: "mapped" },
  },
  {
    id: "modifier.abstract",
    semantic: "abstract",
    role: "modifier",
    preferred: "abstract",
    aliases: [],
    requiresCapability: "abstractable",
    targets: bothNative,
  },
  {
    id: "modifier.static",
    semantic: "static",
    role: "modifier",
    preferred: "static",
    aliases: [],
    requiresCapability: "staticable",
    targets: bothNative,
  },
  {
    id: "modifier.async",
    semantic: "async",
    role: "modifier",
    preferred: "async",
    aliases: [],
    requiresCapability: "asyncable",
    targets: bothNative,
  },
  {
    id: "modifier.public",
    semantic: "visibility.public",
    role: "modifier",
    preferred: "public",
    aliases: [],
    group: "visibility",
    requiresCapability: "visible",
    targets: { ts: "native", py: "mapped" },
  },
  {
    id: "modifier.protected",
    semantic: "visibility.protected",
    role: "modifier",
    preferred: "protected",
    aliases: [],
    group: "visibility",
    requiresCapability: "visible",
    targets: { ts: "native", py: "mapped" },
  },
  {
    id: "modifier.private",
    semantic: "visibility.private",
    role: "modifier",
    preferred: "private",
    aliases: [],
    group: "visibility",
    requiresCapability: "visible",
    targets: { ts: "native", py: "mapped" },
  },
  {
    id: "modifier.readonly",
    semantic: "readonly",
    role: "modifier",
    preferred: "readonly",
    aliases: [],
    requiresCapability: "readonlyable",
    targets: { ts: "native", py: "mapped" },
  },

  // Relations / structural words
  {
    id: "relation.extends",
    semantic: "extends",
    role: "relation",
    preferred: "extends",
    aliases: [],
    targets: bothNative,
  },
  {
    id: "relation.implements",
    semantic: "implements",
    role: "relation",
    preferred: "implements",
    aliases: [],
    targets: { ts: "native", py: "mapped" },
  },
  {
    id: "relation.from",
    semantic: "from",
    role: "relation",
    preferred: "from",
    aliases: [],
    targets: bothMapped,
  },
  {
    id: "relation.as",
    semantic: "alias",
    role: "relation",
    preferred: "as",
    aliases: [],
    targets: bothMapped,
  },

  // Statement / expression operations currently implemented by v0/v1.
  ...[
    "define",
    "import",
    "return",
    "throw",
    "assign",
    "set",
    "call",
    "construct",
    "if",
    "else",
    "for",
  ].map((word) => ({
    id: `operation.${word}`,
    semantic: word,
    role: "operation",
    preferred: word,
    aliases: [],
    targets: bothMapped,
  })),
]);

// Explicit compatibility is retained during the first refactor so moving the
// data out of the parser does not accidentally redefine v0 semantics. Later,
// rules that are truly equivalent to capabilities can be generated from the
// semantic entries and this table can shrink.
export const MODIFIER_COMPATIBILITY = Object.freeze({
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
});

export function entriesByRole(role) {
  return VOCABULARY.filter((entry) => entry.role === role);
}

export function resolveVocabularyWord(word) {
  return (
    VOCABULARY.find(
      (entry) => entry.preferred === word || entry.aliases?.includes(word),
    ) || null
  );
}

export function preferredVocabulary({ target = null, role = null, scope = null } = {}) {
  return VOCABULARY.filter((entry) => {
    if (role && entry.role !== role) return false;
    if (scope && entry.scopes && !entry.scopes.includes(scope)) return false;
    if (target && entry.targets?.[target] === TARGET_SUPPORT.UNSUPPORTED) return false;
    if (target && entry.targets && !(target in entry.targets)) return false;
    return true;
  }).map((entry) => entry.preferred);
}

export function validateRegistry() {
  const errors = [];
  const ids = new Set();
  const spellings = new Map();
  const validSupport = new Set(Object.values(TARGET_SUPPORT));

  for (const entry of VOCABULARY) {
    if (!entry.id || !entry.semantic || !entry.role || !entry.preferred) {
      errors.push(`registry entry missing required fields: ${JSON.stringify(entry)}`);
      continue;
    }
    if (ids.has(entry.id)) errors.push(`duplicate registry id: ${entry.id}`);
    ids.add(entry.id);

    for (const spelling of [entry.preferred, ...(entry.aliases || [])]) {
      const previous = spellings.get(spelling);
      if (previous && previous !== entry.id) {
        errors.push(`spelling ${JSON.stringify(spelling)} belongs to both ${previous} and ${entry.id}`);
      } else {
        spellings.set(spelling, entry.id);
      }
    }

    for (const [target, support] of Object.entries(entry.targets || {})) {
      if (!validSupport.has(support)) {
        errors.push(`${entry.id}: invalid target support ${target}=${JSON.stringify(support)}`);
      }
    }
  }

  return errors;
}
