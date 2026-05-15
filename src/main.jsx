/**
 * STARS ENGINE V1.0 - Punto de Entrada (Main Entry Point)
 * * Este archivo es el responsable exclusivo de inicializar el runtime de React 19
 * y montar la raíz de la aplicación. Para mantener la modularidad, el Canvas 
 * y la lógica de simulación han sido segregados a sus propios componentes.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const rootElement = document.getElementById('root');

/**
 * Validación del elemento raíz.
 * Garantiza que el entorno de ejecución sea correcto antes de iniciar el motor.
 */
if (!rootElement) {
    throw new Error(
        '[Stars Engine Kernel]: Error fatal de inicialización. ' +
        'No se encontró el elemento raíz "root" en el DOM.'
    );
}

// Inicialización del root de React 19
const root = createRoot(rootElement);

root.render(
    <StrictMode>
        <App />
    </StrictMode>
);