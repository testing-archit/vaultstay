import { RentalState } from "../lib/types";
import { Check } from "lucide-react";

const STATES = [
  { label: "Created", icon: "📝" },
  { label: "Funded", icon: "💰" },
  { label: "Active", icon: "🔑" },
  { label: "Completed", icon: "✅" },
];

interface StateMachineProgressProps {
  currentState: RentalState;
}

export function StateMachineProgress({ currentState }: StateMachineProgressProps) {
  const isTerminal = currentState === RentalState.Cancelled || currentState === RentalState.Disputed;
  const displayStates = isTerminal
    ? [
        ...STATES.slice(0, Math.min(Number(currentState), STATES.length)),
        {
          label: currentState === RentalState.Cancelled ? "Cancelled" : "Disputed",
          icon: currentState === RentalState.Cancelled ? "❌" : "⚖️",
        },
      ]
    : STATES;

  const activeIndex = isTerminal ? displayStates.length - 1 : Number(currentState);

  return (
    <div className="flex items-center w-full">
      {displayStates.map((s, i) => {
        const isPast = i < activeIndex;
        const isCurrent = i === activeIndex;

        return (
          <div key={s.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                  isPast
                    ? "bg-accent2/20 border-2 border-accent2 text-accent2"
                    : isCurrent
                    ? isTerminal && i === displayStates.length - 1
                      ? currentState === RentalState.Cancelled
                        ? "bg-danger/20 border-2 border-danger text-danger"
                        : "bg-warning/20 border-2 border-warning text-warning"
                      : "bg-accent/20 border-2 border-accent text-accent animate-pulse"
                    : "bg-border/50 border-2 border-border text-muted opacity-40"
                }`}
              >
                {isPast ? <Check size={12} /> : s.icon}
              </div>
              <span
                className={`text-[9px] font-bold mt-1 tracking-tight ${
                  isPast
                    ? "text-accent2"
                    : isCurrent
                    ? isTerminal && i === displayStates.length - 1
                      ? currentState === RentalState.Cancelled
                        ? "text-danger"
                        : "text-warning"
                      : "text-accent"
                    : "text-muted opacity-40"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < displayStates.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${
                  i < activeIndex ? "bg-accent2" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
