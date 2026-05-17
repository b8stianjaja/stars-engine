import { useProjectSystem } from '../../core/bridge/project.hook';

export function ProjectSystemControls({ worker }) {
    const { isSaving, isLoading, handleSave, handleLoad } = useProjectSystem(worker);

    const buttonStyle = {
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm, 6px)',
        padding: '4px 10px',
        color: 'var(--text-secondary)',
        fontSize: '11px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
        outline: 'none'
    };

    return (
        <div style={{ display: 'flex', gap: '8px' }}>
            <button
                onClick={handleLoad}
                disabled={isLoading || isSaving}
                style={{
                    ...buttonStyle,
                    opacity: isLoading ? 0.5 : 1,
                    pointerEvents: isLoading || isSaving ? 'none' : 'auto',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
            >
                {isLoading ? 'Cargando...' : '↓ Cargar'}
            </button>

            <button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                style={{
                    ...buttonStyle,
                    background: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    opacity: isSaving ? 0.5 : 1,
                    pointerEvents: isSaving || isLoading ? 'none' : 'auto',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
                {isSaving ? 'Guardando...' : '↑ Guardar'}
            </button>
        </div>
    );
}