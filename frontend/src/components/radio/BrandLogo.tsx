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
        <g 
          fill="none" 
          stroke="#16a34a" 
          strokeWidth="6" 
          strokeLinecap="round"
        >
          {/* Sinyal Dalam */}
          <path 
            d="M 34 66 A 22.6 22.6 0 1 1 66 66" 
            className={cn("transition-all duration-300", isModulating ? "opacity-100 drop-shadow-[0_0_4px_#16a34a]" : "opacity-90")}
          />
          {/* Sinyal Tengah */}
          <path 
            d="M 27 73 A 32.5 32.5 0 1 1 73 73" 
            className={cn("transition-all duration-500", isModulating ? "opacity-100 drop-shadow-[0_0_5px_#16a34a]" : "opacity-50")}
          />
          {/* Sinyal Luar */}
          <path 
            d="M 20 80 A 42.4 42.4 0 1 1 80 80" 
            className={cn("transition-all duration-700", isModulating ? "opacity-100 drop-shadow-[0_0_6px_#16a34a]" : "opacity-15")}
          />
        </g>
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
