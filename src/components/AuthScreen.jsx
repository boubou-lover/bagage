import { useState } from 'react'
import { C } from '../constants'
import { signInEmail, signUpEmail, signInGoogle, fbSet, fbUpdateProfile } from '../firebase'
import { Input, Btn, Spinner } from './atoms'

export default function AuthScreen({ onAuth, prefillEmail="" }) {
  const [mode,setMode]       = useState("login")
  const [email,setEmail]     = useState(prefillEmail)
  const [password,setPassword] = useState("")
  const [name,setName]       = useState("")
  const [loading,setLoading] = useState(false)
  const [error,setError]     = useState("")

  const errMsg = code => {
    const map = {
      "auth/user-not-found":"Aucun compte avec cet email",
      "auth/wrong-password":"Mot de passe incorrect",
      "auth/email-already-in-use":"Email déjà utilisé",
      "auth/weak-password":"Mot de passe trop court (6 car. min)",
      "auth/invalid-email":"Email invalide",
      "auth/popup-closed-by-user":"Fenêtre fermée",
    }
    return map[code] || "Une erreur est survenue"
  }

  const handleEmail = async () => {
    if (!email||!password) { setError("Remplis tous les champs"); return }
    setLoading(true); setError("")
    try {
      let cred
      if (mode==="register") {
        cred = await signUpEmail(email, password)
        if (name.trim()) await fbUpdateProfile(cred.user, {displayName: name.trim()})
        fbSet(`users/${cred.user.uid}`, {email, name: name||email.split("@")[0], createdAt: Date.now()})
      } else {
        cred = await signInEmail(email, password)
      }
      onAuth(cred.user)
    } catch(e) { setError(errMsg(e.code)) }
    setLoading(false)
  }

 const handleGoogle = async () => {
  setLoading(true); setError("")
  try {
    const result = await signInGoogle()
    onAuth(result.user)
  } catch(e) {
    if (e.code !== 'auth/popup-closed-by-user') setError(errMsg(e.code))
    setLoading(false)
  }
}

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.accent} 0%,${C.sky} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div className="fade-up" style={{background:"white",borderRadius:24,padding:"40px 32px",width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:52,marginBottom:10}}>✈️</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:C.text,marginBottom:6}}>Bagage</div>
          <div style={{fontSize:13,color:C.muted}}>Planifiez vos voyages ensemble</div>
        </div>

        <button className="btn-press" onClick={handleGoogle} disabled={loading}
          style={{width:"100%",background:"white",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 20px",
            display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",marginBottom:20,
            fontSize:14,fontWeight:600,color:C.text,fontFamily:"inherit"}}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continuer avec Google
        </button>

        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <div style={{flex:1,height:1,background:C.border}}/><span style={{fontSize:12,color:C.muted}}>ou</span><div style={{flex:1,height:1,background:C.border}}/>
        </div>

        {mode==="register" && (
          <div style={{marginBottom:10}}>
            <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Ton prénom"/>
          </div>
        )}
        <div style={{marginBottom:10}}>
          <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" onKeyDown={e=>e.key==="Enter"&&handleEmail()}/>
        </div>
        <div style={{marginBottom:16}}>
          <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" onKeyDown={e=>e.key==="Enter"&&handleEmail()}/>
        </div>

        {error && <div style={{background:C.redSoft,color:C.red,fontSize:13,borderRadius:10,padding:"10px 14px",marginBottom:14,border:`1px solid #fecaca`}}>⚠️ {error}</div>}

        <Btn full loading={loading} onClick={handleEmail} style={{marginBottom:14,borderRadius:12,padding:"13px"}}>
          {mode==="login" ? "Se connecter" : "Créer mon compte"}
        </Btn>

        <div style={{textAlign:"center",fontSize:13,color:C.muted}}>
          {mode==="login"
            ? <>Pas encore de compte ? <span onClick={()=>{setMode("register");setError("")}} style={{color:C.accent,cursor:"pointer",fontWeight:600}}>S'inscrire</span></>
            : <>Déjà inscrit ? <span onClick={()=>{setMode("login");setError("")}} style={{color:C.accent,cursor:"pointer",fontWeight:600}}>Se connecter</span></>
          }
        </div>
      </div>
    </div>
  )
}
