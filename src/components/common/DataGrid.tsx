import React from "react";

export type DataGridColumn<T> = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** Custom cell renderer. Receives cell value and full row. */
  render?: (value: unknown, row: T) => React.ReactNode;
};

type DataGridProps<T> = {
  columns: DataGridColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  /** When set, adds a checkbox column and calls onSelectionChange when selection changes */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
};

const thClass =
  "px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase whitespace-nowrap dark:text-gray-300";
const tdClass = "px-4 py-3 text-sm text-gray-800 align-middle dark:text-gray-200";
const trBorder = "border-b border-gray-200 last:border-b-0 dark:border-gray-700";

function DataGrid<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data.",
  loading = false,
  className = "",
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
}: DataGridProps<T>) {
  const set = new Set(selectedIds);
  const allSelected = data.length > 0 && data.every((row) => set.has(keyExtractor(row)));
  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) onSelectionChange([]);
    else onSelectionChange(data.map((row) => keyExtractor(row)));
  };
  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    if (set.has(id)) onSelectionChange(selectedIds.filter((x) => x !== id));
    else onSelectionChange([...selectedIds, id]);
  };
  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("button, a, input, textarea, select, label, [role='button']")
    ) {
      return;
    }
    onRowClick(row);
  };

  return (
    <div
      className={
        "overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-800 dark:bg-gray-900/40 " +
        className
      }
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10 dark:bg-gray-900/80">
            <tr>
              {selectable && (
                <th className={thClass + " w-10"}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label={allSelected ? "Deselect all rows" : "Select all rows"}
                    onChange={toggleAll}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={
                    thClass +
                    (col.align === "right" ? " text-right" : col.align === "center" ? " text-center" : "")
                  }
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Loading…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const id = keyExtractor(row);
                const rowKey = id != null && String(id).trim() !== "" ? String(id) : `row-${index}`;
                const zebra =
                  index % 2 === 0
                    ? "bg-white dark:bg-gray-900/40"
                    : "bg-gray-50/60 dark:bg-gray-900/20";
                return (
                  <tr
                    key={rowKey}
                    onClick={(event) => handleRowClick(event, row)}
                    onKeyDown={(event) => {
                      if (!onRowClick || (event.key !== "Enter" && event.key !== " ")) return;
                      if (event.target !== event.currentTarget) return;
                      event.preventDefault();
                      onRowClick(row);
                    }}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={
                      zebra +
                      " hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors " +
                      (onRowClick ? "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 " : "") +
                      trBorder
                    }
                  >
                    {selectable && (
                      <td className={tdClass}>
                        <input
                          type="checkbox"
                          checked={set.has(id)}
                          aria-label={`Select row ${index + 1}`}
                          onChange={() => toggleOne(id)}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const value = (row as Record<string, unknown>)[col.key];
                      const content = col.render ? col.render(value, row) : (value as React.ReactNode);
                      return (
                        <td
                          key={col.key}
                          className={
                            tdClass +
                            (col.align === "right" ? " text-right" : col.align === "center" ? " text-center" : "")
                          }
                        >
                          {content ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataGrid;
