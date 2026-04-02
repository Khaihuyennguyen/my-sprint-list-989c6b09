export type Track = "sql" | "python" | "data-structures";
export type Difficulty = "easy" | "medium" | "hard";

export interface SessionConfig {
  track: Track;
  difficulty: Difficulty;
}

export interface Scores {
  clarity: number;
  structure: number;
  completeness: number;
}

export interface QuestionEntry {
  questionIndex: number;
  questionText: string;
  transcript: string | null;
  scores: Scores | null;
  feedbackText: string | null;
  audioUrl: string | null;
}

export interface SessionState {
  sessionId: string;
  config: SessionConfig;
  currentQuestionIndex: number;
  questions: QuestionEntry[];
  status: "idle" | "listening" | "processing" | "feedback" | "summary";
}

export const TRACKS: { id: Track; label: string; description: string; icon: string }[] = [
  { id: "sql", label: "SQL", description: "Query writing, joins, window functions, optimization", icon: "🗄️" },
  { id: "python", label: "Python", description: "Algorithms, data structures, OOP, problem solving", icon: "🐍" },
  { id: "data-structures", label: "Data Structures", description: "Arrays, trees, graphs, hash maps, complexity", icon: "🌳" },
];

export const DIFFICULTIES: { id: Difficulty; label: string; color: string }[] = [
  { id: "easy", label: "Easy", color: "text-score-high" },
  { id: "medium", label: "Medium", color: "text-score-mid" },
  { id: "hard", label: "Hard", color: "text-score-low" },
];

