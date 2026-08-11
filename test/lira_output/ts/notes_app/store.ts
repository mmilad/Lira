// module notes_store
import { Note } from "./models";

export interface NoteStore {
  get(id: string): Note | null;
  save(note: Note): Note;
  list(): Note[];
}
