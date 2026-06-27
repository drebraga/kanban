import { useDroppable } from "@dnd-kit/core";

import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/api/types";

import { columns } from "./kanban.constants";
import { KanbanTaskCard } from "./kanban-task-card";

export function KanbanColumn({
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
