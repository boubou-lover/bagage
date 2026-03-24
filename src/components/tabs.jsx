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
      <div style={{background:`linear-gradient(135deg,${C.accent},${C.sky})`,borderRadius:20,padding:"20px 24px",marginBottom:12,boxShadow:"0 4px 20px rgba(37,99,235,0.2)",color:"white"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
          <div style={{fontSize:36}}>✈️</div>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:"clamp(18px,4vw,26px)",fontWeight:400,lineHeight:1.2}}>{destination||"Mon Voyage"}</div>
            {days[0]?.date&&(
              <div style={{opacity:0.85,fontSize:13,marginTop:3}}>
                {new Date(days[0].date+"T00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}
                {days.length>1&&days[days.length-1]?.date&&<> → {new Date(days[days.length-1].date+"T00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</>}
              </div>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {[
            {v:days.length, l:"jours", i:"📅"},
            {v:days.reduce((s,d)=>s+(d.events||[]).length,0), l:"activités", i:"🎯"},
            {v:fmt(total,sym), l:"dépensés", i:"💰"},
          ].map(s=>(
            <div key={s.l} style={{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:12,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:11,opacity:0.85,marginTop:4}}>{s.i} {s.l}</div>
            </div>
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
  const addEvent = (dayId, text, time) => {
  if (!text.trim()) return
  setDays(days.map(d => {
    if (d.id !== dayId) return d
    const events = [...(d.events || []), { id: uid(), text: text.trim(), time }]
    events.sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })
    return { ...d, events }
  }))
}
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
      {subTab==="depenses"&&<Card>{expenses.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"20px 0"}}>Aucune dépense</div>}{expenses.map(exp=>{const cat=CATS.find(c=>c.id===exp.category);const dayIdx=days.findIndex(d=>d.id===exp.dayId);return(<div key={exp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${C.border}`}}><span style={{width:34,height:34,borderRadius:10,background:cat?.soft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat?.icon}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:500}}>{exp.label}</div><div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>{dayIdx>=0&&<Tag color={C.accent} soft={C.accentSoft}>J{dayIdx+1}</Tag>}{exp.paidBy&&<Tag color={C.purple} soft={C.purpleSoft}>{exp.paidBy}</Tag>}</div></div>{exp.receipt&&<img
    src={exp.receipt}
    style={{ width: 30, height: 30, borderRadius: 6, objectFit: "cover", flexShrink: 0, cursor: "pointer" }}
    alt="reçu"
    loading="lazy"
    onClick={() => window.open(exp.receipt, "_blank")}
  />}<span style={{fontWeight:700,color:cat?.color,minWidth:55,textAlign:"right",flexShrink:0}}>{fmt(parseFloat(exp.amount)||0,sym)}</span><button onClick={()=>setExpenses(expenses.filter(e=>e.id!==exp.id))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18}}>×</button></div>)})}</Card>}
      {subTab==="stats"&&<div>{byCat.length>0&&<Card><Label>Par catégorie</Label><div style={{display:"flex",alignItems:"center",gap:20}}><PieChart data={byCat} size={120}/><div style={{flex:1}}>{byCat.map(c=>(<div key={c.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{width:10,height:10,borderRadius:3,background:c.color,flexShrink:0}}/><span style={{flex:1,fontSize:13}}>{c.icon} {c.label}</span><span style={{color:c.color,fontWeight:700,fontSize:13}}>{fmt(c.value,sym)}</span><span style={{color:C.muted,fontSize:11,minWidth:28,textAlign:"right"}}>{total>0?((c.value/total)*100).toFixed(0):0}%</span></div>))}</div></div></Card>}{byDay.some(d=>d.value>0)&&<Card><Label>Par jour</Label>{byDay.filter(d=>d.value>0).map((d,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:13,color:C.mutedDark,minWidth:32,fontWeight:600}}>{d.label}</span><div style={{flex:1,height:6,borderRadius:3,background:C.border,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:C.accent,width:total>0?`${(d.value/total)*100}%`:"0%",transition:"width .4s"}}/></div><span style={{fontWeight:700,color:C.accent,fontSize:13,minWidth:55,textAlign:"right"}}>{fmt(d.value,sym)}</span></div>))}</Card>}</div>}
      {subTab==="partage"&&<Card><Label>Partage des dépenses</Label>{travelers.length<2?<div style={{color:C.muted,fontSize:13}}>Ajoute au moins 2 voyageurs.</div>:(()=>{const share=total/travelers.length;return(<><div style={{fontSize:13,color:C.mutedDark,marginBottom:14,padding:"10px 14px",background:C.yellowSoft,borderRadius:10,border:"1px solid #fde68a"}}>Part équitable : <b style={{color:C.yellow}}>{fmt(share,sym)}</b> / personne</div>{byTraveler.map(t=>{const diff=t.paid-share;return(<div key={t.name} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${C.border}`}}><span style={{width:34,height:34,borderRadius:"50%",background:C.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>👤</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{t.name}</div><div style={{fontSize:12,color:C.muted}}>Payé : {fmt(t.paid,sym)}</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:15,color:diff>=0?C.green:C.red}}>{diff>=0?"+":""}{fmt(diff,sym)}</div><div style={{fontSize:11,color:C.muted}}>{diff>=0?"à recevoir":"doit payer"}</div></div></div>)})}</>)})()}</Card>}
    </div>
  )
}

