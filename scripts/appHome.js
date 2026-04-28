import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc, increment, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const API_KEY = '42cd365743b38b7fec6c2366d90c6c0a';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// Misma configuración que en app.js
const firebaseConfig = {
    apiKey: "AIzaSyD6qzEKBpPysfxpTHAfua-BToUBYglee1E",
    authDomain: "moviebase-43cc7.firebaseapp.com",
    projectId: "moviebase-43cc7",
    storageBucket: "moviebase-43cc7.firebasestorage.app",
    messagingSenderId: "568203402282",
    appId: "1:568203402282:web:6387c01d9095bdb806f753"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Si no hay sesión, mandamos al usuario al login de inmediato
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        const emailDisplay = document.getElementById('user-email-display');
        if (emailDisplay) emailDisplay.innerText = user.email;
        if (window.location.pathname.includes('home.html')) {
            cargarFeed(user.uid);
        }
        try {
            const docRef = doc(db, "Usuarios", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();

                // Ponemos el nombre en el span del saludo
                document.getElementById('user-name').innerText = userData.username;
                
                // Rellenamos los datos de la sección info (si existen los IDs)
                if(document.getElementById('name')) {
                    document.getElementById('name').innerText = `${userData.nombre} ${userData.apellido}`;
                }
                if(document.getElementById('email')) {
                    document.getElementById('email').innerText = userData.email;
                }
                if(document.getElementById('user')) {
                    document.getElementById('user').innerText = userData.username;
                }
                if(document.getElementById('date')) {
                    const fecha = userData.fechaRegistro.toDate();
    
                    // 2. Formatear como DD/MM/YYYY
                    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
    
                    document.getElementById('date').innerText = fechaFormateada;
                }
                if (userData.seguidores !== undefined) {
                    document.getElementById('display-seguidores').innerText = userData.seguidores;
                }
                if (userData.seguidos !== undefined) {
                    document.getElementById('display-seguidos').innerText = userData.seguidos;
                }
                if (userData.listaDeseos && userData.listaDeseos.length > 0) {
                    cargarListaDeseos(userData.listaDeseos);
                } else {
                    document.getElementById('wishlist-container').style.display = "flex";
                    document.getElementById('wishlist-container').innerHTML = "<p style='padding:20px; color:#888; width: 100%;'>¡Añade películas o series a tu lista de deseos!</p>";
                }
                if (userData.listaPuntuaciones) {
                    organizarTierList(userData.listaPuntuaciones);
                }

            } else {
                console.log("No se encontraron datos del usuario en Firestore");
            }
        } catch (error) {
            console.error("Error al obtener datos:", error);
        }

        ocultarLoader();
        document.body.style.display = 'flex';
    }
});

// Lógica del botón cerrar sesión (ya que estamos en otra página)
window.cerrarSesion = () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
};

const currentPath = window.location.pathname;

// Seleccionar todos los enlaces del footer secundario
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
    // Si el href del enlace coincide con la ruta actual
    if (currentPath.includes(item.getAttribute('href'))) {
        item.classList.add('active');
    }
});

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        });
    });
}

async function ejecutarFollow(idDestino) {
    const miId = auth.currentUser.uid;

    try {
        // 1. Crear la relación (Para saber QUIÉN es quién luego)
        await addDoc(collection(db, "Relaciones"), {
            followerId: miId,
            followingId: idDestino,
            fecha: new Date()
        });

        // 2. Actualizar mi contador de "Siguiendo"
        const miRef = doc(db, "Usuarios", miId);
        await updateDoc(miRef, {
            seguidos: increment(1) // Firebase suma 1 automáticamente
        });

        // 3. Actualizar su contador de "Seguidores"
        const suRef = doc(db, "Usuarios", idDestino);
        await updateDoc(suRef, {
            seguidores: increment(1)
        });

        console.log("¡Sincronización de follow completada!");
    } catch (error) {
        console.error("Error en la operación de follow:", error);
    }
}

