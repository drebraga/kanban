import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from './entities/tags.entity';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tag])],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TypeOrmModule, TagsService],
})
export class TagsModule {}
