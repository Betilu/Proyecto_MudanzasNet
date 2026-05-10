import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../lib/cn'
import { PAGE_SIZE, totalPages } from '../utils/paging'

const btnBase =
  'inline-flex items-center justify-center rounded-xl border text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-40'

const btnIdle =
  'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50/60 hover:text-slate-900'

const btnActive =
  'border-primary-300 bg-gradient-to-r from-primary-100 to-primary-50 text-primary-900 shadow-sm shadow-primary-500/10'

const btnIcon = 'h-9 w-9 p-0 sm:h-9 sm:w-9'

export default function Pagination({
  page = 1,
  totalCount = 0,
  pageSize = PAGE_SIZE,
  onPageChange,
  className,
  loading = false,
  maxVisible = 5,
}) {
  const pages = totalPages(totalCount, pageSize)
  if (pages <= 1 || totalCount <= 0) return null

  const half = Math.floor(maxVisible / 2)
  let start = Math.max(1, page - half)
  let end = Math.min(pages, page + half)
  if (end - start + 1 < maxVisible) {
    if (start === 1) end = Math.min(pages, start + maxVisible - 1)
    else start = Math.max(1, end - maxVisible + 1)
  }
  const nums = []
  for (let i = start; i <= end; i += 1) nums.push(i)

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-slate-200/90 bg-slate-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4',
        className
      )}
    >
      <p className="text-center text-xs text-slate-500 sm:text-left sm:text-sm">
        {loading ? (
          'Cargando…'
        ) : (
          <>
            <span className="text-slate-400">
              {from}–{to} de {totalCount}
            </span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">
              Página {page} de {pages}
            </span>
          </>
        )}
      </p>

      <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Paginación">
        <button
          type="button"
          className={cn(btnBase, btnIdle, btnIcon)}
          disabled={page <= 1 || loading}
          onClick={() => onPageChange?.(1)}
          aria-label="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(btnBase, btnIdle, btnIcon)}
          disabled={page <= 1 || loading}
          onClick={() => onPageChange?.(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="hidden items-center gap-1 sm:flex">
          {nums.map((n) => (
            <button
              key={n}
              type="button"
              className={cn(btnBase, 'min-w-[2.25rem] px-2.5 py-2', n === page ? btnActive : btnIdle)}
              disabled={loading}
              onClick={() => onPageChange?.(n)}
            >
              {n}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={cn(btnBase, btnIdle, btnIcon)}
          disabled={page >= pages || loading}
          onClick={() => onPageChange?.(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(btnBase, btnIdle, btnIcon)}
          disabled={page >= pages || loading}
          onClick={() => onPageChange?.(pages)}
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  )
}
