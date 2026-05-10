import { X } from 'lucide-react'
import { cn } from '../lib/cn'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const sizeClass = size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : 'max-w-lg'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-600/25 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-soft-lg shadow-slate-300/40 sm:rounded-2xl animate-slide-up',
          sizeClass
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-gradient-to-r from-white to-primary-50/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold bg-gradient-to-r from-slate-900 to-primary-800 bg-clip-text text-transparent sm:text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  )
}
