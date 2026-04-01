import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2, TrendingUp, Calendar, Target } from "lucide-react";
import { getSessionHistory, clearSessionHistory, type SessionRecord } from "@/lib/sessionHistory";
import { TRACKS } from "@/types/session";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

const chartConfig: ChartConfig = {
  clarity: { label: "Clarity", color: "hsl(var(--primary))" },
  structure: { label: "Structure", color: "hsl(160 60% 60%)" },
  completeness: { label: "Completeness", color: "hsl(200 80% 60%)" },
};

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRecord[]>(getSessionHistory);

  const trendData = useMemo(() => {
    return [...sessions]
      .reverse()
      .map((s, i) => ({
        session: i + 1,
        date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        clarity: s.averageScores.clarity,
        structure: s.averageScores.structure,
        completeness: s.averageScores.completeness,
        overall: s.overallScore,
      }));
  }, [sessions]);

  const stats = useMemo(() => {
    if (!sessions.length) return null;
    const avgOverall =
      Math.round((sessions.reduce((s, r) => s + r.overallScore, 0) / sessions.length) * 10) / 10;
    const best = Math.max(...sessions.map((s) => s.overallScore));
    return { total: sessions.length, avgOverall, best };
  }, [sessions]);

  const handleClear = () => {
    clearSessionHistory();
    setSessions([]);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </button>
          {sessions.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          )}
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-display font-bold text-foreground mb-8"
        >
          Session History
        </motion.h1>

        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 space-y-4"
          >
            <div className="text-4xl">📊</div>
            <p className="text-muted-foreground">No sessions yet. Complete a practice session to see your history.</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm hover:brightness-110 transition-all"
            >
              Start Practicing
            </button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Stats row */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { icon: Calendar, label: "Sessions", value: stats.total },
                  { icon: Target, label: "Avg Score", value: `${stats.avgOverall}/10` },
                  { icon: TrendingUp, label: "Best", value: `${stats.best}/10` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="glass-card p-4 text-center">
                    <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                    <div className="text-lg font-display font-bold text-foreground">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Trend chart */}
            {trendData.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-5"
              >
                <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
                  Score Trends
                </h3>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="clarity" stroke="var(--color-clarity)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="structure" stroke="var(--color-structure)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="completeness" stroke="var(--color-completeness)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ChartContainer>
              </motion.div>
            )}

            {/* Session list */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Past Sessions
              </h3>
              {sessions.map((session, i) => {
                const trackInfo = TRACKS.find((t) => t.id === session.track);
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="glass-card p-4 flex items-center gap-4"
                  >
                    <span className="text-2xl">{trackInfo?.icon || "📝"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{trackInfo?.label || session.track}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground capitalize">
                          {session.difficulty}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(session.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-display font-bold text-foreground">
                        {session.overallScore}
                      </span>
                      <span className="text-xs text-muted-foreground">/10</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
