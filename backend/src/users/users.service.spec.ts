import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/users.entity';

describe('UsersService', () => {
  let service: UsersService;
  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find users by id', async () => {
    await service.findById(1);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it('should list users without passwords', async () => {
    repository.find.mockResolvedValue([
      {
        id: 1,
        name: 'Andre',
        email: 'andre@example.com',
        password: 'hashed-password',
        createdAt: new Date('2026-06-25T00:00:00.000Z'),
      },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 1,
        name: 'Andre',
        email: 'andre@example.com',
        createdAt: new Date('2026-06-25T00:00:00.000Z'),
      },
    ]);
  });
});
