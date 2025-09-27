import { DataSource, type MixedList, type EntitySchema } from 'typeorm';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  type: 'postgres';
  database: string;
}

let _datasource: DataSource | null = null;

export async function connectDatabase(
  config: DatabaseConfig,
  ...entities: MixedList<Function | string | EntitySchema>[]
) {
  if (!_datasource) {
    _datasource = new DataSource({
      ...config,
      entities: entities as any,
      synchronize: false,
    });
    await _datasource.initialize();
  }
}

export function datasource() {
  if (!_datasource) throw new Error('数据库未初始化');
  return _datasource;
}
