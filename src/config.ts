import jsyaml from "js-yaml";
import * as fs from "node:fs";
import {
  type GatewayConfig,
  gatewayGetConfig,
  gatewaySetConfig,
} from "./gateway.ts";
import type { RedisConfig } from "./redis.ts";
import type { DatabaseConfig } from "./typeorm.ts";

class Config<T = any> implements Record<any, any> {
  [key: string]: any;

  getValue<K extends keyof T>(key: K): T[K] {
    return (this as any)[key];
  }

  getRemoteValue(key: string): Promise<string> {
    return gatewayGetConfig(key);
  }

  setRemoteValue(key: string, value: string): Promise<boolean> {
    return gatewaySetConfig(key, value);
  }

  getRemoteValueAsNumber(key: string): Promise<number> {
    return this.getRemoteValue(key).then(Number);
  }

  getRemoteValueAsBoolean(key: string): Promise<boolean> {
    return this.getRemoteValue(key).then(Boolean);
  }

  async getRemoteValueAsJSON<T>(key: string): Promise<T> {
    const text = await this.getRemoteValue(key);
    return JSON.parse(text);
  }

  async getRedisConfig(db?: number): Promise<RedisConfig> {
    const res = await this.getRemoteValueAsJSON<RedisConfig>("redis");
    return { ...res, db };
  }

  async getDatabaseConfig(database: string): Promise<DatabaseConfig> {
    const res = await this.getRemoteValueAsJSON<DatabaseConfig>("postgres");
    return { ...res, database };
  }
}

const cache: Record<string, Config> = {};

function readYaml(obj: Config, path: string) {
  if (fs.existsSync(path)) {
    Object.assign(obj, jsyaml.load(fs.readFileSync(path, "utf-8")));
  }
}

function readEnv(obj: Config, path: string) {
  if (fs.existsSync(path)) {
    const contents = fs
      .readFileSync(path, "utf-8")
      .split("\n")
      .map((i) => i.trim())
      .filter((i) => i && !i.startsWith("#"))
      .map((i) => i.split("="));
    for (let [key, value] of contents) {
      obj[key] = value;
    }
  }
}

export function config<T extends BaseConfig = BaseConfig>(
  env: string = process.env.NODE_ENV || "dev",
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

export interface BaseConfig {
  appPort: number;
  gateway: GatewayConfig;
  serverName: string;
}
