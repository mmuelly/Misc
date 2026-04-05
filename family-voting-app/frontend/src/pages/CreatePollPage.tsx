import { useParams } from "react-router-dom";
import PageShell from "../components/layout/PageShell";
import PollForm from "../components/polls/PollForm";
import { usePoll } from "../hooks/usePolls";

export default function CreatePollPage() {
  const { id } = useParams<{ id: string }>();
  const pollId = id ? Number(id) : undefined;
  const { data: existingPoll, isLoading } = usePoll(pollId);

  if (pollId && isLoading) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto animate-pulse">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-6" />
            <div className="space-y-4">
              <div className="h-10 bg-gray-100 rounded" />
              <div className="h-10 bg-gray-100 rounded" />
              <div className="h-24 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PollForm existingPoll={existingPoll} />
    </PageShell>
  );
}
