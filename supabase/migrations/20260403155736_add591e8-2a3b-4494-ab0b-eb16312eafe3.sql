
-- Create questions table
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track text NOT NULL,
  difficulty text NOT NULL,
  question_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track, difficulty, question_text)
);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read questions
CREATE POLICY "Authenticated users can view active questions"
  ON public.questions FOR SELECT TO authenticated
  USING (is_active = true);

-- Seed SQL easy
INSERT INTO public.questions (track, difficulty, question_text) VALUES
('sql','easy','Write a query to find all employees who joined in the last 30 days.'),
('sql','easy','How would you find duplicate records in a table?'),
('sql','easy','Explain the difference between WHERE and HAVING clauses.'),
('sql','easy','Write a query to count the number of orders per customer.'),
('sql','easy','How do you select only unique values from a column?'),
('sql','easy','What is the difference between DELETE and TRUNCATE?'),
('sql','easy','Write a query to find the maximum salary in each department.'),
('sql','easy','Explain what a primary key is and why it matters.'),
('sql','easy','How would you combine results from two SELECT statements using UNION?'),
('sql','easy','Write a query to find employees whose name starts with ''A''.'),
('sql','easy','What does GROUP BY do and when would you use it?'),
('sql','easy','Explain the difference between COUNT(*) and COUNT(column_name).');

-- Seed SQL medium
INSERT INTO public.questions (track, difficulty, question_text) VALUES
('sql','medium','Write a query using window functions to rank employees by salary within each department.'),
('sql','medium','How would you find the second highest salary in each department?'),
('sql','medium','Explain the difference between INNER JOIN, LEFT JOIN, and CROSS JOIN with examples.'),
('sql','medium','Write a query to calculate a running total of sales by date.'),
('sql','medium','How would you pivot rows into columns without using PIVOT?'),
('sql','medium','Explain what a correlated subquery is and give an example.'),
('sql','medium','Write a query to find customers who placed orders in every month of the past year.'),
('sql','medium','How do you handle NULL values in joins and aggregations?'),
('sql','medium','Write a query using LAG or LEAD to compare each row with the previous one.'),
('sql','medium','Explain the difference between EXISTS and IN for subqueries.'),
('sql','medium','How would you write a query to find the median value of a column?'),
('sql','medium','Design a query to identify users whose activity dropped by more than 50% month-over-month.');

-- Seed SQL hard
INSERT INTO public.questions (track, difficulty, question_text) VALUES
('sql','hard','Design a query to find gaps in a sequence of dates for subscription data.'),
('sql','hard','How would you optimize a slow query that joins 5 tables with millions of rows?'),
('sql','hard','Write a recursive CTE to traverse an organizational hierarchy.'),
('sql','hard','Explain query execution plans and how you''d use them to diagnose performance issues.'),
('sql','hard','Design a query to implement a sessionization algorithm on clickstream data.'),
('sql','hard','How would you implement slowly changing dimensions (Type 2) in SQL?'),
('sql','hard','Write a query to detect fraud patterns using self-joins and time windows.'),
('sql','hard','Explain the trade-offs between materialized views and indexed views.'),
('sql','hard','Design a query to calculate retention cohorts from raw event data.'),
('sql','hard','How would you implement a recommendation engine using collaborative filtering in pure SQL?'),
('sql','hard','Write a query to find the longest consecutive streak of logins per user.'),
('sql','hard','Explain how you would partition a billion-row table for optimal query performance.');

-- Seed Python easy
INSERT INTO public.questions (track, difficulty, question_text) VALUES
('python','easy','How would you reverse a string without using built-in reverse functions?'),
('python','easy','Write a function to check if a number is a palindrome.'),
('python','easy','Explain the difference between a list and a tuple in Python.'),
('python','easy','How do you remove duplicates from a list while preserving order?'),
('python','easy','What is the difference between ''=='' and ''is'' in Python?'),
('python','easy','Write a function to find the factorial of a number recursively.'),
('python','easy','Explain what list comprehensions are and give an example.'),
('python','easy','How would you merge two sorted lists into one sorted list?'),
('python','easy','What are *args and **kwargs and when would you use them?'),
('python','easy','Write a function to count the frequency of each character in a string.'),
('python','easy','Explain the difference between shallow copy and deep copy.'),
('python','easy','How would you check if two strings are anagrams of each other?');

