// module notes_service
import { Note } from "./models";

import { NoteStore } from "./store";

export class NoteService {
  private store: NoteStore;
  constructor(store: NoteStore) {
    this.store = store;
  }
  public create(title: string): Note {
    let safeTitle: string = title;
    if ((title == "")) {
      safeTitle = "untitled";
    }
    let note: Note = new Note("1", safeTitle);
    this.store.save(note);
    return note;
  }
  public async load(id: string): Promise<Note> {
    let note: Note | null = this.store.get(id);
    if ((note == null)) {
      throw new Error("missing note");
    }
    return note;
  }
  public list(): Note[] {
    return this.store.list();
  }
  public firstTitle(): string {
    let notes: Note[] = this.store.list();
    let result: string = "";
    for (const note of notes) {
      if ((result == "")) {
        result = note.title;
      }
    }
    return result;
  }
}
