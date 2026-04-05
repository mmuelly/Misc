import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import GoogleLoginButton from "../components/auth/GoogleLoginButton";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-warm-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 text-white text-2xl font-bold mb-4 shadow-lg">
            FV
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Family Vote
          </h1>
          <p className="text-gray-500 text-lg">
            Family decisions, made together
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <p className="text-sm text-gray-600 mb-6">
            Sign in to start voting with your family
          </p>
          <GoogleLoginButton />
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Create polls, vote on activities and meals, and see what your family
          wants to do.
        </p>
      </div>
    </div>
  );
}
