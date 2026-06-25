import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

describe('TagsController', () => {
  let controller: TagsController;
  const tagsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: tagsService,
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a tag', async () => {
    const dto = {
      name: 'Frontend',
    };

    await controller.create(dto);

    expect(tagsService.create).toHaveBeenCalledWith(dto);
  });
});
