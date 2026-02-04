export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  testCases: TestCase[];
  createdAt: Date;
}

export interface ProblemSummary {
  id: string;
  title: string;
  difficulty: Difficulty;
}
