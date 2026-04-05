import Avatar from "../ui/Avatar";
import { useAuth } from "../../hooks/useAuth";
import { useCastVote } from "../../hooks/useVotes";
import type { VotesResponse } from "../../types";

interface VoteResultsProps {
  pollId: number;
  votes: VotesResponse;
  interactive?: boolean;
}

export default function VoteResults({
  pollId,
  votes,
  interactive = true,
}: VoteResultsProps) {
  const { user } = useAuth();
  const castVote = useCastVote();

  const totalVotes = votes.options.reduce((sum, o) => sum + o.vote_count, 0);

  const userVote = votes.options.find((o) =>
    o.voters.some((v) => v.user_id === user?.id)
  );

  const handleVote = async (optionId: number) => {
    if (!interactive) return;

    // If user already voted for this option, do nothing (toggle would need vote ID)
    if (userVote && userVote.option_id === optionId) {
      return;
    }

    await castVote.mutateAsync({ pollOptionId: optionId, pollId });
  };

  const sortedOptions = [...votes.options].sort(
    (a, b) => b.vote_count - a.vote_count
  );

  const isPending = castVote.isPending;

  return (
    <div className="space-y-3">
      {sortedOptions.map((option) => {
        const pct =
          totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0;
        const isUserVote = option.option_id === userVote?.option_id;

        return (
          <button
            key={option.option_id}
            onClick={() => handleVote(option.option_id)}
            disabled={!interactive || isPending}
            className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${
              isUserVote
                ? "border-indigo-500 bg-indigo-50"
                : "border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
            } ${interactive ? "cursor-pointer" : "cursor-default"} disabled:opacity-70`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isUserVote && (
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-500 text-white text-xs">
                    &#10003;
                  </span>
                )}
                <span
                  className={`font-medium ${isUserVote ? "text-indigo-700" : "text-gray-800"}`}
                >
                  {option.label}
                </span>
              </div>
              <span className="text-sm text-gray-500 tabular-nums">
                {option.vote_count} vote{option.vote_count !== 1 ? "s" : ""}{" "}
                ({Math.round(pct)}%)
              </span>
            </div>

            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isUserVote ? "bg-indigo-500" : "bg-gray-300"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {option.voters.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {option.voters.map((voter) => (
                  <div
                    key={voter.user_id}
                    className="flex items-center gap-1.5 bg-white rounded-full pl-0.5 pr-2 py-0.5 border border-gray-100"
                    title={voter.display_name}
                  >
                    <Avatar
                      src={voter.avatar_url}
                      name={voter.display_name}
                      size="sm"
                    />
                    <span className="text-xs text-gray-600">
                      {voter.display_name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </button>
        );
      })}

      {totalVotes === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">
          No votes yet this week. Be the first to vote!
        </p>
      )}
    </div>
  );
}
