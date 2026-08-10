# module notes_store
from __future__ import annotations
from typing import Protocol

from .models import Note

class NoteStore(Protocol):
    def get(self, id: str) -> Note | None:
        ...

    def save(self, note: Note) -> Note:
        ...

    def list(self) -> list[Note]:
        ...
