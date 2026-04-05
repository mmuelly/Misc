import { useNavigate } from "react-router-dom";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { useAuth } from "../../hooks/useAuth";
import type { PollWithVotes } from "../../types";

interface PollCardProps {
  poll: PollWithVotes;
}

export default function PollCard({ poll }: PollCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const totalVotes =
    poll.votes?.options.reduce((sum, o) => sum + o.vote_count, 0) ?? 0;

  const userVotedOptionId = poll.votes?.options.find((o) =>
    o.voters.some((v) => v.user_id === user?.id)
  )?.option_id;

  const sortedOptions = [...(poll.votes?.options ?? poll.options.map((o) => ({
    option_id: o.id,
    label: o.label,
    vote_count: 0,
    voters: [],
  })))].sort((a, b) => b.vote_count - a.vote_count);

  const topOptions = sortedOptions.slice(0, 3);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 group"
      onClick={() => navigate(`/polls/${poll.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
          {poll.title}
        </h3>
        <Badge category={poll.category} className="ml-2 shrink-0" />
      </div>

      {poll.description && (
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {poll.description}
        </p>
      )}

      <div className="space-y-2">
        {topOptions.map((option) => {
          const pct = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0;
          const isUserVote = option.option_id === userVotedOptionId;

          return (
            <div key={option.option_id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span
                  className={`truncate ${isUserVote ? "font-semibold text-indigo-600" : "text-gray-700"}`}
                >
                  {isUserVote && (
                    <span className="inline-block mr-1">&#10003;</span>
                  )}
                  {option.label}
                </span>
                <span className="text-gray-400 ml-2 tabular-nums">
                  {option.vote_count}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isUserVote ? "bg-indigo-500" : "bg-gray-300"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        <span>
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""} this week
        </span>
        {sortedOptions.length > 3 && (
          <span>+{sortedOptions.length - 3} more options</span>
        )}
      </div>
    </Card>
  );
}
