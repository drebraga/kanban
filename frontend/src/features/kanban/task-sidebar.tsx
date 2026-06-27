import { FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Tag, TaskPriority, User } from "@/lib/api/types";

import { AttachmentSelection } from "./attachment-selection";
import type { TaskForm } from "./kanban.types";

export function TaskSidebar({
  form,
  users,
  tags,
  tagName,
  isLoading,
  isSaving,
  isTagSaving,
  onFormChange,
  onTagNameChange,
  onToggleTag,
  onCreateTask,
  onCreateTag,
  onDeleteTag,
}: {
  form: TaskForm;
  users: User[];
  tags: Tag[];
  tagName: string;
  isLoading: boolean;
  isSaving: boolean;
  isTagSaving: boolean;
  onFormChange: <K extends keyof TaskForm>(field: K, value: TaskForm[K]) => void;
  onTagNameChange: (value: string) => void;
  onToggleTag: (tagId: number) => void;
  onCreateTask: (event: FormEvent<HTMLFormElement>) => void;
  onCreateTag: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteTag: (tag: Tag) => void;
}) {
  return (
    <aside className="self-start rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Plus className="size-4" />
        <p className="text-sm font-semibold">Nova tarefa</p>
      </div>

      <form className="mt-3 grid gap-2.5" onSubmit={onCreateTask}>
        <label className="grid gap-1 text-sm font-medium">
          Título
          <Input
            value={form.title}
            onChange={(event) => onFormChange("title", event.target.value)}
            required
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Descrição
          <Textarea
            value={form.description}
            onChange={(event) =>
              onFormChange("description", event.target.value)
            }
            rows={3}
            required
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
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

        <label className="grid gap-1 text-sm font-medium">
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

        <label className="grid gap-1 text-sm font-medium">
          Data de entrega
          <Input
            type="date"
            value={form.dueDate}
            onChange={(event) => onFormChange("dueDate", event.target.value)}
            required
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Anexos
          <Input
            type="file"
            multiple
            onChange={(event) =>
              onFormChange("attachments", Array.from(event.target.files ?? []))
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
                  onClick={() => onToggleTag(tag.id)}
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

        <form className="mt-2 flex gap-2" onSubmit={onCreateTag}>
          <Input
            value={tagName}
            onChange={(event) => onTagNameChange(event.target.value)}
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
                  onClick={() => onDeleteTag(tag)}
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
  );
}
