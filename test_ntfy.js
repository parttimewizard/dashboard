const { sendNotification } = require('./server/notifier');
const { pool } = require('./server/db');

// Mock the pool query to return the config directly for this test
pool.query = async (sql) => {
    if (sql.includes('app_config')) {
        return {
            rows: [
                { key: 'ntfy_url', value: 'https://ntfy.zoalab.xyz' },
                { key: 'ntfy_topic', value: 'test' },
                { key: 'ntfy_username', value: 'zak' },
                { key: 'ntfy_password', value: '3284/Zak@' },
                { key: 'notifications_enabled', value: 'true' },
                { key: 'ntfy_token', value: '' } // Ensure token is empty
            ]
        };
    }
    return { rows: [] };
};

async function test() {
    console.log("Testing notification...");
    const result = await sendNotification({
        title: 'Debug Test',
        message: 'Testing from script',
        priority: 3,
        tags: ['test']
    });
    console.log("Result:", result);
}

test();
