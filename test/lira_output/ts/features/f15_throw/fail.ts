// module f15_throw
export function requireId(id: string): string {
  if ((id == "")) {
    throw new Error("missing id");
  }
  return id;
}
