const API_KEY = '42cd365743b38b7fec6c2366d90c6c0a';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

async function obtenerContenidoRandom() {
    // Generamos páginas aleatorias diferentes para películas y series
    const moviePage = Math.floor(Math.random() * 200) + 1;
    const tvPage = Math.floor(Math.random() * 200) + 1;

    try {
        // 1. Lanzamos ambas peticiones al mismo tiempo
        const [resMovies, resTV] = await Promise.all([
            fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=es-ES&page=${moviePage}`),
            fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=es-ES&page=${tvPage}`)
        ]);

        const dataMovies = await resMovies.json();
        const dataTV = await resTV.json();

        // 2. Asignamos manualmente el media_type porque 'discover' no lo incluye
        const movies = dataMovies.results.map(item => ({ ...item, media_type: 'movie' }));
        const series = dataTV.results.map(item => ({ ...item, media_type: 'tv' }));

        // 3. Mezclamos ambas listas
        let listaMezclada = [...movies, ...series];

        // 4. Algoritmo para desordenar la lista (Shuffle)
        listaMezclada.sort(() => Math.random() - 0.5);

        // 5. Renderizamos los primeros 18 resultados ya mezclados
        renderizarPeliculas(listaMezclada.slice(0, 18), 'random-movies'); 
        
    } catch (error) {
        console.error("Error obteniendo contenido aleatorio:", error);
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
        // En búsqueda multi, a veces hay personas (person). Las saltamos porque no tienen poster.
        if (!item.poster_path || item.media_type === 'person') return;

        const card = document.createElement('div');
        card.classList.add('movie-card');
        card.style.cursor = "pointer";
        
        // --- CORRECCIÓN AQUÍ ---
        card.onclick = () => {
            // Detectamos el tipo de contenido. Si no viene media_type (como en las random), asumimos 'movie'
            const tipo = item.media_type || 'movie';
            
            // Redirigimos pasando el ID y el TIPO para que info-pelicula sepa qué buscar
            window.location.href = `info-pelicula.html?id=${item.id}&type=${tipo}`;
        };

        card.innerHTML = `
            <img src="${IMG_URL + item.poster_path}" alt="${item.title || item.name}">
            <div class="movie-info">
                <h4>${item.title || item.name}</h4>
                <span class="rating">⭐ ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</span>
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
document.addEventListener('DOMContentLoaded', obtenerContenidoRandom);