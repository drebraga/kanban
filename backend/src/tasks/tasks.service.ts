import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entities/tasks.entity';
import { In, Repository } from 'typeorm';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { CreateTaskDto } from './dto/tasks.dto';
import { UpdateTaskDto } from './dto/tasks-update.dto';
import { User } from 'src/users/entities/users.entity';
import { Tag } from 'src/tags/entities/tags.entity';
import { TaskHistory } from 'src/task-history/entities/task-history.entity';
import { MailQueueService } from 'src/mail/mail-queue.service';
import { TaskStatus } from 'src/enums/task-status.enum';
import { TaskAttachment } from './types/task-attachment.type';
import { UploadedTaskFile } from './types/uploaded-task-file.type';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

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

  async create(dto: CreateTaskDto, files: UploadedTaskFile[] = []) {
    try {
      const responsible = await this.findResponsible(dto.responsibleId);
      const tags = await this.findTags(dto.tagIds);

      const task = this.tasksRepository.create({
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        responsible,
        tags,
        attachments: this.mapAttachments(files),
      });

      const savedTask = await this.tasksRepository.save(task);

      await this.runMailQueueOperation(() =>
        this.mailQueueService.enqueueTaskCreatedEmail({
          taskId: savedTask.id,
          taskTitle: savedTask.title,
          responsibleName: responsible.name,
          responsibleEmail: responsible.email,
        }),
      );

      await this.scheduleDueSoonEmail(savedTask);

      return savedTask;
    } catch (error) {
      await this.deleteUploadedFiles(files);
      throw error;
    }
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

  async update(id: number, dto: UpdateTaskDto, files: UploadedTaskFile[] = []) {
    try {
      const task = await this.findOne(id);
      const previousStatus = task.status;
      const previousResponsibleId = task.responsible?.id;

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

      if (files.length) {
        task.attachments = [
          ...(task.attachments ?? []),
          ...this.mapAttachments(files),
        ];
      }

      const savedTask = await this.tasksRepository.save(task);

      if (dto.status !== undefined && dto.status !== previousStatus) {
        const newStatus = dto.status;

        await this.historyRepository.save(
          this.historyRepository.create({
            task: savedTask,
            oldStatus: previousStatus,
            newStatus,
          }),
        );

        await this.runMailQueueOperation(() =>
          this.mailQueueService.enqueueTaskStatusChangedEmail({
            taskId: savedTask.id,
            taskTitle: savedTask.title,
            responsibleName: savedTask.responsible.name,
            responsibleEmail: savedTask.responsible.email,
            oldStatus: previousStatus,
            newStatus,
          }),
        );
      }

      if (
        dto.responsibleId !== undefined &&
        savedTask.responsible.id !== previousResponsibleId
      ) {
        await this.runMailQueueOperation(() =>
          this.mailQueueService.enqueueTaskCreatedEmail({
            taskId: savedTask.id,
            taskTitle: savedTask.title,
            responsibleName: savedTask.responsible.name,
            responsibleEmail: savedTask.responsible.email,
          }),
        );
      }

      if (
        dto.dueDate !== undefined ||
        dto.responsibleId !== undefined ||
        dto.status !== undefined
      ) {
        await this.scheduleDueSoonEmail(savedTask);
      }

      return savedTask;
    } catch (error) {
      await this.deleteUploadedFiles(files);
      throw error;
    }
  }

  async remove(id: number) {
    const task = await this.findOne(id);
    await this.runMailQueueOperation(() =>
      this.mailQueueService.cancelTaskDueSoonEmail(task.id),
    );
    await this.tasksRepository.remove(task);
    await this.deleteExistingAttachments(task.attachments ?? []);

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

  private mapAttachments(files: UploadedTaskFile[]): TaskAttachment[] {
    return files.map((file) => ({
      originalName: file.originalname,
      fileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/tasks/${file.filename}`,
    }));
  }

  private async deleteUploadedFiles(files: UploadedTaskFile[]) {
    await Promise.all(
      files.map((file) => unlink(file.path).catch(() => undefined)),
    );
  }

  private async deleteExistingAttachments(attachments: TaskAttachment[]) {
    await Promise.all(
      attachments.map((attachment) =>
        unlink(
          join(process.cwd(), 'uploads', 'tasks', attachment.fileName),
        ).catch(() => undefined),
      ),
    );
  }

  private async scheduleDueSoonEmail(task: Task) {
    if (!task.dueDate || task.status === TaskStatus.DONE) {
      await this.runMailQueueOperation(() =>
        this.mailQueueService.cancelTaskDueSoonEmail(task.id),
      );
      return;
    }

    const dueDate = new Date(task.dueDate);

    if (dueDate < new Date()) {
      await this.runMailQueueOperation(() =>
        this.mailQueueService.cancelTaskDueSoonEmail(task.id),
      );
      return;
    }

    await this.runMailQueueOperation(() =>
      this.mailQueueService.scheduleTaskDueSoonEmail(
        {
          taskId: task.id,
          taskTitle: task.title,
          responsibleName: task.responsible.name,
          responsibleEmail: task.responsible.email,
          dueDate: task.dueDate.toISOString(),
        },
        dueDate,
      ),
    );
  }

  private async runMailQueueOperation(operation: () => Promise<unknown>) {
    try {
      await operation();
    } catch (error) {
      this.logger.error(
        'Falha ao executar operação de e-mail assíncrono.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
