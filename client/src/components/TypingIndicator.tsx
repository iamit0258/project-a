import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex w-full gap-3 md:gap-4 mb-6"
    >
      <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-card text-emerald-600 border border-border shadow-sm">
        <img src="/favicon.png" alt="Project A" className="h-full w-full object-cover rounded-xl" />
      </div>

      <div className="bg-card text-card-foreground border border-border/50 px-4 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 min-w-[60px]">
        <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
      </div>
    </motion.div>
  );
}

