import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import prisma from './lib/prisma';
import { ZodError } from 'zod';
import { asyncHandler } from './utils/asyncHandler';
import { generalLimiter } from './middleware/rateLimiter';
import routes from './routes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3001' }));
// Razorpay webhook signatures must be verified against the raw request body, not the
// parsed JSON — this stashes it on req.rawBody for every request (cheap) so the webhook
// route can use it without needing special route-ordering around express.json().
app.use(express.json({
  limit: '10mb',
  verify: (req: Request & { rawBody?: Buffer }, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('dev'));
app.use(generalLimiter);

// Serve uploaded media (receipts, blog/camp-location images & videos)
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

// Health endpoint with DB check
app.get('/health', asyncHandler(async (req: Request, res: Response) => {
  await prisma.$queryRaw`SELECT 1`;
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected'
  });
}));

// Info endpoint
app.get('/info', (req: Request, res: Response) => {
  res.status(200).json({
    name: 'Win Foundations',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use(routes);

// Zod validation error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }
  next(err);
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'error', message: 'Not found' });
});

// Start server
const start = async () => {
  try {
    await prisma.$connect();
    console.log('✓ Database connected');

    app.listen(PORT, () => {
      console.log(`Win Foundations server running on http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});
