export function buildObsidianUrl(vaultName: string, filePath: string): string {
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`
}
