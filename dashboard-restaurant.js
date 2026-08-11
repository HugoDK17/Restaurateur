// ========== GESTION DE LA NAVIGATION ==========
let currentPage = 'overview';

function switchPage(pageName) {
  // Masquer la page actuelle
  const currentPageElement = document.getElementById(`page-${currentPage}`);
  if (currentPageElement) {
    currentPageElement.classList.remove('active');
  }

  // Masquer tous les boutons actifs
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
  });

  // Afficher la nouvelle page
  currentPage = pageName;
  const newPageElement = document.getElementById(`page-${pageName}`);
  if (newPageElement) {
    newPageElement.classList.add('active');
  }

  // Activer le bouton cliqué - CORRIGÉ
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.onclick = function() {
      if (this.textContent.includes(pageName.replace('-', ' ').toUpperCase())) {
        this.classList.add('active');
      }
    };
  });

  // Mettre à jour le titre
  const titles = {
    'overview': '📊 Aperçu',
    'plan-salle': '📐 Plan de Salle',
    'tables': '🍽️ Tables',
    'reservations': '📅 Réservations',
    'settings': '⚙️ Paramètres'
  };

  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) {
    pageTitle.textContent = titles[pageName] || 'Aperçu';
  }

  // Si on charge le plan de salle, redessiner
  if (pageName === 'plan-salle') {
    setTimeout(() => {
      if (typeof canvas !== 'undefined' && canvas && typeof ctx !== 'undefined' && ctx) {
        canvas.width = salleWidth;
        canvas.height = salleHeight;
        drawCanvas();
      }
    }, 100);
  }
}

// ========== VARIABLES GLOBALES ==========
let restaurantData = {};
let allTables = [];
let allReservations = [];
let currentEditingTableId = null;
let currentEditingReservationId = null;

// ========== INITIALISATION ==========
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Dashboard chargé');
  checkUserAuth();
  setTimeout(() => {
    loadRestaurantData();
    loadTables();
    loadReservations();
  }, 500);
});

// ========== VÉRIFIER L'AUTHENTIFICATION ==========
function checkUserAuth() {
  if (typeof window.auth === 'undefined') {
    console.error('❌ Firebase Auth non initialisé');
    window.location.href = 'index.html';
    return;
  }

  window.auth.onAuthStateChanged((user) => {
    if (!user) {
      console.log('⚠️ Utilisateur non connecté');
      window.location.href = 'index.html';
      return;
    }

    const emailElement = document.getElementById('userEmail');
    if (emailElement) {
      emailElement.textContent = user.email;
    }
    console.log('✅ Utilisateur connecté:', user.email);
  });
}

// ========== DÉCONNEXION ==========
async function logout() {
  try {
    await window.auth.signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    alert('❌ Erreur: ' + error.message);
  }
}

// ========== CHARGER LES DONNÉES DU RESTAURANT ==========
async function loadRestaurantData() {
  try {
    if (typeof window.db === 'undefined') {
      console.warn('⚠️ Firebase Firestore non initialisé');
      return;
    }

    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    const user = window.auth.currentUser;
    if (!user) return;

    const docRef = doc(window.db, 'restaurants', user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      restaurantData = docSnap.data();
      console.log('✅ Données restaurant chargées');
      
      const nameEl = document.getElementById('restaurantName');
      const nameInputEl = document.getElementById('restaurantNameInput');
      const addressEl = document.getElementById('restaurantAddressInput');
      const phoneEl = document.getElementById('restaurantPhoneInput');

      if (nameEl) nameEl.textContent = restaurantData.nom || 'Mon Restaurant';
      if (nameInputEl) nameInputEl.value = restaurantData.nom || '';
      if (addressEl) addressEl.value = restaurantData.adresse || '';
      if (phoneEl) phoneEl.value = restaurantData.telephone || '';
    }
  } catch (error) {
    console.error('❌ Erreur chargement données:', error);
  }
}