/* ── Tab Bagages ── */
export function TabBagages({ checked, setChecked, customItems={}, setCustomItems, removedItems={}, setRemovedItems }) {
  const [newItem, setNewItem] = useState({})

  const toggle = id => setChecked(p => ({ ...p, [id]: !p[id] }))

  const addItem = catId => {
    const text = (newItem[catId] || "").trim()
    if (!text) return
    const id = `${catId}__custom__${uid()}`
    setCustomItems(p => ({ ...p, [catId]: [...(p[catId] || []), { id, text }] }))
    setNewItem(p => ({ ...p, [catId]: "" }))
  }

  const removeItem = (catId, item) => {
    if (item.custom) {
      setCustomItems(p => ({ ...p, [catId]: (p[catId] || []).filter(i => i.id !== item.id) }))
    } else {
      setRemovedItems(p => ({ ...p, [item.id]: true }))
    }
    setChecked(p => { const next = { ...p }; delete next[item.id]; return next })
  }

  const allItems = cat => [
    ...cat.items
      .map(text => ({ id: `${cat.id}__${text}`, text, custom: false }))
      .filter(item => !removedItems[item.id]),
    ...(customItems[cat.id] || []).map(i => ({ ...i, custom: true })),
  ]

  const total = PACK_ITEMS.reduce((s, c) => s + allItems(c).length, 0)
  const done  = Object.values(checked || {}).filter(Boolean).length

  return (
    <div className="fade-up">
      <Card style={{textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:6}}>🧳</div>
        <div style={{fontWeight:800,fontSize:22,color:C.text,marginBottom:4}}>{done}/{total}</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:12}}>articles préparés</div>
        <div style={{height:6,borderRadius:3,background:C.border,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:3,
            background: done===total&&total>0
              ? `linear-gradient(90deg,${C.green},${C.teal})`
              : `linear-gradient(90deg,${C.accent},${C.sky})`,
            width:`${total>0?(done/total)*100:0}%`,transition:"width .5s"}}/>
        </div>
      </Card>

      {PACK_ITEMS.map(cat => {
        const items = allItems(cat)
        const catDone = items.filter(i => !!(checked||{})[i.id]).length
        return (
          <Card key={cat.id}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <Label>{cat.icon} {cat.label}</Label>
              <span style={{
                fontSize:12,fontWeight:600,borderRadius:20,padding:"2px 10px",
                color: catDone===items.length&&items.length>0 ? C.green : C.muted,
                background: catDone===items.length&&items.length>0 ? C.greenSoft : C.surface2,
                border:`1px solid ${catDone===items.length&&items.length>0 ? C.green+"40" : C.border}`,
                transition:"all .2s"
              }}>
                {catDone}/{items.length}
              </span>
            </div>

            {items.map(item => {
              const chk = !!(checked||{})[item.id]
              return (
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <div className="check-item" onClick={()=>toggle(item.id)}
                    style={{flex:1,display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
                      borderRadius:10,cursor:"pointer",background:chk?C.greenSoft:"transparent"}}>
                    <div style={{width:22,height:22,borderRadius:6,flexShrink:0,
                      border:`2px solid ${chk?C.green:C.border}`,background:chk?C.green:"white",
                      display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                      {chk&&<span style={{color:"white",fontSize:13,fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{fontSize:14,color:chk?C.green:C.text,
                      textDecoration:chk?"line-through":"none",transition:"all .15s",flex:1}}>
                      {item.text}
                    </span>
                  </div>
                  <button onClick={()=>removeItem(cat.id, item)}
                    style={{background:"none",border:"none",color:C.muted,cursor:"pointer",
                      fontSize:18,padding:"4px 8px",borderRadius:6,flexShrink:0,transition:"color .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.color=C.red}
                    onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
                    ×
                  </button>
                </div>
              )
            })}

            <div style={{display:"flex",gap:8,marginTop:12,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
              <Input
                value={newItem[cat.id]||""}
                onChange={e=>setNewItem(p=>({...p,[cat.id]:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&addItem(cat.id)}
                placeholder="Ajouter un article…"
                style={{flex:1,fontSize:13,padding:"9px 12px"}}
              />
              <Btn variant="accent" small onClick={()=>addItem(cat.id)}
                disabled={!(newItem[cat.id]||"").trim()}>
                + Ajouter
              </Btn>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ── Tab Info ── */
/* ── Constantes locales ── */
const PLACE_CATS = [
  { id: "hebergement", label: "Hébergement", icon: "🏨", color: "#0d9488" },
  { id: "restaurant",  label: "Restaurant",  icon: "🍽️", color: "#ea580c" },
  { id: "musee",       label: "Musée / Site", icon: "🏛️", color: "#7c3aed" },
  { id: "shopping",    label: "Shopping",    icon: "🛍️", color: "#dc2626" },
  { id: "contact",     label: "Contact",     icon: "👤", color: "#2563eb" },
  { id: "autre",       label: "Autre",       icon: "📍", color: "#64748b" },
  ]
const TRANSPORT_TYPES = [
  { id: "avion",   label: "Avion",    icon: "✈️" },
  { id: "train",   label: "Train",    icon: "🚄" },
  { id: "bus",     label: "Bus",      icon: "🚌" },
  { id: "bateau",  label: "Bateau",   icon: "⛴️" },
  { id: "voiture", label: "Voiture",  icon: "🚗" },
  { id: "autre",   label: "Autre",    icon: "🚀" },
]

/* Géocode une adresse via Nominatim (OSM) */
async function geocode(query) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
    { headers: { "Accept-Language": "fr" } }
  )
  const d = await r.json()
  if (!d.length) throw new Error("Adresse introuvable")
  return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon), display: d[0].display_name }
}

/* ── Carte Leaflet ── */
function InfoMap({ places }) {
  const mapRef     = useRef(null)
  const mapObj     = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return

    const init = () => {
      const L = window.L
      if (!L || !mapRef.current) return
      mapObj.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false
      })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19
      }).addTo(mapObj.current)
      setTimeout(() => mapObj.current?.invalidateSize(), 100)
    }

    if (window.L) {
      init()
    } else {
      const existing = document.querySelector('script[src*="leaflet"]')
      if (existing) {
        existing.addEventListener('load', init)
      } else {
        const s = document.createElement('script')
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        s.onload = init
        document.head.appendChild(s)
      }
    }

    return () => {
      if (mapObj.current) { mapObj.current.remove(); mapObj.current = null }
    }
  }, [])

  useEffect(() => {
    const L = window.L
    if (!L || !mapObj.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    const valid = places.filter(p => p.lat && p.lng)
    if (!valid.length) return
    valid.forEach(p => {
      const cat = PLACE_CATS.find(c => c.id === p.category) || PLACE_CATS[6]
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${cat.color};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid white;">${cat.icon}</div>`,
        iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18]
      })
      const marker = L.marker([p.lat, p.lng], { icon })
        .bindPopup(`<div style="font-family:'DM Sans',sans-serif;min-width:160px">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${p.name}</div>
          ${p.address ? `<div style="font-size:12px;color:#64748b;margin-bottom:4px">${p.address}</div>` : ""}
          ${p.note    ? `<div style="font-size:12px;color:#475569;font-style:italic">${p.note}</div>` : ""}
        </div>`)
        .addTo(mapObj.current)
      markersRef.current.push(marker)
    })
    if (valid.length === 1) {
      mapObj.current.setView([valid[0].lat, valid[0].lng], 14)
    } else {
      const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]))
      mapObj.current.fitBounds(bounds, { padding: [40, 40] })
    }
    setTimeout(() => mapObj.current?.invalidateSize(), 50)
  }, [places])

  return (
    <div ref={mapRef} style={{
      height: 280, borderRadius: 14, overflow: "hidden",
      border: `1px solid ${C.border}`, marginBottom: 14,
      background: "#e8f0f7"
    }}/>
  )
}

