const express = require('express');
const cors = require('cors');
const { pool, initDb } = require('./db');
const { startPinger } = require('./pinger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const { checkProxmox } = require('./proxmox');
const { checkGlances } = require('./glances');
const { checkTrueNas } = require('./truenas');
const snmp = require('net-snmp');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper for pinger logic reuse in test endpoint
const pingServiceLogic = async (service) => {
  console.log(`[Test] Testing service: ${service.name} (${service.monitoring_type})`);
  if (service.monitoring_type === 'snmp') {
      return new Promise((resolve) => {
          if (!service.snmp_host || !service.snmp_oid) {
               resolve({ status: 'offline', error: 'Missing SNMP host or OID' }); 
               return;
          }
          const session = snmp.createSession(service.snmp_host, service.snmp_community || 'public', { timeout: 5000 });
          session.get([service.snmp_oid], (error, varbinds) => {
              session.close();
              if (error) resolve({ status: 'offline', error: error.message });
              else resolve({ status: 'online', stats: { value: varbinds[0].value.toString() } });
          });
      });
  }
  if (service.monitoring_type === 'proxmox') return checkProxmox(service);
  if (service.monitoring_type === 'glances') return checkGlances(service);
  if (service.monitoring_type === 'truenas') return checkTrueNas(service);
  
  // Default HTTP
  try {
      let targetUrl = service.monitoring_url || service.url;
      if (!targetUrl) return { status: 'offline', error: 'No URL provided' };
      if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'http://' + targetUrl;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      return { status: response.ok ? 'online' : 'offline', error: response.ok ? null : `HTTP Status ${response.status}` };
  } catch (err) {
      return { status: 'offline', error: err.message };
  }
};

// Test Endpoint
app.post('/api/services/test', async (req, res) => {
    try {
        const result = await pingServiceLogic(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ status: 'offline', error: err.message });
    }
});