// ========== CHARGER LES TABLES ==========
async function loadTables() {
  try {
    if (typeof window.db === 'undefined') return;

    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    const user = window.auth.currentUser;
    if (!user) return;

    const q = query(
      collection(window.db, 'tables'),
      where('restaurantId', '==', user.uid)
    );

    const querySnapshot = await getDocs(q);
    allTables = [];

    querySnapshot.forEach((doc) => {
      allTables.push({ id: doc.id, ...doc.data() });
    });

    console.log('✅ Tables chargées:', allTables.length);
    displayTables();
    updateStatistics();
  } catch (error) {
    console.error('❌ Erreur chargement tables:', error);
  }
}

// ========== CHARGER LES RÉSERVATIONS ==========
async function loadReservations() {
  try {
    if (typeof window.db === 'undefined') return;

    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    const user = window.auth.currentUser;
    if (!user) return;

    const q = query(
      collection(window.db, 'reservations'),
      where('restaurantId', '==', user.uid)
    );

    const querySnapshot = await getDocs(q);
    allReservations = [];

    querySnapshot.forEach((doc) => {
      allReservations.push({ id: doc.id, ...doc.data() });
    });

    console.log('✅ Réservations chargées:', allReservations.length);
    displayReservations();
    displayReservationsToday();
    updateStatistics();
  } catch (error) {
    console.error('❌ Erreur chargement réservations:', error);
  }
}

