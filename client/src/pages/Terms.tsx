import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Terms() {
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
                        <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none space-y-4">
                        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

                        <h3>1. Acceptance of Terms</h3>
                        <p>
                            By accessing and using Project A ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
                        </p>

                        <h3>2. Description of Service</h3>
                        <p>
                            Project A is an AI-powered assistant designed to help users with various tasks. The Service is provided "as is" and is subject to change or termination at any time.
                        </p>

                        <h3>3. User Conduct</h3>
                        <p>
                            You agree to use the Service only for lawful purposes. You are prohibited from using the Service to generate harmful, illegal, or abusive content.
                        </p>

                        <h3>4. Disclaimer of Warranties</h3>
                        <p>
                            The Service is provided on an "as is" and "as available" basis. We expressly disclaim all warranties of any kind, whether express or implied.
                        </p>

                        <h3>5. Limitation of Liability</h3>
                        <p>
                            In no event shall Project A be liable for any direct, indirect, incidental, special, consequential, or exemplary damages.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
