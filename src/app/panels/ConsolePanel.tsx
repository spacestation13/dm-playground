import { useEffect, useState } from "react";
import { createPortal } from 'react-dom'
import { Terminal, type TerminalApi } from "../components/Terminal";
import { emulatorService } from "../../services/EmulatorService";

export function ConsolePanel() {
  const [terminal, setTerminal] = useState<TerminalApi | null>(null);

  useEffect(() => {
    if (!terminal) {
      return;
    }

    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent<{ port: string; data: string }>)
        .detail;
      if (detail.port === "console") {
        terminal.write(detail.data);
      }
    };

    const handleReset = () => terminal.clear();

    emulatorService.addEventListener("receivedOutput", handleOutput);
    emulatorService.addEventListener("resetOutputConsole", handleReset);

    return () => {
      emulatorService.removeEventListener("receivedOutput", handleOutput);
      emulatorService.removeEventListener("resetOutputConsole", handleReset);
    };
  }, [terminal]);

  // Responsive modal/bottom panel
  // Use portal for modal on desktop, inline for mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Draggable modal state
  const [modalPos, setModalPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [dragging, setDragging] = useState(false);
  const dragStart = (e: React.MouseEvent) => {
    setDragging(true);
    e.preventDefault();
  };
  const dragEnd = () => setDragging(false);
  useEffect(() => {
    const dragMove = (e: MouseEvent) => {
      if (!dragging) return;
      setModalPos((pos) => ({
        x: pos.x + e.movementX,
        y: pos.y + e.movementY,
      }));
    };
    if (dragging) {
      window.addEventListener("mousemove", dragMove);
      window.addEventListener("mouseup", dragEnd);
    } else {
      window.removeEventListener("mousemove", dragMove);
      window.removeEventListener("mouseup", dragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", dragMove);
      window.removeEventListener("mouseup", dragEnd);
    };
  }, [dragging]);

  const panelContent = (
    <div
      className={
        isMobile
          ? "w-full bg-slate-900 border-t border-slate-800 p-2"
          : "fixed z-50 w-[480px] max-w-full rounded-lg border border-slate-800 bg-slate-900 p-2 shadow-2xl"
      }
      style={
        isMobile
          ? { minHeight: 200, maxHeight: 400 }
          : {
              minHeight: 200,
              maxHeight: 400,
              top: `${modalPos.y + 16}px`,
              left: `${modalPos.x + 8}px`,
            }
      }
    >
      {!isMobile && (
        <div
          className="cursor-move text-xs font-semibold text-slate-200 mb-2 select-none"
          style={{ userSelect: "none" }}
          onMouseDown={dragStart}
        >
          Drag Console
        </div>
      )}
      <div className="h-full overflow-auto">
        <Terminal
          label="Console ready"
          onReady={setTerminal}
          onData={(value) => emulatorService.sendPort("console", value)}
          onResize={(rows, cols) =>
            emulatorService.resizePort("console", rows, cols)
          }
        />
      </div>
    </div>
  );

  // Portal for desktop modal
  if (!isMobile && typeof document !== "undefined") {
    const el = document.getElementById("console-modal-root")
    if (el) {
      return createPortal(panelContent, el)
    }
  }
  // Inline for mobile or fallback
  return panelContent;
}
