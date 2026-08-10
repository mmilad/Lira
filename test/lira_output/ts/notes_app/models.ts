// module notes_models
export class Note {
  public readonly id;
  public title;
  private body;
  constructor(id: string, title: string) {
    this.id = id;
    this.title = title;
    this.body = "";
  }
  public static createEmpty(): Note {
    return new Note("0", "");
  }
}
