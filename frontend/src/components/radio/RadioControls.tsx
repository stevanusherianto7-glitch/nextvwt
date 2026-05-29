import { cn } from "../../lib/utils";

interface RadioControlsProps {
  audioLevel: number;
  currentChannel: string;
  setChannelListOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  handleChannelSelect: (channel: string) => void;
}

export function RadioControls({
  audioLevel,
  currentChannel,
  setChannelListOpen,
  setSettingsOpen,
  handleChannelSelect,
}: RadioControlsProps) {
  const incrementChannel = () => {
    handleChannelSelect(String((parseInt(currentChannel) + 1) % 1000));
  };

  const decrementChannel = () => {
    handleChannelSelect(String((parseInt(currentChannel) - 1 + 1000) % 1000));
  };

  return (
    <div className="w-full flex flex-col shrink-0">
      {/* Audio Level Bar */}
      <div className="w-[calc(100%-20px)] mx-auto h-3 bg-black rounded-md mb-5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.05)] border border-[#27272a] shrink-0 overflow-hidden relative select-none">
        <div
          className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-r from-[#00ff66] via-[#ffdd00] to-[#ff003c] transition-all duration-100 ease-out block origin-left flex items-center"
          style={{ clipPath: `inset(0 ${100 - audioLevel}% 0 0)` }}
        >
          {/* Luminous laser hot core */}
          <div className="w-full h-[2px] bg-white/95 shadow-[0_0_2px_rgba(255,255,255,1)]"></div>
        </div>
      </div>

      {/* D-Pad Bezel and Button Panel */}
      <div className="relative w-full h-[180px] mt-2 shrink-0 flex justify-center items-center">
        {/* Shadow backgrounds for physical look */}
        <div className="absolute inset-0 flex justify-center items-center drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)] drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)] select-none pointer-events-none">
          <div className="absolute left-[8px] right-[8px] top-[40px] h-[100px] rounded-[50px] bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] shadow-[inset_0_4px_8px_rgba(255,255,255,1),inset_0_-3px_6px_rgba(0,0,0,0.15),0_2px_4px_rgba(255,255,255,0.5)] border border-black/5"></div>
          <div className="absolute top-[8px] bottom-[8px] left-[calc(50%-50px)] w-[100px] rounded-[50px] bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] shadow-[inset_0_4px_8px_rgba(255,255,255,1),inset_0_-3px_6px_rgba(0,0,0,0.15),0_2px_4px_rgba(255,255,255,0.5)] border border-black/5"></div>
          <div className="absolute top-[42px] left-[calc(50%-48px)] w-[96px] h-[96px] bg-[#e6ecef]"></div>
        </div>

        {/* Matte black grooves */}
        <div className="absolute inset-0 flex justify-center items-center z-[2] select-none pointer-events-none">
          <div className="absolute left-[18px] top-[50px] h-[80px] w-[calc(50%-68px)] bg-gradient-to-b from-[#0a0a0a] to-[#262626] rounded-l-[40px] shadow-[inset_0_8px_16px_rgba(0,0,0,1),inset_0_2px_4px_rgba(0,0,0,0.8)] border-t-[1.5px] border-[#000] border-b border-[#444] border-l-[1.5px]"></div>
          <div className="absolute right-[18px] top-[50px] h-[80px] w-[calc(50%-68px)] bg-gradient-to-b from-[#0a0a0a] to-[#262626] rounded-r-[40px] shadow-[inset_0_8px_16px_rgba(0,0,0,1),inset_0_2px_4px_rgba(0,0,0,0.8)] border-t-[1.5px] border-[#000] border-b border-[#444] border-r-[1.5px]"></div>
          <div className="absolute top-[18px] bottom-[18px] left-[calc(50%-40px)] w-[80px] bg-gradient-to-b from-[#050505] to-[#222222] rounded-[40px] shadow-[inset_0_10px_20px_rgba(0,0,0,1),inset_0_2px_6px_rgba(0,0,0,0.9)] border-t-[1.5px] border-[#000] border-b border-[#333]"></div>
        </div>

        {/* Real Interactive Control Buttons */}
        <div className="absolute inset-0 flex justify-center items-center z-[10]">
          {/* Scan Button */}
          <button
            id="scan-btn"
            onClick={() => setChannelListOpen(true)}
            className="absolute left-[26px] top-[58px] h-[64px] w-[calc(50%-82px)] bg-gradient-to-b from-[#4a4a4a] via-[#2a2a2a] to-[#121212] text-gray-200 font-bold text-[19px] tracking-wide rounded-l-[32px] rounded-r-[8px] shadow-[0_8px_12px_rgba(0,0,0,0.8),0_2px_4px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.6)] border-t-[2px] border-[#666] border-b-[3px] border-[#000] border-l-[2px] border-l-[#555] active:translate-y-[2px] active:border-b-[1px] active:shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_4px_8px_rgba(0,0,0,0.9)] transition-all cursor-pointer select-none"
          >
            <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              Scan
            </span>
          </button>

          {/* Set (Settings) Button */}
          <button
            id="settings-btn"
            onClick={() => setSettingsOpen(true)}
            className="absolute right-[26px] top-[58px] h-[64px] w-[calc(50%-82px)] bg-gradient-to-b from-[#4a4a4a] via-[#2a2a2a] to-[#121212] text-gray-200 font-bold text-[19px] tracking-wide rounded-r-[32px] rounded-l-[8px] shadow-[0_8px_12px_rgba(0,0,0,0.8),0_2px_4px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.6)] border-t-[2px] border-[#666] border-b-[3px] border-[#000] border-r-[2px] border-r-[#555] active:translate-y-[2px] active:border-b-[1px] active:shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_4px_8px_rgba(0,0,0,0.9)] transition-all cursor-pointer select-none"
          >
            <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Set</span>
          </button>

          {/* D-Pad Up Button */}
          <button
            id="dpad-up"
            onClick={incrementChannel}
            className="absolute top-[26px] left-[calc(50%-32px)] w-[64px] h-[62px] bg-gradient-to-b from-[#555555] via-[#333333] to-[#151515] rounded-t-[32px] rounded-b-[6px] shadow-[0_8px_12px_rgba(0,0,0,0.8),0_3px_5px_rgba(0,0,0,0.6),inset_0_2px_2px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.6)] border-t-[2px] border-[#777] border-b-[3px] border-[#000] border-x-[1.5px] border-x-[#444] active:translate-y-[2px] active:border-b-[1px] active:shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_4px_8px_rgba(0,0,0,0.9)] flex items-center justify-center transition-all z-[11] cursor-pointer select-none"
          >
            <svg
              width="24"
              height="14"
              viewBox="0 0 24 14"
              className="drop-shadow-[0_2px_2px_rgba(0,0,0,1)] -mt-1 pointer-events-none"
            >
              <path d="M12 1L23 13H1L12 1Z" fill="#e5e7eb" />
            </svg>
          </button>

          {/* D-Pad Down Button */}
          <button
            id="dpad-down"
            onClick={decrementChannel}
            className="absolute bottom-[26px] left-[calc(50%-32px)] w-[64px] h-[62px] bg-gradient-to-b from-[#444444] via-[#222222] to-[#0a0a0a] rounded-b-[32px] rounded-t-[6px] shadow-[0_8px_12px_rgba(0,0,0,0.8),0_3px_5px_rgba(0,0,0,0.6),inset_0_2px_1px_rgba(255,255,255,0.15),inset_0_-3px_5px_rgba(0,0,0,0.7)] border-t border-[#333] border-b-[4px] border-[#000] border-x-[1.5px] border-x-[#222] active:translate-y-[2px] active:border-b-[2px] active:shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_4px_8px_rgba(0,0,0,0.9)] flex items-center justify-center transition-all z-[11] cursor-pointer select-none"
          >
            <svg
              width="24"
              height="14"
              viewBox="0 0 24 14"
              className="drop-shadow-[0_2px_2px_rgba(0,0,0,1)] mt-1 pointer-events-none"
            >
              <path d="M12 13L23 1H1L12 13Z" fill="#9ca3af" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
