"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Loader2 } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { createTag, deleteTag, listTags } from "@/lib/api/tags";
import {
  createTask,
  deleteTask,
  listTaskHistory,
  listTasks,
  updateTask,
} from "@/lib/api/tasks";
import type {
  CreateTaskPayload,
  Tag,
  Task,
  TaskHistory,
  TaskStatus,
  User,
} from "@/lib/api/types";
import { listUsers } from "@/lib/api/users";

import { DeleteTaskDialog } from "./delete-task-dialog";
import { EditTaskDialog } from "./edit-task-dialog";
import { KanbanAnalytics } from "./kanban-analytics";
import { KanbanColumn } from "./kanban-column";
import { columns, statusByDroppableId } from "./kanban.constants";
import {
  BoardView,
  initialTaskForm,
  TaskForm,
} from "./kanban.types";
import { TaskSidebar } from "./task-sidebar";

export type { BoardView } from "./kanban.types";

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
  const [editForm, setEditForm] = useState<TaskForm>(initialTaskForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isTagSaving, setIsTagSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
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

    if (!form.description.trim()) {
      setError("Informe a descrição para criar a tarefa.");
      return;
    }

    if (!form.dueDate) {
      setError("Informe a data de entrega para criar a tarefa.");
      return;
    }

    const payload: CreateTaskPayload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      dueDate: form.dueDate,
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

    if (!editForm.description.trim() && !editingTask.description) {
      setError("Informe a descrição para atualizar a tarefa.");
      return;
    }

    if (!editForm.dueDate && !editingTask.dueDate) {
      setError("Informe a data de entrega para atualizar a tarefa.");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const updatedTask = await updateTask(token, editingTask.id, {
        title: editForm.title || editingTask.title,
        description: editForm.description || editingTask.description || "",
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
      setTags((current) =>
        current.filter((currentTag) => currentTag.id !== tag.id)
      );
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

          <TaskSidebar
            form={form}
            users={users}
            tags={tags}
            tagName={tagName}
            isLoading={isLoading}
            isSaving={isSaving}
            isTagSaving={isTagSaving}
            onFormChange={updateForm}
            onTagNameChange={setTagName}
            onToggleTag={toggleTag}
            onCreateTask={handleCreateTask}
            onCreateTag={handleCreateTag}
            onDeleteTag={(tag) => void handleDeleteTag(tag)}
          />
        </div>
      )}

      <EditTaskDialog
        task={editingTask}
        form={editForm}
        users={users}
        tags={tags}
        history={taskHistory}
        isUpdating={isUpdating}
        isHistoryLoading={isHistoryLoading}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTask(null);
            setTaskHistory([]);
          }
        }}
        onFormChange={updateEditForm}
        onStatusChange={(status) => {
          if (!editingTask) {
            return;
          }

          setEditingTask({
            ...editingTask,
            status,
          });
        }}
        onToggleTag={toggleEditTag}
        onSubmit={handleUpdateTask}
        onDelete={() => editingTask && setTaskToDelete(editingTask)}
      />

      <DeleteTaskDialog
        task={taskToDelete}
        isUpdating={isUpdating}
        onOpenChange={(open) => {
          if (!open) {
            setTaskToDelete(null);
          }
        }}
        onConfirm={(task) => void handleDeleteTask(task)}
      />
    </section>
  );
}
