import type { TaskPriority, TaskStatus } from "@/lib/api/types";

export const columns: Array<{ status: TaskStatus; label: string }> = [
  { status: "TODO", label: "A Fazer" },
  { status: "IN_PROGRESS", label: "Em Andamento" },
  { status: "REVIEW", label: "Em Revisão" },
  { status: "DONE", label: "Concluído" },
];

export const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export const priorityClasses: Record<TaskPriority, string> = {
  LOW: "border-sky-200 bg-sky-50 text-sky-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  HIGH: "border-red-200 bg-red-50 text-red-700",
};

export const statusByDroppableId = columns.reduce<Record<string, TaskStatus>>(
  (acc, column) => ({
    ...acc,
    [`column-${column.status}`]: column.status,
  }),
  {}
);

export const statusLabels = columns.reduce<Record<TaskStatus, string>>(
  (acc, column) => ({
    ...acc,
    [column.status]: column.label,
  }),
  {
    TODO: "A Fazer",
    IN_PROGRESS: "Em Andamento",
    REVIEW: "Em Revisão",
    DONE: "Concluído",
  }
);

export type AnalyticsPeriod = "ALL" | "7" | "30" | "90";

export const analyticsPeriods: Array<{
  value: AnalyticsPeriod;
  label: string;
}> = [
  { value: "ALL", label: "Todo período" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];
