
CREATE TABLE public.coding_problems (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  track text NOT NULL CHECK (track IN ('python', 'sql')),
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  boilerplate_python text DEFAULT '',
  boilerplate_sql text DEFAULT '',
  test_cases jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active coding problems"
  ON public.coding_problems FOR SELECT TO authenticated
  USING (is_active = true);

-- Seed Python problems
INSERT INTO public.coding_problems (title, description, track, difficulty, boilerplate_python, test_cases) VALUES
('Two Sum', E'Given a list of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nYou may assume each input has exactly one solution, and you may not use the same element twice.\n\n**Example:**\n```\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]\n```', 'python', 'easy',
 E'def two_sum(nums, target):\n    # Your code here\n    pass\n\n# Do not modify below\nresult = two_sum(nums, target)\nprint(result)',
 '[{"input": "nums = [2, 7, 11, 15]\ntarget = 9", "expected_output": "[0, 1]"}, {"input": "nums = [3, 2, 4]\ntarget = 6", "expected_output": "[1, 2]"}, {"input": "nums = [3, 3]\ntarget = 6", "expected_output": "[0, 1]"}]'::jsonb),

('FizzBuzz', E'Write a function that returns a list of strings from 1 to `n`:\n- For multiples of 3, use `"Fizz"`\n- For multiples of 5, use `"Buzz"`\n- For multiples of both 3 and 5, use `"FizzBuzz"`\n- Otherwise, use the string of the number\n\n**Example:**\n```\nInput: n = 5\nOutput: ["1", "2", "Fizz", "4", "Buzz"]\n```', 'python', 'easy',
 E'def fizzbuzz(n):\n    # Your code here\n    pass\n\n# Do not modify below\nresult = fizzbuzz(n)\nprint(result)',
 '[{"input": "n = 5", "expected_output": "[''1'', ''2'', ''Fizz'', ''4'', ''Buzz'']"}, {"input": "n = 15", "expected_output": "[''1'', ''2'', ''Fizz'', ''4'', ''Buzz'', ''Fizz'', ''7'', ''8'', ''Fizz'', ''Buzz'', ''11'', ''Fizz'', ''13'', ''14'', ''FizzBuzz'']"}]'::jsonb),

('Reverse String', E'Write a function that reverses a string in-place.\n\n**Example:**\n```\nInput: s = "hello"\nOutput: "olleh"\n```', 'python', 'easy',
 E'def reverse_string(s):\n    # Your code here\n    pass\n\n# Do not modify below\nresult = reverse_string(s)\nprint(result)',
 '[{"input": "s = ''hello''", "expected_output": "olleh"}, {"input": "s = ''Python''", "expected_output": "nohtyP"}, {"input": "s = ''''", "expected_output": ""}]'::jsonb),

('Max Subarray', E'Given an integer array `nums`, find the subarray with the largest sum and return its sum.\n\n**Example:**\n```\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.\n```', 'python', 'medium',
 E'def max_subarray(nums):\n    # Your code here\n    pass\n\n# Do not modify below\nresult = max_subarray(nums)\nprint(result)',
 '[{"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "expected_output": "6"}, {"input": "nums = [1]", "expected_output": "1"}, {"input": "nums = [5,4,-1,7,8]", "expected_output": "23"}]'::jsonb);

-- Seed SQL problems
INSERT INTO public.coding_problems (title, description, track, difficulty, boilerplate_sql, test_cases) VALUES
('Select All Employees', E'Write a SQL query to select all columns from the `employees` table, ordered by `name` ascending.\n\n**Table: employees**\n| id | name | department | salary |\n|----|------|------------|--------|\n| 1 | Alice | Engineering | 90000 |\n| 2 | Bob | Marketing | 70000 |\n| 3 | Carol | Engineering | 95000 |', 'sql', 'easy',
 'SELECT * FROM employees ORDER BY name;',
 '[{"setup_sql": "CREATE TABLE employees (id INT, name TEXT, department TEXT, salary INT); INSERT INTO employees VALUES (1, ''Alice'', ''Engineering'', 90000), (2, ''Bob'', ''Marketing'', 70000), (3, ''Carol'', ''Engineering'', 95000);", "expected_output": "id,name,department,salary\n1,Alice,Engineering,90000\n2,Bob,Marketing,70000\n3,Carol,Engineering,95000"}]'::jsonb),

('Department Average Salary', E'Write a SQL query to find the average salary for each department. Return columns `department` and `avg_salary`, ordered by `department`.\n\n**Table: employees**\n| id | name | department | salary |\n|----|------|------------|--------|\n| 1 | Alice | Engineering | 90000 |\n| 2 | Bob | Marketing | 70000 |\n| 3 | Carol | Engineering | 95000 |\n| 4 | Dave | Marketing | 80000 |', 'sql', 'medium',
 E'SELECT department, AVG(salary) AS avg_salary\nFROM employees\nGROUP BY department\nORDER BY department;',
 '[{"setup_sql": "CREATE TABLE employees (id INT, name TEXT, department TEXT, salary INT); INSERT INTO employees VALUES (1, ''Alice'', ''Engineering'', 90000), (2, ''Bob'', ''Marketing'', 70000), (3, ''Carol'', ''Engineering'', 95000), (4, ''Dave'', ''Marketing'', 80000);", "expected_output": "department,avg_salary\nEngineering,92500\nMarketing,75000"}]'::jsonb);
