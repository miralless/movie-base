import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
                
                // Si ya implementaste lo de los avatares:
                if (userData.fotoPerfil && document.getElementById('img')) {
                    document.getElementById('img').innerHTML = `<img src="assets/avatares/${userData.fotoPerfil}" style="width:100px; border-radius:50%;">`;
                }

            } else {
                console.log("No se encontraron datos del usuario en Firestore");
            }
        } catch (error) {
            console.error("Error al obtener datos:", error);
        }

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
