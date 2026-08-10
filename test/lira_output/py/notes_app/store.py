# module notes_store
from typing import Protocol

class NoteStore(Protocol):
    def get(self, id: str) -> Note:
        ...

    def save(self, note: Note) -> Note:
        ...

    def list(self) -> Note:
        ...
