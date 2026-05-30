import { useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Search,
  FileText,
  User,
  Music2,
  MapPin,
  ListChecks,
  BookOpen,
  Navigation,
  Loader2,
} from "lucide-react";
import { Geolocation } from "@capacitor/geolocation";
import { cn } from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import { AudioInputDevicePanel } from "./karaoke/AudioInputDevicePanel";
import { playClickSfx, playTickSfx } from "../utils/sfx";

// Reusable Section Header
const SectionHeader = ({ title }: { title: string }) => (
  <div className="bg-gradient-to-r from-[#1a1c23] to-[#2d303a] text-cyan-400 font-bold px-4 py-2.5 text-[12px] uppercase tracking-widest border-b border-[#0f1015] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] select-none flex items-center">
    <div className="w-1 h-3.5 bg-cyan-500 rounded-sm mr-2.5 shadow-[0_0_4px_rgba(6,182,212,0.8)]"></div>
    {title}
  </div>
);

// Reusable CheckboxRow - Updated for robust data binding
const CheckboxRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) => (
  <label className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-200/60 cursor-pointer active:bg-gray-50 select-none transition-colors">
    <span className="text-gray-800 text-[15px] font-medium leading-tight flex-1">
      {label}
    </span>
    <div
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out shadow-inner",
        checked ? "bg-emerald-500" : "bg-gray-300",
      )}
      onClick={() => playClickSfx()}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </div>
  </label>
);

// Reusable Button
const SettingsButton = ({
  label,
  variant = "default",
  onClick,
}: {
  label: string;
  variant?: "default" | "danger";
  onClick?: () => void;
}) => (
  <button
    onClick={() => {
      playClickSfx();
      if (onClick) onClick();
    }}
    className={cn(
      "w-full py-3.5 px-4 font-bold text-[14px] shadow-sm active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] transition-all rounded-lg cursor-pointer border border-b-2",
      variant === "danger"
        ? "bg-gradient-to-b from-red-50 to-red-100 text-red-700 border-red-200 border-b-red-300 hover:from-red-100 hover:to-red-200"
        : "bg-gradient-to-b from-gray-50 to-gray-100 text-gray-800 border-gray-200 border-b-gray-300 hover:from-gray-100 hover:to-gray-200",
    )}
  >
    {label}
  </button>
);

type SheetKind =
  | "phrases"
  | "location"
  | "guide"
  | "terms"
  | "privacy"
  | "legal"
  | "rating"
  | "deleteAccount"
  | "modulationRules"
  | "channelPolicy"
  | "troubleshooting"
  | "aboutNexvwt"
  | null;

const QUICK_PHRASES = [
  "1 ❤️ BERBAGI MODULASI NEXVWT TETAP DI HATI",
  "1 NUSA 1 BANGSA 1 BAHASA",
  "ADA UDANG DI BALIK BATU... MODUS YA?",
  "AIR BERIAK TANDA TAK DALAM",
  "BERAT SAMA DIPIKUL RINGAN SAMA DIJINJING",
  "BHINNEKA TUNGGAL IKA TAN HANA DHARMA MANGRWA",
  "CINTAKU BERTEPUK SEBELAH CHANNEL",
  "DI MANA BUMI DIPIJAK DI SANA LANGIT DIJUNJUNG",
  "JANGAN ADA DUSTA DI ANTARA KITA",
  "JANGAN LUPA NGOPI ☕☕",
  "MALU BERTANYA TERSESAT DI CHANNEL",
  "MOHON MAAF, SEDANG BEKERJA",
  "MOHON MAAF, SEDANG DALAM PERJALANAN",
  "MOHON MAAF, SEDANG ISTIRAHAT",
  "MOHON MAAF, SEDANG MAKAN",
  "MOHON MAAF, SEDANG MENGASUH ANAK",
  "MOHON MAAF, SEDANG MENGEMUDI",
  "MOHON MAAF, SEDANG TIDAK DI TEMPAT",
  "MOHON MAAF, SEDANG TIDUR",
  "MOHON MAAF, SINYAL ADA GANGGUAN",
  "NKRI HARGA MATI",
  "SATU HATI BERBAGI MODULASI NKRI HARGA MATI",
  "TAK ADA JALAN YANG TAK BERLUBANG",
  "TAK KENAL MAKA TAK SAYANG",
  "TONG KOSONG NYARING BUNYINYA",
  "SALAM SATU FREKUENSI",
  "IZIN BERGABUNG DI CHANNEL",
  "IZIN MONITOR, SAYA STANDBY",
  "SIAP MENERIMA MODULASI",
  "TERIMA KASIH ATAS MODULASINYA",
  "MOHON CEK AUDIO SAYA",
  "MOHON CEK SINYAL / LATENSI",
  "SAYA QRT / OFF DULU",
  "SAYA KEMBALI STANDBY",
  "KOPI DARAT TETAP JAGA PERSAUDARAAN",
  "NEXVWT MENYAMBUNG SILATURAHMI",
];

const PROVINCES = [
  "ACEH",
  "BALI",
  "BANGKA BELITUNG",
  "BANTEN",
  "BENGKULU",
  "DAERAH ISTIMEWA YOGYAKARTA",
  "DAERAH KHUSUS IBUKOTA",
  "GORONTALO",
  "JAMBI",
  "JAWA BARAT",
  "JAWA TENGAH",
  "JAWA TIMUR",
  "KALIMANTAN BARAT",
  "KALIMANTAN SELATAN",
  "KALIMANTAN TENGAH",
  "KALIMANTAN TIMUR",
  "KALIMANTAN UTARA",
  "KEPULAUAN RIAU",
  "LAMPUNG",
  "MALUKU",
  "MALUKU UTARA",
  "NUSA TENGGARA BARAT",
  "NUSA TENGGARA TIMUR",
  "PAPUA",
  "PAPUA BARAT",
  "PAPUA BARAT DAYA",
  "PAPUA PEGUNUNGAN",
  "PAPUA SELATAN",
  "PAPUA TENGAH",
  "RIAU",
  "SULAWESI BARAT",
  "SULAWESI SELATAN",
  "SULAWESI TENGAH",
  "SULAWESI TENGGARA",
  "SULAWESI UTARA",
  "SUMATRA BARAT",
  "SUMATRA SELATAN",
  "SUMATRA UTARA",
];

