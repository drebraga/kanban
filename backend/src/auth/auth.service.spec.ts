import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a sanitized current user profile', async () => {
    usersService.findById.mockResolvedValue({
      id: 1,
      name: 'Andre',
      email: 'andre@example.com',
      password: 'hashed-password',
      createdAt: new Date('2026-06-25T00:00:00.000Z'),
    });

    await expect(service.me(1)).resolves.toEqual({
      id: 1,
      name: 'Andre',
      email: 'andre@example.com',
      createdAt: new Date('2026-06-25T00:00:00.000Z'),
    });
  });
});
