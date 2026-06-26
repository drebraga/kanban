import { apiRequest } from "./client";
import type { User } from "./types";

export function listUsers(token: string) {
  return apiRequest<User[]>("/users", {
    token,
  });
}
