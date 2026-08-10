# module notes_models
class Note:
    id

    title

    body

    def __init__(self, id: str, title: str) -> None:
        self.id = id
        self.title = title
        self.body = ""


    @staticmethod
    def createEmpty() -> Note:
        return Note("0", "")
