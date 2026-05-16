import { useSystemicStore } from '../../core/engine.store';
import { useShallow } from 'zustand/react/shallow';

export function ArtistStudioPanel() {
    const {
        paintMode, activeLayerKey, brushColor, brushSize
    } = useSystemicStore(useShallow(state => state.layerPlayback));

    const setPaintMode = useSystemicStore(state => state.setPaintMode);
    const setActiveLayerKey = useSystemicStore(state => state.setActiveLayerKey);
    const setBrushColor = useSystemicStore(state => state.setBrushColor);
    const setBrushSize = useSystemicStore(state => state.setBrushSize);

    const cameraLocked = useSystemicStore(state => state.workspace.cameraLocked);
    const toggleCameraLock = useSystemicStore(state => state.toggleCameraLock);

    const layers = [
        { id: 'foreground', name: 'Primer Plano (Frente)' },
        { id: 'midground', name: 'Plano Medio (Suelo)' },
        { id: 'background', name: 'Fondo (Cielo/Pared)' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '4px', marginTop: '16px' }}>

            {/* CÁMARA DE DIRECTOR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    1. Encuadre
                </span>
                <button
                    onClick={toggleCameraLock}
                    style={{
                        padding: '10px 12px',
                        background: cameraLocked ? 'rgba(255, 59, 48, 0.1)' : 'var(--bg-input)',
                        color: cameraLocked ? '#ff3b30' : 'var(--text-main)',
                        border: `1px solid ${cameraLocked ? 'rgba(255, 59, 48, 0.2)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cameraLocked ? '#ff3b30' : 'var(--text-secondary)' }} />
                    {cameraLocked ? 'Cámara Bloqueada (Modo Dibujo)' : 'Fijar Cámara de Escena'}
                </button>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    {cameraLocked ? "Mueve el lienzo libremente. El motor 3D está pausado visualmente." : "Orbita la vista hasta encontrar el ángulo perfecto y bloquéalo para dibujar."}
                </p>
            </div>

            <div style={{ height: '1px', background: 'var(--border)' }} />

            {/* CONTROL DE CAPAS (SÁNDWICH Z-DEPTH) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    2. Profundidad de Lienzo
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {layers.map(layer => (
                        <button
                            key={layer.id}
                            onClick={() => setActiveLayerKey(layer.id)}
                            disabled={!cameraLocked}
                            style={{
                                padding: '8px 12px',
                                background: activeLayerKey === layer.id ? 'var(--accent-subtle)' : 'transparent',
                                border: `1px solid ${activeLayerKey === layer.id ? 'var(--accent)' : 'transparent'}`,
                                color: activeLayerKey === layer.id ? 'var(--accent)' : 'var(--text-main)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontWeight: activeLayerKey === layer.id ? '600' : '500',
                                textAlign: 'left',
                                cursor: cameraLocked ? 'pointer' : 'not-allowed',
                                opacity: cameraLocked ? 1 : 0.5,
                                transition: 'all 0.1s'
                            }}
                        >
                            {layer.name}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border)' }} />

            {/* HERRAMIENTAS DE DIBUJO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: cameraLocked ? 1 : 0.3, pointerEvents: cameraLocked ? 'auto' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        3. Ilustración
                    </span>
                    <button
                        onClick={() => setPaintMode(!paintMode)}
                        style={{
                            background: paintMode ? 'var(--accent)' : 'var(--bg-input)',
                            color: paintMode ? '#fff' : 'var(--text-main)',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        {paintMode ? 'Terminar Trazo' : 'Activar Pincel'}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        style={{ width: '30px', height: '30px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0, background: 'transparent' }}
                    />
                    <input
                        type="range"
                        min="1" max="50"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '24px', textAlign: 'right' }}>{brushSize}</span>
                </div>
            </div>
        </div>
    );
}