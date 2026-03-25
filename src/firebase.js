import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, get, update } from 'firebase/database'
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword,
         createUserWithEmailAndPassword, signInWithPopup,
         GoogleAuthProvider, signOut, updateProfile } from 'firebase/auth'
import { getStorage, ref as storageRef, uploadBytesResumable,
         getDownloadURL, deleteObject } from 'firebase/storage'

const app = initializeApp({
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
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
