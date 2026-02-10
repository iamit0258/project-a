import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Privacy() {
    const [, setLocation] = useLocation();

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => setLocation("/login")}
                    className="mb-4 pl-0 hover:pl-2 transition-all"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none space-y-4">
                        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

                        <h3>1. Information Collection</h3>
                        <p>
                            We collect information you provide directly to us, such as when you create an account, send messages to the AI, or contact us for support.
                        </p>

                        <h3>2. Use of Information</h3>
                        <p>
                            We use the information we collect to operate, maintain, and improve our Service, to communicate with you, and to personalize your experience.
                        </p>

                        <h3>3. Data Storage</h3>
                        <p>
                            Your conversation history is stored securely to provide you with context-aware assistance. We implement appropriate technical, administrative, and physical security measures.
                        </p>

                        <h3>4. Third-Party Services</h3>
                        <p>
                            We may use third-party service providers to help us provide portions of the Service, such as AI model inference or hosting.
                        </p>

                        <h3>5. Contact Us</h3>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
