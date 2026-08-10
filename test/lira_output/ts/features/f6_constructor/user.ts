// module f6_constructor
export class User {
  public name: unknown;
  constructor(name: string) {
    this.name = name;
    return;
  }
  public greet(): string {
    return this.name;
  }
}
