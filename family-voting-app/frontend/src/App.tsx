import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PollDetailPage from "./pages/PollDetailPage";
import CreatePollPage from "./pages/CreatePollPage";
import FamilySettingsPage from "./pages/FamilySettingsPage";
import SuggestionsPage from "./pages/SuggestionsPage";
import NotFoundPage from "./pages/NotFoundPage";
import type { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/polls/new"
        element={
          <ProtectedRoute>
            <CreatePollPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/polls/:id"
        element={
          <ProtectedRoute>
            <PollDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/polls/:id/edit"
        element={
          <ProtectedRoute>
            <CreatePollPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suggestions"
        element={
          <ProtectedRoute>
            <SuggestionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/settings"
        element={
          <ProtectedRoute>
            <FamilySettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
