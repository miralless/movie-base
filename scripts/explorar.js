import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; // Añadido Auth

const firebaseConfig = {
    apiKey: "AIzaSyD6qzEKBpPysfxpTHAfua-BToUBYglee1E",
    authDomain: "moviebase-43cc7.firebaseapp.com",
    projectId: "moviebase-43cc7",
    storageBucket: "moviebase-43cc7.firebasestorage.app",
    messagingSenderId: "568203402282",
    appId: "1:568203402282:web:6387c01d9095bdb806f753",
    measurementId: "G-QYG2PCM5SR"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app); // Inicializamos Auth

const searchInput = document.getElementById('search-user-input');
const searchBtn = document.getElementById('search-user-btn');
const resultsContainer = document.getElementById('search-results');

// Guardaremos el UID del usuario actual aquí
let miUsuarioUid = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        miUsuarioUid = user.uid;
    }
    // Cargamos sugeridos una vez sabemos quién es el usuario logueado
    mostrarSugeridos();
});

searchBtn.addEventListener('click', realizarBusqueda);

searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') realizarBusqueda();
});

async function realizarBusqueda() {
    const queryText = searchInput.value.trim();
    if (!queryText) {
        mostrarSugeridos();
        return;
    }

    resultsContainer.innerHTML = "<p>Buscando similares...</p>";

    try {
        const usuariosRef = collection(db, "Usuarios");
        const q = query(
            usuariosRef, 
            where("username", ">=", queryText),
            where("username", "<=", queryText + '\uf8ff')
        );

        const querySnapshot = await getDocs(q);
        resultsContainer.innerHTML = ""; 

        let resultadosEncontrados = 0;

        querySnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            const userId = docSnap.id;

            // --- FILTRO: Si el ID es el mío, lo saltamos ---
            if (userId === miUsuarioUid) return;

            resultadosEncontrados++;
            const numPuntis = userData.listaPuntuaciones ? Object.keys(userData.listaPuntuaciones).length : 0;

            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            userCard.style = "background: #333; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #D4AF37;";
            
            userCard.innerHTML = `
                <h3 style="color: #D4AF37; margin: 0; font-style: italic;">${userData.username}</h3>
                <p style="color: #bbb; font-size: 0.9rem; margin-top: 5px;">${numPuntis} películas valoradas</p>
                <button class="view-profile-btn" data-id="${userId}" style="margin-top: 10px; background: #D4AF37; color: white; font-weight: bold; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; font-size: 0.75rem">
                    Ver Perfil
                </button>
            `;
            resultsContainer.appendChild(userCard);
        });

        if (resultadosEncontrados === 0) {
            resultsContainer.innerHTML = "<p>No hay coincidencias.</p>";
        }

        document.querySelectorAll('.view-profile-btn').forEach(btn => {
            btn.onclick = (e) => {
                const uid = e.target.getAttribute('data-id');
                window.location.href = `profile.html?uid=${uid}`;
            };
        });

    } catch (error) {
        console.error("Error en búsqueda:", error);
    }
}

async function mostrarSugeridos() {
    if (searchInput.value.trim() !== "") return;

    try {
        const usuariosRef = collection(db, "Usuarios");
        const q = query(usuariosRef, limit(20)); 
        const querySnapshot = await getDocs(q);

        let todosLosUsuarios = [];
        querySnapshot.forEach(doc => {
            // --- FILTRO: Solo añadimos al array si no soy yo ---
            if (doc.id !== miUsuarioUid) {
                todosLosUsuarios.push({ id: doc.id, ...doc.data() });
            }
        });

        const mezclados = todosLosUsuarios.sort(() => 0.5 - Math.random());
        const seleccionados = mezclados.slice(0, 5);

        let htmlSugeridos = `
            <div class="welcome-container">
                <i class="fa-solid fa-users-viewfinder" style="font-size: 3rem; color: #D4AF37; margin-bottom: 15px;"></i>
                <h2>Descubre a otros cinéfilos</h2>
                <p>Encuentra amigos para ver qué están puntuando.</p>
            </div>
            <div class="suggested-grid">
        `;

        seleccionados.forEach(user => {
            htmlSugeridos += `
                <div class="mini-user-card">
                    <span style="font-weight: bold; font-style: italic; margin-top: 5px">@${user.username || 'Usuario'}</span>
                    <button id="btn-see-profile" onclick="window.location.href='profile.html?uid=${user.id}'">Ver perfil</button>
                </div>
            `;
        });

        htmlSugeridos += `</div>`;
        resultsContainer.innerHTML = htmlSugeridos;

    } catch (error) {
        console.error("Error cargando sugeridos:", error);
    }
}