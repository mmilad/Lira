// module f9_operators
export function calc(a: number, b: number): number {
  let sum = (a + (b * 2));
  let ok = ((sum >= 10) && !(false));
  if (ok) {
    return sum;
  }
  return (a - b);
}
