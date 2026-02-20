export type Language = 'en' | 'tr'

export const translations = {
  en: {
    selectVault: 'Select Vault Folder',
    selectVaultDesc: 'Choose your Obsidian vault folder to visualize it as a world map.',
    browse: 'Browse...',
    invalidVault: 'Invalid folder path. Please select a valid directory.',
    back: 'Back',
    world: 'World',
    rename: 'Rename',
    openInObsidian: 'Open in Obsidian',
    obsidianError: 'Could not open Obsidian. Make sure Obsidian is installed.',
    renameError: 'Could not rename. Please try again.',
    settings: 'Settings',
    language: 'Language',
    english: 'English',
    turkish: 'Turkish',
    empty: 'Empty',
    notes: 'notes',
    folders: 'folders',
    howToUse: 'How to Use',
    howToNavigate: 'Left Click: Enter a planet/sub-folder or open a note',
    howToPan: 'Left Click & Drag: Pan across the Solar System',
    howToZoom: 'Scroll: Zoom in and out of the galaxy',
    howToRename: 'Right Click: Rename a planet, folder, or note',
    howToBack: 'Esc Key or Back Button: Fly up one level',
    howToJump: 'Click Pink Trade Routes: Warp jump to connected planet'
  },
  tr: {
    selectVault: 'Vault Klasörü Seç',
    selectVaultDesc: 'Obsidian vault klasörünü seçerek dünya haritası olarak görselleştir.',
    browse: 'Gözat...',
    invalidVault: 'Geçersiz klasör yolu. Lütfen geçerli bir dizin seçin.',
    back: 'Geri',
    world: 'Dünya',
    rename: 'Yeniden Adlandır',
    openInObsidian: "Obsidian'da Aç",
    obsidianError: "Obsidian açılamadı. Obsidian'ın yüklü olduğundan emin olun.",
    renameError: 'Yeniden adlandırılamadı. Lütfen tekrar deneyin.',
    settings: 'Ayarlar',
    language: 'Dil',
    english: 'İngilizce',
    turkish: 'Türkçe',
    empty: 'Boş',
    notes: 'not',
    folders: 'klasör',
    howToUse: 'Nasıl Kullanılır',
    howToNavigate: 'Sol Tık: Bir gezegene/klasöre gir veya notu aç',
    howToPan: 'Sol Tık & Sürükle: Güneş sisteminde gezin',
    howToZoom: 'Fare Tekerleği: Galaksiye yaklaş / uzaklaş',
    howToRename: 'Sağ Tık: Bir gezegeni, klasörü veya notu yeniden adlandır',
    howToBack: 'Esc Tuşu veya Geri B.: Bir üst seviyeye uç',
    howToJump: 'Pembe Işınlara Tıkla: Bağlantılı gezegene ışınlan'
  }
} as const

export type TranslationKey = keyof typeof translations['en']
