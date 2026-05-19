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

    // DETERMINISTIC HARDWARE-ACCELERATED TRANSITION RAIL
    useEffect(() => {
        if (isBuildRuntime) return;

        const leftSidebar = leftSidebarRef.current;
        const rightInspector = rightInspectorRef.current;
        const logicEditor = logicEditorWrapperRef.current;

        if (!leftSidebar || !rightInspector || !logicEditor) return;

        if (studioMode === 'logic') {
            gsap.timeline()
                .to(leftSidebar, { xPercent: -105, autoAlpha: 0, duration: 0.35, ease: "power3.inOut" }, 0)
                .to(rightInspector, { xPercent: 105, autoAlpha: 0, duration: 0.35, ease: "power3.inOut" }, 0)
                .fromTo(logicEditor,
                    { xPercent: 100, autoAlpha: 0 },
                    { xPercent: 0, autoAlpha: 1, pointerEvents: 'all', duration: 0.45, ease: "power4.out" }, 0.08
                );
        } else {
            gsap.timeline()
                .to(logicEditor, { xPercent: 105, autoAlpha: 0, pointerEvents: 'none', duration: 0.3, ease: "power2.in" }, 0)
                .to(leftSidebar, { xPercent: 0, autoAlpha: 1, duration: 0.4, ease: "power4.out" }, 0.05)
                .to(rightInspector, { xPercent: 0, autoAlpha: 1, duration: 0.4, ease: "power4.out" }, 0.05);
        }
    }, [studioMode, isBuildRuntime]);

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark-theme');
    };

    const zIndices = useMemo(() => {
        return paintMode ? { background: 1, canvas3D: 10, midground: 15, foreground: 20 }
            : { background: 1, midground: 2, foreground: 3, canvas3D: 30 };
    }, [paintMode]);

    // PRODUCTION RUNTIME: STANDALONE EXE LAYER DISTRIBUTOR
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

    // STUDIO DEVEOPMENT WORKSPACE
    return (
        <div style={{
            width: '100vw', height: '100vh', background: '#0b0b0c', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif', userSelect: 'none', boxSizing: 'border-box'
        }}>
            <CollaborationHeader worker={worker} />
            <ProjectSystemControls worker={worker} />

            {/* FLEX WRAPPER PREVENTS INTERFACE LEAKING OR OVERFLOW FIELDS */}
            <div style={{
                position: 'relative',
                flex: 1,
                width: '100%',
                overflow: 'hidden',
                display: 'flex',
                background: '#0b0b0c'
            }}>

                {/* LEFT VIEWPORT: FLUID TREE ALLOCATOR */}
                <div
                    ref={leftSidebarRef}
                    style={{
                        position: 'absolute', top: '12px', left: '12px', width: '320px', height: 'calc(100% - 24px)',
                        background: 'rgba(20, 20, 22, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', zIndex: 100, overflow: 'hidden',
                        willChange: 'transform, opacity', backfaceVisibility: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                        boxSizing: 'border-box', display: 'flex', flexDirection: 'column'
                    }}
                >
                    <WorkspaceSidebar worker={worker} toggleTheme={toggleTheme} isDark={true} />
                </div>

                {/* MAIN DESEGREGATED RENDERING LANES */}
                <div style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.background }}><DrawingCanvasLayer targetLayer="background" /></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.canvas3D }}><EngineCanvas worker={worker} /></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.midground }}><DrawingCanvasLayer targetLayer="midground" /></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: zIndices.foreground }}><DrawingCanvasLayer targetLayer="foreground" /></div>

                    <TelemetryHUD sharedBuffer={EngineMemory.physicsBuffer} />

                    {/* CENTRAL FLOATING MONACO HOT LOGIC CONTROLLER */}
                    <div
                        ref={logicEditorWrapperRef}
                        style={{
                            position: 'absolute', top: '12px', left: '12px', width: 'calc(100% - 24px)', height: 'calc(100% - 24px)',
                            background: 'rgba(16, 16, 18, 0.94)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
                            border: '1px solid rgba(0, 113, 227, 0.3)', borderRadius: '12px', zIndex: 110, overflow: 'hidden',
                            transform: 'translateX(105%)', opacity: 0, pointerEvents: 'none',
                            willChange: 'transform, opacity', backfaceVisibility: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                            boxSizing: 'border-box'
                        }}
                    >
                        <LiveEditor worker={worker} />
                    </div>
                </div>

                {/* RIGHT VIEWPORT: REFLECTIVE COMPONENT DATA INSPECTOR */}
                <div
                    ref={rightInspectorRef}
                    style={{
                        position: 'absolute', top: '12px', right: '12px', width: '340px', height: 'calc(100% - 24px)',
                        background: 'rgba(20, 20, 22, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', zIndex: 100, overflow: 'hidden',
                        willChange: 'transform, opacity', backfaceVisibility: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                        boxSizing: 'border-box', display: 'flex', flexDirection: 'column'
                    }}
                >
                    <DataInspectorPanel worker={worker} />
                </div>
            </div>
        </div>
    );
}