const CITY_BY_PROVINCE: Record<string, string[]> = {
  ACEH: [
    "BANDA ACEH",
    "LANGSA",
    "LHOKSEUMAWE",
    "SABANG",
    "SUBULUSSALAM",
    "ACEH BESAR",
    "ACEH BARAT",
    "ACEH TENGAH",
    "ACEH UTARA",
    "BENER MERIAH",
  ],
  BALI: [
    "DENPASAR",
    "BADUNG",
    "BANGLI",
    "BULELENG",
    "GIANYAR",
    "JEMBRANA",
    "KARANGASEM",
    "KLUNGKUNG",
    "TABANAN",
  ],
  "BANGKA BELITUNG": [
    "PANGKALPINANG",
    "BANGKA",
    "BANGKA BARAT",
    "BANGKA SELATAN",
    "BANGKA TENGAH",
    "BELITUNG",
    "BELITUNG TIMUR",
  ],
  BANTEN: [
    "SERANG",
    "TANGERANG",
    "TANGERANG SELATAN",
    "CILEGON",
    "KABUPATEN SERANG",
    "KABUPATEN TANGERANG",
    "PANDEGLANG",
    "LEBAK",
  ],
  BENGKULU: [
    "BENGKULU",
    "BENGKULU SELATAN",
    "BENGKULU TENGAH",
    "BENGKULU UTARA",
    "KAUR",
    "KEPAHIANG",
    "LEBONG",
    "MUKOMUKO",
    "REJANG LEBONG",
    "SELUMA",
  ],
  "DAERAH ISTIMEWA YOGYAKARTA": [
    "YOGYAKARTA",
    "BANTUL",
    "GUNUNGKIDUL",
    "KULON PROGO",
    "SLEMAN",
  ],
  "DAERAH KHUSUS IBUKOTA": [
    "JAKARTA PUSAT",
    "JAKARTA UTARA",
    "JAKARTA BARAT",
    "JAKARTA SELATAN",
    "JAKARTA TIMUR",
    "KEPULAUAN SERIBU",
  ],
  GORONTALO: [
    "GORONTALO",
    "BONE BOLANGO",
    "BOALEMO",
    "GORONTALO UTARA",
    "PAHUWATO",
    "KABUPATEN GORONTALO",
  ],
  JAMBI: [
    "JAMBI",
    "SUNGAI PENUH",
    "BATANGHARI",
    "BUNGO",
    "KERINCI",
    "MERANGIN",
    "MUARO JAMBI",
    "SAROLANGUN",
    "TANJUNG JABUNG BARAT",
    "TANJUNG JABUNG TIMUR",
    "TEBO",
  ],
  "JAWA BARAT": [
    "BANDUNG",
    "BANDUNG BARAT",
    "BEKASI",
    "BOGOR",
    "CIAMIS",
    "CIANJUR",
    "CIREBON",
    "GARUT",
    "INDRAMAYU",
    "KARAWANG",
    "KUNINGAN",
    "MAJALENGKA",
    "PANGANDARAN",
    "PURWAKARTA",
    "SUBANG",
    "SUKABUMI",
    "SUMEDANG",
    "TASIKMALAYA",
    "BANJAR",
    "CIMAHI",
    "DEPOK",
  ],
  "JAWA TENGAH": [
    "SEMARANG",
    "SURAKARTA",
    "MAGELANG",
    "SALATIGA",
    "PEKALONGAN",
    "TEGAL",
    "BANYUMAS",
    "CILACAP",
    "DEMAK",
    "JEPARA",
    "KENDAL",
    "KLATEN",
    "KUDUS",
    "PATI",
    "PURBALINGGA",
    "PURWOREJO",
    "REMBANG",
    "SRAGEN",
    "WONOGIRI",
    "WONOSOBO",
  ],
  "JAWA TIMUR": [
    "SURABAYA",
    "MALANG",
    "BATU",
    "KEDIRI",
    "MADIUN",
    "MOJOKERTO",
    "PASURUAN",
    "PROBOLINGGO",
    "BLITAR",
    "BANYUWANGI",
    "GRESIK",
    "JEMBER",
    "JOMBANG",
    "LAMONGAN",
    "LUMAJANG",
    "SIDOARJO",
    "TUBAN",
    "TULUNGAGUNG",
  ],
  "KALIMANTAN BARAT": [
    "PONTIANAK",
    "SINGKAWANG",
    "BENGKAYANG",
    "KAPUAS HULU",
    "KAYONG UTARA",
    "KETAPANG",
    "KUBU RAYA",
    "LANDAK",
    "MELAWI",
    "MEMPAWAH",
    "SAMBAS",
    "SANGGAU",
    "SEKADAU",
    "SINTANG",
  ],
  "KALIMANTAN SELATAN": [
    "BANJARMASIN",
    "BANJARBARU",
    "BALANGAN",
    "BANJAR",
    "BARITO KUALA",
    "HULU SUNGAI SELATAN",
    "HULU SUNGAI TENGAH",
    "HULU SUNGAI UTARA",
    "KOTABARU",
    "TABALONG",
    "TANAH BUMBU",
    "TANAH LAUT",
    "TAPIN",
  ],
  "KALIMANTAN TENGAH": [
    "PALANGKA RAYA",
    "BARITO SELATAN",
    "BARITO TIMUR",
    "BARITO UTARA",
    "GUNUNG MAS",
    "KAPUAS",
    "KATINGAN",
    "KOTAWARINGIN BARAT",
    "KOTAWARINGIN TIMUR",
    "LAMANDAU",
    "MURUNG RAYA",
    "PULANG PISAU",
    "SERUYAN",
    "SUKAMARA",
  ],
  "KALIMANTAN TIMUR": [
    "SAMARINDA",
    "BALIKPAPAN",
    "BONTANG",
    "BERAU",
    "KUTAI BARAT",
    "KUTAI KARTANEGARA",
    "KUTAI TIMUR",
    "MAHAKAM ULU",
    "PASER",
    "PENAJAM PASER UTARA",
  ],
  "KALIMANTAN UTARA": [
    "TARAKAN",
    "BULUNGAN",
    "MALINAU",
    "NUNUKAN",
    "TANA TIDUNG",
  ],
  "KEPULAUAN RIAU": [
    "TANJUNGPINANG",
    "BATAM",
    "BINTAN",
    "KARIMUN",
    "KEPULAUAN ANAMBAS",
    "LINGGA",
    "NATUNA",
  ],
  LAMPUNG: [
    "BANDAR LAMPUNG",
    "METRO",
    "LAMPUNG BARAT",
    "LAMPUNG SELATAN",
    "LAMPUNG TENGAH",
    "LAMPUNG TIMUR",
    "LAMPUNG UTARA",
    "PESAWARAN",
    "PESISIR BARAT",
    "PRINGSEWU",
    "TANGGAMUS",
    "TULANG BAWANG",
    "WAY KANAN",
  ],
  MALUKU: [
    "AMBON",
    "TUAL",
    "BURU",
    "BURU SELATAN",
    "KEPULAUAN ARU",
    "MALUKU BARAT DAYA",
    "MALUKU TENGAH",
    "MALUKU TENGGARA",
    "SERAM BAGIAN BARAT",
    "SERAM BAGIAN TIMUR",
  ],
  "MALUKU UTARA": [
    "TERNATE",
    "TIDORE KEPULAUAN",
    "HALMAHERA BARAT",
    "HALMAHERA SELATAN",
    "HALMAHERA TENGAH",
    "HALMAHERA TIMUR",
    "HALMAHERA UTARA",
    "KEPULAUAN SULA",
    "PULAU MOROTAI",
    "PULAU TALIABU",
  ],
  "NUSA TENGGARA BARAT": [
    "MATARAM",
    "BIMA",
    "DOMPU",
    "LOMBOK BARAT",
    "LOMBOK TENGAH",
    "LOMBOK TIMUR",
    "LOMBOK UTARA",
    "SUMBAWA",
    "SUMBAWA BARAT",
  ],
  "NUSA TENGGARA TIMUR": [
    "KUPANG",
    "ALOR",
    "BELU",
    "ENDE",
    "FLORES TIMUR",
    "LEMBATA",
    "MANGGARAI",
    "MANGGARAI BARAT",
    "MANGGARAI TIMUR",
    "NGADA",
    "SIKKA",
    "SUMBA BARAT",
    "SUMBA TIMUR",
    "TIMOR TENGAH SELATAN",
    "TIMOR TENGAH UTARA",
  ],
  PAPUA: [
    "JAYAPURA",
    "KABUPATEN JAYAPURA",
    "BIAK NUMFOR",
    "KEEROM",
    "KEPULAUAN YAPEN",
    "MAMBERAMO RAYA",
    "SARMI",
    "SUPIORI",
    "WAROPEN",
  ],
  "PAPUA BARAT": [
    "MANOKWARI",
    "FAKFAK",
    "KAIMANA",
    "MANOKWARI SELATAN",
    "PEGUNUNGAN ARFAK",
    "TELUK BINTUNI",
    "TELUK WONDAMA",
  ],
  "PAPUA BARAT DAYA": [
    "SORONG",
    "KOTA SORONG",
    "MAYBRAT",
    "RAJA AMPAT",
    "SORONG SELATAN",
    "TAMBRAUW",
  ],
  "PAPUA PEGUNUNGAN": [
    "JAYAWIJAYA",
    "LANNY JAYA",
    "MAMBERAMO TENGAH",
    "NDUGA",
    "PEGUNUNGAN BINTANG",
    "TOLIKARA",
    "YAHUKIMO",
    "YALIMO",
  ],
  "PAPUA SELATAN": ["MERAUKE", "ASMAT", "BOVEN DIGOEL", "MAPPI"],
  "PAPUA TENGAH": [
    "NABIRE",
    "DEIYAI",
    "DOGIYAI",
    "INTAN JAYA",
    "MIMIKA",
    "PANIAI",
    "PUNCAK",
    "PUNCAK JAYA",
  ],
  RIAU: [
    "PEKANBARU",
    "DUMAI",
    "BENGKALIS",
    "INDRAGIRI HILIR",
    "INDRAGIRI HULU",
    "KAMPAR",
    "KEPULAUAN MERANTI",
    "KUANTAN SINGINGI",
    "PELALAWAN",
    "ROKAN HILIR",
    "ROKAN HULU",
    "SIAK",
  ],
  "SULAWESI BARAT": [
    "MAMUJU",
    "MAJENE",
    "MAMASA",
    "MAMUJU TENGAH",
    "PASANGKAYU",
    "POLEWALI MANDAR",
  ],
  "SULAWESI SELATAN": [
    "MAKASSAR",
    "PAREPARE",
    "PALOPO",
    "BANTAENG",
    "BARRU",
    "BONE",
    "BULUKUMBA",
    "ENREKANG",
    "GOWA",
    "LUWU",
    "MAROS",
    "PINRANG",
    "SIDRAP",
    "SINJAI",
    "TAKALAR",
    "TORAJA UTARA",
    "WAJO",
  ],
  "SULAWESI TENGAH": [
    "PALU",
    "BANGGAI",
    "BANGGAI KEPULAUAN",
    "BANGGAI LAUT",
    "BUOL",
    "DONGGALA",
    "MOROWALI",
    "MOROWALI UTARA",
    "PARIGI MOUTONG",
    "POSO",
    "SIGI",
    "TOJO UNA-UNA",
    "TOLITOLI",
  ],
  "SULAWESI TENGGARA": [
    "KENDARI",
    "BAUBAU",
    "BOMBANA",
    "BUTON",
    "BUTON SELATAN",
    "KOLAKA",
    "KONAWE",
    "KONAWE SELATAN",
    "MUNA",
    "WAKATOBI",
  ],
  "SULAWESI UTARA": [
    "MANADO",
    "BITUNG",
    "KOTAMOBAGU",
    "TOMOHON",
    "BOLAANG MONGONDOW",
    "MINAHASA",
    "MINAHASA SELATAN",
    "MINAHASA TENGGARA",
    "MINAHASA UTARA",
    "SANGIHE",
    "TALAUD",
  ],
  "SUMATRA BARAT": [
    "PADANG",
    "BUKITTINGGI",
    "PAYAKUMBUH",
    "PADANG PANJANG",
    "PARIAMAN",
    "SAWAHLUNTO",
    "SOLOK",
    "AGAM",
    "DHARMASRAYA",
    "LIMA PULUH KOTA",
    "PASAMAN",
    "PESISIR SELATAN",
    "SIJUNJUNG",
    "TANAH DATAR",
  ],
  "SUMATRA SELATAN": [
    "PALEMBANG",
    "LUBUKLINGGAU",
    "PAGAR ALAM",
    "PRABUMULIH",
    "BANYUASIN",
    "LAHAT",
    "MUARA ENIM",
    "MUSI BANYUASIN",
    "MUSI RAWAS",
    "OGAN ILIR",
    "OGAN KOMERING ILIR",
    "OGAN KOMERING ULU",
  ],
  "SUMATRA UTARA": [
    "MEDAN",
    "BINJAI",
    "GUNUNGSITOLI",
    "PADANGSIDIMPUAN",
    "PEMATANGSIANTAR",
    "SIBOLGA",
    "TANJUNGBALAI",
    "TEBING TINGGI",
    "ASAHAN",
    "BATU BARA",
    "DELI SERDANG",
    "KARO",
    "LABUHANBATU",
    "LANGKAT",
    "MANDAILING NATAL",
    "NIAS",
    "SIMALUNGUN",
    "TAPANULI UTARA",
  ],
};

