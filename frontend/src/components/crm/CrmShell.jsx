import { NavLink } from 'react-router-dom'
import {
  GitBranch,
  Users,
  LineChart,
  Sparkles,
  ArrowRight,
  Inbox,
} from 'lucide-react'
import { cn } from '../../lib/cn'

/** Navegación horizontal entre módulos del CRM (clientes / pipeline / informes). */
export function CrmHubNav({ className }) {
  const links = [
    { to: '/crm/pipeline', label: 'Pipeline', icon: GitBranch, end: false },
    { to: '/clientes', label: 'Cartera', icon: Users, end: true },
    { to: '/crm/informes', label: 'Inteligencia', icon: LineChart, end: false },
  ]
  return (
    <nav
      className={cn(
        'flex flex-wrap gap-2 rounded-2xl border border-slate-200/90 bg-white/80 p-2 shadow-sm backdrop-blur-sm',
        className
      )}
      aria-label="Módulos CRM"
    >
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
              isActive
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/20'
                : 'text-slate-600 hover:bg-slate-50 hover:text-primary-800'
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function CrmPageHeader({ eyebrow = 'CRM de clientes', title, description, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {eyebrow}
        </p>
        <h1 className="page-title">{title}</h1>
        {description && (
          <p className="page-subtitle max-w-2xl text-pretty text-slate-600">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>
      )}
    </div>
  )
}

/** Tarjeta métrica compacta (KPI). */
export function CrmKpiCard({ label, value, hint, accent = 'primary', className }) {
  const accents = {
    primary: 'from-primary-500/10 to-sky-500/5 ring-primary-200/60',
    amber: 'from-amber-500/10 to-orange-500/5 ring-amber-200/70',
    emerald: 'from-emerald-500/10 to-teal-500/5 ring-emerald-200/70',
    violet: 'from-violet-500/10 to-fuchsia-500/5 ring-violet-200/70',
    rose: 'from-rose-500/10 to-red-500/5 ring-rose-200/70',
    slate: 'from-slate-500/10 to-slate-400/5 ring-slate-200/80',
  }
  return (
    <div
      className={cn(
        'rounded-2xl bg-gradient-to-br p-4 ring-1 ring-inset shadow-sm',
        accents[accent] || accents.primary,
        className
      )}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 leading-snug">{hint}</p>}
    </div>
  )
}

/** Contenedor de sección con título. */
export function CrmSection({ title, description, children, className, action }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-6',
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

const COT_BADGE = {
  borrador: 'bg-slate-100 text-slate-700 ring-slate-200',
  enviada: 'bg-sky-50 text-sky-800 ring-sky-200',
  aceptada: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rechazada: 'bg-rose-50 text-rose-800 ring-rose-200',
  expirada: 'bg-amber-50 text-amber-900 ring-amber-200',
}

export function CrmCotizacionBadge({ estado, labels }) {
  const label = labels?.[estado] || estado
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
        COT_BADGE[estado] || 'bg-slate-100 text-slate-700 ring-slate-200'
      )}
    >
      {label}
    </span>
  )
}

export function CrmEmptyState({ title, hint, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
      <Icon className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

/** Mini CTA enlace con flecha (tema claro). */
export function CrmTextLink({ to, children, className, ...props }) {
  return (
    <NavLink
      to={to}
      className={cn(
        'inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-800',
        className
      )}
      {...props}
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </NavLink>
  )
}
