import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { appEntities } from './entities';
import { loadEnvFiles } from '../config/env-paths';

loadEnvFiles();

function getMigrationGlobs(): string[] {
  const extension = __filename.endsWith('.ts') ? 'ts' : 'js';
  return [join(__dirname, 'migrations', `*.${extension}`)];
}

export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    username: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    database: process.env.POSTGRES_DB ?? 'my_city',
    entities: appEntities,
    migrations: getMigrationGlobs(),
    autoLoadEntities: false,
    synchronize: process.env.DB_SYNC === 'true',
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
    logging: false,
  };
}

export function buildDataSourceOptions(): DataSourceOptions {
  return buildTypeOrmOptions() as DataSourceOptions;
}
