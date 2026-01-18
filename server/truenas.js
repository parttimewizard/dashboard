const https = require('https');

const checkTrueNas = async (service) => {
  const { url, api_key, monitoring_url } = service;

  if ((!url && !monitoring_url) || !api_key) {
      return 'offline';
  }

  let baseUrl = monitoring_url || url;
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = 'http://' + baseUrl;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const headers = {
        'Authorization': `Bearer ${api_key}`,
        'Accept': 'application/json'
    };

    const [poolRes, datasetRes, sysInfoRes] = await Promise.all([
        fetch(`${baseUrl}/api/v2.0/pool`, { headers, signal: controller.signal }),
        fetch(`${baseUrl}/api/v2.0/pool/dataset`, { headers, signal: controller.signal }),
        fetch(`${baseUrl}/api/v2.0/system/info`, { headers, signal: controller.signal })
    ]);

    if (!poolRes.ok) {
        clearTimeout(timeoutId);
        return 'offline';
    }

    const pools = await poolRes.json();
    const datasets = await datasetRes.json();
    const sysInfo = sysInfoRes.ok ? await sysInfoRes.json() : null;
    
    const reportingRes = await fetch(`${baseUrl}/api/v2.0/reporting/get_data`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            graphs: [{ name: 'cpu' }, { name: 'memory' }],
            reporting_query: { start: '-10min' } 
        }),
        signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);

    let cpuUsage = null;
    let memUsed = 0;
    let memTotal = sysInfo ? sysInfo.physmem : 0;

    if (reportingRes && reportingRes.ok) {
        const reportingData = await reportingRes.json();
        
        reportingData.forEach(graph => {
            console.log(`[TrueNAS Debug] Graph: ${graph.name}, Legend: ${JSON.stringify(graph.legend)}`);
            
            if (graph.data && graph.data.length > 0) {
                // Get the last data point that isn't null
                let lastPoint = null;
                for (let i = graph.data.length - 1; i >= 0; i--) {
                    if (graph.data[i] && graph.data[i].some(v => v !== null && typeof v === 'number')) {
                        lastPoint = graph.data[i];
                        break;
                    }
                }

                if (lastPoint) {
                    // Check if the first element is a timestamp (usually it is if data length > legend length)
                    const offset = lastPoint.length > graph.legend.length ? 1 : 0;
                    
                    if (graph.name === 'cpu') {
                        const idleIdx = graph.legend.findIndex(l => l.toLowerCase().includes('idle'));
                        if (idleIdx !== -1) {
                            const idleValue = lastPoint[idleIdx + offset];
                            if (idleValue !== null && idleValue !== undefined) {
                                // Some versions return 0-1, others 0-100
                                cpuUsage = idleValue <= 1 ? ((1 - idleValue) * 100).toFixed(1) : (100 - idleValue).toFixed(1);
                            }
                        }
                    }
                    
                    if (graph.name === 'memory') {
                        // Find keys for used/active/wired (non-free memory)
                        graph.legend.forEach((label, idx) => {
                            const val = lastPoint[idx + offset];
                            if (val !== null && typeof val === 'number') {
                                const l = label.toLowerCase();
                                // We sum up everything that ISN'T free/cached/buffered to get "actual" used
                                // Or simpler: Total - Free
                                if (l === 'free' || l === 'cached' || l === 'buffered' || l === 'inactive') {
                                    // ignore
                                } else {
                                    memUsed += val;
                                }

                                if (memTotal === 0) {
                                    memTotal += val;
                                }
                            }
                        });

                        // Fallback: If we have free but used is 0, calculate from total
                        const freeIdx = graph.legend.findIndex(l => l.toLowerCase() === 'free');
                        if (freeIdx !== -1 && memUsed === 0 && memTotal > 0) {
                            memUsed = memTotal - (lastPoint[freeIdx + offset] || 0);
                        }
                    }
                }
            }
        });
    }

    const poolStats = pools.map(p => {
        const ds = datasets.find(d => d.id === p.name);
        return {
            name: p.name,
            status: p.status,
            healthy: p.status === 'ONLINE',
            used: ds ? parseInt(ds.used.parsed) : 0,
            available: ds ? parseInt(ds.available.parsed) : 0,
            total: ds ? (parseInt(ds.used.parsed) + parseInt(ds.available.parsed)) : 0
        };
    });

    // Parse uptime from sysInfo (format is usually "X days, HH:MM:SS" or similar, 
    // but the API also provides 'uptime_seconds' in some versions or we can parse 'uptime')
    let uptimeSeconds = 0;
    if (sysInfo) {
        if (sysInfo.uptime_seconds) {
            uptimeSeconds = sysInfo.uptime_seconds;
        } else if (sysInfo.uptime) {
            // Fallback: simple parse if it's a string like "2 days, 23:10:05"
            const parts = sysInfo.uptime.split(' ');
            if (parts.length > 1 && parts[1] === 'days,') {
                uptimeSeconds = parseInt(parts[0]) * 86400;
            }
        }
    }

    return {
        status: 'online',
        stats: {
            cpu: cpuUsage,
            memory: memUsed,
            max_memory: memTotal,
            uptime: uptimeSeconds,
            is_truenas: true,
            pools: poolStats
        }
    };
  } catch (err) {
    console.error(`[TrueNAS] Monitoring Error: ${err.message}`);
    return 'offline';
  }
};

module.exports = { checkTrueNas };