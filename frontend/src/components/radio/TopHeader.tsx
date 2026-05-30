import { Radio } from "lucide-react";
import { cn } from "../../lib/utils";
import { BrandLogo } from "./BrandLogo";
import { type User } from "../../store/useAppStore";

interface TopHeaderProps {
  isLocalSpeaking: boolean;
  isTransmitting: boolean;
  someOneElseSpeaking: boolean;
  currentUser: User | null;
  currentChannelName: string;
  isOn: boolean;
  onPowerToggle: () => void;
}

export function TopHeader({
  isLocalSpeaking,
  isTransmitting,
  someOneElseSpeaking,
  currentUser,
  currentChannelName,
  isOn,
  onPowerToggle,
}: TopHeaderProps) {
  return (
    <div className="bg-gradient-to-b from-[#ffffff] from-30% via-[#f8fafc] via-70% to-[#cbd5e1] px-4 py-3 flex justify-between items-center shadow-[0_5px_10px_-3px_rgba(0,0,0,0.2),inset_0_-3px_6px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,1)] border-b-[2px] border-[#94a3b8] shrink-0 z-10 relative select-none">
      <div className="flex items-center gap-2 flex-1 overflow-hidden mr-2">
        {/* App Brand Logo */}
        <div className="w-10 h-10 flex items-center justify-center shrink-0 mr-1">
          <BrandLogo isModulating={isLocalSpeaking || isTransmitting || someOneElseSpeaking} className="w-8 h-8" />
        </div>

        {/* Brand Information and Active Session Info */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0 justify-center h-full">
          <div className="flex items-center text-gray-500 text-[12px] leading-[1.1] mb-[1px]">
            <span className="font-semibold text-gray-600 tracking-tight">
              NextVWT
            </span>
            <span className="ml-[3px] italic opacity-80">
              (
              {currentUser?.id
                ? currentUser.id.substring(0, 5).toUpperCase()
                : "2DYUA"}
              )
            </span>
          </div>
          <div
            className="w-full text-[14.5px] font-normal tracking-normal text-[#111] leading-tight flex items-center h-5 relative overflow-hidden"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
            }}
          >
            <div className="animate-scroll absolute">{currentChannelName}</div>
          </div>
        </div>
      </div>

      {/* Hardware-look Rotary Power Switch Toggle */}
      <div
        className="power-container shrink-0 cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          onPowerToggle();
        }}
      >
        <div className="power-switch cursor-pointer pointer-events-none">
          <input
            type="checkbox"
            className="togglesw cursor-pointer"
            checked={isOn}
            readOnly
          />
          <div className="power-indicator left"></div>
          <div className="power-indicator right"></div>
          <div className="power-button"></div>
        </div>
      </div>
    </div>
  );
}
