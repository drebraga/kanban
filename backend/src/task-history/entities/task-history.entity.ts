import { Task } from 'src/tasks/entities/tasks.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class TaskHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Task, {
    onDelete: 'CASCADE',
  })
  task!: Task;

  @Column()
  oldStatus!: string;

  @Column()
  newStatus!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
