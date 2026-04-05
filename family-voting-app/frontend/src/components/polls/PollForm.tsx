import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { useAuth } from "../../hooks/useAuth";
import { useCreatePoll, useUpdatePoll } from "../../hooks/usePolls";
import type { PollWithVotes, CreatePollPayload, UpdatePollPayload } from "../../types";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "UTC",
];

const DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

interface PollFormProps {
  existingPoll?: PollWithVotes;
}

export default function PollForm({ existingPoll }: PollFormProps) {
  const navigate = useNavigate();
  const { familyId } = useAuth();
  const createPoll = useCreatePoll();
  const updatePoll = useUpdatePoll();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("activity");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [resetDay, setResetDay] = useState(0);
  const [resetTime, setResetTime] = useState("09:00");
  const [resetTimezone, setResetTimezone] = useState("America/New_York");

  useEffect(() => {
    if (existingPoll) {
      setTitle(existingPoll.title);
      setCategory(existingPoll.category);
      setDescription(existingPoll.description ?? "");
      setOptions(existingPoll.options.map((o) => o.label));
      setResetDay(existingPoll.reset_day);
      setResetTime(existingPoll.reset_time);
      setResetTimezone(existingPoll.reset_timezone);
    }
  }, [existingPoll]);

  const addOption = () => setOptions([...options, ""]);

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const moveOption = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= options.length) return;
    const updated = [...options];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setOptions(updated);
  };

  const isValid =
    title.trim() &&
    options.filter((o) => o.trim()).length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !familyId) return;

    const filteredOptions = options
      .filter((o) => o.trim())
      .map((label) => ({ label: label.trim() }));

    if (existingPoll) {
      const payload: UpdatePollPayload = {
        title: title.trim(),
        category,
        description: description.trim() || undefined,
        options: filteredOptions,
        reset_day: resetDay,
        reset_time: resetTime,
        reset_timezone: resetTimezone,
      };
      await updatePoll.mutateAsync({ id: existingPoll.id, payload });
      navigate(`/polls/${existingPoll.id}`);
    } else {
      const payload: CreatePollPayload = {
        family_id: familyId,
        title: title.trim(),
        category,
        description: description.trim() || undefined,
        options: filteredOptions,
        reset_day: resetDay,
        reset_time: resetTime,
        reset_timezone: resetTimezone,
      };
      const created = await createPoll.mutateAsync(payload);
      navigate(`/polls/${created.id}`);
    }
  };

  const isPending = createPoll.isPending || updatePoll.isPending;

  return (
    <Card className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {existingPoll ? "Edit Poll" : "Create New Poll"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What should we decide?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more context..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Options
          </label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveOption(index, -1)}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none p-0.5"
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOption(index, 1)}
                    disabled={index === options.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none p-0.5"
                  >
                    &#9660;
                  </button>
                </div>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  disabled={options.length <= 2}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors p-1"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOption}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            + Add option
          </button>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Reset Schedule
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Day</label>
              <select
                value={resetDay}
                onChange={(e) => setResetDay(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
              >
                {DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Time</label>
              <input
                type="time"
                value={resetTime}
                onChange={(e) => setResetTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Timezone
              </label>
              <select
                value={resetTimezone}
                onChange={(e) => setResetTimezone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid} loading={isPending}>
            {existingPoll ? "Save Changes" : "Create Poll"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
