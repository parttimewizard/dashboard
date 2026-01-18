const checkGlances = async (service) => {
  const { url, monitoring_url } = service;
  if (!url && !monitoring_url) return 'offline';

  let baseUrl = monitoring_url || url;
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = 'http://' + baseUrl;
  if (!baseUrl.split('://')[1].includes(':')) baseUrl = baseUrl + ':61208';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const [cpuRes, memRes, fsRes, sysRes] = await Promise.all([
        fetch(`${baseUrl}/api/3/cpu`, { signal: controller.signal }),
        fetch(`${baseUrl}/api/3/mem`, { signal: controller.signal }),
        fetch(`${baseUrl}/api/3/fs`, { signal: controller.signal }),
        fetch(`${baseUrl}/api/3/system`, { signal: controller.signal })
    ]);
    
    clearTimeout(timeoutId);

    if (!cpuRes.ok || !memRes.ok) return 'offline';

    const cpu = await cpuRes.json();
    const mem = await memRes.json();
    const fs = await fsRes.json();
    const sys = await sysRes.json();

    // Sum up all file systems disk usage
    let diskUsed = 0;
    let diskTotal = 0;
    if (Array.isArray(fs)) {
        fs.forEach(drive => {
            diskUsed += drive.used;
            diskTotal += drive.size;
        });
    }

    return {
        status: 'online',
        stats: {
            cpu: cpu.total?.toFixed(1) || 0,
            cpus: sys.nb_cpu || 0,
            memory: mem.used,
            max_memory: mem.total,
            disk: diskUsed,
            max_disk: diskTotal,
            uptime: sys.uptime_seconds
        }
    };
  } catch (err) {
    return 'offline';
  }
};

module.exports = { checkGlances };