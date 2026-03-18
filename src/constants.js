export const C = {
  bg:"#f0f4f8", surface:"#fff", surface2:"#f8fafc",
  border:"#e2e8f0", borderFocus:"#93c5fd",
  accent:"#2563eb", accentSoft:"#eff6ff",
  sky:"#0ea5e9", skySoft:"#f0f9ff",
  teal:"#0d9488", tealSoft:"#f0fdfa",
  green:"#16a34a", greenSoft:"#f0fdf4",
  red:"#dc2626", redSoft:"#fef2f2",
  orange:"#ea580c", orangeSoft:"#fff7ed",
  purple:"#7c3aed", purpleSoft:"#faf5ff",
  yellow:"#d97706", yellowSoft:"#fffbeb",
  muted:"#94a3b8", mutedDark:"#64748b",
  text:"#0f172a", textSoft:"#475569",
  shadow:"0 1px 3px rgba(0,0,0,0.06)",
  shadowMd:"0 4px 16px rgba(0,0,0,0.08)",
}

export const CATS = [
  {id:"transport",   label:"Transport",   icon:"✈️", color:C.sky,   soft:C.skySoft},
  {id:"hebergement", label:"Hébergement", icon:"🏨", color:C.teal,  soft:C.tealSoft},
  {id:"restauration",label:"Restauration",icon:"🍽️", color:C.orange,soft:C.orangeSoft},
  {id:"activites",   label:"Activités",   icon:"🎭", color:C.purple,soft:C.purpleSoft},
  {id:"shopping",    label:"Shopping",    icon:"🛍️", color:C.red,   soft:C.redSoft},
  {id:"autre",       label:"Autre",       icon:"💡", color:C.muted, soft:"#f8fafc"},
]

export const CURRENCIES = [
  {code:"EUR",symbol:"€",name:"Euro"},
  {code:"USD",symbol:"$",name:"Dollar US"},
  {code:"GBP",symbol:"£",name:"Livre Sterling"},
  {code:"JPY",symbol:"¥",name:"Yen japonais"},
  {code:"CHF",symbol:"Fr",name:"Franc suisse"},
  {code:"CAD",symbol:"CA$",name:"Dollar canadien"},
  {code:"AUD",symbol:"A$",name:"Dollar australien"},
  {code:"MAD",symbol:"دم",name:"Dirham marocain"},
  {code:"TRY",symbol:"₺",name:"Livre turque"},
  {code:"THB",symbol:"฿",name:"Baht thaïlandais"},
]

export const PACK_ITEMS = [
  {id:"docs",   label:"Documents", icon:"📄",items:["Passeport / CNI","Billets d'avion","Réservations hôtel","Assurance voyage","Permis de conduire","Cartes bancaires","Espèces locales"]},
  {id:"clothes",label:"Vêtements", icon:"👕",items:["T-shirts","Pantalons / shorts","Sous-vêtements","Chaussettes","Veste / pull","Tenue de soirée","Maillot de bain","Chaussures confort","Sandales"]},
  {id:"hygiene",label:"Hygiène",   icon:"🧴",items:["Brosse à dents","Dentifrice","Déodorant","Shampoing","Crème solaire","Médicaments","Trousse de secours","Lunettes de soleil"]},
  {id:"tech",   label:"Tech",      icon:"🔌",items:["Chargeur téléphone","Adaptateur prise","Batterie externe","Écouteurs","Appareil photo","Câble USB"]},
  {id:"autres", label:"Autres",    icon:"🎒",items:["Guide / carte","Cadenas bagages","Bouteille d'eau","Snacks voyage","Livre / liseuse","Masque de sommeil"]},
]

export const uid = () => Math.random().toString(36).slice(2, 9)

export const fmt = (n, sym="€") =>
  `${sym}${Math.abs(n).toLocaleString("fr-FR",{minimumFractionDigits:0,maximumFractionDigits:0})}`

export function debounce(fn, ms) {
  let t
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
}

export const WX = {"0":"☀️","1":"🌤","2":"⛅","3":"☁️","45":"🌫","51":"🌦","55":"🌧","61":"🌧","80":"🌦","95":"⛈","default":"🌡"}
export const wxIcon = c => WX[String(c)] || WX.default

export async function fetchWeather(city, date) {
  const g  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr`)
  const gd = await g.json()
  if (!gd.results?.length) throw new Error("Introuvable")
  const { latitude: lat, longitude: lon } = gd.results[0]
  const w  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${date}&end_date=${date}`)
  const wd = await w.json()
  if (!wd.daily?.weathercode?.length) throw new Error("Pas de données")
  return { icon: wxIcon(wd.daily.weathercode[0]), max: Math.round(wd.daily.temperature_2m_max[0]), min: Math.round(wd.daily.temperature_2m_min[0]) }
}
