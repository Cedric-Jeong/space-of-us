import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDYI-iCYs9iMc2CLgWbhPsbbIAvjaAARFE",
  authDomain: "space-of-us.firebaseapp.com",
  databaseURL: "https://space-of-us-default-rtdb.firebaseio.com",
  projectId: "space-of-us",
  storageBucket: "space-of-us.firebasestorage.app",
  messagingSenderId: "555986533527",
  appId: "1:555986533527:web:a94d639bf16425f6af3dd2",
  measurementId: "G-11YGRFKJ1H"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rdb = getDatabase(app);
export const storage = getStorage(app);
export default app;