// ========== AFFICHER LES TABLES ==========
function displayTables() {
  const grid = document.getElementById('tablesGrid');
  if (!grid) {
    console.warn('⚠️ #tablesGrid non trouvé');
    return;
  }

  if (!allTables || allTables.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">📍 Aucune table créée</div>`;
    return;
  }

  grid.innerHTML = allTables.map(table => `
    <div class="table-card">
      <div class="table-card-header" style="background-color: ${table.color || '#6BA539'}">
        <h4>Table ${table.numeroTable}</h4>
      </div>
      <div class="table-card-body">
        <div class="table-info">
          <span class="info-label">Capacité:</span>
          <span class="info-value">${table.capacite} places</span>
        </div>
        <div class="table-actions">
          <button class="btn-small" onclick="editTable('${table.id}')">✏️ Éditer</button>
          <button class="btn-small btn-danger" onclick="deleteTable('${table.id}')">🗑️ Supprimer</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ========== AFFICHER LES RÉSERVATIONS ==========
function displayReservations() {
  const list = document.getElementById('reservationsList');
  if (!list) {
    console.warn('⚠️ #reservationsList non trouvé');
    return;
  }

  if (!allReservations || allReservations.length === 0) {
    list.innerHTML = `<div class="empty-state">📅 Aucune réservation</div>`;
    return;
  }

  list.innerHTML = allReservations.map(res => {
    const dateObj = new Date(res.dateHeure);
    const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = dateObj.toLocaleDateString('fr-FR');
    
    return `
      <div class="reservation-card">
        <div class="reservation-header">
          <h4>${res.nomClient}</h4>
          <span class="reservation-status">${res.statut || 'En attente'}</span>
        </div>
        <div class="reservation-body">
          <div class="reservation-info">
            <span>👥 ${res.nombrePersonnes} personnes</span>
            <span>📅 ${dateStr}</span>
            <span>🕐 ${timeStr}</span>
            <span>📞 ${res.telephone}</span>
          </div>
          <div class="reservation-actions">
            <button class="btn-small" onclick="editReservation('${res.id}')">✏️ Éditer</button>
            <button class="btn-small btn-danger" onclick="deleteReservation('${res.id}')">🗑️ Supprimer</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ========== AFFICHER RÉSERVATIONS D'AUJOURD'HUI ==========
function displayReservationsToday() {
  const list = document.getElementById('reservationsTodayList');
  if (!list) {
    console.warn('⚠️ #reservationsTodayList non trouvé');
    return;
  }

  const today = new Date().toDateString();
  const todayRes = allReservations ? allReservations.filter(r => {
    const resDate = new Date(r.dateHeure).toDateString();
    return resDate === today;
  }).sort((a, b) => new Date(a.dateHeure) - new Date(b.dateHeure)) : [];

  if (todayRes.length === 0) {
    list.innerHTML = `<div class="empty-state">Aucune réservation aujourd'hui</div>`;
    return;
  }

  list.innerHTML = todayRes.map(res => {
    const dateObj = new Date(res.dateHeure);
    const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    return `
      <div class="reservation-card">
        <div class="reservation-header">
          <h4>${res.nomClient}</h4>
          <span class="reservation-status">${res.statut || 'En attente'}</span>
        </div>
        <div class="reservation-body">
          <div class="reservation-info">
            <span>👥 ${res.nombrePersonnes} personnes</span>
            <span>🕐 ${timeStr}</span>
            <span>📞 ${res.telephone}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ========== METTRE À JOUR LES STATISTIQUES ==========
function updateStatistics() {
  const totalTables = allTables ? allTables.length : 0;
  const totalPlaces = allTables ? allTables.reduce((sum, t) => sum + (t.capacite || 0), 0) : 0;
  const totalReservations = allReservations ? allReservations.length : 0;
  
  const today = new Date().toDateString();
  const todayReservations = allReservations ? allReservations.filter(r => {
    const resDate = new Date(r.dateHeure).toDateString();
    return resDate === today;
  }).length : 0;

  const statTables = document.getElementById('statTables');
  const statPlaces = document.getElementById('statPlaces');
  const statReservations = document.getElementById('statReservations');
  const statClientsToday = document.getElementById('statClientsToday');

  if (statTables) statTables.textContent = totalTables;
  if (statPlaces) statPlaces.textContent = totalPlaces;
  if (statReservations) statReservations.textContent = totalReservations;
  if (statClientsToday) statClientsToday.textContent = todayReservations;

  console.log('📊 Stats mises à jour');
}

// ========== MODAL TABLE ==========
function openAddTableModal() {
  currentEditingTableId = null;
  const titleEl = document.getElementById('modalTableTitle');
  if (titleEl) titleEl.textContent = '➕ Ajouter une Table';
  
  const numEl = document.getElementById('tableNumber');
  const capEl = document.getElementById('tableCapacity');
  const colEl = document.getElementById('tableColor');
  const nfcEl = document.getElementById('tableNFCTag');

  if (numEl) numEl.value = '';
  if (capEl) capEl.value = '';
  if (colEl) colEl.value = '#6BA539';
  if (nfcEl) nfcEl.value = '';

  const modal = document.getElementById('modalTable');
  if (modal) modal.classList.add('active');
}

function closeTableModal() {
  const modal = document.getElementById('modalTable');
  if (modal) modal.classList.remove('active');
}

async function saveTable() {
  const numEl = document.getElementById('tableNumber');
  const capEl = document.getElementById('tableCapacity');

  if (!numEl || !capEl) {
    alert('⚠️ Éléments de formulaire non trouvés');
    return;
  }

  const numero = numEl.value;
  const capacite = capEl.value;

  if (!numero || !capacite) {
    alert('⚠️ Remplissez tous les champs');
    return;
  }

  try {
    const { setDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    const user = window.auth.currentUser;
    if (!user) return;

    const tableId = `${user.uid}_table_${numero}`;

    const tableData = {
      restaurantId: user.uid,
      numeroTable: parseInt(numero),
      capacite: parseInt(capacite),
      color: document.getElementById('tableColor').value,
      nfcTag: document.getElementById('tableNFCTag').value || '',
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(window.db, 'tables', tableId), tableData);

    alert('✅ Table enregistrée');
    closeTableModal();
    loadTables();
  } catch (error) {
    console.error('❌ Erreur:', error);
    alert('❌ Erreur: ' + error.message);
  }
}

function editTable(tableId) {
  const table = allTables.find(t => t.id === tableId);
  if (!table) return;

  currentEditingTableId = tableId;
  const titleEl = document.getElementById('modalTableTitle');
  if (titleEl) titleEl.textContent = '✏️ Éditer une Table';
  
  const numEl = document.getElementById('tableNumber');
  const capEl = document.getElementById('tableCapacity');
  const colEl = document.getElementById('tableColor');
  const nfcEl = document.getElementById('tableNFCTag');

  if (numEl) numEl.value = table.numeroTable;
  if (capEl) capEl.value = table.capacite;
  if (colEl) colEl.value = table.color || '#6BA539';
  if (nfcEl) nfcEl.value = table.nfcTag || '';

  const modal = document.getElementById('modalTable');
  if (modal) modal.classList.add('active');
}

async function deleteTable(tableId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette table ?')) return;

  try {
    const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    await deleteDoc(doc(window.db, 'tables', tableId));
    alert('✅ Table supprimée');
    loadTables();
  } catch (error) {
    console.error('❌ Erreur:', error);
    alert('❌ Erreur: ' + error.message);
  }
}

// ========== MODAL RÉSERVATION ==========
function openAddReservationModal() {
  currentEditingReservationId = null;
  
  const nameEl = document.getElementById('clientName');
  const peopleEl = document.getElementById('clientPeople');
  const dateEl = document.getElementById('reservationDateTime');
  const phoneEl = document.getElementById('clientPhone');
  const notesEl = document.getElementById('reservationNotes');

  if (nameEl) nameEl.value = '';
  if (peopleEl) peopleEl.value = '';
  if (dateEl) dateEl.value = '';
  if (phoneEl) phoneEl.value = '';
  if (notesEl) notesEl.value = '';

  const modal = document.getElementById('modalReservation');
  if (modal) modal.classList.add('active');
}

function closeReservationModal() {
  const modal = document.getElementById('modalReservation');
  if (modal) modal.classList.remove('active');
}

async function saveReservation() {
  const nameEl = document.getElementById('clientName');
  const peopleEl = document.getElementById('clientPeople');
  const dateEl = document.getElementById('reservationDateTime');
  const phoneEl = document.getElementById('clientPhone');

  if (!nameEl || !peopleEl || !dateEl) {
    alert('⚠️ Éléments de formulaire non trouvés');
    return;
  }

  const nom = nameEl.value;
  const nombre = peopleEl.value;
  const dateHeure = dateEl.value;
  const telephone = phoneEl ? phoneEl.value : '';

  if (!nom || !nombre || !dateHeure) {
    alert('⚠️ Remplissez les champs obligatoires');
    return;
  }

  try {
    const { addDoc, collection, updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    const user = window.auth.currentUser;
    if (!user) return;

    const notesEl = document.getElementById('reservationNotes');
    const reservationData = {
      restaurantId: user.uid,
      nomClient: nom,
      nombrePersonnes: parseInt(nombre),
      dateHeure: dateHeure,
      telephone: telephone,
      notes: notesEl ? notesEl.value : '',
      statut: 'En attente',
      updatedAt: new Date().toISOString()
    };

    if (currentEditingReservationId) {
      await updateDoc(doc(window.db, 'reservations', currentEditingReservationId), reservationData);
      alert('✅ Réservation mise à jour');
    } else {
      await addDoc(collection(window.db, 'reservations'), {
        ...reservationData,
        createdAt: new Date().toISOString()
      });
      alert('✅ Réservation enregistrée');
    }

    closeReservationModal();
    loadReservations();
  } catch (error) {
    console.error('❌ Erreur:', error);
    alert('❌ Erreur: ' + error.message);
  }
}

function editReservation(reservationId) {
  const res = allReservations.find(r => r.id === reservationId);
  if (!res) return;

  currentEditingReservationId = reservationId;
  
  const nameEl = document.getElementById('clientName');
  const peopleEl = document.getElementById('clientPeople');
  const dateEl = document.getElementById('reservationDateTime');
  const phoneEl = document.getElementById('clientPhone');
  const notesEl = document.getElementById('reservationNotes');

  if (nameEl) nameEl.value = res.nomClient;
  if (peopleEl) peopleEl.value = res.nombrePersonnes;
  if (dateEl) dateEl.value = res.dateHeure;
  if (phoneEl) phoneEl.value = res.telephone;
  if (notesEl) notesEl.value = res.notes || '';

  const modal = document.getElementById('modalReservation');
  if (modal) modal.classList.add('active');
}

async function deleteReservation(reservationId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) return;

  try {
    const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    await deleteDoc(doc(window.db, 'reservations', reservationId));
    alert('✅ Réservation supprimée');
    loadReservations();
  } catch (error) {
    console.error('❌ Erreur:', error);
    alert('❌ Erreur: ' + error.message);
  }
}

// ========== PARAMÈTRES ==========
async function saveRestaurantName() {
  const nameEl = document.getElementById('restaurantNameInput');
  if (!nameEl) {
    alert('⚠️ Élément non trouvé');
    return;
  }

  const nom = nameEl.value;
  if (!nom) {
    alert('⚠️ Entrez un nom');
    return;
  }

  try {
    const { setDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    const user = window.auth.currentUser;
    if (!user) return;

    await setDoc(doc(window.db, 'restaurants', user.uid), {
      nom: nom,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const displayEl = document.getElementById('restaurantName');
    if (displayEl) displayEl.textContent = nom;
    restaurantData.nom = nom;
    alert('✅ Nom enregistré');
  } catch (error) {
    console.error('❌ Erreur:', error);
    alert('❌ Erreur: ' + error.message);
  }
}

async function saveRestaurantInfo() {
  try {
    const { setDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    const user = window.auth.currentUser;
    if (!user) return;

    const addressEl = document.getElementById('restaurantAddressInput');
    const phoneEl = document.getElementById('restaurantPhoneInput');

    await setDoc(doc(window.db, 'restaurants', user.uid), {
      adresse: addressEl ? addressEl.value : '',
      telephone: phoneEl ? phoneEl.value : '',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    alert('✅ Informations enregistrées');
  } catch (error) {
    console.error('❌ Erreur:', error);
    alert('❌ Erreur: ' + error.message);
  }
}

function saveTheme() {
  const primaryEl = document.getElementById('primaryColorInput');
  const secondaryEl = document.getElementById('secondaryColorInput');

  if (!primaryEl || !secondaryEl) {
    alert('⚠️ Éléments non trouvés');
    return;
  }

  const primary = primaryEl.value;
  const secondary = secondaryEl.value;

  localStorage.setItem('primaryColor', primary);
  localStorage.setItem('secondaryColor', secondary);

  alert('✅ Thème enregistré');
}

function exportData() {
  try {
    const data = {
      restaurant: restaurantData,
      tables: allTables,
      reservations: allReservations,
      exportDate: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gestable-export-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('✅ Données exportées');
  } catch (error) {
    console.error('❌ Erreur export:', error);
    alert('❌ Erreur: ' + error.message);
  }
}

function importData() {
  alert('📥 Fonction d\'importation en développement');
}

function deleteAllData() {
  if (confirm('⚠️ ATTENTION: Cette action est irréversible. Êtes-vous sûr ?')) {
    if (confirm('Êtes-vous vraiment sûr ? Vous allez perdre toutes vos données !')) {
      alert('🗑️ Fonction de suppression en développement');
    }
  }
}

function reloadPlanSalle() {
  if (typeof loadPlanSalleFromFirebase === 'function') {
    loadPlanSalleFromFirebase();
    console.log('✅ Plan rechargé');
  } else {
    console.warn('⚠️ loadPlanSalleFromFirebase non disponible');
    alert('⚠️ Fonction de plan non disponible');
  }
}

// ========== FERMER LES MODALS EN CLIQUANT EN DEHORS ==========
document.addEventListener('click', (e) => {
  const modalTable = document.getElementById('modalTable');
  const modalReservation = document.getElementById('modalReservation');

  if (modalTable && e.target === modalTable) {
    closeTableModal();
  }

  if (modalReservation && e.target === modalReservation) {
    closeReservationModal();
  }
});

// ========== EXPORTS GLOBAUX ==========
window.switchPage = switchPage;
window.checkUserAuth = checkUserAuth;
window.logout = logout;
window.loadRestaurantData = loadRestaurantData;
window.loadTables = loadTables;
window.loadReservations = loadReservations;
window.displayTables = displayTables;
window.displayReservations = displayReservations;
window.displayReservationsToday = displayReservationsToday;
window.updateStatistics = updateStatistics;
window.openAddTableModal = openAddTableModal;
window.closeTableModal = closeTableModal;
window.saveTable = saveTable;
window.editTable = editTable;
window.deleteTable = deleteTable;
window.openAddReservationModal = openAddReservationModal;
window.closeReservationModal = closeReservationModal;
window.saveReservation = saveReservation;
window.editReservation = editReservation;
window.deleteReservation = deleteReservation;
window.saveRestaurantName = saveRestaurantName;
window.saveRestaurantInfo = saveRestaurantInfo;
window.saveTheme = saveTheme;
window.exportData = exportData;
window.importData = importData;
window.deleteAllData = deleteAllData;
window.reloadPlanSalle = reloadPlanSalle;