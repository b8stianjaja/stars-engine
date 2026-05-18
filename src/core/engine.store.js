// src/core/engine.store.js
import { create } from 'zustand';
import { createWorkspaceSlice } from './store/workspace.slice';
import { createCollaborationSlice } from './store/collaboration.slice';
import { createEntitySlice } from './store/entity.slice';
import { createSceneSlice } from './store/scene.slice';

export const useSystemicStore = create((set, get) => ({
    ...createWorkspaceSlice(set, get),
    ...createCollaborationSlice(set, get),
    ...createEntitySlice(set, get),
    ...createSceneSlice(set, get)
}));