// module f4_call_construct
import { User } from "./user";

export function boot(other: User): User {
  let user = new User("Ada");
  user.greet(other.name);
  return user;
}
