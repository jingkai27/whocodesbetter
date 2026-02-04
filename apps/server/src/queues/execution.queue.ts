import { Queue } from 'bullmq';
import { bullMQConnection } from '../services/redis';
import { TestCase } from '@codeduel/shared';

/**
 * Execution job data structure
 */
export interface ExecutionJobData {
  matchId: string;
  playerId: string;
  code: string;
  language: string;
  problemId: string;
  testCases: TestCase[];
  isRun?: boolean; // true = run visible tests only, false = submit all tests
}

/**
 * Execution result returned by worker
 */
export interface ExecutionJobResult {
  matchId: string;
  playerId: string;
  success: boolean;
  output: string;
  error: string | null;
  executionTime: number;
  testsPassed: number;
  testsTotal: number;
  testResults: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    executionTime: number;
    error: string | null;
  }>;
  isRun?: boolean; // true = run visible tests only, false = submit all tests
}

/**
 * Code execution job queue using BullMQ
 */
export const executionQueue = new Queue<ExecutionJobData, ExecutionJobResult>('code-execution', {
  connection: bullMQConnection,
  defaultJobOptions: {
    attempts: 1, // No retries for code execution - it either works or it doesn't
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 3600, // Keep for 1 hour
    },
    removeOnFail: {
      count: 100, // Keep last 100 failed jobs for debugging
      age: 3600,
    },
  },
});

/**
 * Add a code execution job to the queue
 */
export async function addExecutionJob(data: ExecutionJobData): Promise<string> {
  const job = await executionQueue.add('execute', data, {
    jobId: `${data.matchId}-${data.playerId}-${Date.now()}`,
  });
  return job.id!;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    executionQueue.getWaitingCount(),
    executionQueue.getActiveCount(),
    executionQueue.getCompletedCount(),
    executionQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}
