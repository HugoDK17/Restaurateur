
// ========== VARIABLES GLOBALES ==========
let canvas, ctx;
let tables = [];
let selectedTable = null;
let draggingTable = null;
let offsetX = 0, offsetY = 0;
let salleWidth = 1000;
let salleHeight = 700;

// ========== INITIALISATION ==========
window.addEventListener('DOMContentLoaded', () => {
  initializePlanSalle();
});

function initializePlanSalle() {
  canvas = document.getElementById('canvasPlanSalle');
  if (!canvas) {
    console.warn('⚠️ Canvas principal non trouvé');
    return;
  }

  ctx = canvas.getContext('2d');
  canvas.width = salleWidth;
  canvas.height = salleHeight;

  // Event listeners
  canvas.addEventListener('mousedown', handleCanvasMouseDown);
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('mouseup', handleCanvasMouseUp);
  canvas.addEventListener('click', handleCanvasClick);

  // Drag & Drop depuis les templates
  setupDragAndDrop();

  // Charger le plan depuis Firebase
  loadPlanSalleFromFirebase();

  drawCanvas();
}

// ========== DESSIN DU CANVAS ==========
function drawCanvas() {
  ctx.fillStyle = '#faf8f3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Quadrillage léger
  ctx.strokeStyle = '#e8e4db';
  ctx.lineWidth = 1;
  const gridSize = 50;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Bordure
  ctx.strokeStyle = '#6BA539';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  // Dessiner les tables
  tables.forEach((table, index) => {
    const isSelected = selectedTable === index;
    drawTable(table, isSelected);
  });
}

function drawTable(table, isSelected) {
  // Fond
  ctx.fillStyle = table.color || '#6BA539';
  ctx.fillRect(table.x, table.y, table.largeur, table.hauteur);

  // Bordure
  ctx.strokeStyle = isSelected ? '#FF6B6B' : adjustBrightness(table.color || '#6BA539', -40);
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.strokeRect(table.x, table.y, table.largeur, table.hauteur);

  // Numéro de table
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`T${table.numeroTable}`, table.x + table.largeur / 2, table.y + table.hauteur / 2 - 6);

  // Capacité
  ctx.font = '12px sans-serif';
  ctx.fillText(`${table.capacite}p`, table.x + table.largeur / 2, table.y + table.hauteur / 2 + 10);
}

// ========== GESTION DE LA LUMINOSITÉ ==========
function adjustBrightness(color, amount) {
  const usePound = color[0] === "#";
  const col = usePound ? color.slice(1) : color;
  const num = parseInt(col, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return (usePound ? "#" : "") + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

// ========== DRAG & DROP DEPUIS LES TEMPLATES ==========
function setupDragAndDrop() {
  const templates = document.querySelectorAll('.table-template');
  
  templates.forEach(template => {
    template.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('capacite', template.dataset.capacite);
    });
  });

  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const capacite = e.dataTransfer.getData('capacite');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    addTableToCanvas(x, y, parseInt(capacite));
  });
}

function addTableToCanvas(x, y, capacite) {
  const newTable = {
    numeroTable: tables.length + 1,
    capacite: capacite,
    x: Math.max(0, Math.min(x - 40, canvas.width - 80)),
    y: Math.max(0, Math.min(y - 30, canvas.height - 60)),
    largeur: 80,
    hauteur: 60,
    color: '#6BA539'
  };

  tables.push(newTable);
  selectedTable = tables.length - 1;
  updateProperties();
  drawCanvas();
}

// ========== ÉVÉNEMENTS SOURIS ==========
function handleCanvasMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  for (let i = tables.length - 1; i >= 0; i--) {
    const table = tables[i];
    if (x >= table.x && x <= table.x + table.largeur &&
        y >= table.y && y <= table.y + table.hauteur) {
      selectedTable = i;
      draggingTable = i;
      offsetX = x - table.x;
      offsetY = y - table.y;
      updateProperties();
      drawCanvas();
      return;
    }
  }

  selectedTable = null;
  updateProperties();
  drawCanvas();
}

function handleCanvasMouseMove(e) {
  if (draggingTable !== null) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const table = tables[draggingTable];

    table.x = Math.max(0, Math.min(x - offsetX, canvas.width - table.largeur));
    table.y = Math.max(0, Math.min(y - offsetY, canvas.height - table.hauteur));

    drawCanvas();
  }
}

function handleCanvasMouseUp(e) {
  draggingTable = null;
}

function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    if (x >= table.x && x <= table.x + table.largeur &&
        y >= table.y && y <= table.y + table.hauteur) {
      selectedTable = i;
      updateProperties();
      return;
    }
  }
}

