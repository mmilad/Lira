// module f14_nullable
export function lookup(id: string): string | null {
  let found: string | null = null;
  if ((id == "")) {
    return found;
  }
  found = id;
  return found;
}
