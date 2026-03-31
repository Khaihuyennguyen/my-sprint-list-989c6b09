interface SessionProgressProps {
  currentIndex: number;
  totalQuestions: number;
}

export function SessionProgress({ currentIndex, totalQuestions }: SessionProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalQuestions }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i < currentIndex
              ? "bg-primary"
              : i === currentIndex
              ? "bg-primary/50"
              : "bg-secondary"
          }`}
        />
      ))}
    </div>
  );
}
