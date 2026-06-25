import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAffDaA4k5YRd6wA4xcqCEkn6ytGlOyVc0",
  authDomain: "crypto-decoder-g7krv.firebaseapp.com",
  projectId: "crypto-decoder-g7krv",
  storageBucket: "crypto-decoder-g7krv.firebasestorage.app",
  messagingSenderId: "982409551591",
  appId: "1:982409551591:web:b9f4727a5e93e9a2774c42"
};

// Initialize Firebase with the provisioned configurations and regional Database ID
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let dbInstance: any;
try {
  dbInstance = getFirestore(app, "getFirestore(app)");
} catch (e) {
  console.warn("Firestore named database initialization failed, falling back to default...", e);
  try {
    dbInstance = getFirestore(app);
  } catch (err2) {
    console.error("Firestore initialization failed entirely...", err2);
  }
}
export const db = dbInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}
