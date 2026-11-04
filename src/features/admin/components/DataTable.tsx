import type { ReactNode } from "react";

export type Column<T> = {
  header: ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
};

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "No records found.",
  keyExtractor,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden border border-line bg-ink">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-line bg-ink-2/40 text-[10px] uppercase tracking-[0.18em] text-mute font-medium">
              {columns.map((col, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`px-4 py-3 whitespace-nowrap ${col.headerClassName ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-mute">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={keyExtractor(item)} className="transition-colors hover:bg-ink-2/30">
                  {columns.map((col, cIndex) => {
                    const content = col.cell
                      ? col.cell(item)
                      : col.accessorKey
                        ? String(item[col.accessorKey] ?? "")
                        : null;
                    return (
                      <td
                        key={cIndex}
                        className={`px-4 py-3.5 text-xs text-cream whitespace-nowrap ${
                          col.cellClassName ?? ""
                        }`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
