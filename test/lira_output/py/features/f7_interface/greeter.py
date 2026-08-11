# module f7_interface
from __future__ import annotations
from typing import Protocol

class Greeter(Protocol):
    def greet(self, name: str) -> str:
        ...

class Person(Greeter):
    name: str

    def __init__(self, name: str) -> None:
        self.name = name


    def greet(self, name: str) -> str:
        return self.name
