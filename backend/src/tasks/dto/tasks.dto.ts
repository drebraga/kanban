import { TaskPriority } from 'src/enums/task-priority.enum';

export class CreateTaskDto {
  title!: string;

  description?: string;

  priority!: TaskPriority;

  dueDate?: Date;

  responsibleId!: number;

  tagIds?: number[];
}
