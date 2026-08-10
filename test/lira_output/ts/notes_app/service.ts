// module notes_service
import { Note } from "./models";

import { NoteStore } from "./store";

export class NoteService {
  private store;
  constructor(store: NoteStore) {
    this.store = store;
  }
  public create(title: string): Note {
    let safeTitle = title;
    if ((title == "")) {
      safeTitle = "untitled";
    }
    let note = new Note("1", safeTitle);
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
