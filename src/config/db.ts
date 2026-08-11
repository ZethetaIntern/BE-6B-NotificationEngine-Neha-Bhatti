import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgrespassword',
  database: process.env.DB_NAME || 'notification_db',
});

export const initializeDatabase = async (): Promise<void> => {
  const client = await pgPool.connect();

  try {
    console.log('Initializing database...');

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL UNIQUE,
        email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id
      ON notifications(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_status
      ON notifications(status);
    `);

    console.log('Database tables initialized successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
};