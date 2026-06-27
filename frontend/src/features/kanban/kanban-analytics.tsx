"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  ListChecks,
  Loader2,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Task, User } from "@/lib/api/types";

import {
  analyticsPeriods,
  AnalyticsPeriod,
  columns,
  priorities,
  priorityLabels,
} from "./kanban.constants";

export function KanbanAnalytics({
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
