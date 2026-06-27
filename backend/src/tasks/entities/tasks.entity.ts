import { TaskPriority } from 'src/enums/task-priority.enum';
import { TaskStatus } from 'src/enums/task-status.enum';
import { Tag } from 'src/tags/entities/tags.entity';
import { TaskAttachment } from '../types/task-attachment.type';
import { User } from 'src/users/entities/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({
    nullable: true,
  })
  description!: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status!: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  @Column({
    nullable: true,
  })
  dueDate!: Date;

  @ManyToOne(() => User)
  responsible!: User;

  @ManyToMany(() => Tag)
  @JoinTable()
  tags!: Tag[];

  @Column({
    type: 'jsonb',
    default: [],
  })
  attachments!: TaskAttachment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
