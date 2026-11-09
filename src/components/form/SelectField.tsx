import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Drop-in replacement for a native <select>.
 * Usage is identical: <SelectField value={v} onChange={(e) => set(e.target.value)} className="...">
 *   <option value="a">A</option> ...
 * </SelectField>
 *
 * - `className` is applied to the trigger button (same look as the old select).
 * - The list is rendered in a portal, so tables / modals with overflow never clip it.
 * - Dark mode, keyboard support (arrows, Enter, Space, Esc, Home/End, type-ahead).
 */

type OptionItem = { value: string; label: string; disabled: boolean };

type SelectFieldProps = {
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  title?: string;
  "aria-label"?: string;
  children?: ReactNode;
};

function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) {
    return nodeText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function collectOptions(children: ReactNode, out: OptionItem[]): OptionItem[] {
  Children.toArray(children).forEach((child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{
      children?: ReactNode;
      value?: string | number;
      disabled?: boolean;
    }>;
    if (el.type === Fragment) {
      collectOptions(el.props.children, out);
      return;
    }
    if (el.type === "option") {
      const label = nodeText(el.props.children);
      out.push({
        value: el.props.value !== undefined ? String(el.props.value) : label,
        label,
        disabled: Boolean(el.props.disabled),
      });
    }
  });
  return out;
}

const MAX_LIST_HEIGHT = 256;

export default function SelectField({
  value,
  onChange,
  className = "",
  disabled = false,
  required = false,
  id,
  name,
  title,
  "aria-label": ariaLabel,
  children,
}: SelectFieldProps) {
  const options = useMemo(() => collectOptions(children, []), [children]);
  const current = value === undefined || value === null ? "" : String(value);
  const selectedIndex = options.findIndex((o) => o.value === current);
  // Same behaviour as a native select: if value matches nothing, show the first option.
  const shownIndex = selectedIndex >= 0 ? selectedIndex : options.length > 0 ? 0 : -1;
  const shownLabel = shownIndex >= 0 ? options[shownIndex].label : "";

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState<{
    left: number;
    minWidth: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", timer: 0 as unknown as ReturnType<typeof setTimeout> });
  const listId = useId();

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    setPos({
      left: Math.max(8, rect.left),
      minWidth: rect.width,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4, maxHeight: Math.min(MAX_LIST_HEIGHT, spaceAbove) }
        : { top: rect.bottom + 4, maxHeight: Math.min(MAX_LIST_HEIGHT, Math.max(spaceBelow, 120)) }),
    });
  }, []);

  const openList = useCallback(() => {
    if (disabled || options.length === 0) return;
    setActiveIndex(shownIndex >= 0 ? shownIndex : 0);
    updatePosition();
    setOpen(true);
  }, [disabled, options.length, shownIndex, updatePosition]);

  const closeList = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const choose = useCallback(
    (index: number) => {
      const opt = options[index];
      if (!opt || opt.disabled) return;
      closeList(true);
      if (opt.value !== current) {
        const target = { value: opt.value, id: id ?? "", name: name ?? "" };
        onChange?.({ target, currentTarget: target } as unknown as ChangeEvent<HTMLSelectElement>);
      }
    },
    [options, current, onChange, closeList, id, name],
  );

  // Keep the popup attached to the trigger while open.
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onMove = () => updatePosition();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, updatePosition]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the active option visible.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, pos]);

  useEffect(() => {
    const ref = typeahead.current;
    return () => clearTimeout(ref.timer);
  }, []);

  const move = (from: number, step: 1 | -1) => {
    if (options.length === 0) return -1;
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i = (i + step + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => move(i, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => move(i, -1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(move(-1, 1));
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(move(options.length, -1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        // Stop here so a parent Modal listening for Escape on `document` does not close too.
        e.stopPropagation();
        closeList(true);
        break;
      case "Tab":
        closeList(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const ta = typeahead.current;
          clearTimeout(ta.timer);
          ta.text += e.key.toLowerCase();
          ta.timer = setTimeout(() => {
            ta.text = "";
          }, 600);
          const found = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(ta.text));
          if (found >= 0) setActiveIndex(found);
        }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        title={title}
        disabled={disabled}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed ${className}`}
      >
        {/* The invisible labels make the button as wide as the widest option, like a native select. */}
        <span className="relative grid min-w-0 flex-1">
          <span className="col-start-1 row-start-1 truncate">{shownLabel}</span>
          {options.map((o, i) => (
            <span
              key={`${o.value}-${i}`}
              aria-hidden="true"
              className="invisible col-start-1 row-start-1 h-0 overflow-hidden whitespace-nowrap"
            >
              {o.label}
            </span>
          ))}
        </span>
        <svg
          aria-hidden="true"
          className={`ml-1 mr-0.5 h-4 w-4 flex-none text-gray-500 transition-transform duration-150 dark:text-gray-400 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7.5l5 5 5-5" />
        </svg>
      </button>

      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={current}
          onChange={() => undefined}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      )}

      {open &&
        pos &&
        createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              minWidth: pos.minWidth,
              maxHeight: pos.maxHeight,
              maxWidth: `calc(100vw - ${pos.left + 8}px)`,
            }}
            className="z-[100001] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            {options.map((o, i) => {
              const selected = i === shownIndex;
              const active = i === activeIndex;
              return (
                <div
                  key={`${o.value}-${i}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={o.disabled || undefined}
                  data-index={i}
                  onMouseEnter={() => !o.disabled && setActiveIndex(i)}
                  onClick={() => choose(i)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                    o.disabled
                      ? "cursor-not-allowed text-gray-400 dark:text-gray-600"
                      : selected
                        ? "bg-sky-50 font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                        : "text-gray-700 dark:text-gray-200"
                  } ${active && !o.disabled && !selected ? "bg-gray-100 dark:bg-gray-700" : ""} ${
                    active && selected ? "bg-sky-100 dark:bg-sky-500/25" : ""
                  }`}
                >
                  <span className="whitespace-nowrap">{o.label}</span>
                  {selected && (
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 flex-none"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
