// main.js
// Lógica principal de la simulación del sistema solar
// Autor: [Tu Nombre]
// Fecha: 2025-06-16

// =====================
// Configuración global
// =====================
import * as THREE from 'https://esm.sh/three@0.152.2';
import { OrbitControls } from 'https://esm.sh/three@0.152.2/examples/jsm/controls/OrbitControls.js';


let scene, camera, renderer, controls, animationId;
let planets = [], orbits = [], asteroids = [], comets = [], nebulas = [];
let isPaused = false, speedFactor = 1, selectedPlanet = null, draggingPlanet = null;

// Sistema de sonido
const audioListener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();
const sounds = {
    collision: new THREE.Audio(audioListener),
    click: new THREE.Audio(audioListener),
    asteroid: new THREE.Audio(audioListener),
    background: new THREE.Audio(audioListener)
};

// Carga de sonidos
function cargarSonidos() {
    audioLoader.load('sounds/collision.mp3', buffer => sounds.collision.setBuffer(buffer));
    audioLoader.load('sounds/click.mp3', buffer => sounds.click.setBuffer(buffer));
    audioLoader.load('sounds/asteroid.mp3', buffer => sounds.asteroid.setBuffer(buffer));
    audioLoader.load('sounds/background.mp3', buffer => {
        sounds.background.setBuffer(buffer);
        sounds.background.setLoop(true);
        sounds.background.setVolume(0.3);
        sounds.background.play();
    });
}

// Sistema de partículas para colisiones
const particleSystem = {
    particles: [],
    geometry: new THREE.BufferGeometry(),
    material: new THREE.PointsMaterial({
        color: 0xff9933,
        size: 2,
        blending: THREE.AdditiveBlending,
        transparent: true
    }),
    mesh: null
};

// Sistema de colisiones
const collisionSystem = {
    checkCollision: (obj1, obj2) => {
        const distance = obj1.malla.position.distanceTo(obj2.malla.position);
        return distance < (obj1.radio + obj2.radio);
    },
    createExplosion: (position) => {
        const particleCount = 100;
        const particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ),
                life: 2.0
            });
        }
        return particles;
    }
};

// =====================
// Clases principales
// =====================

/**
 * Clase Planeta
 * Representa un planeta del sistema solar
 */
class Planeta {
    constructor({nombre, radio, distancia, color, textura, velocidadOrbital, composicion, detalles}) {
        this.nombre = nombre;
        this.radio = radio;
        this.distancia = distancia;
        this.color = color;
        this.textura = textura;
        this.velocidadOrbital = velocidadOrbital;
        this.composicion = composicion;
        this.detalles = detalles;
        this.orbita = null;
        this.malla = null;
        this.angulo = Math.random() * Math.PI * 2;
        this.crearMalla();
    }
    crearMalla() {
        const geometry = new THREE.SphereGeometry(this.radio, 32, 32);
        let material;
        if (this.textura) {
            const loader = new THREE.TextureLoader();
            material = new THREE.MeshStandardMaterial({ map: loader.load(this.textura) });
        } else {
            material = new THREE.MeshStandardMaterial({ color: this.color });
        }
        this.malla = new THREE.Mesh(geometry, material);
        this.malla.castShadow = true;
        this.malla.receiveShadow = true;
        this.malla.userData = { planeta: this };
        scene.add(this.malla);
    }
    actualizar(dt) {
        if (!draggingPlanet || draggingPlanet !== this) {
            this.angulo += this.velocidadOrbital * dt * speedFactor;
            this.malla.position.x = Math.cos(this.angulo) * this.distancia;
            this.malla.position.z = Math.sin(this.angulo) * this.distancia;
        }
    }
}

/**
 * Clase Orbita
 * Dibuja la línea de la órbita de un planeta
 */
class Orbita {
    constructor(distancia) {
        const curve = new THREE.EllipseCurve(0, 0, distancia, distancia);
        const points = curve.getPoints(100);
        const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, 0, p.y)));
        const material = new THREE.LineBasicMaterial({ color: 0x888888 });
        this.linea = new THREE.LineLoop(geometry, material);
        scene.add(this.linea);
    }
}

/**
 * Clase Asteroide
 * Representa un asteroide que puede colisionar con planetas
 */
