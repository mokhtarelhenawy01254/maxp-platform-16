const axios = require('axios');

const LOGIN_URL = 'http://localhost:3007/api/v1/auth/login'; // or /user/login
const DASHBOARD_URL = 'http://localhost:3007/api/v1/super-admin/dev/dashboard';
const TASK_ID = 'cmjsjm4ds003nuqmcl0fmhajf';
const COMMENT_URL = `http://localhost:3007/api/v1/super-admin/dev/tasks/${TASK_ID}/comments`;

async function runTest() {
    try {
        // 1. LOGIN
        console.log('🔐 1. Logging in...');
        let token;
        try {
            const loginRes = await axios.post(LOGIN_URL, {
                email: 'superadmin@system.com',
                password: 'SuperAdmin123!'
            });
            token = loginRes.data.token || loginRes.data.accessToken || loginRes.data.data.token;
            console.log('✅ Login Successful!');
        } catch (e) {
            // Try alternate login route if first fails
            console.log('   (Retrying login on /api/v1/users/login...)');
            const loginRes2 = await axios.post('http://localhost:3007/api/v1/users/login', {
                email: 'superadmin@system.com',
                password: 'SuperAdmin123!'
            });
            token = loginRes2.data.token || loginRes2.data.accessToken || loginRes2.data.data.token;
            console.log('✅ Login Successful on alternate route!');
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 2. DASHBOARD
        console.log('\n📊 2. Fetching Dashboard...');
        const dashRes = await axios.get(DASHBOARD_URL, { headers });
        if (dashRes.data.data && dashRes.data.data.overview) {
            console.log('✅ Dashboard Data OK:', dashRes.data.data.overview);
        } else {
            console.error('❌ Dashboard Data Invalid:', JSON.stringify(dashRes.data, null, 2));
        }

        // 3. TASK DETAILS
        console.log(`\n📝 3. Fetching Task ${TASK_ID}...`);
        const taskRes = await axios.get(`http://localhost:3007/api/v1/super-admin/dev/tasks/${TASK_ID}`, { headers });
        console.log('✅ Task Fetched:', taskRes.data.data.title);

        // 4. ADD COMMENT
        console.log('\n💬 4. Adding Test Comment...');
        const commentRes = await axios.post(COMMENT_URL, {
            content: '🤖 Automated Test Comment (Checking 403 Fix)'
        }, { headers });

        if (commentRes.status === 201) {
            console.log('✅ Comment Added Successfully!');
            console.log('   Response:', commentRes.data.data.content);
        } else {
            console.error('❌ Comment Failed:', commentRes.status, commentRes.data);
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ Test Failed:', error.response.status, error.response.data);
        } else {
            console.error('❌ Test Script Error:', error.message);
        }
    }
}

runTest();
