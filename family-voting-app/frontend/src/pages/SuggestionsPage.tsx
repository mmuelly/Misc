import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageShell from "../components/layout/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import { useAuth } from "../hooks/useAuth";
import { usePolls } from "../hooks/usePolls";
import {
  useSuggestions,
  useSuggestPoll,
  useSuggestOption,
  useResolveSuggestion,
  useDeleteSuggestion,
} from "../hooks/useSuggestions";
import { getFamily } from "../api/families";
import type { Suggestion } from "../types";

type Tab = "poll" | "option";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SuggestionCard({
  suggestion,
  isAdmin,
  isOwn,
  onApprove,
  onReject,
  onDelete,
  resolving,
  deleting,
}: {
  suggestion: Suggestion;
  isAdmin: boolean;
  isOwn: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  resolving: boolean;
  deleting: boolean;
}) {
  const isPoll = suggestion.suggestion_type === "poll";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isPoll
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isPoll ? "Poll" : "Option"}
            </span>
            <span className="text-xs text-gray-400">
              {timeAgo(suggestion.created_at)}
            </span>
          </div>

          {isPoll ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {suggestion.title}
              </h3>
              {suggestion.category && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Category: {suggestion.category}
                </p>
              )}
              {suggestion.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {suggestion.description}
                </p>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {suggestion.option_label}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                For poll: {suggestion.poll_title}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <Avatar
              src={suggestion.suggester_avatar}
              name={suggestion.suggester_name}
              size="sm"
            />
            <span className="text-xs text-gray-500">
              {suggestion.suggester_name}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          {isAdmin && (
            <>
              <Button
                size="sm"
                onClick={onApprove}
                disabled={resolving || deleting}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={onReject}
                disabled={resolving || deleting}
              >
                Reject
              </Button>
            </>
          )}
          {isOwn && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onDelete}
              disabled={resolving || deleting}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function SuggestionsPage() {
  const { user, familyId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("poll");
  const [pollTitle, setPollTitle] = useState("");
  const [pollCategory, setPollCategory] = useState("activity");
  const [pollDescription, setPollDescription] = useState("");
  const [selectedPollId, setSelectedPollId] = useState<number | "">("");
  const [optionLabel, setOptionLabel] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { data: suggestions, isLoading: suggestionsLoading } = useSuggestions(
    familyId,
    "pending"
  );
  const { data: polls } = usePolls(familyId);
  const { data: family } = useQuery({
    queryKey: ["family", familyId],
    queryFn: () => getFamily(familyId!),
    enabled: !!familyId,
  });

  const suggestPollMutation = useSuggestPoll();
  const suggestOptionMutation = useSuggestOption();
  const resolveMutation = useResolveSuggestion();
  const deleteMutation = useDeleteSuggestion();

  const currentMember = family?.members?.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === "admin";

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSuggestPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId || !pollTitle.trim()) return;
    try {
      await suggestPollMutation.mutateAsync({
        family_id: familyId,
        title: pollTitle.trim(),
        category: pollCategory,
        description: pollDescription.trim() || undefined,
      });
      setPollTitle("");
      setPollDescription("");
      setPollCategory("activity");
      showFeedback("success", "Poll suggestion submitted!");
    } catch {
      showFeedback("error", "Failed to submit suggestion. Please try again.");
    }
  };

  const handleSuggestOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId || !selectedPollId || !optionLabel.trim()) return;
    try {
      await suggestOptionMutation.mutateAsync({
        family_id: familyId,
        poll_id: Number(selectedPollId),
        option_label: optionLabel.trim(),
      });
      setOptionLabel("");
      setSelectedPollId("");
      showFeedback("success", "Option suggestion submitted!");
    } catch {
      showFeedback("error", "Failed to submit suggestion. Please try again.");
    }
  };

  const handleResolve = async (id: number, action: "approve" | "reject") => {
    try {
      await resolveMutation.mutateAsync({ id, action });
      showFeedback(
        "success",
        action === "approve" ? "Suggestion approved!" : "Suggestion rejected."
      );
    } catch {
      showFeedback("error", "Failed to resolve suggestion.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      showFeedback("success", "Suggestion deleted.");
    } catch {
      showFeedback("error", "Failed to delete suggestion.");
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "poll", label: "Suggest a Poll" },
    { key: "option", label: "Suggest an Option" },
  ];

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link
            to="/"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <span className="text-sm text-gray-400">Back to polls</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Suggestions</h1>

        {feedback && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
              feedback.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="mb-8">
          {activeTab === "poll" ? (
            <form onSubmit={handleSuggestPoll} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poll Title
                </label>
                <input
                  type="text"
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  placeholder="What should we vote on?"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={pollCategory}
                  onChange={(e) => setPollCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="activity">Activity</option>
                  <option value="meal">Meal</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={pollDescription}
                  onChange={(e) => setPollDescription(e.target.value)}
                  placeholder="Add some context..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
              <Button
                type="submit"
                loading={suggestPollMutation.isPending}
                disabled={!pollTitle.trim()}
              >
                Submit Suggestion
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSuggestOption} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Poll
                </label>
                <select
                  value={selectedPollId}
                  onChange={(e) =>
                    setSelectedPollId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                  required
                >
                  <option value="">Choose a poll...</option>
                  {polls?.map((poll) => (
                    <option key={poll.id} value={poll.id}>
                      {poll.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Option Label
                </label>
                <input
                  type="text"
                  value={optionLabel}
                  onChange={(e) => setOptionLabel(e.target.value)}
                  placeholder="New option to add..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <Button
                type="submit"
                loading={suggestOptionMutation.isPending}
                disabled={!selectedPollId || !optionLabel.trim()}
              >
                Submit Suggestion
              </Button>
            </form>
          )}
        </Card>

        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Pending Suggestions
        </h2>

        {suggestionsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm p-6 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
                <div className="h-5 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                isAdmin={isAdmin}
                isOwn={suggestion.suggested_by === user?.id}
                onApprove={() => handleResolve(suggestion.id, "approve")}
                onReject={() => handleResolve(suggestion.id, "reject")}
                onDelete={() => handleDelete(suggestion.id)}
                resolving={resolveMutation.isPending}
                deleting={deleteMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <p className="text-sm text-gray-500">
              No pending suggestions. Be the first to suggest something!
            </p>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
