import { apiRequest } from "./client";
import type {
  CreateTaskPayload,
  Task,
  TaskHistory,
  UpdateTaskPayload,
} from "./types";

export function listTasks(token: string) {
  return apiRequest<Task[]>("/tasks", {
    token,
  });
}

export function createTask(token: string, payload: CreateTaskPayload) {
  if (payload.attachments?.length) {
    return apiRequest<Task>("/tasks", {
      token,
      method: "POST",
      body: buildTaskFormData(payload),
    });
  }

  return apiRequest<Task>("/tasks", {
    token,
    method: "POST",
    body: JSON.stringify(stripAttachments(payload)),
  });
}

export function updateTask(
  token: string,
  taskId: number,
  payload: UpdateTaskPayload
) {
  if (payload.attachments?.length) {
    return apiRequest<Task>(`/tasks/${taskId}`, {
      token,
      method: "PATCH",
      body: buildTaskFormData(payload),
    });
  }

  return apiRequest<Task>(`/tasks/${taskId}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(stripAttachments(payload)),
  });
}

export function deleteTask(token: string, taskId: number) {
  return apiRequest<{ id: number; deleted: boolean }>(`/tasks/${taskId}`, {
    token,
    method: "DELETE",
  });
}

export function listTaskHistory(token: string, taskId: number) {
  return apiRequest<TaskHistory[]>(`/tasks/${taskId}/history`, {
    token,
  });
}

function buildTaskFormData(payload: CreateTaskPayload | UpdateTaskPayload) {
  const formData = new FormData();

  Object.entries(stripAttachments(payload)).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    formData.append(
      key,
      Array.isArray(value) ? JSON.stringify(value) : String(value)
    );
  });

  payload.attachments?.forEach((file) => {
    formData.append("attachments", file);
  });

  return formData;
}

function stripAttachments<T extends { attachments?: File[] }>(payload: T) {
  const rest = { ...payload };
  delete rest.attachments;

  return rest;
}
