// module api_memory_store
import { User } from "./models";

import { UserStore } from "./store";

export class InMemoryUserStore implements UserStore {
  private users: User[] = [];
  public get(id: string): User | null {
    for (const user of this.users) {
      if ((user.id == id)) {
        return user;
      }
    }
    return null;
  }
  public save(user: User): User {
    this.users.push(user);
    return user;
  }
  public list(): User[] {
    return this.users;
  }
}
