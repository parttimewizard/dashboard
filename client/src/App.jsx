import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, LayoutGrid, Network, Search, X, Settings, ChevronDown, ChevronRight, CircleHelp, MapPin } from 'lucide-react';
import ServiceCard from './components/ServiceCard';
import ServiceFormModal from './components/ServiceFormModal';
import GroupFormModal from './components/GroupFormModal';
import LocationFormModal from './components/LocationFormModal';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import InfrastructureGraph from './components/InfrastructureGraph';
import './components/HelpModal.css';
import './App.css';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return import.meta.env.PROD ? '' : 'http://localhost:5000';
};

const GroupSection = ({ group, onDeleteService, onEditService, onEditGroup, onDeleteGroup }) => {
  if (!group) return null;
  
  const isLegacy = typeof group.id === 'string' && group.id.startsWith('cat-');

  return (
    <section className="section group-section">
      <div className="group-header-container">
        <h2 className="group-title">{group.name}</h2>
        {!isLegacy && (
            <div className="group-actions">
                <button className="icon-btn" onClick={() => onEditGroup(group)} title="Edit Group">
                    <Pencil size={14} />
                </button>
                <button className="icon-btn delete" onClick={() => onDeleteGroup(group.id)} title="Delete Group">
                    <Trash2 size={14} />
                </button>
            </div>
        )}
      </div>
      
      {group.services.length > 0 && (
        <div className="grid">
          {group.services.map(service => (
            <ServiceCard 
                key={service.id} 
                service={service} 
                onDelete={onDeleteService} 
                onEdit={onEditService}
            />
          ))}
        </div>
      )}
      {group.subgroups.map(sub => (
        <GroupSection 
            key={sub.id} 
            group={sub} 
            onDeleteService={onDeleteService} 
            onEditService={onEditService}
            onEditGroup={onEditGroup}
            onDeleteGroup={onDeleteGroup}
        />
      ))}
    </section>
  );
};

