import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-warm-50 px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-indigo-600 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Page not found
        </h1>
        <p className="text-gray-500 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
