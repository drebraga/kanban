import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTagDto } from './dto/create-tag.dto';
import { Tag } from './entities/tags.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
  ) {}

  async create(dto: CreateTagDto) {
    const normalizedName = dto.name.trim();
    const exists = await this.tagsRepository.findOne({
      where: { name: normalizedName },
    });

    if (exists) {
      throw new ConflictException('Tag já cadastrada');
    }

    return this.tagsRepository.save(
      this.tagsRepository.create({
        name: normalizedName,
      }),
    );
  }

  findAll() {
    return this.tagsRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async remove(id: number) {
    const tag = await this.tagsRepository.findOne({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException('Tag não encontrada');
    }

    await this.tagsRepository.remove(tag);

    return {
      id,
      deleted: true,
    };
  }
}
