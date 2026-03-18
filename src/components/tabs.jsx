import { useState, useEffect, useRef, useCallback } from 'react'
import { C, CATS, CURRENCIES, PACK_ITEMS, uid, fmt, fetchWeather } from '../constants'
import { fbListen, fbSet, fbGet } from '../firebase'
import { Input, Sel, Btn, Card, Label, Icon, Tag, Avatar, Spinner, PieChart } from './atoms'

/* ── QR Code ── */
function QRCode({ url, size=200 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`
  return <img src={src} width={size} height={size} alt="QR Code" loading="lazy" style={{borderRadius:8}}/>
}

/* ── Share Modal ── */
export function ShareModal({ trip, user, onClose }) {
  const [email,setEmail]   = useState("")
  const [msg,setMsg]       = useState("")
  const [loading,setLoading] = useState(false)
  const [copied,setCopied] = useState(false)
  const [showQR,setShowQR] = useState(false)
  const members = trip.members||{}
  const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${trip.id}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true); setTimeout(()=>setCopied(false),2000)
  }
  const shareLink = () => {
    if (navigator.share) navigator.share({title:"Rejoins mon voyage sur Bagage",text:`Je t'invite à rejoindre mon voyage ! Clique ici :`,url:inviteUrl})
    else copyLink()
  }

  const invite = async () => {
    if (!email.trim()) return
    setLoading(true); setMsg("")
    try {
      const usersData = await fbGet("users")
      const targetUid = usersData && Object.keys(usersData).find(uid => usersData[uid].email===email.trim())
      if (!targetUid) {
        const joinUrl = `${inviteUrl}&email=${encodeURIComponent(email.trim())}`
        setMsg(`⚠️ Pas encore inscrit. Partage ce lien : ${joinUrl}`)
        setLoading(false); return
      }
      if (members[targetUid]) { setMsg("✓ Déjà membre du voyage"); setLoading(false); return }
      await fbSet(`trips/${trip.id}/members/${targetUid}`, {name:usersData[targetUid].name,email:email.trim(),role:"member"})
      await fbSet(`userTrips/${targetUid}/${trip.id}`, true)
      setMsg(`✓ ${usersData[targetUid].name} a été ajouté au voyage !`)
      setEmail("")
    } catch(e) { setMsg("Erreur : "+e.message) }
    setLoading(false)
  }

  const removeMember = async (uid) => {
    if (uid===user.uid) { setMsg("Tu ne peux pas te retirer toi-même"); return }
    await fbSet(`trips/${trip.id}/members/${uid}`, null)
    await fbSet(`userTrips/${uid}/${trip.id}`, null)
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="fade-up" style={{background:"white",borderRadius:20,padding:"28px 20px",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,display:"flex",alignItems:"center",gap:8}}><Icon name="Share2" size={20} color={C.accent}/>Partager le voyage</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.muted}}>×</button>
        </div>
        <Label>🔗 Lien d'invitation</Label>
        <div style={{background:C.surface2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"10px 14px",fontSize:12,color:C.mutedDark,marginBottom:10,wordBreak:"break-all",fontFamily:"monospace"}}>{inviteUrl}</div>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          <Btn variant="accent" onClick={copyLink} full>{copied?<><Icon name="Check" size={14} color={C.accent}/>Copié !</>:<><Icon name="Copy" size={14} color={C.accent}/>Copier le lien</>}</Btn>
          <Btn variant="primary" onClick={shareLink} style={{flexShrink:0}}><Icon name="Send" size={14} color="white"/>Partager</Btn>
          <Btn variant="ghost" onClick={()=>setShowQR(v=>!v)} style={{flexShrink:0}}>{showQR?<Icon name="X" size={14}/>:<><Icon name="QrCode" size={14}/>QR</>}</Btn>
        </div>
        {showQR && (
          <div style={{textAlign:"center",marginBottom:20,padding:"20px",background:C.surface2,borderRadius:16,border:`1px solid ${C.border}`}}>
            <QRCode url={inviteUrl} size={200}/>
            <div style={{fontSize:12,color:C.muted,marginTop:10}}>Scanne pour rejoindre le voyage</div>
          </div>
        )}
        <Label>✉️ Inviter par email (si déjà inscrit)</Label>
        <div style={{display:"flex",gap:8,marginBottom:msg?10:16}}>
          <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&invite()} placeholder="email@exemple.com" style={{flex:1}}/>
          <Btn onClick={invite} loading={loading} style={{flexShrink:0}}>Ajouter</Btn>
        </div>
        {msg && <div style={{fontSize:12,color:msg.startsWith("✓")?C.green:C.red,marginBottom:14,padding:"8px 12px",background:msg.startsWith("✓")?C.greenSoft:C.redSoft,borderRadius:8,wordBreak:"break-all"}}>{msg}</div>}
        <Label>Membres ({Object.keys(members).length})</Label>
        {Object.entries(members).map(([uid,m]) => (
          <div key={uid} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <Avatar name={m.name} size={36}/>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{m.name}</div><div style={{fontSize:12,color:C.muted}}>{m.email}</div></div>
            <Tag color={m.role==="owner"?C.yellow:C.teal} soft={m.role==="owner"?C.yellowSoft:C.tealSoft}>{m.role==="owner"?"Créateur":"Membre"}</Tag>
            {m.role!=="owner"&&trip.members[user.uid]?.role==="owner"&&(
              <button onClick={()=>removeMember(uid)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>×</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Tab Synthèse ── */
export function TabSynthese({ days, expenses, destination, currency }) {
  const sym   = CURRENCIES.find(c=>c.code===currency)?.symbol||"€"
  const total = expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0)
  return (
    <div className="fade-up">
      <div style={{background:`linear-gradient(135deg,${C.accent},${C.sky})`,borderRadius:20,padding:"32px 24px",marginBottom:12,boxShadow:"0 8px 32px rgba(37,99,235,0.25)",textAlign:"center",color:"white"}}>
        <div style={{fontSize:44,marginBottom:8}}>✈️</div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:"clamp(20px,5vw,32px)",marginBottom:6}}>{destination||"Mon Voyage"}</div>
        {days[0]?.date&&<div style={{opacity:0.85,fontSize:14}}>{new Date(days[0].date+"T00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}{days.length>1&&days[days.length-1]?.date&&<> → {new Date(days[days.length-1].date+"T00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</>}</div>}
        <div style={{display:"flex",justifyContent:"center",gap:32,marginTop:24,flexWrap:"wrap"}}>
          {[{v:days.length,l:"jours",i:"📅"},{v:days.reduce((s,d)=>s+(d.events||[]).length,0),l:"activités",i:"🎯"},{v:fmt(total,sym),l:"dépensés",i:"💰"}].map(s=>(
            <div key={s.l} style={{textAlign:"center"}}><div style={{fontSize:26,fontWeight:800}}>{s.v}</div><div style={{fontSize:12,opacity:0.8}}>{s.i} {s.l}</div></div>
          ))}
        </div>
      </div>
      {days.map((day,idx) => (
        <Card key={day.id} style={{padding:"14px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <span style={{background:C.accentSoft,color:C.accent,fontWeight:700,fontSize:12,borderRadius:20,padding:"3px 10px",flexShrink:0}}>Jour {idx+1}</span>
            {day.date&&<span style={{color:C.textSoft,fontSize:13}}>{new Date(day.date+"T00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</span>}
            {day.weather&&<span style={{marginLeft:"auto",fontSize:13}}>{day.weather.icon} {day.weather.max}°/{day.weather.min}°</span>}
          </div>
          {day.note&&<div style={{fontSize:13,color:C.mutedDark,fontStyle:"italic",marginBottom:8,borderLeft:`3px solid ${C.border}`,paddingLeft:10}}>{day.note}</div>}
          {(day.events||[]).map(ev=>(
            <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
              {ev.time&&<span style={{fontSize:12,color:C.accent,fontWeight:600,minWidth:42}}>{ev.time}</span>}
              <span style={{width:5,height:5,borderRadius:"50%",background:C.accent,flexShrink:0}}/>
              <span style={{fontSize:13,color:C.textSoft}}>{ev.text}</span>
            </div>
          ))}
          {!(day.events||[]).length&&!day.note&&<span style={{fontSize:13,color:C.muted}}>Journée libre</span>}
        </Card>
      ))}
    </div>
  )
}

/* ── Day Card ── */
function DayCard({ day, idx, total, onUpdate, onRemove, onAddEvent, onRemoveEvent, onLoadWeather, wxLoading, destination, onDragStart, onDrop }) {
  const [newText,setNewText] = useState("")
  const [newTime,setNewTime] = useState("")
  const [showNote,setShowNote] = useState(!!day.note)
  const submit = () => { if(!newText.trim())return; onAddEvent(day.id,newText,newTime); setNewText(""); setNewTime("") }
  return (
    <div draggable onDragStart={onDragStart} onDragOver={e=>e.preventDefault()} onDrop={onDrop}
      className="fade-up" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,marginBottom:12,boxShadow:C.shadow,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",background:C.accentSoft,borderBottom:`1px solid ${C.border}`}}>
        <span style={{color:C.mutedDark,fontSize:14,cursor:"grab"}}>⠿</span>
        <span style={{background:C.accent,color:"white",fontWeight:700,fontSize:12,borderRadius:20,padding:"2px 10px",flexShrink:0}}>Jour {idx+1}</span>
        <Input type="date" value={day.date} onChange={e=>onUpdate({date:e.target.value})} style={{flex:1,fontSize:13,padding:"6px 10px",width:"auto"}}/>
        {day.date&&destination&&(day.weather?<span style={{fontSize:12,color:C.textSoft,whiteSpace:"nowrap",flexShrink:0}}>{day.weather.icon} {day.weather.max}°/{day.weather.min}°</span>:<Btn variant="ghost" small onClick={onLoadWeather} disabled={wxLoading}>{wxLoading?<Spinner/>:"🌤"}</Btn>)}
        {total>1&&<Btn variant="danger" small onClick={onRemove}>✕</Btn>}
      </div>
      <div style={{padding:"14px 16px"}}>
        {showNote?<Input value={day.note||""} onChange={e=>onUpdate({note:e.target.value})} placeholder="Note du jour…" style={{marginBottom:10,fontSize:13,borderLeft:`3px solid ${C.accent}`,borderRadius:"0 8px 8px 0",paddingLeft:10}}/>
          :<button onClick={()=>setShowNote(true)} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",padding:"0 0 10px",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>+ Note du jour</button>}
        {(day.events||[]).map(ev=>(
          <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
            {ev.time&&<span style={{fontSize:12,color:C.accent,fontWeight:600,minWidth:42,flexShrink:0}}>{ev.time}</span>}
            <span style={{width:5,height:5,borderRadius:"50%",background:C.accent,flexShrink:0}}/><span style={{flex:1,fontSize:13}}>{ev.text}</span>
            <button onClick={()=>onRemoveEvent(day.id,ev.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>×</button>
          </div>
        ))}
        {!(day.events||[]).length&&<div style={{fontSize:13,color:C.muted,padding:"4px 0 10px"}}>Aucune activité</div>}
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <Input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} style={{width:88,flexShrink:0,fontSize:13,padding:"8px 10px"}}/>
          <Input value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Ajouter une activité…" style={{flex:1}}/>
          <Btn variant="primary" onClick={submit} style={{padding:"9px 14px",flexShrink:0}}>+</Btn>
        </div>
      </div>
    </div>
  )
}

/* ── Tab Programme ── */
export function TabProgramme({ days, setDays, destination }) {
  const [wxLoading,setWxLoading] = useState({})
  const dragIdx = useRef(null)
  const [dateStart,setDateStart] = useState(()=>days[0]?.date||"")
  const [dateEnd,setDateEnd]     = useState(()=>days[days.length-1]?.date||"")
  const ds = {background:"white",border:"1.5px solid #e2e8f0",borderRadius:10,color:"#0f172a",padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",width:"100%"}

  const buildDays = (start,end) => {
    const startD=new Date(start+"T00:00"),endD=new Date(end+"T00:00")
    const diff=Math.round((endD-startD)/(1000*60*60*24))+1
    if(diff<1||diff>60)return null
    return Array.from({length:diff},(_,i)=>{const d=new Date(startD);d.setDate(d.getDate()+i);const iso=d.toISOString().slice(0,10);return days.find(x=>x.date===iso)||{id:uid(),date:iso,events:[],note:"",weather:null}})
  }
  const onStartChange = e => { const v=e.target.value;setDateStart(v);if(v&&dateEnd&&v<=dateEnd){const nd=buildDays(v,dateEnd);if(nd)setDays(nd)} }
  const onEndChange   = e => { const v=e.target.value;setDateEnd(v);if(dateStart&&v&&dateStart<=v){const nd=buildDays(dateStart,v);if(nd)setDays(nd)} }
  const nbJours = (dateStart&&dateEnd&&dateStart<=dateEnd)?Math.round((new Date(dateEnd+"T00:00")-new Date(dateStart+"T00:00"))/(1000*60*60*24))+1:null
  const addDay    = ()         => setDays([...days,{id:uid(),date:"",events:[],note:"",weather:null}])
  const removeDay = id         => setDays(days.filter(d=>d.id!==id))
  const upDay     = (id,p)     => setDays(days.map(d=>d.id===id?{...d,...p}:d))
  const addEvent  = (dayId,text,time) => { if(!text.trim())return;setDays(days.map(d=>d.id===dayId?{...d,events:[...(d.events||[]),{id:uid(),text:text.trim(),time}]}:d)) }
  const removeEvent = (dayId,evId)    => setDays(days.map(d=>d.id===dayId?{...d,events:(d.events||[]).filter(e=>e.id!==evId)}:d))
  const loadWeather = async day => { if(!destination||!day.date)return;setWxLoading(p=>({...p,[day.id]:true}));try{const wx=await fetchWeather(destination,day.date);upDay(day.id,{weather:wx})}catch{}setWxLoading(p=>({...p,[day.id]:false})) }
  return (
    <div className="fade-up">
      <div style={{background:"white",border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 18px",marginBottom:14,boxShadow:C.shadow}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",color:C.muted,marginBottom:10,textTransform:"uppercase"}}>📅 Période du voyage</div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:130}}><div style={{fontSize:11,color:C.mutedDark,marginBottom:4,fontWeight:600}}>Départ</div><input type="date" value={dateStart} onChange={onStartChange} style={ds}/></div>
          <div style={{color:C.muted,fontSize:18,paddingTop:18}}>→</div>
          <div style={{flex:1,minWidth:130}}><div style={{fontSize:11,color:C.mutedDark,marginBottom:4,fontWeight:600}}>Retour</div><input type="date" value={dateEnd} min={dateStart||undefined} onChange={onEndChange} style={ds}/></div>
          {nbJours&&<div style={{paddingTop:18,flexShrink:0}}><div style={{background:C.accentSoft,border:`1px solid #bfdbfe`,borderRadius:20,padding:"6px 14px",fontSize:13,color:C.accent,fontWeight:700,whiteSpace:"nowrap"}}>{nbJours} jour{nbJours>1?"s":""}</div></div>}
        </div>
      </div>
      {days.map((day,idx)=>(
        <DayCard key={day.id} day={day} idx={idx} total={days.length}
          onUpdate={p=>upDay(day.id,p)} onRemove={()=>removeDay(day.id)}
          onAddEvent={addEvent} onRemoveEvent={removeEvent}
          onLoadWeather={()=>loadWeather(day)} wxLoading={wxLoading[day.id]} destination={destination}
          onDragStart={()=>{dragIdx.current=idx}}
          onDrop={()=>{if(dragIdx.current===null||dragIdx.current===idx)return;const d=[...days];const[m]=d.splice(dragIdx.current,1);d.splice(idx,0,m);setDays(d);dragIdx.current=null}}/>
      ))}
      <button onClick={addDay} style={{width:"100%",background:"white",border:`1.5px dashed ${C.borderFocus}`,borderRadius:14,color:C.accent,padding:14,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        + Ajouter un jour
      </button>
    </div>
  )
}

/* ── Tab Budget ── */
export function TabBudget({ expenses, setExpenses, budget, setBudget, currency, setCurrency, days, members }) {
  const sym = CURRENCIES.find(c=>c.code===currency)?.symbol||"€"
  const initTravelers = () => { const fm=Object.values(members||{}).map(m=>m.name||m.email||"?"); return fm.length>0?[...new Set(fm)]:["Moi"] }
  const [form,setForm]           = useState({label:"",amount:"",category:"transport",dayId:"",paidBy:"",receipt:""})
  const [travelers,setTravelers] = useState(initTravelers)
  const [newTraveler,setNewTraveler] = useState("")
  const [subTab,setSubTab]       = useState("depenses")
  useEffect(()=>{const fm=Object.values(members||{}).map(m=>m.name||m.email||"?");if(fm.length>0)setTravelers(prev=>[...new Set([...fm,...prev])]);},[JSON.stringify(members)])
  const total=expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0)
  const bNum=parseFloat(budget)||0,reste=bNum-total,pct=bNum>0?Math.min(100,(total/bNum)*100):0
  const add=()=>{if(!form.label||!form.amount)return;setExpenses([...expenses,{...form,id:uid()}]);setForm({...form,label:"",amount:"",receipt:""})}
  const handleReceipt=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(f=>({...f,receipt:ev.target.result}));r.readAsDataURL(f)}
  const byCat=CATS.map(c=>({...c,value:expenses.filter(e=>e.category===c.id).reduce((s,e)=>s+(parseFloat(e.amount)||0),0)})).filter(c=>c.value>0)
  const byDay=days.map((d,i)=>({label:`J${i+1}`,value:expenses.filter(e=>e.dayId===d.id).reduce((s,e)=>s+(parseFloat(e.amount)||0),0)}))
  const byTraveler=travelers.map(t=>({name:t,paid:expenses.filter(e=>e.paidBy===t).reduce((s,e)=>s+(parseFloat(e.amount)||0),0)}))
  return (
    <div className="fade-up">
      <Card>
        <div style={{display:"flex",gap:12,alignItems:"flex-end",marginBottom:16,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:140}}>
            <Label>Budget total</Label>
            <div style={{display:"flex",alignItems:"center",gap:6,background:C.surface2,borderRadius:12,padding:"2px 2px 2px 12px",border:`1.5px solid ${C.border}`}}>
              <span style={{color:C.mutedDark,fontWeight:600}}>{sym}</span>
              <input type="number" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="0" style={{flex:1,border:"none",outline:"none",fontSize:22,fontWeight:800,color:C.text,background:"transparent",padding:"6px 4px",fontFamily:"inherit"}}/>
            </div>
          </div>
          <div><Label>Devise</Label><Sel value={currency} onChange={e=>setCurrency(e.target.value)} style={{minWidth:150}}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.name}</option>)}</Sel></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:bNum>0?14:0}}>
          {[{l:"Budget",v:bNum,c:C.textSoft,bg:"#f8fafc"},{l:"Dépensé",v:total,c:C.red,bg:C.redSoft},{l:"Restant",v:reste,c:reste>=0?C.green:C.red,bg:reste>=0?C.greenSoft:C.redSoft}].map(s=>(
            <div key={s.l} style={{background:s.bg,borderRadius:12,padding:"12px 10px",textAlign:"center",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:4,fontWeight:600}}>{s.l}</div>
              <div style={{fontSize:17,fontWeight:800,color:s.c}}>{fmt(s.v,sym)}</div>
            </div>
          ))}
        </div>
        {bNum>0&&<><div style={{height:6,borderRadius:3,background:C.border,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,transition:"width .5s",background:reste>=0?`linear-gradient(90deg,${C.accent},${C.sky})`:`linear-gradient(90deg,${C.red},${C.orange})`,width:`${pct}%`}}/></div><div style={{fontSize:11,color:C.muted,marginTop:5,display:"flex",justifyContent:"space-between"}}><span>{pct.toFixed(0)}% utilisé</span><span>{fmt(reste,sym)} restant</span></div></>}
      </Card>
      <Card><Label>👥 Voyageurs</Label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{travelers.map(t=>(<div key={t} style={{display:"flex",alignItems:"center",gap:4,background:C.accentSoft,border:"1px solid #bfdbfe",borderRadius:20,padding:"4px 12px",fontSize:13}}><span style={{color:C.accent,fontWeight:500}}>👤 {t}</span>{travelers.length>1&&<button onClick={()=>setTravelers(travelers.filter(x=>x!==t))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:15}}>×</button>}</div>))}</div>
        <div style={{display:"flex",gap:8}}><Input value={newTraveler} onChange={e=>setNewTraveler(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newTraveler.trim()){setTravelers([...travelers,newTraveler.trim()]);setNewTraveler("")}}} placeholder="Ajouter un voyageur…" style={{flex:1,fontSize:13}}/><Btn variant="accent" small onClick={()=>{if(newTraveler.trim()){setTravelers([...travelers,newTraveler.trim()]);setNewTraveler("")}}}>+</Btn></div>
      </Card>
      <Card><Label>+ Nouvelle dépense</Label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}><Input value={form.label} onChange={e=>setForm({...form,label:e.target.value})} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Description" style={{flex:"1 1 160px"}}/><Input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} onKeyDown={e=>e.key==="Enter"&&add()} placeholder={sym} style={{width:90,flexShrink:0}}/></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}><Sel value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{flex:1}}>{CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</Sel><Sel value={form.dayId} onChange={e=>setForm({...form,dayId:e.target.value})} style={{flex:1}}><option value="">— Jour —</option>{days.map((d,i)=><option key={d.id} value={d.id}>Jour {i+1}{d.date?` (${new Date(d.date+"T00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"})})`:""}</option>)}</Sel><Sel value={form.paidBy} onChange={e=>setForm({...form,paidBy:e.target.value})} style={{flex:1}}><option value="">— Payé par —</option>{travelers.map(t=><option key={t} value={t}>{t}</option>)}</Sel></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <label style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer",background:C.surface2,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 12px",fontSize:13,color:C.mutedDark}}>📸 {form.receipt?"Reçu joint ✓":"Joindre un reçu"}<input type="file" accept="image/*" onChange={handleReceipt} style={{display:"none"}}/></label>
          {form.receipt&&<img src={form.receipt} style={{width:36,height:36,borderRadius:8,objectFit:"cover",flexShrink:0}} alt="reçu"/>}
          <Btn onClick={add} disabled={!form.label||!form.amount}>Ajouter</Btn>
        </div>
      </Card>
      <div style={{display:"flex",background:"white",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:12,boxShadow:C.shadow}}>
        {[{id:"depenses",l:"📋 Dépenses"},{id:"stats",l:"📊 Stats"},{id:"partage",l:"👥 Partage"}].map((t,i)=>(
          <button key={t.id} onClick={()=>setSubTab(t.id)} style={{flex:1,background:subTab===t.id?C.accentSoft:"white",border:"none",borderRight:i<2?`1px solid ${C.border}`:"none",color:subTab===t.id?C.accent:C.mutedDark,padding:"10px 8px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:subTab===t.id?700:500}}>{t.l}</button>
        ))}
      </div>
      {subTab==="depenses"&&<Card>{expenses.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"20px 0"}}>Aucune dépense</div>}{expenses.map(exp=>{const cat=CATS.find(c=>c.id===exp.category);const dayIdx=days.findIndex(d=>d.id===exp.dayId);return(<div key={exp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${C.border}`}}><span style={{width:34,height:34,borderRadius:10,background:cat?.soft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat?.icon}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:500}}>{exp.label}</div><div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>{dayIdx>=0&&<Tag color={C.accent} soft={C.accentSoft}>J{dayIdx+1}</Tag>}{exp.paidBy&&<Tag color={C.purple} soft={C.purpleSoft}>{exp.paidBy}</Tag>}</div></div>{exp.receipt&&<img src={exp.receipt} style={{width:30,height:30,borderRadius:6,objectFit:"cover",flexShrink:0}} alt="reçu" loading="lazy"/>}<span style={{fontWeight:700,color:cat?.color,minWidth:55,textAlign:"right",flexShrink:0}}>{fmt(parseFloat(exp.amount)||0,sym)}</span><button onClick={()=>setExpenses(expenses.filter(e=>e.id!==exp.id))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18}}>×</button></div>)})}</Card>}
      {subTab==="stats"&&<div>{byCat.length>0&&<Card><Label>Par catégorie</Label><div style={{display:"flex",alignItems:"center",gap:20}}><PieChart data={byCat} size={120}/><div style={{flex:1}}>{byCat.map(c=>(<div key={c.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{width:10,height:10,borderRadius:3,background:c.color,flexShrink:0}}/><span style={{flex:1,fontSize:13}}>{c.icon} {c.label}</span><span style={{color:c.color,fontWeight:700,fontSize:13}}>{fmt(c.value,sym)}</span><span style={{color:C.muted,fontSize:11,minWidth:28,textAlign:"right"}}>{total>0?((c.value/total)*100).toFixed(0):0}%</span></div>))}</div></div></Card>}{byDay.some(d=>d.value>0)&&<Card><Label>Par jour</Label>{byDay.filter(d=>d.value>0).map((d,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:13,color:C.mutedDark,minWidth:32,fontWeight:600}}>{d.label}</span><div style={{flex:1,height:6,borderRadius:3,background:C.border,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:C.accent,width:total>0?`${(d.value/total)*100}%`:"0%",transition:"width .4s"}}/></div><span style={{fontWeight:700,color:C.accent,fontSize:13,minWidth:55,textAlign:"right"}}>{fmt(d.value,sym)}</span></div>))}</Card>}</div>}
      {subTab==="partage"&&<Card><Label>Partage des dépenses</Label>{travelers.length<2?<div style={{color:C.muted,fontSize:13}}>Ajoute au moins 2 voyageurs.</div>:(()=>{const share=total/travelers.length;return(<><div style={{fontSize:13,color:C.mutedDark,marginBottom:14,padding:"10px 14px",background:C.yellowSoft,borderRadius:10,border:"1px solid #fde68a"}}>Part équitable : <b style={{color:C.yellow}}>{fmt(share,sym)}</b> / personne</div>{byTraveler.map(t=>{const diff=t.paid-share;return(<div key={t.name} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${C.border}`}}><span style={{width:34,height:34,borderRadius:"50%",background:C.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>👤</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{t.name}</div><div style={{fontSize:12,color:C.muted}}>Payé : {fmt(t.paid,sym)}</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:15,color:diff>=0?C.green:C.red}}>{diff>=0?"+":""}{fmt(diff,sym)}</div><div style={{fontSize:11,color:C.muted}}>{diff>=0?"à recevoir":"doit payer"}</div></div></div>)})}</>)})()}</Card>}
    </div>
  )
}

/* ── Tab Bagages ── */
export function TabBagages({ checked, setChecked }) {
  const toggle = id => setChecked(p=>({...p,[id]:!p[id]}))
  const total  = PACK_ITEMS.reduce((s,c)=>s+c.items.length,0)
  const done   = Object.values(checked||{}).filter(Boolean).length
  return (
    <div className="fade-up">
      <Card style={{textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:6}}>🧳</div>
        <div style={{fontWeight:800,fontSize:22,color:C.text,marginBottom:4}}>{done}/{total}</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:12}}>articles préparés</div>
        <div style={{height:6,borderRadius:3,background:C.border,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:3,background:done===total?`linear-gradient(90deg,${C.green},${C.teal})`:`linear-gradient(90deg,${C.accent},${C.sky})`,width:`${total>0?(done/total)*100:0}%`,transition:"width .5s"}}/>
        </div>
      </Card>
      {PACK_ITEMS.map(cat=>(
        <Card key={cat.id}>
          <Label>{cat.icon} {cat.label}</Label>
          {cat.items.map(item=>{
            const key=`${cat.id}__${item}`
            const chk=!!(checked||{})[key]
            return(
              <div key={item} className="check-item" onClick={()=>toggle(key)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,cursor:"pointer",background:chk?C.greenSoft:"transparent",marginBottom:4}}>
                <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${chk?C.green:C.border}`,background:chk?C.green:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                  {chk&&<span style={{color:"white",fontSize:13,fontWeight:700}}>✓</span>}
                </div>
                <span style={{fontSize:14,color:chk?C.green:C.text,textDecoration:chk?"line-through":"none",transition:"all .15s"}}>{item}</span>
              </div>
            )
          })}
        </Card>
      ))}
    </div>
  )
}

/* ── Tab Info ── */
export function TabInfo({ info, setInfo, currency, withDevises, setWithDevises }) {
  const upd = (k,v) => setInfo(p=>({...p,[k]:v}))
  const SECTIONS = [
    {key:"hebergement",icon:"🏨",label:"Hébergement",fields:[{k:"adresse",label:"Adresse",placeholder:"123 rue de la Paix, Paris"},{k:"telephone",label:"Téléphone",placeholder:"+33 1 23 45 67 89"},{k:"codeWifi",label:"Code WiFi",placeholder:"MonWifi2024"},{k:"checkIn",label:"Check-in",placeholder:"15h00"},{k:"checkOut",label:"Check-out",placeholder:"11h00"},{k:"confirmation",label:"N° confirmation",placeholder:"ABC123456"}]},
    {key:"transport",icon:"✈️",label:"Transport",fields:[{k:"vol",label:"N° vol / train",placeholder:"AF1234"},{k:"aeroport",label:"Aéroport / gare",placeholder:"CDG Terminal 2E"},{k:"depart",label:"Heure départ",placeholder:"08h30"},{k:"arrivee",label:"Heure arrivée",placeholder:"14h15"},{k:"compagnie",label:"Compagnie",placeholder:"Air France"}]},
    {key:"urgences",icon:"🆘",label:"Urgences & Ambassade",fields:[{k:"urgence",label:"N° urgences local",placeholder:"112 / 911"},{k:"ambassade",label:"Ambassade",placeholder:"+33 1 44 05 31 00"},{k:"assurance",label:"N° assurance",placeholder:"0800 123 456"},{k:"hopital",label:"Hôpital proche",placeholder:"Hôpital Central"}]},
    {key:"contacts",icon:"👥",label:"Contacts locaux",fields:[{k:"contact1nom",label:"Contact 1 — Nom",placeholder:"Marie Dupont"},{k:"contact1tel",label:"Contact 1 — Tél",placeholder:"+81 90 1234 5678"},{k:"contact2nom",label:"Contact 2 — Nom",placeholder:"Guide local"},{k:"contact2tel",label:"Contact 2 — Tél",placeholder:"+81 80 9876 5432"}]},
    {key:"divers",icon:"📝",label:"Divers",fields:[{k:"notes",label:"Notes libres",placeholder:"Infos pratiques, adresses, conseils…"}]},
  ]
  return (
    <div className="fade-up">
      <Card style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{fontWeight:600,fontSize:14,color:C.text}}>Onglet Devises</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>Utile si la devise locale est différente</div></div>
          <button onClick={()=>setWithDevises(v=>!v)} style={{width:44,height:24,borderRadius:12,background:withDevises?C.accent:C.border,border:"none",cursor:"pointer",transition:"background .2s",position:"relative",flexShrink:0}}>
            <span style={{position:"absolute",top:3,left:withDevises?22:3,width:18,height:18,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
          </button>
        </div>
      </Card>
      {SECTIONS.map(sec=>(
        <Card key={sec.key} style={{marginBottom:12}}>
          <Label>{sec.icon} {sec.label}</Label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {sec.fields.map(f=>(
              <div key={f.k} style={{gridColumn:f.k==="notes"||f.k==="adresse"?"1/-1":"auto"}}>
                <div style={{fontSize:11,color:C.mutedDark,marginBottom:4,fontWeight:600}}>{f.label}</div>
                {f.k==="notes"
                  ?<textarea value={info[sec.key]?.[f.k]||""} onChange={e=>upd(sec.key,{...info[sec.key],[f.k]:e.target.value})} placeholder={f.placeholder} style={{background:"white",border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"inherit",width:"100%",minHeight:80,resize:"vertical"}}/>
                  :<Input value={info[sec.key]?.[f.k]||""} onChange={e=>upd(sec.key,{...info[sec.key],[f.k]:e.target.value})} placeholder={f.placeholder}/>
                }
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

/* ── Tab Convertisseur ── */
export function TabConvertisseur({ currency }) {
  const [amount,setAmount] = useState("100")
  const [from,setFrom]     = useState("EUR")
  const [to,setTo]         = useState(currency||"USD")
  const [rates,setRates]   = useState(null)
  const [loading,setLoading] = useState(false)
  const [error,setError]   = useState("")
  const fetchRates = async () => {
    setLoading(true); setError("")
    try { const r=await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);const d=await r.json();setRates(d.rates) }
    catch { const approx={EUR:1,USD:1.08,GBP:0.86,JPY:163,CHF:0.96,CAD:1.47,AUD:1.64,MAD:10.8,TRY:35,THB:38};const base=approx[from]||1;const r={};Object.entries(approx).forEach(([k,v])=>r[k]=v/base);setRates(r);setError("Taux approximatifs (hors ligne)") }
    setLoading(false)
  }
  useEffect(()=>{fetchRates()},[from])
  const result = rates&&amount ? ((parseFloat(amount)||0)*rates[to]).toFixed(2) : "—"
  const toSym  = CURRENCIES.find(c=>c.code===to)?.symbol||to
  const PAIRS  = CURRENCIES.filter(c=>c.code!==from).slice(0,6)
  return (
    <div className="fade-up">
      <Card><Label>💱 Convertisseur</Label>
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{flex:1,fontSize:20,fontWeight:700,minWidth:120}}/><Sel value={from} onChange={e=>setFrom(e.target.value)} style={{flex:1,minWidth:150}}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.name}</option>)}</Sel></div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{flex:1,height:1,background:C.border}}/><div onClick={()=>{const tmp=from;setFrom(to);setTo(tmp)}} style={{width:32,height:32,borderRadius:"50%",background:C.accentSoft,border:"1.5px solid #bfdbfe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer",flexShrink:0}}>⇅</div><div style={{flex:1,height:1,background:C.border}}/></div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}><div style={{flex:1,background:C.accentSoft,border:"1.5px solid #bfdbfe",borderRadius:12,padding:"16px 14px",textAlign:"center",minWidth:120}}><div style={{fontSize:30,fontWeight:800,color:C.accent}}>{result}</div><div style={{fontSize:12,color:C.mutedDark,marginTop:3}}>{toSym} · {CURRENCIES.find(c=>c.code===to)?.name}</div></div><Sel value={to} onChange={e=>setTo(e.target.value)} style={{flex:1,minWidth:150}}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.name}</option>)}</Sel></div>
        {error&&<div style={{fontSize:12,color:C.muted,marginBottom:8}}>⚠️ {error}</div>}
        <Btn variant="ghost" onClick={fetchRates} disabled={loading} style={{width:"100%",justifyContent:"center"}}>{loading?<><Spinner/> Chargement…</>:"🔄 Actualiser"}</Btn>
      </Card>
      {rates&&<Card><Label>Taux rapides — 1 {from}</Label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{PAIRS.map(c=>(<div key={c.code} onClick={()=>setTo(c.code)} style={{background:to===c.code?C.accentSoft:"#fafbfc",border:`1.5px solid ${to===c.code?C.borderFocus:C.border}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",transition:"all .15s"}}><div style={{fontSize:11,color:C.muted,marginBottom:3}}>{c.name}</div><div style={{fontWeight:700,fontSize:16,color:to===c.code?C.accent:C.text}}>{c.symbol}{(rates[c.code]||0).toFixed(c.code==="JPY"||c.code==="THB"?0:3)}</div></div>))}</div></Card>}
    </div>
  )
}
