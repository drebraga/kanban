import { TaskPriority } from 'src/enums/task-priority.enum';
import { TaskStatus } from 'src/enums/task-status.enum';

export class UpdateTaskDto {
  title?: string;

  description?: string;

  status?: TaskStatus;

  priority?: TaskPriority;

  dueDate?: Date;

  responsibleId?: number;

  tagIds?: number[];
}
