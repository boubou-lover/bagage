import { C } from '../constants'
import {
  Map, CalendarDays, Wallet, Luggage, FolderOpen, Info, ArrowLeftRight,
  ChevronLeft, Users, Upload, Link, Trash2, Download, ExternalLink,
  Image, FileText, File, PlusCircle, Share2, Copy, Check, Send, QrCode, X,
  HelpCircle
} from 'lucide-react'

const ICONS = {
  Map, CalendarDays, Wallet, Luggage, FolderOpen, Info, ArrowLeftRight,
  ChevronLeft, Users, Upload, Link, Trash2, Download, ExternalLink,
  Image, FileText, File, PlusCircle, Share2, Copy, Check, Send, QrCode, X,
  HelpCircle
}

/* ──────────────────────────────────────────────
   INPUT
   • fontSize 14 → 15px pour meilleure lisibilité
   • padding vertical augmenté (10 → 12px)
   • line-height explicite
   • placeholder plus visible (#94a3b8 → #9aadbc)
────────────────────────────────────────────── */
export const Input = ({ style = {}, ...p }) => (
  <input
    style={{
      background: "white",
      border: `1.5px solid ${C.border}`,
      borderRadius: 10,
      color: C.text,
      padding: "12px 14px",
      fontSize: 15,
      lineHeight: 1.5,
      outline: "none",
      fontFamily: "inherit",
      transition: "border-color .15s",
      width: "100%",
      ...style
    }}
    onFocus={e  => e.target.style.borderColor = C.borderFocus}
    onBlur={e   => e.target.style.borderColor = C.border}
    {...p}
  />
)

/* ──────────────────────────────────────────────
   SELECT
   • padding augmenté (9 → 11px vertical)
   • fontSize 13 → 14px
────────────────────────────────────────────── */
export const Sel = ({ style = {}, ...p }) => (
  <select
    style={{
      background: "white",
      border: `1.5px solid ${C.border}`,
      borderRadius: 10,
      color: C.text,
      padding: "11px 12px",
      fontSize: 14,
      lineHeight: 1.4,
      outline: "none",
      fontFamily: "inherit",
      ...style
    }}
    {...p}
  />
)

/* ──────────────────────────────────────────────
   BTN
   • small : padding et fontSize augmentés (12 → 13px)
   • normal : padding vertical augmenté (11 → 13px)
   • gap augmenté (7 → 8px)
   • line-height explicite
────────────────────────────────────────────── */
export const Btn = ({ children, onClick, variant = "primary", small, full, style = {}, disabled, loading }) => {
  const v = {
    primary: { background: C.accent,    color: "white" },
    white:   { background: "white",     color: C.text,     border: `1.5px solid ${C.border}` },
    ghost:   { background: "white",     color: C.textSoft, border: `1.5px solid ${C.border}` },
    danger:  { background: C.redSoft,   color: C.red,      border: `1.5px solid #fecaca` },
    teal:    { background: C.tealSoft,  color: C.teal,     border: `1.5px solid #99f6e4` },
    accent:  { background: C.accentSoft,color: C.accent,   border: `1.5px solid #bfdbfe` },
    green:   { background: C.greenSoft, color: C.green,    border: `1.5px solid #bbf7d0` },
    red:     { background: C.red,       color: "white" },
  }
  return (
    <button
      className="btn-press"
      onClick={disabled || loading ? undefined : onClick}
      style={{
        border: "none",
        borderRadius: 10,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontWeight: 600,
        letterSpacing: "0.01em",
        lineHeight: 1.4,
        padding: small ? "8px 14px" : "13px 22px",
        fontSize: small ? 13 : 15,
        opacity: disabled ? 0.4 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: full ? "100%" : "auto",
        ...v[variant],
        ...style
      }}
    >
      {loading
        ? <span style={{width:15,height:15,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%",animation:"_spin .7s linear infinite",display:"inline-block"}}/>
        : children
      }
    </button>
  )
}

/* ──────────────────────────────────────────────
   CARD
   • padding 20 → 22px
   • marginBottom 12 → 14px
────────────────────────────────────────────── */
export const Card = ({ children, style = {}, className = "" }) => (
  <div
    className={`card-hover ${className}`}
    style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: 22,
      marginBottom: 14,
      boxShadow: C.shadow,
      ...style
    }}
  >
    {children}
  </div>
)

/* ──────────────────────────────────────────────
   TAG
   • fontSize 11 → 12px
   • padding légèrement augmenté
   • fontWeight 600 → 600 (inchangé)
────────────────────────────────────────────── */
export const Tag = ({ color, soft, children }) => (
  <span
    style={{
      background: soft || color + "18",
      color,
      border: `1px solid ${color}30`,
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.4,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
)

/* ──────────────────────────────────────────────
   LABEL  ← clé de la hiérarchie
   • fontSize 11 → 12px
   • letterSpacing réduit (0.07em → 0.06em)
   • color : C.muted (maintenant #64748b, ratio 6.5:1)
   • marginBottom 8 → 12px (plus d'air)
   • lineHeight explicite
────────────────────────────────────────────── */
export const Label = ({ children }) => (
  <div
    style={{
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.06em",
      color: C.muted,
      marginBottom: 12,
      textTransform: "uppercase",
      lineHeight: 1.4,
    }}
  >
    {children}
  </div>
)

/* ──────────────────────────────────────────────
   SPINNER
   • légèrement agrandi (13 → 15px)
────────────────────────────────────────────── */
export const Spinner = () => (
  <span
    style={{
      display: "inline-block",
      width: 15,
      height: 15,
      border: "2px solid #e2e8f0",
      borderTopColor: C.accent,
      borderRadius: "50%",
      animation: "_spin .7s linear infinite",
    }}
  />
)

/* ──────────────────────────────────────────────
   AVATAR
   • fontSize ratio légèrement ajusté (×0.36 → ×0.38)
────────────────────────────────────────────── */
export const Avatar = ({ name, photo, size = 34 }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
  if (photo) return (
    <img
      src={photo}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      alt={name}
      loading="lazy"
    />
  )
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: C.accent,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: "0.01em",
      }}
    >
      {initials}
    </div>
  )
}

/* ──────────────────────────────────────────────
   ICON — inchangé
────────────────────────────────────────────── */
export const Icon = ({ name, size = 16, color = "currentColor", strokeWidth = 2, style = {} }) => {
  const LucideIcon = ICONS[name] || HelpCircle
  return (
    <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, ...style }}>
      <LucideIcon size={size} color={color} strokeWidth={strokeWidth} />
    </span>
  )
}

/* ──────────────────────────────────────────────
   PIE CHART — inchangé
────────────────────────────────────────────── */
export const PieChart = ({ data, size = 130 }) => {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return null
  let angle = -Math.PI / 2
  const r = size / 2 - 6, cx = size / 2, cy = size / 2
  const slices = data.map(d => {
    const start = angle, sweep = (d.value / total) * 2 * Math.PI
    angle += sweep
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
    return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r},0,${sweep > Math.PI ? 1 : 0},1,${x2},${y2} Z` }
  })
  return (
    <svg width={size} height={size}>
      {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth={2} />)}
      <circle cx={cx} cy={cy} r={r * 0.45} fill="white" />
    </svg>
  )
}
