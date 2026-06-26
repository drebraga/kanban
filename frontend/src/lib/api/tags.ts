import { apiRequest } from "./client";
import type { Tag } from "./types";

export function listTags(token: string) {
  return apiRequest<Tag[]>("/tags", {
    token,
  });
}
