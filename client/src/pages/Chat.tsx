import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { useMessages, useSendMessage, useClearMessages } from "@/hooks/use-messages";
import { Moon, Sun, Trash2, MessageSquareText, Menu, Mic, LogOut } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { VoiceOverlay } from "@/components/VoiceOverlay";

export default function Chat() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: messages, isLoading, error } = useMessages();
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: clearMessages, isPending: isClearing } = useClearMessages();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSend = (content: string) => {
    sendMessage(content, {
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message,
        });
      },
    });
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the conversation?")) {
      clearMessages(undefined, {
        onSuccess: () => {
          // No toast notified as requested
        },
      });
    }
  };

  const handleStartVoice = () => setIsVoiceOpen(true);

  // Empty state
  if (!isLoading && (!messages || messages.length === 0)) {
    return (
      <div className="flex flex-col h-screen bg-background relative overflow-hidden">
        <Header onClear={handleClear} isClearing={isClearing} hasMessages={false} onStartVoice={handleStartVoice} />

        <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl mx-auto w-full text-center">
          <div className="w-24 h-24 bg-card/50 backdrop-blur-sm rounded-3xl shadow-2xl shadow-primary/10 flex items-center justify-center mb-8 border border-white/20 rotate-3 transition-transform hover:rotate-6 duration-300">
            <img src="/favicon.png" alt="Project A" className="w-16 h-16 object-contain drop-shadow-sm" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 font-display">
            How can I help you today?
          </h2>
          <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
            I'm Project A, your intelligent AI assistant. I can answer questions, help with tasks, and have a friendly conversation with you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
            {["Explain quantum computing", "Write a poem about rain", "Debug my Python code", "Plan a trip to Japan"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSend(suggestion)}
                className="bg-card hover:bg-card/80 border border-border/60 hover:border-primary/30 hover:shadow-md p-4 rounded-xl text-sm text-left transition-all duration-200 group"
              >
                <span className="group-hover:text-primary transition-colors">{suggestion}</span>
              </button>
            ))}
          </div>
        </div>

        <ChatInput onSend={handleSend} disabled={isSending} />
        <VoiceOverlay isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header onClear={handleClear} isClearing={isClearing} hasMessages={true} onStartVoice={handleStartVoice} />

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-6"
      >
        <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
              Loading history...
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-10 bg-red-50 rounded-xl border border-red-100 dark:bg-red-900/10 dark:border-red-900/20">
              Failed to load messages. Please refresh.
            </div>
          ) : (
            <>
              {messages?.map((msg, idx: number) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLast={idx === (messages?.length ?? 0) - 1}
                />
              ))}
              {isSending && <TypingIndicator />}
            </>
          )}
        </div>
      </div>

      <ChatInput onSend={handleSend} disabled={isSending || isLoading} />
      <VoiceOverlay isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
    </div>
  );
}

function Header({ onClear, isClearing, hasMessages, onStartVoice }: { onClear: () => void, isClearing: boolean, hasMessages: boolean, onStartVoice: () => void }) {
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-background/80 backdrop-blur-md sticky top-0 z-20 border-b border-border/50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shadow-lg shadow-primary/20 bg-white dark:bg-white/10 dark:ring-1 dark:ring-white/20">
          <img src="/favicon.png" alt="Project A Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="font-bold text-lg tracking-tight">Project A</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onStartVoice}
          className="flex bg-primary/90 hover:bg-primary shadow-sm gap-2"
        >
          <Mic className="w-4 h-4" />
          <span className="hidden md:inline">Voice Mode</span>
        </Button>

        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center bg-muted/50 rounded-full p-1 border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              className={`w-8 h-8 rounded-full ${theme === "light" ? "bg-white shadow-sm text-primary" : "text-muted-foreground"}`}
              onClick={() => setTheme("light")}
            >
              <Sun className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`w-8 h-8 rounded-full ${theme === "dark" ? "bg-slate-800 shadow-sm text-primary" : "text-muted-foreground"}`}
              onClick={() => setTheme("dark")}
            >
              <Moon className="w-4 h-4" />
            </Button>
          </div>

          <div className="w-px h-4 bg-border/50 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={isClearing || !hasMessages}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </Button>

          <LogoutButton />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56 p-2">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground uppercase tracking-wider">Menu</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={onClear}
              disabled={isClearing || !hasMessages}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Conversation
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="cursor-pointer"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 mr-2" />
                  Dark Mode
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 mr-2" />
                  Light Mode
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-muted-foreground focus:text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header >
  );
}

function LogoutButton() {
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
      title={user?.email || "Sign out"}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Sign Out
    </Button>
  );
}

