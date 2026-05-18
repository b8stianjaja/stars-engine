// src/layout/WorkspaceLayout.jsx
import { useEffect, useRef, useMemo } from 'react';
import { useSystemicStore } from '../core/engine.store';
import { useShallow } from 'zustand/react/shallow';
import gsap from 'gsap';

import { EngineCanvas } from '../components/canvas/EngineCanvas';
import { LiveEditor } from '../components/editor/LiveEditor';
import { WorkspaceSidebar } from '../components/editor/WorkspaceSidebar';
import { DrawingCanvasLayer } from '../components/editor/DrawingCanvasLayer';
import { ProjectSystemControls } from '../components/editor/ProjectSystemControls';
import { CollaborationHeader } from '../components/editor/CollaborationHeader';
import { DataInspectorPanel } from '../components/editor/DataInspectorPanel';
import { TelemetryHUD } from '../components/debug/TelemetryHUD';
import { EngineMemory } from '../core/config/memory.config';

export function WorkspaceLayout({ worker, isBuildRuntime }) {
    const studioMode = useSystemicStore(useShallow(state => state.workspace.studioMode ?? 'design'));
    const paintMode = useSystemicStore(useShallow(state => state.layerPlayback.paintMode ?? false));

    const leftSidebarRef = useRef(null);
    const rightInspectorRef = useRef(null);
    const logicEditorWrapperRef = useRef(null);

    // PIPELINE DE ORQUESTACIÓN CINEMÁTICA DE INTERFAZ (GSAP LAYOUT MUTATION)
    useEffect(() => {
        if (isBuildRuntime) return;

        const leftSidebar = leftSidebarRef.current;
        const rightInspector = rightInspectorRef.current;
        const logicEditor = logicEditorWrapperRef.current;

        if (!leftSidebar || !rightInspector || !logicEditor) return;

        if (studioMode === 'logic') {
            gsap.timeline()
                .to(leftSidebar, { xPercent: -100, opacity: 0, duration: 0.4, ease: "power3.inOut" }, 0)
                .to(rightInspector, { xPercent: 100, opacity: 0, duration: 0.4, ease: "power3.inOut" }, 0)
                .fromTo(logicEditor,
                    { xPercent: 100, opacity: 0 },
                    { xPercent: 0, opacity: 1, duration: 0.5, ease: "power4.out" }, 0.1
                );
        } else {
            gsap.timeline()
                .to(logicEditor, { xPercent: 100, opacity: 0, duration: 0.35, ease: "power2.in" }, 0)
                .to(leftSidebar, { xPercent: 0, opacity: 1, duration: 0.45, ease: "power4.out" }, 0.05)
                .to(rightInspector, { xPercent: 0, opacity: 1, duration: 0.45, ease: "power4.out" }, 0.05);
        }
    }, [studioMode, isBuildRuntime]);

    const toggleTheme = () => document.documentElement.classList.toggle('dark-theme');

    const zIndices = useMemo(() => {
        return paintMode ? { background: 1, canvas3D: 10, midground: 15, foreground: 20 }
            : { background: 1, midground: 2, foreground: 3, canvas3D: 30 };
    }, [paintMode]);

    // MODO PRODUCCIÓN: JUEGO FINAL EMPAQUETADO (.EXE)
    if (isBuildRuntime) {
        return (
            <div style={{ width: '100vw', height: '100vh', background: '#000000', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}><DrawingCanvasLayer targetLayer="background" /></div>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2 }}><EngineCanvas worker={worker} /></div>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 3 }}><DrawingCanvasLayer targetLayer="midground" /></div>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 4 }}><DrawingCanvasLayer targetLayer="foreground" /></div>
            </div>
        );
    }

    // MODO ESTUDIO: ENTORNO DE DESARROLLO E INSPECCIÓN
    return (
        <div style={{
            width: '100vw', height: '100vh', background: 'var(--bg-app)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', userSelect: 'none'
        }}>
            <CollaborationHeader worker={worker} />
            <ProjectSystemControls worker={worker} />

            <div style={{ display: 'flex', flex: 1, width: '100%', height: 'calc(100% - 79px)', overflow: 'hidden', position: 'relative' }}>

                {/* PANEL IZQUIERDO: ÁRBOL DE ENTIDADES */}
                <div
                    ref={leftSidebarRef}
                    style={{
                        position: 'absolute', top: '12px', left: '12px', width: '320px', height: 'calc(100% - 24px)',
                        background: 'var(--bg-sidebar)', backdropFilter: 'var(--blur-panel)', WebkitBackdropFilter: 'var(--blur-panel)',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', zIndex: 100, overflow: 'hidden',
                        willChange: 'transform, opacity', backfaceVisibility: 'hidden', boxShadow: 'var(--shadow-premium)'
                    }}
                >
                    <WorkspaceSidebar worker={worker} toggleTheme={toggleTheme} isDark={true} />
                </div>

                {/* CENTRO: LIENZO R3F Y 2.5D */}
                <div style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.background }}><DrawingCanvasLayer targetLayer="background" /></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.canvas3D }}><EngineCanvas worker={worker} /></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.midground }}><DrawingCanvasLayer targetLayer="midground" /></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.foreground }}><DrawingCanvasLayer targetLayer="foreground" /></div>

                    <TelemetryHUD sharedBuffer={EngineMemory.physicsBuffer} />

                    {/* PANEL DE INYECCIÓN LÓGICA (MONACO EDITOR) */}
                    <div
                        ref={logicEditorWrapperRef}
                        style={{
                            position: 'absolute', top: '12px', right: '12px', width: 'calc(50% - 18px)', height: 'calc(100% - 24px)',
                            background: 'var(--bg-panel)', backdropFilter: 'var(--blur-panel)', WebkitBackdropFilter: 'var(--blur-panel)',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', zIndex: 110, overflow: 'hidden',
                            transform: 'translateX(100%)', opacity: 0, pointerEvents: 'none',
                            willChange: 'transform, opacity', backfaceVisibility: 'hidden', boxShadow: 'var(--shadow-premium)'
                        }}
                    >
                        <LiveEditor worker={worker} />
                    </div>
                </div>

                {/* PANEL DERECHO: INSPECTOR DE PROPIEDADES */}
                <div
                    ref={rightInspectorRef}
                    style={{
                        position: 'absolute', top: '12px', right: '12px', width: '340px', height: 'calc(100% - 24px)',
                        background: 'var(--bg-sidebar)', backdropFilter: 'var(--blur-panel)', WebkitBackdropFilter: 'var(--blur-panel)',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', zIndex: 100, overflow: 'hidden',
                        willChange: 'transform, opacity', backfaceVisibility: 'hidden', boxShadow: 'var(--shadow-premium)'
                    }}
                >
                    <DataInspectorPanel worker={worker} />
                </div>
            </div>
        </div>
    );
}