import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tag } from './entities/tags.entity';
import { TagsService } from './tags.service';

describe('TagsService', () => {
  let service: TagsService;
  const tagsRepository = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: tagsRepository,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a normalized tag', async () => {
    const tag = {
      id: 1,
      name: 'Frontend',
    };

    tagsRepository.findOne.mockResolvedValue(null);
    tagsRepository.create.mockReturnValue(tag);
    tagsRepository.save.mockResolvedValue(tag);

    await expect(service.create({ name: ' Frontend ' })).resolves.toBe(tag);

    expect(tagsRepository.create).toHaveBeenCalledWith({
      name: 'Frontend',
    });
  });
});
