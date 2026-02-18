
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Loader2, Volume2, MicOff } from 'lucide-react';
import { useSendMessage } from '@/hooks/use-messages';
import { Button } from './ui/button';

// Type definitions for Web Speech API
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: (event: Event) => void;
    onend: (event: Event) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionConstructor;
        webkitSpeechRecognition: SpeechRecognitionConstructor;
    }
}

interface VoiceOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

function TypewriterText({ text, speed = 30 }: { text: string; speed?: number }) {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        setDisplayedText('');
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);

    return <>{displayedText}</>;
}

function Visualizer({ isActive }: { isActive: boolean }) {
    const bars = Array.from({ length: 20 });
    return (
        <div className="flex items-center justify-center gap-1 h-12">
            {bars.map((_, i) => (
                <motion.div
                    key={i}
                    animate={isActive ? {
                        height: [8, Math.random() * 40 + 10, 8],
                        opacity: [0.3, 1, 0.3],
                    } : {
                        height: 4,
                        opacity: 0.1
                    }}
                    transition={{
                        duration: isActive ? 0.4 + Math.random() * 0.4 : 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.05
                    }}
                    className="w-1 rounded-full bg-indigo-400"
                />
            ))}
        </div>
    );
}

export function VoiceOverlay({ isOpen, onClose }: VoiceOverlayProps) {
    const [state, setState] = useState<'idle' | 'listening' | 'processing' | 'speaking' | 'error'>('idle');
    const [transcript, setTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const { mutate: sendMessage } = useSendMessage();
    const silenceTimer = useRef<NodeJS.Timeout>();
    const isMounted = useRef(true);

    // Initialize Speech Recognition
    useEffect(() => {
        isMounted.current = true;
        if (isOpen) {
            setupRecognition();
        } else {
            stopEverything();
        }

        return () => {
            isMounted.current = false;
            stopEverything();
        };
    }, [isOpen]);

    const stopEverything = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) { /* ignore */ }
        }
        window.speechSynthesis.cancel();
        clearTimeout(silenceTimer.current);
        setState('idle');
        setTranscript('');
        setAiResponse('');
    };

    const clearResponse = () => {
        setAiResponse('');
        setTranscript('');
    };

    const setupRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setState('error');
            setTranscript("Your browser usually does not support voice recognition. Try Chrome.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false; // Stop after one sentence for "turn based"
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Default to English, could auto-detect or toggle

        recognition.onstart = () => {
            if (isMounted.current) {
                setState('listening');
                setTranscript('');
                setAiResponse('');
            }
        };

        recognition.onresult = (event) => {
            if (!isMounted.current) return;

            const current = event.resultIndex;
            const result = event.results[current];
            const text = result[0].transcript;

            setTranscript(text);

            // Reset silence timer on input
            clearTimeout(silenceTimer.current);
            silenceTimer.current = setTimeout(() => {
                if (result.isFinal) {
                    recognition.stop();
                }
            }, 1000); // 1.5s silence triggers send if final
        };

        recognition.onend = () => {
            if (!isMounted.current) return;
            // If we have text, send it
            // We need to check the latest transcript state roughly
            // Because onend runs after stop(), and usually we want to send.
            // But we can't access state easily in closure without ref logic or just rely on flow.
            // Let's rely on handleSend called explicitly or check if we had input.
        };

        // We need to capture the transcript when it's FINAL
        const originalOnResult = recognition.onresult;
        recognition.onresult = (event) => {
            originalOnResult(event);
            const result = event.results[event.resultIndex];
            if (result.isFinal) {
                handleSend(result[0].transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech error", event.error);
            if (event.error === 'no-speech') {
                // Ignore no-speech, just restart or stay listening?
                // Usually means timeout.
            } else if (event.error === 'not-allowed') {
                if (isMounted.current) {
                    setState('error');
                    setTranscript("Microphone access denied. Please allow access.");
                }
            } else {
                if (isMounted.current) setState('error');
            }
        };

        recognitionRef.current = recognition;

        // Start listening immediately
        try {
            recognition.start();
        } catch (e) { console.error(e); }
    };

    const requestPermission = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setupRecognition();
        } catch (e) {
            setTranscript("Permission still denied. Check browser settings.");
        }
    };

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        clearResponse();
        setState('processing');
        if (recognitionRef.current) recognitionRef.current.stop();

        sendMessage(text, {
            onSuccess: (response) => {
                if (!isMounted.current) return;
                // Defer setAiResponse until audio or fallback is ready
                speak(response.content);
            },
            onError: (err) => {
                if (!isMounted.current) return;
                setTranscript("Error: " + err.message);
                setState('error');
            }
        });
    };

    const cleanTextForSpeech = (text: string) => {
        return text
            .replace(/\*\*/g, '') // Remove double asterisks (bold)
            .replace(/\*/g, '')   // Remove single asterisks (italics/bullets)
            .replace(/#/g, '')    // Remove hashtags (headers)
            .replace(/__/g, '')   // Remove double underscores
            .replace(/_/g, '')    // Remove single underscores
            .replace(/`/g, '')    // Remove backticks
            .replace(/>/g, '')    // Remove blockquotes
            .replace(/\[|\]|\(|\)/g, '') // Remove links/brackets
            .trim();
    };

    const speak = async (text: string) => {
        if (!isMounted.current) return;
        setState('speaking');

        const cleanedText = cleanTextForSpeech(text);

        // Cancel browser synthesis
        window.speechSynthesis.cancel();

        try {
            // 1. Try ElevenLabs High Quality TTS
            const response = await fetch("/api/voice/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: cleanedText })
            });

            if (!response.ok) throw new Error("TTS Failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            audio.onplay = () => {
                if (isMounted.current) {
                    setAiResponse(text);
                }
            };

            audio.onended = () => {
                if (isMounted.current) {
                    setState('listening');
                    if (recognitionRef.current) {
                        try { recognitionRef.current.start(); } catch (e) { }
                    }
                }
                URL.revokeObjectURL(url);
            };

            audio.onerror = () => {
                console.error("Audio playback error");
                fallbackSpeak(cleanedText); // Fallback
            };

            await audio.play();

        } catch (e) {
            console.warn("ElevenLabs TTS failed, using fallback:", e);
            fallbackSpeak(cleanedText);
        }
    };

    const fallbackSpeak = (text: string) => {
        if (!isMounted.current) return;

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.onstart = () => {
            if (isMounted.current) {
                setAiResponse(text);
            }
        };

        // Try to find a good female voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Zira")) // Windows Female
            || voices.find(v => v.name.includes("Google US English")) // Chrome Female
            || voices.find(v => v.name.includes("Female")) // Generic
            || voices.find(v => v.lang.includes("en-US"));

        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => {
            if (isMounted.current) {
                setState('listening');
                if (recognitionRef.current) {
                    try { recognitionRef.current.start(); } catch (e) { }
                }
            }
        };

        utterance.onerror = () => {
            if (isMounted.current) setState('idle');
        };

        window.speechSynthesis.speak(utterance);
    };

    const handleMicClick = () => {
        if (state === 'listening' || state === 'speaking') {
            if (recognitionRef.current) recognitionRef.current.stop();
            window.speechSynthesis.cancel();
            setState('idle');
        } else {
            if (recognitionRef.current) {
                try { recognitionRef.current.start(); } catch (e) { setupRecognition(); }
            } else {
                setupRecognition();
            }
        }
    };

    // Use Portal to ensure it sits on top of EVERYTHING
    if (!isOpen) return null;

    // Animation Variants
    const orbVariants = {
        idle: { scale: 1, filter: "blur(0px)", opacity: 0.3, backgroundColor: "#6366f1" },
        listening: {
            scale: [1, 1.3, 1],
            filter: "blur(8px)",
            opacity: 0.8,
            backgroundColor: "#818cf8",
            transition: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
        },
        processing: {
            scale: 0.8,
            filter: "blur(20px)",
            rotate: 360,
            opacity: 0.5,
            transition: { repeat: Infinity, duration: 1, ease: "linear" }
        },
        speaking: {
            scale: [1, 1.2, 1, 1.4, 1],
            filter: "blur(4px)",
            backgroundColor: "#4f46e5",
            transition: { repeat: Infinity, duration: 1.2 }
        },
        error: { backgroundColor: "#ef4444", scale: 1, filter: "blur(0px)" }
    };

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-zinc-950 p-8 text-white overflow-hidden"
            >
                {/* Background Atmosphere */}
                <div className="absolute inset-0 pointer-events-none">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.1, 0.2, 0.1]
                        }}
                        transition={{ duration: 8, repeat: Infinity }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)]"
                    />
                </div>

                {/* Top Nav */}
                <div className="w-full flex justify-between items-center relative z-[10001]">
                    <div className="flex items-center gap-2 text-white/40 uppercase tracking-[0.3em] text-[10px] font-bold">
                        <div className={`w-1.5 h-1.5 rounded-full ${state === 'listening' ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
                        System Active
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full w-10 h-10 text-white/50 hover:text-white hover:bg-white/10"
                        onClick={onClose}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content Container */}
                <div className="flex-1 w-full max-w-4xl flex flex-col relative z-10 pt-16 h-full">

                    {/* Transcript Area - Scrollable but stays above controls */}
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-[240px]">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full text-center px-4"
                        >
                            {state === 'speaking' || aiResponse ? (
                                <p className="text-2xl md:text-3xl font-extralight text-white leading-relaxed tracking-tight drop-shadow-2xl">
                                    <TypewriterText text={aiResponse} speed={20} />
                                </p>
                            ) : (
                                <p className="text-xl md:text-2xl font-extralight text-white/30 italic">
                                    {transcript || "Speak now..."}
                                </p>
                            )}
                        </motion.div>
                    </div>

                    {/* Interaction Hub - LOCKED TO BOTTOM */}
                    <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center pointer-events-none">
                        {/* Visualizer */}
                        <div className="h-16 flex items-center justify-center mb-8">
                            {(state === 'speaking' || aiResponse) && <Visualizer isActive={state === 'speaking'} />}
                        </div>

                        {/* Interaction Control */}
                        <div className="relative flex flex-col items-center pointer-events-auto">
                            <motion.button
                                variants={orbVariants}
                                animate={state}
                                onClick={handleMicClick}
                                className="w-28 h-28 rounded-full cursor-pointer relative z-20 flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.2)] group"
                            >
                                <div className="absolute inset-0 rounded-full border border-white/10 group-hover:border-white/20 transition-colors" />
                                {state === 'processing' ? (
                                    <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
                                ) : state === 'error' ? (
                                    <MicOff className="w-6 h-6 text-red-500" />
                                ) : (
                                    <Mic className={`w-6 h-6 transition-all duration-500 ${state === 'listening' ? 'text-white scale-125' : 'text-white/30 scale-100'}`} />
                                )}
                            </motion.button>

                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-4 text-[8px] uppercase tracking-[0.4em] font-black text-white/10"
                            >
                                {state}
                            </motion.span>
                        </div>
                    </div>
                </div>

                {/* Footer Message */}
                <div className="w-full text-center pb-4 text-white/10 text-[9px] uppercase tracking-[0.2em] relative z-10">
                    Project A Neural Interface
                </div>

                {/* Error Actions */}
                {state === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-[20000] p-12 text-center space-y-6">
                        <p className="text-red-400 text-xl font-light">Microphone Access Required</p>
                        <Button variant="outline" onClick={requestPermission} className="border-red-400/30 text-red-400 hover:bg-red-400/10">
                            Retry Permission
                        </Button>
                        <Button variant="ghost" onClick={onClose} className="text-white/40">Cancel</Button>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

// Add global style for hiding scrollbar if needed, though inline style handles most browsers
const globalStyles = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  body.voice-open { overflow: hidden; }
`;

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);
}