// ========== MISE À JOUR DES PROPRIÉTÉS ==========
function updateProperties() {
  const propertiesContent = document.getElementById('propertiesContent');
  if (!propertiesContent) return;

  if (selectedTable === null) {
    propertiesContent.innerHTML = `
      <div style="text-align: center; padding: 30px 0;">
        <p style="color: #999; font-size: 0.9rem;">👆 Cliquez sur une table</p>
      </div>
    `;
    return;
  }

  const table = tables[selectedTable];
  propertiesContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div class="input-group">
        <label>Numéro</label>
        <input type="number" value="${table.numeroTable}" onchange="updateTableProperty('numeroTable', this.value)">
      </div>
      <div class="input-group">
        <label>Capacité</label>
        <input type="number" value="${table.capacite}" onchange="updateTableProperty('capacite', this.value)">
      </div>
      <div class="input-group">
        <label>Couleur</label>
        <input type="color" value="${table.color}" onchange="updateTableProperty('color', this.value)">
      </div>
      <div class="input-group">
        <label>Largeur (px)</label>
        <input type="number" value="${table.largeur}" onchange="updateTableProperty('largeur', this.value)">
      </div>
      <div class="input-group">
        <label>Hauteur (px)</label>
        <input type="number" value="${table.hauteur}" onchange="updateTableProperty('hauteur', this.value)">
      </div>
      <button class="btn-danger" onclick="deleteSelectedTable()" style="width: 100%; margin-top: 12px;">
        🗑️ Supprimer
      </button>
    </div>
  `;
}

function updateTableProperty(prop, value) {
  if (selectedTable !== null) {
    const table = tables[selectedTable];
    if (prop === 'numeroTable' || prop === 'capacite' || prop === 'largeur' || prop === 'hauteur') {
      table[prop] = parseInt(value);
    } else {
      table[prop] = value;
    }
    drawCanvas();
  }
}

function deleteSelectedTable() {
  if (selectedTable !== null && confirm('Êtes-vous sûr ?')) {
    tables.splice(selectedTable, 1);
    selectedTable = null;
    updateProperties();
    drawCanvas();
  }
}

// ========== DIMENSIONS DE LA SALLE ==========
function updateSalleDimensions() {
  const width = parseInt(document.getElementById('salleWidth').value);
  const height = parseInt(document.getElementById('salleHeight').value);

  if (width < 400 || height < 400) {
    alert('⚠️ Dimensions minimales: 400x400 px');
    return;
  }

  salleWidth = width;
  salleHeight = height;
  canvas.width = width;
  canvas.height = height;
  drawCanvas();
}

// ========== MODAL ==========
function openPlanSalleModal() {
  const modal = document.getElementById('modalPlanSalle');
  if (modal) {
    modal.classList.add('active');
    setTimeout(() => {
      if (canvas) {
        drawCanvas();
      }
    }, 100);
  }
}

function closePlanSalleModal() {
  const modal = document.getElementById('modalPlanSalle');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Fermer le modal en cliquant sur le fond
document.addEventListener('click', (e) => {
  const modal = document.getElementById('modalPlanSalle');
  if (modal && e.target === modal) {
    closePlanSalleModal();
  }
});

// ========== FIREBASE ==========
async function savePlanSalleToFirebase() {
  try {
    if (typeof window.db === 'undefined' || !window.db) {
      alert('❌ Firebase non initialisé');
      return;
    }

    const { setDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    const user = window.auth.currentUser;
    if (!user) {
      alert('❌ Veuillez vous connecter');
      return;
    }
    
    const docRef = doc(window.db, 'plansSalle', user.uid);
    
    const dataToSave = {
      dimensions: {
        largeur: salleWidth,
        hauteur: salleHeight
      },
      tables: tables,
      updatedAt: new Date().toISOString(),
      restaurantId: user.uid
    };
    
    await setDoc(docRef, dataToSave, { merge: true });
    alert('✅ Plan de salle sauvegardé !');
    console.log('✅ Plan salle sauvegardé');
    
    // Affiche le plan sur le dashboard en temps réel
    displayPlanOnDashboard();
    closePlanSalleModal();
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde:', error);
    alert('❌ Erreur: ' + error.message);
  }
}

async function loadPlanSalleFromFirebase() {
  try {
    if (typeof window.db === 'undefined' || !window.db) {
      console.warn('⚠️ Firebase non initialisé');
      drawCanvas();
      return;
    }

    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    const user = window.auth.currentUser;
    if (!user) {
      console.warn('⚠️ Utilisateur non connecté');
      drawCanvas();
      return;
    }
    
    const docRef = doc(window.db, 'plansSalle', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      salleWidth = data.dimensions?.largeur || 1000;
      salleHeight = data.dimensions?.hauteur || 700;
      tables = data.tables || [];
      
      document.getElementById('salleWidth').value = salleWidth;
      document.getElementById('salleHeight').value = salleHeight;
      
      canvas.width = salleWidth;
      canvas.height = salleHeight;
      
      drawCanvas();
      displayPlanOnDashboard();
      
      console.log('✅ Plan salle chargé');
    } else {
      console.log('ℹ️ Nouveau plan salle');
      drawCanvas();
    }
  } catch (error) {
    console.error('❌ Erreur chargement:', error);
    drawCanvas();
  }
}

// ========== AFFICHER LE PLAN SUR LE DASHBOARD ==========
function displayPlanOnDashboard() {
  console.log('🔍 displayPlanOnDashboard() appelée');
  console.log('🔍 tables:', tables);
  
  const canvasDashboard = document.getElementById('canvasPlanSalleDashboard');
  if (!canvasDashboard) {
    console.warn('⚠️ Canvas dashboard non trouvé');
    return;
  }

  const ctxDashboard = canvasDashboard.getContext('2d');
  const dashboardWidth = canvasDashboard.width;
  const dashboardHeight = canvasDashboard.height;

  // Fond blanc
  ctxDashboard.fillStyle = '#ffffff';
  ctxDashboard.fillRect(0, 0, dashboardWidth, dashboardHeight);

  // Bordure
  ctxDashboard.strokeStyle = '#d4cfc5';
  ctxDashboard.lineWidth = 2;
  ctxDashboard.strokeRect(0, 0, dashboardWidth, dashboardHeight);

  // Si pas de tables
  if (!tables || tables.length === 0) {
    console.warn('⚠️ Aucune table trouvée');
    ctxDashboard.fillStyle = '#999999';
    ctxDashboard.font = '14px sans-serif';
    ctxDashboard.textAlign = 'center';
    ctxDashboard.fillText('Aucune table créée', dashboardWidth / 2, dashboardHeight / 2);
    updatePlanStats();
    return;
  }

  console.log(`✅ Affichage de ${tables.length} tables`);

  // Calculer l'échelle
  const scaleX = dashboardWidth / salleWidth;
  const scaleY = dashboardHeight / salleHeight;

  // Dessiner les tables
  tables.forEach((table) => {
    const scaledX = table.x * scaleX;
    const scaledY = table.y * scaleY;
    const scaledWidth = table.largeur * scaleX;
    const scaledHeight = table.hauteur * scaleY;

    // Fond
    ctxDashboard.fillStyle = table.color || '#6BA539';
    ctxDashboard.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

    // Bordure
    ctxDashboard.strokeStyle = '#333333';
    ctxDashboard.lineWidth = 2;
    ctxDashboard.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

    // Texte
    ctxDashboard.fillStyle = '#ffffff';
    ctxDashboard.font = 'bold 12px sans-serif';
    ctxDashboard.textAlign = 'center';
    ctxDashboard.textBaseline = 'middle';
    ctxDashboard.fillText(`T${table.numeroTable}`, scaledX + scaledWidth / 2, scaledY + scaledHeight / 2);
  });

  updatePlanStats();
}

// ========== METTRE À JOUR LES STATS ==========
function updatePlanStats() {
  if (!tables) {
    document.getElementById('totalTables').textContent = '0';
    document.getElementById('totalPlaces').textContent = '0';
    return;
  }

  const totalTables = tables.length;
  const totalPlaces = tables.reduce((sum, table) => sum + (table.capacite || 0), 0);

  document.getElementById('totalTables').textContent = totalTables;
  document.getElementById('totalPlaces').textContent = totalPlaces;

  console.log(`📊 Stats: ${totalTables} tables, ${totalPlaces} places`);
}

// ========== CHARGER LE PLAN AU DÉMARRAGE DU DASHBOARD ==========
window.loadDashboardPlan = async function() {
  try {
    if (typeof window.db === 'undefined' || !window.db) {
      console.warn('⚠️ Firebase non initialisé');
      return;
    }

    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    
    const user = window.auth.currentUser;
    if (!user) {
      console.warn('⚠️ Utilisateur non connecté');
      return;
    }
    
    const docRef = doc(window.db, 'plansSalle', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      salleWidth = data.dimensions?.largeur || 1000;
      salleHeight = data.dimensions?.hauteur || 700;
      tables = data.tables || [];
      
      console.log('✅ Plan chargé sur dashboard');
      displayPlanOnDashboard();
    } else {
      console.log('ℹ️ Pas de plan sauvegardé');
      tables = [];
      updatePlanStats();
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

// ========== EXPORTS GLOBAUX ==========
window.openPlanSalleModal = openPlanSalleModal;
window.closePlanSalleModal = closePlanSalleModal;
window.displayPlanOnDashboard = displayPlanOnDashboard;
window.loadDashboardPlan = window.loadDashboardPlan;
window.updateSalleDimensions = updateSalleDimensions;
