import { TaskPriority } from 'src/enums/task-priority.enum';
import { TaskStatus } from 'src/enums/task-status.enum';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

function parseNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number);
  }

  if (typeof value === 'string') {
    if (!value) {
      return [];
    }

    const parsed: unknown = JSON.parse(value);

    return Array.isArray(parsed) ? parsed.map(Number) : [Number(parsed)];
  }

  if (typeof value === 'number') {
    return [value];
  }

  return [];
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  responsibleId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    return parseNumberArray(value as unknown);
  })
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[];
}
