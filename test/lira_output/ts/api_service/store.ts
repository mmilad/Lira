// module api_store
import { User } from "./models";

export interface UserStore {
  get(id: string): User | null;
  save(user: User): User;
  list(): User[];
}
