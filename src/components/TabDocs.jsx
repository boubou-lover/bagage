import { useState, useEffect, useRef } from 'react'
import { C } from '../constants'
import { fbListen, fbSet, uploadFile, deleteFile } from '../firebase'
import { uid } from '../constants'
import { Btn, Card, Label, Icon, Tag, Spinner, Input } from './atoms'

export default function TabDocs({ tripId, user }) {
  const [docs,setDocs]             = useState([])
  const [uploading,setUploading]   = useState(false)
  const [error,setError]           = useState("")
  const [showUrlForm,setShowUrlForm] = useState(false)
  const [urlForm,setUrlForm]       = useState({label:"",url:""})
  const fileRef                    = useRef()

  useEffect(() => {
    fbListen(`trips/${tripId}/docs`, data => {
      if (!data) { setDocs([]); return }
      setDocs(Object.entries(data).map(([id,d]) => ({id,...d})).sort((a,b) => b.createdAt-a.createdAt))
    })
  }, [tripId])

  const saveDoc = async doc => { await fbSet(`trips/${tripId}/docs/${doc.id}`, doc) }

  const removeDoc = async doc => {
    if (!window.confirm(`Supprimer "${doc.label}" ?`)) return
    if (doc.publicId) await deleteFile(doc.publicId)
    await fbSet(`trips/${tripId}/docs/${doc.id}`, null)
  }

  const handleFile = async e => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 10*1024*1024) { setError("Fichier trop grand (max 10 Mo)"); return }
    setUploading(true); setError("")
    try {
      const isImg = file.type.startsWith("image/")
      const isPdf = file.type==="application/pdf"
      const {url, publicId} = await uploadFile(tripId, file)
      const doc = {id:uid(), label:file.name, url, publicId, type:isImg?"image":isPdf?"pdf":"file", size:file.size, uploadedBy:user.displayName||user.email, createdAt:Date.now()}
      await saveDoc(doc)
    } catch(e) { setError("Erreur upload : "+e.message) }
    setUploading(false)
    e.target.value = ""
  }

  const addUrl = async () => {
    if (!urlForm.label.trim()||!urlForm.url.trim()) return
    let url = urlForm.url.trim()
    if (!url.startsWith("http")) url = "https://"+url
    const doc = {id:uid(), label:urlForm.label.trim(), url, type:"link", uploadedBy:user.displayName||user.email, createdAt:Date.now()}
    await saveDoc(doc)
    setUrlForm({label:"",url:""}); setShowUrlForm(false)
  }

  const typeIcon  = type => { if(type==="image") return <Icon name="Image" size={20} color={C.purple}/>; if(type==="pdf") return <Icon name="FileText" size={20} color={C.red}/>; if(type==="link") return <Icon name="Link" size={20} color={C.sky}/>; return <Icon name="File" size={20} color={C.muted}/> }
  const typeSoft  = type => ({image:C.purpleSoft,pdf:C.redSoft,link:C.skySoft}[type]||"#f8fafc")
  const typeColor = type => ({image:C.purple,pdf:C.red,link:C.sky}[type]||C.muted)
  const fmtSize   = b  => b>1024*1024 ? `${(b/1024/1024).toFixed(1)} Mo` : `${Math.round(b/1024)} Ko`

  return (
    <div className="fade-up">
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <button onClick={()=>fileRef.current?.click()}
          style={{flex:1,background:"white",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:13,fontWeight:600,color:C.text,fontFamily:"inherit"}}>
          {uploading ? <Spinner/> : <Icon name="Upload" size={16} color={C.accent}/>}
          {uploading ? "Upload…" : "Ajouter un fichier"}
        </button>
        <button onClick={()=>setShowUrlForm(v=>!v)}
          style={{flex:1,background:"white",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:13,fontWeight:600,color:C.text,fontFamily:"inherit"}}>
          <Icon name="Link" size={16} color={C.sky}/>Ajouter un lien
        </button>
        <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleFile} style={{display:"none"}}/>
      </div>

      {showUrlForm && (
        <Card style={{marginBottom:12}}>
          <Label>🔗 Lien externe</Label>
          <Input value={urlForm.label} onChange={e=>setUrlForm({...urlForm,label:e.target.value})} placeholder="Nom (ex: Réservation hôtel)" style={{marginBottom:8}}/>
          <Input value={urlForm.url} onChange={e=>setUrlForm({...urlForm,url:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addUrl()} placeholder="https://…" style={{marginBottom:10}}/>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={addUrl} disabled={!urlForm.label||!urlForm.url}>Ajouter</Btn>
            <Btn variant="ghost" onClick={()=>setShowUrlForm(false)}>Annuler</Btn>
          </div>
        </Card>
      )}

      {error && <div style={{background:C.redSoft,color:C.red,borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:12,border:`1px solid #fecaca`}}>⚠️ {error}</div>}

      {docs.length===0 && !uploading && (
        <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
          <Icon name="FolderOpen" size={48} color={C.border} style={{marginBottom:12,display:"block",margin:"0 auto 12px"}}/>
          <div style={{fontWeight:600,marginBottom:4}}>Aucun document</div>
          <div style={{fontSize:13}}>Ajoutez billets, réservations, scans…</div>
        </div>
      )}

      {docs.map(doc => (
        <div key={doc.id} style={{background:"white",border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:10,boxShadow:C.shadow,display:"flex",alignItems:"center",gap:12}}>
          {/* Thumbnail avec lazy loading (fix n°2) */}
          {doc.type==="image"
            ? <img src={doc.url} loading="lazy" style={{width:48,height:48,borderRadius:10,objectFit:"cover",flexShrink:0,border:`1px solid ${C.border}`}} alt={doc.label}/>
            : <div style={{width:48,height:48,borderRadius:10,background:typeSoft(doc.type),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1px solid ${typeColor(doc.type)}20`}}>{typeIcon(doc.type)}</div>
          }
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:14,color:C.text,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.label}</div>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <Tag color={typeColor(doc.type)} soft={typeSoft(doc.type)}>{doc.type==="image"?"Photo":doc.type==="pdf"?"PDF":doc.type==="link"?"Lien":"Fichier"}</Tag>
              {doc.size && <span style={{fontSize:11,color:C.muted}}>{fmtSize(doc.size)}</span>}
              {doc.uploadedBy && <span style={{fontSize:11,color:C.muted}}>{doc.uploadedBy}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <a href={doc.url} target="_blank" rel="noopener"
              style={{background:C.accentSoft,border:`1px solid #bfdbfe`,borderRadius:8,padding:"7px 10px",display:"inline-flex",alignItems:"center",cursor:"pointer"}}>
              <Icon name={doc.type==="link"?"ExternalLink":"Download"} size={15} color={C.accent}/>
            </a>
            <button onClick={()=>removeDoc(doc)}
              style={{background:C.redSoft,border:`1px solid #fecaca`,borderRadius:8,padding:"7px 10px",cursor:"pointer",display:"inline-flex",alignItems:"center"}}>
              <Icon name="Trash2" size={15} color={C.red}/>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
