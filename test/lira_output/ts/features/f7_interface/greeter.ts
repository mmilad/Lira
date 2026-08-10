// module f7_interface
export interface Greeter {
  greet(name: string): string;
}

export class Person implements Greeter {
  public name: string;
  constructor(name: string) {
    this.name = name;
  }
  public greet(name: string): string {
    return this.name;
  }
}
