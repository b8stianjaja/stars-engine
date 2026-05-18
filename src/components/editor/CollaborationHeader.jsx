import React, { useState } from 'react';
import { useSystemicStore } from '../../core/engine.store';
import { useShallow } from 'zustand/react/shallow';
import { initSyncClient } from '../../core/bridge/sync.client';
import gsap from 'gsap';

export function CollaborationHeader({ worker }) {
    const { isConnected, localRole, latency, serverUrl } = useSystemicStore(
        useShallow(state => state.collaboration)
    );
    const setLocalRole = useSystemicStore(state => state.setLocalRole);
    const setServerUrl = useSystemicStore(state => state.setServerUrl);

    const [inputUrl, setInputUrl] = useState(serverUrl ?? '');

    const handleConnectToggle = () => {
        setServerUrl(inputUrl);
        initSyncClient(worker);
    };

    // CONTROLADORES DE MICRO-INTERACCIONES GSAP (HARDWARE ACCELERATED)
    const handleButtonHover = (e) => {
        gsap.to(e.currentTarget, {
            scale: 1.03,
            borderColor: 'rgba(255, 255, 255, 0.25)',
            duration: 0.2,
            ease: 'expo.out'
        });
    };

    const handleButtonLeave = (e) => {
        gsap.to(e.currentTarget, {
            scale: 1.0,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            duration: 0.25,
            ease: 'power2.out'
        });
    };

    const handleRoleHover = (e, isActive) => {
        if (isActive) return;
        gsap.to(e.currentTarget, {
            scale: 1.02,
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            color: '#f5f5f7',
            duration: 0.2,
            ease: 'expo.out'
        });
    };

    const handleRoleLeave = (e, isActive) => {
        if (isActive) return;
        gsap.to(e.currentTarget, {
            scale: 1.0,
            backgroundColor: 'transparent',
            color: '#86868b',
            duration: 0.25,
            ease: 'power2.out'
        });
    };

    const handleButtonPress = (e) => {
        gsap.to(e.currentTarget, {
            scale: 0.96,
            duration: 0.08,
            ease: 'power3.out',
            yoyo: true,
            repeat: 1
        });
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
                        <span style={styles.latencyText}>{latency ?? 0} ms</span>
                    </div>
                )}
            </div>

            {/* PANEL DE CONEXIÓN AL HOST LOCAL */}
            <div style={styles.connectionForm}>
                <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value ?? '')}
                    style={styles.addressInput}
                    placeholder="ws://localhost:3001"
                />
                <button
                    onClick={(e) => { handleButtonPress(e); handleConnectToggle(); }}
                    onMouseEnter={handleButtonHover}
                    onMouseLeave={handleButtonLeave}
                    style={styles.connectButton}
                >
                    {isConnected ? 'RECONECTAR' : 'VINCULAR'}
                </button>
            </div>

            {/* SELECTOR SEGMENTADO DE ROL DE TRABAJO COLABORATIVO */}
            <div style={styles.roleSegmentedControl}>
                <button
                    onClick={(e) => { handleButtonPress(e); setLocalRole('artist'); }}
                    onMouseEnter={(e) => handleRoleHover(e, localRole === 'artist')}
                    onMouseLeave={(e) => handleRoleLeave(e, localRole === 'artist')}
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
                    onClick={(e) => { handleButtonPress(e); setLocalRole('developer'); }}
                    onMouseEnter={(e) => handleRoleHover(e, localRole === 'developer')}
                    onMouseLeave={(e) => handleRoleLeave(e, localRole === 'developer')}
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
    connectButton: { backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f5f5f7', fontSize: '11px', fontWeight: '600', padding: '5px 12px', cursor: 'pointer', outline: 'none', willChange: 'transform' },
    roleSegmentedControl: { display: 'flex', backgroundColor: '#222226', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' },
    roleButton: { border: 'none', padding: '5px 14px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s, color 0.2s', background: 'transparent', outline: 'none', willChange: 'transform' }
};