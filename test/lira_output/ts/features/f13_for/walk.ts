// module f13_for
export function joinTitles(titles: string[]): string {
  let out: string = "";
  for (const title of titles) {
    if ((out == "")) {
      out = title;
    } else {
      out = out;
    }
  }
  return out;
}
