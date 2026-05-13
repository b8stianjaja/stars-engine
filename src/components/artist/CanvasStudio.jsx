import React, { useRef, useEffect, useState, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../core/store';
import { Stage } from '../viewport/Stage';

const ArtLayerCanvas = memo(({ layer }) => {
  const canvasRef = useRef(null);
  const onionRef = useRef(null); // Ghost canvas for onion skin
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
  
  // Fallback for legacy state where layers had `dataUrl` instead of `frames` object
  const safeFrames = layer.frames || { 0: layer.dataUrl };
  const currentFrameData = safeFrames[timeline.currentFrame] || null;
  const prevFrameData = timeline.onionSkin && timeline.currentFrame > 0 ? safeFrames[timeline.currentFrame - 1] : null;
  const nextFrameData = timeline.onionSkin && timeline.currentFrame < timeline.totalFrames - 1 ? safeFrames[timeline.currentFrame + 1] : null;

  const currentCanvasData = currentFrameData;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1920;
      canvas.height = 1080;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.lineCap = 'round';
      context.lineJoin = 'round';
      setCtx(context);

      if (currentCanvasData) {
        const img = new Image();
        img.onload = () => {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = currentCanvasData;
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [layer.id, currentCanvasData]); 

  // Advanced Onion skin rendering (Ghost Colors)
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
          // Create offscreen canvas for tinting
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

      if (prevFrameData) drawGhost(prevFrameData, '#ef4444'); // Red for Previous Frame
      if (nextFrameData) drawGhost(nextFrameData, '#10b981'); // Green for Next Frame
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
    e.stopPropagation();
    
    // Save history before modifying the canvas
    useStore.getState().pushUndoState();

    const pos = getCanvasPos(e);
    setLastPos(pos);
    setIsDrawing(true);
    
    // Eyedropper Tool
    if (studioTools.active === 'pipette') {
      const pixel = ctx.getImageData(pos.x, pos.y, 1, 1).data;
      if (pixel[3] > 0) {
        const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => x.toString(16).padStart(2, '0')).join('');
        useStore.getState().setStudioTool({ color: hex, active: 'pencil' });
      }
      setIsDrawing(false);
      return;
    }

    // Fill Bucket Tool
    if (studioTools.active === 'bucket') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = studioTools.opacity;
      ctx.fillStyle = studioTools.color;
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setIsDrawing(false);
      if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        if (layer) updateArtLayerFrame(layer.id, timeline.currentFrame, dataUrl);
      }
      return;
    }
    
    const drawDot = (p) => {
      ctx.beginPath();
      ctx.fillStyle = studioTools.color;
      ctx.globalAlpha = studioTools.opacity;
      if (studioTools.active === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.arc(p.x, p.y, studioTools.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.arc(p.x, p.y, studioTools.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.closePath();
    };

    drawDot(pos);
    if (studioTools.symmetryX) {
      drawDot({ x: 1920 - pos.x, y: pos.y });
    }
  };

  const draw = (e) => {
    if (!isDrawing || !isEditable || !ctx || !lastPos) return;
    e.stopPropagation();
    const pos = getCanvasPos(e);

    const drawStroke = (p, pLast) => {
      ctx.beginPath();
      ctx.moveTo(pLast.x, pLast.y);
      ctx.lineTo(p.x, p.y);
      ctx.globalAlpha = studioTools.opacity;

      if (studioTools.active === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = studioTools.color;
      }
      
      ctx.lineWidth = studioTools.size;
      ctx.stroke();
    };

    drawStroke(pos, lastPos);
    if (studioTools.symmetryX) {
      drawStroke({ x: 1920 - pos.x, y: pos.y }, { x: 1920 - lastPos.x, y: lastPos.y });
    }
    
    setLastPos(pos);
  };

  const stopDrawing = (e) => {
    if (!isDrawing || !isEditable) return;
    e.stopPropagation();
    setIsDrawing(false);
    setLastPos(null);
    
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      if (layer) {
        updateArtLayerFrame(layer.id, timeline.currentFrame, dataUrl);
      }
    }
  };

  // Image Paste Handler
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
            // Draw pasted image in center
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
        <canvas
          ref={onionRef}
          className="board-layer"
          style={{
            zIndex: layer.zIndex - 0.5,
            display: layer.visible ? 'block' : 'none',
            pointerEvents: 'none',
            opacity: 0.5
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        className="board-layer"
        style={{
          zIndex: layer.zIndex,
          opacity: layer.opacity,
          mixBlendMode: layer.blendMode || 'normal',
          display: layer.visible ? 'block' : 'none',
          pointerEvents: isEditable ? 'auto' : 'none', 
          cursor: studioTools.active === 'eraser' ? 'cell' : 'crosshair'
        }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
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
  const size = 512; // Standard 2.5D sprite resolution

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
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (!isEditable || !ctx) return;
    e.stopPropagation();
    const pos = getCanvasPos(e);

    if (studioTools.active === 'bucket') {
      ctx.fillStyle = studioTools.color;
      ctx.fillRect(0, 0, size, size);
      if (canvasRef.current) updateEntityData(entity.id, { texture: canvasRef.current.toDataURL('image/png') });
      return;
    }

    setIsDrawing(true);
    setLastPos(pos);
    drawPoint(pos.x, pos.y);
  };

  const drawPoint = (x, y) => {
    ctx.globalCompositeOperation = studioTools.active === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = studioTools.color;
    ctx.fillStyle = studioTools.color;
    ctx.lineWidth = studioTools.size;
    ctx.globalAlpha = studioTools.opacity;

    ctx.beginPath();
    ctx.arc(x, y, studioTools.size / 2, 0, Math.PI * 2);
    ctx.fill();

    if (studioTools.symmetryX) {
      const symX = size - x;
      ctx.beginPath();
      ctx.arc(symX, y, studioTools.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = (e) => {
    if (!isDrawing || !isEditable || !ctx || !lastPos) return;
    e.stopPropagation();
    const pos = getCanvasPos(e);

    ctx.globalCompositeOperation = studioTools.active === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = studioTools.color;
    ctx.lineWidth = studioTools.size;
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
      if (canvasRef.current) {
        updateEntityData(entity.id, { texture: canvasRef.current.toDataURL('image/png') });
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      {/* Checkerboard background for transparency preview */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px', opacity: 0.5, borderRadius: '4px' }} />
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1, cursor: 'crosshair', borderRadius: '4px' }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerOut={stopDrawing}
      />
      {studioTools.symmetryX && <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed rgba(56, 189, 248, 0.5)', zIndex: 2, pointerEvents: 'none' }} />}
      <div style={{ position: 'absolute', top: '-25px', left: 0, right: 0, textAlign: 'center', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
        SPRITE EDITOR: {entity.name}
      </div>
    </div>
  );
});

export function CanvasStudio() {
  const { studioView, setStudioView, artLayers, studioTools, isPlaying, workspaceMode, director, timeline, setTimeline, undoArtLayer } = useStore(useShallow(state => ({
    studioView: state.studioView,
    setStudioView: state.setStudioView,
    artLayers: state.artLayers,
    studioTools: state.studioTools,
    isPlaying: state.isPlaying,
    workspaceMode: state.workspaceMode,
    director: state.director,
    timeline: state.timeline,
    setTimeline: state.setTimeline,
    undoArtLayer: state.undoArtLayer
  })));
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const entities = useStore(state => state.entities);
  const selectedEntityId = useStore(state => state.selectedEntityId);
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  const viewportRef = useRef(null);
  const playIntervalRef = useRef(null);

  // Initialize zoom to fit container gracefully on load
  useEffect(() => {
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const zoomX = (rect.width - 64) / 1920;
      const zoomY = (rect.height - 64) / 1080;
      const initialZoom = Math.max(0.1, Math.min(zoomX, zoomY));
      
      // Perfectly center the 1920x1080 board in the available viewport
      const centeredX = (rect.width - (1920 * initialZoom)) / 2;
      const centeredY = (rect.height - (1080 * initialZoom)) / 2;
      
      setStudioView({ zoom: initialZoom, x: centeredX, y: centeredY });
    }
  }, [setStudioView]);

  // Playback engine
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

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => { 
      if (e.code === 'Space') setSpacePressed(true); 
      // Undo
      if (e.ctrlKey && e.code === 'KeyZ') {
        e.preventDefault();
        undoArtLayer();
      }
      if (e.ctrlKey && e.code === 'KeyY') {
        e.preventDefault();
        useStore.getState().redoArtLayer();
      }
    };
    const handleKeyUp = (e) => { if (e.code === 'Space') setSpacePressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [undoArtLayer]);

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey || studioTools.active === 'pan' || spacePressed) {
      e.preventDefault();
      
      const zoomSensitivity = 0.0015;
      const zoomFactor = Math.exp(-e.deltaY * zoomSensitivity);
      const newZoom = Math.max(0.1, Math.min(10, studioView.zoom * zoomFactor));

      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      
      // Cursor position relative to the physical viewport
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      // Cursor position relative to the translated board
      const dx = cursorX - studioView.x;
      const dy = cursorY - studioView.y;
      
      // Adjust translation to keep the point under the cursor stationary
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
      setStudioView({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y
      });
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

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
        pointerEvents: workspaceMode === 'artist' || isPlaying ? 'auto' : 'none' 
      }}
    >
      <div 
        className="workspace-board"
        style={{
          transform: `translate(${studioView.x}px, ${studioView.y}px) scale(${studioView.zoom})`
        }}
      >
        {/* 3D Underlay */}
        <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 0, opacity: studioView.showGreybox ? 1 : 0, pointerEvents: workspaceMode === 'dev' || isPlaying || !director.isCameraLocked ? 'auto' : 'none' }}>
          <Stage />
        </div>

        {/* 2D Art Overlays */}
        <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1, pointerEvents: workspaceMode === 'artist' && !isPlaying && director.isCameraLocked && !selectedEntity ? 'auto' : 'none' }}>
          {sortedLayers.map(layer => (
            <ArtLayerCanvas key={layer.id} layer={layer} />
          ))}
        </div>

        {/* 2.5D Dedicated Sprite Editor Overlay */}
        {selectedEntity && workspaceMode === 'artist' && director.isCameraLocked && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
             <div style={{ pointerEvents: 'auto', boxShadow: '0 0 50px rgba(0,0,0,0.8)', outline: '3px solid #0ea5e9', borderRadius: '4px' }}>
                 <EntitySpriteCanvas entity={selectedEntity} />
             </div>
          </div>
        )}

        {/* 2D Grid & Precision Guides */}
        {studioTools.showGrid2D && (
          <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 9998, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '64px 64px' }}>
            {/* Absolute Center Anchor Lines */}
            <div style={{ position: 'absolute', left: '50%', top: '0', bottom: '0', borderLeft: '1px solid rgba(56, 189, 248, 0.3)', transform: 'translateX(-50%)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', borderTop: '1px solid rgba(56, 189, 248, 0.3)', transform: 'translateY(-50%)' }} />
          </div>
        )}

        {isPlaying && <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'none' }} />}
      </div>
    </div>
  );
}
