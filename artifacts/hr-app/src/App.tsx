import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AuthProvider, AuthGuard, useAuth } from './lib/auth';
import './i18n';
import Shell from './components/shell';
import Login from './pages/login';
import Register from './pages/register';
import Dashboard from './pages/dashboard';
import Announcements from './pages/announcements';
import Requests from './pages/requests';
import Clock from './pages/clock';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function RootRedirect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  return null;
}

function AuthenticatedApp() {
  return (
    <AuthGuard>
      <Shell>
        <Switch>
          <Route path="/" component={RootRedirect} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/announcements" component={Announcements} />
          <Route path="/requests" component={Requests} />
          <Route path="/clock" component={Clock} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/*" component={AuthenticatedApp} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
