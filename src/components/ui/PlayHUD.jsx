import React from 'react';
import { useStore } from '../../core/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Bell } from 'lucide-react';

import { useShallow } from 'zustand/react/shallow';

export function PlayHUD() {
  const { isPlaying, systemVariables, notifications } = useStore(useShallow(state => ({
    isPlaying: state.isPlaying,
    systemVariables: state.systemVariables,
    notifications: state.notifications
  })));

  if (!isPlaying) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 50, padding: '1rem' }}>
      
      {/* Top Left: Inventory */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
        <div style={{ background: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', color: '#fff', minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#10b981' }}>
            <Package size={16} /> Inventory
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem' }}>
            {systemVariables.inventory.length === 0 ? (
              <li style={{ color: '#71717a' }}>Empty</li>
            ) : (
              systemVariables.inventory.map((item, i) => (
                <li key={i} style={{ padding: '0.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{item}</li>
              ))
            )}
          </ul>
        </div>
      </motion.div>

      {/* Bottom Left: Notifications Log */}
      <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', display: 'flex', flexDirection: 'column-reverse', gap: '0.5rem' }}>
        <AnimatePresence>
          {notifications.map(notif => (
            <motion.div 
              key={notif.id}
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0 }}
              style={{ background: 'rgba(59, 130, 246, 0.9)', backdropFilter: 'blur(4px)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
            >
              <Bell size={14} /> {notif.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
