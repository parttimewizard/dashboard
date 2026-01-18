import React from 'react';
import { ExternalLink, Pencil, Trash2, Activity, Server, Globe, Cpu, MemoryStick, HardDrive, Database, MapPin } from 'lucide-react';
import { getIconComponent } from '../utils/icons';
import './ServiceCard.css';

const formatUptime = (seconds) => {
    if (!seconds) return '';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0B';
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
};

const ServiceCard = ({ service, onDelete, onEdit, variant = 'standard' }) => {
  if (!service) return null;

  const { name, url, icon, brand_icon, status, id, last_stats, monitoring_type, history, location_name } = service;
  
  const isOnline = status === 'online';

  // Safe hostname extraction
  const getHostname = (link) => {
    try {
      return new URL(link).hostname;
    } catch {
      return link;
    }
  };

  const isUrl = icon && (icon.includes('/') || icon.includes('.'));
  const Icon = !isUrl && icon ? getIconComponent(icon) : null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`service-card ${variant}`}>
      <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></div>
      
      <div className="card-actions">
        <button 
            className="action-btn edit-btn" 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(service);
            }}
            title="Edit Service"
        >
            <Pencil size={14} />
        </button>
        <button 
            className="action-btn delete-btn" 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(id);
            }}
            title="Delete Service"
        >
            <Trash2 size={14} />
        </button>
      </div>

      <div className="icon-container">
        {brand_icon ? (
            <div className="brand-icon-main">
                <img src={`https://cdn.simpleicons.org/${brand_icon}`} alt="" />
                {/* Secondary badge icon if exists */}
                {Icon && (
                    <div className="icon-badge">
                        {React.createElement(Icon, { size: 14 })}
                    </div>
                )}
            </div>
        ) : (
            isUrl ? (
                <img src={icon} alt={name} />
            ) : (
                Icon ? (
                     <div className="icon-wrapper">{React.createElement(Icon, { size: 28 })}</div>
                ) : (
                    <div className="icon-placeholder">
                        {monitoring_type === 'snmp' ? <Server size={24} /> : <Globe size={24} />}
                    </div>
                )
            )
        )}
      </div>
      
      <div className="service-info">
        <h3>{name}</h3>
        {location_name && (
            <div className="location-badge" style={{display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem'}}>
                <MapPin size={10} /> {location_name}
            </div>
        )}
        <div className="service-meta">
            <span className="service-url">
                {getHostname(url)}
            </span>
            <ExternalLink size={12} className="link-icon"/>
        </div>
        
        {last_stats && (
            <div className="service-stats-container">
                {last_stats.value && (
                    <div className="stat-item">
                        <Activity size={12} />
                        <span>{last_stats.value}</span>
                    </div>
                )}
                
                {last_stats.cpu !== undefined && last_stats.cpu !== null && (
                    <div className="stat-row">
                        <div className="stat-label">
                            <Cpu size={12}/> {last_stats.cpu}%
                            {last_stats.cpus && <small className="ml-1">({last_stats.cpus}c)</small>}
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{width: `${Math.min(last_stats.cpu, 100)}%`}}></div>
                        </div>
                    </div>
                )}

                {last_stats.memory && last_stats.max_memory && (
                    <div className="stat-row">
                        <div className="stat-label">
                            <MemoryStick size={12}/> 
                            {formatSize(last_stats.memory)} / {formatSize(last_stats.max_memory)}
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{width: `${(last_stats.memory / last_stats.max_memory) * 100}%`}}></div>
                        </div>
                    </div>
                )}

                {last_stats.disk && last_stats.max_disk && (
                    <div className="stat-row">
                        <div className="stat-label">
                            <HardDrive size={12}/> 
                            {formatSize(last_stats.disk)} / {formatSize(last_stats.max_disk)}
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill disk" style={{width: `${(last_stats.disk / last_stats.max_disk) * 100}%`}}></div>
                        </div>
                    </div>
                )}

                {last_stats.is_truenas && last_stats.pools && (
                    <div className="truenas-pools">
                        <div className="pool-header"><Database size={12}/> Pools Health & Usage</div>
                        {last_stats.pools.map(p => (
                            <div key={p.name} className="pool-container">
                                <div className="pool-item">
                                    <span className={`pool-status-dot ${p.healthy ? 'healthy' : 'warning'}`}></span>
                                    <span className="pool-name">{p.name}</span>
                                    <span className="pool-usage-text">{formatSize(p.used)} / {formatSize(p.total)}</span>
                                </div>
                                {p.total > 0 && (
                                    <div className="progress-bar mini">
                                        <div className="progress-fill pool" style={{width: `${(p.used / p.total) * 100}%`}}></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                 {last_stats.uptime && (
                    <div className="uptime-badge">
                        Up: {formatUptime(last_stats.uptime)}
                    </div>
                )}
            </div>
        )}

        {history && history.length > 0 && (
            <div className="uptime-history">
                {history.slice().reverse().map((h, i) => (
                    <div 
                        key={i} 
                        className={`history-bar ${h.status || 'unknown'}`} 
                        title={`${new Date(h.created_at).toLocaleTimeString()} - ${h.status} (${h.latency || 0}ms)`}
                    />
                ))}
            </div>
        )}
      </div>
    </a>
  );
};

export default ServiceCard;