// module api_models
export class User {
  public readonly id: string;
  public name: string;
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}
