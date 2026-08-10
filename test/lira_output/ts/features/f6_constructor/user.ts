// module f6_constructor
export class User {
  public name: string;
  constructor(name: string) {
    this.name = name;
    return;
  }
  public greet(): string {
    return this.name;
  }
}
