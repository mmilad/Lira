// module notes_store
export interface NoteStore {
  get(id: string): Note;
  save(note: Note): Note;
  list(): Note;
}
