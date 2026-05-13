import React, { useRef, useEffect, useState, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../core/store';
import { Stage } from '../viewport/Stage';

const ArtLayerCanvas = memo(({ layer }) => {
  const canvasRef = useRef(null);
  const onionRef = useRef(null);
  const { activeLayerId, studioTools, workspaceMode, director, updateArtLayerFrame, timeline } = useStore(useShallow(state => ({
    activeLayerId: state.activeLayerId,
    studioTools: state.studioTools,
    workspaceMode: state.workspaceMode,
    director: state.director,
    updateArtLayerFrame: state.updateArtLayerFrame,
    timeline: state.timeline
  })));

  const [ctx, setCtx] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);

  const isEditable = workspaceMode === 'artist' && director.isCameraLocked && activeLayerId === layer.id && studioTools.active !== 'pan';

  const safeFrames = layer.frames || { 0: layer.dataUrl };
  const currentFrameData = safeFrames[timeline.currentFrame] || null;
  const prevFrameData = timeline.onionSkin && timeline.currentFrame > 0 ? safeFrames[timeline.currentFrame - 1] : null;
  const nextFrameData = timeline.onionSkin && timeline.currentFrame < timeline.totalFrames - 1 ? safeFrames[timeline.currentFrame + 1] : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1920;
      canvas.height = 1080;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.lineCap = 'round';
      context.lineJoin = 'round';
      setCtx(context);

      if (currentFrameData) {
        const img = new Image();
        img.onload = () => {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = currentFrameData;
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [layer.id, currentFrameData]);

  useEffect(() => {
    const canvas = onionRef.current;
    if (canvas) {
      canvas.width = 1920;
      canvas.height = 1080;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);

      const drawGhost = (src, colorHex) => {
        if (!src) return;
        const img = new Image();
        img.onload = () => {
          const off = document.createElement('canvas');
          off.width = canvas.width;
          off.height = canvas.height;
          const octx = off.getContext('2d');

          octx.drawImage(img, 0, 0, off.width, off.height);
          octx.globalCompositeOperation = 'source-in';
          octx.fillStyle = colorHex;
          octx.fillRect(0, 0, off.width, off.height);

          context.globalCompositeOperation = 'source-over';
          context.globalAlpha = 0.4;
          context.drawImage(off, 0, 0);
        };
        img.src = src;
      };

      if (prevFrameData) drawGhost(prevFrameData, '#ef4444');
      if (nextFrameData) drawGhost(nextFrameData, '#10b981');
    }
  }, [prevFrameData, nextFrameData]);

  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (!isEditable || !ctx) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.stopPropagation();
    if (e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);

    useStore.getState().pushUndoState();

    const pos = getCanvasPos(e);
    setLastPos(pos);
    setIsDrawing(true);

    if (studioTools.active === 'pipette') {
      const pixel = ctx.getImageData(pos.x, pos.y, 1, 1).data;
      if (pixel[3] > 0) {
        const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => x.toString(16).padStart(2, '0')).join('');
        useStore.getState().setStudioTool({ color: hex, active: 'pencil' });
      }
      setIsDrawing(false);
      return;
    }

    if (studioTools.active === 'bucket') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = studioTools.opacity;
      ctx.fillStyle = studioTools.color;
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setIsDrawing(false);
      if (canvasRef.current) updateArtLayerFrame(layer.id, timeline.currentFrame, canvasRef.current.toDataURL('image/png'));
      return;
    }

    const pressure = e.pointerType === 'pen' ? e.pressure : 1;
    const dynamicSize = studioTools.size * (0.2 + (pressure * 0.8));

    const drawDot = (p) => {
      ctx.beginPath();
      ctx.fillStyle = studioTools.color;
      ctx.globalAlpha = studioTools.opacity;
      ctx.globalCompositeOperation = studioTools.active === 'eraser' ? 'destination-out' : 'source-over';
      ctx.arc(p.x, p.y, dynamicSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    };

    drawDot(pos);
    if (studioTools.symmetryX) drawDot({ x: 1920 - pos.x, y: pos.y });
  };

  const draw = (e) => {
    if (!isDrawing || !isEditable || !ctx || !lastPos) return;
    e.stopPropagation();
    e.preventDefault();

    const pos = getCanvasPos(e);
    const pressure = e.pointerType === 'pen' ? e.pressure : 1;
    const dynamicSize = studioTools.size * (0.2 + (pressure * 0.8));

    const drawStroke = (p, pLast) => {
      ctx.beginPath();
      ctx.moveTo(pLast.x, pLast.y);
      ctx.lineTo(p.x, p.y);
      ctx.globalAlpha = studioTools.opacity;
      ctx.globalCompositeOperation = studioTools.active === 'eraser' ? 'destination-out' : 'source-over';

      if (studioTools.active !== 'eraser') ctx.strokeStyle = studioTools.color;

      ctx.lineWidth = dynamicSize;
      ctx.stroke();
    };

    drawStroke(pos, lastPos);
    if (studioTools.symmetryX) drawStroke({ x: 1920 - pos.x, y: pos.y }, { x: 1920 - lastPos.x, y: lastPos.y });

    setLastPos(pos);
  };

  const stopDrawing = (e) => {
    if (!isDrawing || !isEditable) return;
    e.stopPropagation();
    setIsDrawing(false);
    setLastPos(null);
    if (canvasRef.current) updateArtLayerFrame(layer.id, timeline.currentFrame, canvasRef.current.toDataURL('image/png'));
  };

  useEffect(() => {
    if (!isEditable || !ctx || !canvasRef.current) return;
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          useStore.getState().pushUndoState();
          const blob = items[i].getAsFile();
          const img = new Image();
          img.onload = () => {
            const cx = (1920 - img.width) / 2;
            const cy = (1080 - img.height) / 2;
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.drawImage(img, cx, cy);
            updateArtLayerFrame(layer.id, timeline.currentFrame, canvasRef.current.toDataURL('image/png'));
          };
          img.src = URL.createObjectURL(blob);
          e.preventDefault();
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isEditable, ctx, layer.id, timeline.currentFrame, updateArtLayerFrame]);

  return (
    <>
      {timeline.onionSkin && prevFrameData && (
        <canvas ref={onionRef} className="board-layer" style={{ zIndex: layer.zIndex - 0.5, display: layer.visible ? 'block' : 'none', pointerEvents: 'none', opacity: 0.5 }} />
      )}
      <canvas
        ref={canvasRef}
        className="board-layer"
        style={{ zIndex: layer.zIndex, opacity: layer.opacity, mixBlendMode: layer.blendMode || 'normal', display: layer.visible ? 'block' : 'none', pointerEvents: isEditable ? 'auto' : 'none', cursor: studioTools.active === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        onPointerCancel={stopDrawing}
      />
    </>
  );
});

