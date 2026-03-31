import { motion } from "framer-motion";

interface WaveformProps {
  isActive: boolean;
  barCount?: number;
}

export function Waveform({ isActive, barCount = 24 }: WaveformProps) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-10">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          animate={
            isActive
              ? {
                  height: [4, Math.random() * 28 + 8, 4],
                  opacity: [0.4, 1, 0.4],
                }
              : { height: 4, opacity: 0.2 }
          }
          transition={
            isActive
              ? {
                  duration: 0.4 + Math.random() * 0.4,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.03,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}
