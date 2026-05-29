import { cn } from "../../lib/utils";

interface User3DProps {
  color1: string;
  color2: string;
  size?: number;
  className?: string;
}

export function User3D({
  color1,
  color2,
  size = 25,
  className = "",
}: User3DProps) {
  const uniqId = Math.random().toString(36).substring(7);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      style={{
        filter: `drop-shadow(0px 3px 5px ${color2}66) drop-shadow(0px 1px 2px ${color2}4D)`,
      }}
    >
      <defs>
        {/* Soft, clean main gradient */}
        <linearGradient
          id={`base-${uniqId}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>

        {/* Crisp inner rim light for a modern glass effect */}
        <linearGradient
          id={`rim-${uniqId}`}
          x1="0%"
          y1="0%"
          x2="20%"
          y2="100%"
        >
          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
          <stop offset="50%" stopColor="white" stopOpacity="0.05" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g>
        {/* Head Base */}
        <circle
          cx="12"
          cy="7.5"
          r="5.5"
          fill={`url(#base-${uniqId})`}
        />
        {/* Head Rim Light */}
        <circle
          cx="12"
          cy="7.5"
          r="5"
          fill="none"
          stroke={`url(#rim-${uniqId})`}
          strokeWidth="1"
        />

        {/* Body Base */}
        <path
          d="M3.5 21.5C3.5 16.5 7.5 12.5 12 12.5C16.5 12.5 20.5 16.5 20.5 21.5"
          fill={`url(#base-${uniqId})`}
        />
        {/* Body Rim Light */}
        <path
          d="M4 21.5C4 16.8 7.8 13 12 13C16.2 13 20 16.8 20 21.5"
          fill="none"
          stroke={`url(#rim-${uniqId})`}
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}
