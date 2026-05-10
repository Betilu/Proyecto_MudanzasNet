import { useState, useEffect } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import FormInput from '../components/FormInput'

export default function Bitacora() {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [accionInput, setAccionInput] = useState('')
  const [entidadInput, setEntidadInput] = useState('')
  const [query, setQuery] = useState({ accion: '', entidad_tipo: '' })

  const load = () => {
    setLoading(true)
    const params = {}
    if (query.accion.trim()) params.accion = query.accion.trim()
    if (query.entidad_tipo.trim()) params.entidad_tipo = query.entidad_tipo.trim()
    api
      .get('/auth/bitacora/', { params })
      .then(({ data }) => setRegistros(data.results ?? data ?? []))
      .catch(() => setRegistros([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarga cuando cambian filtros aplicados
  }, [query])

  const aplicarFiltros = () => {
    setQuery({
      accion: accionInput,
      entidad_tipo: entidadInput,
    })
  }

  const limpiar = () => {
    setAccionInput('')
    setEntidadInput('')
    setQuery({ accion: '', entidad_tipo: '' })
  }

  const columns = [
    { key: 'creado_en', label: 'Fecha', render: (r) => new Date(r.creado_en).toLocaleString('es-BO') },
    { key: 'usuario_email', label: 'Usuario' },
    { key: 'accion', label: 'Acción' },
    { key: 'entidad_tipo', label: 'Entidad' },
    { key: 'entidad_id', label: 'ID' },
    {
      key: 'direccion_ip',
      label: 'IP',
      render: (r) => r.direccion_ip || '—',
    },
    {
      key: 'detalles',
      label: 'Detalle',
      render: (r) => {
        const d = r.detalles
        if (!d || typeof d !== 'object') return '—'
        const s = JSON.stringify(d)
        return s.length > 48 ? `${s.slice(0, 48)}…` : s
      },
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Bitácora de auditoría</h1>
      <p className="text-slate-500 text-sm mb-6">
        Logins, cambios en usuarios/roles/permisos, configuración y eventos de reservas/pagos.
      </p>
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <FormInput
          label="Filtrar por acción"
          value={accionInput}
          onChange={(e) => setAccionInput(e.target.value)}
          placeholder="login, reserva_creada…"
        />
        <FormInput
          label="Tipo de entidad"
          value={entidadInput}
          onChange={(e) => setEntidadInput(e.target.value)}
          placeholder="Usuario, Reserva…"
        />
        <button
          type="button"
          onClick={aplicarFiltros}
          className="btn-primary text-sm"
        >
          Aplicar
        </button>
        <button
          type="button"
          onClick={limpiar}
          className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 text-sm"
        >
          Limpiar
        </button>
      </div>
      <DataTable columns={columns} data={registros} loading={loading} emptyMessage="No hay registros de auditoría" />
    </div>
  )
}
