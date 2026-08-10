// module api_service
import { User } from "./models";

import { UserStore } from "./store";

export class UserApiService {
  private store: UserStore;
  private nextId: number = 1;
  constructor(store: UserStore) {
    this.store = store;
  }
  public createUser(name: string): User {
    let safeName: string = name;
    if ((name == "")) {
      safeName = "anonymous";
    }
    let id: string = "u1";
    if ((this.nextId == 2)) {
      id = "u2";
    }
    if ((this.nextId == 3)) {
      id = "u3";
    }
    let user: User = new User(id, safeName);
    this.nextId = (this.nextId + 1);
    this.store.save(user);
    return user;
  }
  public getUser(id: string): User | null {
    return this.store.get(id);
  }
  public listUsers(): User[] {
    return this.store.list();
  }
  public route(path: string): string {
    if ((path == "/users")) {
      let users: User[] = this.store.list();
      let count: number = 0;
      for (const user of users) {
        count = (count + 1);
      }
      if ((count == 0)) {
        return "[]";
      }
      let first: User = users[0];
      return first.name;
    }
    return "not-found";
  }
  public health(): string {
    return "ok";
  }
}
