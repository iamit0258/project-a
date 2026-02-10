import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Login() {
    const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPasswordForEmail, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const { toast } = useToast();

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await resetPasswordForEmail(resetEmail.trim());
            toast({
                title: "Email Sent",
                description: "Check your inbox for the password reset link.",
            });
            setShowForgotPassword(false);
            setResetEmail('');
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to send reset email",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => { // keep existing handleSubmit
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (isSignUp) {
                if (!name.trim()) {
                    toast({
                        variant: "destructive",
                        title: "Name required",
                        description: "Please enter your name to sign up.",
                    });
                    setIsSubmitting(false);
                    return;
                }
                await signUpWithEmail(email.trim(), password, name.trim());
                toast({
                    title: "Check your email",
                    description: "We've sent you a confirmation link to complete sign up.",
                });
            } else {
                await signInWithEmail(email.trim(), password);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Authentication failed",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-sm shadow-2xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
                <CardHeader className="text-center space-y-2 pb-6">
                    <div className="mx-auto w-20 h-20 bg-white rounded-3xl shadow-lg shadow-blue-500/20 flex items-center justify-center mb-4 p-4 ring-1 ring-gray-100 dark:ring-white/10">
                        <img src="/favicon.png" alt="Project A" className="w-full h-full object-contain" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        {isSignUp ? 'Create Account' : 'Welcome back'}
                    </CardTitle>
                    <CardDescription className="text-base">
                        {isSignUp
                            ? 'Sign up to get started.'
                            : 'Sign in to continue to Project A.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Your full name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={isSignUp}
                                    className="h-11 bg-background/50"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11 bg-background/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="pr-10 h-11 bg-background/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-transparent border-none p-0 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <Button
                            type="submit"
                            disabled={loading || isSubmitting}
                            className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                        >
                            {isSubmitting ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border/50" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-transparent px-2 text-muted-foreground font-medium backdrop-blur-sm">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        type="button"
                        className="w-full h-12 hover:bg-white/50 dark:hover:bg-gray-800/50"
                        onClick={async () => {
                            try {
                                await signInWithGoogle();
                            } catch (error: any) {
                                toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: error.message || "Google Sign-In failed",
                                });
                            }
                        }}
                        disabled={loading || isSubmitting}
                    >
                        <FcGoogle className="mr-2 h-5 w-5" />
                        Google
                    </Button>

                    <div className="text-center text-sm space-y-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-primary hover:text-primary/80 hover:underline transition-colors block w-full text-xs font-medium"
                        >
                            Forgot your password?
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-foreground hover:text-primary transition-colors block w-full font-medium"
                        >
                            {isSignUp
                                ? 'Already have an account? Sign in'
                                : "Don't have an account? Sign up"}
                        </button>
                    </div>

                    <p className="text-center text-[10px] text-muted-foreground leading-relaxed pt-4 border-t border-border/30 mt-4">
                        By signing in, you agree to our{' '}
                        <a href="/terms" className="underline hover:text-primary">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" className="underline hover:text-primary">Privacy Policy</a>.
                    </p>
                </CardContent>
            </Card>

            <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter your email address and we'll send you a link to reset your password.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reset-email">Email</Label>
                            <Input
                                id="reset-email"
                                type="email"
                                placeholder="you@example.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Sending..." : "Send Reset Link"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
