import 'reflect-metadata';
import { DataSource } from 'typeorm';

export const myconnection = new DataSource({
  type: 'sqlite',
  database: './temp/sqlitedb-1.db',
  logging: true,
  synchronize: true,
});