const parseLocationParts = (value: string) => {
  const [cityPart, ...provinceParts] = value.split(",");
  return {
    city: (cityPart || "").trim().toUpperCase(),
    province: provinceParts.join(",").trim().toUpperCase(),
  };
};

const GUIDE_SECTIONS = [
  {
    title: "Ringkasan NextVWT",
    body: "NextVWT adalah aplikasi push-to-talk berbasis channel. Pengguna bebas berkunjung ke channel mana pun, kecuali channel tersebut diberi password oleh pengelola channel. Semua tulisan IndoVWT pada materi lama diselaraskan menjadi NexVWT / NEXVWT.",
  },
  {
    title: "Masuk dan Identitas",
    body: "Isi Callsign / Nama sebelum Power ON. Nama ini dipakai sebagai identitas saat tampil di channel, daftar pengguna, panel info, dan saat sedang bermodulasi.",
  },
  {
    title: "Info dan Daftar Kata/Kalimat",
    body: "Di tombol Set, bagian Info menyediakan kolom nama dan tombol daftar kata/kalimat. Pilih kalimat cepat untuk status, salam, izin monitor, izin bergabung, sedang bekerja, sedang mengemudi, sedang makan, sinyal gangguan, dan pesan etika modulasi.",
  },
  {
    title: "Lokasi",
    body: "Bagian Lokasi menyediakan pilihan provinsi dan input kota. Gunakan ikon pencarian untuk memilih provinsi seperti ACEH, BALI, JAWA BARAT, JAWA TENGAH, JAWA TIMUR, PAPUA, SULAWESI, SUMATRA, dan daftar provinsi lain yang tersedia.",
  },
  {
    title: "Channel",
    body: "Gunakan tombol Scan untuk memilih channel dan tombol naik/turun untuk mengganti nomor channel. Channel public langsung bisa dimasuki. Channel privat hanya meminta password bila pengelola channel mengunci channel tersebut.",
  },
  {
    title: "Siapa yang Sedang Bermodulasi",
    body: "Panel pada layar utama menampilkan nama user yang sedang menekan PTT / TX / bermodulasi di channel aktif. Jika tidak ada yang TX, sistem menampilkan bahwa belum ada user yang sedang bermodulasi.",
  },
  {
    title: "Daftar Pengguna",
    body: "Bagian Tampilan Daftar Pengguna mengatur tampilan foto, klik cepat, tampilan modulator, dan tampilan tombol PTT. Opsi tertentu membutuhkan koneksi ulang agar tampilan semua pengguna tersinkron.",
  },
  {
    title: "PTT",
    body: "Tekan dan tahan PTT untuk berbicara. Toggle PTT dapat diaktifkan bila ingin sekali tekan untuk ON/OFF. Atur ukuran PTT, batas bawah, volume pemutar suara saat PTT, getar mulai, nada mulai/akhir, background mode, dan full-duplex melalui Set.",
  },
  {
    title: "Mode Audio",
    body: "Mode Diskusi dipakai untuk komunikasi biasa. Mode Musik & Karaoke dipakai untuk sing-song/karaoke dengan workflow external soundcard atau mini mixer.",
  },
  {
    title: "Musik, Karaoke & Soundcard",
    body: "YouTube hanya ditampilkan sebagai embedded/floating player. NextVWT tidak mengunduh, tidak mengekstrak, dan tidak menyimpan musik/video lokal. Jika musik ingin ikut masuk channel, gabungkan audio YouTube + mic melalui mixer/soundcard lalu pilih perangkat input tersebut di Set.",
  },
  {
    title: "Mode Sesi Karaoke",
    body: "Normal PTT untuk komunikasi biasa, Sing Song PTT untuk bernyanyi bergantian dengan tombol PTT, Karaoke Open Mic untuk TX terbuka saat mode musik aktif, dan Moderator / Host untuk sesi yang dikendalikan host.",
  },
  {
    title: "Pengelola Channel dan Password",
    body: "Aturan akses channel: semua user bebas masuk channel apa pun secara default. Password hanya berlaku pada channel yang memang disetel oleh pengelola channel. Jangan gunakan password global untuk mengunci semua channel kecuali sengaja diaktifkan oleh admin server.",
  },
  {
    title: "Tema",
    body: "Bagian Tema menyediakan pilihan tampilan seperti Monokrom/Klasik. Tombol Ganti mengubah tema lokal pengguna.",
  },
  {
    title: "Tentang dan Legal",
    body: "Menu Tentang berisi Versi, Persyaratan & Ketentuan, Kebijakan Privasi, Panduan Pengguna, Legal, Rating, dan Hapus Akun. Semua menu tersebut sekarang berada di tombol Set/Pengaturan.",
  },
  {
    title: "Troubleshooting",
    body: "Jika muncul RECONNECTING, pastikan server berjalan di port 3000 dan koneksi jaringan aktif. Jika blank atau runtime error, jalankan mode production safe dan bersihkan cache. Jika dari HP tidak bisa membuka server, gunakan IP laptop dan izinkan firewall Node.js.",
  },
];

