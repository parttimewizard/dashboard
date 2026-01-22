import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Upload, AlertTriangle, CheckCircle2, Bell, TestTube } from 'lucide-react';
import './ServiceFormModal.css'; // Re-use styles

const SettingsModal = ({ isOpen, onClose, onRestoreSuccess }) => {
    const [status, setStatus] = useState(null); // { type: 'success'|'error', msg: '' }
    const [activeTab, setActiveTab] = useState('general');
    const fileInputRef = useRef(null);
    const [config, setConfig] = useState({
        ntfy_url: 'https://ntfy.sh',
        ntfy_topic: '',
        ntfy_token: '',
        ntfy_username: '',
        ntfy_password: '',
        notifications_enabled: 'false',
        memory_threshold: '90'
    });

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
            const res = await fetch(`${apiUrl}/api/config`);
            if (res.ok) {
                const data = await res.json();
                setConfig(prev => ({ ...prev, ...data }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const saveConfig = async (key, value) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
            await fetch(`${apiUrl}/api/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleConfigChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
        saveConfig(key, value);
    };

    const handleTestNotification = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
            const res = await fetch(`${apiUrl}/api/notifications/test`, { method: 'POST' });
            if (res.ok) {
                setStatus({ type: 'success', msg: 'Test notification sent!' });
            } else {
                const errData = await res.json();
                throw new Error(errData.error || errData.reason || 'Failed to send test notification');
            }
        } catch (err) {
            setStatus({ type: 'error', msg: err.message });
        }
    };

    if (!isOpen) return null;

    const handleExport = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
            const res = await fetch(`${apiUrl}/api/backup`);
            if (!res.ok) throw new Error('Export failed');
            const data = await res.json();
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatus({ type: 'success', msg: 'Backup downloaded successfully.' });
        } catch (err) {
            setStatus({ type: 'error', msg: err.message });
        }
    };

    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm('WARNING: This will overwrite all current data (services, groups, history). Are you sure?')) {
            e.target.value = null;
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
                
                const res = await fetch(`${apiUrl}/api/restore`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Restore failed');
                }
                
                setStatus({ type: 'success', msg: 'Restored successfully! Reloading...' });
                setTimeout(() => {
                    onRestoreSuccess();
                    onClose();
                }, 1500);
            } catch (err) {
                setStatus({ type: 'error', msg: 'Invalid backup file or server error: ' + err.message });
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Settings</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                    <button 
                        className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                        onClick={() => setActiveTab('general')}
                        style={{ background: 'none', border: 'none', color: activeTab === 'general' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: activeTab === 'general' ? 'bold' : 'normal' }}
                    >
                        General
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notifications')}
                        style={{ background: 'none', border: 'none', color: activeTab === 'notifications' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: activeTab === 'notifications' ? 'bold' : 'normal' }}
                    >
                        Notifications
                    </button>
                </div>
                
                <div className="modal-body">
                    {activeTab === 'general' && (
                        <div className="form-group">
                            <label>Backup & Restore</label>
                            <p className="description">Export your configuration to a JSON file or restore from a backup.</p>
                            
                            <div className="button-group" style={{marginTop: '1rem', justifyContent: 'flex-start', gap: '1rem'}}>
                                <button className="btn-submit" onClick={handleExport}>
                                    <Download size={16} /> Export Config
                                </button>
                                <button className="btn-cancel" onClick={handleImportClick}>
                                    <Upload size={16} /> Import Config
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    style={{display: 'none'}} 
                                    accept=".json" 
                                    onChange={handleFileChange} 
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="notification-settings">
                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Bell size={16} /> Enable Notifications
                                    </label>
                                    <p className="description">Receive alerts via ntfy.sh when services go down.</p>
                                </div>
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={config.notifications_enabled === 'true'}
                                        onChange={(e) => handleConfigChange('notifications_enabled', String(e.target.checked))}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                                <div>
                                    <label>Use Self-Hosted Server</label>
                                    <p className="description">Toggle to use your own ntfy instance instead of the public one.</p>
                                </div>
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={config.ntfy_url !== 'https://ntfy.sh'}
                                        onChange={(e) => {
                                            const shouldUseCustom = e.target.checked;
                                            handleConfigChange('ntfy_url', shouldUseCustom ? 'https://' : 'https://ntfy.sh');
                                        }}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            {config.ntfy_url !== 'https://ntfy.sh' && (
                                <div className="form-group">
                                    <label>Server URL</label>
                                    <input 
                                        type="text" 
                                        value={config.ntfy_url}
                                        placeholder="https://ntfy.example.com"
                                        onChange={(e) => handleConfigChange('ntfy_url', e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Topic Name</label>
                                <input 
                                    type="text" 
                                    value={config.ntfy_topic}
                                    placeholder="my_secret_dashboard_topic"
                                    onChange={(e) => handleConfigChange('ntfy_topic', e.target.value)}
                                />
                                <p className="description">Make sure this is unique/secret if using the public ntfy.sh server.</p>
                            </div>

                            <div style={{ margin: '1.5rem 0', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Authentication (Optional)</label>
                                
                                <div className="form-group">
                                    <label>Username</label>
                                    <input 
                                        type="text" 
                                        value={config.ntfy_username || ''}
                                        placeholder="user"
                                        onChange={(e) => handleConfigChange('ntfy_username', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Password</label>
                                    <input 
                                        type="password" 
                                        value={config.ntfy_password || ''}
                                        placeholder="password"
                                        onChange={(e) => handleConfigChange('ntfy_password', e.target.value)}
                                    />
                                </div>
                                
                                <div style={{ textAlign: 'center', margin: '0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>- OR -</div>

                                <div className="form-group">
                                    <label>Access Token</label>
                                    <input 
                                        type="password" 
                                        value={config.ntfy_token}
                                        placeholder="tk_..."
                                        onChange={(e) => handleConfigChange('ntfy_token', e.target.value)}
                                    />
                                    <p className="description">Use a token if your server requires Bearer auth.</p>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Memory Usage Alert Threshold (%)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <input 
                                        type="range" 
                                        min="50" 
                                        max="100" 
                                        step="5"
                                        value={config.memory_threshold || 90}
                                        onChange={(e) => handleConfigChange('memory_threshold', e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <span style={{ minWidth: '3rem', fontWeight: 'bold' }}>{config.memory_threshold || 90}%</span>
                                </div>
                                <p className="description">Receive a notification when a device's RAM usage exceeds this level.</p>
                            </div>

                            <button className="btn-cancel" onClick={handleTestNotification} style={{ marginTop: '1rem' }}>
                                <TestTube size={16} /> Test Notification
                            </button>
                        </div>
                    )}
                    
                    {status && (
                        <div className={`status-message ${status.type}`} style={{
                            marginTop: '1rem', 
                            padding: '0.75rem', 
                            borderRadius: '8px', 
                            background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            color: status.type === 'error' ? '#ef4444' : '#4ade80',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            {status.type === 'error' ? <AlertTriangle size={16}/> : <CheckCircle2 size={16}/>}
                            {status.msg}
                        </div>
                    )}

                    {activeTab === 'general' && (
                        <div className="form-group" style={{marginTop: '2rem'}}>
                            <label>About</label>
                            <p className="description" style={{fontSize: '0.85rem'}}>
                                Home Server Dashboard v1.3<br/>
                                Phase 13: Notifications & Monitoring
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;