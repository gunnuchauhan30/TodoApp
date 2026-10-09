import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import swaggerUi from 'swagger-ui-express';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import todoRoutes from './routes/todoRoutes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { sanitizeBody } from './middleware/sanitize';
import { uploadDir } from './middleware/upload';
import { swaggerSpec } from './docs/swagger';
import { logger } from './utils/logger';

const app: Application = express();

// Behind Nginx / a load balancer: trust the first proxy so rate limiting sees real client IPs
app.set('trust proxy', 1);

// Security headers (CSP relaxed for the Swagger UI page only)
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));

// HTTP request logging -> winston
app.use(
  morgan('tiny', { stream: { write: (m) => logger.http(m.trim()) }, skip: () => process.env.NODE_ENV === 'test' })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize()); // blocks NoSQL operator injection ($gt, $ne, ...)
app.use(hpp()); // HTTP parameter pollution
app.use(sanitizeBody); // strips < > from string inputs

app.use('/api', apiLimiter);
app.use('/uploads', express.static(uploadDir));

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Todo API is running', docs: '/api/docs', version: 'v1' });
});

const health = (_req: express.Request, res: express.Response) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected,
    status: connected ? 'ok' : 'degraded',
    mongo: connected ? 'connected' : 'disconnected'
  });
};
app.get('/api/health', health);
app.get('/api/v1/health', health);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Versioned API + legacy un-versioned aliases (backward compatible)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/todos', todoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