export function SettingsModal({
  onClose,
  onOpenKaraoke,
}: {
  onClose: () => void;
  onOpenKaraoke?: () => void;
}) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  // Local draft state for robust form handling before save
  const [username, setUsername] = useState(settings.username);
  const [location, setLocation] = useState(settings.location);
  const [isLocating, setIsLocating] = useState(false);
  const [showMyPhoto, setShowMyPhoto] = useState(settings.showMyPhoto);
  const [avatarDataUrl, setAvatarDataUrl] = useState(settings.avatarDataUrl);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [showOtherPhotos, setShowOtherPhotos] = useState(
    settings.showOtherPhotos,
  );
  const [listShowPhotos, setListShowPhotos] = useState(settings.listShowPhotos);
  const [fastClick, setFastClick] = useState(settings.fastClick);
  const [showModulator, setShowModulator] = useState(settings.showModulator);
  const [showPtt, setShowPtt] = useState(settings.showPtt);
  const [maxQueueSize, setMaxQueueSize] = useState(settings.maxQueueSize);
  const [audioMode, setAudioMode] = useState<"discussion" | "music">(
    settings.audioMode,
  );
  const [preferredInputDeviceId, setPreferredInputDeviceId] = useState(
    settings.preferredInputDeviceId,
  );
  const [preferredInputDeviceLabel, setPreferredInputDeviceLabel] = useState(
    settings.preferredInputDeviceLabel,
  );
  const [karaokeModuleEnabled, setKaraokeModuleEnabled] = useState(
    settings.karaokeModuleEnabled,
  );
  const [karaokeOpenMic, setKaraokeOpenMic] = useState(settings.karaokeOpenMic);
  const [karaokeSessionMode, setKaraokeSessionMode] = useState(
    settings.karaokeSessionMode,
  );
  const [pttSize, setPttSize] = useState(settings.pttSize);
  const [pttThreshold, setPttThreshold] = useState(settings.pttThreshold);
  const [pttToggle, setPttToggle] = useState(settings.pttToggle);
  const [pttVolume, setPttVolume] = useState(settings.pttVolume);
  const [vibrateStart, setVibrateStart] = useState(settings.vibrateStart);
  const [tonesStartEnd, setTonesStartEnd] = useState(settings.tonesStartEnd);
  const [runInBackground, setRunInBackground] = useState(
    settings.runInBackground,
  );
  const [fullDuplexMode, setFullDuplexMode] = useState(settings.fullDuplexMode);
  const [theme, setTheme] = useState(settings.theme);
  const [eqBass, setEqBass] = useState(settings.equalizer?.bass ?? 0);
  const [eqMid, setEqMid] = useState(settings.equalizer?.mid ?? 0);
  const [eqTreble, setEqTreble] = useState(settings.equalizer?.treble ?? 0);
  const [activeSheet, setActiveSheet] = useState<SheetKind>(null);
  const initialLocationParts = parseLocationParts(settings.location);
  const [draftProvince, setDraftProvince] = useState(
    initialLocationParts.province || "JAWA BARAT",
  );
  const [draftCity, setDraftCity] = useState(
    initialLocationParts.city || "BANDUNG",
  );
  const [locationPickerMode, setLocationPickerMode] = useState<
    "form" | "provinceList" | "cityList"
  >("form");

  const handleAutoDetectLocation = async () => {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
      );
      const data = await response.json();

      if (data && data.address) {
        let city =
          data.address.city ||
          data.address.regency ||
          data.address.town ||
          data.address.village ||
          "";
        let state = data.address.state || data.address.province || "";

        city = city.toUpperCase().replace(/KOTA /g, "").replace(/KABUPATEN /g, "KAB. ");
        state = state.toUpperCase();

        if (city && state) {
          if (locationPickerMode === "form") {
            setLocation(`${city}, ${state}`);
          }
        } else {
          alert("Gagal memformat data lokasi.");
        }
      }
    } catch (error) {
      console.error("[Location] Error autodetect:", error);
      alert(
        "Gagal mendeteksi lokasi. Pastikan GPS aktif dan izin Lokasi telah diberikan untuk aplikasi ini di Pengaturan Android.",
      );
    }
  };

  const convertAvatarToWebpDataUrl = async (file: File): Promise<string> => {
    const maxOutputSize = 384;
    const quality = 0.78;

    const bitmap = await createImageBitmap(file);
    try {
      const sourceSize = Math.min(bitmap.width, bitmap.height);
      const sourceX = Math.floor((bitmap.width - sourceSize) / 2);
      const sourceY = Math.floor((bitmap.height - sourceSize) / 2);
      const outputSize = Math.min(maxOutputSize, sourceSize);

      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas tidak tersedia di perangkat ini.");
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        bitmap,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        outputSize,
        outputSize,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error("Konversi WebP gagal."));
          },
          "image/webp",
          quality,
        );
      });

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("Gagal membaca hasil WebP."));
        };
        reader.onerror = () => reject(new Error("Gagal membaca hasil WebP."));
        reader.readAsDataURL(blob);
      });
    } finally {
      bitmap.close();
    }
  };

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      window.alert("File yang dipilih harus berupa gambar.");
      input.value = "";
      return;
    }

    const maxInputSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxInputSizeBytes) {
      window.alert("Ukuran foto maksimal 10 MB sebelum dikompres ke WebP.");
      input.value = "";
      return;
    }

    try {
      const webpDataUrl = await convertAvatarToWebpDataUrl(file);
      setAvatarDataUrl(webpDataUrl);
      setShowMyPhoto(true);

      // Auto-save langsung setelah upload: foto hasil WebP langsung tersimpan
      // dan disiarkan ulang ke channel aktif agar tampil di kotak avatar user list.
      updateSettings({
        username,
        location,
        showMyPhoto: true,
        avatarDataUrl: webpDataUrl,
      });
    } catch (error) {
      console.error("[Avatar] Gagal konversi WebP:", error);
      window.alert("Gagal mengonversi foto ke WebP. Coba pilih foto lain.");
    } finally {
      input.value = "";
    }
  };

  const handleSave = () => {
    playClickSfx();
    updateSettings({
      username,
      location,
      showMyPhoto,
      avatarDataUrl,
      showOtherPhotos,
      listShowPhotos,
      fastClick,
      showModulator,
      showPtt,
      maxQueueSize,
      audioMode,
      preferredInputDeviceId,
      preferredInputDeviceLabel,
      karaokeModuleEnabled,
      karaokeOpenMic:
        karaokeSessionMode === "karaoke_open_mic" ? true : karaokeOpenMic,
      karaokeSessionMode,
      pttSize,
      pttThreshold,
      pttToggle,
      pttVolume,
      vibrateStart,
      tonesStartEnd,
      runInBackground,
      fullDuplexMode,
      theme,
      equalizer: { bass: eqBass, mid: eqMid, treble: eqTreble },
    });

    // Terapkan langsung ke WebRTCManager saat disave
    const webRtcManager = useAppStore.getState().webRtcManager;
    if (webRtcManager) {
      webRtcManager.setEqualizer(eqBass, eqMid, eqTreble);
    }

    onClose();
  };

  const renderSettingsSheet = () => {
    if (!activeSheet) return null;

    const titleMap: Record<Exclude<SheetKind, null>, string> = {
      phrases: "Daftar kata/kalimat",
      location: "Provinsi",
      guide: "Panduan Pengguna",
      terms: "Persyaratan & Ketentuan",
      privacy: "Kebijakan Privasi",
      legal: "Legal",
      rating: "Jika Suka Berikan Rating",
      deleteAccount: "Hapus Akun Saya",
      modulationRules: "Aturan Modulasi",
      channelPolicy: "Kebijakan Channel",
      troubleshooting: "Bantuan Masalah",
      aboutNexvwt: "Tentang NexVWT",
    };

    return (
      <div
        className="absolute inset-0 z-[70] bg-black/45 flex items-center justify-center p-5"
        onClick={() => setActiveSheet(null)}
      >
        <div
          className="w-full max-w-[360px] max-h-[82vh] overflow-hidden rounded-xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 bg-gray-50/50">
            {activeSheet === "phrases" ? (
              <FileText className="h-6 w-6 text-gray-500" />
            ) : activeSheet === "location" ? (
              <MapPin className="h-6 w-6 text-cyan-600" />
            ) : (
              <BookOpen className="h-6 w-6 text-cyan-600" />
            )}
            <h2 className="flex-1 text-[17px] font-bold text-gray-800 tracking-tight">
              {titleMap[activeSheet]}
            </h2>
            <button
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-bold text-gray-600 active:bg-gray-100 shadow-sm active:translate-y-[1px]"
              onClick={() => {
                playClickSfx();
                setActiveSheet(null);
              }}
            >
              Tutup
            </button>
          </div>

          {activeSheet === "phrases" && (
            <div className="max-h-[72vh] overflow-y-auto">
              {QUICK_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  className="block w-full border-b border-gray-200 px-4 py-3 text-left text-[17px] font-medium leading-snug text-gray-900 active:bg-gray-100"
                  onClick={() => {
                    setUsername(phrase);
                    setActiveSheet(null);
                  }}
                >
                  {phrase}
                </button>
              ))}
            </div>
          )}

          {activeSheet === "location" && (
            <div className="max-h-[72vh] overflow-y-auto">
              {locationPickerMode === "form" && (
                <div className="px-8 py-7 border-b border-gray-200">
                  <div className="mb-6 text-lg font-semibold text-gray-600">
                    Provinsi
                  </div>
                  <button
                    type="button"
                    className="relative mb-7 block w-full border-b border-gray-400 bg-white px-3 py-2 text-left text-[20px] text-gray-900 active:bg-gray-50"
                    onClick={() => setLocationPickerMode("provinceList")}
                  >
                    {draftProvince || "Pilih provinsi"}
                    <span className="absolute bottom-0 right-0 h-0 w-0 border-b-[18px] border-l-[18px] border-b-gray-400 border-l-transparent" />
                  </button>

                  <div
                    className={cn(
                      "mb-3 text-lg font-semibold",
                      draftProvince ? "text-gray-600" : "text-gray-400",
                    )}
                  >
                    Kota
                  </div>
                  <button
                    type="button"
                    disabled={!draftProvince}
                    className={cn(
                      "relative block w-full border-b px-3 py-2 text-left text-[20px] active:bg-gray-50",
                      draftProvince
                        ? "border-gray-400 bg-white text-gray-900"
                        : "border-gray-300 bg-white text-gray-400 cursor-not-allowed",
                    )}
                    onClick={() =>
                      draftProvince && setLocationPickerMode("cityList")
                    }
                  >
                    {draftCity || "Pilih kota"}
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 h-0 w-0 border-b-[18px] border-l-[18px] border-l-transparent",
                        draftProvince
                          ? "border-b-gray-400"
                          : "border-b-gray-300",
                      )}
                    />
                  </button>

                  <button
                    className="mt-8 w-full py-3 text-2xl font-medium text-green-700 active:bg-green-50"
                    onClick={() => {
                      const finalProvince = draftProvince || "JAWA BARAT";
                      const finalCity =
                        draftCity ||
                        (CITY_BY_PROVINCE[finalProvince]?.[0] ?? "BANDUNG");
                      setLocation(`${finalCity}, ${finalProvince}`);
                      setActiveSheet(null);
                      setLocationPickerMode("form");
                    }}
                  >
                    Simpan
                  </button>
                </div>
              )}

              {locationPickerMode === "provinceList" && (
                <div>
                  <div className="px-4 py-3 text-base font-medium text-gray-800 border-b border-gray-200">
                    Pilih provinsi
                  </div>
                  {PROVINCES.map((province) => (
                    <button
                      key={province}
                      type="button"
                      className="block w-full border-b border-gray-200 px-4 py-3 text-left text-[15px] font-medium text-gray-800 active:bg-gray-100"
                      onClick={() => {
                        setDraftProvince(province);
                        const cities = CITY_BY_PROVINCE[province] ?? [];
                        setDraftCity(cities[0] ?? "");
                        setLocationPickerMode("form");
                      }}
                    >
                      {province}
                    </button>
                  ))}
                </div>
              )}

              {locationPickerMode === "cityList" && (
                <div>
                  <div className="px-4 py-3 text-base font-medium text-gray-800 border-b border-gray-200">
                    Pilih kota / kabupaten - {draftProvince}
                  </div>
                  {(CITY_BY_PROVINCE[draftProvince] ?? []).map((city) => (
                    <button
                      key={city}
                      type="button"
                      className="block w-full border-b border-gray-200 px-4 py-3 text-left text-[15px] font-medium text-gray-800 active:bg-gray-100"
                      onClick={() => {
                        setDraftCity(city);
                        setLocationPickerMode("form");
                      }}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSheet === "guide" && (
            <div className="max-h-[72vh] overflow-y-auto p-4 space-y-3 text-sm leading-relaxed text-gray-800">
              <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3">
                <b>Sinkron dengan Set/Pengaturan.</b> Poin operasional dari
                screenshot panduan pengguna diterapkan di halaman Set: Info,
                Lokasi, Akun, Daftar Pengguna, Mode Audio, Musik/Karaoke, PTT,
                Tema, Tentang, dan Legal.
              </div>
              {GUIDE_SECTIONS.map((section, index) => (
                <div
                  key={section.title}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <div className="mb-1 flex items-center gap-2 font-bold text-gray-900">
                    <ListChecks className="h-4 w-4 text-emerald-700" />
                    {index + 1}. {section.title}
                  </div>
                  <p>{section.body}</p>
                </div>
              ))}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <b>Alur cepat:</b> Power ON → pilih channel → dengarkan → tekan
                PTT saat channel kosong → Set untuk pengaturan profil, lokasi,
                audio, karaoke, tema, panduan, dan legal.
              </div>
            </div>
          )}

          {[
            "terms",
            "privacy",
            "legal",
            "rating",
            "deleteAccount",
            "modulationRules",
            "channelPolicy",
            "troubleshooting",
            "aboutNexvwt",
          ].includes(activeSheet) && (
            <div className="max-h-[72vh] overflow-y-auto p-4 text-sm leading-relaxed text-gray-800 space-y-3">
              {activeSheet === "aboutNexvwt" && (
                <div className="space-y-2">
                  <p>
                    <b>NexVWT</b> adalah aplikasi Virtual Walkie Talkie untuk
                    komunikasi PTT berbasis channel, daftar pengguna real-time,
                    WebRTC audio, dan mode musik/karaoke melalui input perangkat
                    pengguna.
                  </p>
                  <p>Nama brand diseragamkan menjadi NexVWT / NEXVWT.</p>
                </div>
              )}
              {activeSheet === "modulationRules" && (
                <div className="space-y-2">
                  <p>
                    <b>Aturan modulasi:</b>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Dengarkan dulu sebelum menekan PTT.</li>
                    <li>
                      Jangan menabrak modulasi user lain kecuali channel
                      full-duplex mengizinkan.
                    </li>
                    <li>Gunakan bahasa sopan dan jelas.</li>
                    <li>Gunakan daftar kata/kalimat untuk status singkat.</li>
                    <li>
                      Jika karaoke/open mic aktif, pastikan tidak mengganggu
                      percakapan utama channel.
                    </li>
                  </ul>
                </div>
              )}
              {activeSheet === "channelPolicy" && (
                <div className="space-y-2">
                  <p>
                    <b>Kebijakan channel:</b>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Semua user bebas masuk channel mana pun secara default.
                    </li>
                    <li>
                      Channel hanya meminta password jika pengelola channel
                      menguncinya.
                    </li>
                    <li>
                      Password berlaku per channel, bukan mengunci semua
                      channel.
                    </li>
                    <li>
                      Pengelola channel bertanggung jawab terhadap etika, tema,
                      dan sesi pada channel tersebut.
                    </li>
                  </ul>
                </div>
              )}
              {activeSheet === "troubleshooting" && (
                <div className="space-y-2">
                  <p>
                    <b>Bantuan masalah umum:</b>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      ERR_CONNECTION_REFUSED: server belum jalan, jalankan
                      RUN_PROD_SAFE_PNPM.ps1.
                    </li>
                    <li>
                      RECONNECTING: cek server port 3000, WiFi, firewall, dan
                      refresh production safe.
                    </li>
                    <li>
                      Runtime React/Zustand: gunakan paket production static
                      safe, bukan Vite dev cache lama.
                    </li>
                    <li>
                      HP tidak bisa akses: buka alamat IP laptop, contoh
                      http://192.168.x.x:3000, lalu izinkan firewall Node.js.
                    </li>
                    <li>
                      Audio tidak masuk: pilih input mic/soundcard di Set dan
                      tekan Test Input.
                    </li>
                  </ul>
                </div>
              )}
              {activeSheet === "terms" && (
                <p>
                  Dengan menggunakan NexVWT, pengguna wajib menjaga etika
                  modulasi, mengikuti aturan channel, tidak mengganggu pengguna
                  lain, dan bertanggung jawab atas perangkat audio yang
                  digunakan.
                </p>
              )}
              {activeSheet === "privacy" && (
                <p>
                  NexVWT hanya memakai data yang diperlukan untuk panggilan,
                  lokasi tampilan, preferensi pengaturan, dan koneksi real-time.
                  Musik/video YouTube tidak diunduh, tidak diekstrak, dan tidak
                  disimpan lokal.
                </p>
              )}
              {activeSheet === "legal" && (
                <p>
                  NexVWT adalah aplikasi PTT berbasis web. Pemakaian YouTube
                  mengikuti embedded/floating player resmi browser. Audio
                  karaoke yang masuk ke channel berasal dari input
                  soundcard/mixer pengguna.
                </p>
              )}
              {activeSheet === "rating" && (
                <p>
                  Terima kasih sudah memakai NexVWT. Jika aplikasi bermanfaat,
                  silakan berikan rating setelah versi produksi dirilis.
                </p>
              )}
              {activeSheet === "deleteAccount" && (
                <p>
                  Fitur hapus akun perlu konfirmasi server produksi. Pada versi
                  ini tombol disiapkan di Set/Pengaturan dan tidak akan
                  menghapus data tanpa konfirmasi lanjutan.
                </p>
              )}
              <button
                className="w-full rounded bg-gray-200 px-4 py-3 font-bold text-gray-800"
                onClick={() => setActiveSheet(null)}
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-gray-50 flex flex-col font-sans"
    >
      {/* Header */}
      <div className="bg-gray-100 border-b border-gray-300 flex items-center px-2 py-3 shadow-sm select-none">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-blue-600 active:bg-gray-200 rounded-full cursor-pointer"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <div className="flex items-center gap-2">
          {/* Mock Logo */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-red-500 to-blue-500 flex items-center justify-center relative shadow-sm border border-gray-300/50">
            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            </div>
          </div>
          <h1 className="text-xl font-medium text-gray-900">Pengaturan</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Info */}
        <SectionHeader title="Info" />
        <div className="px-4 py-3 border-b border-gray-200 flex gap-2 items-center bg-white">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username / CallSign"
            className="flex-1 border-b border-gray-400 py-1 px-2 focus:outline-none focus:border-blue-500 bg-transparent text-gray-900 text-[15px]"
          />
          <button
            type="button"
            onClick={() => setActiveSheet("phrases")}
            className="p-2 bg-gray-100 border border-gray-300 rounded shadow-sm text-gray-500"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>

        {/* Lokasi */}
        <SectionHeader title="Lokasi" />
        <div className="px-4 py-3 border-b border-gray-200 flex gap-3 items-center bg-white">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value.toUpperCase())}
            placeholder="BANDUNG, JAWA BARAT"
            className="flex-1 border-b border-gray-400 py-1 px-2 text-[15px] focus:outline-none focus:border-blue-500 bg-transparent uppercase text-gray-900"
          />
          <button
            type="button"
            onClick={handleAutoDetectLocation}
            disabled={isLocating}
            className="p-1 -mb-1 text-amber-500 drop-shadow-sm disabled:opacity-50 transition-opacity"
            title="Deteksi Lokasi Otomatis (GPS)"
          >
            {isLocating ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Navigation className="w-6 h-6" strokeWidth={2.5} />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              const parts = parseLocationParts(location);
              const nextProvince = PROVINCES.includes(parts.province)
                ? parts.province
                : "JAWA BARAT";
              setDraftProvince(nextProvince);
              setDraftCity(
                parts.city || CITY_BY_PROVINCE[nextProvince]?.[0] || "",
              );
              setLocationPickerMode("form");
              setActiveSheet("location");
            }}
            className="p-1 -mb-1 text-cyan-600 drop-shadow-sm"
            title="Cari Lokasi Manual"
          >
            <Search className="w-7 h-7" strokeWidth={2.5} />
          </button>
        </div>

        {/* Akun */}
        <SectionHeader title="Akun" />
        <div className="bg-white px-4 py-6 border-b border-gray-200 flex flex-col items-center gap-4">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="group w-32 h-32 bg-gray-200 rounded shrink-0 overflow-hidden shadow-sm relative border border-gray-300 active:scale-[0.98] transition-transform"
            aria-label="Pilih foto avatar dari galeri perangkat"
            title="Klik untuk pilih foto dari galeri perangkat"
          >
            {avatarDataUrl ? (
              <img
                src={avatarDataUrl}
                alt="Foto avatar saya"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-white">
                <User className="w-16 h-16 opacity-50" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[11px] font-bold text-white opacity-90">
              Pilih Foto WebP
            </div>
          </button>
          <div className="-mt-2 text-center text-[12px] leading-relaxed text-gray-500">
            Klik avatar untuk membuka galeri/foto perangkat. Foto otomatis
            tersimpan, dipotong persegi, dikompres, dan dikonversi menjadi WebP.
          </div>
          {avatarDataUrl && (
            <button
              type="button"
              onClick={() => {
                setAvatarDataUrl("");
                updateSettings({ avatarDataUrl: "", showMyPhoto: false });
              }}
              className="-mt-2 rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 active:bg-red-100"
            >
              Hapus Foto
            </button>
          )}
          <div className="text-center w-full select-none">
            <span className="text-gray-600">eMail (</span>
            <span className="font-bold text-gray-900">
              Prototype tanpa login Gmail
            </span>
            <span className="text-gray-600">)</span>
          </div>
          <div className="w-full flex justify-center mt-2 px-4">
            <div className="w-full max-w-sm space-y-3">
              <SettingsButton label="Ubah Kata Sandi" />
              <SettingsButton
                label="Keluar"
                variant="danger"
                onClick={() => {
                  // Prototype mode: tidak memakai Gmail/Google Auth.
                  // Tombol keluar hanya mematikan sesi lokal aplikasi.
                  useAppStore.getState().destroySocket();
                  window.location.reload();
                }}
              />
            </div>
          </div>
        </div>

        {/* Akun preferences */}
        <div className="bg-white">
          <CheckboxRow
            label="Tampilkan Foto Saya Kepada Pengguna Lain (Koneksi Kembali Diharuskan)"
            checked={showMyPhoto}
            onChange={setShowMyPhoto}
          />
          <CheckboxRow
            label="Tampilkan Foto Pengguna Lain (Koneksi Kembali Diharuskan)"
            checked={showOtherPhotos}
            onChange={setShowOtherPhotos}
          />
        </div>

        {/* Tampilan Daftar Pengguna */}
        <SectionHeader title="Tampilan Daftar Pengguna" />
        <div className="bg-white">
          <CheckboxRow
            label="Tampilkan Foto (Koneksi Kembali Diharuskan)"
            checked={listShowPhotos}
            onChange={setListShowPhotos}
          />
          <CheckboxRow
            label="Klik Cepat (Koneksi Kembali Disarankan)"
            checked={fastClick}
            onChange={setFastClick}
          />
          <CheckboxRow
            label="Tampilkan Modulator"
            checked={showModulator}
            onChange={setShowModulator}
          />
          <CheckboxRow
            label="Tampilkan PTT"
            checked={showPtt}
            onChange={setShowPtt}
          />
        </div>

        {/* Antrian */}
        <SectionHeader title="Antrian Maksimal Pemutar Suara (per 20ms)" />
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <input
            type="number"
            value={maxQueueSize}
            onChange={(e) => setMaxQueueSize(Number(e.target.value))}
            className="w-full border-b border-gray-400 py-1 px-2 text-[15px] focus:outline-none focus:border-blue-500 bg-transparent text-gray-900"
          />
        </div>

        {/* Mode Audio */}
        <SectionHeader title="Mode Audio" />
        <div
          className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 space-y-2"
          data-testid="set-karaoke-settings-panel"
        >
          <div className="flex items-start gap-3 text-[12px] leading-relaxed text-emerald-900">
            <Music2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <b>Mode Musik & Karaoke sekarang di tombol Set.</b> Gunakan
              halaman ini untuk memilih Mode Diskusi, Mode Musik & Karaoke, sesi
              karaoke, dan input soundcard/mixer.
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenKaraoke}
            disabled={!karaokeModuleEnabled}
            data-testid="settings-open-karaoke-button"
            className={cn(
              "w-full rounded-lg px-4 py-3 text-sm font-black shadow-sm active:scale-[0.99]",
              karaokeModuleEnabled
                ? "bg-slate-950 text-cyan-100 hover:bg-slate-800"
                : "bg-gray-200 text-gray-500 cursor-not-allowed",
            )}
          >
            Buka Player Musik / Karaoke Floating
          </button>
        </div>
        <div className="bg-white px-4 py-3 space-y-3 border-b border-gray-200 select-none">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="audioMode"
              checked={audioMode === "discussion"}
              onChange={() => setAudioMode("discussion")}
              className="w-5 h-5 accent-emerald-600 cursor-pointer"
            />
            <span
              className={cn(
                "text-[15px]",
                audioMode === "discussion"
                  ? "text-emerald-700 font-bold"
                  : "text-gray-900",
              )}
            >
              Mode Diskusi
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="audioMode"
              checked={audioMode === "music"}
              onChange={() => setAudioMode("music")}
              className="w-5 h-5 accent-emerald-600 cursor-pointer"
            />
            <span
              className={cn(
                "text-[15px]",
                audioMode === "music"
                  ? "text-emerald-700 font-bold"
                  : "text-gray-900",
              )}
            >
              Mode Musik & Karaoke
            </span>
          </label>
        </div>

        {/* Karaoke & Soundcard */}
        <SectionHeader title="Musik, Karaoke & Soundcard" />
        <div className="bg-white">
          <CheckboxRow
            label="Aktifkan Modul Musik / Karaoke Floating"
            checked={karaokeModuleEnabled}
            onChange={setKaraokeModuleEnabled}
          />
          <CheckboxRow
            label="Open Mic saat Karaoke (gunakan hati-hati, indikator TX tetap aktif)"
            checked={karaokeOpenMic}
            onChange={(val) => {
              setKaraokeOpenMic(val);
              if (val) {
                setAudioMode("music");
                setKaraokeSessionMode("karaoke_open_mic");
              } else if (karaokeSessionMode === "karaoke_open_mic") {
                setKaraokeSessionMode("sing_song_ptt");
              }
            }}
          />
        </div>

        {/* Equalizer Panel */}
        <div className="bg-white px-4 py-4 space-y-4 border-b border-gray-200">
          <div className="text-sm font-bold text-gray-900 mb-2">
            Equalizer (Soundcard/Mic)
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-12 text-xs font-semibold text-gray-600">
                BASS
              </span>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={eqBass}
                onChange={(e) => {
                  playTickSfx();
                  setEqBass(Number(e.target.value));
                  const mgr = useAppStore.getState().webRtcManager;
                  if (mgr)
                    mgr.setEqualizer(Number(e.target.value), eqMid, eqTreble);
                }}
                className="flex-1 accent-emerald-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer shadow-inner"
              />
              <span className="w-8 text-right text-xs font-mono text-gray-500">
                {eqBass > 0 ? `+${eqBass}` : eqBass}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-12 text-xs font-semibold text-gray-600">
                MID
              </span>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={eqMid}
                onChange={(e) => {
                  playTickSfx();
                  setEqMid(Number(e.target.value));
                  const mgr = useAppStore.getState().webRtcManager;
                  if (mgr)
                    mgr.setEqualizer(eqBass, Number(e.target.value), eqTreble);
                }}
                className="flex-1 accent-emerald-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer shadow-inner"
              />
              <span className="w-8 text-right text-xs font-mono text-gray-500">
                {eqMid > 0 ? `+${eqMid}` : eqMid}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-12 text-xs font-semibold text-gray-600">
                TREBLE
              </span>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={eqTreble}
                onChange={(e) => {
                  playTickSfx();
                  setEqTreble(Number(e.target.value));
                  const mgr = useAppStore.getState().webRtcManager;
                  if (mgr)
                    mgr.setEqualizer(eqBass, eqMid, Number(e.target.value));
                }}
                className="flex-1 accent-emerald-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer shadow-inner"
              />
              <span className="w-8 text-right text-xs font-mono text-gray-500">
                {eqTreble > 0 ? `+${eqTreble}` : eqTreble}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 leading-relaxed text-center mt-2">
              Biquad Filter aktif realtime pada Local MediaStream WebRTC.
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-200 bg-white space-y-2">
          <div className="text-sm font-bold text-gray-900">
            Mode Sesi Karaoke
          </div>
          {[
            {
              id: "normal",
              label: "Normal PTT",
              desc: "PTT standar untuk ngobrol biasa.",
            },
            {
              id: "sing_song_ptt",
              label: "Sing Song PTT",
              desc: "Tetap tekan PTT saat bernyanyi, cocok untuk bergantian.",
            },
            {
              id: "karaoke_open_mic",
              label: "Karaoke Open Mic",
              desc: "TX terbuka saat mode musik aktif. Gunakan dengan aturan channel.",
            },
            {
              id: "moderator",
              label: "Moderator / Host",
              desc: "Mode host untuk sesi terkontrol. Override host bisa ditambahkan pada versi berikutnya.",
            },
          ].map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm active:bg-gray-100"
            >
              <input
                type="radio"
                name="karaokeSessionMode"
                value={item.id}
                checked={karaokeSessionMode === item.id}
                onChange={() => {
                  const nextMode = item.id as
                    | "normal"
                    | "sing_song_ptt"
                    | "karaoke_open_mic"
                    | "moderator";
                  setKaraokeSessionMode(nextMode);
                  if (nextMode === "karaoke_open_mic") {
                    setAudioMode("music");
                    setKaraokeOpenMic(true);
                  }
                  if (nextMode === "normal" || nextMode === "sing_song_ptt") {
                    setKaraokeOpenMic(false);
                  }
                }}
                className="mt-0.5 h-4 w-4 accent-emerald-600"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-gray-900">
                  {item.label}
                </span>
                <span className="block text-[11px] leading-relaxed text-gray-500">
                  {item.desc}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="bg-white px-4 py-3 border-b border-gray-200">
          <div className="flex items-start gap-3 rounded-lg bg-cyan-50 border border-cyan-100 p-3 text-[12px] leading-relaxed text-gray-700">
            <Music2 className="w-5 h-5 text-cyan-700 shrink-0 mt-0.5" />
            <div>
              <b>Catatan:</b> YouTube hanya tampil sebagai embedded/floating
              player. Tidak ada ekstraksi audio, tidak ada download lagu, dan
              tidak ada penyimpanan musik ke local storage. Jika musik ingin
              ikut terdengar di channel, gabungkan YouTube + mic lewat mini
              mixer/soundcard lalu pilih input perangkatnya di bawah.
            </div>
          </div>
        </div>
        <AudioInputDevicePanel
          selectedDeviceId={preferredInputDeviceId}
          onSelect={(deviceId, label) => {
            setPreferredInputDeviceId(deviceId);
            setPreferredInputDeviceLabel(label);
          }}
        />
        <div className="bg-white px-4 py-3 border-b border-gray-200 text-[12px] leading-relaxed text-gray-600">
          Perangkat terpilih:{" "}
          <span className="font-semibold text-gray-900">
            {preferredInputDeviceLabel || "Default microphone browser"}
          </span>
        </div>

        {/* PTT */}
        <SectionHeader title="PTT" />
        <div className="bg-white p-4 space-y-4 border-b border-gray-200 select-none">
          <div className="flex items-center gap-4">
            <span className="text-gray-900 w-24">Ukuran ({pttSize})</span>
            <input
              type="range"
              min={10}
              max={100}
              value={pttSize}
              onChange={(e) => {
                playTickSfx();
                setPttSize(Number(e.target.value));
              }}
              className="flex-1 accent-emerald-600 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer shadow-inner"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-900 w-24">
              Batas Bawah ({pttThreshold})
            </span>
            <input
              type="range"
              min={5}
              max={100}
              value={pttThreshold}
              onChange={(e) => {
                playTickSfx();
                setPttThreshold(Number(e.target.value));
              }}
              className="flex-1 accent-emerald-600 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer shadow-inner"
            />
          </div>
        </div>
        <div className="bg-white">
          <CheckboxRow
            label="Toggle PTT"
            checked={pttToggle}
            onChange={setPttToggle}
          />
        </div>
        <div className="bg-white p-4 border-b border-gray-200 flex flex-col items-center select-none">
          <span className="text-gray-900 mb-4 block">
            Volume Pemutar Suara Saat Menekan PTT ({pttVolume}%)
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={pttVolume}
            onChange={(e) => {
              playTickSfx();
              setPttVolume(Number(e.target.value));
            }}
            className="w-[80%] accent-emerald-600 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer shadow-inner"
          />
        </div>
        <div className="bg-white pb-3">
          <CheckboxRow
            label="Getar Mulai"
            checked={vibrateStart}
            onChange={setVibrateStart}
          />
          <CheckboxRow
            label="Nada Mulai dan Akhir"
            checked={tonesStartEnd}
            onChange={setTonesStartEnd}
          />
          <CheckboxRow
            label="Dapat Aktif di Latar Belakang"
            checked={runInBackground}
            onChange={setRunInBackground}
          />
          <CheckboxRow
            label="Mode Untuk Channel Full-Duplex"
            checked={fullDuplexMode}
            onChange={setFullDuplexMode}
          />
          <div className="px-4 mt-4">
            <SettingsButton label="Tambah Tombol PTT POC" />
          </div>
        </div>

        {/* Tema */}
        <SectionHeader title="Tema" />
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between select-none">
          <span className="text-gray-900 font-medium">{theme}</span>
          <button
            onClick={() => {
              const themes = [
                "Klasik (Oranye)",
                "Taktis (Hijau)",
                "Siber (Biru)",
                "Monokrom (Putih)",
                "Motif Serat Karbon",
                "Motif Teraso Terang",
                "Motif Galaxy Cosmic"
              ];
              const currentIndex = themes.indexOf(theme);
              const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % themes.length;
              setTheme(themes[nextIndex]);
            }}
            className="px-4 py-2 bg-gray-300 font-semibold text-gray-800 shadow-sm border border-gray-400 rounded hover:bg-gray-400/50 active:scale-95 transition-all cursor-pointer"
          >
            Ganti
          </button>
        </div>

        {/* Koneksi Server (Universal - semua platform) */}
        <SectionHeader title="Koneksi Server" />
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex flex-col gap-2">
          <label className="text-gray-700 font-medium text-[13px]">
            URL Server (misal: http://192.168.x.x:3000)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="http://192.168.x.x:3000"
              defaultValue={
                (() => {
                  try {
                    return localStorage.getItem("nexvwt_server_url") || "";
                  } catch {
                    return "";
                  }
                })()
              }
              id="server-url-input"
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded text-[14px] text-gray-900 bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() => {
                playClickSfx();
                const input = document.getElementById(
                  "server-url-input",
                ) as HTMLInputElement | null;
                const url = input?.value?.trim() || "";
                if (url && !/^https?:\/\/.+/.test(url)) {
                  alert(
                    "Format URL tidak valid. Gunakan format: http://192.168.x.x:3000",
                  );
                  return;
                }
                try {
                  if (url) {
                    localStorage.setItem("nexvwt_server_url", url);
                  } else {
                    localStorage.removeItem("nexvwt_server_url");
                  }
                } catch {
                  // ignore
                }
                window.location.reload();
              }}
              className="px-4 py-2.5 text-white font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow rounded active:scale-[0.99] transition-all cursor-pointer text-[14px] whitespace-nowrap"
            >
              Set
            </button>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-[11px] leading-relaxed text-gray-500">
              Kosongkan dan tekan Set untuk kembali ke server default.
            </div>
            {(() => {
              try {
                const saved = localStorage.getItem("nexvwt_server_url");
                if (saved) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSfx();
                        try {
                          localStorage.removeItem("nexvwt_server_url");
                        } catch {
                          // ignore
                        }
                        window.location.reload();
                      }}
                      className="text-[11px] text-red-500 hover:text-red-700 font-semibold underline cursor-pointer whitespace-nowrap ml-2"
                    >
                      Reset
                    </button>
                  );
                }
              } catch {
                // ignore
              }
              return null;
            })()}
          </div>
          {(() => {
            try {
              const saved = localStorage.getItem("nexvwt_server_url");
              if (saved) {
                return (
                  <div className="mt-1 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-[12px] text-emerald-700 font-medium">
                    ✅ Terhubung ke: <span className="font-bold">{saved}</span>
                  </div>
                );
              }
            } catch {
              // ignore
            }
            return null;
          })()}
          <div className="text-[11px] leading-relaxed text-gray-500 text-center">
            Isi IP laptop Anda agar walkie-talkie terhubung via LAN.
          </div>
        </div>

        {/* Simpan */}
        <div className="p-4 bg-gray-100">
          <button
            onClick={handleSave}
            className="w-full py-4 text-gray-900 font-bold bg-[#c3d1c6] hover:bg-[#b0c0b4] active:bg-[#9eb0a2] shadow border border-gray-400 active:scale-[0.99] rounded transition-all cursor-pointer"
          >
            Simpan
          </button>
        </div>

        {/* Tentang */}
        <SectionHeader title="Tentang" />
        <div className="bg-white p-4">
          <div className="text-gray-900 font-medium mb-4 select-none">
            Versi: <span className="font-bold">2.3.4</span>
          </div>
          <div className="space-y-3">
            <SettingsButton
              label="Tentang NexVWT"
              onClick={() => setActiveSheet("aboutNexvwt")}
            />
            <SettingsButton
              label="Panduan Pengguna"
              onClick={() => setActiveSheet("guide")}
            />
            <SettingsButton
              label="Aturan Modulasi"
              onClick={() => setActiveSheet("modulationRules")}
            />
            <SettingsButton
              label="Kebijakan Channel"
              onClick={() => setActiveSheet("channelPolicy")}
            />
            <SettingsButton
              label="Bantuan Masalah"
              onClick={() => setActiveSheet("troubleshooting")}
            />
            <SettingsButton
              label="Persyaratan & Ketentuan"
              onClick={() => setActiveSheet("terms")}
            />
            <SettingsButton
              label="Kebijakan Privasi"
              onClick={() => setActiveSheet("privacy")}
            />
            <SettingsButton
              label="Legal"
              onClick={() => setActiveSheet("legal")}
            />
            <SettingsButton
              label="Jika Suka Berikan Rating"
              onClick={() => setActiveSheet("rating")}
            />
            <SettingsButton
              label="Hapus Akun Saya"
              variant="danger"
              onClick={() => setActiveSheet("deleteAccount")}
            />
          </div>
        </div>
      </div>
      {renderSettingsSheet()}
    </motion.div>
  );
}
