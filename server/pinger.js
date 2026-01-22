const { pool } = require('./db');
const snmp = require('net-snmp');
const { checkProxmox } = require('./proxmox');
const { checkGlances } = require('./glances');
const { checkTrueNas } = require('./truenas');
const { sendNotification } = require('./notifier');

// Track alert states to avoid spamming (e.g., only alert once when threshold is crossed)
const alertStates = new Map(); // serviceId -> { memoryAlertSent: boolean, status: string }

const checkServices = async () => {
  try {
    const configResult = await pool.query("SELECT * FROM app_config WHERE key = 'memory_threshold'");
    const globalThreshold = parseInt(configResult.rows[0]?.value || '90');

    const result = await pool.query('SELECT * FROM services');
    const services = result.rows;

    for (const service of services) {
      const start = Date.now();
      const result = await pingService(service);
      const latency = Date.now() - start;

      const newStatus = typeof result === 'object' ? result.status : result;
      const stats = typeof result === 'object' ? result.stats : null;
      
      // 1. Status Change Detection & Notification
      if (service.status !== 'unknown' && service.status !== newStatus) {
          if (newStatus === 'offline') {
              await sendNotification({
                  title: `Service Down: ${service.name}`,
                  message: `${service.name} is unreachable.`,
                  priority: 5,
                  tags: ['red_circle', 'warning']
              });
          } else if (newStatus === 'online' && service.status === 'offline') {
              await sendNotification({
                  title: `Service Recovered: ${service.name}`,
                  message: `${service.name} is back online.`,
                  priority: 3,
                  tags: ['white_check_mark', 'recovery']
              });
          }
      }

      // 2. Resource Threshold Detection (Memory)
      if (stats && stats.memory && stats.max_memory) {
          const usagePercent = (stats.memory / stats.max_memory) * 100;
          const serviceState = alertStates.get(service.id) || { memoryAlertSent: false };

          if (usagePercent > globalThreshold && !serviceState.memoryAlertSent) {
              await sendNotification({
                  title: `Low Memory: ${service.name}`,
                  message: `${service.name} is using ${usagePercent.toFixed(1)}% RAM.`,
                  priority: 4, // Urgent
                  tags: ['warning', 'memory_chip']
              });
              alertStates.set(service.id, { ...serviceState, memoryAlertSent: true });
          } else if (usagePercent < (globalThreshold - 5) && serviceState.memoryAlertSent) {
              // Reset alert state when usage drops 5% below threshold (hysteresis)
              alertStates.set(service.id, { ...serviceState, memoryAlertSent: false });
          }
      }

      await pool.query(
          'UPDATE services SET status = $1, last_checked = NOW(), last_stats = $2 WHERE id = $3', 
          [newStatus, stats, service.id]
      );

      // Record history
      await pool.query(
          'INSERT INTO service_history (service_id, status, latency) VALUES ($1, $2, $3)',
          [service.id, newStatus, latency]
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