# module notes_memory_store
from __future__ import annotations
from .models import Note

from .store import NoteStore

class MemoryNoteStore(NoteStore):
    notes: list[Note] = []

    def get(self, id: str) -> Note | None:
        for note in self.notes:
            if (note.id == id):
                return note
        return None


    def save(self, note: Note) -> Note:
        self.notes.append(note)
        return note


    def list(self) -> list[Note]:
        return self.notes
