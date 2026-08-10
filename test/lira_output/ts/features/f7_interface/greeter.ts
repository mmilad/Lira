// module f7_interface
export interface Greeter {
  greet(name: string): string;
}

export class Person implements Greeter {
  public name: unknown;
  constructor(name: string) {
    this.name = name;
  }
  public greet(name: string): string {
    return this.name;
  }
}
