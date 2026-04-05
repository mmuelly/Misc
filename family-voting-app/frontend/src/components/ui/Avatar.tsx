interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const bgColors = [
  "bg-indigo-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-teal-500",
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return bgColors[Math.abs(hash) % bgColors.length];
}

export default function Avatar({
  src,
  name,
  size = "md",
  className = "",
}: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${getColorForName(name)} rounded-full flex items-center justify-center text-white font-medium ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
