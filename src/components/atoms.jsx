import { useEffect, useRef } from 'react'
import { C } from '../constants'

export const Input = ({ style = {}, ...p }) => (
  <input
    style={{background:"white",border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",transition:"border-color .15s",width:"100%",...style}}
    onFocus={e=>e.target.style.borderColor=C.borderFocus}
    onBlur={e=>e.target.style.borderColor=C.border}
    {...p}
  />
)

export const Sel = ({ style = {}, ...p }) => (
  <select
    style={{background:"white",border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,padding:"9px 12px",fontSize:13,outline:"none",fontFamily:"inherit",...style}}
    {...p}
  />
)

export const Btn = ({ children, onClick, variant="primary", small, full, style={}, disabled, loading }) => {
  const v = {
    primary:{background:C.accent,color:"white"},
    white:  {background:"white",color:C.text,border:`1.5px solid ${C.border}`},
    ghost:  {background:"white",color:C.textSoft,border:`1.5px solid ${C.border}`},
    danger: {background:C.redSoft,color:C.red,border:`1.5px solid #fecaca`},
    teal:   {background:C.tealSoft,color:C.teal,border:`1.5px solid #99f6e4`},
    accent: {background:C.accentSoft,color:C.accent,border:`1.5px solid #bfdbfe`},
    green:  {background:C.greenSoft,color:C.green,border:`1.5px solid #bbf7d0`},
    red:    {background:C.red,color:"white"},
  }
  return (
    <button
      className="btn-press"
      onClick={disabled||loading ? undefined : onClick}
      style={{border:"none",borderRadius:10,cursor:disabled||loading?"not-allowed":"pointer",fontFamily:"inherit",
        fontWeight:600,padding:small?"6px 12px":"11px 20px",fontSize:small?12:14,
        opacity:disabled?0.4:1,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,
        width:full?"100%":"auto",...v[variant],...style}}>
      {loading
        ? <span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%",animation:"_spin .7s linear infinite",display:"inline-block"}}/>
        : children}
    </button>
  )
}

export const Card = ({ children, style={}, className="" }) => (
  <div className={`card-hover ${className}`}
    style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:20,marginBottom:12,boxShadow:C.shadow,...style}}>
    {children}
  </div>
)

export const Tag = ({ color, soft, children }) => (
  <span style={{background:soft||color+"18",color,border:`1px solid ${color}30`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>
    {children}
  </span>
)

export const Label = ({ children }) => (
  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",color:C.muted,marginBottom:8,textTransform:"uppercase"}}>
    {children}
  </div>
)

export const Spinner = () => (
  <span style={{display:"inline-block",width:13,height:13,border:"2px solid #e2e8f0",borderTopColor:C.accent,borderRadius:"50%",animation:"_spin .7s linear infinite"}}/>
)

export const Avatar = ({ name, photo, size=34 }) => {
  const initials = (name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()
  if (photo) return <img src={photo} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt={name} loading="lazy"/>
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:C.accent,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:700,flexShrink:0}}>
      {initials}
    </div>
  )
}

export const Icon = ({ name, size=16, color="currentColor", strokeWidth=2, style={} }) => {
  const ref = useRef(null)
  useEffect(() => {
    import('lucide').then(lucide => {
      if (!ref.current) return
      ref.current.innerHTML = ""
      const icon = lucide.createElement(lucide[name] || lucide.HelpCircle)
      icon.setAttribute("width", size)
      icon.setAttribute("height", size)
      icon.setAttribute("stroke", color)
      icon.setAttribute("stroke-width", strokeWidth)
      icon.setAttribute("fill", "none")
      icon.setAttribute("stroke-linecap", "round")
      icon.setAttribute("stroke-linejoin", "round")
      ref.current.appendChild(icon)
    })
  }, [name, size, color])
  return <span ref={ref} style={{display:"inline-flex",alignItems:"center",flexShrink:0,...style}}/>
}

export const PieChart = ({ data, size=130 }) => {
  const total = data.reduce((s,d) => s+d.value, 0)
  if (!total) return null
  let angle = -Math.PI/2
  const r=size/2-6, cx=size/2, cy=size/2
  const slices = data.map(d => {
    const start=angle, sweep=(d.value/total)*2*Math.PI
    angle += sweep
    const x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start)
    const x2=cx+r*Math.cos(angle),y2=cy+r*Math.sin(angle)
    return {...d, path:`M${cx},${cy} L${x1},${y1} A${r},${r},0,${sweep>Math.PI?1:0},1,${x2},${y2} Z`}
  })
  return (
    <svg width={size} height={size}>
      {slices.map((s,i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth={2}/>)}
      <circle cx={cx} cy={cy} r={r*0.45} fill="white"/>
    </svg>
  )
}
