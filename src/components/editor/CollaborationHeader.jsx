import React, { useState } from 'react';
import { useSystemicStore } from '../../core/engine.store';
import { useShallow } from 'zustand/react/shallow';
import { initSyncClient } from '../../core/bridge/sync.client';

export function CollaborationHeader({ worker }) {
    const { isConnected, localRole, latency, serverUrl } = useSystemicStore(
        useShallow(state => state.collaboration)
    );
    const setLocalRole = useSystemicStore(state => state.setLocalRole);
    const setServerUrl = useSystemicStore(state => state.setServerUrl);

    const [inputUrl, setInputUrl] = useState(serverUrl);

    const handleConnectToggle = () => {
        setServerUrl(inputUrl);
        initSyncClient(worker);
    };

    return (
        <div style={styles.header}>
            {/* LOGOTIPO Y ESTADO DE SESIÓN */}
            <div style={styles.brandContainer}>
                <div style={{ ...styles.ledIndicator, backgroundColor: isConnected ? '#34c759' : '#ff3b30' }} />
                <span style={styles.brandText}>STARS CORE WORKSPACE</span>
                {isConnected && (
                    <div style={styles.telemetryBadge}>
                        <span>LAN ACTIVA</span>
                        <span style={styles.latencyText}>{latency} ms</span>
                    </div>
                )}
            </div>

            {/* PANEL DE CONEXIÓN AL HOST LOCAL */}
            <div style={styles.connectionForm}>
                <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    style={styles.addressInput}
                    placeholder="ws://localhost:3001"
                />
                <button onClick={handleConnectToggle} style={styles.connectButton}>
                    {isConnected ? 'RECONECTAR' : 'VINCULAR'}
                </button>
            </div>

            {/* SELECTOR SEGMENTADO DE ROL DE TRABAJO COLABORATIVO */}
            <div style={styles.roleSegmentedControl}>
                <button
                    onClick={() => setLocalRole('artist')}
                    style={{
                        ...styles.roleButton,
                        backgroundColor: localRole === 'artist' ? '#0071e3' : 'transparent',
                        color: localRole === 'artist' ? '#fff' : '#86868b',
                        fontWeight: localRole === 'artist' ? '600' : '500'
                    }}
                >
                    🎨 ARTISTA (2.5D Paint & Mesh)
                </button>
                <button
                    onClick={() => setLocalRole('developer')}
                    style={{
                        ...styles.roleButton,
                        backgroundColor: localRole === 'developer' ? '#0071e3' : 'transparent',
                        color: localRole === 'developer' ? '#fff' : '#86868b',
                        fontWeight: localRole === 'developer' ? '600' : '500'
                    }}
                >
                    💻 DESARROLLADOR (Hot Logic Kernel)
                </button>
            </div>
        </div>
    );
}

const styles = {
    header: { height: '48px', backgroundColor: '#141416', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', boxSizing: 'border-box', userSelect: 'none', zIndex: 200 },
    brandContainer: { display: 'flex', alignItems: 'center', gap: '10px' },
    ledIndicator: { width: '8px', height: '8px', borderRadius: '50%', boxShadow: '0 0 6px currentColor', transition: 'background-color 0.3s' },
    brandText: { fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', color: '#f5f5f7' },
    telemetryBadge: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1c1c1e', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600', color: '#34c759', border: '1px solid rgba(52, 199, 89, 0.2)' },
    latencyText: { fontFamily: 'monospace', color: '#fff' },
    connectionForm: { display: 'flex', gap: '6px', alignItems: 'center' },
    addressInput: { backgroundColor: '#222226', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', fontSize: '11px', padding: '5px 10px', width: '160px', fontFamily: 'monospace', outline: 'none' },
    connectButton: { backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f5f5f7', fontSize: '11px', fontWeight: '600', padding: '5px 12px', cursor: 'pointer' },
    roleSegmentedControl: { display: 'flex', backgroundColor: '#222226', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' },
    roleButton: { border: 'none', padding: '5px 14px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)', background: 'transparent' }
};