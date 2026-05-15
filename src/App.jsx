import React, { useEffect } from 'react';
import { EditorLayout } from './starsengine/editor/layout/EditorLayout';
import { engineRunner } from './starsengine/core/logic/CoreRunner';

function App() {
  // Inicialización única del motor al arrancar la app
  useEffect(() => {
    // El motor arranca en modo "standby" esperando el PlayState
    engineRunner.start();

    // Limpieza al cerrar la aplicación para evitar fugas de memoria
    return () => engineRunner.stop();
  }, []);

  return (
    <div className="stars-engine-app">
      <EditorLayout />
    </div>
  );
}

export default App;