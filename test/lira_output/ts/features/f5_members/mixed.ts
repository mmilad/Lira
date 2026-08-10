// module f5_members
export class Account {
  public name: unknown = "anon";
  private secret: unknown;
  public static version: unknown = 1;
  public ping(): string {
    return "ok";
  }
  private static normalize(value: string): string {
    return value;
  }
}
