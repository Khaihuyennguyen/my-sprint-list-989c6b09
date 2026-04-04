const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const PISTON_API = "https://emkc.org/api/v2/piston/execute";

interface TestCase {
  input: string;
  expected_output: string;
  setup_sql?: string;
}

interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { code, language, problem_id } = body;

    if (!code || !language || !problem_id) {
      return new Response(JSON.stringify({ error: "Missing code, language, or problem_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["python", "sql"].includes(language)) {
      return new Response(JSON.stringify({ error: "Unsupported language" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch test cases from DB
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: problem, error: fetchErr } = await serviceClient
      .from("coding_problems")
      .select("test_cases")
      .eq("id", problem_id)
      .single();

    if (fetchErr || !problem) {
      return new Response(JSON.stringify({ error: "Problem not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const testCases = problem.test_cases as TestCase[];
    const results: TestResult[] = [];

    if (language === "python") {
      for (const tc of testCases) {
        const fullCode = `${tc.input}\n${code}`;
        try {
          const pistonRes = await fetch(PISTON_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language: "python",
              version: "3.10.0",
              files: [{ name: "main.py", content: fullCode }],
              run_timeout: 10000,
            }),
          });

          const pistonData = await pistonRes.json();
          const output = (pistonData.run?.stdout || "").trim();
          const stderr = (pistonData.run?.stderr || "").trim();

          const passed = output === tc.expected_output.trim();
          results.push({
            passed,
            input: tc.input,
            expected: tc.expected_output,
            actual: output || stderr,
            error: stderr || null,
          });
        } catch (e) {
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.expected_output,
            actual: "",
            error: `Execution error: ${e.message}`,
          });
        }
      }
    } else {
      // SQL: use Piston with sqlite3
      for (const tc of testCases) {
        const sqlScript = tc.setup_sql
          ? `.mode csv\n.headers on\n${tc.setup_sql}\n${code}`
          : `.mode csv\n.headers on\n${code}`;

        try {
          const pistonRes = await fetch(PISTON_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language: "sqlite3",
              version: "3.36.0",
              files: [{ name: "query.sql", content: sqlScript }],
              run_timeout: 10000,
            }),
          });

          const pistonData = await pistonRes.json();
          const output = (pistonData.run?.stdout || "").trim();
          const stderr = (pistonData.run?.stderr || "").trim();

          const passed = output === tc.expected_output.trim();
          results.push({
            passed,
            input: tc.setup_sql ? "See problem description" : code,
            expected: tc.expected_output,
            actual: output || stderr,
            error: stderr || null,
          });
        } catch (e) {
          results.push({
            passed: false,
            input: "SQL execution",
            expected: tc.expected_output,
            actual: "",
            error: `Execution error: ${e.message}`,
          });
        }
      }
    }

    const totalPassed = results.filter((r) => r.passed).length;

    return new Response(
      JSON.stringify({
        results,
        total: results.length,
        passed: totalPassed,
        all_passed: totalPassed === results.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
