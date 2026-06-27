export type User = {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  name: string;
};

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type Tag = {
  id: number;
  name: string;
};

export type TaskAttachment = {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
};

export type Task = {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  responsible?: User | null;
  tags?: Tag[];
  attachments?: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type TaskHistory = {
  id: number;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
  createdAt: string;
};

export type CreateTaskPayload = {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  responsibleId: number;
  tagIds?: number[];
  attachments?: File[];
};

export type UpdateTaskPayload = Partial<CreateTaskPayload> & {
  status?: TaskStatus;
};
