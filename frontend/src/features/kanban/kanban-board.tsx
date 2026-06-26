"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CalendarDays, Loader2, Plus, RefreshCw, UserRound } from "lucide-react";
import { createTask, listTasks, updateTask } from "@/lib/api/tasks";
import { listTags } from "@/lib/api/tags";
import { listUsers } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import type {
  CreateTaskPayload,
  Tag,
  Task,
  TaskPriority,
  TaskStatus,
  User,
} from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const columns: Array<{ status: TaskStatus; label: string }> = [
  { status: "TODO", label: "A Fazer" },
  { status: "IN_PROGRESS", label: "Em Andamento" },
  { status: "REVIEW", label: "Em Revisão" },
  { status: "DONE", label: "Concluído" },
];

const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

const priorityClasses: Record<TaskPriority, string> = {
  LOW: "border-sky-200 bg-sky-50 text-sky-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  HIGH: "border-red-200 bg-red-50 text-red-700",
};

type TaskForm = {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  responsibleId: string;
  tagIds: string[];
};

const initialTaskForm: TaskForm = {
  title: "",
  description: "",
  priority: "MEDIUM",
  dueDate: "",
  responsibleId: "",
  tagIds: [],
};

const statusByDroppableId = columns.reduce<Record<string, TaskStatus>>(
  (acc, column) => ({
    ...acc,
    [`column-${column.status}`]: column.status,
  }),
  {}
);

