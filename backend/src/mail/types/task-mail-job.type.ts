import { TaskStatus } from 'src/enums/task-status.enum';

export type TaskCreatedMailJob = {
  taskId: number;
  taskTitle: string;
  responsibleName: string;
  responsibleEmail: string;
};

export type TaskStatusChangedMailJob = TaskCreatedMailJob & {
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
};

export type TaskMailJob = TaskCreatedMailJob | TaskStatusChangedMailJob;
