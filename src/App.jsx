import React from 'react';
import { CanvasStudio } from './components/artist/CanvasStudio';
import { WorkspaceSwitcher } from './components/ui/WorkspaceSwitcher';
import { PlayHUD } from './components/ui/PlayHUD';
import './App.css';

function App() {
  return (
    <WorkspaceSwitcher>
      <CanvasStudio />
      <PlayHUD />
    </WorkspaceSwitcher>
  );
}

export default App;
