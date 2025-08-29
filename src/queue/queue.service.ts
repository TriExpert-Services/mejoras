import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../common/config';

@Injectable()
export class QueueService {
  readonly connection = new IORedis(config.REDIS_URL);

  readonly provision = new Queue('provision', { 
    connection: this.connection,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
    },
  });

  readonly power = new Queue('power', { 
    connection: this.connection,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
    },
  });

  readonly snapshot = new Queue('snapshot', { 
    connection: this.connection,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
    },
  });
}