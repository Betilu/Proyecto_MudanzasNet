import { cn } from '../lib/cn'

export default function FormCheckbox({ label, className, ...props }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2.5', className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 bg-white text-primary-600 focus:ring-primary-500/35 focus:ring-offset-0"
        {...props}
      />
      {label && <span className="text-sm text-slate-600">{label}</span>}
    </label>
  )
}
