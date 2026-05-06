import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings for better reliability in potentially restricted environments
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalForceLongPolling: true, // Use long-polling as a fallback for environments that might block WebSockets
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Connectivity check as per instructions, but with more graceful logging
async function testConnection() {
  try {
    // Attempting to read a dummy doc to verify connection
    // Use a short timeout or just catch the specific error
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    console.log("Firebase connection established.");
  } catch (error: any) {
    if (error?.message?.includes('offline')) {
      console.warn("Firestore is currently in offline mode. It will sync automatically once a connection is established.");
    } else {
      console.error("Firestore connectivity issue:", error);
    }
  }
}

// Only run connection test if not in a server environment (though this is client code)
if (typeof window !== 'undefined') {
  testConnection();
}
