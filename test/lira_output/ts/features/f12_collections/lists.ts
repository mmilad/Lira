// module f12_collections
export function demo(): string {
  let titles: string[] = ["a", "b"];
  titles[0] = "x";
  let byId: Record<string, string> = {};
  byId["1"] = titles[0];
  return byId["1"];
}
