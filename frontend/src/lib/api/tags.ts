import { apiRequest } from "./client";
import type { Tag } from "./types";

export function listTags(token: string) {
  return apiRequest<Tag[]>("/tags", {
    token,
  });
}

export function createTag(token: string, name: string) {
  return apiRequest<Tag>("/tags", {
    token,
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deleteTag(token: string, tagId: number) {
  return apiRequest<{ id: number; deleted: boolean }>(`/tags/${tagId}`, {
    token,
    method: "DELETE",
  });
}
