// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyDw1s0hE0VOc9dFoSlQ3e1rM81jl3-Q5aU",
  authDomain: "ai-error-tracker.firebaseapp.com",
  projectId: "ai-error-tracker",
  storageBucket: "ai-error-tracker.appspot.com",
  messagingSenderId: "1044361872393",
  appId: "1:1044361872393:web:df8be71f04bc0e239a24d8"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
