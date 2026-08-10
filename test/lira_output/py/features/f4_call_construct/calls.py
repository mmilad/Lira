# module f4_call_construct
from "./user" import User

def boot(other: User) -> User:
    user = User("Ada")
    user.greet(other.name)
    return user
