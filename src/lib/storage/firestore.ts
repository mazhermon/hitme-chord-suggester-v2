import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  type Firestore,
} from 'firebase/firestore'
import type { Song, StorageProvider } from './types'

const COLLECTION = 'songs'

function firebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }
}

let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig())
    db = getFirestore(app)
  }
  return db
}

/** A StorageProvider backed by Cloud Firestore (collection `songs`). */
export function createFirestoreProvider(): StorageProvider {
  return {
    async list() {
      const snap = await getDocs(collection(getDb(), COLLECTION))
      return snap.docs.map((d) => d.data() as Song)
    },
    async get(id) {
      const snap = await getDoc(doc(getDb(), COLLECTION, id))
      return snap.exists() ? (snap.data() as Song) : null
    },
    async save(song) {
      await setDoc(doc(getDb(), COLLECTION, song.id), song)
      return song
    },
    async remove(id) {
      await deleteDoc(doc(getDb(), COLLECTION, id))
    },
  }
}
