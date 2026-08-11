# module f14_nullable2
from __future__ import annotations
def lookup(id: str) -> str | None:
    return (id or None)
