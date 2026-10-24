import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ok, asyncHandler } from './utils/http';
import { errorHandler, notFoundHandler } from './middlewares/error';
import { query } from './config/db';
import { nowDateTime } from './utils/datetime';
import { publicRouter } from './routes/public.routes';
import { adminRouter } from './routes/admin.routes';
import { aiRouter } from './routes/ai.routes';

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // GET /api/health(契约 2.1):同时探测数据库连通性,不抛出内部细节;
  // 数据库不可用时仍返回 200 且 db:"down"(TC-10 辅助)
  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      let db: 'up' | 'down' = 'down';
      try {
        await query('SELECT 1');
        db = 'up';
      } catch {
        db = 'down';
      }
      ok(res, { status: 'ok', db, time: nowDateTime() });
    })
  );

  app.use('/api', publicRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/ai', aiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
