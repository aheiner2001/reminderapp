import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
const sandbox = {
  apiKey: "AIzaSyCyXhVv05H51JMmtZ3gQ_zSWPQ_3PIHwfk",
  authDomain: "sandbox-ed1e2.firebaseapp.com",
  projectId: "sandbox-ed1e2",
  storageBucket: "sandbox-ed1e2.firebasestorage.app",
  messagingSenderId: "741844679458",
  appId: "1:741844679458:web:0a30a7ba0d5e666dac837b",
};
export function browserAuth() {
  if (typeof window === "undefined")
    throw new Error("Sign-in is available in the browser.");
  const customProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const custom = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: customProject,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (customProject && Object.values(custom).some((v) => !v))
    throw new Error(
      "Set all six NEXT_PUBLIC_FIREBASE variables before building.",
    );
  const config = customProject ? custom : sandbox;
  return getAuth(getApps().length ? getApp() : initializeApp(config));
}
