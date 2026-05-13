import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: RedisClientType;

  async onModuleInit(): Promise<void> {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: Number(process.env.REDIS_DB ?? 0),
    });

    this.client.on('error', (error) => {
      this.logger.error(error.message);
    });

    const redisRequired = process.env.REDIS_REQUIRED !== 'false';

    try {
      await this.client.connect();
      await this.client.ping();
      this.logger.log('Redis connection established');
    } catch (error) {
      if (redisRequired) {
        throw error;
      }

      this.logger.warn('Redis unavailable but REDIS_REQUIRED=false, continuing without hard failure');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, serialized, { EX: ttlSeconds });
      return;
    }

    await this.client.set(key, serialized);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async withLock<T>(key: string, ttlMs: number, task: () => Promise<T>): Promise<T | null> {
    const token = `${Date.now()}-${Math.random()}`;
    const acquired = await this.client.set(key, token, {
      NX: true,
      PX: ttlMs,
    });

    if (acquired !== 'OK') {
      return null;
    }

    try {
      return await task();
    } finally {
      const currentValue = await this.client.get(key);
      if (currentValue === token) {
        await this.client.del(key);
      }
    }
  }
}
