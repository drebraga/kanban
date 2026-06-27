import { TaskPriority } from 'src/enums/task-priority.enum';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TaskPriority)
  priority!: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @Type(() => Number)
  @IsInt()
  responsibleId!: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value ? JSON.parse(value) : [];
    }

    return value;
  })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  tagIds?: number[];
}
