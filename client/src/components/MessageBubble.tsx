import { cn } from "@/lib/utils";
import { type Message } from "@shared/schema";
import { Bot, User, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
  isTyping?: boolean;
  onTypingComplete?: () => void;
  onTypingTick?: () => void;
}

export function MessageBubble({
  message,
  isLast,
  isTyping = false,
  onTypingComplete,
  onTypingTick,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const contentStr = message?.content ?? "";

  // Typewriter state for assistant messages
  const [displayedLength, setDisplayedLength] = useState(() =>
    isTyping && !isUser ? 0 : contentStr.length
  );
  const [typingDone, setTypingDone] = useState(() => !isTyping || isUser);

  useEffect(() => {
    if (!isTyping || isUser) {
      setDisplayedLength(contentStr.length);
      setTypingDone(true);
      return;
    }

    setTypingDone(false);
    setDisplayedLength(0);

    const totalLength = contentStr.length;
    if (totalLength === 0) {
      setTypingDone(true);
      onTypingComplete?.();
      return;
    }

    // Dynamic speed based on response length for a natural, responsive typing feel
    const stepSize =
      totalLength > 600 ? 7 : totalLength > 300 ? 4 : totalLength > 120 ? 2 : 1;
    const intervalMs = totalLength > 600 ? 12 : totalLength > 300 ? 14 : 16;

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = Math.min(currentIndex + stepSize, totalLength);
      setDisplayedLength(currentIndex);
      onTypingTick?.();

      if (currentIndex >= totalLength) {
        setTypingDone(true);
        clearInterval(interval);
        onTypingComplete?.();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isTyping, isUser, contentStr]);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(contentStr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleBubbleClick = () => {
    // Clicking bubble while typing immediately completes animation
    if (!typingDone && !isUser) {
      setTypingDone(true);
      setDisplayedLength(contentStr.length);
      onTypingComplete?.();
    }
  };

  const renderedContent =
    isUser || typingDone
      ? contentStr
      : `${contentStr.slice(0, displayedLength)} ▍`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex w-full gap-3 md:gap-4 mb-6",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl shadow-sm border",
          isUser
            ? "bg-primary text-primary-foreground border-primary/20 dark:bg-card dark:text-foreground dark:border-border/60"
            : "bg-card text-emerald-600 border-border"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 md:h-5 md:w-5" />
        ) : (
          <img
            src="/favicon.png"
            alt="Project A"
            className="h-full w-full object-cover rounded-xl"
          />
        )}
      </div>

      {/* Bubble */}
      <div
        onClick={handleBubbleClick}
        className={cn(
          "relative group max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 md:px-5 md:py-4 shadow-sm text-sm md:text-base leading-relaxed transition-colors",
          !typingDone && !isUser ? "cursor-pointer" : "",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-none dark:bg-card dark:text-foreground dark:border dark:border-border/60"
            : "bg-card text-foreground border border-border/50 rounded-tl-none prose-custom"
        )}
      >
        {!isUser && (
          <div
            className={cn(
              "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity",
              isUser ? "left-2" : "right-2"
            )}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg backdrop-blur-sm border border-border/50 shadow-sm bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-[10px] font-medium">Copy message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        <div className={cn(!isUser && "prose-custom")}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-1">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-md font-bold mb-1.5 mt-0.5">{children}</h3>,
              code: ({ children }) => (
                <code
                  className={cn(
                    "font-mono text-sm px-1.5 py-0.5 rounded",
                    isUser
                      ? "bg-white/20 dark:bg-white/10"
                      : "bg-black/10 dark:bg-white/10"
                  )}
                >
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre
                  className={cn(
                    "font-mono text-sm p-3 rounded-lg overflow-x-auto my-2",
                    isUser
                      ? "bg-black/20 dark:bg-zinc-900/80 border border-transparent dark:border-border/50"
                      : "bg-black/10 dark:bg-zinc-900/80 border border-transparent dark:border-border/50"
                  )}
                >
                  {children}
                </pre>
              ),
            }}
          >
            {renderedContent}
          </ReactMarkdown>
        </div>

        {/* Time and Bottom Copy Button */}
        <div
          className={cn(
            "flex items-center justify-between mt-1 pt-1 border-t border-border/10 dark:border-border/40",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          <div
            className={cn(
              "text-[10px] opacity-60",
              isUser ? "text-primary-foreground/80 dark:text-muted-foreground" : "text-muted-foreground"
            )}
          >
            {message.createdAt &&
              new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 gap-1 px-2 text-[10px] transition-colors",
              isUser
                ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-white/5"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check-bottom"
                  className="flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Check
                    className={cn(
                      "h-3 w-3",
                      isUser ? "text-white dark:text-emerald-500" : "text-emerald-600"
                    )}
                  />
                  <span>Copied!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy-bottom"
                  className="flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
