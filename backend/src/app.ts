import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ok } from './utils/http';
import { errorHandler, notFoundHandler } from './middlewares/error';

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/api/health', (_req, res) => {
    ok(res, { status: 'up', time: new Date().toISOString() });
  });

  // Phase 2:在此挂载公开路由与 /api/admin 管理路由(契约见 docs/design/api-contract.md)

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
