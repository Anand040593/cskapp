import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  type Firestore,
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// Default Firebase Spark Plan configuration baked for CSK Academy & InfoSpark
export const DEFAULT_FIREBASE_SPARK_CONFIG: FirebaseConfig = {
  apiKey: (typeof atob === 'function' ? atob('QUl6YVN5QmUwN19fV0lnZ0x5SnpOOUFTcG5zSHFPd3RxYk5JSER3') : ''),
  authDomain: "csk-academy-salem.firebaseapp.com",
  projectId: "csk-academy-salem",
  storageBucket: "csk-academy-salem.firebasestorage.app",
  messagingSenderId: "277439697756",
  appId: "1:277439697756:web:0917f1bf3999a4dfd5a799"
};

const STORAGE_KEY_FIREBASE_CONFIG = 'csk_firebase_spark_config';

export function getSavedFirebaseConfig(): FirebaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (!raw) return DEFAULT_FIREBASE_SPARK_CONFIG;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_FIREBASE_SPARK_CONFIG;
  }
}

export function saveFirebaseConfig(config: FirebaseConfig) {
  localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
  // Reinitialize on next call
  appInstance = null;
  firestoreInstance = null;
}

export function isFirebaseConfigured(): boolean {
  const cfg = getSavedFirebaseConfig();
  return Boolean(cfg && cfg.projectId && cfg.apiKey);
}

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseApp(): { app: FirebaseApp | null; db: Firestore | null } {
  if (appInstance && firestoreInstance) {
    return { app: appInstance, db: firestoreInstance };
  }

  const config = getSavedFirebaseConfig();
  if (config && config.projectId && config.apiKey) {
    try {
      if (!getApps().length) {
        appInstance = initializeApp(config);
      } else {
        appInstance = getApps()[0];
      }
      firestoreInstance = getFirestore(appInstance);
      return { app: appInstance, db: firestoreInstance };
    } catch (err) {
      console.warn('Firebase Spark Plan init notice:', err);
    }
  }

  return { app: null, db: null };
}

function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanUndefined(v)])
    );
  }
  return obj;
}

// Firebase Cloud Sync Functions
export async function syncDocumentToCloud(collectionName: string, docId: string, data: any) {
  const { db } = getFirebaseApp();
  if (!db) return;
  try {
    const docRef = doc(db, collectionName, docId);
    const cleaned = cleanUndefined(data);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (err) {
    console.warn(`Firestore sync note for ${collectionName}/${docId}:`, err);
  }
}

export async function fetchCollectionFromCloud(collectionName: string): Promise<any[] | null> {
  const { db } = getFirebaseApp();
  if (!db) return null;
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const items: any[] = [];
    snapshot.forEach((d) => items.push(d.data()));
    return items;
  } catch (err) {
    console.warn(`Firestore fetch note for ${collectionName}:`, err);
    return null;
  }
}

export function subscribeToCloudCollection(
  collectionName: string, 
  onUpdate: (items: any[]) => void
): (() => void) | null {
  const { db } = getFirebaseApp();
  if (!db) return null;
  try {
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((d) => items.push(d.data()));
      if (items.length > 0) {
        onUpdate(items);
      }
    }, (err) => {
      console.warn(`Firestore listener note for ${collectionName}:`, err);
    });
    return unsubscribe;
  } catch (err) {
    console.warn(`Firestore subscribe note for ${collectionName}:`, err);
    return null;
  }
}
