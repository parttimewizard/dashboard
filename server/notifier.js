const { pool } = require('./db');

// Cache config for a short period or fetch on every call (safer to fetch given low volume)
const getNotificationConfig = async () => {
    try {
        const result = await pool.query("SELECT * FROM app_config WHERE key IN ('ntfy_url', 'ntfy_topic', 'ntfy_token', 'ntfy_username', 'ntfy_password', 'notifications_enabled')");
        const config = {};
        result.rows.forEach(row => {
            config[row.key] = row.value;
        });
        return config;
    } catch (err) {
        console.error('Error fetching notification config:', err);
        return {};
    }
};

const sendNotification = async ({ title, message, priority = 3, tags = [], force = false }) => {
    const config = await getNotificationConfig();

    if (!force && config.notifications_enabled !== 'true') {
        return { skipped: true, reason: 'Notifications disabled' };
    }

    if (!config.ntfy_topic) {
        return { skipped: true, reason: 'Topic not configured' };
    }

    const serverUrl = config.ntfy_url || 'https://ntfy.sh';
    const url = `${serverUrl}/${config.ntfy_topic}`;

    const headers = {
        'Title': title,
        'Priority': priority.toString(),
        'Tags': tags.join(','),
    };

    if (config.ntfy_token) {
        headers['Authorization'] = `Bearer ${config.ntfy_token}`;
    } else if (config.ntfy_username) {
        const credentials = Buffer.from(`${config.ntfy_username}:${config.ntfy_password || ''}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            method: 'POST',
            body: message,
            headers: headers,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`ntfy returned ${response.status}`);
        }
        return { success: true };
    } catch (err) {
        console.error('Error sending notification:', err.message);
        return { success: false, error: err.message };
    }
};

module.exports = { sendNotification };