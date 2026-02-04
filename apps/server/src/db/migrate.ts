import fs from 'fs';
import path from 'path';
import { pool } from './index';

async function runMigrations() {
  console.log('Running database migrations...');

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`Executing ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    try {
      await pool.query(sql);
      console.log(`✓ ${file} completed`);
    } catch (error) {
      console.error(`✗ ${file} failed:`, error);
      process.exit(1);
    }
  }

  console.log('All migrations completed successfully!');
  await pool.end();
}

runMigrations();