class Asteroide {
    constructor(position, velocity) {
        this.position = position;
        this.velocity = velocity;
        this.radio = Math.random() * 2 + 1;
        this.vida = 100;
        this.crearMalla();
    }

    crearMalla() {
        const geometry = new THREE.SphereGeometry(this.radio, 8, 8);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x8B8B8B,
            roughness: 0.8,
            metalness: 0.2
        });
        this.malla = new THREE.Mesh(geometry, material);
        this.malla.position.copy(this.position);
        scene.add(this.malla);
    }

    actualizar(dt) {
        this.position.add(this.velocity.multiplyScalar(dt));
        this.malla.position.copy(this.position);
        this.vida -= dt;
        return this.vida > 0;
    }

    destruir() {
        scene.remove(this.malla);
        sounds.asteroid.play();
    }
}

// Sistema de Drag & Drop
const dragControls = {
    enabled: false,
    plane: new THREE.Plane(),
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    intersection: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    
    onPointerMove: function(event) {
        if (!draggingPlanet) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, camera);
        this.raycaster.ray.intersectPlane(this.plane, this.intersection);
        
        draggingPlanet.malla.position.copy(this.intersection.sub(this.offset));
        // Actualizar órbita
        const distancia = Math.sqrt(
            draggingPlanet.malla.position.x ** 2 + 
            draggingPlanet.malla.position.z ** 2
        );
        draggingPlanet.distancia = distancia;
    },
    
    onPointerUp: function() {
        if (draggingPlanet) {
            draggingPlanet = null;
            document.removeEventListener('pointermove', this.onPointerMove.bind(this));
            document.removeEventListener('pointerup', this.onPointerUp.bind(this));
        }
    }
};


// =====================
// Inicialización
// =====================
function init() {
    // Verificar si Three.js está cargado
    if (typeof THREE === 'undefined') {
        console.error('Three.js no está cargado correctamente');
        return;
    }


    // Escena y cámara
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090a0f, 0.001);
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 200, 600);
    camera.add(audioListener);    // Renderizador
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x090a0f);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('solar-system-container').appendChild(renderer.domElement);
    // Controles de órbita
    crearControles();

    // Iluminación
    const luzSolar = new THREE.PointLight(0xfff2a1, 2, 1000, 1);
    luzSolar.position.set(0, 0, 0);
    luzSolar.castShadow = true;
    luzSolar.shadow.mapSize.width = 2048;
    luzSolar.shadow.mapSize.height = 2048;
    scene.add(luzSolar);
    
    const luzAmbiente = new THREE.AmbientLight(0x222233, 0.5);
    scene.add(luzAmbiente);

    // Cargar sonidos
    cargarSonidos();

    // Crear objetos
    crearSol();
    crearPlanetas();
    crearEstrellasFondo();
    crearEstrellas();
    crearCometas();

    // Controles de órbita
    crearControles();

    // Eventos
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    //renderer.domElement.addEventListener('dblclick', onDoubleClick);
    //renderer.domElement.addEventListener('wheel', onWheel);
    window.addEventListener('keydown', lanzarAsteroide);

    // UI
    document.getElementById('pause-btn').onclick = pausar;
    document.getElementById('play-btn').onclick = reanudar;
    document.getElementById('speed-btn').onclick = acelerar;
    document.getElementById('reset-btn').onclick = reiniciar;
    document.getElementById('free-cam-btn').onclick = activarCamaraLibre;
    document.getElementById('close-modal').onclick = cerrarModal;

    // Iniciar animación
    animate();
}

function cerrarModal() {
    document.getElementById('planet-modal').classList.add('hidden');
}

function crearControles() {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 100;
    controls.maxDistance = 800;
    controls.maxPolarAngle = Math.PI / 1.5;
}

// =====================
// Creación de objetos
// =====================

