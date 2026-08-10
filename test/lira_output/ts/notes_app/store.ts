// module notes_store
export interface NoteStore {
  get(id: string): Note | null;
  save(note: Note): Note;
  list(): Note[];
}
