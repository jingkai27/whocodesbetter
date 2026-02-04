import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import passport from 'passport';

import { config, validateConfig } from './config/env';
import { testConnection } from './db';
import { setupSocketIO } from './socket';
import { startExecutionWorker } from './workers/execution.worker';

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import problemsRoutes from './routes/problems';
import matchesRoutes from './routes/matches';

// Validate environment configuration
validateConfig();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Health check
app.get('/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: dbConnected ? 'healthy' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/problems', problemsRoutes);
app.use('/api/matches', matchesRoutes);

// Setup Socket.IO
const io = setupSocketIO(httpServer);

// Start the execution worker
const executionWorker = startExecutionWorker();

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await executionWorker.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
httpServer.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`⚡ Execution worker started`);
  console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
});

export { app, io };
