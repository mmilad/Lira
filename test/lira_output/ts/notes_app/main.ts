// module notes_main
import { NoteService } from "./service";

import { Note as NoteModel } from "./models";

export const APP_NAME = "notes";

export function boot(service: NoteService): NoteModel {
  let note = new NoteModel("1", "hello");
  service.create(note.title);
  return note;
}
