const { pool } = require('./db');

const seed = async () => {
  try {
    // Check if groups exist
    const res = await pool.query('SELECT count(*) FROM groups');
    if (parseInt(res.rows[0].count) > 0) {
        console.log('Groups already exist. Skipping seed.');
        process.exit(0);
    }

    console.log('Seeding data...');
    
    // Clear services first to avoid FK constraint issues
    await pool.query('DELETE FROM services');
    await pool.query('DELETE FROM groups');

    // Create Groups
    const createGroup = async (name, parentId = null) => {
        const res = await pool.query('INSERT INTO groups (name, parent_id) VALUES ($1, $2) RETURNING id', [name, parentId]);
        return res.rows[0].id;
    };

    const infraGroup = await createGroup('Infrastructure');
    const proxmoxGroup = await createGroup('Proxmox Cluster', infraGroup);
    
    const mediaGroup = await createGroup('Media');
    const autoGroup = await createGroup('Automation');
    const adminGroup = await createGroup('Administration');

    // Services
    const services = [
      { name: 'Jellyfin', url: 'http://192.168.0.66:8096', groupId: mediaGroup, is_quick_access: true },
      { name: 'qBittorrent', url: 'http://192.168.0.66:8080', groupId: mediaGroup, is_quick_access: false },
      { name: 'Sonarr', url: 'http://192.168.0.66:8989', groupId: autoGroup, is_quick_access: true },
      { name: 'Radarr', url: 'http://192.168.0.66:7878', groupId: autoGroup, is_quick_access: true },
      { name: 'Prowlarr', url: 'http://192.168.0.66:9696', groupId: autoGroup, is_quick_access: false },
      { name: 'Portainer', url: 'http://192.168.0.70:9000', groupId: adminGroup, is_quick_access: true },
      { name: 'Pi-hole', url: 'http://192.168.0.70/admin', groupId: adminGroup, is_quick_access: false },
      // SNMP Example
      { 
        name: 'Proxmox Node 1', 
        url: 'https://192.168.0.60:8006', 
        groupId: proxmoxGroup, 
        is_quick_access: false,
        monitoring_type: 'snmp',
        snmp_host: '192.168.0.60',
        snmp_oid: '1.3.6.1.2.1.1.5.0', // sysName
        snmp_community: 'public'
      }
    ];

    for (const s of services) {
      await pool.query(
        `INSERT INTO services 
        (name, url, group_id, is_quick_access, monitoring_type, snmp_host, snmp_oid, snmp_community) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [s.name, s.url, s.groupId, s.is_quick_access, s.monitoring_type || 'http', s.snmp_host, s.snmp_oid, s.snmp_community]
      );
    }

    console.log('Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();