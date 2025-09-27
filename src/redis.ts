import { Redis } from 'ioredis';

let _redis: Redis | null = null;

export interface RedisConfig {
  password?: string;
  host?: string;
  port?: number;
  db?: number;
}

export function redis(): Redis {
  if (!_redis) throw new Error('Redis not initialized');
  return _redis;
}

export function connectRedis(option?: RedisConfig) {
  const client = (_redis = new Redis({
    password: option?.password,
    host: option?.host,
    port: option?.port,
    db: option?.db,
  }));
  return new Promise<void>((resolve, reject) => {
    client.ping((err, result) => {
      if (err) reject(err);
      else if (result !== 'PONG') reject(new Error('Redis Ping Error'));
      else resolve();
    });
  });
}
