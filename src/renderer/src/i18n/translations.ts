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
    howToJump: 'Click Pink Trade Routes: Warp jump to connected planet',
    tabGeneral: 'General',
    tabGuide: 'User Guide',
    guideIntro: 'Welcome to Mind Map Planet. This application visualizes your Obsidian vault as an interactive 3D universe. Below are detailed instructions covering every advanced feature.',

    guideNavigation: 'Navigation & Camera Movement',
    guideNavigationDesc: 'The camera allows you to freely explore your digital universe. Move around simply by clicking and dragging on empty space to pan the camera across the star cluster. Scroll your mouse wheel forward to zoom into specific planets, or scroll backward to get a wider galactic view of your entire folder structure. Double-clicking on empty space will smoothly refocus the camera to the center of the current solar system.',

    guideInteraction: 'Interacting with Planets (Notes & Folders)',
    guideInteractionDesc: 'Every celestial body represents a file or folder in your vault. \n\n• Left Click on a planet (folder) to dive deeper into that specific solar system. If the planet is a Note, Left Clicking it will immediately open that exact note inside Obsidian for editing.\n\n• Right Click on any planet or orbital ring to quickly rename it. This rename operation will be instantly reflected in your actual file system as well.',

    guideTradeRoutes: 'Trade Routes (Interactive Links)',
    guideTradeRoutesDesc: 'The pink, glowing energetic streams connecting different planets represent the internal WikiLinks between your notes. These aren\'t just visual—they are interactive wormholes. You can click on any of these trade routes to instantly warp jump the camera directly to the connected planet, allowing you to easily follow trains of thought across your entire vault.',

    guideReturn: 'Returning & Traversal',
    guideReturnDesc: 'When you dive deep into sub-folders (inner solar systems), you can always resurface. Press the Esc (Escape) key on your keyboard, or click the \'Back\' UI button in the top left corner of the screen to smoothly fly the camera up one hierarchy level, back to the parent folder.',

    guideSearch: 'Fast Universal Search',
    guideSearchDesc: 'Use the Search bar at the top of the screen to instantly locate any note or folder across your entire vault. Simply start typing, and the search results will appear. Clicking on a result will instantly warp your camera to that specific planet\'s location, no matter how deep it is in your folder structure.',

    guideQuickNotes: 'Creating Quick Notes',
    guideQuickNotesDesc: 'Whenever inspiration strikes, you can quickly add a new note to your current solar system (folder). Click the \'New Note\' (+) button in the top navigation bar. Type your note title, and a new planet will be born in your current system. A new markdown file will automatically be created in your Obsidian vault.',

    guideDragDrop: 'Drag and Drop & Cargo Hold',
    guideDragDropDesc: 'Mind Map Planet features a unique inventory system called the \'Cargo Hold\' (bottom left of the screen). \n\n• You can Right-Click and drag any planet or folder into the Cargo Hold to temporarily store it there. \n• Travel to a different star system (folder) using the camera or navigation. \n• Drag the item out of your Cargo Hold and drop it into the new empty space. \nThis will physically move the markdown file or folder within your Obsidian vault to the new location.'
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
    howToJump: 'Pembe Işınlara Tıkla: Bağlantılı gezegene ışınlan',
    tabGeneral: 'Genel',
    tabGuide: 'Kullanım Kılavuzu',
    guideIntro: 'Mind Map Planet\'e hoş geldiniz. Bu uygulama Obsidian kasanızı etkileşimli bir 3D evren olarak görselleştirir. Uygulamanın tüm gelişmiş özelliklerini kullanmak için detaylı talimatları aşağıda bulabilirsiniz.',

    guideNavigation: 'Gezinme ve Kamera Kontrolü',
    guideNavigationDesc: 'Kamera, dijital evreninizi özgürce keşfetmenizi sağlar. Uzay boşluğuna sol tıklayıp sürükleyerek kamerayı yıldız kümesi etrafında kaydırabilirsiniz. Gezegenlere yaklaşmak için farenizin tekerleğini ileri, tüm klasör yapınızı daha geniş bir galaktik perspektiften görmek için ise geri kaydırın. Boşluğa çift tıklamak, kamerayı yumuşak bir şekilde mevcut güneş sisteminin merkezine odaklar.',

    guideInteraction: 'Gezegenlerle Etkileşim (Notlar ve Klasörler)',
    guideInteractionDesc: 'Her gök cismi, kasanızdaki bir dosya veya klasörü temsil eder.\n\n• O özel güneş sisteminin daha da derinlerine inmek için bir gezegene (klasör) Sol Tıklayın. Eğer gezegen bir Not ise, Sol Tıklamak o notu düzenlemeniz için anında Obsidian\'da açacaktır.\n\n• Herhangi bir gezegeni veya yörünge halkasını hızlıca yeniden adlandırmak için üzerine Sağ Tıklayın. Bu isim değiştirme işlemi anında gerçek dosya sisteminize de yansıtılacaktır.',

    guideTradeRoutes: 'Ticaret Rotaları (Etkileşimli Bağlantılar)',
    guideTradeRoutesDesc: 'Farklı gezegenleri birbirine bağlayan pembe, parlayan enerji akışları, notlarınız arasındaki WikiLink iç bağlantılarını temsil eder. Bunlar sadece görsel değil, aynı zamanda etkileşimli solucan delikleridir. Kasanızın tamamında düşünce zincirlerinizi kolayca takip edebilmek için bu ticaret rotalarına tıklayarak bağlı olan gezegene anında ışınlanabilirsiniz.',

    guideReturn: 'Geri Dönüş ve Yüzeye Çıkış',
    guideReturnDesc: 'Alt klasörlerin (iç güneş sistemlerinin) derinliklerine indiğinizde her zaman yüzeye çıkabilirsiniz. Kamerayı sorunsuz bir şekilde bir üst hiyerarşi seviyesine, yani ana klasöre doğru uçurmak için klavyenizdeki Esc (Escape) tuşuna basın veya ekranın sol üst köşesindeki \'Geri\' (Back) arayüz düğmesine tıklayın.',

    guideSearch: 'Hızlı Evrensel Arama',
    guideSearchDesc: 'Ekranın üst kısmındaki Arama çubuğunu kullanarak tüm kasanızdaki herhangi bir notu veya klasörü anında bulabilirsiniz. Sadece yazmaya başlayın, arama sonuçları aşağı açılacaktır. Bir sonuca tıkladığınızda, o gezegen klasör yapınızın ne kadar derininde olursa olsun kameranız anında o konuma ışınlanacaktır.',

    guideQuickNotes: 'Hızlı Not Oluşturma',
    guideQuickNotesDesc: 'İlham geldiği anda bulunduğunuz güneş sistemine (klasöre) hızlıca yeni bir not ekleyebilirsiniz. Üst menü çubuğundaki \'Yeni Not\' (+) düğmesine tıklayın. Notunuzun başlığını yazın; bulunduğunuz sistemde yeni bir gezegen doğacak ve Obsidian kasanızda otomatik olarak yeni bir markdown dosyası oluşturulacaktır.',

    guideDragDrop: 'Sürükle-Bırak ve Kargo Alanı (Cargo Hold)',
    guideDragDropDesc: 'Mind Map Planet, \'Kargo Alanı\' (Cargo Hold) adında benzersiz bir envanter sistemine sahiptir (ekranın sol alt köşesi).\n\n• Herhangi bir gezegeni veya klasörü Sağ Tıklayıp sürükleyerek Kargo Alanı\'na bırakabilir ve geçici olarak orada saklayabilirsiniz.\n• Kamera veya navigasyon ile tamamen farklı bir yıldız sistemine (klasöre) seyahat edin.\n• Kargo Alanı\'ndaki öğeyi sürükleyip yeni sistemdeki boş uzay alanına bırakın.\nBu işlem, Obsidian kasanızdaki ilgili markdown dosyasını veya klasörünü fiziksel olarak yeni konumuna taşıyacaktır.'
  }
} as const

export type TranslationKey = keyof typeof translations['en']
