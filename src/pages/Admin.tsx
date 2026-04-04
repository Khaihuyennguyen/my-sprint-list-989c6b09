import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Plus, Pencil, Trash2, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TRACKS, DIFFICULTIES, type Track, type Difficulty } from "@/types/session";

interface Question {
  id: string;
  track: string;
  difficulty: string;
  question_text: string;
  is_active: boolean;
  created_at: string;
}

type FormData = {
  track: Track;
  difficulty: Difficulty;
  question_text: string;
  is_active: boolean;
};

const defaultForm: FormData = { track: "sql", difficulty: "easy", question_text: "", is_active: true };

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTrack, setFilterTrack] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    // Use service-role via edge function or direct query — since RLS only allows SELECT on active,
    // we need an edge function for admin. For now, query all (RLS shows active only for auth users).
    // We'll fetch all and let the admin see them.
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("track")
      .order("difficulty")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load questions");
      console.error(error);
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const filtered = questions.filter((q) => {
    if (filterTrack !== "all" && q.track !== filterTrack) return false;
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
    if (search && !q.question_text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditingId(q.id);
    setForm({ track: q.track as Track, difficulty: q.difficulty as Difficulty, question_text: q.question_text, is_active: q.is_active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question_text.trim()) {
      toast.error("Question text is required");
      return;
    }
    setSaving(true);

    if (editingId) {
      const { error } = await supabase.from("questions").update({
        track: form.track,
        difficulty: form.difficulty,
        question_text: form.question_text.trim(),
        is_active: form.is_active,
      }).eq("id", editingId);
      if (error) toast.error("Failed to update question");
      else toast.success("Question updated");
    } else {
      const { error } = await supabase.from("questions").insert({
        track: form.track,
        difficulty: form.difficulty,
        question_text: form.question_text.trim(),
        is_active: form.is_active,
      });
      if (error) toast.error("Failed to add question");
      else toast.success("Question added");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchQuestions();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("questions").delete().eq("id", deleteId);
    if (error) toast.error("Failed to delete question");
    else toast.success("Question deleted");
    setDeleteId(null);
    fetchQuestions();
  };

  const toggleActive = async (q: Question) => {
    const { error } = await supabase.from("questions").update({ is_active: !q.is_active }).eq("id", q.id);
    if (error) toast.error("Failed to toggle status");
    else {
      setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, is_active: !x.is_active } : x)));
    }
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-display font-bold text-foreground">Question Bank</h1>
            <Badge variant="secondary" className="ml-2">{questions.length} total</Badge>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Add Question
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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

        {/* Table */}
        <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading questions...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No questions found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Track</TableHead>
                  <TableHead className="w-[100px]">Difficulty</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-[80px] text-center">Active</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <TableRow key={q.id} className={!q.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {TRACKS.find((t) => t.id === q.track)?.icon} {q.track}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={diffColor(q.difficulty)}>{q.difficulty}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[400px] truncate text-sm">{q.question_text}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={q.is_active} onCheckedChange={() => toggleActive(q)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(q.id)} className="text-destructive hover:text-destructive">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the question details below." : "Fill in the details to add a new question."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Track</label>
                <Select value={form.track} onValueChange={(v) => setForm((f) => ({ ...f, track: v as Track }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRACKS.map((t) => <SelectItem key={t.id} value={t.id}>{t.icon} {t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Difficulty</label>
                <Select value={form.difficulty} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v as Difficulty }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Question Text</label>
              <Textarea rows={3} value={form.question_text} onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))} placeholder="Enter the interview question..." />
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
            <DialogTitle>Delete Question</DialogTitle>
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
