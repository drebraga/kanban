import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from './entities/tasks.entity';
import { User } from 'src/users/entities/users.entity';
import { Tag } from 'src/tags/entities/tags.entity';
import { TaskHistory } from 'src/task-history/entities/task-history.entity';
import { TaskPriority } from 'src/enums/task-priority.enum';
import { MailQueueService } from 'src/mail/mail-queue.service';
import { TaskStatus } from 'src/enums/task-status.enum';

describe('TasksService', () => {
  let service: TasksService;
  const tasksRepository = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const usersRepository = {
    findOne: jest.fn(),
  };
  const tagsRepository = {
    findBy: jest.fn(),
  };
  const historyRepository = {
    create: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };
  const mailQueueService = {
    enqueueTaskCreatedEmail: jest.fn(),
    enqueueTaskStatusChangedEmail: jest.fn(),
    scheduleTaskDueSoonEmail: jest.fn(),
    cancelTaskDueSoonEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: tasksRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: tagsRepository,
        },
        {
          provide: getRepositoryToken(TaskHistory),
          useValue: historyRepository,
        },
        {
          provide: MailQueueService,
          useValue: mailQueueService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a task with responsible and tags', async () => {
    const responsible = {
      id: 1,
      name: 'Andre',
      email: 'andre@example.com',
    };
    const tags = [{ id: 1 }];
    const task = {
      id: 1,
      title: 'Implementar Kanban',
    };

    usersRepository.findOne.mockResolvedValue(responsible);
    tagsRepository.findBy.mockResolvedValue(tags);
    tasksRepository.create.mockReturnValue(task);
    tasksRepository.save.mockResolvedValue(task);

    await expect(
      service.create({
        title: 'Implementar Kanban',
        priority: TaskPriority.MEDIUM,
        responsibleId: 1,
        tagIds: [1],
      }),
    ).resolves.toBe(task);

    expect(tasksRepository.create).toHaveBeenCalledWith({
      title: 'Implementar Kanban',
      description: undefined,
      priority: TaskPriority.MEDIUM,
      dueDate: undefined,
      responsible,
      tags,
    });
    expect(mailQueueService.enqueueTaskCreatedEmail).toHaveBeenCalledWith({
      taskId: 1,
      taskTitle: 'Implementar Kanban',
      responsibleName: 'Andre',
      responsibleEmail: 'andre@example.com',
    });
    expect(mailQueueService.cancelTaskDueSoonEmail).toHaveBeenCalledWith(1);
  });

  it('should list tasks with relations', async () => {
    await service.findAll();

    expect(tasksRepository.find).toHaveBeenCalledWith({
      relations: {
        responsible: true,
        tags: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  });

  it('should list task history', async () => {
    tasksRepository.findOne.mockResolvedValue({
      id: 1,
    });

    await service.findHistory(1);

    expect(historyRepository.find).toHaveBeenCalledWith({
      where: {
        task: {
          id: 1,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });
  });

  it('should enqueue email when task status changes', async () => {
    const task = {
      id: 1,
      title: 'Implementar Kanban',
      status: TaskStatus.TODO,
      responsible: {
        id: 1,
        name: 'Andre',
        email: 'andre@example.com',
      },
    };

    tasksRepository.findOne.mockResolvedValue(task);
    tasksRepository.save.mockResolvedValue({
      ...task,
      status: TaskStatus.DONE,
    });
    historyRepository.create.mockReturnValue({
      task,
      oldStatus: TaskStatus.TODO,
      newStatus: TaskStatus.DONE,
    });

    await service.update(1, {
      status: TaskStatus.DONE,
    });

    expect(mailQueueService.enqueueTaskStatusChangedEmail).toHaveBeenCalledWith(
      {
        taskId: 1,
        taskTitle: 'Implementar Kanban',
        responsibleName: 'Andre',
        responsibleEmail: 'andre@example.com',
        oldStatus: TaskStatus.TODO,
        newStatus: TaskStatus.DONE,
      },
    );
    expect(mailQueueService.cancelTaskDueSoonEmail).toHaveBeenCalledWith(1);
  });

  it('should enqueue assignment email when responsible changes', async () => {
    const previousResponsible = {
      id: 1,
      name: 'Andre',
      email: 'andre@example.com',
    };
    const nextResponsible = {
      id: 2,
      name: 'Maria',
      email: 'maria@example.com',
    };
    const task = {
      id: 1,
      title: 'Implementar Kanban',
      status: TaskStatus.TODO,
      responsible: previousResponsible,
    };

    tasksRepository.findOne.mockResolvedValue(task);
    usersRepository.findOne.mockResolvedValue(nextResponsible);
    tasksRepository.save.mockResolvedValue({
      ...task,
      responsible: nextResponsible,
    });

    await service.update(1, {
      responsibleId: 2,
    });

    expect(mailQueueService.enqueueTaskCreatedEmail).toHaveBeenCalledWith({
      taskId: 1,
      taskTitle: 'Implementar Kanban',
      responsibleName: 'Maria',
      responsibleEmail: 'maria@example.com',
    });
  });
});
