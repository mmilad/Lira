# module f7_interface
from typing import Protocol

class Greeter(Protocol):
    def greet(self, name: str) -> str:
        ...

class Person(Greeter):
    name: object

    def __init__(self, name: str) -> None:
        self.name = name


    def greet(self, name: str) -> str:
        return self.name
