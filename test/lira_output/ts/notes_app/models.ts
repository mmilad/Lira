// module notes_models
export class Note {
  public readonly id: unknown;
  public title: unknown;
  private body: unknown;
  constructor(id: string, title: string) {
    this.id = id;
    this.title = title;
    this.body = "";
  }
  public static createEmpty(): Note {
    return new Note("0", "");
  }
}
