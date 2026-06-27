import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/tasks.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { User } from 'src/users/entities/users.entity';
import { Tag } from 'src/tags/entities/tags.entity';
import { TaskHistory } from 'src/task-history/entities/task-history.entity';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, User, Tag, TaskHistory]),
    MailModule,
  ],
  exports: [TypeOrmModule, TasksService],
  providers: [TasksService],
  controllers: [TasksController],
})
export class TasksModule {}
