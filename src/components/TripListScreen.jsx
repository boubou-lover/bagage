import { useState, useEffect } from 'react'
import { C, CURRENCIES, uid } from '../constants'
import { fbListen, fbGet, fbSet } from '../firebase'
import { Input, Sel, Btn, Card, Label, Icon, Avatar, Spinner, Tag } from './atoms'

export default function TripListScreen({ user, onSelectTrip, onSignOut }) {
  const [trips,setTrips]           = useState(null)
  const [creating,setCreating]     = useState(false)
  const [showCreate,setShowCreate] = useState(false)
  const [form,setForm]             = useState({destination:"",country:"",countryCode:"",dateStart:"",dateEnd:"",currency:"EUR",budget:"",description:"",withDevises:true})
  const [countries,setCountries]   = useState([])
  const [loadingCountries,setLoadingCountries] = useState(false)

  // Charger les voyages — tous en parallèle (fix n°3)
  useEffect(() => {
    fbListen(`userTrips/${user.uid}`, async (data) => {
      if (!data) { setTrips([]); return }
      const ids = Object.keys(data)
      const details = await Promise.all(ids.map(id => fbGet(`trips/${id}`)))
      setTrips(ids.map((id,i) => ({id,...details[i]})).filter(t => t.destination!==undefined || t.name))
    })
  }, [user.uid])

  // Charger pays au premier affichage du formulaire
  useEffect(() => {
    if (!showCreate || countries.length>0) return
    setLoadingCountries(true)
    fetch("https://restcountries.com/v3.1/all?fields=name,cca2,currencies,flag")
      .then(r => r.json())
      .then(data => {
        setCountries(data.map(c => ({
          name: c.name.common, code: c.cca2, flag: c.flag||"",
          currency: Object.keys(c.currencies||{})[0]||"",
        })).sort((a,b) => a.name.localeCompare(b.name,"fr")))
      })
      .catch(() => {})
      .finally(() => setLoadingCountries(false))
  }, [showCreate])

  const handleCountryChange = e => {
    const code  = e.target.value
    const found = countries.find(c => c.code===code)
    if (!found) { setForm(f => ({...f,country:"",countryCode:"",currency:"EUR",withDevises:false})); return }
    const sameZone = ["EUR"].includes(found.currency)
    setForm(f => ({...f,country:found.name,countryCode:code,currency:found.currency||"EUR",withDevises:!sameZone}))
  }

  const createTrip = async () => {
    if (!form.destination.trim()) return
    setCreating(true)
    const id = uid()
    let days = [{id:uid(),date:"",events:[],note:"",weather:null}]
    if (form.dateStart && form.dateEnd && form.dateStart<=form.dateEnd) {
      const startD=new Date(form.dateStart+"T00:00"), endD=new Date(form.dateEnd+"T00:00")
      const diff = Math.round((endD-startD)/(1000*60*60*24))+1
      if (diff>0&&diff<=60) days = Array.from({length:diff},(_,i) => {
        const d=new Date(startD); d.setDate(d.getDate()+i)
        return {id:uid(),date:d.toISOString().slice(0,10),events:[],note:"",weather:null}
      })
    }
    const trip = {
      name:form.destination.trim(), destination:form.destination.trim(),
      country:form.country, countryCode:form.countryCode, description:form.description.trim(),
      createdAt:Date.now(), ownerId:user.uid,
      members:{[user.uid]:{name:user.displayName||user.email,email:user.email,role:"owner"}},
      days, expenses:[], budget:form.budget||"", currency:form.currency||"EUR",
      checked:{}, withDevises:form.withDevises, info:{},
    }
    await fbSet(`trips/${id}`, trip)
    await fbSet(`userTrips/${user.uid}/${id}`, true)
    setForm({destination:"",country:"",dateStart:"",dateEnd:"",currency:"EUR",budget:"",description:"",withDevises:true})
    setShowCreate(false); setCreating(false)
    onSelectTrip({id,...trip})
  }

  const deleteTrip = async (e, trip) => {
    e.stopPropagation()
    if (!window.confirm(`Supprimer le voyage "${trip.destination||trip.name}" ? Cette action est irréversible.`)) return
    await fbSet(`trips/${trip.id}`, null)
    const members = trip.members||{}
    await Promise.all(Object.keys(members).map(uid => fbSet(`userTrips/${uid}/${trip.id}`, null)))
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "Voyageur"

  return (
    <div style={{minHeight:"100vh",background:C.bg,paddingBottom:40}}>
      <div style={{background:"white",borderBottom:`1px solid ${C.border}`,boxShadow:C.shadow}}>
        <div style={{maxWidth:600,margin:"0 auto",padding:"18px 16px",display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:24}}>✈️</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:C.text}}>Bagage</div>
            <div style={{fontSize:12,color:C.muted}}>Bonjour, {displayName} 👋</div>
          </div>
          <Avatar name={displayName} photo={user.photoURL} size={36}/>
          <button onClick={onSignOut} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12,padding:"6px 10px",borderRadius:8,fontFamily:"inherit"}}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"24px 16px"}}>
        {!showCreate
          ? <button onClick={()=>setShowCreate(true)}
              style={{width:"100%",background:"white",border:`1.5px dashed ${C.borderFocus}`,borderRadius:16,
                color:C.accent,padding:18,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:20,boxShadow:C.shadow}}>
              <Icon name="PlusCircle" size={20} color={C.accent}/> Nouveau voyage
            </button>
          : <Card style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:C.text}}>✈️ Nouveau voyage</div>
                <button onClick={()=>setShowCreate(false)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>×</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div style={{gridColumn:"1/-1"}}>
                  <Label>Destination *</Label>
                  <Input value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})} placeholder="Ex: Tokyo, Maroc, Road trip…"/>
                </div>
                <div>
                  <Label>Pays</Label>
                  <select value={form.countryCode} onChange={handleCountryChange}
                    style={{background:"white",border:`1.5px solid ${C.border}`,borderRadius:10,color:form.countryCode?C.text:C.muted,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",width:"100%"}}>
                    <option value="">{loadingCountries?"Chargement…":"— Sélectionner —"}</option>
                    {countries.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Devise</Label>
                  <Sel value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} style={{width:"100%"}}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.name}</option>)}
                  </Sel>
                </div>
                <div>
                  <Label>Date départ</Label>
                  <input type="date" value={form.dateStart} onChange={e=>setForm({...form,dateStart:e.target.value})}
                    style={{background:"white",border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",width:"100%"}}/>
                </div>
                <div>
                  <Label>Date retour</Label>
                  <input type="date" value={form.dateEnd} min={form.dateStart||undefined} onChange={e=>setForm({...form,dateEnd:e.target.value})}
                    style={{background:"white",border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",width:"100%"}}/>
                </div>
                <div>
                  <Label>Budget estimé</Label>
                  <Input type="number" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} placeholder="0"/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,paddingTop:20}}>
                  <button onClick={()=>setForm({...form,withDevises:!form.withDevises})}
                    style={{width:38,height:22,borderRadius:11,background:form.withDevises?C.accent:C.border,border:"none",cursor:"pointer",transition:"background .2s",position:"relative",flexShrink:0}}>
                    <span style={{position:"absolute",top:2,left:form.withDevises?18:2,width:18,height:18,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                  </button>
                  <div>
                    <div style={{fontSize:12,color:C.textSoft,fontWeight:500}}>Onglet devises</div>
                    {form.currency&&form.currency!=="EUR"&&<div style={{fontSize:11,color:C.accent}}>Devise détectée : {form.currency}</div>}
                  </div>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <Label>Description / notes</Label>
                  <Input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Voyage de noces, vacances d'été…"/>
                </div>
              </div>
              {form.dateStart&&form.dateEnd&&form.dateStart<=form.dateEnd&&(
                <div style={{background:C.accentSoft,borderRadius:10,padding:"8px 14px",fontSize:13,color:C.accent,fontWeight:600,marginBottom:12,textAlign:"center"}}>
                  📅 {Math.round((new Date(form.dateEnd+"T00:00")-new Date(form.dateStart+"T00:00"))/(1000*60*60*24))+1} jours générés automatiquement
                </div>
              )}
              <Btn onClick={createTrip} loading={creating} full disabled={!form.destination.trim()}>Créer le voyage</Btn>
            </Card>
        }

        {trips===null
          ? <div style={{textAlign:"center",padding:40,color:C.muted}}><Spinner/></div>
          : trips.length===0
            ? <div style={{textAlign:"center",padding:60,color:C.muted}}>
                <div style={{fontSize:48,marginBottom:12}}>🗺️</div>
                <div style={{fontWeight:600,marginBottom:6}}>Aucun voyage pour l'instant</div>
                <div style={{fontSize:13}}>Crée ton premier voyage ci-dessus !</div>
              </div>
            : trips.map(trip => (
                <div key={trip.id} className="card-hover" onClick={()=>onSelectTrip(trip)}
                  style={{background:"white",border:`1px solid ${C.border}`,borderRadius:16,padding:"18px 20px",marginBottom:10,cursor:"pointer",boxShadow:C.shadow,display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:48,height:48,borderRadius:12,background:`linear-gradient(135deg,${C.accent},${C.sky})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                    ✈️
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:16,color:C.text,marginBottom:2}}>{trip.destination||trip.name}</div>
                    {trip.country&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}>{trip.countryCode?String.fromCodePoint(...[...trip.countryCode.toUpperCase()].map(c=>c.charCodeAt(0)+127397)):"📍"} {trip.country}</div>}
                    {trip.description&&<div style={{fontSize:11,color:C.textSoft,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontStyle:"italic"}}>{trip.description}</div>}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {trip.days?.length&&<Tag color={C.accent} soft={C.accentSoft}>📅 {trip.days.length} jour{trip.days.length>1?"s":""}</Tag>}
                      {trip.budget&&<Tag color={C.green} soft={C.greenSoft}>💰 Budget défini</Tag>}
                      {trip.members&&Object.keys(trip.members).length>1&&<Tag color={C.purple} soft={C.purpleSoft}>👥 {Object.keys(trip.members).length} membres</Tag>}
                    </div>
                  </div>
                  <button onClick={e=>deleteTrip(e,trip)}
                    style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18,padding:"4px",flexShrink:0}}>🗑</button>
                </div>
              ))
        }
        <AppFooter/>
      </div>
    </div>
  )
}

function AppFooter() {
  const [version, setVersion] = useState("…")

  useEffect(() => {
    if (!("serviceWorker" in navigator)) { setVersion("no sw"); return }

    const ask = sw => {
      const mc = new MessageChannel()
      mc.port1.onmessage = e => { if (e.data?.version) setVersion(e.data.version) }
      sw.postMessage({ type: "GET_VERSION" }, [mc.port2])
    }

    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) { setVersion("no reg"); return }

      const sw = reg.active || reg.installing || reg.waiting
      if (sw) {
        // Si déjà actif, on demande directement
        if (sw.state === "activated") { ask(sw); return }
        // Sinon on attend qu'il soit actif
        sw.addEventListener("statechange", function handler() {
          if (this.state === "activated") {
            ask(this)
            this.removeEventListener("statechange", handler)
          }
        })
      }
    })
  }, [])

  return (
    <div className="app-footer">
      <div className="footer-logo">✈️</div>
      <div className="footer-name">Bagage</div>
      <div className="footer-version">{version}</div>
      <div style={{marginTop:4,fontSize:10}}>Fait avec ❤️ · {new Date().getFullYear()}</div>
    </div>
  )
}
