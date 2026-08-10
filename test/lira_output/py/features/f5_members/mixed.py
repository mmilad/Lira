# module f5_members
class Account:
    name = "anon"

    secret

    version = 1

    def ping(self) -> str:
        return "ok"


    @staticmethod
    def normalize(value: str) -> str:
        return value
