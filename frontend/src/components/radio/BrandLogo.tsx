import { cn } from "../../lib/utils";

export function BrandLogo({ 
  isModulating, 
  className 
}: { 
  isModulating: boolean; 
  className?: string; 
}) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-sm">
        <path
          d="M 35 76 A 30 30 0 1 1 65 76"
          fill="none"
          stroke="#16a34a"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="50"
          r="16"
          fill="#ef4444"
          className={cn(
            "transition-all duration-300 origin-center",
            isModulating 
              ? "drop-shadow-[0_0_8px_rgba(239,68,68,1)] scale-[1.03]"
              : "drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] scale-100 opacity-95"
          )}
        />
      </svg>
    </div>
  );
}
