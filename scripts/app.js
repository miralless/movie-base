import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    collection, 
    getCountFromServer 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const MovieAlert = Swal.mixin({
    background: '#2a2a2a', // Tu color de fondo de auth-container
    color: '#ffffff',      // Texto blanco
    confirmButtonColor: '#D4AF37', // Tu dorado
    width: 'fit-content',
    buttonsStyling: true,
    customClass: {
        popup: 'my-swal-popup',
        title: 'my-swal-title'
    }
});

const firebaseConfig = {
    apiKey: "AIzaSyD6qzEKBpPysfxpTHAfua-BToUBYglee1E",
    authDomain: "moviebase-43cc7.firebaseapp.com",
    projectId: "moviebase-43cc7",
    storageBucket: "moviebase-43cc7.firebasestorage.app",
    messagingSenderId: "568203402282",
    appId: "1:568203402282:web:6387c01d9095bdb806f753",
    measurementId: "G-QYG2PCM5SR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- REFERENCIAS AL DOM ---
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnRegistro = document.getElementById('btn-registro');
const btnLogout = document.getElementById('btn-logout');
const extraFields = document.getElementById('extra-fields');
const btnCancelar = document.getElementById('btn-cancelar');
const buttonsContainer = document.querySelector('.buttons');

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        // Si el foco está en el textarea de la bio, dejamos que haga salto de línea normal
        if (document.activeElement.id === 'bio') return;

        e.preventDefault();
        
        // Verificamos si estamos en modo registro mirando si los campos extra son visibles
        const esModoRegistro = (extraFields.style.display === 'block');

        if (esModoRegistro) {
            btnRegistro.click();
        } else {
            btnLogin.click();
        }
    }
});

// --- LÓGICA DE AUTH ---

// UN SOLO EVENTO para Registro (con lógica de mostrar campos)
btnRegistro.addEventListener('click', async () => {
    // Si los campos extra están ocultos, los mostramos
    if (extraFields.style.display === 'none' || extraFields.style.display === '') {
        extraFields.style.display = 'block';
        btnLogin.style.display = 'none'; 
        
        // APILAR BOTONES
        buttonsContainer.classList.add('flex-column'); // Añadimos la clase de columna
        
        btnRegistro.style.width = "100%"; // Ajustado al ancho de tus inputs
        btnRegistro.style.marginTop = "20px"; // Espaciado vertical
        
        btnCancelar.style.display = "block";
        btnCancelar.style.width = "100%"; 
        
        emailInput.placeholder = "Correo electrónico";
        return; 
    }

    // Si ya son visibles, procedemos al registro real
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    const username = document.getElementById('username').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const bio = document.getElementById('bio').value.trim();

    if (!email || !pass || !username || !nombre || !apellido) {
        MovieAlert.fire({
            title: '¡Ups!',
            text: 'Por favor, rellena todos los campos.',
            icon: 'warning'
        });
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        MovieAlert.fire({
            title: '¡Ups!',
            text: 'Por favor, introduce un correo electrónico válido.',
            icon: 'warning',
            confirmButtonColor: '#D4AF37' // Tu color dorado
        });
        return;
    }

    // Validar longitud de contraseña (Firebase exige mínimo 6)
    if (pass.length < 6) {
        MovieAlert.fire({
            title: '¡Ups!',
            text: 'La contraseña debe tener al menos 6 caracteres.',
            icon: 'warning',
            confirmButtonColor: '#D4AF37' // Tu color dorado
        });
        return;
    }

    // Validar formato de username (solo letras, números y guiones bajos)
    const userRegex = /^[a-zA-Z0-9_]+$/;
    if (!userRegex.test(username)) {
        MovieAlert.fire({
            title: '¡Ups!',
            text: 'El nombre de usuario solo puede contener letras, números y guiones bajos (_).',
            icon: 'warning',
            confirmButtonColor: '#D4AF37' // Tu color dorado
        });
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        const seguidores = 0;
        const seguidos = 0;

        await setDoc(doc(db, "Usuarios", user.uid), {
            nombre,
            apellido,
            username,
            bio,
            email,
            fechaRegistro: new Date(),
            seguidores,
            seguidos
        });

        window.location.href = 'index.html';
    } catch (error) {
        // Manejo de errores específicos de Firebase
        if (error.code === 'auth/email-already-in-use') {
            MovieAlert.fire({
                title: '¡Ups!',
                text: 'Este correo ya está registrado.',
                icon: 'warning',
                confirmButtonColor: '#D4AF37' // Tu color dorado
            });
        } else {
            MovieAlert.fire({
                title: '¡Ups!',
                text: 'Error al registrar: ' + error.message,
                icon: 'error',
                confirmButtonColor: '#D4AF37' // Tu color dorado
            });
        }
    }
});

