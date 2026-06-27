import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/tasks.dto';
import { UpdateTaskDto } from './dto/tasks-update.dto';
import { TasksService } from './tasks.service';

const uploadDir = join(process.cwd(), 'uploads', 'tasks');

const taskFilesInterceptor = FilesInterceptor('attachments', 5, {
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      callback(null, uploadDir);
    },
    filename: (_request, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseInterceptors(taskFilesInterceptor)
  create(
    @Body() dto: CreateTaskDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.tasksService.create(dto, files);
  }

  @Get()
  findAll() {
    return this.tasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Get(':id/history')
  findHistory(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findHistory(id);
  }

  @Patch(':id')
  @UseInterceptors(taskFilesInterceptor)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.tasksService.update(id, dto, files);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }
}
