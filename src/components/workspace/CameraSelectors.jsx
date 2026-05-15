import { useSystemicStore } from '../../core/engine.store';

export function CameraSelectors({ activeViewId, views }) {
    const setView = useSystemicStore(state => state.setView);

    return (
        <div style={{ marginBottom: '20px' }}>
            <h4 style={styles.header}>Viewports de Composición</h4>
            {Object.keys(views).map((id) => (
                <button
                    key={id}
                    onClick={() => setView(id)}
                    style={{
                        ...styles.btn,
                        background: activeViewId === id ? '#1e1b4b' : '#111116',
                        border: `1px solid ${activeViewId === id ? '#6366f1' : '#1a1a22'}`,
                        color: activeViewId === id ? '#c7d2fe' : '#94a3b8',
                    }}
                >
                    {views[id].name}
                </button>
            ))}
        </div>
    );
}

const styles = {
    header: { fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' },
    btn: { display: 'block', width: '100%', padding: '6px 10px', marginBottom: '4px', borderRadius: '4px', textAlign: 'left', fontSize: '11px', cursor: 'pointer' }
};