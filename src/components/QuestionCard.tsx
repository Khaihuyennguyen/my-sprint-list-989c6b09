import { motion } from "framer-motion";

interface QuestionCardProps {
  questionIndex: number;
  totalQuestions: number;
  questionText: string;
}

export function QuestionCard({ questionIndex, totalQuestions, questionText }: QuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 space-y-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-primary">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
      </div>
      <p className="text-lg font-display font-medium text-foreground leading-relaxed">
        {questionText}
      </p>
    </motion.div>
  );
}
