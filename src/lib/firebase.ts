import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  memoryLocalCache,
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings for better reliability in restricted environments
if (typeof window !== 'undefined') {
  console.log("Firebase Initializing with Project:", firebaseConfig.projectId);
  console.log("Using Database ID:", firebaseConfig.firestoreDatabaseId || "(default)");
}

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  // experimentalForceLongPolling and experimentalAutoDetectLongPolling cannot be used together.
  // We'll use AutoDetect to let the SDK choose the best path.
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Connectivity check as per instructions, but with more graceful logging
async function testConnection() {
  if (typeof window === 'undefined') return;
  
  console.log("Starting Firestore connectivity test...");
  const testDocRef = doc(db, 'system', 'connection_test');
  
  try {
    // Attempting to read with a timeout-like behavior via Promise.race
    const connectionPromise = getDocFromServer(testDocRef);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Firestore connection timed out after 10s")), 10000)
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);
    console.log("Firebase connection established successfully.");
  } catch (error: any) {
    console.error("Firestore Connectivity Error:", {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 200) + "..."
    });
    
    if (error?.code === 'unavailable') {
      console.warn("Firestore is unreachable. This usually means:");
      console.warn("1. Your internet connection is unstable or blocking Firestore (grpc/long-polling).");
      console.warn("2. The database ID in config is incorrect or the database is not ready.");
      console.warn("3. API Key restrictions in Google Cloud Console are too strict.");
    }
  }
}

// Only run connection test if not in a server environment (though this is client code)
if (typeof window !== 'undefined') {
  testConnection();
}
