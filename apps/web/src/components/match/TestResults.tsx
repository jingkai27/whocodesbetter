'use client';

import { ExecutionResult } from '@codeduel/shared';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface TestResultsProps {
  result: ExecutionResult | null;
  isSubmitting: boolean;
}

export function TestResults({ result, isSubmitting }: TestResultsProps) {
  if (isSubmitting) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0d1117] p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm text-gray-400">Running tests...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0d1117] p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-500" />
          <p className="text-sm text-gray-400">
            Submit your code to see test results
          </p>
        </div>
      </div>
    );
  }

  const allPassed = result.success && result.testsPassed === result.testsTotal;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div
        className={`flex items-center gap-2 border-b border-gray-700 px-4 py-3 ${
          allPassed ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}
      >
        {allPassed ? (
          <CheckCircle className="h-5 w-5 text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 text-red-400" />
        )}
        <span
          className={`font-semibold ${allPassed ? 'text-green-400' : 'text-red-400'}`}
        >
          {allPassed ? 'All Tests Passed!' : 'Tests Failed'}
        </span>
        <span className="ml-auto text-sm text-gray-400">
          {result.testsPassed}/{result.testsTotal} passed
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Execution Info */}
        <div className="mb-4 flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{result.executionTime}ms</span>
          </div>
        </div>

        {/* Output */}
        {result.output && (
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-medium uppercase text-gray-500">
              Output
            </h4>
            <pre className="max-h-40 overflow-auto rounded-lg bg-[#161b22] p-3 text-sm text-gray-300">
              {result.output}
            </pre>
          </div>
        )}

        {/* Error */}
        {result.error && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase text-red-400">
              Error
            </h4>
            <pre className="max-h-40 overflow-auto rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              {result.error}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
