# module notes_store
from abc import ABC, abstractmethod

class NoteStore(ABC):
    @abstractmethod
    def get(self) -> None:
        ...

    @abstractmethod
    def save(self) -> None:
        ...

    @abstractmethod
    def list(self) -> None:
        ...