/* ── Formulaire d'ajout/édition d'une adresse ── */
function PlaceForm({ initial, onSave, onCancel }) {
  const [form, setForm]           = useState(initial || { name: "", address: "", category: "hebergement", note: "", tel: "" })
  const [geocoding, setGeocoding] = useState(false)
  const [geoErr, setGeoErr]       = useState("")

  const handleGeocode = async () => {
    if (!form.address.trim()) return
    setGeocoding(true); setGeoErr("")
    try {
      const { lat, lng } = await geocode(form.address)
      setForm(f => ({ ...f, lat, lng }))
    } catch { setGeoErr("Adresse introuvable — vérifie et réessaie") }
    setGeocoding(false)
  }

  const isValid = form.name.trim() && form.address.trim()

  return (
    <div style={{ background: C.surface2, border: `1.5px solid ${C.borderFocus}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Nom *</div>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Hôtel Sakura"/>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Catégorie</div>
          <Sel value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: "100%" }}>
            {PLACE_CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </Sel>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Note</div>
          <Input value={form.note || ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Chambre 204, code #1234…"/>
        </div>
        {/* ── Téléphone (hébergement, restaurant, contact) ── */}
        {["hebergement", "restaurant", "contact"].includes(form.category) && (
          <div style={{ gridColumn: "1/-1" }}>
            <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Téléphone</div>
            <Input
              type="tel"
              value={form.tel || ""}
              onChange={e => setForm(f => ({ ...f, tel: e.target.value }))}
              placeholder="+81 3 1234 5678"
            />
          </div>
        )}
        <div style={{ gridColumn: "1/-1" }}>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Adresse *</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Input
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value, lat: null, lng: null }))}
              onKeyDown={e => e.key === "Enter" && handleGeocode()}
              placeholder="123 rue de la Paix, Tokyo"
              style={{ flex: 1 }}
            />
            <Btn variant={form.lat ? "green" : "accent"} small onClick={handleGeocode} disabled={!form.address.trim()} loading={geocoding} style={{ flexShrink: 0 }}>
              {form.lat ? "✓ Localisé" : "📍 Localiser"}
            </Btn>
          </div>
          {geoErr && <div style={{ fontSize: 12, color: C.red, marginTop: 4 }}>⚠️ {geoErr}</div>}
          {!form.lat && !geoErr && form.address && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Clique sur "Localiser" pour placer sur la carte</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => onSave(form)} disabled={!isValid}>Enregistrer</Btn>
        <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
      </div>
    </div>
  )
}

function TransportForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    type: "avion", numero: "", compagnie: "", depart: "", arrivee: "",
    heureDepart: "", heureArrivee: "", terminal: "", note: ""
  })
  const t = TRANSPORT_TYPES.find(t => t.id === form.type) || TRANSPORT_TYPES[0]
  const isValid = form.depart.trim() && form.arrivee.trim()

  return (
    <div style={{ background: C.surface2, border: `1.5px solid #0ea5e930`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>{t.icon}</span>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Nouveau transport</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Type</div>
          <Sel value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: "100%" }}>
            {TRANSPORT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
          </Sel>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>N° vol / train</div>
          <Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="AF1234"/>
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Compagnie</div>
          <Input value={form.compagnie} onChange={e => setForm(f => ({ ...f, compagnie: e.target.value }))} placeholder="Air France, SNCF…"/>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Départ *</div>
          <Input value={form.depart} onChange={e => setForm(f => ({ ...f, depart: e.target.value }))} placeholder="Paris CDG"/>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Arrivée *</div>
          <Input value={form.arrivee} onChange={e => setForm(f => ({ ...f, arrivee: e.target.value }))} placeholder="Tokyo HND"/>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Heure départ</div>
          <Input type="time" value={form.heureDepart} onChange={e => setForm(f => ({ ...f, heureDepart: e.target.value }))}/>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Heure arrivée</div>
          <Input type="time" value={form.heureArrivee} onChange={e => setForm(f => ({ ...f, heureArrivee: e.target.value }))}/>
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Terminal / Quai / Gate</div>
          <Input value={form.terminal} onChange={e => setForm(f => ({ ...f, terminal: e.target.value }))} placeholder="Terminal 2E, Quai 4…"/>
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>Note</div>
          <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Bagage en soute, check-in en ligne…"/>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <label style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 10,
          padding: "8px 12px", fontSize: 13, color: C.mutedDark
        }}>
          📸 {form.ticketImage ? "Ticket joint ✓" : "Joindre ticket / QR code"}
          <input type="file" accept="image/*" onChange={e => {
            const f = e.target.files?.[0]; if (!f) return
            const r = new FileReader(); r.onload = ev => setForm(f => ({ ...f, ticketImage: ev.target.result })); r.readAsDataURL(f)
          }} style={{ display: "none" }}/>
        </label>
        {form.ticketImage && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <img src={form.ticketImage} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: `1px solid ${C.border}`, display: "block" }} alt="ticket"/>
            <button onClick={() => setForm(f => ({ ...f, ticketImage: null }))}
              style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: C.red, border: "none", color: "white", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, background: C.yellowSoft, border: "1px solid #fde68a", borderRadius: 8, padding: "8px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
          <span>🧪</span>
          <b style={{ color: C.yellow }}>Fonctionnalité expérimentale</b>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          L'image est stockée dans Firebase et <b>visible par tous les membres du voyage</b>. Ne partage pas de documents contenant des <b>données bancaires, mots de passe ou informations sensibles</b>. Privilégie les QR codes et codes-barres de billets.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => onSave({ ...form, _isTransport: true })} disabled={!isValid}>Enregistrer</Btn>
        <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
      </div>
    </div>
  )
}

