import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Scale, UserCheck, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

export default function Terms() {
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
                                <FileText className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                                Terms of Service
                            </CardTitle>
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </CardHeader>
                    <CardContent className="prose prose-slate dark:prose-invert max-w-none space-y-8 pb-12">
                        <section className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h3 className="flex items-center gap-2 mt-0">
                                <Scale className="w-5 h-5 text-blue-500" />
                                1. Acceptance of Terms
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                By accessing or using <strong>Project A</strong> ("the Service"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not access the Service.
                            </p>
                        </section>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2">
                                    <UserCheck className="w-5 h-5 text-indigo-500" />
                                    2. Use of Service
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Our AI companion is designed for empathetic interaction. You agree to use the Service only for lawful purposes and in a manner that does not infringe the rights of others.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    3. AI Content Disclaimer
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Project A generates content based on AI models. While we strive for empathy and accuracy, responses should not be taken as professional advice (medical, legal, or financial).
                                </p>
                            </div>
                        </div>

                        <section>
                            <h3>4. User Accounts</h3>
                            <p>
                                You are responsible for maintaining the confidentiality of your account credentials, including those obtained through Google OAuth. Notify us immediately of any unauthorized use of your account.
                            </p>
                        </section>

                        <section>
                            <h3>5. Proprietary Rights</h3>
                            <p>
                                The Service and its original content, features, and functionality are and will remain the exclusive property of Project A and its licensors.
                            </p>
                        </section>

                        <section>
                            <h3>6. Limitation of Liability</h3>
                            <p>
                                In no event shall Project A, nor its directors, employees, or partners, be liable for any indirect, incidental, or consequential damages resulting from your use of the Service.
                            </p>
                        </section>

                        <section border-t border-slate-100 dark:border-slate-800 pt-8>
                            <div className="text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    These terms are subject to change. Continued use of the Service after changes constitutes acceptance of the new terms.
                                </p>
                            </div>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
