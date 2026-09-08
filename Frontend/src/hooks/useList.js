import { useCallback, useEffect, useState } from 'react'

// Hook generico de listado con recarga manual, usado por todas las paginas de modulo.
export function useList(fetcher) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result ?? [])
    } catch (err) {
      setError(err.message || 'No fue posible cargar la informacion')
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload, setError }
}
