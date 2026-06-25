import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;
  const tasksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findHistory: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: tasksService,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a task', async () => {
    const dto = {
      title: 'Implementar Kanban',
      priority: 'MEDIUM' as never,
      responsibleId: 1,
    };

    await controller.create(dto);

    expect(tasksService.create).toHaveBeenCalledWith(dto);
  });

  it('should update a task', async () => {
    const dto = {
      title: 'Atualizar Kanban',
    };

    await controller.update(1, dto);

    expect(tasksService.update).toHaveBeenCalledWith(1, dto);
  });

  it('should list a task history', async () => {
    await controller.findHistory(1);

    expect(tasksService.findHistory).toHaveBeenCalledWith(1);
  });
});
