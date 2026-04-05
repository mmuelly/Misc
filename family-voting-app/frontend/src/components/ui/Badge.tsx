const categoryColors: Record<string, string> = {
  activity: "bg-blue-100 text-blue-700",
  meal: "bg-green-100 text-green-700",
  custom: "bg-purple-100 text-purple-700",
};

interface BadgeProps {
  category: string;
  className?: string;
}

export default function Badge({ category, className = "" }: BadgeProps) {
  const colorClass = categoryColors[category] ?? "bg-gray-100 text-gray-700";
  const label = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
