import React, { useEffect, useCallback, useState } from 'react';
import ReactFlow, { 
  useNodesState, 
  useEdgesState, 
  Background, 
  Controls, 
  Handle, 
  Position,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Server, Globe, Info, Cpu, MemoryStick, HardDrive, Activity } from 'lucide-react';
import { getIconComponent } from '../utils/icons';
import CustomEdge from './CustomEdge';
import './InfrastructureGraph.css';

const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0B';
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
};

// Custom Node Component
const ServiceNode = ({ data }) => {
  const { name, status, icon, monitoring_type, url, last_stats, category, onInfoHover, onInfoLeave, location_name } = data.service;
  const isOnline = status === 'online';
  const [showInfo, setShowInfo] = useState(false);
  
  let hostname = '';
  try {
    hostname = url ? new URL(url).hostname : '';
  } catch {
    hostname = url;
  }

  const isUrl = icon && (icon.includes('/') || icon.includes('.'));
  const Icon = !isUrl && icon ? getIconComponent(icon) : null;
  const { brand_icon } = data.service;

  const handleInfoEnter = () => {
      setShowInfo(true);
      if (onInfoHover) onInfoHover(data.service.id);
  };

  const handleInfoLeave = () => {
      setShowInfo(false);
      if (onInfoLeave) onInfoLeave(data.service.id);
  };

  return (
    <div className={`graph-node ${isOnline ? 'online' : 'offline'}`}>
      <Handle type="target" position={Position.Top} className="handle" />
      
      <div className="node-info-trigger" 
           onMouseEnter={handleInfoEnter} 
           onMouseLeave={handleInfoLeave}>
          <Info size={14} />
      </div>

      {showInfo && (
          <div className="node-floating-card">
              <div className="floating-header">
                  <strong>{name}</strong>
                  <span className="floating-cat">{category || 'Service'}</span>
              </div>
              <div className="floating-body">
                  <div className="floating-stat">
                      <Activity size={12} /> Status: <span className={isOnline ? 'text-success' : 'text-danger'}>{status}</span>
                  </div>
                  {last_stats && (
                      <>
                        {last_stats.cpu !== undefined && last_stats.cpu !== null && (
                            <div className="floating-stat"><Cpu size={12} /> CPU: {last_stats.cpu}% {last_stats.cpus ? `(${last_stats.cpus}c)` : ''}</div>
                        )}
                        {last_stats.memory && (
                            <div className="floating-stat"><MemoryStick size={12} /> RAM: {formatSize(last_stats.memory)} / {formatSize(last_stats.max_memory)}</div>
                        )}
                        {last_stats.disk && (
                            <div className="floating-stat"><HardDrive size={12} /> Disk: {formatSize(last_stats.disk)} / {formatSize(last_stats.max_disk)}</div>
                        )}
                      </>
                  )}
                  <div className="floating-type">Type: {monitoring_type}</div>
              </div>
          </div>
      )}

      <div className="node-icon">
         {brand_icon ? (
             <img src={`https://cdn.simpleicons.org/${brand_icon}`} alt="" />
         ) : (
            isUrl ? (
                <img src={icon} alt="" /> 
            ) : (
                Icon ? React.createElement(Icon, { size: 18 }) : (
                    monitoring_type === 'snmp' ? <Server size={18} /> : <Globe size={18} />
                )
            )
         )}
      </div>
      
      <div className="node-content">
        <div className="node-title">{name}</div>
        <div className="node-sub">{hostname}</div>
        {location_name && (
            <div className="node-location-badge">{location_name}</div>
        )}
      </div>
      
      <div className={`node-status ${isOnline ? 'online' : 'offline'}`}></div>
      
      <Handle type="source" position={Position.Bottom} className="handle" />
    </div>
  );
};

// Custom Location Group Node
const LocationGroupNode = ({ data }) => {
    return (
        <div className="location-group-node">
            <div className="location-label">{data.label}</div>
            <div className="location-content"></div>
        </div>
    );
};