-- Seed Python medium
INSERT INTO public.questions (track, difficulty, question_text) VALUES
('python','medium','Implement a function to find the longest common subsequence of two strings.'),
('python','medium','How would you implement a LRU cache from scratch?'),
('python','medium','Explain Python decorators and write one that measures function execution time.'),
('python','medium','Implement binary search on a rotated sorted array.'),
('python','medium','How would you flatten a deeply nested dictionary into dot-notation keys?'),
('python','medium','Explain generators vs iterators and implement a Fibonacci generator.'),
('python','medium','Write a function to serialize and deserialize a binary tree.'),
('python','medium','How would you implement memoization without using functools?'),
('python','medium','Explain the Global Interpreter Lock (GIL) and its impact on multithreading.'),
('python','medium','Implement a function to find all permutations of a string without library functions.'),
('python','medium','How would you design a context manager for database connections?'),
('python','medium','Write a function to detect if a linked list has a cycle using Floyd''s algorithm.');

-- Seed Python hard
INSERT INTO public.questions (track, difficulty, question_text) VALUES
('python','hard','Design a thread-safe producer-consumer queue with backpressure.'),
('python','hard','Implement a trie data structure with autocomplete functionality.'),
('python','hard','How would you design a rate limiter using the token bucket algorithm?'),
('python','hard','Implement an async web crawler that respects rate limits and handles retries.'),
('python','hard','Design a memory-efficient bloom filter and explain false positive rates.'),
('python','hard','How would you implement a consistent hashing ring for distributed caching?'),
('python','hard','Write a coroutine-based event loop from scratch.'),
('python','hard','Implement the A* pathfinding algorithm with a custom heuristic.'),
('python','hard','Design a garbage collector using reference counting with cycle detection.'),
('python','hard','How would you implement a lock-free concurrent data structure in Python?'),
('python','hard','Write a metaclass that enforces a singleton pattern and tracks all instances.'),
('python','hard','Implement a diff algorithm similar to git diff for comparing text files.');

-- Seed Data Structures easy
INSERT INTO public.questions (track, difficulty, question_text) VALUES
('data-structures','easy','What is the time complexity of searching in a hash map vs. a sorted array?'),
('data-structures','easy','Implement a stack using two queues.'),
('data-structures','easy','Explain when you would use a linked list over an array.'),
('data-structures','easy','What is the difference between a stack and a queue?'),
('data-structures','easy','How would you implement a queue using a circular array?'),
('data-structures','easy','Explain what a hash collision is and how to handle it.'),
('data-structures','easy','What is the time complexity of inserting at the beginning of an array vs. a linked list?'),
('data-structures','easy','Implement a function to reverse a singly linked list.'),
('data-structures','easy','Explain the difference between a min-heap and a max-heap.'),
('data-structures','easy','How would you check if a string of brackets is balanced using a stack?'),
('data-structures','easy','What is a doubly linked list and when is it preferred over a singly linked list?'),
('data-structures','easy','Explain the concept of amortized time complexity with an example.');

-- Seed Data Structures medium
INSERT INTO public.questions (track, difficulty, question_text) VALUES
('data-structures','medium','Implement a binary search tree with insert, delete, and search operations.'),
('data-structures','medium','How would you detect a cycle in a directed graph?'),
('data-structures','medium','Explain the difference between BFS and DFS and when to use each.'),
('data-structures','medium','Implement a priority queue using a binary heap.'),
('data-structures','medium','How would you find the lowest common ancestor of two nodes in a BST?'),
('data-structures','medium','Explain how a hash map handles resizing and rehashing.'),
('data-structures','medium','Implement an adjacency list representation of a graph with BFS traversal.'),
('data-structures','medium','How would you serialize and deserialize a binary tree?'),
('data-structures','medium','Explain the difference between a B-tree and a binary search tree.'),
('data-structures','medium','Implement Dijkstra''s shortest path algorithm using a priority queue.'),
('data-structures','medium','How would you find all strongly connected components in a directed graph?'),
('data-structures','medium','Design a data structure that supports insert, delete, and getRandom in O(1).');

-- Seed Data Structures hard
INSERT INTO public.questions (track, difficulty, question_text) VALUES
('data-structures','hard','Implement a self-balancing AVL tree with rotations.'),
('data-structures','hard','Design an efficient data structure for range minimum queries.'),
('data-structures','hard','How would you implement a concurrent skip list?'),
('data-structures','hard','Implement a red-black tree with insertion and deletion.'),
('data-structures','hard','Design a persistent data structure that supports versioned access.'),
('data-structures','hard','How would you implement a suffix array with LCP array for string matching?'),
('data-structures','hard','Implement a disjoint set (Union-Find) with path compression and union by rank.'),
('data-structures','hard','Design an interval tree that supports overlapping range queries.'),
('data-structures','hard','How would you implement an order-statistic tree (augmented BST)?'),
('data-structures','hard','Explain and implement a Fenwick tree (Binary Indexed Tree) for range sum queries.'),
('data-structures','hard','Design a cache-oblivious B-tree and explain its I/O complexity.'),
('data-structures','hard','Implement a compressed trie (radix tree) with efficient memory usage.');
