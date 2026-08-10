# module f5_members
class Account:
    name: object = "anon"

    secret: object

    version: object = 1

    def ping(self) -> str:
        return "ok"


    @staticmethod
    def normalize(value: str) -> str:
        return value