const EntitySpriteCanvas = memo(({ entity }) => {
  const canvasRef = useRef(null);
  const { updateEntityData, studioTools, director, workspaceMode } = useStore(useShallow(state => ({
    updateEntityData: state.updateEntityData,
    studioTools: state.studioTools,
    director: state.director,
    workspaceMode: state.workspaceMode
  })));

  const [ctx, setCtx] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);

  const isEditable = workspaceMode === 'artist' && director.isCameraLocked && studioTools.active !== 'pan';
  const size = 512;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.lineCap = 'round';
      context.lineJoin = 'round';
      setCtx(context);

      if (entity.texture) {
        const img = new Image();
        img.onload = () => {
          context.clearRect(0, 0, size, size);
          context.drawImage(img, 0, 0, size, size);
        };
        img.src = entity.texture;
      } else {
        context.clearRect(0, 0, size, size);
      }
    }
  }, [entity.id, entity.texture]);

  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = size / rect.width;
    const scaleY = size / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e) => {
    if (!isEditable || !ctx) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.stopPropagation();
    if (e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);

    const pos = getCanvasPos(e);

    if (studioTools.active === 'bucket') {
      ctx.fillStyle = studioTools.color;
      ctx.fillRect(0, 0, size, size);
      if (canvasRef.current) updateEntityData(entity.id, { texture: canvasRef.current.toDataURL('image/png') });
      return;
    }

    setIsDrawing(true);
    setLastPos(pos);

    const pressure = e.pointerType === 'pen' ? e.pressure : 1;
    const dynamicSize = studioTools.size * (0.2 + (pressure * 0.8));
    drawPoint(pos.x, pos.y, dynamicSize);
  };

  const drawPoint = (x, y, dynSize) => {
    ctx.globalCompositeOperation = studioTools.active === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = studioTools.color;
    ctx.fillStyle = studioTools.color;
    ctx.lineWidth = dynSize;
    ctx.globalAlpha = studioTools.opacity;

    ctx.beginPath();
    ctx.arc(x, y, dynSize / 2, 0, Math.PI * 2);
    ctx.fill();

    if (studioTools.symmetryX) {
      const symX = size - x;
      ctx.beginPath();
      ctx.arc(symX, y, dynSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = (e) => {
    if (!isDrawing || !isEditable || !ctx || !lastPos) return;
    e.stopPropagation();
    e.preventDefault();
    const pos = getCanvasPos(e);

    const pressure = e.pointerType === 'pen' ? e.pressure : 1;
    const dynSize = studioTools.size * (0.2 + (pressure * 0.8));

    ctx.globalCompositeOperation = studioTools.active === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = studioTools.color;
    ctx.lineWidth = dynSize;
    ctx.globalAlpha = studioTools.opacity;

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    if (studioTools.symmetryX) {
      const symStartX = size - lastPos.x;
      const symEndX = size - pos.x;
      ctx.beginPath();
      ctx.moveTo(symStartX, lastPos.y);
      ctx.lineTo(symEndX, pos.y);
      ctx.stroke();
    }
    setLastPos(pos);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setLastPos(null);
      if (canvasRef.current) updateEntityData(entity.id, { texture: canvasRef.current.toDataURL('image/png') });
    }
  };

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px', opacity: 0.5, borderRadius: '4px' }} />
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1, cursor: 'crosshair', borderRadius: '4px', touchAction: 'none' }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerOut={stopDrawing}
        onPointerCancel={stopDrawing}
      />
      {studioTools.symmetryX && <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed rgba(56, 189, 248, 0.5)', zIndex: 2, pointerEvents: 'none' }} />}
      <div style={{ position: 'absolute', top: '-25px', left: 0, right: 0, textAlign: 'center', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
        SPRITE EDITOR: {entity.name}
      </div>
    </div>
  );
});

export function CanvasStudio() {
  const { studioView, setStudioView, artLayers, studioTools, isPlaying, workspaceMode, director, timeline, setTimeline, undoArtLayer, setStudioTool } = useStore(useShallow(state => ({
    studioView: state.studioView,
    setStudioView: state.setStudioView,
    artLayers: state.artLayers,
    studioTools: state.studioTools,
    isPlaying: state.isPlaying,
    workspaceMode: state.workspaceMode,
    director: state.director,
    timeline: state.timeline,
    setTimeline: state.setTimeline,
    undoArtLayer: state.undoArtLayer,
    setStudioTool: state.setStudioTool
  })));
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const entities = useStore(state => state.entities);
  const selectedEntityId = useStore(state => state.selectedEntityId);
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  const viewportRef = useRef(null);
  const playIntervalRef = useRef(null);

  // FIX ZOOM 1: Centrado asumiendo Transform-Origin 0,0
  useEffect(() => {
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const zoomX = (rect.width - 64) / 1920;
      const zoomY = (rect.height - 64) / 1080;
      const initialZoom = Math.max(0.1, Math.min(zoomX, zoomY));

      const centeredX = (rect.width - (1920 * initialZoom)) / 2;
      const centeredY = (rect.height - (1080 * initialZoom)) / 2;

      setStudioView({ zoom: initialZoom, x: centeredX, y: centeredY });
    }
  }, [setStudioView]);

  useEffect(() => {
    if (timeline.isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setTimeline({ currentFrame: (useStore.getState().timeline.currentFrame + 1) % timeline.totalFrames });
      }, 1000 / timeline.fps);
    } else {
      clearInterval(playIntervalRef.current);
    }
    return () => clearInterval(playIntervalRef.current);
  }, [timeline.isPlaying, timeline.fps, timeline.totalFrames, setTimeline]);

  // FIX ZOOM 2: Bloqueo Extremo de Gestos Nativos de OS (Mac/Safari/Touch)
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const preventDefault = (e) => e.preventDefault();

    // Bloquear eventos de gesto nativos (trackpads Mac/Safari)
    viewport.addEventListener('gesturestart', preventDefault);
    viewport.addEventListener('gesturechange', preventDefault);
    viewport.addEventListener('gestureend', preventDefault);

    const preventNativeZoom = (e) => {
      if (e.ctrlKey || e.metaKey || spacePressed || useStore.getState().studioTools.active === 'pan') {
        e.preventDefault();
      }
    };

    viewport.addEventListener('wheel', preventNativeZoom, { passive: false });

    return () => {
      viewport.removeEventListener('gesturestart', preventDefault);
      viewport.removeEventListener('gesturechange', preventDefault);
      viewport.removeEventListener('gestureend', preventDefault);
      viewport.removeEventListener('wheel', preventNativeZoom);
    };
  }, [spacePressed]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') setSpacePressed(true);

      if (e.ctrlKey || e.metaKey) {
        if (e.code === 'KeyZ') { e.preventDefault(); undoArtLayer(); }
        if (e.code === 'KeyY') { e.preventDefault(); useStore.getState().redoArtLayer(); }
      } else {
        if (e.code === 'KeyB') setStudioTool({ active: 'pencil' });
        if (e.code === 'KeyE') setStudioTool({ active: 'eraser' });
        if (e.code === 'BracketLeft') setStudioTool({ size: Math.max(1, useStore.getState().studioTools.size - 2) });
        if (e.code === 'BracketRight') setStudioTool({ size: Math.min(100, useStore.getState().studioTools.size + 2) });
      }
    };
    const handleKeyUp = (e) => { if (e.code === 'Space') setSpacePressed(false); };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [undoArtLayer, setStudioTool]);

  // FIX ZOOM 3: Matemática ajustada para transform-origin: '0 0'
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey || studioTools.active === 'pan' || spacePressed) {
      const zoomSensitivity = 0.003;
      const zoomFactor = Math.exp(-e.deltaY * zoomSensitivity);
      const newZoom = Math.max(0.1, Math.min(10, studioView.zoom * zoomFactor));

      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();

      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      // Distancia matemática pura del ratón hacia la esquina superior izquierda del lienzo
      const dx = cursorX - studioView.x;
      const dy = cursorY - studioView.y;

      const newX = cursorX - dx * (newZoom / studioView.zoom);
      const newY = cursorY - dy * (newZoom / studioView.zoom);

      setStudioView({ zoom: newZoom, x: newX, y: newY });
    }
  };

  const isPanToolActive = studioTools.active === 'pan' || spacePressed;

  const handlePointerDown = (e) => {
    if (e.button === 1 || isPanToolActive) {
      setIsPanning(true);
      startPanRef.current = { x: e.clientX - studioView.x, y: e.clientY - studioView.y };
    }
  };

  const handlePointerMove = (e) => {
    if (isPanning) {
      setStudioView({ x: e.clientX - startPanRef.current.x, y: e.clientY - startPanRef.current.y });
    }
  };

  const handlePointerUp = () => setIsPanning(false);

  const sortedLayers = [...artLayers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={viewportRef}
      className="studio-viewport"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        cursor: isPanning ? 'grabbing' : (isPanToolActive ? 'grab' : 'default'),
        pointerEvents: workspaceMode === 'artist' || isPlaying ? 'auto' : 'none',
        touchAction: 'none'
      }}
    >
      <div
        className="workspace-board"
        style={{
          width: '1920px',
          height: '1080px',
          transformOrigin: '0 0', // FIX RADICAL: El pivote debe ser top-left para que la matemática funcione
          transform: `translate(${studioView.x}px, ${studioView.y}px) scale(${studioView.zoom})`
        }}
      >
        <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 0, opacity: studioView.showGreybox ? 1 : 0, pointerEvents: workspaceMode === 'dev' || isPlaying || !director.isCameraLocked ? 'auto' : 'none' }}>
          <Stage />
        </div>

        <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1, pointerEvents: workspaceMode === 'artist' && !isPlaying && director.isCameraLocked && !selectedEntity ? 'auto' : 'none' }}>
          {sortedLayers.map(layer => <ArtLayerCanvas key={layer.id} layer={layer} />)}
        </div>

        {selectedEntity && workspaceMode === 'artist' && director.isCameraLocked && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto', boxShadow: '0 0 50px rgba(0,0,0,0.8)', outline: '3px solid #0ea5e9', borderRadius: '4px' }}>
              <EntitySpriteCanvas entity={selectedEntity} />
            </div>
          </div>
        )}

        {studioTools.showGrid2D && (
          <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 9998, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '64px 64px' }}>
            <div style={{ position: 'absolute', left: '50%', top: '0', bottom: '0', borderLeft: '1px solid rgba(56, 189, 248, 0.3)', transform: 'translateX(-50%)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', borderTop: '1px solid rgba(56, 189, 248, 0.3)', transform: 'translateY(-50%)' }} />
          </div>
        )}

        {isPlaying && <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'none' }} />}
      </div>
    </div>
  );
}