const nodeTypes = { serviceNode: ServiceNode, locationGroup: LocationGroupNode };
const edgeTypes = { custom: CustomEdge };

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 220;
  const nodeHeight = 80;

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const InfrastructureGraph = ({ services, locations, onLink, onUnlink }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const setNodeZIndex = useCallback((id, zIndex) => {
      setNodes((nds) => 
          nds.map((node) => {
              if (node.id === id.toString()) {
                  return { ...node, zIndex };
              }
              return node;
          })
      );
  }, [setNodes]);

  // Helper to find effective location (recursive inheritance)
  const getEffectiveLocation = useCallback((service) => {
      if (service.location_id) return service.location_id;
      
      let current = service;
      const visited = new Set();
      while (current.host_id && !visited.has(current.id)) {
          visited.add(current.id);
          const parent = services.find(s => s.id === current.host_id);
          if (!parent) break;
          if (parent.location_id) return parent.location_id;
          current = parent;
      }
      return null;
  }, [services]);

  useEffect(() => {
    if (!services) return;

    const initialNodes = [];
    const initialEdges = [];

    services.forEach(s => {
      initialNodes.push({
        id: s.id.toString(),
        type: 'serviceNode',
        data: { 
            service: { 
                ...s, 
                onInfoHover: (id) => setNodeZIndex(id, 10000),
                onInfoLeave: (id) => setNodeZIndex(id, 0)
            } 
        },
        position: { x: 0, y: 0 } 
      });

      if (s.host_id) {
        initialEdges.push({
          id: `e${s.host_id}-${s.id}`,
          source: s.host_id.toString(),
          target: s.id.toString(),
          type: 'custom', 
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          data: { 
              onDelete: () => {
                  if (onUnlink) onUnlink(s.id);
              }
          }
        });
      }
    });

    // --- CLUSTER LAYOUT STRATEGY ---
    
    // 1. Identify Root Locations
    const rootLocations = locations.filter(l => !l.parent_id);
    
    // 2. Helper to find Root Location ID for a service
    const getRootLocationId = (service) => {
        const effectiveLocId = getEffectiveLocation(service);
        if (!effectiveLocId) return 'untagged';
        
        let currentLoc = locations.find(l => l.id === effectiveLocId);
        while (currentLoc && currentLoc.parent_id) {
            currentLoc = locations.find(l => l.id === currentLoc.parent_id);
        }
        return currentLoc ? currentLoc.id.toString() : 'untagged';
    };

    // 3. Group Nodes by Root Location
    const clusters = { 'untagged': [] };
    rootLocations.forEach(root => {
        clusters[root.id.toString()] = [];
    });

    initialNodes.forEach(node => {
        if (node.type === 'serviceNode') {
            const service = services.find(s => s.id.toString() === node.id);
            const rootId = getRootLocationId(service);
            if (clusters[rootId]) {
                clusters[rootId].push(node);
            } else {
                clusters['untagged'].push(node);
            }
        }
    });

    // 4. Layout Each Cluster Independently
    let finalNodes = [];
    let currentX = 0;
    const clusterSpacing = 100;

    // Process clusters (Root locations first, then untagged)
    const clusterIds = [...rootLocations.map(l => l.id.toString()), 'untagged'];

    // Helper for depth calculation
    const getLocationDepth = (locId) => {
        let depth = 0;
        let current = locations.find(l => l.id === locId);
        while (current && current.parent_id) {
            depth++;
            current = locations.find(l => l.id === current.parent_id);
        }
        return depth;
    };

    clusterIds.forEach(clusterId => {
        const clusterNodes = clusters[clusterId];
        if (!clusterNodes || clusterNodes.length === 0) return;

        // Filter edges relevant to this cluster
        const clusterEdges = initialEdges.filter(e => {
            const sourceInCluster = clusterNodes.some(n => n.id === e.source);
            const targetInCluster = clusterNodes.some(n => n.id === e.target);
            return sourceInCluster && targetInCluster;
        });

        // Run Layout for this cluster
        const { nodes: layoutedClusterNodes } = getLayoutedElements(clusterNodes, clusterEdges);

        // Calculate Cluster Dimensions
        const minX = Math.min(...layoutedClusterNodes.map(n => n.position.x));
        const maxX = Math.max(...layoutedClusterNodes.map(n => n.position.x + 220)); // nodeWidth
        const width = maxX - minX;

        // Shift nodes to global position
        const shiftedNodes = layoutedClusterNodes.map(n => ({
            ...n,
            position: {
                x: n.position.x - minX + currentX, // Normalize to 0 then shift
                y: n.position.y
            }
        }));

        finalNodes = [...finalNodes, ...shiftedNodes];
        
        // If this is a real location (not untagged), process internal sub-locations
        if (clusterId !== 'untagged') {
            // Find all locations belonging to this root tree
            const familyLocations = locations.filter(l => {
                let curr = l;
                while (curr.parent_id) {
                    curr = locations.find(p => p.id === curr.parent_id);
                }
                return curr && curr.id.toString() === clusterId;
            });

            // Sort by depth (deepest first) for correct nesting
            const sortedFamily = [...familyLocations].sort((a, b) => getLocationDepth(b.id) - getLocationDepth(a.id));

            sortedFamily.forEach(loc => {
                const locId = `loc-${loc.id}`;
                
                // Find children already in finalNodes (which are now positioned globally)
                // We check against finalNodes because they have the correct shifted positions
                const children = finalNodes.filter(n => {
                    if (n.type !== 'serviceNode' && n.type !== 'locationGroup') return false;
                    
                    // For service nodes: check effective location
                    if (n.type === 'serviceNode') {
                        const service = services.find(s => s.id.toString() === n.id);
                        return service && getEffectiveLocation(service) === loc.id;
                    }
                    
                    // For group nodes: check parent_id
                    if (n.type === 'locationGroup') {
                        const childLoc = locations.find(l => `loc-${l.id}` === n.id);
                        return childLoc && childLoc.parent_id === loc.id;
                    }
                    return false;
                });

                if (children.length > 0) {
                    const padding = 50;
                    const cMinX = Math.min(...children.map(n => n.position.x));
                    const cMinY = Math.min(...children.map(n => n.position.y));
                    
                    const cMaxX = Math.max(...children.map(n => {
                        const w = n.style?.width || 220; 
                        return n.position.x + w;
                    }));
                    const cMaxY = Math.max(...children.map(n => {
                        const h = n.style?.height || 80;
                        return n.position.y + h;
                    }));

                    const groupX = cMinX - padding;
                    const groupY = cMinY - padding - 30;
                    const groupWidth = (cMaxX - cMinX) + (padding * 2);
                    const groupHeight = (cMaxY - cMinY) + (padding * 2) + 30;

                    // Create Group Node
                    const groupNode = {
                        id: locId,
                        type: 'locationGroup',
                        data: { label: loc.name },
                        style: { width: groupWidth, height: groupHeight },
                        position: { x: groupX, y: groupY },
                        zIndex: -100 - getLocationDepth(loc.id),
                        draggable: false, // Disable dragging for location groups
                        selectable: false // Disable selection
                    };

                    finalNodes.push(groupNode);

                    // Update children relative to this group
                    children.forEach(child => {
                        const idx = finalNodes.findIndex(n => n.id === child.id);
                        if (idx !== -1) {
                            finalNodes[idx] = {
                                ...finalNodes[idx],
                                parentNode: locId,
                                position: {
                                    x: child.position.x - groupX,
                                    y: child.position.y - groupY
                                },
                                zIndex: 10
                            };
                        }
                    });
                }
            });
        }

        // Advance X for next cluster
        currentX += width + clusterSpacing;
    });

    setNodes(finalNodes);
    setEdges(initialEdges); // Use original edges, ReactFlow handles long connections
  }, [services, locations, setNodes, setEdges, onUnlink, setNodeZIndex, getEffectiveLocation]);

  const onConnect = useCallback((params) => {
    if (onLink) {
        onLink(params.target, params.source);
    }
    const newEdge = { 
        ...params, 
        type: 'custom', 
        animated: true, 
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        data: { 
            onDelete: () => {
                if (onUnlink) onUnlink(params.target);
            }
        } 
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges, onLink, onUnlink]);

  return (
    <div className="graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-right"
        deleteKeyCode={['Backspace', 'Delete']} 
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls style={{ fill: '#f8fafc', backgroundColor: '#1e293b', borderColor: '#334155' }} />
      </ReactFlow>
    </div>
  );
};

export default InfrastructureGraph;