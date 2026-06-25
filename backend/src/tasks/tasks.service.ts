import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entities/tasks.entity';
import { In, Repository } from 'typeorm';
import { CreateTaskDto } from './dto/tasks.dto';
import { UpdateTaskDto } from './dto/tasks-update.dto';
import { User } from 'src/users/entities/users.entity';
import { Tag } from 'src/tags/entities/tags.entity';
import { TaskHistory } from 'src/task-history/entities/task-history.entity';

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

    return this.tasksRepository.save(task);
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
}
