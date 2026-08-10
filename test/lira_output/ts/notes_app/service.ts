// module notes_service
import { Note } from "./models";

import { NoteStore } from "./store";

export class NoteService {
  private store: unknown;
  constructor(store: NoteStore) {
    this.store = store;
  }
  public create(title: string): Note {
    let note = new Note("1", title);
    this.store.save(note);
    return note;
  }
  public async load(id: string): Note {
    return this.store.get(id);
  }
  public list(): Note {
    return this.store.list();
  }
}
