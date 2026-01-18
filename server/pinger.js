const { pool } = require('./db');
const snmp = require('net-snmp');
const { checkProxmox } = require('./proxmox');
const { checkGlances } = require('./glances');
const { checkTrueNas } = require('./truenas');

const checkServices = async () => {
  try {
    const result = await pool.query('SELECT * FROM services');
    const services = result.rows;

    for (const service of services) {
      const start = Date.now();
      const result = await pingService(service);
      const latency = Date.now() - start;

      const status = typeof result === 'object' ? result.status : result;
      const stats = typeof result === 'object' ? result.stats : null;
      
      await pool.query(
          'UPDATE services SET status = $1, last_checked = NOW(), last_stats = $2 WHERE id = $3', 
          [status, stats, service.id]
      );

      // Record history
      await pool.query(
          'INSERT INTO service_history (service_id, status, latency) VALUES ($1, $2, $3)',
          [service.id, status, latency]
      );
    }
  } catch (err) {
    console.error('Error checking services:', err);
  }
};

const pingService = async (service) => {
  if (service.monitoring_type === 'snmp') {
      return checkSnmp(service);
  }
  if (service.monitoring_type === 'proxmox') {
      return checkProxmox(service);
  }
  if (service.monitoring_type === 'glances') {
      return checkGlances(service);
  }
  if (service.monitoring_type === 'truenas') {
      return checkTrueNas(service);
  }
  const targetUrl = service.monitoring_url || service.url;
  if (!targetUrl) return 'unknown';
  return checkHttp(targetUrl);
};

const checkHttp = async (url) => {
  try {
    let targetUrl = url;
    if (!/^https?:\/\//i.test(url)) {
        targetUrl = 'http://' + url;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    return response.ok ? 'online' : 'offline';
  } catch (err) {
    return 'offline';
  }
};

const checkSnmp = (service) => {
    return new Promise((resolve) => {
        if (!service.snmp_host || !service.snmp_oid) {
             resolve('offline'); 
             return;
        }
        
        const session = snmp.createSession(service.snmp_host, service.snmp_community || 'public', {
            timeout: 5000
        });
        const oids = [service.snmp_oid];

        session.get(oids, (error, varbinds) => {
            session.close();
            if (error) {
                // Fail silently/log debug
                resolve('offline');
            } else {
                if (snmp.isVarbindError(varbinds[0])) {
                    resolve('offline');
                } else {
                    resolve({ 
                        status: 'online', 
                        stats: { value: varbinds[0].value.toString() } 
                    });
                }
            }
        });
    });
};

const startPinger = (intervalMs = 60000) => {
  console.log('Starting pinger service...');
  checkServices(); // Initial check
  setInterval(checkServices, intervalMs);
};

module.exports = { startPinger };