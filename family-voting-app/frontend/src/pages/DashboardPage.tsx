import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/layout/PageShell";
import PollCard from "../components/polls/PollCard";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { usePolls } from "../hooks/usePolls";
import { createFamily, joinFamily, getFamily } from "../api/families";
import { useQuery } from "@tanstack/react-query";

type CategoryFilter = "all" | "activity" | "meal" | "custom";

function FamilySetup() {
  const { setFamilyId } = useAuth();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const family = await createFamily(name.trim());
      setFamilyId(family.id);
    } catch {
      setError("Failed to create family. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const family = await joinFamily(inviteCode.trim());
      setFamilyId(family.id);
    } catch {
      setError("Invalid invite code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to Family Vote!
        </h2>
        <p className="text-gray-500">
          Create a new family group or join an existing one to get started.
        </p>
      </div>

      {mode === "choose" && (
        <div className="space-y-3">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow text-center"
            onClick={() => setMode("create")}
          >
            <div className="text-3xl mb-2">&#127968;</div>
            <h3 className="font-semibold text-gray-900">Create a Family</h3>
            <p className="text-sm text-gray-500 mt-1">
              Start a new family group and invite members
            </p>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow text-center"
            onClick={() => setMode("join")}
          >
            <div className="text-3xl mb-2">&#128279;</div>
            <h3 className="font-semibold text-gray-900">Join a Family</h3>
            <p className="text-sm text-gray-500 mt-1">
              Enter an invite code to join your family
            </p>
          </Card>
        </div>
      )}

      {mode === "create" && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Family Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Smiths"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMode("choose")}
              >
                Back
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                Create Family
              </Button>
            </div>
          </form>
        </Card>
      )}

      {mode === "join" && (
        <Card>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter invite code"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMode("choose")}
              >
                Back
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                Join Family
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { familyId } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [copied, setCopied] = useState(false);

  const { data: polls, isLoading: pollsLoading } = usePolls(familyId);
  const { data: family } = useQuery({
    queryKey: ["family", familyId],
    queryFn: () => getFamily(familyId!),
    enabled: !!familyId,
  });

  if (!familyId) {
    return (
      <PageShell>
        <FamilySetup />
      </PageShell>
    );
  }

  const filteredPolls =
    filter === "all"
      ? polls
      : polls?.filter((p) => p.category === filter);

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "activity", label: "Activities" },
    { key: "meal", label: "Meals" },
    { key: "custom", label: "Custom" },
  ];

  const handleCopyInvite = async () => {
    if (family?.invite_code) {
      await navigator.clipboard.writeText(family.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <PageShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Polls</h1>
          {family && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">
                Invite code:{" "}
                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                  {family.invite_code}
                </code>
              </span>
              <button
                onClick={handleCopyInvite}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>
        <Button onClick={() => navigate("/polls/new")}>
          + New Poll
        </Button>
      </div>

      <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm w-fit">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === cat.key
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {pollsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm p-6 animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPolls && filteredPolls.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">&#128202;</div>
          <h3 className="font-semibold text-gray-900 mb-1">No polls yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            {filter !== "all"
              ? `No ${filter} polls found. Try a different category or create one.`
              : "Create your first poll to start making decisions together!"}
          </p>
          <Button onClick={() => navigate("/polls/new")}>
            Create First Poll
          </Button>
        </Card>
      )}
    </PageShell>
  );
}
