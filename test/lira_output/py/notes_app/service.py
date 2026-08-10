# module notes_service
from "./models" import Note

from "./store" import NoteStore

class NoteService:
    store: NoteStore

    def __init__(self, store: NoteStore) -> None:
        self.store = store


    def create(self, title: str) -> Note:
        safeTitle = title
        if (title == ""):
            safeTitle = "untitled"
        note = Note("1", safeTitle)
        self.store.save(note)
        return note


    async def load(self, id: str) -> Note:
        return self.store.get(id)


    def list(self) -> list[Note]:
        return self.store.list()


    def firstTitle(self) -> str:
        notes = self.store.list()
        result = ""
        for note in notes:
            if (result == ""):
                result = note.title
        return result
