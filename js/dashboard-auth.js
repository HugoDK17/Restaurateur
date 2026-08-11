// js/dashboard-auth.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

console.log('🔒 Vérification auth sur dashboard...');

onAuthStateChanged(window.auth, (user) => {
  if (!user) {
    console.log('❌ Pas connecté, redirection vers login');
    window.location.href = 'login.html';
  } else {
    console.log('✅ Connecté:', user.email);
  }
});