// Initialize Database and Start Server
const startServer = async () => {
  await initDb();
  
  // Start Background Pinger
  startPinger(30000); // Check every 30 seconds

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();

app.get('/', (req, res) => {
  res.send('Dashboard API is running');
});

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// --- App Config Routes ---

app.get('/api/config', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM app_config');
        const config = {};
        result.rows.forEach(row => {
            config[row.key] = row.value;
        });
        res.json(config);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/config', async (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });
    try {
        await pool.query(
            'INSERT INTO app_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            [key, value]
        );
        res.json({ success: true, key, value });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Services Routes ---

// GET all services
app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
        COALESCE(array_agg(sg.group_id) FILTER (WHERE sg.group_id IS NOT NULL), '{}') as group_ids,
        l.name as location_name,
        COALESCE(
          (
            SELECT json_agg(h) 
            FROM (
              SELECT status, latency, created_at 
              FROM service_history 
              WHERE service_id = s.id 
              ORDER BY created_at DESC 
              LIMIT 20
            ) h
          ),
          '[]'::json
        ) as history
      FROM services s 
      LEFT JOIN service_groups sg ON s.id = sg.service_id
      LEFT JOIN locations l ON s.location_id = l.id
      GROUP BY s.id, l.name
      ORDER BY s.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all groups
app.get('/api/groups', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM groups ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Locations Routes ---

// GET all locations
app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new location
app.post('/api/locations', async (req, res) => {
  const { name, parent_id } = req.body;
  try {
    const safeParentId = parent_id === '' || parent_id === 'null' ? null : parent_id;
    const result = await pool.query(
      'INSERT INTO locations (name, parent_id) VALUES ($1, $2) RETURNING *',
      [name, safeParentId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update location
app.put('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  const { name, parent_id } = req.body;
  try {
    const safeParentId = parent_id === '' || parent_id === 'null' ? null : parent_id;
    const result = await pool.query(
      'UPDATE locations SET name = $1, parent_id = $2 WHERE id = $3 RETURNING *',
      [name, safeParentId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE location
app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json({ message: 'Location deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new group
app.post('/api/groups', async (req, res) => {
  const { name, parent_id } = req.body;
  try {
    const safeParentId = parent_id === '' || parent_id === 'null' ? null : parent_id;
    const result = await pool.query(
      'INSERT INTO groups (name, parent_id) VALUES ($1, $2) RETURNING *',
      [name, safeParentId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update group
app.put('/api/groups/:id', async (req, res) => {
  const { id } = req.params;
  const { name, parent_id } = req.body;
  try {
    const safeParentId = parent_id === '' || parent_id === 'null' ? null : parent_id;
    const result = await pool.query(
      'UPDATE groups SET name = $1, parent_id = $2 WHERE id = $3 RETURNING *',
      [name, safeParentId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE group
app.delete('/api/groups/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM groups WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new service
app.post('/api/services', async (req, res) => {
  const { name, url, icon, category, group_ids, is_quick_access, monitoring_type, snmp_host, snmp_oid, snmp_community, host_id, location_id, api_key, target_node, target_vmid, monitoring_url, brand_icon } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const safeHostId = host_id === '' || host_id === 'null' ? null : host_id;
    const safeLocationId = location_id === '' || location_id === 'null' ? null : location_id;
    const safeVmId = target_vmid === '' || target_vmid === 'null' ? null : target_vmid;

    // Insert service
    const result = await client.query(
      `INSERT INTO services 
      (name, url, icon, category, is_quick_access, monitoring_type, snmp_host, snmp_oid, snmp_community, host_id, location_id, api_key, target_node, target_vmid, monitoring_url, brand_icon) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [name, url, icon, category, is_quick_access || false, monitoring_type || 'http', snmp_host, snmp_oid, snmp_community, safeHostId, safeLocationId, api_key, target_node, safeVmId, monitoring_url, brand_icon]
    );
    const serviceId = result.rows[0].id;

    // Insert groups
    if (Array.isArray(group_ids) && group_ids.length > 0) {
        for (const gid of group_ids) {
            await client.query('INSERT INTO service_groups (service_id, group_id) VALUES ($1, $2)', [serviceId, gid]);
        }
    } else if (req.body.group_id) {
        // Fallback for legacy calls
         await client.query('INSERT INTO service_groups (service_id, group_id) VALUES ($1, $2)', [serviceId, req.body.group_id]);
    }

    await client.query('COMMIT');
    
    // Return with group_ids
    result.rows[0].group_ids = Array.isArray(group_ids) ? group_ids : (req.body.group_id ? [req.body.group_id] : []);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT update service
app.put('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  const { name, url, icon, category, group_ids, is_quick_access, monitoring_type, snmp_host, snmp_oid, snmp_community, host_id, location_id, api_key, target_node, target_vmid, monitoring_url, brand_icon } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const safeHostId = host_id === '' || host_id === 'null' ? null : host_id;
    const safeLocationId = location_id === '' || location_id === 'null' ? null : location_id;
    const safeVmId = target_vmid === '' || target_vmid === 'null' ? null : target_vmid;

    const result = await client.query(
      `UPDATE services SET 
      name = $1, url = $2, icon = $3, category = $4, is_quick_access = $5,
      monitoring_type = $6, snmp_host = $7, snmp_oid = $8, snmp_community = $9, host_id = $10, location_id = $11,
      api_key = $12, target_node = $13, target_vmid = $14, monitoring_url = $15, brand_icon = $16
      WHERE id = $17 RETURNING *`,
      [name, url, icon, category, is_quick_access, monitoring_type, snmp_host, snmp_oid, snmp_community, safeHostId, safeLocationId, api_key, target_node, safeVmId, monitoring_url, brand_icon, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Service not found' });
    }

    // Update groups
    await client.query('DELETE FROM service_groups WHERE service_id = $1', [id]);
    if (Array.isArray(group_ids) && group_ids.length > 0) {
        for (const gid of group_ids) {
            await client.query('INSERT INTO service_groups (service_id, group_id) VALUES ($1, $2)', [id, gid]);
        }
    } else if (req.body.group_id) {
         // Legacy
         await client.query('INSERT INTO service_groups (service_id, group_id) VALUES ($1, $2)', [id, req.body.group_id]);
    }

    await client.query('COMMIT');
    result.rows[0].group_ids = Array.isArray(group_ids) ? group_ids : [];
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE service
app.delete('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Backup & Restore ---

app.get('/api/backup', async (req, res) => {
    try {
        const groups = await pool.query('SELECT * FROM groups ORDER BY id');
        const services = await pool.query('SELECT * FROM services ORDER BY id');
        const serviceGroups = await pool.query('SELECT * FROM service_groups');
        const locations = await pool.query('SELECT * FROM locations ORDER BY id');
        const config = await pool.query('SELECT * FROM app_config');
        
        res.json({
            timestamp: new Date().toISOString(),
            groups: groups.rows,
            services: services.rows,
            service_groups: serviceGroups.rows,
            locations: locations.rows,
            config: config.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/restore', async (req, res) => {
    const client = await pool.connect();
    try {
        const { groups, services, service_groups, locations, config } = req.body;
        if (!Array.isArray(groups) || !Array.isArray(services)) {
             throw new Error('Invalid backup format');
        }

        await client.query('BEGIN');
        
        await client.query('DELETE FROM service_history');
        await client.query('DELETE FROM service_groups'); 
        await client.query('DELETE FROM services');
        await client.query('DELETE FROM locations'); // Clear locations
        await client.query('DELETE FROM groups');
        
        // Restore Config
        if (Array.isArray(config)) {
            for (const c of config) {
                await client.query(
                    'INSERT INTO app_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
                    [c.key, c.value]
                );
            }
        }

        // Insert Groups
        for (const g of groups) {
            await client.query(
                'INSERT INTO groups (id, name, parent_id, created_at) VALUES ($1, $2, $3, $4)',
                [g.id, g.name, g.parent_id, g.created_at]
            );
        }

        // Insert Locations
        if (Array.isArray(locations)) {
            for (const l of locations) {
                await client.query(
                    'INSERT INTO locations (id, name, parent_id, created_at) VALUES ($1, $2, $3, $4)',
                    [l.id, l.name, l.parent_id, l.created_at]
                );
            }
        }
        
        // Insert Services (Pass 1: No host_id)
        for (const s of services) {
            await client.query(
                `INSERT INTO services 
                (id, name, url, icon, category, is_quick_access, 
                 monitoring_type, snmp_host, snmp_oid, snmp_community, 
                 host_id, location_id, api_key, target_node, target_vmid, monitoring_url, brand_icon, created_at) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, $11, $12, $13, $14, $15, $16, $17)`,
                [s.id, s.name, s.url, s.icon, s.category, s.is_quick_access,
                 s.monitoring_type, s.snmp_host, s.snmp_oid, s.snmp_community,
                 s.location_id, s.api_key, s.target_node, s.target_vmid, s.monitoring_url, s.brand_icon, s.created_at]
            );
        }

        // Insert Service Groups (Migration check)
        if (Array.isArray(service_groups)) {
            for (const sg of service_groups) {
                await client.query(
                    'INSERT INTO service_groups (service_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [sg.service_id, sg.group_id]
                );
            }
        } else {
             // Fallback for old backups that have group_id in services
             for (const s of services) {
                 if (s.group_id) {
                     await client.query('INSERT INTO service_groups (service_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [s.id, s.group_id]);
                 }
             }
        }

        // Insert Services (Pass 2: Update host_id)
        for (const s of services) {
            if (s.host_id) {
                await client.query(
                    'UPDATE services SET host_id = $1 WHERE id = $2',
                    [s.host_id, s.id]
                );
            }
        }

        // Reset Sequences
        await client.query(`SELECT setval('groups_id_seq', COALESCE((SELECT MAX(id) FROM groups), 1))`);
        await client.query(`SELECT setval('locations_id_seq', COALESCE((SELECT MAX(id) FROM locations), 1))`);
        await client.query(`SELECT setval('services_id_seq', COALESCE((SELECT MAX(id) FROM services), 1))`);

        await client.query('COMMIT');
        res.json({ message: 'Restore successful' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
