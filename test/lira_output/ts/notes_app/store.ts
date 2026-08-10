// module notes_store
export abstract class NoteStore {
  abstract get(): void;
  abstract save(): void;
  abstract list(): void;
}
