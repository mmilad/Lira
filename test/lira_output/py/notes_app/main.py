# module notes_main
from __future__ import annotations
from .service import NoteService

from .memory_store import MemoryNoteStore

def main() -> None:
    store = MemoryNoteStore()
    service = NoteService(store)
    print("notes: starting")
    created = service.create("hello")
    print(created.title)
    title = service.firstTitle()
    print(title)


if __name__ == "__main__":
    main()
