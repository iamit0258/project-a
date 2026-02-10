import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { supabase } from "./lib/supabase";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Chat from "@/pages/Chat";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import UpdatePassword from "@/pages/UpdatePassword";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <Component />;
}

function Router() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setLocation("/update-password");
      }
    });
    return () => subscription.unsubscribe();
  }, [setLocation]);

  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={Chat} />} />
      <Route path="/login" component={Login} />
      <Route path="/update-password" component={UpdatePassword} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="project-a-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
