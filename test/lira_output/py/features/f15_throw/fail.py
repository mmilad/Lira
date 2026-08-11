# module f15_throw
from __future__ import annotations
def requireId(id: str) -> str:
    if (id == ""):
        raise Exception("missing id")
    return id
