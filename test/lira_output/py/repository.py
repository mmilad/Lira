# module demo
from __future__ import annotations
from abc import ABC, abstractmethod

class Repository(ABC):
    @abstractmethod
    def save(self) -> None:
        ...
