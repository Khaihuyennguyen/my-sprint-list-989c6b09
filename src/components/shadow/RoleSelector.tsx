import { motion } from "framer-motion";
import { Users, Star } from "lucide-react";
import type { ShadowRole } from "@/types/shadow";

interface Props {
  roles: ShadowRole[];
  videoTitle: string;
  onSelect: (roleName: string) => void;
}

export function RoleSelector({ roles, videoTitle, onSelect }: Props) {
  // Recommend the role with more words (more practice)
  const recommendedRole = roles.reduce((a, b) => (a.wordCount > b.wordCount ? a : b), roles[0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8 max-w-lg mx-auto"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">Choose Your Role</h2>
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{videoTitle}</p>
      </div>

      <div className="space-y-3">
        {roles.map((role) => {
          const isRecommended = role.name === recommendedRole.name;
          return (
            <button
              key={role.name}
              onClick={() => onSelect(role.name)}
              className={`w-full p-4 rounded-xl border text-left transition-all hover:brightness-110 ${
                isRecommended
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-secondary/30 hover:border-primary/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-foreground">{role.name}</span>
                    {isRecommended && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
                        <Star className="w-3 h-3" /> Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {role.lineCount} lines · {role.wordCount} words
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        We recommend the longer role for more speaking practice
      </p>
    </motion.div>
  );
}
