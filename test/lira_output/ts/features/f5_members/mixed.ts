// module f5_members
export class Account {
  public name = "anon";
  private secret;
  public static version = 1;
  public ping(): string {
    return "ok";
  }
  private static normalize(value: string): string {
    return value;
  }
}
