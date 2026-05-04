import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const API_KEY = '42cd365743b38b7fec6c2366d90c6c0a';
const IMG_URL = 'https://image.tmdb.org/t/p/w500'; // Cambiado a w500 para mejor calidad como en tu perfil

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
const auth = getAuth(app);

// Email del logueado en el header
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('user-email-display').innerText = user.email;
        // Si el usuario está logueado, comprobamos si ya sigue al perfil que está visitando
        verificarSeguimiento(user.uid, targetUid);
    }
});

const urlParams = new URLSearchParams(window.location.search);
const targetUid = urlParams.get('uid');

if (!targetUid) window.location.href = 'explorar.html';

document.addEventListener('DOMContentLoaded', cargarPerfilPublico);

async function cargarPerfilPublico() {
    document.body.style.display = "flex";
    try {
        const userRef = doc(db, 'Usuarios', targetUid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            document.getElementById('view-username').innerText = "Usuario no encontrado";
            return;
        }

        const data = userSnap.data();

        // Datos básicos
        document.getElementById('view-username').innerText = `@${data.username || 'Cinéfilo'}`;
        document.getElementById('user-data').innerText = `${data.nombre || ''} ${data.apellido || ''}`.trim();
        
        if (data.fechaRegistro) {
            const fecha = data.fechaRegistro.seconds ? data.fechaRegistro.toDate() : new Date(data.fechaRegistro);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            document.getElementById('user-time').innerText = `Activo desde ${fechaFormateada}`;
        }

        const puntuaciones = data.listaPuntuaciones || {};
        const deseos = data.listaDeseos || [];

        document.getElementById('view-stats').innerText = `${Object.keys(puntuaciones).length} valoraciones | ${deseos.length} en lista de deseos`;
        
        // Seguidores/Seguidos
        if (document.getElementById('display-seguidores')) document.getElementById('display-seguidores').innerText = data.seguidores || 0;
        if (document.getElementById('display-seguidos')) document.getElementById('display-seguidos').innerText = data.seguidos || 0;

        const tierContainer = document.querySelector('.tier-list-container');
        const ratedMoviesSection = document.querySelector('.data.valoradas');

        if (Object.keys(puntuaciones).length > 0) {
            // Si hay aunque sea una puntuación, mostramos la Tier List completa
            if (tierContainer) tierContainer.style.display = "block"; 
            await organizarTierList(puntuaciones);
        } else {
            // Si no hay absolutamente nada valorado, ocultamos la tabla y ponemos el mensaje
            if (tierContainer) tierContainer.style.display = "none";
            const emptyMsg = document.createElement('p');
            emptyMsg.style.cssText = "color:#888; text-align: center; width: 100%; padding: 20px 0;";
            emptyMsg.innerText = "Este usuario aún no ha valorado ninguna película.";
            ratedMoviesSection.appendChild(emptyMsg);
        }

        // MANEJO DE LISTA DE DESEOS (Ya lo tenías bien, pero unificado)
        if (deseos.length > 0) {
            await cargarListaDeseos(deseos);
        } else {
            const watchContainer = document.getElementById('watchlist-grid');
            watchContainer.style.display = "flex";
            if (watchContainer) {
                watchContainer.innerHTML = "<p style='margin: 0 auto; padding: 20px 0; color:#888; text-align: center;'>Este usuario no tiene películas en su lista.</p>";
            }
        }

        ocultarLoader();

    } catch (error) {
        console.error("ERROR CRÍTICO:", error);
    }
}

function ocultarLoader() {
    const loader = document.getElementById('loader-overlay');
    // Asegúrate de que el contenedor del perfil sea visible
    const mainContainer = document.getElementById('public-profile-container');
    if (mainContainer) mainContainer.style.display = 'block';

    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}

// LÓGICA DE TIERS (Copiada de tu perfil)
async function organizarTierList(puntuaciones) {
    const entries = Object.entries(puntuaciones);
    
    for (const [itemKey, nota] of entries) {
        try {
            // Separamos tipo e ID (ej: "movie_123" -> ["movie", "123"])
            const [tipo, idReal] = itemKey.split('_');
            const fetchTipo = idReal ? tipo : 'movie';
            const fetchId = idReal ? idReal : itemKey;

            const res = await fetch(`https://api.themoviedb.org/3/${fetchTipo}/${fetchId}?api_key=${API_KEY}&language=es-ES`);
            const peli = await res.json();

            let tierId = "";
            const n = parseFloat(nota);
            if (n >= 9.5) tierId = "tier-s";
            else if (n >= 8.5) tierId = "tier-a";
            else if (n >= 7.0) tierId = "tier-b";
            else if (n >= 5.5) tierId = "tier-c";
            else if (n >= 4.0) tierId = "tier-d";
            else if (n >= 2.5) tierId = "tier-e";
            else tierId = "tier-f";

            const filaTier = document.getElementById(tierId);
            const contenedor = filaTier ? filaTier.querySelector('.tier-content') : null;

            if (contenedor && peli.poster_path) {
                const img = document.createElement('img');
                img.src = IMG_URL + peli.poster_path;
                img.classList.add('movie-card', 'movie-tier');
                img.style.cursor = "pointer";
                
                // TMDB usa 'title' para películas y 'name' para series
                const nombreMostrar = peli.title || peli.name;
                img.title = `${nombreMostrar}: ${nota}`;
                
                // Pasamos ID y Tipo a la página de info
                img.onclick = () => window.location.href = `info-pelicula.html?id=${fetchId}&type=${fetchTipo}`;
                contenedor.appendChild(img);
            }
        } catch (e) { 
            console.error("Error tier:", e); 
        }
    }
}

