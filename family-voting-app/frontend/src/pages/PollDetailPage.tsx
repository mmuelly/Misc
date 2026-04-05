import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageShell from "../components/layout/PageShell";
import VoteResults from "../components/polls/VoteResults";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import Modal from "../components/ui/Modal";
import { usePoll, useDeletePoll, usePollHistory } from "../hooks/usePolls";
import {
  useSuggestions,
  useSuggestOption,
  useResolveSuggestion,
  useDeleteSuggestion,
} from "../hooks/useSuggestions";
import { getFamily } from "../api/families";
import { useAuth } from "../hooks/useAuth";
import { getDayName, formatDate } from "../utils/date";
import { useState } from "react";
import type { HistoryEntry } from "../types";

function HistoryAccordion({ history }: { history: HistoryEntry[] }) {
  const [openWeek, setOpenWeek] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        No past results yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((entry) => {
        const isOpen = openWeek === entry.week_of;
        const totalVotes = entry.options.reduce(
          (sum, o) => sum + o.vote_count,
          0
        );
        const winner = [...entry.options].sort(
          (a, b) => b.vote_count - a.vote_count
        )[0];

        return (
          <div
            key={entry.week_of}
            className="border border-gray-100 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setOpenWeek(isOpen ? null : entry.week_of)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Week of {formatDate(entry.week_of)}
                </span>
                {winner && totalVotes > 0 && (
                  <span className="ml-2 text-xs text-gray-500">
                    Winner: {winner.label}
                  </span>
                )}
              </div>
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
            {isOpen && (
              <div className="px-4 pb-4 border-t border-gray-50">
                <div className="pt-3 space-y-2">
                  {entry.options
                    .sort((a, b) => b.vote_count - a.vote_count)
                    .map((option) => {
                      const pct =
                        totalVotes > 0
                          ? (option.vote_count / totalVotes) * 100
                          : 0;
                      return (
                        <div key={option.option_id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {option.label}
                            </span>
                            <span className="text-gray-500 tabular-nums">
                              {option.vote_count} ({Math.round(pct)}%)
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

export default function PollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, familyId } = useAuth();
  const pollId = id ? Number(id) : undefined;
  const { data: poll, isLoading } = usePoll(pollId);
  const { data: history } = usePollHistory(pollId);
  const deletePoll = useDeletePoll();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [optionLabel, setOptionLabel] = useState("");
  const [suggestionFeedback, setSuggestionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { data: allSuggestions } = useSuggestions(familyId, "pending");
  const pollOptionSuggestions = allSuggestions?.filter(
    (s) => s.suggestion_type === "option" && s.poll_id === pollId
  );

  const suggestOptionMutation = useSuggestOption();
  const resolveMutation = useResolveSuggestion();
  const deleteSuggestionMutation = useDeleteSuggestion();

  const { data: family } = useQuery({
    queryKey: ["family", familyId],
    queryFn: () => getFamily(familyId!),
    enabled: !!familyId,
  });

  const currentMember = family?.members?.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === "admin";

  const showSuggestionFeedback = (type: "success" | "error", message: string) => {
    setSuggestionFeedback({ type, message });
    setTimeout(() => setSuggestionFeedback(null), 3000);
  };

  const handleSuggestOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId || !pollId || !optionLabel.trim()) return;
    try {
      await suggestOptionMutation.mutateAsync({
        family_id: familyId,
        poll_id: pollId,
        option_label: optionLabel.trim(),
      });
      setOptionLabel("");
      showSuggestionFeedback("success", "Option suggestion submitted!");
    } catch {
      showSuggestionFeedback("error", "Failed to submit suggestion.");
    }
  };

  const handleResolveSuggestion = async (
    suggestionId: number,
    action: "approve" | "reject"
  ) => {
    try {
      await resolveMutation.mutateAsync({ id: suggestionId, action });
      showSuggestionFeedback(
        "success",
        action === "approve" ? "Suggestion approved!" : "Suggestion rejected."
      );
    } catch {
      showSuggestionFeedback("error", "Failed to resolve suggestion.");
    }
  };

  const handleDeleteSuggestion = async (suggestionId: number) => {
    try {
      await deleteSuggestionMutation.mutateAsync(suggestionId);
      showSuggestionFeedback("success", "Suggestion deleted.");
    } catch {
      showSuggestionFeedback("error", "Failed to delete suggestion.");
    }
  };

  const handleDelete = async () => {
    if (!pollId) return;
    await deletePoll.mutateAsync(pollId);
    navigate("/");
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-4 bg-gray-100 rounded w-3/4 mb-8" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!poll) {
    return (
      <PageShell>
        <Card className="text-center max-w-md mx-auto py-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Poll not found
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            This poll may have been deleted or doesn't exist.
          </p>
          <Link to="/" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            Back to Dashboard
          </Link>
        </Card>
      </PageShell>
    );
  }

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

        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">{poll.title}</h1>
          <Badge category={poll.category} />
        </div>

        {poll.description && (
          <p className="text-gray-600 mb-4">{poll.description}</p>
        )}

        <p className="text-xs text-gray-400 mb-6">
          Resets every {getDayName(poll.reset_day)} at {poll.reset_time} (
          {poll.reset_timezone})
        </p>

        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            This Week's Votes
          </h2>
          {poll.votes ? (
            <VoteResults pollId={poll.id} votes={poll.votes} />
          ) : (
            <Card className="text-center py-8">
              <p className="text-gray-500 text-sm">
                No voting data available. Click an option below to cast your vote!
              </p>
            </Card>
          )}
        </div>

        {history && history.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Past Results
            </h2>
            <Card className="p-4">
              <HistoryAccordion history={history} />
            </Card>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Suggest an Option
          </h2>

          {suggestionFeedback && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                suggestionFeedback.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {suggestionFeedback.message}
            </div>
          )}

          <Card className="mb-4">
            <form onSubmit={handleSuggestOption} className="flex gap-3">
              <input
                type="text"
                value={optionLabel}
                onChange={(e) => setOptionLabel(e.target.value)}
                placeholder="Suggest a new option..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <Button
                type="submit"
                size="sm"
                loading={suggestOptionMutation.isPending}
                disabled={!optionLabel.trim()}
              >
                Suggest
              </Button>
            </form>
          </Card>

          {pollOptionSuggestions && pollOptionSuggestions.length > 0 && (
            <div className="space-y-2">
              {pollOptionSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0">
                        Option
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.option_label}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Avatar
                          src={suggestion.suggester_avatar}
                          name={suggestion.suggester_name}
                          size="sm"
                        />
                        <span className="text-xs text-gray-500">
                          {suggestion.suggester_name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {timeAgo(suggestion.created_at)}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleResolveSuggestion(suggestion.id, "approve")
                            }
                            disabled={
                              resolveMutation.isPending ||
                              deleteSuggestionMutation.isPending
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              handleResolveSuggestion(suggestion.id, "reject")
                            }
                            disabled={
                              resolveMutation.isPending ||
                              deleteSuggestionMutation.isPending
                            }
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {suggestion.suggested_by === user?.id && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            handleDeleteSuggestion(suggestion.id)
                          }
                          disabled={
                            resolveMutation.isPending ||
                            deleteSuggestionMutation.isPending
                          }
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/polls/${poll.id}/edit`)}
          >
            Edit Poll
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Poll
          </Button>
        </div>

        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Poll"
        >
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete "{poll.title}"? This action cannot
            be undone and all votes will be lost.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deletePoll.isPending}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </Modal>
      </div>
    </PageShell>
  );
}
