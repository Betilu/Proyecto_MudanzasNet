import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '../lib/cn'
import Pagination from './Pagination'

export default function DataTable({
  columns,
  data,
  loading,
  onRowClick,
  onEdit,
  onDelete,
  extraActions = [],
  emptyMessage = 'No hay datos',
  pagination,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-14">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 py-14 text-center text-slate-500">
        {emptyMessage}
      </div>
    )
  }

  const getExtraActions = (row) => {
    const arr = typeof extraActions === 'function' ? extraActions(row) : Array.isArray(extraActions) ? extraActions : []
    return Array.isArray(arr) ? arr : []
  }
  const hasActions =
    onEdit ||
    onDelete ||
    (Array.isArray(extraActions) && extraActions.length > 0) ||
    (typeof extraActions === 'function' && data?.[0] && getExtraActions(data[0]).length > 0)

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-sm ring-1 ring-slate-200/60">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-200/90 bg-gradient-to-r from-slate-50 to-primary-50/40">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-primary-800/90 sm:text-sm sm:normal-case">
                {col.label}
              </th>
            ))}
            {hasActions && (
              <th className="w-28 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-primary-800/90 sm:w-36 sm:text-sm sm:normal-case">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={(e) => {
                if (!onRowClick || e.target.closest('button, a')) return
                onRowClick(row)
              }}
              className={cn(
                'transition-colors hover:bg-primary-50/40',
                onRowClick ? 'cursor-pointer' : ''
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-slate-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {hasActions && (
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap justify-end gap-2">
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(row)} className="btn-table-action">
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    )}
                    {getExtraActions(row).map((action, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => action.onClick(row)}
                        className={cn(
                          action.variant === 'primary' ? 'btn-table-action' : 'btn-table-neutral',
                          action.className
                        )}
                      >
                        {action.label}
                      </button>
                    ))}
                    {onDelete && (
                      <button type="button" onClick={() => onDelete(row)} className="btn-table-danger">
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {pagination && typeof pagination.totalCount === 'number' && pagination.totalCount > 0 && (
        <Pagination
          page={pagination.page}
          totalCount={pagination.totalCount}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          loading={pagination.loading}
        />
      )}
    </div>
  )
}
