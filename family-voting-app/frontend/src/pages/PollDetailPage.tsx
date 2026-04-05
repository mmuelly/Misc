import { useParams, useNavigate, Link } from "react-router-dom";
import PageShell from "../components/layout/PageShell";
import VoteResults from "../components/polls/VoteResults";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { usePoll, useDeletePoll, usePollHistory } from "../hooks/usePolls";
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

export default function PollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pollId = id ? Number(id) : undefined;
  const { data: poll, isLoading } = usePoll(pollId);
  const { data: history } = usePollHistory(pollId);
  const deletePoll = useDeletePoll();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
