// module notes_models
export class Note {
  public readonly id: string;
  public title: string;
  private body: string;
  constructor(id: string, title: string) {
    this.id = id;
    this.title = title;
    this.body = "";
  }
  public static createEmpty(): Note {
    return new Note("0", "");
  }
}