async function cargarListaDeseos(ids) {
    const contenedor = document.getElementById('wishlist-container');
    contenedor.innerHTML = ""; // Limpiar

    // Recorremos cada ID del array de Firebase
    for (const id of ids) {
        try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=es-ES`);
            const peli = await res.json();

            if (peli.poster_path) {
                const card = document.createElement('div');
                card.classList.add('movie-card-watchlist');
                // Reutilizamos la lógica de clic para ir al detalle
                card.style.cursor = "pointer";
                card.onclick = () => window.location.href = `info-pelicula.html?id=${peli.id}`;

                card.innerHTML = `
                    <img src="${IMG_URL + peli.poster_path}" alt="${peli.title}">
                    <div class="movie-info">
                        <h4>${peli.title}</h4>
                        <span class="rating">⭐ ${peli.vote_average.toFixed(1)}</span>
                    </div>
                `;
                contenedor.appendChild(card);
            }
        } catch (error) {
            console.error("Error al cargar peli de la wishlist:", error);
        }
    }
}

async function organizarTierList(puntuaciones) {
    const entries = Object.entries(puntuaciones);

    for (const [id, nota] of entries) {
        try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=es-ES`);
            const peli = await res.json();

            let tierId = "";
            
            // Nueva escala para 7 niveles
            if (nota >= 9.5) tierId = "tier-s";
            else if (nota >= 8.5) tierId = "tier-a";
            else if (nota >= 7.0) tierId = "tier-b";
            else if (nota >= 5.5) tierId = "tier-c";
            else if (nota >= 4.0) tierId = "tier-d";
            else if (nota >= 2.5) tierId = "tier-e";
            else tierId = "tier-f";

            const contenedor = document.querySelector(`#${tierId} .tier-content`);
            if (!contenedor) continue;

            const img = document.createElement('img');
            img.src = IMG_URL + peli.poster_path;
            img.classList.add('movie-card');
            img.classList.add('movie-tier');
            img.style.cursor = "pointer";
            img.title = `${peli.title}: ${nota}`;
            img.onclick = () => window.location.href = `info-pelicula.html?id=${peli.id}`;

            contenedor.appendChild(img);

        } catch (error) {
            console.error("Error cargando peli:", error);
        }
    }
}

function ocultarLoader() {
    const loader = document.getElementById('loader-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500); // Coincide con la transición del CSS
    }
}

async function cargarFeed(miUid) {
    const mainContainer = document.querySelector('main');

    try {
        // 1. Obtener a quién sigo
        const qSeguidos = query(collection(db, "Relaciones"), where("followerId", "==", miUid));
        const snapSeguidos = await getDocs(qSeguidos);
        
        if (snapSeguidos.empty) {
            mainContainer.innerHTML = `
                <div style="text-align:center; padding:50px; color:#888;">
                    <i class="fa-solid fa-user-plus" style="font-size:3rem; margin-bottom:15px;"></i>
                    <p>Aún no sigues a nadie. ¡Explora para ver actividad!</p>
                </div>`;
            return;
        }

        const listaSeguidosIds = snapSeguidos.docs.map(doc => doc.data().followingId);

        // 2. Traer actividad de esos IDs (máximo 10 a la vez por limitación de Firestore en 'in')
        // Si sigues a más de 10, habría que hacer varias consultas, pero para empezar:
        const qActividad = query(
            collection(db, "Actividades"),
            where("userId", "in", listaSeguidosIds.slice(0, 10)), 
            orderBy("fecha", "desc"),
            limit(20)
        );

        const snapActividad = await getDocs(qActividad);
        mainContainer.innerHTML = ""; // Limpiar cargando

        if (snapActividad.empty) {
            mainContainer.innerHTML = "<p style='text-align:center; color:#888; padding:20px;'>Tus amigos aún no han hecho nada recientemente.</p>";
            return;
        }

        snapActividad.forEach(docAct => {
            const act = docAct.data();
            renderizarActividad(act, mainContainer);
        });

    } catch (error) {
        console.error("Error en el feed:", error);
        mainContainer.innerHTML = "<p>Error al cargar el feed. Asegúrate de tener el índice de Firestore creado.</p>";
    }
}

function renderizarActividad(act, contenedor) {
    const div = document.createElement('div');
    div.className = 'activity-card';
    
    // Formatear el mensaje según el tipo
    let mensaje = "";
    if (act.tipo === "valoracion") {
        mensaje = `<span class="user-highlight">@${act.username}</span> ha valorado esta película con un <b style="color:#D4AF37;">${act.nota}/10</b>`;
    } else {
        mensaje = `<span class="user-highlight">@${act.username}</span> ha añadido esta película a su lista de deseos!`;
    }

    div.innerHTML = `
        <div class="activity-header">
            <p style="font-weight: bold; font-size: 1rem; text-decoration: underline; margin-top: 0">
                ${new Date(act.fecha.seconds * 1000).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </p>
            ${mensaje}
        </div>
        <div class="activity-content" onclick="window.location.href='info-pelicula.html?id=${act.peliId}'">
            <img src="${act.peliPoster}" alt="${act.peliNombre}">
            <div class="activity-info">
                <h4>${act.peliNombre}</h4>
            </div>
        </div>
    `;
    contenedor.appendChild(div);
}