btnCancelar.addEventListener('click', () => {
    // Ocultamos los campos extra y el botón cancelar
    extraFields.style.display = 'none';
    btnCancelar.style.display = 'none';
    btnLogin.style.display = 'inline-block';

    buttonsContainer.classList.remove('flex-column');
    
    // Devolvemos el botón de registro a su estado original
    btnRegistro.innerText = "Registrarse";
    btnRegistro.style.display = "inline-block"; // Vuelve a su estado normal
    btnRegistro.style.width = "48%"; 
    btnRegistro.style.margin = "10px 0px 5px 0px";
    
    // Limpiamos los campos por seguridad
    emailInput.value = "";
    passInput.value = "";
    document.getElementById('username').value = "";
    document.getElementById('nombre').value = "";
    document.getElementById('apellido').value = "";
    document.getElementById('bio').value = "";
});

// Inicio de sesión
btnLogin.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();

    // 1. Validación de campos vacíos
    if (!email || !pass) {
        MovieAlert.fire({
            title: '¡Ups!',
            text: 'Por favor, introduce tu correo y contraseña.',
            icon: 'warning',
            confirmButtonColor: '#D4AF37' // Tu color dorado
        });
        return;
    }

    // 2. Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        MovieAlert.fire({
            title: '¡Ups!',
            text: 'Por favor, introduce un correo electrónico válido.',
            icon: 'warning',
            confirmButtonColor: '#D4AF37' // Tu color dorado
        });
        return;
    }

    // 3. Intento de inicio de sesión en Firebase
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            console.log("Sesión iniciada correctamente");
            window.location.href = 'home.html';
        })
        .catch((error) => {
            // Manejo de errores específicos de login
            console.error("Error de Firebase:", error.code);
            
            if (error.code === 'auth/invalid-credential') {
                MovieAlert.fire({
                    title: 'Error de acceso',
                    text: 'El correo o la contraseña no son válidos.',
                    icon: 'error',
                    confirmButtonColor: '#D4AF37'
                });
            } else if (error.code === 'auth/user-not-found') {
                MovieAlert.fire({
                    title: 'Error de acceso',
                    text: 'El usuario no existe.',
                    icon: 'error',
                    confirmButtonColor: '#D4AF37'
                });
            } else if (error.code === 'auth/wrong-password') {
                MovieAlert.fire({
                    title: 'Error de acceso',
                    text: 'La contraseña es incorrecta.',
                    icon: 'error',
                    confirmButtonColor: '#D4AF37'
                });
            } else if (error.code === 'auth/too-many-requests') {
                MovieAlert.fire({
                    title: 'Error de acceso',
                    text: 'Demasiados intentos fallidos. Inténtalo más tarde.',
                    icon: 'error',
                    confirmButtonColor: '#D4AF37'
                });
            } else {
                MovieAlert.fire({
                    title: 'Error de acceso',
                    text: 'Error al entrar: ' + error.message,
                    icon: 'error',
                    confirmButtonColor: '#D4AF37'
                });
            }
        });
});

// Cerrar sesión
btnLogout.addEventListener('click', () => {
    signOut(auth);
});

// --- EL OBSERVADOR (Detecta cambios de estado) ---
onAuthStateChanged(auth, (user) => {
    const authContainer = document.getElementById('auth-container');
    const appContent = document.getElementById('app-content');
    const userNameDisplay = document.getElementById('user-name');

    if (!user) {
        authContainer.style.display = 'block';
        appContent.style.display = 'none';
        // Limpiamos los campos y volvemos al estado inicial si se cierra sesión
        extraFields.style.display = 'none';
        btnLogin.style.display = 'inline-block';
        btnRegistro.innerText = "Registrarse";
        btnRegistro.style.width = "48%";
        btnCancelar.style.display = 'none';
    }
});