import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { get as idbGet, set as idbSet } from 'idb-keyval';

const createEmptyScene = (name) => ({
  id: uuidv4(),
  name,
  entities: [],
  artLayers: [],
  timeline: { isPlaying: false, currentFrame: 0, fps: 12, totalFrames: 24, onionSkin: false, tags: [] },
  director: {
    activeCamera: { position: [0, 5, 10], target: [0, 0, 0], fov: 50 },
    isCameraLocked: false,
    cameraBookmarks: []
  },
  sceneLogic: {
    script: `// Global Scene Script
export function onSceneStart(engine) {
  // Initialize scene state
}

export function onSceneUpdate(engine, keys) {
  // Global gameplay loop
}`
  }
});

export const useStore = create(
  persist(
    (set, get) => ({
      // --- WORKSPACE & MODES ---
      workspaceMode: 'artist', // 'artist' | 'dev'
      uiTheme: 'light', // 'light' | 'dark'
      toggleWorkspaceMode: () => set(state => ({
        workspaceMode: state.workspaceMode === 'artist' ? 'dev' : 'artist'
      })),
      toggleTheme: () => set(state => ({
        uiTheme: state.uiTheme === 'light' ? 'dark' : 'light'
      })),

      // --- SCENE MANAGEMENT ---
      scenes: [createEmptyScene('Main Scene')],
      activeSceneId: null, // Will be set on init if not loaded

      // Active Scene State (The working buffer)
      entities: [],
      artLayers: [],
      undoStack: [],
      redoStack: [],
      timeline: { isPlaying: false, currentFrame: 0, fps: 12, totalFrames: 24, onionSkin: false, tags: [] },
      director: { activeCamera: { position: [0, 5, 10], target: [0, 0, 0], fov: 50 }, isCameraLocked: false, cameraBookmarks: [] },
      sceneLogic: { script: `// Global Scene Script\nexport function onSceneStart(engine) {}\nexport function onSceneUpdate(engine, keys) {}` },

      createScene: (name) => set(s => {
        const newScene = createEmptyScene(name || `Scene ${s.scenes.length + 1}`);
        const updatedScenes = s.activeSceneId ? s.scenes.map(scene =>
          scene.id === s.activeSceneId ? { ...scene, entities: s.entities, artLayers: s.artLayers, timeline: s.timeline, director: s.director, sceneLogic: s.sceneLogic } : scene
        ) : s.scenes;

        return {
          scenes: [...updatedScenes, newScene],
          activeSceneId: newScene.id,
          entities: newScene.entities,
          artLayers: newScene.artLayers,
          timeline: newScene.timeline,
          director: newScene.director,
          sceneLogic: newScene.sceneLogic,
          selectedEntityId: null,
          activeLayerId: null,
          undoStack: [],
          redoStack: []
        };
      }),

      switchScene: (id) => set(s => {
        if (s.activeSceneId === id) return s;
        const updatedScenes = s.scenes.map(scene =>
          scene.id === s.activeSceneId ? { ...scene, entities: s.entities, artLayers: s.artLayers, timeline: s.timeline, director: s.director, sceneLogic: s.sceneLogic } : scene
        );
        const targetScene = updatedScenes.find(scene => scene.id === id);
        if (!targetScene) return { scenes: updatedScenes };

        return {
          scenes: updatedScenes,
          activeSceneId: id,
          entities: targetScene.entities,
          artLayers: targetScene.artLayers,
          timeline: targetScene.timeline || { isPlaying: false, currentFrame: 0, fps: 12, totalFrames: 24, onionSkin: false, tags: [] },
          director: targetScene.director,
          sceneLogic: targetScene.sceneLogic || { script: `// Global Scene Script\nexport function onSceneStart(engine) {}\nexport function onSceneUpdate(engine, keys) {}` },
          selectedEntityId: null,
          activeLayerId: null,
          studioView: { ...s.studioView, zoom: 1, x: 0, y: 0 },
          undoStack: [],
          redoStack: []
        };
      }),

      // For persistence sync
      syncActiveSceneToBuffer: () => set(s => {
        if (!s.activeSceneId && s.scenes.length > 0) {
          const firstScene = s.scenes[0];
          return {
            activeSceneId: firstScene.id,
            entities: firstScene.entities,
            artLayers: firstScene.artLayers,
            director: firstScene.director,
            sceneLogic: firstScene.sceneLogic,
            undoStack: [],
            redoStack: []
          };
        }
        return s;
      }),

      // --- 3D GREYBOX LOGIC ---
      selectedEntityId: null,
      setSelectedEntity: (id) => set({ selectedEntityId: id }),
      transformMode: 'translate', // 'translate' | 'rotate' | 'scale'
      setTransformMode: (mode) => set({ transformMode: mode }),

      // Studio Viewport (2D Pan/Zoom)
      studioView: { x: 0, y: 0, zoom: 0.5, showGreybox: true },
      setStudioView: (viewUpdates) => set(s => ({ studioView: { ...s.studioView, ...viewUpdates } })),

      // Studio Tools
      studioTools: {
        active: 'pencil', // 'pencil' | 'eraser' | 'pan' | 'bucket' | 'pipette'
        color: '#f8fafc',
        size: 5,
        opacity: 1,
        symmetryX: false,
        showGrid2D: false
      },
      setStudioTool: (toolUpdates) => set(s => ({ studioTools: { ...s.studioTools, ...toolUpdates } })),

      // --- INPUT STATE (Play Mode) ---
      inputKeys: {},
      setInputKey: (code, pressed) => set(s => ({ inputKeys: { ...s.inputKeys, [code]: pressed } })),

      // --- ANIMATION TIMELINE ---
      setTimeline: (updates) => set(s => ({ timeline: { ...s.timeline, ...updates } })),

      // --- ARTIST ACTIONS ---
      undoArtLayer: () => set(s => {
        if (s.undoStack.length === 0) return s;
        const newStack = [...s.undoStack];
        const lastState = newStack.pop();
        return { 
          artLayers: lastState, 
          undoStack: newStack,
          redoStack: [s.artLayers, ...s.redoStack].slice(0, 20)
        };
      }),
      redoArtLayer: () => set(s => {
        if (s.redoStack.length === 0) return s;
        const newRedoStack = [...s.redoStack];
        const nextState = newRedoStack.shift();
        return {
          artLayers: nextState,
          undoStack: [...s.undoStack, s.artLayers].slice(-20),
          redoStack: newRedoStack
        };
      }),
      pushUndoState: () => set(s => ({
        undoStack: [...s.undoStack, s.artLayers].slice(-20), // keep last 20 actions
        redoStack: []
      })),

      addArtLayer: () => set(s => {
        s.pushUndoState();
        const newLayer = {
          id: uuidv4(),
          name: `Layer ${s.artLayers.length + 1}`,
          frames: {}, // { [frameIndex]: dataUrl }
          zIndex: s.artLayers.length,
          visible: true,
          opacity: 1,
          blendMode: 'source-over'
        };
        return {
          artLayers: [newLayer, ...s.artLayers],
          activeLayerId: newLayer.id
        };
      }),
      duplicateArtLayer: (id) => set(s => {
        s.pushUndoState();
        const layerToCopy = s.artLayers.find(l => l.id === id);
        if (!layerToCopy) return s;
        const newLayer = {
          ...layerToCopy,
          id: uuidv4(),
          name: `${layerToCopy.name} (Copy)`,
          frames: { ...layerToCopy.frames },
          zIndex: s.artLayers.length
        };
        return {
          artLayers: [newLayer, ...s.artLayers],
          activeLayerId: newLayer.id
        };
      }),
      updateArtLayer: (id, updates) => set(s => {
        s.pushUndoState();
        return { artLayers: s.artLayers.map(l => l.id === id ? { ...l, ...updates } : l) };
      }),
      updateArtLayerFrame: (layerId, frameIndex, dataUrl) => set(s => {
        return {
          artLayers: s.artLayers.map(l => {
            if (l.id === layerId) {
              const currentFrames = l.frames || { 0: l.dataUrl };
              return { ...l, frames: { ...currentFrames, [frameIndex]: dataUrl } };
            }
            return l;
          })
        };
      }),
      removeArtLayer: (id) => set(s => {
        s.pushUndoState();
        return {
          artLayers: s.artLayers.filter(l => l.id !== id),
          activeLayerId: s.activeLayerId === id ? null : s.activeLayerId
        };
      }),
      reorderArtLayer: (id, direction) => set(s => {
        s.pushUndoState();
        const index = s.artLayers.findIndex(l => l.id === id);
        if (index < 0) return s;
        if (direction === 'up' && index > 0) {
          const newLayers = [...s.artLayers];
          [newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
          newLayers.forEach((l, i) => l.zIndex = newLayers.length - i);
          return { artLayers: newLayers };
        } else if (direction === 'down' && index < s.artLayers.length - 1) {
          const newLayers = [...s.artLayers];
          [newLayers[index + 1], newLayers[index]] = [newLayers[index], newLayers[index + 1]];
          newLayers.forEach((l, i) => l.zIndex = newLayers.length - i);
          return { artLayers: newLayers };
        }
        return s;
      }),
      setActiveLayer: (id) => set({ activeLayerId: id }),

      // --- SYSTEMIC LIVE STATE (Play Mode) ---
      systemVariables: { inventory: [], flags: {} },
      setSystemFlag: (key, value) => set((state) => ({ systemVariables: { ...state.systemVariables, flags: { ...state.systemVariables.flags, [key]: value } } })),
      notifications: [],
      isPlaying: false,

      // --- CORE ACTIONS ---
      togglePlay: () => set((state) => ({
        isPlaying: !state.isPlaying,
        selectedEntityId: null,
        studioTools: { ...state.studioTools, active: 'pan' },
        studioView: { ...state.studioView, x: 0, y: 0, zoom: 1 },
        notifications: state.isPlaying ? [] : state.notifications
      })),

      toggleCameraLock: () => set((state) => ({
        director: { ...state.director, isCameraLocked: !state.director.isCameraLocked }
      })),

      updateCamera: (camUpdates) => set((state) => {
        if (state.director.isCameraLocked) return state;
        return { director: { ...state.director, activeCamera: { ...state.director.activeCamera, ...camUpdates } } };
      }),

      saveCameraBookmark: (name) => set((state) => ({
        director: { 
          ...state.director, 
          cameraBookmarks: [...(state.director.cameraBookmarks || []), { id: uuidv4(), name, ...state.director.activeCamera }] 
        }
      })),
      restoreCameraBookmark: (id) => set((state) => {
        const mark = (state.director.cameraBookmarks || []).find(b => b.id === id);
        if (!mark) return state;
        return { 
          director: { ...state.director, activeCamera: { position: mark.position, target: mark.target, fov: mark.fov }, isCameraLocked: true } 
        };
      }),
      removeCameraBookmark: (id) => set((state) => ({
        director: { ...state.director, cameraBookmarks: (state.director.cameraBookmarks || []).filter(b => b.id !== id) }
      })),

      addEntity: (type = 'cube', partialData = {}) => set((state) => {
        const newEntity = {
          id: uuidv4(),
          name: `${type}_${state.entities.length + 1}`,
          type,
          color: '#555555',
          transform: { pos: [0, 0, 0], rot: [0, 0, 0], sca: [1, 1, 1], ...partialData.transform },
          logic: { 
            events: [], 
            script: `// Entity Component Script
export function onUpdate(entity, keys, engine) {
  // Runs 60fps when Playtest is active
  // Example: if (keys['ArrowRight']) entity.transform.pos[0] += 0.05;
}
`,
            ...partialData.logic 
          },
          ...partialData
        };
        return { entities: [...state.entities, newEntity], selectedEntityId: newEntity.id };
      }),

      updateEntityData: (id, updates) => set((state) => ({
        entities: state.entities.map(e => e.id === id ? { ...e, ...updates } : e)
      })),
      updateEntityTransform: (id, transform) => set((state) => ({
        entities: state.entities.map(e => e.id === id ? { ...e, transform: { ...e.transform, ...transform } } : e)
      })),
      updateEntityLogic: (id, logicUpdates) => set((state) => ({
        entities: state.entities.map(e => e.id === id ? { ...e, logic: { ...e.logic, ...logicUpdates } } : e)
      })),
      updateSceneLogic: (updates) => set((state) => ({
        sceneLogic: { ...state.sceneLogic, ...updates }
      })),
      removeEntity: (id) => set((state) => ({
        entities: state.entities.filter(e => e.id !== id),
        selectedEntityId: state.selectedEntityId === id ? null : state.selectedEntityId
      })),
      updateEntity: (id, updates) => set((state) => ({
        entities: state.entities.map(e => e.id === id ? { ...e, ...updates } : e)
      })),

      duplicateEntity: (id) => set((state) => {
        const entityToCopy = state.entities.find(e => e.id === id);
        if (!entityToCopy) return state;
        const newEntity = {
          ...entityToCopy,
          id: uuidv4(),
          name: `${entityToCopy.name} (Copy)`,
          transform: { ...entityToCopy.transform, pos: [entityToCopy.transform.pos[0] + 0.5, entityToCopy.transform.pos[1], entityToCopy.transform.pos[2] + 0.5] }
        };
        return { entities: [...state.entities, newEntity], selectedEntityId: newEntity.id };
      }),

      triggerEvent: (entityId, triggerType) => {
        const state = get();
        if (!state.isPlaying) return;
        const entity = state.entities.find(e => e.id === entityId);
        if (!entity) return;

        entity.logic.events.filter(ev => ev.on === triggerType).forEach(ev => {
          if (ev.type === 'addItem') {
            set(s => ({
              systemVariables: { ...s.systemVariables, inventory: [...s.systemVariables.inventory, ev.payload] },
              notifications: [{ id: uuidv4(), msg: `Added: ${ev.payload}`, time: Date.now() }, ...s.notifications].slice(0, 5)
            }));
          } else if (ev.type === 'playAnimation') {
            set(s => ({
              timeline: { ...s.timeline, isPlaying: true }
            }));
          } else if (ev.type === 'notify') {
            set(s => ({
              notifications: [{ id: uuidv4(), msg: ev.payload, time: Date.now() }, ...s.notifications].slice(0, 5)
            }));
          } else if (ev.type === 'customScript') {
            try {
              const scriptFunc = new Function('state', 'set', 'payload', ev.payload);
              scriptFunc(get(), set, ev.payload);
              set(s => ({ notifications: [{ id: uuidv4(), msg: `Script Executed: ${entity.name}`, time: Date.now() }, ...s.notifications].slice(0, 5) }));
            } catch (err) {
              console.error("Custom Script Error:", err);
              set(s => ({ notifications: [{ id: uuidv4(), msg: `Script Error! Check console.`, time: Date.now() }, ...s.notifications].slice(0, 5) }));
            }
          }
        });
      },

      exportSceneData: () => {
        const state = get();
        // Save current buffer into scenes array before export
        const finalScenes = state.scenes.map(scene =>
          scene.id === state.activeSceneId ? { ...scene, entities: state.entities, artLayers: state.artLayers, director: state.director } : scene
        );

        const manifest = {
          scenes: finalScenes,
          systemVariables: state.systemVariables
        };
        const json = JSON.stringify(manifest);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stars_engine_master_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }),
    {
      name: 'stars-engine-master-v5',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const val = await idbGet(name);
          if (val) return val;
          // Fallback to localStorage for seamless migration from older sessions
          const lsVal = localStorage.getItem(name);
          if (lsVal) {
            await idbSet(name, lsVal);
            return lsVal;
          }
          return null;
        },
        setItem: async (name, value) => {
          await idbSet(name, value);
        },
        removeItem: async (name) => {}
      })),
      partialize: (state) => ({
        workspaceMode: state.workspaceMode,
        uiTheme: state.uiTheme,
        scenes: state.scenes,
        activeSceneId: state.activeSceneId,
        entities: state.entities,
        artLayers: state.artLayers,
        director: state.director,
        systemVariables: state.systemVariables
      }),
      onRehydrateStorage: () => (state) => {
        state?.syncActiveSceneToBuffer();
      }
    }
  )
);
