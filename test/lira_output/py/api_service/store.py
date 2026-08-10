# module api_store
from __future__ import annotations
from typing import Protocol

from .models import User

class UserStore(Protocol):
    def get(self, id: str) -> User | None:
        ...

    def save(self, user: User) -> User:
        ...

    def list(self) -> list[User]:
        ...
