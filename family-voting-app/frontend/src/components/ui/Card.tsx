import type { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
