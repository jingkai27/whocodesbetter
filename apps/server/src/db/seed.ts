import fs from 'fs';
import path from 'path';
import { pool } from './index';

async function runSeed() {
  console.log('Seeding database...');

  const seedFile = path.join(__dirname, 'seed.sql');
  const sql = fs.readFileSync(seedFile, 'utf-8');

  try {
    await pool.query(sql);
    console.log('✓ Database seeded successfully!');
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  }

  await pool.end();
}

runSeed();
