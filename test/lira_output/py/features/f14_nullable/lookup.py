# module f14_nullable
from __future__ import annotations
def lookup(id: str) -> str | None:
    found = None
    if (id == ""):
        return found
    found = id
    return found
