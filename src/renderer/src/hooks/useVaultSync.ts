import { useEffect, useRef } from 'react'

export function useVaultSync(
  vaultPath: string | null,
  setHierarchy: (h: unknown) => void,
  setError: (msg: string | null) => void
): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!vaultPath) return

    const scan = async (): Promise<void> => {
      try {
        const result = await window.api.scanVault(vaultPath)
        if (result) setHierarchy(result as never)
      } catch {
        setError('Vault scan failed.')
      }
    }

    scan()
    intervalRef.current = setInterval(scan, 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [vaultPath, setHierarchy, setError])
}
