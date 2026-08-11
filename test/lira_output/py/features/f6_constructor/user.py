# module f6_constructor
from __future__ import annotations
class User:
    name: str

    def __init__(self, name: str) -> None:
        self.name = name
        return


    def greet(self) -> str:
        return self.name
