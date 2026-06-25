import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.repository.findOne({
      where: { email },
    });
  }

  findById(id: number) {
    return this.repository.findOne({
      where: { id },
    });
  }

  create(user: Partial<User>) {
    return this.repository.save(user);
  }
}
