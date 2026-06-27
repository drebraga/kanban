import type { TaskPriority } from "@/lib/api/types";

export type TaskForm = {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  responsibleId: string;
  tagIds: string[];
  attachments: File[];
};

export type BoardView = "board" | "analytics";

export const initialTaskForm: TaskForm = {
  title: "",
  description: "",
  priority: "MEDIUM",
  dueDate: "",
  responsibleId: "",
  tagIds: [],
  attachments: [],
};
