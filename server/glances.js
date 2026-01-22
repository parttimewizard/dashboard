const checkGlances = async (service) => {
  const { url, monitoring_url } = service;
  if (!url && !monitoring_url) return 'offline';

  let targetUrl = monitoring_url || url;
  if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'http://' + targetUrl;

  let baseUrl;
  let apiVersion = 4; // Default to v4
  let explicitVersion = false;

  try {
    const parsed = new URL(targetUrl);
    
    // Add default Glances port if missing
    if (!parsed.port) {
      parsed.port = '61208';
    }

    // Detect API version and strip path
    const apiMatch = parsed.pathname.match(/\/api\/(\d+)/);
    if (apiMatch) {
      apiVersion = parseInt(apiMatch[1]);
      explicitVersion = true;
      const apiIndex = parsed.pathname.indexOf(apiMatch[0]);
      parsed.pathname = parsed.pathname.substring(0, apiIndex);
    } else {
      // Fallback: Check for legacy /api/3 specific stripping
      const apiIndex = parsed.pathname.indexOf('/api/3');
      if (apiIndex !== -1) {
        parsed.pathname = parsed.pathname.substring(0, apiIndex);
        apiVersion = 3;
        explicitVersion = true;
      }
    }

    baseUrl = parsed.toString();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  } catch (e) {
    // Fallback if URL parsing fails
    baseUrl = targetUrl;
    if (!baseUrl.split('://')[1].includes(':')) baseUrl = baseUrl + ':61208';
  }

  // --- Container Specific Check ---
  if (service.target_container_name) {
      // ... (container logic remains similar, but using apiVersion)
      // For containers, we'll just use the detected/default version for now. 
      // If robust version fallback is needed for containers, it would be complex to wrap.
      // Assuming host check is the primary use case for "version 4" concern.
      
      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const containersRes = await fetch(`${baseUrl}/api/${apiVersion}/containers`, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!containersRes.ok) return 'offline';
          // ... rest of container logic

          const containersData = await containersRes.json();
          // The API returns { containers: [...] } or just [...] depending on version/config? 
          // User JSON showed: {"version":{},"version_podman":{},"containers":[...]}
          // But safer to check both arrays directly or nested.
          const containers = Array.isArray(containersData) ? containersData : (containersData.containers || []);
          
          const targetName = service.target_container_name.toLowerCase();
          const container = containers.find(c => 
              (c.name && c.name.toLowerCase() === targetName) || 
              (c.Names && c.Names.some(n => n.toLowerCase().includes(targetName)))
          );

          if (!container) return { status: 'offline', error: 'Container not found' };

          // Handle case differences (v3 Status vs v4 status)
          const statusStr = container.Status || container.status || '';
          const isRunning = statusStr.toLowerCase().includes('running');
          
          // Calculate Uptime
          let uptimeSeconds = 0;
          const createdStr = container.Created || container.created;
          if (createdStr) {
              const createdTime = new Date(createdStr).getTime();
              if (!isNaN(createdTime)) {
                  uptimeSeconds = Math.floor((Date.now() - createdTime) / 1000);
              }
          }

          // CPU Usage: Prefer cpu_percent (v3 standard) over cpu.total
          // User JSON showed cpu_percent: 1.807...
          const cpuVal = container.cpu_percent !== undefined ? container.cpu_percent : (container.cpu?.total || 0);

          return {
              status: isRunning ? 'online' : 'offline',
              stats: {
                  cpu: parseFloat(cpuVal).toFixed(1),
                  memory: container.memory?.usage || (container.memory_usage) || 0,
                  max_memory: container.memory?.limit || (container.memory_limit) || 0,
                  uptime: uptimeSeconds
              }
          };

      } catch (err) {
          console.error(`Glances container check error for ${service.name}:`, err);
          return 'offline';
      }
  }

  // --- Host System Check (Default) ---
  const fetchSystemData = async (version) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const [cpuRes, memRes, fsRes, sysRes] = await Promise.all([
            fetch(`${baseUrl}/api/${version}/cpu`, { signal: controller.signal }),
            fetch(`${baseUrl}/api/${version}/mem`, { signal: controller.signal }),
            fetch(`${baseUrl}/api/${version}/fs`, { signal: controller.signal }),
            fetch(`${baseUrl}/api/${version}/system`, { signal: controller.signal })
        ]);
        
        clearTimeout(timeoutId);

        if (!cpuRes.ok || !memRes.ok) {
            return { ok: false, error: `CPU: ${cpuRes.status}, MEM: ${memRes.status}` };
        }
        return { ok: true, cpuRes, memRes, fsRes, sysRes };
    } catch (e) {
        return { ok: false, error: e.message };
    }
  };

  let result = await fetchSystemData(apiVersion);

  // If failed and version wasn't explicit, try the other version (fallback)
  if (!result.ok && !explicitVersion) {
      const fallbackVersion = apiVersion === 4 ? 3 : 4;
      console.log(`[Glances] v${apiVersion} failed for ${service.name} (${result.error}). Retrying with v${fallbackVersion}...`);
      result = await fetchSystemData(fallbackVersion);
  }

  if (!result.ok) {
     console.error(`[Glances] Fetch failed for ${service.name} (${baseUrl}). Error: ${result.error}`);
     return 'offline';
  }

  try {
    const { cpuRes, memRes, fsRes, sysRes } = result;

    const safeJson = async (res, label) => {
        try {
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error(`[Glances] JSON parse error for ${service.name} (${label}):`, e.message, 'Response:', text.substring(0, 100));
                return {};
            }
        } catch (e) {
             console.error(`[Glances] Read error for ${service.name} (${label}):`, e.message);
             return {};
        }
    };

    const cpu = await safeJson(cpuRes, 'cpu');
    const mem = await safeJson(memRes, 'mem');
    const fs = fsRes.ok ? await safeJson(fsRes, 'fs') : [];
    const sys = sysRes.ok ? await safeJson(sysRes, 'sys') : {};

    // Sum up all file systems disk usage
    let diskUsed = 0;
    let diskTotal = 0;
    if (Array.isArray(fs)) {
        fs.forEach(drive => {
            diskUsed += drive.used || 0;
            diskTotal += drive.size || 0;
        });
    }

    return {
        status: 'online',
        stats: {
            cpu: (cpu.total !== undefined ? cpu.total : (parseFloat(cpu.user || 0) + parseFloat(cpu.system || 0))).toFixed(1),
            cpus: sys.nb_cpu || 0,
            memory: mem.used || 0,
            max_memory: mem.total || 0,
            disk: diskUsed,
            max_disk: diskTotal,
            uptime: sys.uptime_seconds || 0
        }
    };
  } catch (err) {
    console.error(`[Glances] Check error for ${service.name}:`, err.message);
    return 'offline';
  }
};

module.exports = { checkGlances };