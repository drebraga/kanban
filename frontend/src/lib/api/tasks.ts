import { apiRequest } from "./client";
import type { CreateTaskPayload, Task, UpdateTaskPayload } from "./types";

export function listTasks(token: string) {
  return apiRequest<Task[]>("/tasks", {
    token,
  });
}

export function createTask(token: string, payload: CreateTaskPayload) {
  return apiRequest<Task>("/tasks", {
    token,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTask(
  token: string,
  taskId: number,
  payload: UpdateTaskPayload
) {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
