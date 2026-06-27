import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entities/tasks.entity';
import { In, Repository } from 'typeorm';
import { CreateTaskDto } from './dto/tasks.dto';
import { UpdateTaskDto } from './dto/tasks-update.dto';
import { User } from 'src/users/entities/users.entity';
import { Tag } from 'src/tags/entities/tags.entity';
import { TaskHistory } from 'src/task-history/entities/task-history.entity';
import { MailQueueService } from 'src/mail/mail-queue.service';
import { TaskStatus } from 'src/enums/task-status.enum';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
    @InjectRepository(TaskHistory)
    private readonly historyRepository: Repository<TaskHistory>,
    private readonly mailQueueService: MailQueueService,
  ) {}

  async create(dto: CreateTaskDto) {
    const responsible = await this.findResponsible(dto.responsibleId);
    const tags = await this.findTags(dto.tagIds);

    const task = this.tasksRepository.create({
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      responsible,
      tags,
    });

    const savedTask = await this.tasksRepository.save(task);

    await this.mailQueueService.enqueueTaskCreatedEmail({
      taskId: savedTask.id,
      taskTitle: savedTask.title,
      responsibleName: responsible.name,
      responsibleEmail: responsible.email,
    });

    await this.enqueueDueSoonEmailIfNeeded(savedTask);

    return savedTask;
  }

  findAll() {
    return this.tasksRepository.find({
      relations: {
        responsible: true,
        tags: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number) {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: {
        responsible: true,
        tags: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    return task;
  }

  async findHistory(id: number) {
    await this.findOne(id);

    return this.historyRepository.find({
      where: {
        task: {
          id,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async update(id: number, dto: UpdateTaskDto) {
    const task = await this.findOne(id);
    const previousStatus = task.status;

    if (dto.responsibleId !== undefined) {
      task.responsible = await this.findResponsible(dto.responsibleId);
    }

    if (dto.tagIds !== undefined) {
      task.tags = await this.findTags(dto.tagIds);
    }

    if (dto.title !== undefined) {
      task.title = dto.title;
    }

    if (dto.description !== undefined) {
      task.description = dto.description;
    }

    if (dto.priority !== undefined) {
      task.priority = dto.priority;
    }

    if (dto.status !== undefined) {
      task.status = dto.status;
    }

    if (dto.dueDate !== undefined) {
      task.dueDate = new Date(dto.dueDate);
    }

    const savedTask = await this.tasksRepository.save(task);

    if (dto.status !== undefined && dto.status !== previousStatus) {
      await this.historyRepository.save(
        this.historyRepository.create({
          task: savedTask,
          oldStatus: previousStatus,
          newStatus: dto.status,
        }),
      );

      await this.mailQueueService.enqueueTaskStatusChangedEmail({
        taskId: savedTask.id,
        taskTitle: savedTask.title,
        responsibleName: savedTask.responsible.name,
        responsibleEmail: savedTask.responsible.email,
        oldStatus: previousStatus,
        newStatus: dto.status,
      });
    }

    if (dto.dueDate !== undefined) {
      await this.enqueueDueSoonEmailIfNeeded(savedTask);
    }

    return savedTask;
  }

  async remove(id: number) {
    const task = await this.findOne(id);
    await this.tasksRepository.remove(task);

    return {
      id,
      deleted: true,
    };
  }

  private async findResponsible(id: number) {
    const responsible = await this.usersRepository.findOne({
      where: { id },
    });

    if (!responsible) {
      throw new NotFoundException('Responsável não encontrado');
    }

    return responsible;
  }

  private async findTags(ids?: number[]) {
    if (!ids?.length) {
      return [];
    }

    const tags = await this.tagsRepository.findBy({
      id: In(ids),
    });

    if (tags.length !== ids.length) {
      throw new NotFoundException('Uma ou mais tags não foram encontradas');
    }

    return tags;
  }

  private async enqueueDueSoonEmailIfNeeded(task: Task) {
    if (!task.dueDate || task.status === TaskStatus.DONE) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    if (dueDate < today || dueDate > nextWeek) {
      return;
    }

    await this.mailQueueService.enqueueTaskDueSoonEmail({
      taskId: task.id,
      taskTitle: task.title,
      responsibleName: task.responsible.name,
      responsibleEmail: task.responsible.email,
      dueDate: task.dueDate.toISOString(),
    });
  }
}
