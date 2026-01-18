import React, { useState, useRef } from 'react';
import { X, Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import './ServiceFormModal.css'; // Re-use styles

const SettingsModal = ({ isOpen, onClose, onRestoreSuccess }) => {
    const [status, setStatus] = useState(null); // { type: 'success'|'error', msg: '' }
    const fileInputRef = useRef(null);

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
                    <h2>Settings & Data</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="modal-body">
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

                    <div className="form-group" style={{marginTop: '2rem'}}>
                        <label>About</label>
                        <p className="description" style={{fontSize: '0.85rem'}}>
                            Home Server Dashboard v1.2<br/>
                            Phase 12: Data Management
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;