// LÓGICA DE WISHLIST (Copiada de tu perfil)
async function cargarListaDeseos(idsCombinados) {
    const contenedor = document.getElementById('watchlist-grid');
    contenedor.innerHTML = ""; 

    for (const itemKey of idsCombinados) {
        try {
            const [tipo, idReal] = itemKey.split('_');
            const fetchTipo = idReal ? tipo : 'movie';
            const fetchId = idReal ? idReal : itemKey;

            const res = await fetch(`https://api.themoviedb.org/3/${fetchTipo}/${fetchId}?api_key=${API_KEY}&language=es-ES`);
            const peli = await res.json();

            if (peli.poster_path) {
                const card = document.createElement('div');
                card.classList.add('movie-card-watchlist'); 
                card.style.cursor = "pointer";
                card.onclick = () => window.location.href = `info-pelicula.html?id=${fetchId}&type=${fetchTipo}`;

                const nombreMostrar = peli.title || peli.name;

                card.innerHTML = `
                    <img src="${IMG_URL + peli.poster_path}" alt="${nombreMostrar}">
                    <div class="movie-info">
                        <h4>${nombreMostrar}</h4>
                        <span class="rating">⭐ ${peli.vote_average.toFixed(1)}</span>
                    </div>
                `;
                contenedor.appendChild(card);
            }
        } catch (e) { 
            console.error("Error wishlist:", e); 
        }
    }
}

async function verificarSeguimiento(miUid, suUid) {
    if (miUid === suUid) {
        // Si es mi propio perfil, ocultamos el botón de seguir
        document.querySelector('.btn-follow').style.display = 'none';
        return;
    }

    const followBtn = document.querySelector('.btn-follow');
    
    // Buscamos en la colección "Relaciones" si existe el vínculo
    const q = query(collection(db, "Relaciones"), 
                where("followerId", "==", miUid), 
                where("followingId", "==", suUid));
    
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        // Ya lo sigo
        followBtn.innerText = "Dejar de seguir";
        followBtn.classList.add("following");
        
        // Al hacer clic, primero preguntamos
        followBtn.onclick = () => confirmarUnfollow(miUid, suUid, querySnapshot.docs[0].id);
    } else {
        // No lo sigo
        followBtn.innerText = "Seguir";
        followBtn.classList.remove("following");
        followBtn.onclick = () => ejecutarFollow(miUid, suUid);
    }
}

async function ejecutarFollow(miUid, suUid) {
    const followBtn = document.querySelector('.btn-follow');
    followBtn.disabled = true; // Evitar múltiples clics

    try {
        // 1. Crear relación
        await addDoc(collection(db, "Relaciones"), {
            followerId: miUid,
            followingId: suUid,
            fecha: new Date()
        });

        // 2. Actualizar contadores
        await updateDoc(doc(db, "Usuarios", miUid), { seguidos: increment(1) });
        await updateDoc(doc(db, "Usuarios", suUid), { seguidores: increment(1) });

        // 3. Actualizar UI
        actualizarContadorVisual('display-seguidores', 1);
        verificarSeguimiento(miUid, suUid);
    } catch (error) {
        console.error("Error al seguir:", error);
    } finally {
        followBtn.disabled = false;
    }
}

async function ejecutarUnfollow(miUid, suUid, relacionId) {
    const followBtn = document.querySelector('.btn-follow');
    followBtn.disabled = true;

    try {
        // 1. Borrar relación
        await deleteDoc(doc(db, "Relaciones", relacionId));

        // 2. Actualizar contadores
        await updateDoc(doc(db, "Usuarios", miUid), { seguidos: increment(-1) });
        await updateDoc(doc(db, "Usuarios", suUid), { seguidores: increment(-1) });

        // 3. Actualizar UI
        actualizarContadorVisual('display-seguidores', -1);
        verificarSeguimiento(miUid, suUid);
    } catch (error) {
        console.error("Error al dejar de seguir:", error);
    } finally {
        followBtn.disabled = false;
    }
}

