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
  /** Double-click a data row (not the checkbox cell) */
  onRowDoubleClick?: (row: T) => void;
  /** Render each row as a stacked card on small screens instead of a clipped table. */
  mobileCards?: boolean;
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
  onRowDoubleClick,
  mobileCards = false,
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
  const renderCell = (row: T, col: DataGridColumn<T>) => {
    const value = (row as Record<string, unknown>)[col.key];
    return (col.render ? col.render(value, row) : (value as React.ReactNode)) ?? "—";
  };

  return (
    <div
      className={
        "overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-800 dark:bg-gray-900/40 " +
        className
      }
    >
      {mobileCards && (
        <div className="space-y-3 p-3 sm:hidden">
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : data.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
          ) : (
            data.map((row, index) => {
              const id = keyExtractor(row);
              const rowKey = id != null && String(id).trim() !== "" ? String(id) : `mobile-row-${index}`;
              return (
                <article
                  key={rowKey}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                  className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {selectable && (
                      <input
                        type="checkbox"
                        aria-label={`Select row ${index + 1}`}
                        checked={set.has(id)}
                        onChange={() => toggleOne(id)}
                        className="mt-1 shrink-0 rounded border-gray-300 dark:border-gray-600"
                      />
                    )}
                    {columns[0] && (
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {columns[0].label}
                        </p>
                        <div className="min-w-0">{renderCell(row, columns[0])}</div>
                      </div>
                    )}
                  </div>
                  {columns.length > 1 && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                      {columns.slice(1).map((col) => (
                        <div className="min-w-0" key={col.key}>
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {col.label}
                          </dt>
                          <dd className="mt-0.5 min-w-0 break-words text-sm text-gray-800 dark:text-gray-200">
                            {renderCell(row, col)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
      <div className={`${mobileCards ? "hidden sm:block" : ""} overflow-x-auto`}>
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10 dark:bg-gray-900/80">
            <tr>
              {selectable && (
                <th className={thClass + " w-10"}>
                  <input
                    type="checkbox"
                    checked={allSelected}
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
                    onDoubleClick={() => onRowDoubleClick?.(row)}
                    className={
                      zebra +
                      " hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors " +
                      trBorder +
                      (onRowDoubleClick ? " cursor-pointer" : "")
                    }
                  >
                    {selectable && (
                      <td className={tdClass} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={set.has(id)}
                          onChange={() => toggleOne(id)}
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
