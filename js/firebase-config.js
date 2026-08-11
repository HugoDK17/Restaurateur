
// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDYDBSeZr8fhE8KNLq7d4-8gnpmiFJP664",
    authDomain: "table-call-20741.firebaseapp.com",
    projectId: "table-call-20741",
    storageBucket: "table-call-20741.firebasestorage.app",
    messagingSenderId: "556709987942",
    appId: "1:556709987942:web:ff317b8712c3f5843f4fa7",
    measurementId: "G-F264YF4V91"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
