import request from 'supertest';
import { pgPool } from '../src/config/db';

jest.mock('../src/config/db', () => ({
  pgPool: {
    query: jest.fn(),
    end: jest.fn(),
  },
  initializeDatabase: jest.fn(),
}));

import { app } from '../src/index';

describe('Notification Engine API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return UP when database is connected', async () => {
      (pgPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ '?column?': 1 }],
      });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'UP',
        database: 'Connected',
      });
    });

    it('should return DOWN when database is unavailable', async () => {
      (pgPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database unavailable'),
      );

      const response = await request(app).get('/health');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        status: 'DOWN',
        database: 'Disconnected',
      });
    });
  });

  describe('POST /api/v1/notifications', () => {
    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/notifications')
        .send({
          userId: 'user-123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Missing required fields: userId, type, channel',
      });

      expect(pgPool.query).not.toHaveBeenCalled();
    });

    it('should return 400 when type is missing', async () => {
      const response = await request(app)
        .post('/api/v1/notifications')
        .send({
          userId: 'user-123',
          channel: 'EMAIL',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Missing required fields: userId, type, channel',
      );
    });

    it('should return 400 when channel is missing', async () => {
      const response = await request(app)
        .post('/api/v1/notifications')
        .send({
          userId: 'user-123',
          type: 'WELCOME',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Missing required fields: userId, type, channel',
      );
    });

    it('should queue a notification successfully', async () => {
      (pgPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'notification-123' }],
      });

      const response = await request(app)
        .post('/api/v1/notifications')
        .send({
          userId: 'user-123',
          type: 'WELCOME',
          channel: 'EMAIL',
          payload: {
            message: 'Welcome!',
          },
        });

      expect(response.status).toBe(201);

      expect(response.body).toEqual({
        message: 'Notification queued successfully',
        notificationId: 'notification-123',
      });

      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [
          'user-123',
          'WELCOME',
          'EMAIL',
          JSON.stringify({
            message: 'Welcome!',
          }),
        ],
      );
    });

    it('should use an empty payload when payload is not provided', async () => {
      (pgPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'notification-456' }],
      });

      const response = await request(app)
        .post('/api/v1/notifications')
        .send({
          userId: 'user-456',
          type: 'OTP',
          channel: 'SMS',
        });

      expect(response.status).toBe(201);
      expect(response.body.notificationId).toBe('notification-456');

      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [
          'user-456',
          'OTP',
          'SMS',
          JSON.stringify({}),
        ],
      );
    });

    it('should return 500 when database insertion fails', async () => {
      (pgPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error'),
      );

      const response = await request(app)
        .post('/api/v1/notifications')
        .send({
          userId: 'user-123',
          type: 'WELCOME',
          channel: 'EMAIL',
          payload: {},
        });

      expect(response.status).toBe(500);

      expect(response.body).toEqual({
        error: 'Failed to process notification',
      });
    });
  });
});