export function KanbanBoard({ token }: { token: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState<TaskForm>(initialTaskForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const tasksByStatus = useMemo(
    () =>
      columns.reduce<Record<TaskStatus, Task[]>>(
        (acc, column) => ({
          ...acc,
          [column.status]: tasks.filter((task) => task.status === column.status),
        }),
        {
          TODO: [],
          IN_PROGRESS: [],
          REVIEW: [],
          DONE: [],
        }
      ),
    [tasks]
  );

  const loadBoard = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const [tasksResponse, usersResponse, tagsResponse] = await Promise.all([
        listTasks(token),
        listUsers(token),
        listTags(token),
      ]);

      setTasks(tasksResponse);
      setUsers(usersResponse);
      setTags(tagsResponse);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o quadro."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadBoard();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadBoard]);

  function updateForm<K extends keyof TaskForm>(field: K, value: TaskForm[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.responsibleId) {
      setError("Selecione um responsável para criar a tarefa.");
      return;
    }

    const payload: CreateTaskPayload = {
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      responsibleId: Number(form.responsibleId),
      tagIds: form.tagIds.map(Number),
    };

    setIsSaving(true);
    setError(null);

    try {
      const task = await createTask(token, payload);
      setTasks((current) => [task, ...current]);
      setForm(initialTaskForm);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível criar a tarefa."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMoveTask(task: Task, status: TaskStatus) {
    if (task.status === status) {
      return;
    }

    const previousTasks = tasks;
    setTasks((current) =>
      current.map((currentTask) =>
        currentTask.id === task.id ? { ...currentTask, status } : currentTask
      )
    );

    try {
      const updatedTask = await updateTask(token, task.id, { status });
      setTasks((current) =>
        current.map((currentTask) =>
          currentTask.id === task.id ? updatedTask : currentTask
        )
      );
    } catch (err) {
      setTasks(previousTasks);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível mover a tarefa."
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const taskId = Number(event.active.id);
    const targetStatus = event.over
      ? statusByDroppableId[String(event.over.id)]
      : undefined;

    if (!targetStatus || Number.isNaN(taskId)) {
      return;
    }

    const task = tasks.find((currentTask) => currentTask.id === taskId);

    if (!task) {
      return;
    }

    void handleMoveTask(task, targetStatus);
  }

  function toggleTag(tagId: number) {
    const value = String(tagId);
    updateForm(
      "tagIds",
      form.tagIds.includes(value)
        ? form.tagIds.filter((id) => id !== value)
        : [...form.tagIds, value]
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-4 px-5 py-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Quadro Kanban
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Visualize as tarefas por status e avance cards entre colunas.
            </p>
          </div>
          <Button variant="outline" onClick={loadBoard} disabled={isLoading}>
            <RefreshCw className={isLoading ? "animate-spin" : undefined} />
            Atualizar
          </Button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="mt-6 grid gap-3 lg:grid-cols-4">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.status}
                  column={column}
                  tasks={tasksByStatus[column.status]}
                  onMoveTask={handleMoveTask}
                />
              ))}
            </div>
          </DndContext>
        )}
      </div>

      <aside className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Plus className="size-4" />
          <p className="text-sm font-semibold">Nova tarefa</p>
        </div>

        <form className="mt-4 grid gap-3" onSubmit={handleCreateTask}>
          <label className="grid gap-1.5 text-sm font-medium">
            Título
            <Input
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              required
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium">
            Descrição
            <Textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              rows={4}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium">
            Responsável
            <select
              className="h-8 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm outline-none focus:border-zinc-500"
              value={form.responsibleId}
              onChange={(event) => updateForm("responsibleId", event.target.value)}
              required
            >
              <option value="">Selecione</option>
              {users.map((responsible) => (
                <option key={responsible.id} value={responsible.id}>
                  {responsible.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-medium">
            Prioridade
            <select
              className="h-8 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm outline-none focus:border-zinc-500"
              value={form.priority}
              onChange={(event) =>
                updateForm("priority", event.target.value as TaskPriority)
              }
            >
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-medium">
            Data de entrega
            <Input
              type="date"
              value={form.dueDate}
              onChange={(event) => updateForm("dueDate", event.target.value)}
            />
          </label>

          {tags.length ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium">Tags</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={`rounded-md border px-2 py-1 text-xs font-medium ${
                      form.tagIds.includes(String(tag.id))
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-300 bg-white text-zinc-700"
                    }`}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <Button className="h-10" disabled={isSaving || !users.length}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Plus />}
            Criar tarefa
          </Button>

          {!users.length && !isLoading ? (
            <p className="text-xs leading-5 text-zinc-500">
              Cadastre ou mantenha ao menos um usuário disponível para criar
              tarefas.
            </p>
          ) : null}
        </form>
      </aside>
    </section>
  );
}

function KanbanColumn({
  column,
  tasks,
  onMoveTask,
}: {
  column: (typeof columns)[number];
  tasks: Task[];
  onMoveTask: (task: Task, status: TaskStatus) => Promise<void>;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column-${column.status}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-72 flex-col rounded-lg border p-3 transition-colors ${
        isOver
          ? "border-zinc-500 bg-zinc-100"
          : "border-zinc-200 bg-zinc-50"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{column.label}</p>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>

      <div className="grid gap-3">
        {tasks.map((task) => (
          <KanbanTaskCard key={task.id} task={task} onMoveTask={onMoveTask} />
        ))}

        {!tasks.length ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
            Sem tarefas
          </div>
        ) : null}
      </div>
    </div>
  );
}

function KanbanTaskCard({
  task,
  onMoveTask,
}: {
  task: Task;
  onMoveTask: (task: Task, status: TaskStatus) => Promise<void>;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useDraggable({
      id: task.id,
    });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      className={`rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-shadow ${
        isDragging ? "z-10 opacity-80 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        className="w-full cursor-grab text-left active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold leading-5">{task.title}</h2>
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${priorityClasses[task.priority]}`}
          >
            {priorityLabels[task.priority]}
          </span>
        </div>
      </button>

      {task.description ? (
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-600">
          {task.description}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 text-xs text-zinc-500">
        {task.responsible ? (
          <span className="flex items-center gap-1.5">
            <UserRound className="size-3.5" />
            {task.responsible.name}
          </span>
        ) : null}
        {task.dueDate ? (
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {new Intl.DateTimeFormat("pt-BR").format(new Date(task.dueDate))}
          </span>
        ) : null}
      </div>

      {task.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <Badge key={tag.id} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-1">
        {columns
          .filter((targetColumn) => targetColumn.status !== task.status)
          .slice(0, 3)
          .map((targetColumn) => (
            <Button
              key={targetColumn.status}
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => void onMoveTask(task, targetColumn.status)}
            >
              {targetColumn.label}
            </Button>
          ))}
      </div>
    </article>
  );
}
