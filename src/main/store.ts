import Store from 'electron-store'
import type { PersistedState } from '../renderer/src/types/hierarchy'

const defaults: PersistedState = {
  vaultPath: null,
  camera: { x: 0, y: 0, scale: 1 },
  navigation: { level: 'world', selectedCountry: null, selectedCity: null, selectedTown: null },
  language: 'en'
}

export const store = new Store<PersistedState>({ defaults })
