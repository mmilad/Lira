# module f5_members
from __future__ import annotations
class Account:
    name = "anon"

    secret

    version = 1

    def ping(self) -> str:
        return "ok"


    @staticmethod
    def normalize(value: str) -> str:
        return value
