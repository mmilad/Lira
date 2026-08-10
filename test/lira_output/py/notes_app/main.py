# module notes_main
from "./service" import NoteService

from "./models" import Note as NoteModel

APP_NAME = "notes"

def boot(service: NoteService) -> NoteModel:
    note = NoteModel("1", "hello")
    service.create(note.title)
    return note
