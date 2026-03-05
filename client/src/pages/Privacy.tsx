import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, Globe } from "lucide-react";
import { useLocation } from "wouter";

export default function Privacy() {
    const [, setLocation] = useLocation();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <Button
                    variant="ghost"
                    onClick={() => setLocation("/login")}
                    className="group mb-4 pl-0 hover:pl-2 transition-all duration-300 text-slate-600 dark:text-slate-400"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Login
                </Button>

                <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                    <CardHeader className="pt-8 pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                                <Shield className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                                Privacy Policy
                            </CardTitle>
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </CardHeader>
                    <CardContent className="prose prose-slate dark:prose-invert max-w-none space-y-8 pb-12">
                        <section className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h3 className="flex items-center gap-2 mt-0">
                                <Eye className="w-5 h-5 text-blue-500" />
                                1. Overview
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                At <strong>Project A</strong>, your privacy is our priority. This policy outlines how we collect, use, and protect your data when you interact with our empathetic AI companion. We are committed to transparency and ensuring your information remains secure.
                            </p>
                        </section>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-indigo-500" />
                                    2. Information We Collect
                                </h3>
                                <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 space-y-2">
                                    <li><strong>Account Data:</strong> Name, email, and authentication info from Google OAuth.</li>
                                    <li><strong>Interactions:</strong> Chat logs and voice inputs to improve empathy responses.</li>
                                    <li><strong>Technical Data:</strong> IP address, device type, and usage patterns.</li>
                                </ul>
                            </div>

                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-emerald-500" />
                                    3. How We Use Data
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    We use your information to provide personalized AI interactions, maintain security, and analyze service performance. We never sell your personal data to third parties.
                                </p>
                            </div>
                        </div>

                        <section>
                            <h3>4. Google OAuth & Your Data</h3>
                            <p>
                                When you sign in using Google, we only request access to your basic profile (email and name). This information is used strictly for identity verification and account creation. You can manage Project A's access in your Google Account settings at any time.
                            </p>
                        </section>

                        <section>
                            <h3>5. Data Security</h3>
                            <p>
                                We implement industry-standard AES-256 encryption for data at rest and TLS for data in transit. Your empathetic interactions are stored in secure, isolated environments managed via Supabase.
                            </p>
                        </section>

                        <section border-t border-slate-100 dark:border-slate-800 pt-8>
                            <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-800/30 rounded-3xl">
                                <h4 className="text-slate-900 dark:text-white font-bold mb-2">Have questions?</h4>
                                <p className="text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
                                    If you have any questions about this Privacy Policy or our data practices, please reach out to our team.
                                </p>
                                <Button className="rounded-full px-8 py-6 h-auto bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                                    Contact Support
                                </Button>
                            </div>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
