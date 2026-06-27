import { useDraggable } from "@dnd-kit/core";
import { CalendarDays, Paperclip, Pencil, Trash2, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/api/types";

import {
  priorityClasses,
  priorityLabels,
  statusLabels,
} from "./kanban.constants";

export function KanbanTaskCard({
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
