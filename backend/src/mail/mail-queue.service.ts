import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { createTransport, Transporter } from 'nodemailer';
import {
  MAIL_QUEUE_NAME,
  TASK_CREATED_MAIL_JOB,
  TASK_DUE_SOON_MAIL_JOB,
  TASK_STATUS_CHANGED_MAIL_JOB,
} from './mail-queue.constants';
import {
  TaskCreatedMailJob,
  TaskDueSoonMailJob,
  TaskMailJob,
  TaskStatusChangedMailJob,
} from './types/task-mail-job.type';
import { TaskStatus } from 'src/enums/task-status.enum';

const statusLabels: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'A Fazer',
  [TaskStatus.IN_PROGRESS]: 'Em Andamento',
  [TaskStatus.REVIEW]: 'Em Revisão',
  [TaskStatus.DONE]: 'Concluído',
};

@Injectable()
export class MailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailQueueService.name);
  private readonly queue: Queue<TaskMailJob>;
  private readonly transporter?: Transporter;
  private readonly from: string;
  private worker?: Worker<TaskMailJob>;

  constructor() {
    const connection = {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      maxRetriesPerRequest: null,
    };

    this.queue = new Queue<TaskMailJob>(MAIL_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    });

    this.transporter = this.createTransporter();
    this.from = this.createFromAddress();
  }

  onModuleInit() {
    if (process.env.MAIL_WORKER_ENABLED === 'false') {
      return;
    }

    this.worker = new Worker<TaskMailJob>(
      MAIL_QUEUE_NAME,
      (job) => this.processMailJob(job),
      {
        connection: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
          maxRetriesPerRequest: null,
        },
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Falha ao processar e-mail assíncrono ${job?.name ?? 'desconhecido'}`,
        error.stack,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
  }

  async enqueueTaskCreatedEmail(payload: TaskCreatedMailJob) {
    await this.queue.add(TASK_CREATED_MAIL_JOB, payload);
  }

  async enqueueTaskStatusChangedEmail(payload: TaskStatusChangedMailJob) {
    await this.queue.add(TASK_STATUS_CHANGED_MAIL_JOB, payload);
  }

  async enqueueTaskDueSoonEmail(payload: TaskDueSoonMailJob) {
    await this.queue.add(TASK_DUE_SOON_MAIL_JOB, payload);
  }

  private async processMailJob(job: Job<TaskMailJob>) {
    if (!this.transporter) {
      throw new Error(
        'SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM.',
      );
    }

    if (job.name === TASK_CREATED_MAIL_JOB) {
      const data = job.data;

      await this.transporter.sendMail({
        from: this.from,
        to: data.responsibleEmail,
        subject: `Nova tarefa para você: ${data.taskTitle}`,
        text: this.buildTaskCreatedText(data),
        html: this.buildTaskCreatedHtml(data),
      });
      return;
    }

    if (job.name === TASK_DUE_SOON_MAIL_JOB) {
      const data = job.data as TaskDueSoonMailJob;

      await this.transporter.sendMail({
        from: this.from,
        to: data.responsibleEmail,
        subject: `Prazo próximo no TaskFlow: ${data.taskTitle}`,
        text: this.buildDueSoonText(data),
        html: this.buildDueSoonHtml(data),
      });
      return;
    }

    if (job.name === TASK_STATUS_CHANGED_MAIL_JOB) {
      const data = job.data as TaskStatusChangedMailJob;

      await this.transporter.sendMail({
        from: this.from,
        to: data.responsibleEmail,
        subject: `Atualização no TaskFlow: ${data.taskTitle}`,
        text: this.buildStatusChangedText(data),
        html: this.buildStatusChangedHtml(data),
      });
    }
  }

  private createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM_ADDRESS ?? process.env.SMTP_FROM;

    if (!host || !port || !user || !pass || !from) {
      this.logger.warn(
        'SMTP não configurado. Jobs de e-mail serão reprocessados até as variáveis SMTP serem definidas.',
      );
      return undefined;
    }

    return createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user,
        pass,
      },
    });
  }

  private createFromAddress() {
    const name = process.env.SMTP_FROM_NAME ?? 'TaskFlow';
    const address =
      process.env.SMTP_FROM_ADDRESS ??
      process.env.SMTP_FROM ??
      process.env.SMTP_USER;

    return `"${name.replaceAll('"', '')}" <${address}>`;
  }

  private buildTaskCreatedText(data: TaskCreatedMailJob) {
    return [
      `Olá, ${data.responsibleName}.`,
      '',
      `Uma nova tarefa foi atribuída a você no TaskFlow: ${data.taskTitle}.`,
      '',
      'Acesse o quadro para acompanhar os detalhes, prazo e próximos passos.',
    ].join('\n');
  }

  private buildStatusChangedText(data: TaskStatusChangedMailJob) {
    return [
      `Olá, ${data.responsibleName}.`,
      '',
      `A tarefa "${data.taskTitle}" teve o status atualizado no TaskFlow.`,
      '',
      `Status anterior: ${statusLabels[data.oldStatus]}`,
      `Status atual: ${statusLabels[data.newStatus]}`,
      '',
      'Acesse o quadro para acompanhar a evolução da tarefa.',
    ].join('\n');
  }

  private buildDueSoonText(data: TaskDueSoonMailJob) {
    return [
      `Olá, ${data.responsibleName}.`,
      '',
      `A tarefa "${data.taskTitle}" está com a data de entrega próxima.`,
      '',
      `Data de entrega: ${this.formatDate(data.dueDate)}`,
      '',
      'Acesse o quadro para revisar os detalhes e priorizar os próximos passos.',
    ].join('\n');
  }

  private buildTaskCreatedHtml(data: TaskCreatedMailJob) {
    return this.buildMailTemplate({
      eyebrow: 'Nova tarefa atribuída',
      title: data.taskTitle,
      greeting: `Olá, ${data.responsibleName}.`,
      message:
        'Uma nova tarefa foi atribuída a você no TaskFlow. Acesse o quadro para acompanhar os detalhes, prazo e próximos passos.',
      rows: [
        {
          label: 'Situação inicial',
          value: statusLabels[TaskStatus.TODO],
        },
      ],
    });
  }

  private buildStatusChangedHtml(data: TaskStatusChangedMailJob) {
    return this.buildMailTemplate({
      eyebrow: 'Status atualizado',
      title: data.taskTitle,
      greeting: `Olá, ${data.responsibleName}.`,
      message:
        'Uma tarefa sob sua responsabilidade avançou no fluxo. Confira a mudança registrada no quadro.',
      rows: [
        {
          label: 'Status anterior',
          value: statusLabels[data.oldStatus],
        },
        {
          label: 'Status atual',
          value: statusLabels[data.newStatus],
          highlight: true,
        },
      ],
    });
  }

  private buildDueSoonHtml(data: TaskDueSoonMailJob) {
    return this.buildMailTemplate({
      eyebrow: 'Prazo próximo',
      title: data.taskTitle,
      greeting: `Olá, ${data.responsibleName}.`,
      message:
        'Esta tarefa está com a data de entrega próxima. Acesse o quadro para revisar os detalhes e priorizar os próximos passos.',
      rows: [
        {
          label: 'Data de entrega',
          value: this.formatDate(data.dueDate),
          highlight: true,
        },
      ],
    });
  }

  private formatDate(value: string) {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
  }

  private buildMailTemplate({
    eyebrow,
    title,
    greeting,
    message,
    rows,
  }: {
    eyebrow: string;
    title: string;
    greeting: string;
    message: string;
    rows: Array<{ label: string; value: string; highlight?: boolean }>;
  }) {
    const rowsHtml = rows
      .map(
        (row) => `
          <tr>
            <td style="padding: 12px 0; color: #71717a; font-size: 13px;">${row.label}</td>
            <td style="padding: 12px 0; color: ${
              row.highlight ? '#166534' : '#18181b'
            }; font-size: 13px; font-weight: 700; text-align: right;">${row.value}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <div style="background: #f4f4f5; padding: 32px 16px; font-family: Arial, sans-serif;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden;">
          <div style="background: #18181b; color: #ffffff; padding: 20px 24px;">
            <p style="margin: 0; color: #a1a1aa; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;">${eyebrow}</p>
            <h1 style="margin: 8px 0 0; font-size: 22px; line-height: 1.3;">${title}</h1>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 12px; color: #18181b; font-size: 15px; font-weight: 700;">${greeting}</p>
            <p style="margin: 0; color: #3f3f46; font-size: 14px; line-height: 1.7;">${message}</p>
            <table role="presentation" width="100%" style="margin-top: 20px; border-collapse: collapse; border-top: 1px solid #e4e4e7; border-bottom: 1px solid #e4e4e7;">
              ${rowsHtml}
            </table>
            <p style="margin: 20px 0 0; color: #71717a; font-size: 12px; line-height: 1.6;">
              Esta é uma notificação automática do TaskFlow.
            </p>
          </div>
        </div>
      </div>
    `;
  }
}
