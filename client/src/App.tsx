import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MyFacilities from "./pages/MyFacilities";
import NotFound from "./pages/not-found";

function Router() {
  const { isAuthenticated, isSetupComplete } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/setup" component={MyFacilities} />
      <Route path="/dashboard">
        {isAuthenticated ? <Dashboard /> : <Login />}
      </Route>
      <Route path="/">
        {!isAuthenticated ? <Login /> : isSetupComplete ? <Dashboard /> : <MyFacilities />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
