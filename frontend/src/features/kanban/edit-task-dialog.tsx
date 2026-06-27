import { FormEvent, useEffect, useRef } from "react";
import { Loader2, Paperclip, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  Tag,
  Task,
  TaskHistory,
  TaskPriority,
  TaskStatus,
  User,
} from "@/lib/api/types";

import { AttachmentSelection } from "./attachment-selection";
import { columns } from "./kanban.constants";
import type { TaskForm } from "./kanban.types";

export function EditTaskDialog({
  task,
  form,
  users,
  tags,
  history,
  isUpdating,
  isHistoryLoading,
  onOpenChange,
  onFormChange,
  onStatusChange,
  onToggleTag,
  onSubmit,
  onDelete,
}: {
  task: Task | null;
  form: TaskForm;
  users: User[];
  tags: Tag[];
  history: TaskHistory[];
  isUpdating: boolean;
  isHistoryLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: <K extends keyof TaskForm>(field: K, value: TaskForm[K]) => void;
  onStatusChange: (status: TaskStatus) => void;
  onToggleTag: (tagId: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
}) {
  const historyListRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const historyList = historyListRef.current;

    if (!historyList) {
      return;
    }

    historyList.scrollTop = historyList.scrollHeight;
  }, [history, isHistoryLoading]);

  return (
    <Dialog open={!!task} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar tarefa</DialogTitle>
          <DialogDescription>
            Atualize os campos do card selecionado.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-sm font-medium">
            Título
            <Input
              value={form.title}
              onChange={(event) => onFormChange("title", event.target.value)}
              required
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium">
            Descrição
            <Textarea
              value={form.description}
              onChange={(event) =>
                onFormChange("description", event.target.value)
              }
              rows={4}
              required
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Responsável
              <select
                className="h-8 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm outline-none focus:border-zinc-500"
                value={form.responsibleId}
                onChange={(event) =>
                  onFormChange("responsibleId", event.target.value)
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
                value={form.priority}
                onChange={(event) =>
                  onFormChange("priority", event.target.value as TaskPriority)
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
                value={task?.status ?? "TODO"}
                onChange={(event) =>
                  onStatusChange(event.target.value as TaskStatus)
                }
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
                value={form.dueDate}
                onChange={(event) => onFormChange("dueDate", event.target.value)}
                required
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
                  onFormChange(
                    "attachments",
                    Array.from(event.target.files ?? [])
                  )
                }
              />
            </label>

            {form.attachments.length ? (
              <AttachmentSelection files={form.attachments} />
            ) : null}

            {task?.attachments?.length ? (
              <div className="grid gap-1.5">
                <p className="text-sm font-medium">Anexos atuais</p>
                <div className="grid gap-1.5">
                  {task.attachments.map((attachment) => (
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
                      form.tagIds.includes(String(tag.id))
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-300 bg-white text-zinc-700"
                    }`}
                    onClick={() => onToggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Nenhuma tag cadastrada.</p>
            )}
          </div>

          <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Histórico</p>
              {isHistoryLoading ? (
                <Loader2 className="size-4 animate-spin text-zinc-500" />
              ) : null}
            </div>

            {history.length ? (
              <ol
                ref={historyListRef}
                className="grid max-h-44 gap-2 overflow-y-auto pr-1"
              >
                {history.map((entry) => (
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
              onClick={onDelete}
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
  );
}
