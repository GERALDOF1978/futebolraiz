// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Adicionamos o Firestore aqui

const firebaseConfig = {
  apiKey: "AIzaSyAfUCj3xrFMuiNcnRxOWzY1RKGPtVyI75Y",
  authDomain: "futebolraiz-fg.firebaseapp.com",
  projectId: "futebolraiz-fg",
  storageBucket: "futebolraiz-fg.firebasestorage.app",
  messagingSenderId: "566002250035",
  appId: "1:566002250035:web:f4beaf33d22a2d0c1d0e46",
  measurementId: "G-3DHJYTDTKN"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Exporta o banco de dados para usarmos no Admin e na Home
export const db = getFirestore(app);