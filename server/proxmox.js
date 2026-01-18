const https = require('https');

const checkProxmox = async (service) => {
  const { url, api_key, target_node, target_vmid, monitoring_url } = service;

  if ((!url && !monitoring_url) || !api_key || !target_node) {
      return 'offline';
  }

  let baseUrl = monitoring_url || url;
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = 'https://' + baseUrl;
  if (!baseUrl.split('://')[1].includes(':')) baseUrl = baseUrl + ':8006';

  const request = (path) => {
    return new Promise((resolve, reject) => {
      const options = {
        rejectUnauthorized: false,
        headers: {
          'Authorization': `PVEAPIToken=${api_key}`,
          'Accept': 'application/json'
        }
      };

      const req = https.get(`${baseUrl}${path}`, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(data).data); } catch (e) { reject(new Error('JSON Parse Error')); }
          } else {
            reject(new Error(`API Error ${res.statusCode}`));
          }
        });
      });
      req.on('error', (err) => reject(err));
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
  };

  try {
    if (target_vmid) {
      let data = null;
      try {
        data = await request(`/api2/json/nodes/${target_node}/qemu/${target_vmid}/status/current`);
      } catch (e) {
        data = await request(`/api2/json/nodes/${target_node}/lxc/${target_vmid}/status/current`);
      }

      if (!data) return 'offline';

      return {
        status: data.status === 'running' ? 'online' : 'offline',
        stats: {
          cpu: (data.cpu * 100).toFixed(1),
          cpus: data.cpus,
          memory: data.mem,
          max_memory: data.maxmem,
          disk: data.disk,
          max_disk: data.maxdisk,
          uptime: data.uptime
        }
      };
    } else {
      const data = await request(`/api2/json/nodes/${target_node}/status`);
      
      return {
        status: 'online',
        stats: {
          cpu: (data.cpu * 100).toFixed(1),
          cpus: data.cpuinfo.cpus,
          memory: data.memory.used,
          max_memory: data.memory.total,
          disk: data.rootfs.used,
          max_disk: data.rootfs.total,
          uptime: data.uptime
        }
      };
    }
  } catch (err) {
    return 'offline';
  }
};

module.exports = { checkProxmox };
