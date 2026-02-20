declare global {
  interface Window {
    api: {
      selectVault: () => Promise<string | null>
      scanVault: (vaultPath: string) => Promise<unknown>
      renameNode: (oldPath: string, newName: string) => Promise<{ success: boolean; error?: string }>
      renameFile: (oldPath: string, newName: string) => Promise<{ success: boolean; error?: string }>
      createNote: (folderPath: string, noteName: string) => Promise<{ success: boolean; error?: string }>
      moveNode: (sourcePath: string, targetFolderPath: string) => Promise<{ success: boolean; error?: string }>
      openObsidian: (url: string) => Promise<{ success: boolean; error?: string }>
      storeGet: (key: string) => Promise<unknown>
      storeSet: (key: string, value: unknown) => Promise<void>
      loadAdmin1: () => Promise<{ type: string; features: unknown[] } | null>
    }
  }
}

export { }
