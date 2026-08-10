# module notes_models
from __future__ import annotations
class Note:
    id: str

    title: str

    body: str

    def __init__(self, id: str, title: str) -> None:
        self.id = id
        self.title = title
        self.body = ""


    @staticmethod
    def createEmpty() -> Note:
        return Note("0", "")
