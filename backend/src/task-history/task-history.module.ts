import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskHistory } from './entities/task-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaskHistory])],
  exports: [TypeOrmModule],
})
export class TaskHistoryModule {}
