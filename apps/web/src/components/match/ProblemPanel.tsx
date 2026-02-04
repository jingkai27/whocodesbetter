'use client';

import { Problem } from '@codeduel/shared';

interface ProblemPanelProps {
  problem: Problem;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'text-green-400 bg-green-400/10',
  MEDIUM: 'text-yellow-400 bg-yellow-400/10',
  HARD: 'text-red-400 bg-red-400/10',
};

export function ProblemPanel({ problem }: ProblemPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0d1117] text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{problem.title}</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              DIFFICULTY_COLORS[problem.difficulty] || DIFFICULTY_COLORS.EASY
            }`}
          >
            {problem.difficulty}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Description */}
        <div className="prose prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
            {problem.description}
          </div>
        </div>

        {/* Examples */}
        {problem.testCases && problem.testCases.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-200">Examples</h3>
            <div className="space-y-4">
              {problem.testCases.slice(0, 2).map((testCase, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-700 bg-[#161b22] p-4"
                >
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-400">
                      Example {index + 1}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Input:</span>
                      <pre className="mt-1 rounded bg-[#0d1117] p-2 text-sm text-gray-300">
                        {testCase.input}
                      </pre>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Output:</span>
                      <pre className="mt-1 rounded bg-[#0d1117] p-2 text-sm text-gray-300">
                        {testCase.expectedOutput}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