function confirmarUnfollow(miUid, suUid, relacionId) {
    const username = document.getElementById('view-username').innerText;

    Swal.fire({
        title: '¿Dejar de seguir?',
        text: `Ya no verás la actividad de ${username} en tu feed.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#D4AF37',
        cancelButtonColor: '#888',
        confirmButtonText: 'Sí, dejar de seguir',
        cancelButtonText: 'Cancelar',
        background: '#1a1a1a', // Color oscuro para que pegue con tu web
        color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            ejecutarUnfollow(miUid, suUid, relacionId);
            
            // Opcional: Mostrar un pequeño mensaje de éxito después
            Swal.fire({
                title: 'Confirmado',
                text: 'Has dejado de seguir a este usuario.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: '#1a1a1a',
                color: '#fff'
            });
        }
    });
}

function actualizarContadorVisual(id, cambio) {
    const el = document.getElementById(id);
    if (el) {
        let valorActual = parseInt(el.innerText) || 0;
        el.innerText = valorActual + cambio;
    }
}

const ProfileAlert = Swal.mixin({
    background: '#1a1a1a',
    color: '#ffffff',
    confirmButtonColor: '#D4AF37',
    cancelButtonColor: '#444'
});

const btnSeguidores = document.getElementById('display-seguidores');
const btnSeguidos = document.getElementById('display-seguidos');

if (btnSeguidores) {
    btnSeguidores.style.cursor = "pointer";
    btnSeguidores.onclick = () => mostrarListaRelaciones('seguidores');
}

if (btnSeguidos) {
    btnSeguidos.style.cursor = "pointer";
    btnSeguidos.onclick = () => mostrarListaRelaciones('seguidos');
}

async function mostrarListaRelaciones(tipo) {
    const miUid = auth.currentUser ? auth.currentUser.uid : null; 
    const esSeguidores = tipo === 'seguidores';
    
    ProfileAlert.fire({ title: 'Cargando...', didOpen: () => { Swal.showLoading(); } });

    try {
        const campoFiltro = esSeguidores ? "followingId" : "followerId";
        const q = query(collection(db, "Relaciones"), where(campoFiltro, "==", targetUid));
        const snapRelaciones = await getDocs(q);

        if (snapRelaciones.empty) {
            return ProfileAlert.fire({
                title: esSeguidores ? 'Seguidores' : 'Personas que sigue',
                text: 'No hay nadie todavía.',
                icon: 'info'
            });
        }

        let htmlLista = `<div style="max-height: 300px; overflow-y: auto; text-align: left;">`;
        
        for (const docRel of snapRelaciones.docs) {
            const relData = docRel.data();
            const idUsuario = esSeguidores ? relData.followerId : relData.followingId;
            
            const userSnap = await getDoc(doc(db, "Usuarios", idUsuario));
            if (userSnap.exists()) {
                const u = userSnap.data();
                
                // --- CAMBIO AQUÍ: Validar si el usuario de la lista soy yo ---
                const esYo = idUsuario === miUid;

                htmlLista += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 1px; border-bottom: 1px solid #333;">
                        <span style="font-weight: bold; color: #D4AF37; font-style: italic;">@${u.username}</span>
                        
                        ${!esYo ? `
                            <button class="btn-action-follow" data-id="${idUsuario}" data-relid="${docRel.id}" 
                                style="padding: 7px 5px; font-size: 0.8rem; cursor: pointer; background: #D4AF37; font-weight: bold; color: white; border-radius: 5px; border:none;">
                                ${esSeguidores ? 'Seguir' : 'Dejar de seguir'}
                            </button>
                        ` : `
                            <span style="color: #888; font-size: 0.8rem; padding-right: 10px;"></span>
                        `}
                    </div>`;
            }
        }
        htmlLista += `</div>`;

        ProfileAlert.fire({
            title: esSeguidores ? 'Seguidores' : 'Personas que sigue',
            html: htmlLista,
            showConfirmButton: false,
            didOpen: () => {
                const botones = document.querySelectorAll('.btn-action-follow');
                botones.forEach(btn => {
                    btn.onclick = async () => {
                        const targetId = btn.getAttribute('data-id');
                        const relDocId = btn.getAttribute('data-relid');

                        if (!esSeguidores) {
                            await dejarDeSeguir(targetId, relDocId);
                            mostrarListaRelaciones('seguidos'); 
                        } else {
                            await ejecutarFollow(miUid, targetId); // Asegúrate de pasar miUid aquí
                            mostrarListaRelaciones('seguidores'); 
                        }
                    };
                });
            }
        });

    } catch (error) {
        console.error("Error al cargar lista:", error);
        ProfileAlert.fire('Error', 'No se pudo obtener la lista.', 'error');
    }
}

// Función auxiliar para dejar de seguir
async function dejarDeSeguir(targetId, relDocId) {
    const miId = auth.currentUser.uid;
    try {
        await deleteDoc(doc(db, "Relaciones", relDocId));
        await updateDoc(doc(db, "Usuarios", miId), { seguidos: increment(-1) });
        await updateDoc(doc(db, "Usuarios", targetId), { seguidores: increment(-1) });
    } catch (e) {
        console.error(e);
    }
}