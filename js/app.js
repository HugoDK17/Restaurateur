document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ app.js chargé');

    // ========== FIREBASE CONFIG ==========
    const firebaseConfig = {
        apiKey: "AIzaSyDYDBSeZr8fhE8KNLq7d4-8gnpmiFJP664",
        authDomain: "table-call-20741.firebaseapp.com",
        projectId: "table-call-20741",
        storageBucket: "table-call-20741.firebasestorage.app",
        messagingSenderId: "556709987942",
        appId: "1:556709987942:web:ff317b8712c3f5843f4fa7",
        measurementId: "G-F264YF4V91"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    console.log('✅ Firebase initialisé');

    // ========== VARIABLES GLOBALES ==========
    let currentUser = null;
    const restaurantsList = document.getElementById('restaurantsList');
    const logoutBtn = document.getElementById('logoutBtn');

    // ========== LOGOUT ==========
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
    }

    // ========== TABS ==========
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Active le bon tab
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('[data-section]').forEach(s => s.classList.remove('active'));
            
            btn.classList.add('active');
            document.querySelector(`[data-section="${tabName}"]`).classList.add('active');
        });
    });

    // ========== CRÉER UN RESTAURANT ==========
    const submitCreateBtn = document.getElementById('submitCreateBtn');
    
    if (submitCreateBtn) {
        submitCreateBtn.addEventListener('click', async () => {
            const name = document.getElementById('restaurantNameInput').value.trim();
            const email = document.getElementById('restaurantEmailInput').value.trim();
            const password = document.getElementById('restaurantPasswordInput').value;

            console.log('📍 Tentative création restaurant :', { name, email });

            if (!name || !email || !password) {
                showNotification('❌ Remplis tous les champs !', 'error');
                return;
            }

            if (password.length < 6) {
                showNotification('❌ Le mot de passe doit avoir minimum 6 caractères !', 'error');
                return;
            }

            try {
                // Crée l'utilisateur Firebase Auth
                console.log('🔐 Création utilisateur Firebase...');
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const restaurantUID = userCredential.user.uid;
                console.log('✅ Utilisateur créé :', restaurantUID);

                // Crée le document dans "users"
                await db.collection('users').doc(restaurantUID).set({
                    email: email,
                    role: 'restaurant',
                    restaurantName: name,
                    createdAt: new Date(),
                    createdBy: currentUser.uid
                });
                console.log('✅ Document utilisateur créé');

                // Crée le restaurant dans "Restaurants"
                await db.collection('Restaurants').add({
                    nom: name,
                    email: email,
                    uid: restaurantUID,
                    createdAt: new Date(),
                    createdBy: currentUser.uid
                });
                console.log('✅ Restaurant créé');

                showNotification(`✅ Restaurant "${name}" créé avec succès !`, 'success');

                // Réinitialise le formulaire
                document.getElementById('restaurantNameInput').value = '';
                document.getElementById('restaurantEmailInput').value = '';
                document.getElementById('restaurantPasswordInput').value = '';

                loadRestaurants();
            } catch (error) {
                console.error('❌ Erreur :', error);
                showNotification('❌ ' + error.message, 'error');
            }
        });
    }

    // ========== CHARGER LES RESTAURANTS ==========
    async function loadRestaurants() {
        try {
            const snapshot = await db.collection('Restaurants').get();
            restaurantsList.innerHTML = '';

            console.log('✅ Restaurants chargés :', snapshot.size);

            if (snapshot.empty) {
                restaurantsList.innerHTML = '<p style="color: #ccc; text-align: center;">Aucun restaurant</p>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const restaurantId = doc.id;

                // Crée l'élément restaurant
                const item = document.createElement('div');
                item.className = 'restaurant-item';
                item.innerHTML = `
                    <span class="restaurant-name">${data.nom}</span>
                    <button class="btn-delete-small" data-id="${restaurantId}">🗑️</button>
                `;

                // Click pour voir les commandes
                item.querySelector('.restaurant-name').addEventListener('click', () => {
                    document.querySelectorAll('.restaurant-item').forEach(el => {
                        el.classList.remove('active');
                    });
                    item.classList.add('active');
                    loadCommandes(restaurantId, data.nom);
                });

                // Click sur la poubelle
                item.querySelector('.btn-delete-small').addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log('🗑️ Suppression demandée pour :', data.nom);
                    showDeleteConfirmation(restaurantId, data.nom);
                });

                restaurantsList.appendChild(item);
            });
        } catch (error) {
            console.error('❌ Erreur chargement restaurants :', error);
        }
    }

    // ========== AFFICHER LA MODALE DE CONFIRMATION ==========
    function showDeleteConfirmation(restaurantId, restaurantName) {
        const modal = document.getElementById('confirmModal');
        const message = document.getElementById('modalMessage');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const cancelBtn = document.getElementById('cancelDeleteBtn');

        message.textContent = `Supprimer le restaurant "${restaurantName}" ? Cette action est irréversible.`;

        modal.classList.add('show');

        confirmBtn.onclick = () => {
            modal.classList.remove('show');
            deleteRestaurant(restaurantId, restaurantName);
        };

        cancelBtn.onclick = () => {
            modal.classList.remove('show');
        };
    }

    // ========== SUPPRIMER UN RESTAURANT ==========
    async function deleteRestaurant(restaurantId, restaurantName) {
        try {
            console.log('🗑️ Suppression du restaurant :', restaurantId);

            // Récupère l'UID
            const restaurantDoc = await db.collection('Restaurants').doc(restaurantId).get();
            const restaurantUID = restaurantDoc.data().uid;

            // Supprime le restaurant
            await db.collection('Restaurants').doc(restaurantId).delete();
            console.log('✅ Restaurant supprimé');

            // Supprime l'utilisateur Firestore
            await db.collection('users').doc(restaurantUID).delete();
            console.log('✅ Utilisateur supprimé');

            showNotification(`✅ Restaurant "${restaurantName}" supprimé !`, 'success');
            loadRestaurants();
        } catch (error) {
            console.error('❌ Erreur suppression :', error);
            showNotification('❌ Erreur : ' + error.message, 'error');
        }
    }

    // ========== CHARGER LES COMMANDES ==========
    async function loadCommandes(restaurantId, restaurantName) {
        try {
            const content = document.getElementById('content');
            content.innerHTML = `<div class="restaurant-name-display">📍 ${restaurantName}</div>`;

            const snapshot = await db.collection('Restaurants')
                .doc(restaurantId)
                .collection('Commandes')
                .orderBy('date', 'desc')
                .get();

            if (snapshot.empty) {
                content.innerHTML += '<div class="no-selection">📭 Aucune commande</div>';
                return;
            }

            snapshot.forEach(doc => {
                const commande = doc.data();
                const dateStr = commande.date ? commande.date.toDate().toLocaleString('fr-FR') : 'N/A';
                const total = commande.total || 0;

                const item = document.createElement('div');
                item.className = 'commande-item';
                item.innerHTML = `
                    <strong>📦 #${doc.id.slice(0, 8)}</strong><br>
                    <small>📅 ${dateStr}</small><br>
                    <strong>💰 ${total.toFixed(2)}€</strong>
                `;

                content.appendChild(item);
            });
        } catch (error) {
            console.error('❌ Erreur commandes :', error);
        }
    }

    // ========== VÉRIFIER L'AUTHENTIFICATION ==========
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log('✅ Utilisateur connecté :', user.email);
            loadRestaurants();
        } else {
            console.log('❌ Non connecté - Redirection');
            window.location.href = 'login.html';
        }
    });

    // ========== NOTIFICATION ==========
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
});
