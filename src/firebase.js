import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, get, update } from 'firebase/database'
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword,
         createUserWithEmailAndPassword, signInWithPopup,
         GoogleAuthProvider, signOut, updateProfile } from 'firebase/auth'
import { getStorage, ref as storageRef, uploadBytesResumable,
         getDownloadURL, deleteObject } from 'firebase/storage'

const app = initializeApp({
  apiKey: "AIzaSyD0Dej5r8xeI0extx-yoM9WoTb2M_bJZvI",
  authDomain: "bagage-546ed.firebaseapp.com",
  databaseURL: "https://bagage-546ed-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "bagage-546ed",
  storageBucket: "bagage-546ed.firebasestorage.app",
  messagingSenderId: "1018544355738",
  appId: "1:1018544355738:web:76baa07141ceb6971ea223"
})

const db      = getDatabase(app)
const auth    = getAuth(app)
const storage = getStorage(app)
const gp      = new GoogleAuthProvider()
gp.setCustomParameters({ prompt: 'select_account' })

export { auth, gp }

export const fbRef    = (p) => ref(db, p)
export const fbSet    = (path, data) => set(ref(db, path), data)
export const fbGet    = async (path) => { const snap = await get(ref(db, path)); return snap.val() }
export const fbUpdate = (path, data) => update(ref(db, path), data)
export const fbListen = (path, cb)   => onValue(ref(db, path), snap => cb(snap.val()))

export const signInEmail     = (e, p) => signInWithEmailAndPassword(auth, e, p)
export const signUpEmail     = (e, p) => createUserWithEmailAndPassword(auth, e, p)
export const signInGoogle = () => signInWithPopup(auth, gp)
export const fbSignOut       = ()     => signOut(auth)
export const fbUpdateProfile = (u, d) => updateProfile(u, d)
export const onAuth          = (cb)   => onAuthStateChanged(auth, cb)

export const uploadFile = async (tripId, file) => {
  const ext  = file.name.split('.').pop()
  const path = `bagage/${tripId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const sRef = storageRef(storage, path)
  const snap = await uploadBytesResumable(sRef, file)
  const url  = await getDownloadURL(snap.ref)
  return { url, publicId: path }
}

export const deleteFile = async (publicId) => {
  if (!publicId) return
  try { await deleteObject(storageRef(storage, publicId)) }
  catch (e) { console.warn('deleteFile:', e.message) }
}
