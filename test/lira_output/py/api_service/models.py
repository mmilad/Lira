# module api_models
from __future__ import annotations
class User:
    id: str

    name: str

    def __init__(self, id: str, name: str) -> None:
        self.id = id
        self.name = name
