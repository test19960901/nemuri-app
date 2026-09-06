import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebaseの設定（ご自身のプロジェクトの値を入力してください）
const firebaseConfig = {
  apiKey: "AIzaSyBBY5F2w9HoOWbEcSJ_V1CfxoDyFl6ZKhs",
  authDomain: "nemuri-app.firebaseapp.com",
  projectId: "nemuri-app",
  storageBucket: "nemuri-app.firebasestorage.app",
  messagingSenderId: "928001218105",
  appId: "1:928001218105:web:1d0aa6719f87ac46cf1fe8",
  measurementId: "G-MLQR8WKG87"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);