function crearSol() {
    // Geometría del Sol
    const geometriaSol = new THREE.SphereGeometry(32, 64, 64);
    const materialSol = new THREE.MeshBasicMaterial({
        color: 0xffe066,
        transparent: true,
        opacity: 0.9
    });
    const sol = new THREE.Mesh(geometriaSol, materialSol);
    
    // Resplandor del Sol
    const spriteMaterial = new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAHASURBVFiF7da/S5VRHMfx1+VSEghKEA0tDbU4uLnUX9DSYBBCS0MS4dTQFETU4B8gQRAFQVsQQRCBQ0ODINjS4BY0RBCRUEtkoBWC0NT9NJzLw+W5z/1xH8Un+G4P5/s+7/M55/s95/tAT12pH0InDUvoPFfAKC5iHSGlruZ1Aq9xBPsYzQIQwz62cKMTgFFsYwcjmCgKEMc6vqE/6xiHMiC6MV9mVo3jVjvzZRRowCyO4xgzuIxIOwAh3EUTPRjHLH7gR7sAIYziG/ajv1VWgAE8wJ7oFKwgD0AfnuNH9O0feICBPBBR9OIxdqMAM5jERSwXgQhhGFP4HA29iVVMYQS9RQB6cQ8b0ZDr2MA9XMoSp7QD0IuHUYR62Yie9ReJF0E/nmDnVNR6eYQBnD8L4Bbu42XkN4Sb7QJcw0vsnnr2HXN4gD/4iklcz9K4ZsD3WG5uiYoRU7iSU+M4nvSgqwoAq6qW1dVlFvPXF5O+H+IhbqMv6XsN77GOh5hPPE/VeGLmRwnjh7iN3CRTEOBRSt9W0ZKqJoC3KQDvsgK8SQGY9wJdQ6oC8DilPqYBfBJ9oZISS2yEC6oFJ3+lZwzfU/r+a/0FfxL5HW8ySr0AAAAASUVORK5CYII='),
        transparent: true,
        opacity: 0.8,
        color: 0xffe066
    });
    const resplandor = new THREE.Sprite(spriteMaterial);
    resplandor.scale.set(100, 100, 1);
    sol.add(resplandor);
    
    scene.add(sol);
    return sol;
}

function crearPlanetas() {
    // Datos de ejemplo, puedes expandir o mejorar
    const datosPlanetas = [
        { nombre: 'Mercurio', radio: 3, distancia: 50, color: 0xb1b1b1, velocidadOrbital: 0.02, composicion: 'Rocoso', detalles: 'El planeta más cercano al Sol.' },
        { nombre: 'Venus', radio: 6, distancia: 70, color: 0xeedc82, velocidadOrbital: 0.015, composicion: 'Rocoso', detalles: 'Segundo planeta del sistema solar.' },
        { nombre: 'Tierra', radio: 6.4, distancia: 100, color: 0x3a9efd, velocidadOrbital: 0.012, composicion: 'Rocoso', detalles: 'Nuestro planeta.' },
        { nombre: 'Marte', radio: 4, distancia: 140, color: 0xc1440e, velocidadOrbital: 0.01, composicion: 'Rocoso', detalles: 'El planeta rojo.' },
        { nombre: 'Júpiter', radio: 14, distancia: 200, color: 0xf4e2d8, velocidadOrbital: 0.008, composicion: 'Gaseoso', detalles: 'El planeta más grande.' },
        { nombre: 'Saturno', radio: 12, distancia: 260, color: 0xf7e7b4, velocidadOrbital: 0.006, composicion: 'Gaseoso', detalles: 'Famoso por sus anillos.' },
        { nombre: 'Urano', radio: 10, distancia: 320, color: 0x7fffd4, velocidadOrbital: 0.004, composicion: 'Gaseoso', detalles: 'Planeta inclinado.' },
        { nombre: 'Neptuno', radio: 10, distancia: 380, color: 0x4169e1, velocidadOrbital: 0.003, composicion: 'Gaseoso', detalles: 'El más lejano.' }
    ];
    datosPlanetas.forEach(datos => {
        const planeta = new Planeta(datos);
        planets.push(planeta);
        const orbita = new Orbita(datos.distancia);
        orbits.push(orbita);
    });
}



function crearEstrellasFondo() {
    // Crea partículas para simular estrellas
    const estrellas = new THREE.Group();
    for (let i = 0; i < 800; i++) {
        const geometry = new THREE.SphereGeometry(Math.random() * 0.5, 6, 6);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: Math.random(), transparent: true });
        const estrella = new THREE.Mesh(geometry, material);
        estrella.position.set(
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 800,
            (Math.random() - 0.5) * 2000
        );
        estrellas.add(estrella);
    }
    scene.add(estrellas);
}

