// module notes_memory_store
import { Note } from "./models";

import { NoteStore } from "./store";

export class MemoryNoteStore implements NoteStore {
  private notes: Note[] = [];
  public get(id: string): Note | null {
    for (const note of this.notes) {
      if ((note.id == id)) {
        return note;
      }
    }
    return null;
  }
  public save(note: Note): Note {
    this.notes.push(note);
    return note;
  }
  public list(): Note[] {
    return this.notes;
  }
}
