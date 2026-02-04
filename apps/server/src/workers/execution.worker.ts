import { Worker, Job } from 'bullmq';
import { bullMQConnection } from '../services/redis';
import { pistonService } from '../services/piston.service';
import { ExecutionJobData, ExecutionJobResult } from '../queues/execution.queue';

// Event emitter for notifying when jobs complete
type JobCompletedCallback = (result: ExecutionJobResult) => void;
let jobCompletedCallback: JobCompletedCallback | null = null;

/**
 * Set a callback to be notified when jobs complete
 * This is used by the socket handler to emit results to clients
 */
export function onJobCompleted(callback: JobCompletedCallback): void {
  jobCompletedCallback = callback;
}

/**
 * Process a code execution job
 */
async function processExecutionJob(job: Job<ExecutionJobData>): Promise<ExecutionJobResult> {
  const { matchId, playerId, code, language, testCases, isRun } = job.data;

  console.log(`[Worker] Processing job ${job.id} for match ${matchId}, player ${playerId}`);

  const startTime = Date.now();

  try {
    // Run code against all test cases
    const testResults = await pistonService.runTestCases(language, code, testCases);

    const testsPassed = testResults.filter((r) => r.passed).length;
    const totalExecutionTime = testResults.reduce((sum, r) => sum + r.executionTime, 0);

    // Determine overall success (all tests must pass)
    const success = testsPassed === testCases.length;

    // Get first error if any
    const firstError = testResults.find((r) => r.error)?.error || null;

    // Build output summary
    let output = '';
    if (success) {
      output = `All ${testsPassed} tests passed!`;
    } else {
      const failedTest = testResults.find((r) => !r.passed);
      if (failedTest) {
        if (failedTest.error) {
          output = `Error: ${failedTest.error}`;
        } else {
          output = `Test failed:\nInput: ${failedTest.input}\nExpected: ${failedTest.expectedOutput}\nGot: ${failedTest.actualOutput}`;
        }
      }
    }

    const result: ExecutionJobResult = {
      matchId,
      playerId,
      success,
      output,
      error: firstError,
      executionTime: totalExecutionTime,
      testsPassed,
      testsTotal: testCases.length,
      testResults,
      isRun,
    };

    console.log(
      `[Worker] Job ${job.id} completed: ${testsPassed}/${testCases.length} tests passed in ${Date.now() - startTime}ms`
    );

    return result;
  } catch (error) {
    console.error(`[Worker] Job ${job.id} failed:`, error);

    const result: ExecutionJobResult = {
      matchId,
      playerId,
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown execution error',
      executionTime: Date.now() - startTime,
      testsPassed: 0,
      testsTotal: testCases.length,
      testResults: [],
      isRun,
    };

    return result;
  }
}

/**
 * Create and start the execution worker
 */
export function startExecutionWorker(): Worker<ExecutionJobData, ExecutionJobResult> {
  const worker = new Worker<ExecutionJobData, ExecutionJobResult>(
    'code-execution',
    processExecutionJob,
    {
      connection: bullMQConnection,
      concurrency: 5, // Process up to 5 jobs simultaneously
      limiter: {
        max: 10, // Maximum 10 jobs
        duration: 1000, // per second
      },
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
    // Notify callback (socket handler) of completion
    if (jobCompletedCallback) {
      jobCompletedCallback(result);
    }
  });

  worker.on('failed', (job, error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error);
    // Still notify callback with error result
    if (job && jobCompletedCallback) {
      jobCompletedCallback({
        matchId: job.data.matchId,
        playerId: job.data.playerId,
        success: false,
        output: '',
        error: error.message,
        executionTime: 0,
        testsPassed: 0,
        testsTotal: job.data.testCases.length,
        testResults: [],
      });
    }
  });

  worker.on('error', (error) => {
    console.error('[Worker] Worker error:', error);
  });

  console.log('[Worker] Execution worker started with concurrency: 5');

  return worker;
}
