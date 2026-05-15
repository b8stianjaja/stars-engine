/**
 * STARS ENGINE V1.0 - Punto de Entrada (Main Entry Point)
 * Este archivo inicializa el runtime de React 19 y monta la raíz de la aplicación.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error(
        '[Stars Engine Kernel]: Error fatal de inicialización. ' +
        'No se encontró el elemento raíz "root" en el DOM.'
    );
}

const root = createRoot(rootElement);

root.render(
    <StrictMode>
        <App />
    </StrictMode>
);