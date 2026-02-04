-- CodeDuel Seed Data
-- Run after migrations: psql -U postgres -d codeduel -f seed.sql

-- Sample Problems
INSERT INTO problems (title, description, difficulty, test_cases, starter_code) VALUES
(
  'Two Sum',
  E'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\n**Example 1:**\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n```\n\n**Example 2:**\n```\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]\n```',
  'EASY',
  '[
    {"input": "[2,7,11,15]\n9", "expectedOutput": "[0,1]", "isHidden": false},
    {"input": "[3,2,4]\n6", "expectedOutput": "[1,2]", "isHidden": false},
    {"input": "[3,3]\n6", "expectedOutput": "[0,1]", "isHidden": true}
  ]'::jsonb,
  '{
    "javascript": "function twoSum(nums, target) {\n  // Your code here\n}",
    "python": "def two_sum(nums, target):\n    # Your code here\n    pass"
  }'::jsonb
),
(
  'Valid Parentheses',
  E'Given a string `s` containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\n**Example 1:**\n```\nInput: s = "()"\nOutput: true\n```\n\n**Example 2:**\n```\nInput: s = "()[]{}"\nOutput: true\n```\n\n**Example 3:**\n```\nInput: s = "(]"\nOutput: false\n```',
  'EASY',
  '[
    {"input": "()", "expectedOutput": "true", "isHidden": false},
    {"input": "()[]{}", "expectedOutput": "true", "isHidden": false},
    {"input": "(]", "expectedOutput": "false", "isHidden": false},
    {"input": "([)]", "expectedOutput": "false", "isHidden": true},
    {"input": "{[]}", "expectedOutput": "true", "isHidden": true}
  ]'::jsonb,
  '{
    "javascript": "function isValid(s) {\n  // Your code here\n}",
    "python": "def is_valid(s):\n    # Your code here\n    pass"
  }'::jsonb
),
(
  'Reverse Linked List',
  E'Given the `head` of a singly linked list, reverse the list, and return the reversed list.\n\n**Example 1:**\n```\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]\n```\n\n**Example 2:**\n```\nInput: head = [1,2]\nOutput: [2,1]\n```\n\n**Example 3:**\n```\nInput: head = []\nOutput: []\n```',
  'EASY',
  '[
    {"input": "[1,2,3,4,5]", "expectedOutput": "[5,4,3,2,1]", "isHidden": false},
    {"input": "[1,2]", "expectedOutput": "[2,1]", "isHidden": false},
    {"input": "[]", "expectedOutput": "[]", "isHidden": true}
  ]'::jsonb,
  '{
    "javascript": "function reverseList(head) {\n  // Your code here\n}",
    "python": "def reverse_list(head):\n    # Your code here\n    pass"
  }'::jsonb
),
(
  'Maximum Subarray',
  E'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\n**Example 1:**\n```\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.\n```\n\n**Example 2:**\n```\nInput: nums = [1]\nOutput: 1\nExplanation: The subarray [1] has the largest sum 1.\n```\n\n**Example 3:**\n```\nInput: nums = [5,4,-1,7,8]\nOutput: 23\nExplanation: The subarray [5,4,-1,7,8] has the largest sum 23.\n```',
  'MEDIUM',
  '[
    {"input": "[-2,1,-3,4,-1,2,1,-5,4]", "expectedOutput": "6", "isHidden": false},
    {"input": "[1]", "expectedOutput": "1", "isHidden": false},
    {"input": "[5,4,-1,7,8]", "expectedOutput": "23", "isHidden": false},
    {"input": "[-1]", "expectedOutput": "-1", "isHidden": true}
  ]'::jsonb,
  '{
    "javascript": "function maxSubArray(nums) {\n  // Your code here\n}",
    "python": "def max_sub_array(nums):\n    # Your code here\n    pass"
  }'::jsonb
),
(
  'Merge Two Sorted Lists',
  E'You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.\n\n**Example 1:**\n```\nInput: list1 = [1,2,4], list2 = [1,3,4]\nOutput: [1,1,2,3,4,4]\n```\n\n**Example 2:**\n```\nInput: list1 = [], list2 = []\nOutput: []\n```\n\n**Example 3:**\n```\nInput: list1 = [], list2 = [0]\nOutput: [0]\n```',
  'EASY',
  '[
    {"input": "[1,2,4]\n[1,3,4]", "expectedOutput": "[1,1,2,3,4,4]", "isHidden": false},
    {"input": "[]\n[]", "expectedOutput": "[]", "isHidden": false},
    {"input": "[]\n[0]", "expectedOutput": "[0]", "isHidden": true}
  ]'::jsonb,
  '{
    "javascript": "function mergeTwoLists(list1, list2) {\n  // Your code here\n}",
    "python": "def merge_two_lists(list1, list2):\n    # Your code here\n    pass"
  }'::jsonb
);

-- Sample users for testing (password is 'password123')
INSERT INTO users (username, email, password_hash, elo_rating) VALUES
('testuser1', 'test1@example.com', '$2b$10$rQZ8K3.TQ7J8WvW7U7xPZeJvJ8V8L8kFgBQ3nQ3tYvH6M8Q3K8L8W', 1200),
('testuser2', 'test2@example.com', '$2b$10$rQZ8K3.TQ7J8WvW7U7xPZeJvJ8V8L8kFgBQ3nQ3tYvH6M8Q3K8L8W', 1250),
('testuser3', 'test3@example.com', '$2b$10$rQZ8K3.TQ7J8WvW7U7xPZeJvJ8V8L8kFgBQ3nQ3tYvH6M8Q3K8L8W', 1150);
