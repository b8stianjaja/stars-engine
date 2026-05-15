// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Corregido: App está en la misma carpeta que main.jsx
import './index.css';

// Importación del gestor de red para la sincronización en tiempo real entre los 2 PCs
import { network } from './starsengine/core/network/NetworkManager';

/**
 * CONEXIÓN LAN: 
 * Asegúrate de que esta IP sea la de tu PC Principal (donde corre sync-server.cjs).
 * Si estás en el PC del Artista, esta IP debe apuntar al PC del Programador.
 */
network.connect('192.168.0.18');

// Renderizado del motor con StrictMode para depuración de efectos secundarios
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);