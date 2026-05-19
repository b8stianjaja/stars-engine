// src/components/editor/CollaborationHeader.jsx
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

    // INTERACTIVE ACCELERATED GSAP EVENTS
    const handleButtonHover = (e) => {
        gsap.to(e.currentTarget, {
            scale: 1.02,
            backgroundColor: '#1c1c1e',
            borderColor: 'rgba(255, 255, 255, 0.25)',
            duration: 0.2,
            ease: 'expo.out'
        });
    };

    const handleButtonLeave = (e) => {
        gsap.to(e.currentTarget, {
            scale: 1.0,
            backgroundColor: '#161618',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            duration: 0.25,
            ease: 'power2.out'
        });
    };

    const handleRoleHover = (e, isActive) => {
        if (isActive) return;
        gsap.to(e.currentTarget, {
            scale: 1.015,
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
            scale: 0.97,
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
                <div style={{
                    ...styles.ledIndicator,
                    backgroundColor: isConnected ? '#30d158' : '#ff453a',
                    boxShadow: isConnected ? '0 0 10px #30d158' : '0 0 10px #ff453a'
                }} />
                <span style={styles.brandText}>STARS ENGINE DISPATCHER</span>
                {isConnected && (
                    <div style={styles.telemetryBadge}>
                        <span style={{ letterSpacing: '0.3px' }}>LAN SYNC ACTIVE</span>
                        <span style={styles.latencyText}>{latency ?? 0}ms</span>
                    </div>
                )}
            </div>

            {/* HOST CONNECTION PIPELINE */}
            <div style={styles.connectionForm}>
                <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value ?? '')}
                    style={styles.addressInput}
                    placeholder="ws://localhost:3001"
                    onFocus={(e) => { e.target.style.borderColor = '#0071e3'; e.target.style.boxShadow = '0 0 6px rgba(0,113,227,0.4)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                    onClick={(e) => { handleButtonPress(e); handleConnectToggle(); }}
                    onMouseEnter={handleButtonHover}
                    onMouseLeave={handleButtonLeave}
                    style={styles.connectButton}
                >
                    {isConnected ? 'DISCONNECT' : 'LINK NODE'}
                </button>
            </div>

            {/* WORK ROLE SEGMENTED MATRIX */}
            <div style={styles.roleSegmentedControl}>
                <button
                    onClick={(e) => { handleButtonPress(e); setLocalRole('artist'); }}
                    onMouseEnter={(e) => handleRoleHover(e, localRole === 'artist')}
                    onMouseLeave={(e) => handleRoleLeave(e, localRole === 'artist')}
                    style={{
                        ...styles.roleButton,
                        backgroundColor: localRole === 'artist' ? '#0071e3' : 'transparent',
                        color: localRole === 'artist' ? '#ffffff' : '#86868b',
                        fontWeight: localRole === 'artist' ? '600' : '500',
                        boxShadow: localRole === 'artist' ? '0 2px 6px rgba(0,0,0,0.3)' : 'none'
                    }}
                >
                    🎨 ARTISTA
                </button>
                <button
                    onClick={(e) => { handleButtonPress(e); setLocalRole('developer'); }}
                    onMouseEnter={(e) => handleRoleHover(e, localRole === 'developer')}
                    onMouseLeave={(e) => handleRoleLeave(e, localRole === 'developer')}
                    style={{
                        ...styles.roleButton,
                        backgroundColor: localRole === 'developer' ? '#0071e3' : 'transparent',
                        color: localRole === 'developer' ? '#ffffff' : '#86868b',
                        fontWeight: localRole === 'developer' ? '600' : '500',
                        boxShadow: localRole === 'developer' ? '0 2px 6px rgba(0,0,0,0.3)' : 'none'
                    }}
                >
                    💻 DESARROLLADOR
                </button>
            </div>
        </div>
    );
}

const styles = {
    header: { height: '44px', backgroundColor: '#101012', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', boxSizing: 'border-box', userSelect: 'none', zIndex: 200 },
    brandContainer: { display: 'flex', alignItems: 'center', gap: '10px' },
    ledIndicator: { width: '7px', height: '7px', borderRadius: '50%', transition: 'all 0.3s' },
    brandText: { fontSize: '11px', fontWeight: '800', letterSpacing: '0.6px', color: '#f5f5f7' },
    telemetryBadge: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(48, 209, 88, 0.06)', padding: '3px 8px', borderRadius: '5px', fontSize: '9px', fontWeight: '700', color: '#30d158', border: '1px solid rgba(48, 209, 88, 0.25)' },
    latencyText: { fontFamily: 'monospace', color: '#f5f5f7', fontWeight: '600' },
    connectionForm: { display: 'flex', gap: '6px', alignItems: 'center' },
    addressInput: { backgroundColor: '#161618', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', color: '#ffffff', fontSize: '11px', padding: '5px 10px', width: '150px', fontFamily: 'monospace', outline: 'none', transition: 'all 0.2s ease', boxSizing: 'border-box' },
    connectButton: { backgroundColor: '#161618', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', color: '#f5f5f7', fontSize: '10px', letterSpacing: '0.3px', 尊fontWeight: '700', padding: '5px 12px', cursor: 'pointer', outline: 'none', willChange: 'transform', transition: 'all 0.2s' },
    roleSegmentedControl: { display: 'flex', backgroundColor: '#161618', padding: '2px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.05)' },
    roleButton: { border: 'none', padding: '4px 12px', fontSize: '10px', letterSpacing: '0.2px', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)', background: 'transparent', outline: 'none', willChange: 'transform' }
};