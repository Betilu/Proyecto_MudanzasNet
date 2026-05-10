import { cn } from '../lib/cn'

export default function FormInput({ label, error, required, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-600">
          {label}
          {required && <span className="text-error-400 ml-1">*</span>}
        </label>
      )}
      <input
        className={cn(
          'w-full rounded-xl border bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition',
          'focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400',
          error ? 'border-error-500/80' : 'border-slate-200',
          className
        )}
        required={required}
        {...props}
      />
      {error && <p className="text-sm text-error-400">{error}</p>}
    </div>
  )
}
