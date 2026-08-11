# module api_main
from __future__ import annotations
from .service import UserApiService

from .memory_store import InMemoryUserStore

def main() -> None:
    store = InMemoryUserStore()
    api = UserApiService(store)
    print("api: starting user-service")
    print(api.health())
    alice = api.createUser("alice")
    print(alice.name)
    bob = api.createUser("bob")
    print(bob.name)
    found = api.getUser(alice.id)
    if (found == None):
        print("missing")
    else:
        print(found.name)
    routeResult = api.route("/users")
    print(routeResult)
    users = api.listUsers()
    for user in users:
        print(user.name)


if __name__ == "__main__":
    main()