function App() {
  const [services, setServices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('logical'); // 'logical' | 'infrastructure'
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  
  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceModalData, setServiceModalData] = useState(null);

  // Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalData, setGroupModalData] = useState(null);

  // Location Modal State
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationModalData, setLocationModalData] = useState(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isQuickAccessCollapsed, setIsQuickAccessCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  
  const [appTitle, setAppTitle] = useState('Home Server');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const filteredServices = useMemo(() => {
    if (!searchQuery) return [];
    const lower = searchQuery.toLowerCase();
    return services.filter(s => 
        s.name.toLowerCase().includes(lower) || 
        (s.url && s.url.toLowerCase().includes(lower)) ||
        (s.monitoring_url && s.monitoring_url.toLowerCase().includes(lower))
    );
  }, [services, searchQuery]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); 
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const apiUrl = getApiUrl();
      const [servicesRes, groupsRes, configRes, locationsRes] = await Promise.all([
        fetch(`${apiUrl}/api/services`).catch(() => null),
        fetch(`${apiUrl}/api/groups`).catch(() => null),
        fetch(`${apiUrl}/api/config`).catch(() => null),
        fetch(`${apiUrl}/api/locations`).catch(() => null)
      ]);
      
      let servicesData = [];
      if (servicesRes && servicesRes.ok) {
        try {
            const json = await servicesRes.json();
            if (Array.isArray(json)) servicesData = json;
        } catch (e) {
            console.error('Failed to parse services', e);
        }
      }

      let groupsData = [];
      if (groupsRes && groupsRes.ok) {
        try {
            const json = await groupsRes.json();
            if (Array.isArray(json)) groupsData = json;
        } catch (e) {
            console.error('Failed to parse groups', e);
        }
      }

      let locationsData = [];
      if (locationsRes && locationsRes.ok) {
          try {
              const json = await locationsRes.json();
              if (Array.isArray(json)) locationsData = json;
          } catch (e) {
              console.error('Failed to parse locations', e);
          }
      }

      if (configRes && configRes.ok) {
          try {
              const config = await configRes.json();
              if (config.dashboard_title) setAppTitle(config.dashboard_title);
          } catch (e) {
              console.error('Failed to parse config', e);
          }
      }

      setServices(servicesData);
      setGroups(groupsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to avoid crashes
      setServices([]);
      setGroups([]);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleSave = async () => {
      const newTitle = tempTitle.trim() || 'Home Server';
      setAppTitle(newTitle);
      setIsEditingTitle(false);
      try {
          const apiUrl = getApiUrl();
          await fetch(`${apiUrl}/api/config`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'dashboard_title', value: newTitle })
          });
      } catch (err) {
          console.error('Failed to save title', err);
      }
  };

  // --- Service Handlers ---

  const openAddService = () => {
      setServiceModalData(null);
      setIsServiceModalOpen(true);
  };

  const openEditService = (service) => {
      setServiceModalData(service);
      setIsServiceModalOpen(true);
  };

  const handleSaveService = async (formData) => {
    try {
      const apiUrl = getApiUrl();
      const method = serviceModalData ? 'PUT' : 'POST';
      const url = serviceModalData 
        ? `${apiUrl}/api/services/${serviceModalData.id}`
        : `${apiUrl}/api/services`;

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/services/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const handleLinkServices = async (childId, hostId) => {
      const childService = services.find(s => s.id === parseInt(childId));
      if (!childService) return;
      if (childId == hostId) return;

      const updatedService = { ...childService, host_id: parseInt(hostId) };
      
      const payload = {
          name: updatedService.name,
          url: updatedService.url,
          icon: updatedService.icon,
          category: updatedService.category,
          group_id: updatedService.group_id,
          is_quick_access: updatedService.is_quick_access,
          monitoring_type: updatedService.monitoring_type,
          snmp_host: updatedService.snmp_host,
          snmp_oid: updatedService.snmp_oid,
          snmp_community: updatedService.snmp_community,
          host_id: updatedService.host_id
      };

      try {
          const apiUrl = getApiUrl();
          const res = await fetch(`${apiUrl}/api/services/${childId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          if (res.ok) {
              fetchData();
          }
      } catch (err) {
          console.error("Failed to link", err);
      }
  };

  const handleUnlinkServices = async (childId) => {
      const childService = services.find(s => s.id === parseInt(childId));
      if (!childService) return;

      const updatedService = { ...childService, host_id: null };
      
      const payload = {
          name: updatedService.name,
          url: updatedService.url,
          icon: updatedService.icon,
          category: updatedService.category,
          group_id: updatedService.group_id,
          is_quick_access: updatedService.is_quick_access,
          monitoring_type: updatedService.monitoring_type,
          snmp_host: updatedService.snmp_host,
          snmp_oid: updatedService.snmp_oid,
          snmp_community: updatedService.snmp_community,
          host_id: updatedService.host_id // null
      };

      try {
          const apiUrl = getApiUrl();
          const res = await fetch(`${apiUrl}/api/services/${childId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          if (res.ok) {
              fetchData();
          }
      } catch (err) {
          console.error("Failed to unlink", err);
      }
  };

  // --- Group Handlers ---

  const openAddGroup = () => {
      setGroupModalData(null);
      setIsGroupModalOpen(true);
  };

  const openEditGroup = (group) => {
      setGroupModalData(group);
      setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (formData) => {
      try {
        const apiUrl = getApiUrl();
        const method = groupModalData ? 'PUT' : 'POST';
        const url = groupModalData 
          ? `${apiUrl}/api/groups/${groupModalData.id}`
          : `${apiUrl}/api/groups`;

        // Clean payload
        const payload = {
            ...formData,
            parent_id: formData.parent_id === '' ? null : formData.parent_id
        };
  
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
  
        if (res.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Error saving group:', error);
      }
  };

  const handleDeleteGroup = async (id) => {
      if (!window.confirm('Are you sure you want to delete this group? Sub-services will be unassigned.')) return;
      try {
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/api/groups/${id}`, { method: 'DELETE' });
        fetchData();
      } catch (error) {
        console.error('Error deleting group:', error);
      }
  };

  // --- Location Handlers ---

  const openAddLocation = () => {
      setLocationModalData(null);
      setIsLocationModalOpen(true);
  };

  const handleSaveLocation = async (formData) => {
      try {
        const apiUrl = getApiUrl();
        const method = locationModalData ? 'PUT' : 'POST';
        const url = locationModalData 
          ? `${apiUrl}/api/locations/${locationModalData.id}`
          : `${apiUrl}/api/locations`;

        // Clean payload
        const payload = {
            ...formData,
            parent_id: formData.parent_id === '' ? null : formData.parent_id
        };
  
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
  
        if (res.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Error saving location:', error);
      }
  };

  const openEditLocation = (location) => {
      setLocationModalData(location);
      setIsLocationModalOpen(true);
  };

  const handleDeleteLocation = async (id) => {
      if (!window.confirm('Are you sure you want to delete this location? Items will be unassigned.')) return;
      try {
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/api/locations/${id}`, { method: 'DELETE' });
        fetchData();
      } catch (error) {
        console.error('Error deleting location:', error);
      }
  };


  const hierarchy = useMemo(() => {
    const buildHierarchy = () => {
      const groupMap = {};
      groups.forEach(g => {
          groupMap[g.id] = { ...g, services: [], subgroups: [] };
      });
      
      const unassigned = [];
      services.forEach(s => {
          // Check if service has group_ids array (new format) or single group_id (legacy)
          let gids = s.group_ids || [];
          if (s.group_id && !gids.includes(s.group_id)) {
              gids = [...gids, s.group_id];
          }

          if (gids.length > 0) {
              let assignedToAtLeastOne = false;
              gids.forEach(gid => {
                  if (groupMap[gid]) {
                      groupMap[gid].services.push(s);
                      assignedToAtLeastOne = true;
                  }
              });
              if (!assignedToAtLeastOne) unassigned.push(s);
          } else {
              unassigned.push(s);
          }
      });

      const rootGroups = [];
      Object.values(groupMap).forEach(g => {
          if (g.parent_id && groupMap[g.parent_id]) {
              groupMap[g.parent_id].subgroups.push(g);
          } else {
              rootGroups.push(g);
          }
      });
      
      rootGroups.sort((a,b) => a.id - b.id);

      if (unassigned.length > 0) {
          const legacyCats = {};
          unassigned.forEach(s => {
              const cat = s.category || 'Unassigned';
              if (!legacyCats[cat]) legacyCats[cat] = [];
              legacyCats[cat].push(s);
          });
          
          Object.entries(legacyCats).forEach(([name, items]) => {
              rootGroups.push({ id: `cat-${name}`, name, services: items, subgroups: [] });
          });
      }

      return rootGroups;
    };
    return buildHierarchy();
  }, [groups, services]);
  const quickAccess = services.filter(s => s.is_quick_access);
  
  // Logic to determine what to show in main content
  const activeGroupId = selectedGroupId; 
  const activeLocationId = selectedLocationId;

  const activeGroup = hierarchy.find(g => g.id === activeGroupId);
  const activeLocation = locations.find(l => l.id === activeLocationId);

  // Helper to find all services in a location (including sub-locations)
  const getServicesInLocation = (locId) => {
      const locationIds = [locId];
      // Find children
      const children = locations.filter(l => l.parent_id === locId);
      children.forEach(c => locationIds.push(c.id));
      
      // Simple 1-level depth check for now, can be recursive if needed
      return services.filter(s => {
          // Check explicit location
          if (s.location_id && locationIds.includes(s.location_id)) return true;
          // Check inheritance (Host)
          if (s.host_id) {
              const host = services.find(h => h.id === s.host_id);
              if (host && host.location_id && locationIds.includes(host.location_id)) return true;
          }
          return false;
      });
  };

  const locationServices = activeLocation ? getServicesInLocation(activeLocation.id) : [];

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          {isEditingTitle ? (
             <div className="title-edit-wrapper">
                 <input 
                    type="text" 
                    value={tempTitle} 
                    onChange={e => setTempTitle(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') handleTitleSave();
                        if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    autoFocus
                    className="title-input"
                 />
                 <button className="icon-btn" onClick={handleTitleSave}><Pencil size={14}/></button>
             </div>
          ) : (
             <div className="title-wrapper group-header-container" style={{marginBottom: 0}}>
                <h1 onClick={() => { setTempTitle(appTitle); setIsEditingTitle(true); }}>{appTitle}</h1>
                <button 
                    className="icon-btn edit-title-btn" 
                    onClick={() => { setTempTitle(appTitle); setIsEditingTitle(true); }}
                    title="Edit Title"
                >
                    <Pencil size={14} />
                </button>
             </div>
          )}
          <div className="clock">{new Date().toLocaleTimeString()}</div>
        </div>
        
        <div className="header-actions">
            <div className="search-bar">
                <Search size={16} className="search-icon" />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button className="clear-btn" onClick={() => setSearchQuery('')}>
                        <X size={14} />
                    </button>
                )}
            </div>

             <div className="view-toggle">
                <button 
                    className={`toggle-btn ${viewMode === 'logical' ? 'active' : ''}`}
                    onClick={() => setViewMode('logical')}
                    title="Logical View"
                >
                    <LayoutGrid size={18} />
                </button>
                <button 
                    className={`toggle-btn ${viewMode === 'infrastructure' ? 'active' : ''}`}
                    onClick={() => setViewMode('infrastructure')}
                    title="Infrastructure View"
                >
                    <Network size={18} />
                </button>
            </div>

            <button className="btn-add" onClick={openAddService}>
                <Plus size={18} /> Add Item
            </button>
            <button className="icon-btn" onClick={() => setIsSettingsOpen(true)} title="Settings">
                <Settings size={20} />
            </button>
            <button className="icon-btn" onClick={() => setIsHelpOpen(true)} title="Help & Integration Guide">
                <CircleHelp size={20} />
            </button>
        </div>
      </header>

      <ServiceFormModal 
        key={serviceModalData ? `service-${serviceModalData.id}` : (isServiceModalOpen ? 'service-new' : 'service-closed')}
        isOpen={isServiceModalOpen} 
        onClose={() => setIsServiceModalOpen(false)} 
        onSave={handleSaveService}
        groups={groups}
        locations={locations}
        services={services}
        initialData={serviceModalData}
      />

      <GroupFormModal
        key={groupModalData ? `group-${groupModalData.id}` : (isGroupModalOpen ? 'group-new' : 'group-closed')}
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onSave={handleSaveGroup}
        groups={groups}
        initialData={groupModalData}
      />

      <LocationFormModal
        key={locationModalData ? `loc-${locationModalData.id}` : (isLocationModalOpen ? 'loc-new' : 'loc-closed')}
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSave={handleSaveLocation}
        locations={locations}
        initialData={locationModalData}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onRestoreSuccess={fetchData}
      />

      <HelpModal 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {viewMode === 'logical' && (
        <div className="logical-view-container">
            {searchQuery ? (
                <div className="main-content">
                    <section className="section">
                        <h2>Search Results ({filteredServices.length})</h2>
                        {filteredServices.length > 0 ? (
                            <div className="grid">
                                {filteredServices.map(service => (
                                    <ServiceCard 
                                        key={service.id} 
                                        service={service} 
                                        onDelete={handleDeleteService}
                                        onEdit={openEditService}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{color: 'var(--text-secondary)', marginTop: '2rem'}}>
                                No services found matching "{searchQuery}"
                            </div>
                        )}
                    </section>
                </div>
            ) : (
            <>
            <div className="main-content">
                {quickAccess.length > 0 && (
                    <section className="section">
                    <h2 
                        onClick={() => setIsQuickAccessCollapsed(!isQuickAccessCollapsed)} 
                        style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'}}
                    >
                        {isQuickAccessCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                        Quick Access
                        {isQuickAccessCollapsed && <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal'}}>({quickAccess.length})</span>}
                    </h2>
                    {!isQuickAccessCollapsed && (
                        <div className="grid">
                            {quickAccess.map(service => (
                            <ServiceCard 
                                key={service.id} 
                                service={service} 
                                onDelete={handleDeleteService}
                                onEdit={openEditService}
                                variant="compact"
                            />
                            ))}
                        </div>
                    )}
                    </section>
                )}

                {/* Show Group Content */}
                {!activeLocation && activeGroup && (
                    <GroupSection 
                        key={activeGroup.id} 
                        group={activeGroup} 
                        onDeleteService={handleDeleteService}
                        onEditService={openEditService}
                        onEditGroup={openEditGroup}
                        onDeleteGroup={handleDeleteGroup}
                    />
                )}

                {/* Show Location Content */}
                {activeLocation && (
                    <section className="section">
                        <div className="group-header-container">
                            <h2 className="group-title">Location: {activeLocation.name}</h2>
                            <div className="group-actions">
                                <button className="icon-btn" onClick={() => openEditLocation(activeLocation)} title="Edit Location">
                                    <Pencil size={14} />
                                </button>
                                <button className="icon-btn delete" onClick={() => handleDeleteLocation(activeLocation.id)} title="Delete Location">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="grid">
                            {locationServices.length > 0 ? locationServices.map(service => (
                                <ServiceCard 
                                    key={service.id} 
                                    service={service} 
                                    onDelete={handleDeleteService}
                                    onEdit={openEditService}
                                />
                            )) : (
                                <div style={{color: 'var(--text-secondary)'}}>No items in this location.</div>
                            )}
                        </div>
                    </section>
                )}

                {/* Show "Empty" state only if neither Group nor Location is active */}
                {!activeGroup && !activeLocation && hierarchy.length === 0 && (
                    <div style={{textAlign: 'center', color: 'var(--text-secondary)', marginTop: '4rem'}}>
                        No groups found. Create a group to get started.
                    </div>
                )}
            </div>
            
            <aside className="group-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-title">Groups</div>
                    <button className="sidebar-add-btn" onClick={openAddGroup} title="Add Group">
                        <Plus size={14} />
                    </button>
                </div>
                {hierarchy.map(group => (
                    <div key={group.id} className="sidebar-item-container" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <button
                            className={`sidebar-item ${group.id === activeGroupId && !activeLocation ? 'active' : ''}`}
                            onClick={() => { setSelectedGroupId(group.id); setSelectedLocationId(null); }}
                            style={{flex: 1, margin: 0}}
                        >
                            {group.name}
                        </button>
                        {/* Only show actions for non-legacy groups (numeric IDs) */}
                        {typeof group.id === 'number' && (
                            <div className="sidebar-actions" style={{display: 'flex', gap: '0.25rem', paddingRight: '0.5rem'}}>
                                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); openEditGroup(group); }} title="Edit Group">
                                    <Pencil size={12} />
                                </button>
                                <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} title="Delete Group">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {hierarchy.length === 0 && (
                    <div style={{padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                        No groups
                    </div>
                )}

                <div className="sidebar-separator"></div>

                <div className="sidebar-header">
                    <div className="sidebar-title">Locations</div>
                    <button className="sidebar-add-btn" onClick={openAddLocation} title="Add Location">
                        <Plus size={14} />
                    </button>
                </div>
                {locations.map(loc => (
                    <div key={loc.id} className="sidebar-item-container" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <button
                            className={`sidebar-item ${loc.id === activeLocationId ? 'active' : ''}`}
                            onClick={() => { setSelectedLocationId(loc.id); setSelectedGroupId(null); }}
                            style={{flex: 1, margin: 0}}
                        >
                            {loc.name}
                        </button>
                        <div className="sidebar-actions" style={{display: 'flex', gap: '0.25rem', paddingRight: '0.5rem'}}>
                            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); openEditLocation(loc); }} title="Edit Location">
                                <Pencil size={12} />
                            </button>
                            <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id); }} title="Delete Location">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                ))}
                {locations.length === 0 && (
                    <div style={{padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                        No locations
                    </div>
                )}
            </aside>
            </>
            )}
        </div>
      )}

      {viewMode === 'infrastructure' && (
         <section className="section">
             <h2>Infrastructure Topology</h2>
             <InfrastructureGraph 
                 services={services} 
                 locations={locations}
                 onLink={handleLinkServices}
                 onUnlink={handleUnlinkServices}
             />
         </section>
      )}
    </div>
  );
}

export default App;