function crearEstrellas() {
    const starsCount = 50000;
    const positions = new Float32Array(starsCount * 3);
    const colors = new Float32Array(starsCount * 3);

    const colorOptions = [
        new THREE.Color(0xffffff), // blanco
        new THREE.Color(0xbfdfff), // celeste
        new THREE.Color(0x99ccff), // azul claro
        new THREE.Color(0xe0ccff), // violeta
        new THREE.Color(0xfff4cc), // amarillo pálido
        new THREE.Color(0xd0e8ff), // azul hielo
    ];

    for (let i = 0; i < starsCount; i++) {
        const i3 = i * 3;
        positions[i3]     = (Math.random() - 0.5) * 8000;
        positions[i3 + 1] = (Math.random() - 0.5) * 8000;
        positions[i3 + 2] = (Math.random() - 0.5) * 8000;

        const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
        colors[i3]     = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const starField = new THREE.Points(geometry, material);
    scene.add(starField);
}


const cometas = [];

function crearCometas(cantidad = 3) {
    for (let i = 0; i < cantidad; i++) {
        const cometa = new THREE.Group();

        // Cabeza del cometa (una pequeña esfera blanca)
        const cabezaGeo = new THREE.SphereGeometry(2, 12, 12);
        const cabezaMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const cabeza = new THREE.Mesh(cabezaGeo, cabezaMat);
        cometa.add(cabeza);

        // Cola del cometa: partículas como puntos
        const colaGeo = new THREE.BufferGeometry();
        const colaLength = 25;
        const positions = [];

        for (let j = 0; j < colaLength; j++) {
            positions.push(-j * 4, 0, 0); // Cola hacia atrás
        }

        colaGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const colaMat = new THREE.PointsMaterial({
            color: 0x66ccff,
            size: 1.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
        });

        const cola = new THREE.Points(colaGeo, colaMat);
        cola.position.x = -2; // Desplazar cola un poco
        cometa.add(cola);

        // Posición inicial aleatoria
        cometa.position.set(
            (Math.random() - 0.5) * 1600,
            (Math.random() - 0.5) * 800 + 200,
            (Math.random() - 0.5) * 1600
        );

        scene.add(cometa);
        cometas.push({ cometa, cola });
    }
}


// ...funciones para crear asteroides, cometas, nebulosas...

// =====================
// Animación principal
// =====================

function animate() {
    if (!isPaused) {
        const dt = 0.016; // Aproximadamente 60 FPS
        
        // Actualizar controles de órbita
        if (controls) controls.update();
        
        // Actualizar planetas
        planets.forEach(p => p.actualizar(dt));
        
        // Actualizar asteroides
        asteroids = asteroids.filter(a => a.actualizar(dt));
        
        // Actualizar partículas de explosión
        particleSystem.particles = particleSystem.particles.filter(p => {
            p.position.add(p.velocity);
            p.life -= dt;
            return p.life > 0;
        });
        
        // Actualizar geometría de partículas
        if (particleSystem.particles.length > 0) {
            const positions = new Float32Array(
                particleSystem.particles.flatMap(p => [
                    p.position.x, p.position.y, p.position.z
                ])
            );
            particleSystem.geometry.setAttribute(
                'position',
                new THREE.BufferAttribute(positions, 3)
            );
            if (!particleSystem.mesh) {
                particleSystem.mesh = new THREE.Points(
                    particleSystem.geometry,
                    particleSystem.material
                );
                scene.add(particleSystem.mesh);
            }
        } else if (particleSystem.mesh) {
            scene.remove(particleSystem.mesh);
            particleSystem.mesh = null;
        }
        
        // Verificar colisiones
        manejarColisiones();
        
        renderer.render(scene, camera);
    }
    animationId = requestAnimationFrame(animate);
}

// =====================
// Eventos y UI
// =====================

function pausar() { isPaused = true; }
function reanudar() { isPaused = false; }
function acelerar() { speedFactor = speedFactor === 1 ? 5 : 1; }
function reiniciar() { window.location.reload(); }
function activarCamaraLibre() { /* ...a implementar... */ }

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerDown(event) {
    if (event.button !== 0) return; // Solo botón izquierdo

    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets.map(p => p.malla));

    if (intersects.length > 0) {
        const planeta = intersects[0].object.userData.planeta;
        
        if (event.shiftKey) {
            // Iniciar drag & drop
            draggingPlanet = planeta;
            dragControls.plane.setFromNormalAndCoplanarPoint(
                camera.getWorldDirection(dragControls.plane.normal),
                planeta.malla.position
            );
            dragControls.raycaster.ray.intersectPlane(
                dragControls.plane,
                dragControls.intersection
            );
            dragControls.offset.copy(dragControls.intersection).sub(
                planeta.malla.position
            );
            
            document.addEventListener('pointermove', dragControls.onPointerMove.bind(dragControls));
            document.addEventListener('pointerup', dragControls.onPointerUp.bind(dragControls));
            
            sounds.click.play();
        } else {
            // Mostrar información
            mostrarModalPlaneta(planeta);
            selectedPlanet = planeta;
            sounds.click.play();
        }
    }
}

