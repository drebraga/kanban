import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Task } from "@/lib/api/types";

import { statusLabels } from "./kanban.constants";

export function DeleteTaskDialog({
  task,
  isUpdating,
  onOpenChange,
  onConfirm,
}: {
  task: Task | null;
  isUpdating: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (task: Task) => void;
}) {
  return (
    <Dialog open={!!task} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir tarefa</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir este card? Essa ação não poderá ser
            desfeita.
          </DialogDescription>
        </DialogHeader>

        {task ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-semibold">{task.title}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {statusLabels[task.status]}
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => task && onConfirm(task)}
            disabled={isUpdating}
          >
            {isUpdating ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
