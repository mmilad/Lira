# module api_memory_store
from __future__ import annotations
from .models import User

from .store import UserStore

class InMemoryUserStore(UserStore):
    users: list[User] = []

    def get(self, id: str) -> User | None:
        for user in self.users:
            if (user.id == id):
                return user
        return None


    def save(self, user: User) -> User:
        self.users.append(user)
        return user


    def list(self) -> list[User]:
        return self.users
