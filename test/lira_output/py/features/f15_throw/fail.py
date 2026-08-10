# module f15_throw
def requireId(id: str) -> str:
    if (id == ""):
        raise Exception("missing id")
    return id
