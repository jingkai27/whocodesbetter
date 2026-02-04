import { create } from 'zustand';
import { MatchWithDetails, ExecutionResult } from '@codeduel/shared';

interface MatchState {
  match: MatchWithDetails | null;
  myCode: string;
  opponentCode: string;
  selectedLanguage: string;
  isSubmitting: boolean;
  isRunning: boolean;
  lastResult: ExecutionResult | null;
  endTime: Date | null;
  isMatchEnded: boolean;
  winnerId: string | null;
  endReason: string | null;

  // Actions
  setMatch: (match: MatchWithDetails) => void;
  setMyCode: (code: string) => void;
  setOpponentCode: (code: string) => void;
  setSelectedLanguage: (language: string) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setIsRunning: (isRunning: boolean) => void;
  setLastResult: (result: ExecutionResult) => void;
  setEndTime: (endTime: Date) => void;
  endMatch: (winnerId: string, reason: string) => void;
  reset: () => void;
}

const DEFAULT_CODE: Record<string, string> = {
  javascript: `// Write your solution here
function solution(input) {
  // Parse input and return result
  return input;
}

// Read input and call solution
const input = require('fs').readFileSync(0, 'utf8').trim();
console.log(solution(input));
`,
  python: `# Write your solution here
def solution(input_str):
    # Parse input and return result
    return input_str

# Read input and call solution
import sys
input_data = sys.stdin.read().strip()
print(solution(input_data))
`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String input = scanner.nextLine();
        System.out.println(solution(input));
    }

    public static String solution(String input) {
        // Write your solution here
        return input;
    }
}
`,
  cpp: `#include <iostream>
#include <string>
using namespace std;

string solution(string input) {
    // Write your solution here
    return input;
}

int main() {
    string input;
    getline(cin, input);
    cout << solution(input) << endl;
    return 0;
}
`,
  go: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func solution(input string) string {
    // Write your solution here
    return input
}

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    scanner.Scan()
    input := scanner.Text()
    fmt.Println(solution(input))
}
`,
};

const initialState = {
  match: null,
  myCode: DEFAULT_CODE.javascript,
  opponentCode: '',
  selectedLanguage: 'javascript',
  isSubmitting: false,
  isRunning: false,
  lastResult: null,
  endTime: null,
  isMatchEnded: false,
  winnerId: null,
  endReason: null,
};

export const useMatchStore = create<MatchState>((set) => ({
  ...initialState,

  setMatch: (match) =>
    set({
      match,
      isMatchEnded: false,
      winnerId: null,
      endReason: null,
    }),

  setMyCode: (myCode) => set({ myCode }),

  setOpponentCode: (opponentCode) => set({ opponentCode }),

  setSelectedLanguage: (selectedLanguage) =>
    set((state) => ({
      selectedLanguage,
      // Set default code template if code hasn't been modified
      myCode:
        state.myCode === DEFAULT_CODE[state.selectedLanguage] ||
        state.myCode === ''
          ? DEFAULT_CODE[selectedLanguage] || ''
          : state.myCode,
    })),

  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),

  setIsRunning: (isRunning) => set({ isRunning }),

  setLastResult: (lastResult) => set({ lastResult, isSubmitting: false, isRunning: false }),

  setEndTime: (endTime) => set({ endTime }),

  endMatch: (winnerId, endReason) =>
    set({
      isMatchEnded: true,
      winnerId,
      endReason,
    }),

  reset: () => set(initialState),
}));

export const getDefaultCode = (language: string): string => {
  return DEFAULT_CODE[language] || '';
};
