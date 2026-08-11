import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { pgPool, initializeDatabase } from './config/db';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

app.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    await pgPool.query('SELECT 1');

    res.status(200).json({
      status: 'UP',
      database: 'Connected',
    });
  } catch (error) {
    console.error('Health check failed:', error);

    res.status(500).json({
      status: 'DOWN',
      database: 'Disconnected',
    });
  }
});

app.post(
  '/api/v1/notifications',
  async (req: Request, res: Response): Promise<void> => {
    const { userId, type, channel, payload } = req.body;

    if (!userId || !type || !channel) {
      res.status(400).json({
        error: 'Missing required fields: userId, type, channel',
      });
      return;
    }

    try {
      const result = await pgPool.query(
        `
        INSERT INTO notifications
          (user_id, type, channel, payload, status)
        VALUES
          ($1, $2, $3, $4, 'PENDING')
        RETURNING id
        `,
        [
          userId,
          type,
          channel,
          JSON.stringify(payload || {}),
        ]
      );

      res.status(201).json({
        message: 'Notification queued successfully',
        notificationId: result.rows[0].id,
      });
    } catch (error) {
      console.error('Failed to process notification:', error);

      res.status(500).json({
        error: 'Failed to process notification',
      });
    }
  }
);

const startServer = async (): Promise<void> => {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Notification Engine running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start Notification Engine:', error);
    await pgPool.end();
    process.exit(1);
  }
};

startServer();