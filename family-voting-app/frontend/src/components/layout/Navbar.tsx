import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getFamily } from "../../api/families";
import Avatar from "../ui/Avatar";

export default function Navbar() {
  const { user, logout, familyId } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: family } = useQuery({
    queryKey: ["family", familyId],
    queryFn: () => getFamily(familyId!),
    enabled: !!familyId,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Family Vote
            </Link>
            {family && (
              <span className="hidden sm:inline text-sm text-gray-500 border-l border-gray-200 pl-4">
                {family.name}
              </span>
            )}
          </div>

          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-1.5 transition-colors"
              >
                <Avatar
                  src={user.avatar_url}
                  name={user.display_name}
                  size="sm"
                />
                <span className="hidden sm:inline text-sm font-medium text-gray-700">
                  {user.display_name}
                </span>
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/family/settings");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
