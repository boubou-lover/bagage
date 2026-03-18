import { useState, useEffect, useRef } from 'react'
import { C, uid, debounce } from '../constants'
import { fbListen, fbUpdate, fbGet, fbSet } from '../firebase'
import { Icon, Spinner } from './atoms'
import TabDocs from './TabDocs'
import { ShareModal, TabSynthese, TabProgramme, TabBudget, TabBagages, TabInfo, TabConvertisseur } from './tabs'

export default function TripApp({ user, trip, onBack }) {
  const [tab,setTab]         = useState("programme")
  const [syncing,setSyncing] = useState(false)
  const [showShare,setShowShare] = useState(false)

  const [destination,setDestination] = useState(trip.destination||"")
  const [days,setDays]               = useState(trip.days||[{id:uid(),date:"",events:[],note:"",weather:null}])
  const [expenses,setExpenses]       = useState(trip.expenses||[])
  const [budget,setBudget]           = useState(trip.budget||"")
  const [currency,setCurrency]       = useState(trip.currency||"EUR")
  const [checked,setChecked]         = useState(trip.checked||{})
  const [members,setMembers]         = useState(trip.members||{})
  const [withDevises,setWithDevises] = useState(trip.withDevises!==false)
  const [info,setInfo]               = useState(trip.info||{})

  const isRemote    = useRef(false)
  const initialized = useRef(false)
  const saveRef     = useRef(debounce((path,data) => {
    setSyncing(true)
    fbUpdate(path, data)
    setTimeout(() => setSyncing(false), 1000)
  }, 1500))

  // Listen Firebase → state
  useEffect(() => {
    fbListen(`trips/${trip.id}`, data => {
      if (!data) return
      isRemote.current = true
      if (typeof data.destination==="string")           setDestination(data.destination)
      if (Array.isArray(data.days)&&data.days.length>0) setDays(data.days)
      if (Array.isArray(data.expenses))                 setExpenses(data.expenses)
      if (typeof data.budget==="string"||typeof data.budget==="number") setBudget(data.budget)
      if (data.currency)                                setCurrency(data.currency)
      if (data.checked&&typeof data.checked==="object") setChecked(data.checked)
      if (data.members&&typeof data.members==="object") setMembers(data.members)
      if (typeof data.withDevises==="boolean")          setWithDevises(data.withDevises)
      if (data.info&&typeof data.info==="object")       setInfo(data.info)
      initialized.current = true
      setTimeout(() => { isRemote.current = false }, 200)
    })
  }, [trip.id])

  // state → Firebase (debounced)
  useEffect(() => {
    if (isRemote.current||!initialized.current) return
    saveRef.current(`trips/${trip.id}`, {destination,days,expenses,budget,currency,checked,withDevises,info})
  }, [destination,days,expenses,budget,currency,checked])

  const memberCount = Object.keys(members).length

  const TABS = [
    {id:"synthese",  lucide:"Map",          label:"Synthèse"},
    {id:"programme", lucide:"CalendarDays", label:"Programme"},
    {id:"budget",    lucide:"Wallet",       label:"Budget"},
    {id:"bagages",   lucide:"Luggage",      label:"Bagages"},
    {id:"docs",      lucide:"FolderOpen",   label:"Docs"},
    {id:"info",      lucide:"Info",         label:"Infos"},
    ...(withDevises?[{id:"convertir",lucide:"ArrowLeftRight",label:"Devises"}]:[]),
  ]

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,paddingBottom:80}}>
      <div className="safe-top" style={{background:"white",borderBottom:`1px solid ${C.border}`,boxShadow:C.shadow,position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:680,margin:"0 auto",padding:"12px 16px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <button onClick={onBack} style={{background:C.accentSoft,border:`1px solid #bfdbfe`,borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",color:C.accent,padding:"6px 12px",flexShrink:0,fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
              <Icon name="ChevronLeft" size={15} color={C.accent}/>Accueil
            </button>
            <input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Destination…"
              style={{flex:1,border:"none",outline:"none",fontSize:"clamp(14px,3vw,20px)",fontWeight:700,color:C.text,background:"transparent",fontFamily:"'DM Sans',sans-serif"}}/>
            <button onClick={()=>setShowShare(true)}
              style={{background:C.accentSoft,border:`1px solid #bfdbfe`,borderRadius:20,padding:"5px 12px",fontSize:12,color:C.accent,cursor:"pointer",fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
              <Icon name="Users" size={14} color={C.accent}/> {memberCount}
            </button>
            <span className={syncing?"pulsing":""} style={{width:7,height:7,borderRadius:"50%",background:syncing?"#f59e0b":C.green,flexShrink:0,transition:"background .3s"}}/>
          </div>
          <div style={{display:"flex",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            {TABS.map(t => (
              <button key={t.id} className="tab-btn" onClick={()=>setTab(t.id)}
                style={{background:"transparent",border:"none",borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`,
                  color:tab===t.id?C.accent:C.mutedDark,padding:"8px 10px 10px",fontSize:11,cursor:"pointer",
                  fontFamily:"inherit",fontWeight:tab===t.id?700:500,whiteSpace:"nowrap",flexShrink:0,
                  display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <Icon name={t.lucide} size={17} color={tab===t.id?C.accent:C.mutedDark}/>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:680,margin:"0 auto",padding:"16px 14px 0"}}>
        {tab==="synthese"  && <TabSynthese   days={days} expenses={expenses} destination={destination} currency={currency}/>}
        {tab==="programme" && <TabProgramme  days={days} setDays={setDays} destination={destination}/>}
        {tab==="budget"    && <TabBudget     expenses={expenses} setExpenses={setExpenses} budget={budget} setBudget={setBudget} currency={currency} setCurrency={setCurrency} days={days} members={members}/>}
        {tab==="bagages"   && <TabBagages    checked={checked} setChecked={setChecked}/>}
        {tab==="docs"      && <TabDocs       tripId={trip.id} user={user}/>}
        {tab==="info"      && <TabInfo       info={info} setInfo={setInfo} currency={currency} withDevises={withDevises} setWithDevises={setWithDevises}/>}
        {tab==="convertir" && <TabConvertisseur currency={currency}/>}
      </div>

      {showShare && <ShareModal trip={{...trip,members}} user={user} onClose={()=>setShowShare(false)}/>}
    </div>
  )
}