export const SAMPLE_QUESTIONS: Record<Track, Record<Difficulty, string[]>> = {
  sql: {
    easy: [
      "Write a query to find all employees who joined in the last 30 days.",
      "How would you find duplicate records in a table?",
      "Explain the difference between WHERE and HAVING clauses.",
      "Write a query to count the number of orders per customer.",
      "How do you select only unique values from a column?",
      "What is the difference between DELETE and TRUNCATE?",
      "Write a query to find the maximum salary in each department.",
      "Explain what a primary key is and why it matters.",
      "How would you combine results from two SELECT statements using UNION?",
      "Write a query to find employees whose name starts with 'A'.",
      "What does GROUP BY do and when would you use it?",
      "Explain the difference between COUNT(*) and COUNT(column_name).",
    ],
    medium: [
      "Write a query using window functions to rank employees by salary within each department.",
      "How would you find the second highest salary in each department?",
      "Explain the difference between INNER JOIN, LEFT JOIN, and CROSS JOIN with examples.",
      "Write a query to calculate a running total of sales by date.",
      "How would you pivot rows into columns without using PIVOT?",
      "Explain what a correlated subquery is and give an example.",
      "Write a query to find customers who placed orders in every month of the past year.",
      "How do you handle NULL values in joins and aggregations?",
      "Write a query using LAG or LEAD to compare each row with the previous one.",
      "Explain the difference between EXISTS and IN for subqueries.",
      "How would you write a query to find the median value of a column?",
      "Design a query to identify users whose activity dropped by more than 50% month-over-month.",
    ],
    hard: [
      "Design a query to find gaps in a sequence of dates for subscription data.",
      "How would you optimize a slow query that joins 5 tables with millions of rows?",
      "Write a recursive CTE to traverse an organizational hierarchy.",
      "Explain query execution plans and how you'd use them to diagnose performance issues.",
      "Design a query to implement a sessionization algorithm on clickstream data.",
      "How would you implement slowly changing dimensions (Type 2) in SQL?",
      "Write a query to detect fraud patterns using self-joins and time windows.",
      "Explain the trade-offs between materialized views and indexed views.",
      "Design a query to calculate retention cohorts from raw event data.",
      "How would you implement a recommendation engine using collaborative filtering in pure SQL?",
      "Write a query to find the longest consecutive streak of logins per user.",
      "Explain how you would partition a billion-row table for optimal query performance.",
    ],
  },
  python: {
    easy: [
      "How would you reverse a string without using built-in reverse functions?",
      "Write a function to check if a number is a palindrome.",
      "Explain the difference between a list and a tuple in Python.",
      "How do you remove duplicates from a list while preserving order?",
      "What is the difference between '==' and 'is' in Python?",
      "Write a function to find the factorial of a number recursively.",
      "Explain what list comprehensions are and give an example.",
      "How would you merge two sorted lists into one sorted list?",
      "What are *args and **kwargs and when would you use them?",
      "Write a function to count the frequency of each character in a string.",
      "Explain the difference between shallow copy and deep copy.",
      "How would you check if two strings are anagrams of each other?",
    ],
    medium: [
      "Implement a function to find the longest common subsequence of two strings.",
      "How would you implement a LRU cache from scratch?",
      "Explain Python decorators and write one that measures function execution time.",
      "Implement binary search on a rotated sorted array.",
      "How would you flatten a deeply nested dictionary into dot-notation keys?",
      "Explain generators vs iterators and implement a Fibonacci generator.",
      "Write a function to serialize and deserialize a binary tree.",
      "How would you implement memoization without using functools?",
      "Explain the Global Interpreter Lock (GIL) and its impact on multithreading.",
      "Implement a function to find all permutations of a string without library functions.",
      "How would you design a context manager for database connections?",
      "Write a function to detect if a linked list has a cycle using Floyd's algorithm.",
    ],
    hard: [
      "Design a thread-safe producer-consumer queue with backpressure.",
      "Implement a trie data structure with autocomplete functionality.",
      "How would you design a rate limiter using the token bucket algorithm?",
      "Implement an async web crawler that respects rate limits and handles retries.",
      "Design a memory-efficient bloom filter and explain false positive rates.",
      "How would you implement a consistent hashing ring for distributed caching?",
      "Write a coroutine-based event loop from scratch.",
      "Implement the A* pathfinding algorithm with a custom heuristic.",
      "Design a garbage collector using reference counting with cycle detection.",
      "How would you implement a lock-free concurrent data structure in Python?",
      "Write a metaclass that enforces a singleton pattern and tracks all instances.",
      "Implement a diff algorithm similar to git diff for comparing text files.",
    ],
  },
  "data-structures": {
    easy: [
      "What is the time complexity of searching in a hash map vs. a sorted array?",
      "Implement a stack using two queues.",
      "Explain when you would use a linked list over an array.",
      "What is the difference between a stack and a queue?",
      "How would you implement a queue using a circular array?",
      "Explain what a hash collision is and how to handle it.",
      "What is the time complexity of inserting at the beginning of an array vs. a linked list?",
      "Implement a function to reverse a singly linked list.",
      "Explain the difference between a min-heap and a max-heap.",
      "How would you check if a string of brackets is balanced using a stack?",
      "What is a doubly linked list and when is it preferred over a singly linked list?",
      "Explain the concept of amortized time complexity with an example.",
    ],
    medium: [
      "Implement a binary search tree with insert, delete, and search operations.",
      "How would you detect a cycle in a directed graph?",
      "Explain the difference between BFS and DFS and when to use each.",
      "Implement a priority queue using a binary heap.",
      "How would you find the lowest common ancestor of two nodes in a BST?",
      "Explain how a hash map handles resizing and rehashing.",
      "Implement an adjacency list representation of a graph with BFS traversal.",
      "How would you serialize and deserialize a binary tree?",
      "Explain the difference between a B-tree and a binary search tree.",
      "Implement Dijkstra's shortest path algorithm using a priority queue.",
      "How would you find all strongly connected components in a directed graph?",
      "Design a data structure that supports insert, delete, and getRandom in O(1).",
    ],
    hard: [
      "Implement a self-balancing AVL tree with rotations.",
      "Design an efficient data structure for range minimum queries.",
      "How would you implement a concurrent skip list?",
      "Implement a red-black tree with insertion and deletion.",
      "Design a persistent data structure that supports versioned access.",
      "How would you implement a suffix array with LCP array for string matching?",
      "Implement a disjoint set (Union-Find) with path compression and union by rank.",
      "Design an interval tree that supports overlapping range queries.",
      "How would you implement an order-statistic tree (augmented BST)?",
      "Explain and implement a Fenwick tree (Binary Indexed Tree) for range sum queries.",
      "Design a cache-oblivious B-tree and explain its I/O complexity.",
      "Implement a compressed trie (radix tree) with efficient memory usage.",
    ],
  },
};