// Función para lanzar asteroides
function lanzarAsteroide(event) {
    if (event.key === 'a' || event.key === 'A') {
        const posicionInicial = new THREE.Vector3(
            (Math.random() - 0.5) * 1000,
            (Math.random() - 0.5) * 1000,
            (Math.random() - 0.5) * 1000
        );
        
        const direccion = new THREE.Vector3()
            .subVectors(new THREE.Vector3(), posicionInicial)
            .normalize();
        
        const velocidad = direccion.multiplyScalar(2);
        const asteroide = new Asteroide(posicionInicial, velocidad);
        asteroids.push(asteroide);
        
        sounds.asteroid.play();
    }
}

// Función para manejar colisiones
function manejarColisiones() {
    // Colisiones entre planetas
    for (let i = 0; i < planets.length; i++) {
        for (let j = i + 1; j < planets.length; j++) {
            if (collisionSystem.checkCollision(planets[i], planets[j])) {
                const posicion = planets[i].malla.position
                    .clone()
                    .add(planets[j].malla.position)
                    .multiplyScalar(0.5);
                
                particleSystem.particles.push(...collisionSystem.createExplosion(posicion));
                sounds.collision.play();
            }
        }
    }
    
    // Colisiones con asteroides
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroide = asteroids[i];
        for (const planeta of planets) {
            if (collisionSystem.checkCollision(
                { malla: asteroide.malla, radio: asteroide.radio },
                planeta
            )) {
                particleSystem.particles.push(
                    ...collisionSystem.createExplosion(asteroide.malla.position)
                );
                asteroide.destruir();
                asteroids.splice(i, 1);
                sounds.collision.play();
                break;
            }
        }
    }
}

// =====================
// Funciones de UI
// =====================

function mostrarModalPlaneta(planeta) {
    document.getElementById('planet-modal').classList.remove('hidden');
    document.getElementById('planet-name').textContent = planeta.nombre;
    document.getElementById('planet-info').innerHTML = `
        <li><b>Tamaño:</b> ${planeta.radio} km</li>
        <li><b>Distancia al Sol:</b> ${planeta.distancia} millones de km</li>
        <li><b>Composición:</b> ${planeta.composicion}</li>
    `;
    document.getElementById('planet-details').textContent = planeta.detalles;

    // Configurar valores actuales en los controles
    document.getElementById('planet-size').value = planeta.radio;
    document.getElementById('planet-speed').value = planeta.velocidadOrbital;
    document.getElementById('planet-distance').value = planeta.distancia;

    // Evento para aplicar cambios
    document.getElementById('apply-config').onclick = () => {
        const nuevoRadio = parseFloat(document.getElementById('planet-size').value);
        const nuevaVelocidad = parseFloat(document.getElementById('planet-speed').value);
        const nuevaDistancia = parseFloat(document.getElementById('planet-distance').value);

        // Actualizar propiedades del planeta
        planeta.radio = nuevoRadio;
        planeta.velocidadOrbital = nuevaVelocidad;
        planeta.distancia = nuevaDistancia;

        // Actualizar geometría
        const nuevaGeometria = new THREE.SphereGeometry(nuevoRadio, 32, 32);
        planeta.malla.geometry.dispose();
        planeta.malla.geometry = nuevaGeometria;

        // Actualizar órbita
        const indice = planets.indexOf(planeta);
        if (indice !== -1 && orbits[indice]) {
            scene.remove(orbits[indice].linea);
            orbits[indice] = new Orbita(nuevaDistancia);
        }

        // Reproducir sonido de confirmación
        sounds.click.play();

        // Actualizar información mostrada
        mostrarModalPlaneta(planeta);
    };
}

// =====================
// Inicializar
// =====================

window.onload = init;
