const API_KEY = '42cd365743b38b7fec6c2366d90c6c0a';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

async function obtenerPeliculasRandom() {
    const randomPage = Math.floor(Math.random() * 500) + 1;
    try {
        const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=es-ES&page=${randomPage}`);
        const data = await res.json();
        // Usamos el ID correcto: 'random-movies'
        renderizarPeliculas(data.results.slice(0, 18), 'random-movies'); 
    } catch (error) {
        console.error("Error en Discovery:", error);
    }
}

let currentPage = 1;
let currentQuery = "";

async function buscarPeliculas(query, page = 1) {
    if (!query.trim()) window.location.href = 'peliculas.html';

    // Guardamos la búsqueda y la página actual
    currentQuery = query;
    currentPage = page;

    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&language=es-ES&query=${query}&page=${page}`);
        const data = await res.json();
        
        document.getElementById('discovery-section').style.display = 'none';
        
        // Actualizar título
        const tituloResultados = document.getElementById('search-title');
        if (tituloResultados) {
            tituloResultados.innerText = `Resultados de "${query}"`;
        }
        
        const sectionResultados = document.getElementById('search-results-section');
        sectionResultados.style.display = 'block';

        // Si es la página 1, limpiamos el contenedor. Si es > 1, añadimos al final.
        renderizarPeliculas(data.results, 'search-results', page > 1);

        // Lógica del botón "Ver más"
        const btnCargarMas = document.getElementById('load-more-btn');
        if (data.page < data.total_pages) {
            btnCargarMas.style.display = 'inline-block';
        } else {
            btnCargarMas.style.display = 'none';
        }

    } catch (error) {
        console.error("Error en búsqueda:", error);
    }
}

// Modificamos ligeramente la función de renderizar
function renderizarPeliculas(lista, contenedorId, append = false) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    
    if (!append) contenedor.innerHTML = "";

    lista.forEach(item => {
        if (!item.poster_path) return;

        const card = document.createElement('div');
        card.classList.add('movie-card');
        
        // --- CAMBIO AQUÍ: Añadimos el evento de clic ---
        card.style.cursor = "pointer";
        card.onclick = () => {
            // Redirigimos a la página de info pasando el ID
            window.location.href = `info-pelicula.html?id=${item.id}`;
        };

        card.innerHTML = `
            <img src="${IMG_URL + item.poster_path}" alt="${item.title || item.name}">
            <div class="movie-info">
                <h4>${item.title || item.name}</h4>
                <span class="rating">⭐ ${item.vote_average.toFixed(1)}</span>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

// EVENTO PARA EL BOTÓN CARGAR MÁS
document.getElementById('load-more-btn').addEventListener('click', () => {
    currentPage++; // Subimos de página
    buscarPeliculas(currentQuery, currentPage); // Buscamos la siguiente página
});

// Ajuste en tus eventos actuales para resetear la página al buscar algo nuevo
document.getElementById('search-btn').addEventListener('click', () => {
    const query = document.getElementById('search-input').value;
    buscarPeliculas(query, 1); // Forzamos página 1
});

document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        buscarPeliculas(e.target.value, 1); // Forzamos página 1
    }
});

// Al cargar la página, solo pedimos las random
document.addEventListener('DOMContentLoaded', obtenerPeliculasRandom);