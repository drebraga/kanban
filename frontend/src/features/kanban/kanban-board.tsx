"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListChecks,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import {
  createTask,
  deleteTask,
  listTaskHistory,
  listTasks,
  updateTask,
} from "@/lib/api/tasks";
import { createTag, deleteTag, listTags } from "@/lib/api/tags";
import { listUsers } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import type {
  CreateTaskPayload,
  Tag,
  Task,
  TaskHistory,
  TaskPriority,
  TaskStatus,
  User,
} from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  attachments: File[];
};

export type BoardView = "board" | "analytics";

const initialTaskForm: TaskForm = {
  title: "",
  description: "",
  priority: "MEDIUM",
  dueDate: "",
  responsibleId: "",
  tagIds: [],
  attachments: [],
};

const statusByDroppableId = columns.reduce<Record<string, TaskStatus>>(
  (acc, column) => ({
    ...acc,
    [`column-${column.status}`]: column.status,
  }),
  {}
);

const statusLabels = columns.reduce<Record<TaskStatus, string>>(
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

const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

type AnalyticsPeriod = "ALL" | "7" | "30" | "90";

const analyticsPeriods: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "ALL", label: "Todo período" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

export function KanbanBoard({
  token,
  activeView,
}: {
  token: string;
  activeView: BoardView;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState<TaskForm>(initialTaskForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isTagSaving, setIsTagSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<TaskForm>(initialTaskForm);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  const historyListRef = useRef<HTMLOListElement | null>(null);
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

  useEffect(() => {
    const historyList = historyListRef.current;

    if (!historyList) {
      return;
    }

    historyList.scrollTop = historyList.scrollHeight;
  }, [taskHistory, isHistoryLoading]);

  function updateForm<K extends keyof TaskForm>(field: K, value: TaskForm[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateEditForm<K extends keyof TaskForm>(
    field: K,
    value: TaskForm[K]
  ) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function openEditTask(task: Task) {
    setEditingTask(task);
    setTaskHistory([]);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      responsibleId: task.responsible ? String(task.responsible.id) : "",
      tagIds: task.tags?.map((tag) => String(tag.id)) ?? [],
      attachments: [],
    });

    setIsHistoryLoading(true);

    try {
      const history = await listTaskHistory(token, task.id);
      setTaskHistory(history);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o histórico da tarefa."
      );
    } finally {
      setIsHistoryLoading(false);
    }
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
      attachments: form.attachments,
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

  async function handleUpdateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTask) {
      return;
    }

    if (!editForm.responsibleId && !editingTask.responsible) {
      setError("Selecione um responsável para atualizar a tarefa.");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const updatedTask = await updateTask(token, editingTask.id, {
        title: editForm.title || editingTask.title,
        description:
          editForm.description || editingTask.description || undefined,
        status: editingTask.status,
        priority: editForm.priority || editingTask.priority,
        dueDate:
          editForm.dueDate ||
          (editingTask.dueDate ? editingTask.dueDate.slice(0, 10) : undefined),
        responsibleId: Number(
          editForm.responsibleId || editingTask.responsible?.id
        ),
        tagIds: editForm.tagIds.map(Number),
        attachments: editForm.attachments,
      });

      setTasks((current) =>
        current.map((task) => (task.id === updatedTask.id ? updatedTask : task))
      );
      setEditingTask(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar a tarefa."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteTask(taskToRemove?: Task) {
    const task = taskToRemove ?? editingTask;

    if (!task) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await deleteTask(token, task.id);
      setTasks((current) =>
        current.filter((currentTask) => currentTask.id !== task.id)
      );

      if (!taskToRemove || editingTask?.id === task.id) {
        setEditingTask(null);
      }
      setTaskToDelete(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a tarefa."
      );
    } finally {
      setIsUpdating(false);
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

  function toggleEditTag(tagId: number) {
    const value = String(tagId);
    updateEditForm(
      "tagIds",
      editForm.tagIds.includes(value)
        ? editForm.tagIds.filter((id) => id !== value)
        : [...editForm.tagIds, value]
    );
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = tagName.trim();

    if (!normalizedName) {
      return;
    }

    setIsTagSaving(true);
    setError(null);

    try {
      const tag = await createTag(token, normalizedName);
      setTags((current) =>
        [...current, tag].sort((first, second) =>
          first.name.localeCompare(second.name)
        )
      );
      setTagName("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível criar a tag."
      );
    } finally {
      setIsTagSaving(false);
    }
  }

  async function handleDeleteTag(tag: Tag) {
    setIsTagSaving(true);
    setError(null);

    try {
      await deleteTag(token, tag.id);
      setTags((current) => current.filter((currentTag) => currentTag.id !== tag.id));
      setForm((current) => ({
        ...current,
        tagIds: current.tagIds.filter((id) => id !== String(tag.id)),
      }));
      setEditForm((current) => ({
        ...current,
        tagIds: current.tagIds.filter((id) => id !== String(tag.id)),
      }));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a tag."
      );
    } finally {
      setIsTagSaving(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col gap-4 px-5 py-6">
      {error ? (
        <p className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {activeView === "analytics" ? (
        <KanbanAnalytics isLoading={isLoading} tasks={tasks} users={users} />
      ) : (
        <div className="grid flex-1 gap-4 xl:grid-cols-[1fr_320px]">
          <div className="flex min-h-[calc(100vh-169px)] flex-col rounded-lg border border-zinc-200 bg-white p-5">
            <div className="shrink-0">
              <h1 className="text-2xl font-semibold tracking-normal">
                Quadro Kanban
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                Visualize as tarefas por status e avance cards entre colunas.
              </p>
            </div>

            {isLoading ? (
              <div className="flex min-h-72 flex-1 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-zinc-500" />
              </div>
            ) : (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="mt-6 grid flex-1 items-start gap-3 lg:grid-cols-4">
                  {columns.map((column) => (
                    <KanbanColumn
                      key={column.status}
                    column={column}
                    tasks={tasksByStatus[column.status]}
                    onEditTask={(task) => void openEditTask(task)}
                    onDeleteTask={setTaskToDelete}
                  />
                  ))}
                </div>
              </DndContext>
            )}
          </div>

          <aside className="self-start rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Plus className="size-4" />
          <p className="text-sm font-semibold">Nova tarefa</p>
        </div>

        <form className="mt-3 grid gap-2.5" onSubmit={handleCreateTask}>
          <label className="grid gap-1 text-sm font-medium">
            Título
            <Input
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              required
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Descrição
            <Textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              rows={3}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
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

          <label className="grid gap-1 text-sm font-medium">
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

          <label className="grid gap-1 text-sm font-medium">
            Data de entrega
            <Input
              type="date"
              value={form.dueDate}
              onChange={(event) => updateForm("dueDate", event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Anexos
            <Input
              type="file"
              multiple
              onChange={(event) =>
                updateForm(
                  "attachments",
                  Array.from(event.target.files ?? [])
                )
              }
            />
          </label>

          {form.attachments.length ? (
            <AttachmentSelection files={form.attachments} />
          ) : null}

          {tags.length ? (
            <div className="grid gap-1.5">
              <p className="text-sm font-medium">Tags</p>
              <div className="flex flex-wrap gap-1.5">
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

          <Button className="h-9" disabled={isSaving || !users.length}>
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

        <div className="mt-4 border-t border-zinc-200 pt-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Tags</p>
          </div>

          <form className="mt-2 flex gap-2" onSubmit={handleCreateTag}>
            <Input
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              placeholder="Nova tag"
            />
            <Button
              size="icon"
              disabled={isTagSaving || !tagName.trim()}
              aria-label="Criar tag"
            >
              {isTagSaving ? <Loader2 className="animate-spin" /> : <Plus />}
            </Button>
          </form>

          {tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700"
                >
                  {tag.name}
                  <button
                    type="button"
                    className="cursor-pointer text-zinc-400 hover:text-red-600"
                    onClick={() => void handleDeleteTag(tag)}
                    aria-label={`Excluir tag ${tag.name}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Nenhuma tag cadastrada.
            </p>
          )}
        </div>
          </aside>
        </div>
      )}

      <Dialog
        open={!!editingTask}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTask(null);
            setTaskHistory([]);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar tarefa</DialogTitle>
            <DialogDescription>
              Atualize os campos do card selecionado.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-3" onSubmit={handleUpdateTask}>
            <label className="grid gap-1.5 text-sm font-medium">
              Título
              <Input
                value={editForm.title}
                onChange={(event) => updateEditForm("title", event.target.value)}
                required
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Descrição
              <Textarea
                value={editForm.description}
                onChange={(event) =>
                  updateEditForm("description", event.target.value)
                }
                rows={4}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Responsável
                <select
                  className="h-8 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm outline-none focus:border-zinc-500"
                  value={editForm.responsibleId}
                  onChange={(event) =>
                    updateEditForm("responsibleId", event.target.value)
                  }
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
                  value={editForm.priority}
                  onChange={(event) =>
                    updateEditForm(
                      "priority",
                      event.target.value as TaskPriority
                    )
                  }
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Status
                <select
                  className="h-8 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm outline-none focus:border-zinc-500"
                  value={editingTask?.status ?? "TODO"}
                  onChange={(event) => {
                    if (!editingTask) {
                      return;
                    }

                    setEditingTask({
                      ...editingTask,
                      status: event.target.value as TaskStatus,
                    });
                  }}
                >
                  {columns.map((column) => (
                    <option key={column.status} value={column.status}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm font-medium">
                Data de entrega
                <Input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(event) =>
                    updateEditForm("dueDate", event.target.value)
                  }
                />
              </label>
            </div>

            <div className="grid gap-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Novos anexos
                <Input
                  type="file"
                  multiple
                  onChange={(event) =>
                    updateEditForm(
                      "attachments",
                      Array.from(event.target.files ?? [])
                    )
                  }
                />
              </label>

              {editForm.attachments.length ? (
                <AttachmentSelection files={editForm.attachments} />
              ) : null}

              {editingTask?.attachments?.length ? (
                <div className="grid gap-1.5">
                  <p className="text-sm font-medium">Anexos atuais</p>
                  <div className="grid gap-1.5">
                    {editingTask.attachments.map((attachment) => (
                      <a
                        key={attachment.fileName}
                        className="inline-flex min-w-0 items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${attachment.url}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Paperclip className="size-3.5 shrink-0" />
                        <span className="truncate">
                          {attachment.originalName}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">Tags</p>
              {tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`rounded-md border px-2 py-1 text-xs font-medium ${
                        editForm.tagIds.includes(String(tag.id))
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-300 bg-white text-zinc-700"
                      }`}
                      onClick={() => toggleEditTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  Nenhuma tag cadastrada.
                </p>
              )}
            </div>

            <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Histórico</p>
                {isHistoryLoading ? (
                  <Loader2 className="size-4 animate-spin text-zinc-500" />
                ) : null}
              </div>

              {taskHistory.length ? (
                <ol
                  ref={historyListRef}
                  className="grid max-h-44 gap-2 overflow-y-auto pr-1"
                >
                  {taskHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-md border border-zinc-200 bg-white p-2"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">
                          {columns.find(
                            (column) => column.status === entry.oldStatus
                          )?.label ?? entry.oldStatus}
                        </Badge>
                        <span className="text-zinc-400">para</span>
                        <Badge variant="secondary">
                          {columns.find(
                            (column) => column.status === entry.newStatus
                          )?.label ?? entry.newStatus}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(entry.createdAt))}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-zinc-500">
                  {isHistoryLoading
                    ? "Carregando movimentações..."
                    : "Nenhuma movimentação registrada."}
                </p>
              )}
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => editingTask && setTaskToDelete(editingTask)}
                disabled={isUpdating}
              >
                <Trash2 />
                Excluir
              </Button>
              <Button disabled={isUpdating}>
                {isUpdating ? <Loader2 className="animate-spin" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!taskToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setTaskToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir tarefa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este card? Essa ação não poderá ser
              desfeita.
            </DialogDescription>
          </DialogHeader>

          {taskToDelete ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-sm font-semibold">{taskToDelete.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {statusLabels[taskToDelete.status]}
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTaskToDelete(null)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => taskToDelete && void handleDeleteTask(taskToDelete)}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function KanbanColumn({
  column,
  tasks,
  onEditTask,
  onDeleteTask,
}: {
  column: (typeof columns)[number];
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column-${column.status}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-full flex-col rounded-lg border p-3 transition-colors ${
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
          <KanbanTaskCard
            key={task.id}
            task={task}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
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

function KanbanAnalytics({
  isLoading,
  tasks,
  users,
}: {
  isLoading: boolean;
  tasks: Task[];
  users: User[];
}) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("ALL");

  const periodStart = useMemo(() => {
    if (period === "ALL") {
      return null;
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - Number(period) + 1);

    return start;
  }, [period]);

  const filteredTasks = useMemo(
    () =>
      periodStart
        ? tasks.filter((task) => new Date(task.createdAt) >= periodStart)
        : tasks,
    [periodStart, tasks]
  );

  const analytics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const total = filteredTasks.length;
    const completed = filteredTasks.filter((task) => task.status === "DONE").length;
    const inProgress = filteredTasks.filter(
      (task) => task.status === "IN_PROGRESS" || task.status === "REVIEW"
    ).length;
    const overdue = filteredTasks.filter((task) => {
      if (!task.dueDate || task.status === "DONE") {
        return false;
      }

      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      return dueDate < today;
    }).length;
    const dueSoon = filteredTasks.filter((task) => {
      if (!task.dueDate || task.status === "DONE") {
        return false;
      }

      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      return dueDate >= today && dueDate <= nextWeek;
    }).length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;

    const statusRows = columns.map((column) => ({
      label: column.label,
      value: filteredTasks.filter((task) => task.status === column.status).length,
    }));

    const priorityRows = priorities.map((priority) => ({
      label: priorityLabels[priority],
      value: filteredTasks.filter((task) => task.priority === priority).length,
    }));

    const responsibleRows = users
      .map((user) => ({
        label: user.name,
        value: filteredTasks.filter((task) => task.responsible?.id === user.id).length,
      }))
      .filter((row) => row.value > 0)
      .sort((first, second) => second.value - first.value);

    const unassignedCount = filteredTasks.filter((task) => !task.responsible).length;

    if (unassignedCount) {
      responsibleRows.push({
        label: "Sem responsável",
        value: unassignedCount,
      });
    }

    const flowDays = period === "ALL" ? 14 : Number(period);
    const flowStart = new Date(today);
    flowStart.setDate(today.getDate() - flowDays + 1);

    const completionFlow = Array.from({ length: flowDays }, (_, index) => {
      const day = new Date(flowStart);
      day.setDate(flowStart.getDate() + index);

      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      return {
        label: new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }).format(day),
        value: filteredTasks.filter((task) => {
          if (task.status !== "DONE") {
            return false;
          }

          const completedAt = new Date(task.updatedAt);

          return completedAt >= day && completedAt < nextDay;
        }).length,
      };
    });

    return {
      total,
      completed,
      completionRate,
      inProgress,
      overdue,
      dueSoon,
      statusRows,
      priorityRows,
      responsibleRows,
      completionFlow,
    };
  }, [filteredTasks, period, users]);

  return (
    <section className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            Dados analíticos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Acompanhe distribuição, prazos e progresso das tarefas do quadro.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <select
            className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as AnalyticsPeriod)
            }
          >
            {analyticsPeriods.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Badge variant="secondary">
            {analytics.total} tarefas · {analytics.completionRate}% concluídas
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsMetric
              icon={ListChecks}
              label="Total de tarefas"
              value={analytics.total}
              detail={`${analytics.inProgress} em andamento/revisão`}
            />
            <AnalyticsMetric
              icon={CheckCircle2}
              label="Concluídas"
              value={`${analytics.completionRate}%`}
              detail={`${analytics.completed} tarefas finalizadas`}
            />
            <AnalyticsMetric
              icon={Clock3}
              label="Próximas do prazo"
              value={analytics.dueSoon}
              detail="Vencem em até 7 dias"
            />
            <AnalyticsMetric
              icon={TriangleAlert}
              label="Atrasadas"
              value={analytics.overdue}
              detail="Pendentes com prazo vencido"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <AnalyticsDistribution
              title="Por status"
              rows={analytics.statusRows}
            />
            <AnalyticsDistribution
              title="Por prioridade"
              rows={analytics.priorityRows}
            />
            <AnalyticsDistribution
              title="Por responsável"
              emptyLabel="Nenhuma tarefa atribuída"
              rows={analytics.responsibleRows}
            />
          </div>

          <AnalyticsFlow rows={analytics.completionFlow} />
        </div>
      )}
    </section>
  );
}

function AttachmentSelection({ files }: { files: File[] }) {
  return (
    <div className="grid gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 p-2">
      {files.map((file) => (
        <div
          key={`${file.name}-${file.size}`}
          className="flex min-w-0 items-center gap-2 text-xs text-zinc-600"
        >
          <Paperclip className="size-3.5 shrink-0" />
          <span className="truncate">{file.name}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
        <Icon className="size-4 text-zinc-500" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}

function AnalyticsDistribution({
  title,
  rows,
  emptyLabel = "Nenhum dado disponível",
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  emptyLabel?: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <BarChart3 className="size-4 text-zinc-400" />
      </div>

      {total ? (
        <div className="grid gap-3">
          {rows.map((row) => {
            const percentage = Math.round((row.value / total) * 100);

            return (
              <div key={row.label} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-zinc-700">
                    {row.label}
                  </span>
                  <span className="shrink-0 text-zinc-500">
                    {row.value} · {percentage}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-zinc-900"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm leading-6 text-zinc-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function AnalyticsFlow({
  rows,
}: {
  rows: Array<{ label: string; value: number }>;
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const visibleRows = rows.filter((_, index) => {
    if (rows.length <= 14) {
      return true;
    }

    return index % Math.ceil(rows.length / 14) === 0 || index === rows.length - 1;
  });

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Fluxo de conclusão</p>
        <CheckCircle2 className="size-4 text-zinc-400" />
      </div>

      <div className="flex h-48 items-end gap-2 overflow-x-auto pb-1">
        {visibleRows.map((row) => {
          const height = row.value ? Math.max((row.value / maxValue) * 100, 8) : 4;

          return (
            <div
              key={row.label}
              className="flex h-full min-w-10 flex-1 flex-col justify-end gap-2"
            >
              <div className="flex flex-1 items-end rounded-md bg-zinc-50 px-1">
                <div
                  className="w-full rounded-t-md bg-zinc-900"
                  style={{ height: `${height}%` }}
                  title={`${row.value} concluídas em ${row.label}`}
                />
              </div>
              <div className="grid gap-0.5 text-center">
                <span className="text-xs font-medium text-zinc-700">
                  {row.value}
                </span>
                <span className="text-[11px] text-zinc-500">{row.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanTaskCard({
  task,
  onEditTask,
  onDeleteTask,
}: {
  task: Task;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
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
      } flex h-52 flex-col`}
      onDoubleClick={() => onEditTask(task)}
      {...listeners}
      {...attributes}
    >
      <div className="min-h-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold leading-5">
              {task.title}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {statusLabels[task.status]}
            </p>
          </div>
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${priorityClasses[task.priority]}`}
          >
            {priorityLabels[task.priority]}
          </span>
        </div>

        {task.tags?.length ? (
          <div className="mt-2 flex max-h-10 flex-wrap gap-1 overflow-hidden">
            {task.tags.map((tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-3 grid gap-2 overflow-hidden text-xs text-zinc-500">
          {task.responsible ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <UserRound className="size-3.5" />
              <span className="truncate">{task.responsible.name}</span>
            </span>
          ) : null}
          {task.dueDate ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              <span className="truncate">
                {new Intl.DateTimeFormat("pt-BR").format(
                  new Date(task.dueDate)
                )}
              </span>
            </span>
          ) : null}
          {task.attachments?.length ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <Paperclip className="size-3.5" />
              <span className="truncate">
                {task.attachments.length} anexo
                {task.attachments.length > 1 ? "s" : ""}
              </span>
            </span>
          ) : null}
        </div>

      </div>

      <div className="mt-3 grid shrink-0 grid-cols-2 gap-1">
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="cursor-pointer"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onEditTask(task)}
        >
          <Pencil />
          Editar
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="xs"
          className="cursor-pointer"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onDeleteTask(task)}
        >
          <Trash2 />
          Excluir
        </Button>
      </div>
    </article>
  );
}
