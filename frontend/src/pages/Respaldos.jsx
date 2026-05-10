import { useState } from 'react'
import { Download, Upload, AlertTriangle, Server, Terminal } from 'lucide-react'
import api from '../api/client'
import { formatApiErrorData, toast, toastApiError, toastMessage, toastSuccess } from '../utils/apiToast'

export default function Respaldos() {
  const [downloading, setDownloading] = useState(false)
  const [file, setFile] = useState(null)
  const [confirm, setConfirm] = useState('')
  const [reemplazarMedia, setReemplazarMedia] = useState(false)
  const [reemplazarMl, setReemplazarMl] = useState(true)
  const [restoring, setRestoring] = useState(false)

  const descargar = async () => {
    setDownloading(true)
    try {
      const res = await api.get('/sistema/backup/descargar/', { responseType: 'blob' })
      const cd = res.headers['content-disposition'] || res.headers['Content-Disposition']
      let filename = 'respaldo_crm.zip'
      if (cd) {
        const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd)
        if (m) filename = decodeURIComponent(m[1].replace(/['"]/g, ''))
      }
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Descarga del respaldo iniciada')
    } catch (e) {
      let detail = ''
      const data = e?.response?.data
      if (data instanceof Blob) {
        try {
          detail = formatApiErrorData(JSON.parse(await data.text()))
        } catch {
          /* cuerpo no JSON */
        }
      }
      if (detail) {
        toast.error(detail)
      } else {
        toastApiError(
          e,
          'No se pudo generar el respaldo. pg_dump debe coincidir con la versión del servidor (ver BACKUP_PG_BIN en .env).'
        )
      }
    } finally {
      setDownloading(false)
    }
  }

  const restaurar = async (e) => {
    e.preventDefault()
    if (confirm.trim() !== 'RESTAURAR') {
      toastMessage('Escribe exactamente RESTAURAR para confirmar')
      return
    }
    if (!file) {
      toastMessage('Selecciona un archivo .zip')
      return
    }
    if (!window.confirm('Esto reemplazará datos en la base de datos actual. ¿Continuar?')) return

    setRestoring(true)
    const fd = new FormData()
    fd.append('archivo', file)
    fd.append('confirmar', 'RESTAURAR')
    fd.append('reemplazar_media', reemplazarMedia ? 'true' : 'false')
    fd.append('reemplazar_ml', reemplazarMl ? 'true' : 'false')

    try {
      await api.post('/sistema/backup/restaurar/', fd)
      toastSuccess('Restauración completada. Si algo falla, reinicia el backend.')
      setFile(null)
      setConfirm('')
    } catch (err) {
      toastApiError(err, 'Error al restaurar')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Respaldos del sistema</h1>
        <p className="text-slate-600 text-sm mt-2">
          Incluye volcado PostgreSQL (con <code className="text-xs bg-slate-100 px-1 rounded">DROP/CREATE</code> seguro),
          carpeta <strong>media</strong> y modelos en <strong>ml_models</strong>. En el servidor hace falta{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">pg_dump</code> y{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">psql</code> de la <strong>misma versión major</strong> que
          PostgreSQL; si en tu PATH hay un cliente viejo, define{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">BACKUP_PG_BIN</code> en <code className="text-xs">.env</code>.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 flex gap-3 text-amber-950 text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Operación sensible</p>
          <p className="mt-1 opacity-90">
            La restauración sobrescribe la base de datos actual. Haz respaldo antes de probar. En producción la API de
            restauración puede estar desactivada: usa{' '}
            <code className="text-xs bg-white/80 px-1 rounded">python manage.py backup_restaurar archivo.zip</code>.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Download className="h-5 w-5 text-primary-600" />
          Crear y descargar respaldo
        </div>
        <p className="text-sm text-slate-600">
          Genera un <strong>.zip</strong> con <code className="text-xs">manifest.json</code>, SQL y archivos.
        </p>
        <button
          type="button"
          onClick={descargar}
          disabled={downloading}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Generando…' : 'Descargar respaldo'}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Upload className="h-5 w-5 text-primary-600" />
          Restaurar desde archivo
        </div>
        <form onSubmit={restaurar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Archivo .zip</label>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={reemplazarMedia}
              onChange={(e) => setReemplazarMedia(e.target.checked)}
            />
            Vaciar <code className="text-xs">MEDIA_ROOT</code> antes de copiar (recomendado para coincidir 1:1)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={reemplazarMl} onChange={(e) => setReemplazarMl(e.target.checked)} />
            Vaciar carpeta de modelos ML antes de copiar
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmación (escribe <strong>RESTAURAR</strong>)
            </label>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              placeholder="RESTAURAR"
              autoComplete="off"
            />
          </div>
          <button type="submit" disabled={restoring} className="btn-primary inline-flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {restoring ? 'Restaurando…' : 'Ejecutar restauración'}
          </button>
        </form>
      </section>

      {/* <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 space-y-3 text-sm text-slate-700">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Terminal className="h-5 w-5" />
          Línea de comandos
        </div>
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto">
{`# Crear respaldo en el servidor
python manage.py backup_crear --salida /ruta/respaldo.zip

# Restaurar (mantenimiento, sin usuarios en la app)
python manage.py backup_restaurar /ruta/respaldo.zip --reemplazar-media`}
        </pre>
        <div className="flex items-start gap-2 text-slate-600">
          <Server className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Si ves error de <em>version mismatch</em> entre servidor y <code className="text-xs bg-white px-1 rounded">pg_dump</code>, en{' '}
            <code className="text-xs">.env</code> usa por ejemplo{' '}
            <code className="text-xs bg-white px-1 rounded">BACKUP_PG_BIN=/opt/homebrew/opt/postgresql@14/bin</code>{' '}
            (ajusta la versión y la ruta). En producción,{' '}
            <code className="text-xs bg-white px-1 rounded">BACKUP_RESTORE_ENABLED=true</code> solo si necesitas restaurar vía API; por defecto es{' '}
            <strong>false</strong>.
          </p>
        </div>
      </section> */}
    </div>
  )
}
