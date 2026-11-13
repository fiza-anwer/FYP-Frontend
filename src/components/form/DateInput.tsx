import { useRef, type InputHTMLAttributes } from "react";
import { CalenderIcon } from "../../icons";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  calendarLabel?: string;
};

export default function DateInput({
  calendarLabel = "Open calendar",
  className = "",
  ...props
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openCalendar = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        input.focus();
        input.click();
      }
      return;
    }
    input.focus();
    input.click();
  };

  return (
    <div className="relative min-w-0">
      <input
        {...props}
        ref={inputRef}
        type="date"
        className={`w-full [&::-webkit-calendar-picker-indicator]:opacity-0 ${className} !pr-10`}
      />
      <button
        type="button"
        aria-label={calendarLabel}
        onClick={openCalendar}
        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-gray-500 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-gray-400 dark:hover:text-brand-400"
      >
        <CalenderIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