function TransportCard({ transport, onEdit, onDelete, onToggle, expanded }) {
  const t = TRANSPORT_TYPES.find(t => t.id === transport.type) || TRANSPORT_TYPES[0]
  const color = "#0ea5e9"
  return (
    <div style={{
      background: "white", border: `1.5px solid ${expanded ? color + "60" : C.border}`,
      borderRadius: 14, marginBottom: 8, overflow: "hidden",
      boxShadow: expanded ? `0 4px 16px ${color}18` : C.shadow,
      transition: "border-color .2s, box-shadow .2s"
    }}>
      <div onClick={onToggle} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
        cursor: "pointer", background: expanded ? color + "08" : "white", transition: "background .2s"
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
          background: color + "18", border: `1.5px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19
        }}>
          {t.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 1 }}>
            {transport.depart} → {transport.arrivee}
          </div>
          <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Tag color={color} soft={color + "14"}>{t.icon} {t.label}</Tag>
            {transport.numero && <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{transport.numero}</span>}
            {transport.heureDepart && <span>{transport.heureDepart}{transport.heureArrivee ? ` → ${transport.heureArrivee}` : ""}</span>}
          </div>
        </div>
        <span style={{
          color: C.muted, fontSize: 16, transition: "transform .25s",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0
        }}>⌄</span>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${color}20`, padding: "14px 16px", background: color + "04" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              { label: "Départ", value: transport.depart + (transport.heureDepart ? ` à ${transport.heureDepart}` : "") },
              { label: "Arrivée", value: transport.arrivee + (transport.heureArrivee ? ` à ${transport.heureArrivee}` : "") },
              transport.compagnie && { label: "Compagnie", value: transport.compagnie },
              transport.numero    && { label: "N° vol / train", value: transport.numero },
              transport.terminal  && { label: "Terminal / Quai", value: transport.terminal },
            ].filter(Boolean).map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: C.textSoft, fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
          {transport.note && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Note</div>
              <div style={{ fontSize: 13, color: C.textSoft, fontStyle: "italic" }}>{transport.note}</div>
            </div>
          )}
          {transport.ticketImage && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Ticket</div>
              <img
                src={transport.ticketImage}
                alt="Ticket"
                style={{ maxWidth: "100%", borderRadius: 10, border: `1px solid ${C.border}`, display: "block", cursor: "pointer" }}
                onClick={() => window.open(transport.ticketImage, "_blank")}
              />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, padding: "6px 8px", background: C.yellowSoft, borderRadius: 6, border: "1px solid #fde68a", lineHeight: 1.5 }}>
                🧪 Expérimental · Cliquer pour agrandir · <b style={{ color: C.yellow }}>Visible par tous les membres</b> — ne pas partager de données sensibles
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onEdit} style={{ fontSize: 12, color: C.textSoft, background: "white", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>✏️ Modifier</button>
            <button onClick={onDelete} style={{ fontSize: 12, color: C.red, background: C.redSoft, border: `1px solid #fecaca`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>🗑 Supprimer</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Carte compacte d'une adresse (liste) ── */
function PlaceCard({ place, onEdit, onDelete, onToggle, expanded }) {
  const cat = PLACE_CATS.find(c => c.id === place.category) || PLACE_CATS[6]
  return (
    <div style={{
      background: "white", border: `1.5px solid ${expanded ? cat.color + "60" : C.border}`,
      borderRadius: 14, marginBottom: 8, overflow: "hidden",
      boxShadow: expanded ? `0 4px 16px ${cat.color}18` : C.shadow,
      transition: "border-color .2s, box-shadow .2s"
    }}>
      {/* En-tête cliquable */}
      <div onClick={onToggle} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
        cursor: "pointer", background: expanded ? cat.color + "08" : "white",
        transition: "background .2s"
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
          background: cat.color + "18", border: `1.5px solid ${cat.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19
        }}>
          {cat.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 1 }}>{place.name}</div>
          <div style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Tag color={cat.color} soft={cat.color + "14"}>{cat.label}</Tag>
            {place.lat && <span style={{ fontSize: 11, color: C.green }}>📍</span>}
            {place.address && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place.address}</span>}
          </div>
        </div>
        <span style={{
          color: C.muted, fontSize: 16, transition: "transform .25s",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0
        }}>⌄</span>
      </div>

      {/* Détail déplié */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${cat.color}20`, padding: "14px 16px", background: cat.color + "04" }}>
          {place.address && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Adresse</div>
              <div style={{ fontSize: 13, color: C.textSoft }}>{place.address}</div>
            </div>
          )}
          {place.note && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Note</div>
              <div style={{ fontSize: 13, color: C.textSoft, fontStyle: "italic" }}>{place.note}</div>
            </div>
          )}
          {/* ── Téléphone cliquable ── */}
          {place.tel && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Téléphone</div>
              <a href={`tel:${place.tel}`}
                style={{ fontSize: 13, color: C.teal, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                📞 {place.tel}
              </a>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {place.address && (
              <button
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(place.address)}`, "_blank")}
                style={{ fontSize: 12, color: C.accent, background: C.accentSoft, border: `1px solid #bfdbfe`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit", fontWeight: 600 }}
              >
                🗺️ Ouvrir dans Maps
              </button>
            )}
            <button onClick={onEdit} style={{ fontSize: 12, color: C.textSoft, background: "white", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              ✏️ Modifier
            </button>
            <button onClick={onDelete} style={{ fontSize: 12, color: C.red, background: C.redSoft, border: `1px solid #fecaca`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              🗑 Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Tab Info principal ── */
export function TabInfo({ info, setInfo, currency, withDevises, setWithDevises }) {
  const upd = (k, v) => setInfo(p => ({ ...p, [k]: v }))

  const places     = (info.places || []).filter(p => !p._isTransport)
  const transports = (info.places || []).filter(p => p._isTransport)
  const setAll     = newAll => setInfo(p => ({ ...p, places: newAll }))
  const allItems   = info.places || []

  const [showForm,    setShowForm]    = useState(null)
  const [editIdx,     setEditIdx]     = useState(null)
  const [expandedId,  setExpandedId]  = useState(null)
  const [openSection, setOpenSection] = useState(null)

  const saveItem = form => {
    if (editIdx !== null) {
      const next = [...allItems]; next[editIdx] = { ...next[editIdx], ...form }
      setAll(next); setEditIdx(null)
    } else {
      setAll([...allItems, { id: uid(), ...form }])
      setShowForm(null)
    }
  }

  const deleteItem = idx => {
    if (!window.confirm("Supprimer ?")) return
    const item = allItems[idx]
    if (expandedId === (item.id || idx)) setExpandedId(null)
    setAll(allItems.filter((_, i) => i !== idx))
  }

  const SECTIONS = [
    { key: "urgences", icon: "🆘", label: "Urgences & Ambassade", fields: [
      { k: "urgence",   label: "N° urgences local", placeholder: "112 / 911" },
      { k: "ambassade", label: "Ambassade",          placeholder: "+33 1 44 05 31 00" },
      { k: "assurance", label: "N° assurance",       placeholder: "0800 123 456" },
      { k: "hopital",   label: "Hôpital proche",     placeholder: "Hôpital Central" },
    ]},
    { key: "divers", icon: "📝", label: "Notes libres", fields: [
      { k: "notes", label: "Notes", placeholder: "Infos pratiques, conseils…" },
    ]},
  ]

  const renderItem = (item, realIdx) => {
    const key = item.id || realIdx
    if (editIdx === realIdx) {
      return item._isTransport
        ? <TransportForm key={key} initial={item} onSave={saveItem} onCancel={() => setEditIdx(null)}/>
        : <PlaceForm     key={key} initial={item} onSave={saveItem} onCancel={() => setEditIdx(null)}/>
    }
    return item._isTransport
      ? <TransportCard key={key} transport={item}
          expanded={expandedId === key}
          onToggle={() => setExpandedId(expandedId === key ? null : key)}
          onEdit={() => { setEditIdx(realIdx); setExpandedId(null) }}
          onDelete={() => deleteItem(realIdx)}/>
      : <PlaceCard key={key} place={item}
          expanded={expandedId === key}
          onToggle={() => setExpandedId(expandedId === key ? null : key)}
          onEdit={() => { setEditIdx(realIdx); setExpandedId(null) }}
          onDelete={() => deleteItem(realIdx)}/>
  }

  return (
    <div className="fade-up" style={{ paddingBottom: 160 }}>

      {/* ── Toggle Devises ── */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>Onglet Devises</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Utile si la devise locale est différente</div>
          </div>
          <button onClick={() => setWithDevises(v => !v)}
            style={{ width: 44, height: 24, borderRadius: 12, background: withDevises ? C.accent : C.border, border: "none", cursor: "pointer", transition: "background .2s", position: "relative", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 3, left: withDevises ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}/>
          </button>
        </div>
      </Card>

      {/* ── Carte Leaflet ── */}
      {allItems.some(p => p.lat) && <InfoMap places={allItems.filter(p => p.lat)}/>}

      {/* ── Transports ── */}
      {transports.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            ✈️ {transports.length} transport{transports.length > 1 ? "s" : ""}
          </div>
          {allItems.map((item, idx) => item._isTransport ? renderItem(item, idx) : null)}
        </div>
      )}

      {/* ── Lieux ── */}
      {places.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            📍 {places.length} lieu{places.length > 1 ? "x" : ""} enregistré{places.length > 1 ? "s" : ""}
          </div>
          {allItems.map((item, idx) => !item._isTransport ? renderItem(item, idx) : null)}
        </div>
      )}

      {/* Formulaire actif */}
      {showForm === "lieu"      && editIdx === null && <PlaceForm     onSave={saveItem} onCancel={() => setShowForm(null)}/>}
      {showForm === "transport" && editIdx === null && <TransportForm onSave={saveItem} onCancel={() => setShowForm(null)}/>}

      {/* Vide state */}
      {allItems.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: "28px 20px", color: C.muted, background: "white", borderRadius: 14, border: `1.5px dashed ${C.border}`, marginBottom: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Aucun lieu ni transport</div>
          <div style={{ fontSize: 13 }}>Ajoute ton hôtel, un vol, un restaurant…</div>
        </div>
      )}

      {/* ── Sections dépliables ── */}
      <div style={{ marginTop: 6 }}>
        {SECTIONS.map(sec => (
          <div key={sec.key} style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 10, overflow: "hidden", boxShadow: C.shadow }}>
            <button onClick={() => setOpenSection(openSection === sec.key ? null : sec.key)}
              style={{ width: "100%", background: "none", border: "none", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{sec.icon} {sec.label}</span>
              <span style={{ color: C.muted, fontSize: 18, transition: "transform .2s", transform: openSection === sec.key ? "rotate(180deg)" : "rotate(0deg)" }}>⌄</span>
            </button>
            {openSection === sec.key && (
              <div style={{ padding: "14px 16px 16px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {sec.fields.map(f => (
                    <div key={f.k} style={{ gridColumn: f.k === "notes" ? "1/-1" : "auto" }}>
                      <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 4, fontWeight: 600 }}>{f.label}</div>
                      {f.k === "notes"
                        ? <textarea value={info[sec.key]?.[f.k] || ""} onChange={e => upd(sec.key, { ...info[sec.key], [f.k]: e.target.value })} placeholder={f.placeholder}
                            style={{ background: "white", border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, padding: "10px 14px", fontSize: 13, outline: "none", fontFamily: "inherit", width: "100%", minHeight: 80, resize: "vertical" }}/>
                        : <Input value={info[sec.key]?.[f.k] || ""} onChange={e => upd(sec.key, { ...info[sec.key], [f.k]: e.target.value })} placeholder={f.placeholder}/>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Deux boutons fixes en bas ── */}
      {!showForm && editIdx === null && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          zIndex: 200, width: "calc(100% - 32px)", maxWidth: 648,
          display: "flex", gap: 10
        }}>
          <button onClick={() => setShowForm("transport")} style={{
            flex: 1, background: "#0ea5e9", border: "none", borderRadius: 14, padding: "13px 16px",
            fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            boxShadow: "0 4px 20px rgba(14,165,233,0.4)"
          }}>
            ✈️ Transport
          </button>
          <button onClick={() => setShowForm("lieu")} style={{
            flex: 1, background: C.accent, border: "none", borderRadius: 14, padding: "13px 16px",
            fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            boxShadow: "0 4px 20px rgba(37,99,235,0.35)"
          }}>
            📍 Lieu
          </button>
        </div>
      )}
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
