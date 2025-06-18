#Maqueta del Sistema Solar

#FOTOS 
![image](https://github.com/user-attachments/assets/95e4ae89-397b-4134-bb92-7f35d4dbe3e0)  
![image](https://github.com/user-attachments/assets/a0123ec0-aa77-4b48-8839-45c6c517f449)
![image](https://github.com/user-attachments/assets/e5af608e-1f0c-4d3b-a890-87b70dc73e8f)



# IMPORTANTE:

INSTRUCCIONES
Para poder visualizar el sistema solar 

-En Visual Studio Code:

Inicializar un servidor local con:
python -m http.server 8000

Ir a:
http://localhost:8000/


# Sistema Solar Interactivo 3D con Three.js

Un simulador visual y dinámico de un sistema solar en 3D usando [Three.js](https://threejs.org/). Este proyecto permite explorar planetas con órbitas animadas, lanzar asteroides, interactuar con los planetas (ver y modificar propiedades), visualizar cometas, partículas de explosión y sonidos.

---

## Características principales

- Representación 3D de planetas con órbitas y movimiento orbital.
- Cometas con cola de partículas animadas.
- Asteroides que se pueden lanzar con la tecla "A" y colisionan con planetas.
- Sistema de partículas para explosiones visuales.
- Interacción con los planetas:
  - Click para mostrar información en un modal.
  - Shift + click para activar drag & drop y mover planetas.
- Control de simulación: pausar, acelerar, reiniciar.
- Sonidos para eventos: clics, colisiones, lanzamiento de asteroides.
- Adaptabilidad a cambios en propiedades del planeta desde la UI.
- Uso de `OrbitControls` para navegar por la escena.
- Sistema de colisiones básico para planetas y asteroides.

---

## Tecnologías usadas

- JavaScript
- [Three.js](https://threejs.org/) (WebGL para render 3D)
- HTML / CSS para la interfaz y modal
- Audio HTML5 para sonidos

---

## Instalación y ejecución

1. Clonar o descargar el repositorio

```bash
git clone https://github.com/tu-usuario/sistema-solar-threejs.git
cd sistema-solar-threejs
