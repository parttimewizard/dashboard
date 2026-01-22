import { useState } from 'react';
import { X, Play, Loader2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { iconMap } from '../utils/icons';
import './ServiceFormModal.css';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return import.meta.env.PROD ? '' : 'http://localhost:5000';
};

const ServiceFormModal = ({ isOpen, onClose, onSave, groups, locations, services, initialData }) => {
  const [formData, setFormData] = useState(() => {
    if (initialData) {
        return {
            name: initialData.name || '',
            url: initialData.url || '',
            monitoring_url: initialData.monitoring_url || '',
            icon: initialData.icon || '',
            brand_icon: initialData.brand_icon || '',
            category: initialData.category || 'Service',
            group_ids: initialData.group_ids || (initialData.group_id ? [initialData.group_id] : []),
            host_id: initialData.host_id || '',
            location_id: initialData.location_id || '',
            is_quick_access: initialData.is_quick_access || false,
            monitoring_type: initialData.monitoring_type || 'http',
            snmp_host: initialData.snmp_host || '',
            snmp_oid: initialData.snmp_oid || '',
            snmp_community: initialData.snmp_community || 'public',
            api_key: initialData.api_key || '',
            target_node: initialData.target_node || '',
            target_vmid: initialData.target_vmid || '',
            target_container_name: initialData.target_container_name || ''
        };
    }
    return {
        name: '',
        url: '',
        monitoring_url: '',
        icon: '',
        brand_icon: '',
        category: 'Service',
        group_ids: [],
        host_id: '',
        location_id: '',
        is_quick_access: false,
        monitoring_type: 'http',
        snmp_host: '',
        snmp_oid: '',
        snmp_community: 'public',
        api_key: '',
        target_node: '',
        target_vmid: '',
        target_container_name: ''
    };
  });

  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleTestConnection = async () => {
      setIsTesting(true);
      setTestResult(null);
      try {
          const apiUrl = getApiUrl();
          const res = await fetch(`${apiUrl}/api/services/test`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
          });
          const data = await res.json();
          setTestResult(data);
      } catch (err) {
          setTestResult({ status: 'offline', error: err.message });
      } finally {
          setIsTesting(false);
      }
  };

  const availableHosts = services ? services.filter(s => !initialData || s.id !== initialData.id) : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
            <h2>{initialData ? 'Edit Item' : 'Add New Item'}</h2>
            <button className="btn-close-modal" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-scroll-area">
            <div className="form-group">
                <label>Name</label>
                <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
                />
            </div>

            <div className="form-group">
                <label>Type / Category</label>
                <input 
                type="text" 
                list="category-options"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                placeholder="e.g. Service, Device, VM..."
                />
                <datalist id="category-options">
                    <option value="Service" />
                    <option value="Virtual Machine" />
                    <option value="Physical Device" />
                    <option value="Network" />
                    <option value="Media" />
                    <option value="Automation" />
                    <option value="Admin" />
                </datalist>
            </div>

            <div className="form-group">
                <label>Display URL (Address for web UI access)</label>
                <input 
                type="text" 
                value={formData.url} 
                onChange={e => setFormData({...formData, url: e.target.value})} 
                placeholder="http://... or IP address"
                />
            </div>

            <div className="form-group">
                <label>Generic Icon (Lucide Library)</label>
                <div className="icon-picker">
                    {Object.keys(iconMap).map(key => {
                        const Icon = iconMap[key];
                        return (
                            <div 
                                key={key} 
                                className={`icon-option ${formData.icon === key ? 'selected' : ''}`}
                                onClick={() => setFormData({...formData, icon: key})}
                                title={key}
                            >
                                <Icon size={20} />
                            </div>
                        );
                    })}
                </div>
                <input 
                type="text" 
                value={formData.icon} 
                onChange={e => setFormData({...formData, icon: e.target.value})} 
                placeholder="Or enter icon name / image URL"
                className="mt-2"
                />
            </div>

            <div className="form-group">
                <label>Brand/App Icon (Slug)</label>
                <div className="brand-icon-input-wrapper">
                    <input 
                        type="text" 
                        value={formData.brand_icon} 
                        onChange={e => setFormData({...formData, brand_icon: e.target.value})} 
                        placeholder="e.g. proxmox, plex, truenas, docker..."
                    />
                    {formData.brand_icon && (
                        <div className="brand-icon-preview">
                            <img 
                                src={`https://cdn.simpleicons.org/${formData.brand_icon}`} 
                                alt="" 
                                onError={(e) => e.target.style.display = 'none'}
                                onLoad={(e) => e.target.style.display = 'block'}
                            />
                        </div>
                    )}
                </div>
                <p className="field-hint">
                    Uses <a href="https://simpleicons.org/" target="_blank" rel="noreferrer">Simple Icons</a> slugs.
                </p>
            </div>
            
            <div className="form-group">
                <label>Location (Physical/Logical Area)</label>
                <select 
                value={formData.location_id} 
                onChange={e => setFormData({...formData, location_id: e.target.value})}
                >
                <option value="">Unassigned</option>
                {locations && locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                ))}
                </select>
            </div>

            <div className="form-group">
                <label>Groups</label>
                <div className="groups-multiselect">
                    {groups && groups.map(g => (
                        <label key={g.id} className="group-checkbox-item">
                            <input 
                                type="checkbox" 
                                checked={formData.group_ids.includes(g.id)}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setFormData(prev => ({
                                        ...prev,
                                        group_ids: checked 
                                            ? [...prev.group_ids, g.id]
                                            : prev.group_ids.filter(id => id !== g.id)
                                    }));
                                }}
                            />
                            {g.name}
                        </label>
                    ))}
                    {(!groups || groups.length === 0) && <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>No groups available.</span>}
                </div>
            </div>

            <div className="form-group">
                <label>Runs On (Host/VM)</label>
                <select 
                value={formData.host_id || ''} 
                onChange={e => setFormData({...formData, host_id: e.target.value || null})}
                >
                <option value="">None (Top Level / Physical)</option>
                {availableHosts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                </select>
            </div>
            
            <div className="form-group">
                <label>Monitoring Type</label>
                <select 
                value={formData.monitoring_type} 
                onChange={e => setFormData({...formData, monitoring_type: e.target.value})}
                >
                <option value="http">HTTP Ping</option>
                <option value="snmp">SNMP Get</option>
                <option value="proxmox">Proxmox API</option>
                <option value="glances">Glances API</option>
                <option value="truenas">TrueNAS API</option>
                </select>
            </div>

            {formData.monitoring_type !== 'http' && formData.monitoring_type !== 'snmp' && (
                <div className="form-group">
                    <label>Monitoring/API URL (Optional if same as Display URL)</label>
                    <input 
                        type="text" 
                        value={formData.monitoring_url} 
                        onChange={e => setFormData({...formData, monitoring_url: e.target.value})} 
                        placeholder="IP or URL for API access"
                    />
                </div>
            )}

            {formData.monitoring_type === 'snmp' && (
                <div className="special-fields">
                <div className="form-group">
                    <label>SNMP Host</label>
                    <input 
                    type="text" 
                    value={formData.snmp_host} 
                    onChange={e => setFormData({...formData, snmp_host: e.target.value})} 
                    placeholder="192.168.x.x"
                    />
                </div>
                <div className="form-group">
                    <label>OID</label>
                    <input 
                    type="text" 
                    value={formData.snmp_oid} 
                    onChange={e => setFormData({...formData, snmp_oid: e.target.value})} 
                    placeholder="1.3.6.1..."
                    />
                </div>
                <div className="form-group">
                    <label>Community</label>
                    <input 
                    type="text" 
                    value={formData.snmp_community} 
                    onChange={e => setFormData({...formData, snmp_community: e.target.value})} 
                    />
                </div>
                </div>
            )}

            {formData.monitoring_type === 'proxmox' && (
                <div className="special-fields">
                <div className="form-group">
                    <label>API Token (USER@REALM!TOKENID=UUID)</label>
                    <input 
                    type="password" 
                    value={formData.api_key} 
                    onChange={e => setFormData({...formData, api_key: e.target.value})} 
                    placeholder="user@pam!tokenid=uuid"
                    />
                </div>
                <div className="form-group">
                    <label>Node Name</label>
                    <input 
                    type="text" 
                    value={formData.target_node} 
                    onChange={e => setFormData({...formData, target_node: e.target.value})} 
                    placeholder="pve1"
                    />
                </div>
                <div className="form-group">
                    <label>VMID (Optional for host monitoring)</label>
                    <input 
                    type="number" 
                    value={formData.target_vmid} 
                    onChange={e => setFormData({...formData, target_vmid: e.target.value})} 
                    placeholder="100"
                    />
                </div>
                </div>
            )}

            {formData.monitoring_type === 'truenas' && (
                <div className="special-fields">
                    <div className="form-group">
                        <label>API Key (Bearer Token)</label>
                        <input 
                            type="password" 
                            value={formData.api_key} 
                            onChange={e => setFormData({...formData, api_key: e.target.value})} 
                            placeholder="Created in TrueNAS Web UI"
                        />
                    </div>
                    <p className="field-hint">TrueNAS monitoring fetches Pool health and status information.</p>
                </div>
            )}

            {formData.monitoring_type === 'glances' && (
                <div className="special-fields">
                    <div className="form-group">
                        <label>Container Name (Optional)</label>
                        <input 
                            type="text" 
                            value={formData.target_container_name} 
                            onChange={e => setFormData({...formData, target_container_name: e.target.value})} 
                            placeholder="e.g. prowlarr (leave empty for host stats)"
                        />
                    </div>
                    <p className="field-hint">Glances monitoring uses the Address/URL above. Port 61208 is used by default.</p>
                </div>
            )}

            <div className="form-group checkbox">
                <label>
                <input 
                    type="checkbox" 
                    checked={formData.is_quick_access} 
                    onChange={e => setFormData({...formData, is_quick_access: e.target.checked})} 
                />
                Quick Access
                </label>
            </div>
          </div>

          <div className="test-connection-section">
              <button 
                type="button" 
                className="btn-test" 
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                  {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Test Connection
              </button>
              
              {testResult && (
                  <div className={`test-result ${testResult.status}`}>
                      {testResult.status === 'online' ? (
                          <><CheckCircle2 size={16} /> <span>Success: Connection established.</span></>
                      ) : (
                          <><XCircle size={16} /> <span>Failed: {testResult.error || 'Check configuration'}</span></>
                      )}
                      {testResult.stats && (
                          <pre className="test-stats-debug">
                              {JSON.stringify(testResult.stats, null, 2)}
                          </pre>
                      )}
                  </div>
              )}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" className="btn-save">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceFormModal;