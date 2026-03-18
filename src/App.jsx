import { useState, useEffect } from 'react'
import { C } from './constants'
import { onAuth, fbSet, fbGet, fbSignOut } from './firebase'
import { getRedirectResult } from 'firebase/auth'
import { auth } from './firebase'
import { Spinner } from './components/atoms'
import AuthScreen from './components/AuthScreen'
import TripListScreen from './components/TripListScreen'
import TripApp from './components/TripApp'

export default function App() {
  const [authState,setAuthState]   = useState("loading")
  const [user,setUser]             = useState(null)
  const [currentTrip,setCurrentTrip] = useState(null)

  useEffect(() => {
    // Gérer le résultat du redirect Google
    getRedirectResult(auth).then(result => {
      if (result?.user) {
        setUser(result.user)
        setAuthState("auth")
      }
    }).catch(() => {})

    // Auth listener
    onAuth(u => {
      if (u) { setUser(u); setAuthState("auth") }
      else   { setUser(null); setAuthState("unauth"); setCurrentTrip(null) }
    })
  }, [])

  // Gérer lien d'invitation ?join=TRIP_ID
  useEffect(() => {
    if (authState!=="auth"||!user) return
    const params = new URLSearchParams(location.search)
    const joinId = params.get("join")
    if (!joinId) return
    const url = new URL(location.href); url.searchParams.delete("join"); url.searchParams.delete("email")
    history.replaceState({}, "", url)
    ;(async () => {
      const trip = await fbGet(`trips/${joinId}`)
      if (!trip) { alert("Ce lien d'invitation est invalide ou expiré."); return }
      if (trip.members?.[user.uid]) { setCurrentTrip({id:joinId,...trip}); return }
      await fbSet(`trips/${joinId}/members/${user.uid}`, {name:user.displayName||user.email,email:user.email||"",role:"member"})
      await fbSet(`userTrips/${user.uid}/${joinId}`, true)
      const updated = await fbGet(`trips/${joinId}`)
      setCurrentTrip({id:joinId,...updated})
    })()
  }, [authState, user])

  if (authState==="loading") return (
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.accent},${C.sky})`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:52}}>✈️</div>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:24,color:"white"}}>Bagage</div>
      <Spinner/>
    </div>
  )

  if (authState==="unauth") {
    const emailParam = new URLSearchParams(location.search).get("email")||""
    return <AuthScreen onAuth={u=>{setUser(u);setAuthState("auth")}} prefillEmail={emailParam}/>
  }

  if (currentTrip) return <TripApp user={user} trip={currentTrip} onBack={()=>setCurrentTrip(null)}/>

  return <TripListScreen user={user} onSelectTrip={setCurrentTrip} onSignOut={()=>fbSignOut()}/>
}
