// module notes_main
import { NoteService } from "./service";

import { MemoryNoteStore } from "./memory_store";

export function main(): void {
  let store = new MemoryNoteStore();
  let service = new NoteService(store);
  console.log("notes: starting");
  let created = service.create("hello");
  console.log(created.title);
  let title = service.firstTitle();
  console.log(title);
}


main();
