import { useState } from 'react'
import { ShieldCheck, KeyRound, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function PrimerIngresoPage() {
  const { usuario, logout, completarPrimerIngreso } = useAuth()
  const [paso, setPaso] = useState(1)
  const [acepto, setAcepto] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleContinuar = (e) => {
    e.preventDefault()
    setPaso(2)
  }

  const handleCambiarPassword = async (e) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }
    setSaving(true)
    try {
      await completarPrimerIngreso(password)
    } catch (err) {
      setError(err.message || 'No fue posible cambiar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#052a18] px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-[#0e6b3c] px-6 py-5 text-white flex items-center justify-between">
          <div>
            <h1 className="font-black text-sm tracking-wide">PRIMER INGRESO AL SISTEMA</h1>
            <p className="text-[11px] text-white/80 mt-0.5">
              Hola, {usuario?.nombres} — completa estos pasos antes de continuar
            </p>
          </div>
          <button onClick={logout} className="flex items-center gap-1 text-[11px] text-white/80 hover:text-white">
            <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 pt-5">
          <StepBadge n={1} label="Políticas del laboratorio" activo={paso === 1} completado={paso > 1} />
          <div className={`h-0.5 flex-1 ${paso > 1 ? 'bg-[#0e6b3c]' : 'bg-gray-200'}`} />
          <StepBadge n={2} label="Cambiar contraseña" activo={paso === 2} completado={false} />
        </div>

        {paso === 1 ? (
          <form onSubmit={handleContinuar} className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#052a18]">
              <ShieldCheck className="w-4 h-4" />
              <h2 className="font-bold text-sm">Acta de compromiso y tratamiento de datos personales</h2>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 max-h-72 overflow-y-auto text-xs text-gray-600 space-y-3 bg-gray-50">
              <p className="text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Texto provisional — pendiente de reemplazar por el documento oficial que entregue la coordinación del laboratorio.
              </p>
              <div>
                <p className="font-semibold text-gray-700 mb-1">Acta de compromiso de uso del laboratorio</p>
                <p>
                  Al utilizar el Sistema de Gestión Documental del Laboratorio de Investigación de Ciberseguridad (LICI),
                  el usuario se compromete a hacer un uso responsable de los recursos, equipos e información a los que
                  tenga acceso, respetando las normas internas del laboratorio y de la Universidad de las Fuerzas
                  Armadas ESPE, y a reportar cualquier incidente de seguridad que detecte.
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">Tratamiento de datos personales</p>
                <p>
                  De acuerdo con la normativa institucional de protección de datos personales, la información
                  registrada en este sistema (datos de contacto, documentos, participación en proyectos, etc.) será
                  utilizada exclusivamente para la gestión académica y administrativa del laboratorio, y no será
                  compartida con terceros sin autorización expresa, salvo requerimiento legal.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                required
                checked={acepto}
                onChange={(e) => setAcepto(e.target.checked)}
                className="mt-0.5"
              />
              He leído y acepto el acta de compromiso de uso del laboratorio y la política de tratamiento de datos personales.
            </label>

            <button
              type="submit"
              disabled={!acepto}
              className="w-full flex items-center justify-center gap-2 bg-[#0e6b3c] hover:bg-[#16874c] disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded transition-colors"
            >
              Continuar
            </button>
          </form>
        ) : (
          <form onSubmit={handleCambiarPassword} className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#052a18]">
              <KeyRound className="w-4 h-4" />
              <h2 className="font-bold text-sm">Crea tu nueva contraseña</h2>
            </div>
            <p className="text-xs text-gray-500">
              Por seguridad, debes reemplazar la contraseña temporal que te asignó el administrador por una propia.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nueva contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e6b3c]"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e6b3c]"
                placeholder="Repite la contraseña"
              />
            </div>

            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-[#0e6b3c] hover:bg-[#16874c] disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar y entrar al sistema'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function StepBadge({ n, label, activo, completado }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0
          ${activo ? 'bg-[#0e6b3c] text-white' : completado ? 'bg-[#0e6b3c] text-white' : 'bg-gray-200 text-gray-500'}`}
      >
        {n}
      </span>
      <span className={`text-[11px] font-semibold hidden sm:inline ${activo ? 'text-[#052a18]' : 'text-gray-400'}`}>{label}</span>
    </div>
  )
}
