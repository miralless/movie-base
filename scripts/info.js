import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteField, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const API_KEY = '42cd365743b38b7fec6c2366d90c6c0a';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

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
const auth = getAuth(app);
const db = getFirestore(app);

const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const type = params.get('type') || 'movie'; // Por defecto movie

let userId = null;
let isEnListaDeseos = false;
let yaPuntuada = false;

const MovieAlert = Swal.mixin({
    background: '#2a2a2a',
    color: '#ffffff',
    confirmButtonColor: '#D4AF37'
});

onAuthStateChanged(auth, async (user) => {
    await cargarDetalles();
    if (user) {
        userId = user.uid;
        verificarEstadoUsuario();
    }
});

async function cargarDetalles() {
    if (!id) return; // Corregido: Ahora sale si NO hay ID
    try {
        // 1. Obtener detalles básicos - Corregido: Usar API_KEY y variable id
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${API_KEY}&language=es-ES`);
        const peli = await res.json();
        
        // 2. Obtener proveedores de streaming - Corregido: Usar variable id
        const resProviders = await fetch(`https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${API_KEY}`);
        const providersData = await resProviders.json();
        
        const spainProviders = providersData.results?.ES?.flatrate || []; 

        const fechaFormateada = peli.release_date ? peli.release_date.split('-').reverse().join('/') : peli.first_air_date ? peli.first_air_date.split('-').reverse().join('/') : "-";

        let providersHTML = "";
        if (spainProviders.length > 0) {
            providersHTML = spainProviders.map(p => `
                <img src="https://image.tmdb.org/t/p/original${p.logo_path}" 
                     title="${p.provider_name}" 
                     alt="${p.provider_name}" 
                     class="provider-logo">
            `).join('');
        } else {
            providersHTML = "<p style='color: #888; font-size: 0.9rem; width: 100%;'>No disponible en streaming.</p>";
        }

        // Importante: Usar peli.title (para películas) o peli.name (para series)
        const tituloFinal = peli.title || peli.name;

        document.getElementById('movie-details').innerHTML = `
            <div class="movie-header">
                <img src="${IMG_URL + peli.poster_path}" class="detail-poster">
                <div class="text-info">
                    <h1 class="movie-title">${tituloFinal}</h1>
                    <p class="tagline">${peli.tagline || ''}</p>
                    <p class="overview">${peli.overview}</p>
                    <p><strong>Duración:</strong> ${peli.runtime ? peli.runtime + " min" : peli.number_of_episodes + " episodios (" + peli.seasons.length + " temp.)"}</p>
                    <p><strong>Fecha de estreno:</strong> ${fechaFormateada}</p>
                    <p><strong>Puntuación:</strong> ${peli.vote_average.toFixed(1)} / 10</p>
                    <p><strong>Género:</strong> ${peli.genres.map(g => g.name).join(', ')}</p>
                    
                    <div class="providers-section">
                        <p style="min-width: fit-content; border: solid 0px transparent"><strong>Dónde ver:</strong></p>
                        <div class="providers-container">
                            ${providersHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error al cargar detalles:", error);
    }
}

async function verificarEstadoUsuario() {
    if (!userId || !id) return; 
    const itemKey = `${type}_${id}`; // Creamos la llave actual

    try {
        const userRef = doc(db, 'Usuarios', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            
            // Verificar puntuación
            const puntuaciones = data.listaPuntuaciones || {};
            const notaActual = puntuaciones[itemKey]; // Buscamos con la llave combinada

            if (notaActual !== undefined) {
                yaPuntuada = true;
                actualizarInterfazPuntuado(notaActual);
            }

            // Verificar lista de deseos
            const listaDeseos = data.listaDeseos || [];
            if (listaDeseos.includes(itemKey)) { // Buscamos con la llave combinada
                isEnListaDeseos = true;
                const btnWatchlist = document.getElementById('add-watchlist-btn');
                if (btnWatchlist) {
                    btnWatchlist.innerText = "Eliminar de la lista de deseos";
                    btnWatchlist.classList.add('btn-remove');
                }
            }
        }
    } catch (error) {
        console.error("Error al verificar estado:", error);
    }
}

// Función auxiliar para no repetir código de interfaz
function actualizarInterfazPuntuado(nota) {
    const txtLabel = document.querySelector('.txt-pts');
    const inputRating = document.getElementById('user-rating');
    const btnRating = document.getElementById('save-rating-btn');
    const btnDelete = document.getElementById('delete-rating-btn');

    if (txtLabel) txtLabel.innerText = "Has puntuado:";
    if (inputRating) inputRating.placeholder = nota;
    if (btnRating) btnRating.innerText = "Actualizar";
    if (btnDelete) btnDelete.style.display = "block"; // Aquí se muestra el botón
}

document.getElementById('save-rating-btn').onclick = async () => {
    const puntuacionInput = document.getElementById('user-rating');
    const puntuacion = parseFloat(puntuacionInput.value);
    const btnWatchlist = document.getElementById('add-watchlist-btn');

    if (!userId) {
        MovieAlert.fire({ title: 'Error', text: 'Inicia sesión para puntuar', icon: 'error' });
        return;
    }

    if (isNaN(puntuacion) || puntuacion < 0 || puntuacion > 10) {
        MovieAlert.fire({ title: 'Puntuación no válida', text: 'Introduce un número entre 0 y 10', icon: 'warning' });
        return;
    }

    try {
        const userRef = doc(db, 'Usuarios', userId);
        const itemKey = `${type}_${id}`;
        await updateDoc(userRef, {
            [`listaPuntuaciones.${itemKey}`]: puntuacion,
            listaDeseos: arrayRemove(itemKey) // Importante quitarlo con la misma llave
        });

        await registrarActividad("valoracion", { nota: puntuacion });

        yaPuntuada = true;
        actualizarInterfazPuntuado(puntuacion);
        puntuacionInput.value = ""; 

        isEnListaDeseos = false;
        if (btnWatchlist) {
            btnWatchlist.innerText = "Añadir a mi lista de deseos";
            btnWatchlist.classList.remove('btn-remove');
        }

        MovieAlert.fire({
            title: '¡Puntuada!',
            text: `Nota guardada. Se ha eliminado de tu lista de deseos automáticamente.`,
            icon: 'success'
        });

    } catch (error) {
        console.error("Error al puntuar:", error);
        MovieAlert.fire({ title: 'Error', text: 'No se pudo procesar la valoración.', icon: 'error' });
    }
};

document.getElementById('delete-rating-btn').onclick = async () => {
    if (!userId || !id) return; // CORREGIDO

    const confirmacion = await MovieAlert.fire({
        title: '¿Eliminar puntuación?',
        text: "Esta acción borrará tu valoración.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const userRef = doc(db, 'Usuarios', userId);
        await updateDoc(userRef, {
             [`listaPuntuaciones.${id}`]: deleteField() // CORREGIDO
        });

        yaPuntuada = false;
        document.querySelector('.txt-pts').innerText = "Tu valoración:";
        document.getElementById('user-rating').placeholder = "0-10";
        document.getElementById('user-rating').value = "";
        document.getElementById('save-rating-btn').innerText = "Puntuar";
        document.getElementById('delete-rating-btn').style.display = "none";

        MovieAlert.fire({ title: 'Borrado', text: 'Tu puntuación ha sido eliminada.', icon: 'success' });

    } catch (error) {
        console.error("Error al eliminar puntuación:", error);
    }
};

document.getElementById('add-watchlist-btn').onclick = async () => {
    if (!userId || !id) { // CORREGIDO
        MovieAlert.fire({ title: 'Error', text: 'Inicia sesión primero', icon: 'error' });
        return;
    }

    if (yaPuntuada && !isEnListaDeseos) { 
        MovieAlert.fire({
            title: 'No se puede añadir',
            text: 'Ya has valorado este contenido.',
            icon: 'info'
        });
        return;
    }

    const userRef = doc(db, 'Usuarios', userId);
    const btn = document.getElementById('add-watchlist-btn');
    const itemKey = `${type}_${id}`; // Ejemplo: "tv_12345"

    try {
        if (isEnListaDeseos) {
            const confirmacion = await MovieAlert.fire({
                title: '¿Quitar de la lista?',
                text: "Dejará de aparecer en tu lista de deseos.",
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, quitar',
                cancelButtonText: 'Cancelar'
            });

            if (confirmacion.isConfirmed) {
                await updateDoc(userRef, { 
                    listaDeseos: arrayRemove(itemKey) 
                });
                isEnListaDeseos = false;
                btn.innerText = "Añadir a mi lista de deseos";
                btn.classList.remove('btn-remove');
                
                MovieAlert.fire({ title: 'Eliminada', icon: 'success', timer: 1500, showConfirmButton: false });
            }
        } else {
            await updateDoc(userRef, { 
                listaDeseos: arrayUnion(itemKey) 
            });
            await registrarActividad("deseo");
            isEnListaDeseos = true;
            btn.innerText = "Eliminar de la lista de deseos";
            btn.classList.add('btn-remove');

            MovieAlert.fire({ title: '¡Añadida!', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    } catch (error) {
        console.error("Error en Watchlist:", error);
    }
};

async function registrarActividad(tipo, detalles = {}) {
    if (!userId) return;
    
    try {
        // Necesitamos el username del usuario actual
        const userSnap = await getDoc(doc(db, 'Usuarios', userId));
        const username = userSnap.exists() ? userSnap.data().username : 'Cinéfilo';
        
        // Obtenemos los datos básicos de la película que ya están en pantalla
        const peliNombre = document.querySelector('.movie-title').innerText;
        const peliPoster = document.querySelector('.detail-poster').src;

        await addDoc(collection(db, "Actividades"), {
            userId: userId,
            username: username,
            tipo: tipo, // "valoracion" o "deseo"
            peliId: id,
            peliNombre: peliNombre,
            peliPoster: peliPoster,
            nota: detalles.nota || null,
            fecha: new Date()
        });
    } catch (e) {
        console.error("Error al registrar actividad:", e);
    }
}