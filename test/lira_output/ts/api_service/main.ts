// module api_main
import { UserApiService } from "./service";

import { InMemoryUserStore } from "./memory_store";

export function main(): void {
  let store = new InMemoryUserStore();
  let api = new UserApiService(store);
  console.log("api: starting user-service");
  console.log(api.health());
  let alice = api.createUser("alice");
  console.log(alice.name);
  let bob = api.createUser("bob");
  console.log(bob.name);
  let found = api.getUser(alice.id);
  if ((found == null)) {
    console.log("missing");
  } else {
    console.log(found.name);
  }
  let routeResult = api.route("/users");
  console.log(routeResult);
  let users = api.listUsers();
  for (const user of users) {
    console.log(user.name);
  }
}


main();
