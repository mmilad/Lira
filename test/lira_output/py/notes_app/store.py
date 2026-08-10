# module notes_store
from typing import Protocol

class NoteStore(Protocol):
    def get(self, id: str) -> Note | None:
        ...

    def save(self, note: Note) -> Note:
        ...

    def list(self) -> list[Note]:
        ...
