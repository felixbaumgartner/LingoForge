import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAkMId-vE-3j4g5RYd4fZQfl2mf7EDZWoM",
  authDomain: "lingoforge-aaa5d.firebaseapp.com",
  projectId: "lingoforge-aaa5d",
  storageBucket: "lingoforge-aaa5d.firebasestorage.app",
  messagingSenderId: "80241392477",
  appId: "1:80241392477:web:03288a878c7be6768c06b4",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
