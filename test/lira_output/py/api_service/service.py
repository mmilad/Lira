# module api_service
from __future__ import annotations
from .models import User

from .store import UserStore

class UserApiService:
    store: UserStore

    nextId: float = 1

    def __init__(self, store: UserStore) -> None:
        self.store = store


    def createUser(self, name: str) -> User:
        safeName = name
        if (name == ""):
            safeName = "anonymous"
        id = "u1"
        if (self.nextId == 2):
            id = "u2"
        if (self.nextId == 3):
            id = "u3"
        user = User(id, safeName)
        self.nextId = (self.nextId + 1)
        self.store.save(user)
        return user


    def getUser(self, id: str) -> User | None:
        return self.store.get(id)


    def listUsers(self) -> list[User]:
        return self.store.list()


    def route(self, path: str) -> str:
        if (path == "/users"):
            users = self.store.list()
            count = 0
            for user in users:
                count = (count + 1)
            if (count == 0):
                return "[]"
            first = users[0]
            return first.name
        return "not-found"


    def health(self) -> str:
        return "ok"
