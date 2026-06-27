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

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(TaskPriority)
  priority!: TaskPriority;

  @IsDateString()
  dueDate!: string;

  @Type(() => Number)
  @IsInt()
  responsibleId!: number;

  @IsOptional()
  @Transform(({ value }) => {
    return parseNumberArray(value as unknown);
  })
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[];
}
