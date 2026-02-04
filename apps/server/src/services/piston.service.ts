import { config } from '../config/env';
import { TestCase } from '@codeduel/shared';

export interface PistonRuntime {
  language: string;
  version: string;
  aliases: string[];
  runtime?: string;
}

export interface PistonExecuteRequest {
  language: string;
  version: string;
  files: Array<{
    name?: string;
    content: string;
  }>;
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

export interface PistonExecuteResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

export interface TestCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTime: number;
  error: string | null;
}

// Language to Piston runtime mapping
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  javascript: { language: 'javascript', version: '*' },
  python: { language: 'python', version: '3' },
  java: { language: 'java', version: '*' },
  cpp: { language: 'c++', version: '*' },
  c: { language: 'c', version: '*' },
  go: { language: 'go', version: '*' },
  rust: { language: 'rust', version: '*' },
  typescript: { language: 'typescript', version: '*' },
};

// Cache for runtimes
let runtimesCache: PistonRuntime[] | null = null;
let runtimesCacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class PistonService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.pistonUrl;
  }

  /**
   * Get available language runtimes (cached)
   */
  async getRuntimes(): Promise<PistonRuntime[]> {
    const now = Date.now();

    // Return cached runtimes if still valid
    if (runtimesCache && now - runtimesCacheTime < CACHE_TTL) {
      return runtimesCache;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/runtimes`);

      if (!response.ok) {
        throw new Error(`Failed to fetch runtimes: ${response.status}`);
      }

      runtimesCache = await response.json() as PistonRuntime[];
      runtimesCacheTime = now;

      return runtimesCache!;
    } catch (error) {
      console.error('Piston getRuntimes error:', error);
      // Return cached data even if expired, as fallback
      if (runtimesCache) {
        return runtimesCache;
      }
      throw error;
    }
  }

  /**
   * Find the best matching runtime for a language
   */
  private async findRuntime(language: string): Promise<{ language: string; version: string } | null> {
    const mapping = LANGUAGE_MAP[language.toLowerCase()];
    if (!mapping) {
      return null;
    }

    const runtimes = await this.getRuntimes();

    // Find matching runtime
    const runtime = runtimes.find(
      (r) =>
        r.language === mapping.language ||
        r.aliases.includes(mapping.language) ||
        r.aliases.includes(language.toLowerCase())
    );

    if (!runtime) {
      return null;
    }

    return {
      language: runtime.language,
      version: runtime.version,
    };
  }

  /**
   * Execute code with timeout (5s) and memory limits (128MB)
   */
  async execute(
    language: string,
    code: string,
    stdin?: string
  ): Promise<PistonExecuteResponse> {
    const runtime = await this.findRuntime(language);

    if (!runtime) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const request: PistonExecuteRequest = {
      language: runtime.language,
      version: runtime.version,
      files: [{ content: code }],
      stdin: stdin || '',
      run_timeout: 5000,           // 5 seconds
      run_memory_limit: 128000000, // 128 MB
      compile_timeout: 10000,      // 10 seconds for compilation
      compile_memory_limit: 256000000, // 256 MB for compilation
    };

    const response = await fetch(`${this.baseUrl}/api/v2/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Piston execution failed: ${response.status} - ${errorText}`);
    }

    return await response.json() as PistonExecuteResponse;
  }

  /**
   * Run code against array of test cases
   */
  async runTestCases(
    language: string,
    code: string,
    testCases: TestCase[]
  ): Promise<TestCaseResult[]> {
    const results: TestCaseResult[] = [];

    for (const testCase of testCases) {
      const startTime = Date.now();
      let actualOutput = '';
      let error: string | null = null;
      let passed = false;

      try {
        const response = await this.execute(language, code, testCase.input);
        const executionTime = Date.now() - startTime;

        // Check for compilation errors
        if (response.compile && response.compile.code !== 0) {
          error = response.compile.stderr || response.compile.output || 'Compilation failed';
          results.push({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: '',
            passed: false,
            executionTime,
            error,
          });
          continue;
        }

        // Check for runtime errors
        if (response.run.code !== 0 || response.run.stderr) {
          error = response.run.stderr || response.run.output || 'Runtime error';
          actualOutput = response.run.stdout || '';
        } else {
          actualOutput = response.run.stdout || response.run.output || '';
        }

        // Normalize outputs for comparison (trim whitespace)
        const normalizedActual = actualOutput.trim();
        const normalizedExpected = testCase.expectedOutput.trim();
        passed = normalizedActual === normalizedExpected && !error;

        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: actualOutput.trim(),
          passed,
          executionTime,
          error,
        });
      } catch (err) {
        const executionTime = Date.now() - startTime;
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          passed: false,
          executionTime,
          error: err instanceof Error ? err.message : 'Unknown execution error',
        });
      }
    }

    return results;
  }

  /**
   * Check if Piston service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/runtimes`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const pistonService = new PistonService();
