import jsyaml from 'js-yaml';
import * as fs from 'node:fs';
import { getNacosConfig, type RegisterConfig } from './nacos.ts';
import type { RedisConfig } from './redis.ts';
import type { DatabaseConfig } from './typeorm.ts';

class Config<T = any> implements Record<any, any> {
  [key: string]: any;

  getValue<K extends keyof T>(key: K): T[K] {
    return (this as any)[key];
  }

  getString(key: string): Promise<string> {
    return getNacosConfig(key);
  }

  getNumber(key: string): Promise<number> {
    return this.getString(key).then(Number);
  }

  getBoolean(key: string): Promise<boolean> {
    return this.getString(key).then(Boolean);
  }

  async getJSON<T>(key: string): Promise<T> {
    const text = await this.getString(key);
    return JSON.parse(text);
  }

  getNacosConfig(): RegisterConfig {
    return Object.assign({ port: this.appPort }, this.nacos);
  }

  getRedisConfig(): Promise<RedisConfig> {
    return this.getJSON<RedisConfig>('redis');
  }

  getDatabaseConfig(): Promise<DatabaseConfig> {
    return this.getJSON<DatabaseConfig>('postgres');
  }
}

const cache: Record<string, Config> = {};

function readYaml(obj: Config, path: string) {
  if (fs.existsSync(path)) {
    Object.assign(obj, jsyaml.load(fs.readFileSync(path, 'utf-8')));
  }
}

function readEnv(obj: Config, path: string) {
  if (fs.existsSync(path)) {
    const contents = fs
      .readFileSync(path, 'utf-8')
      .split('\n')
      .map((i) => i.trim())
      .filter((i) => i && !i.startsWith('#'))
      .map((i) => i.split('='));
    for (let [key, value] of contents) {
      obj[key] = value;
    }
  }
}

export function config<T extends BaseConfig = BaseConfig>(
  env: string = process.env.NODE_ENV || 'dev',
): Config<T> {
  if (!cache[env]) {
    const obj = new Config();
    readYaml(obj, `./config.yml`);
    readYaml(obj, `./config.${env}.yml`);
    readEnv(obj, `./env`);
    readEnv(obj, `./env.${env}`);
    cache[env] = obj;
  }
  return cache[env];
}

export default config;

export interface BaseConfig {
  appPort: number;
  nacos: RegisterConfig;
  serverName: string;
}
