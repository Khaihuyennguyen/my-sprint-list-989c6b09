import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CodingProblem {
  id: string;
  title: string;
  description: string;
  track: string;
  difficulty: string;
  boilerplate_python: string | null;
  boilerplate_sql: string | null;
  solution: string | null;
  test_cases: any[];
  is_active: boolean;
  created_at: string;
}

interface FormData {
  title: string;
  description: string;
  track: string;
  difficulty: string;
  boilerplate_python: string;
  boilerplate_sql: string;
  solution: string;
  test_cases_json: string;
  is_active: boolean;
}

const defaultForm: FormData = {
  title: "",
  description: "",
  track: "python",
  difficulty: "easy",
  boilerplate_python: "",
  boilerplate_sql: "",
  solution: "",
  test_cases_json: "[]",
  is_active: true,
};

const TRACKS = [
  { id: "python", label: "Python", icon: "🐍" },
  { id: "sql", label: "SQL", icon: "🗄️" },
];

const DIFFICULTIES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

export default function AdminProblems() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTrack, setFilterTrack] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coding_problems")
      .select("*")
      .order("track")
      .order("difficulty")
      .order("title");

    if (error) {
      toast.error("Failed to load problems");
      console.error(error);
    } else {
      setProblems((data as CodingProblem[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const filtered = problems.filter((p) => {
    if (filterTrack !== "all" && p.track !== filterTrack) return false;
    if (filterDifficulty !== "all" && p.difficulty !== filterDifficulty) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (p: CodingProblem) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description,
      track: p.track,
      difficulty: p.difficulty,
      boilerplate_python: p.boilerplate_python || "",
      boilerplate_sql: p.boilerplate_sql || "",
      solution: (p as any).solution || "",
      test_cases_json: JSON.stringify(p.test_cases, null, 2),
      is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    let testCases: any[];
    try {
      testCases = JSON.parse(form.test_cases_json);
    } catch {
      toast.error("Invalid JSON for test cases");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      track: form.track,
      difficulty: form.difficulty,
      boilerplate_python: form.boilerplate_python,
      boilerplate_sql: form.boilerplate_sql,
      solution: form.solution,
      test_cases: testCases,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase.from("coding_problems").update(payload).eq("id", editingId);
      if (error) toast.error("Failed to update problem");
      else toast.success("Problem updated");
    } else {
      const { error } = await supabase.from("coding_problems").insert(payload);
      if (error) toast.error("Failed to add problem");
      else toast.success("Problem added");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchProblems();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("coding_problems").delete().eq("id", deleteId);
    if (error) toast.error("Failed to delete problem");
    else toast.success("Problem deleted");
    setDeleteId(null);
    fetchProblems();
  };

  const toggleActive = async (p: CodingProblem) => {
    const { error } = await supabase.from("coding_problems").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error("Failed to toggle status");
    else setProblems((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x)));
  };

  const diffColor = (d: string) => {
    if (d === "easy") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (d === "medium") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-display font-bold text-foreground">Coding Problems</h1>
            <Badge variant="secondary" className="ml-2">{problems.length} total</Badge>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Add Problem
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search problems..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterTrack} onValueChange={setFilterTrack}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Track" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              {TRACKS.map((t) => <SelectItem key={t.id} value={t.id}>{t.icon} {t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {DIFFICULTIES.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading problems...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No problems found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Track</TableHead>
                  <TableHead className="w-[90px]">Difficulty</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[80px] text-center">Tests</TableHead>
                  <TableHead className="w-[80px] text-center">Active</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} className={!p.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {TRACKS.find((t) => t.id === p.track)?.icon} {p.track}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={diffColor(p.difficulty)}>{p.difficulty}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{p.title}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{p.test_cases?.length || 0}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Problem" : "Add Problem"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the coding problem details." : "Fill in the details to add a new coding problem."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Track</label>
                <Select value={form.track} onValueChange={(v) => setForm((f) => ({ ...f, track: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRACKS.map((t) => <SelectItem key={t.id} value={t.id}>{t.icon} {t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Difficulty</label>
                <Select value={form.difficulty} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Two Sum" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea rows={5} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Problem description with examples..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Solution (reference)</label>
              <Textarea rows={4} value={form.solution} onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))} placeholder="Reference solution code..." className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Python Boilerplate</label>
              <Textarea rows={3} value={form.boilerplate_python} onChange={(e) => setForm((f) => ({ ...f, boilerplate_python: e.target.value }))} placeholder="def solution(...):" className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">SQL Boilerplate</label>
              <Textarea rows={3} value={form.boilerplate_sql} onChange={(e) => setForm((f) => ({ ...f, boilerplate_sql: e.target.value }))} placeholder="SELECT ..." className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Test Cases (JSON)</label>
              <Textarea rows={6} value={form.test_cases_json} onChange={(e) => setForm((f) => ({ ...f, test_cases_json: e.target.value }))} placeholder='[{"input": "...", "expected": "..."}]' className="font-mono text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <label className="text-sm text-muted-foreground">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Problem</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
