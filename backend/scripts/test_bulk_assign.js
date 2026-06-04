
const axios = require('axios');

async function testBulkAssign() {
    const API_URL = 'http://localhost:3007/api/v1';

    try {
        console.log('Step 1: Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'h2m@maxpi.com',
            password: 'Password123!'
        });

        const token = loginRes.data.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 1. Get employees
        const employeesRes = await axios.get(`${API_URL}/hr/employees?limit=5&status=ACTIVE`, config);
        const employeeIds = (employeesRes.data.employees || []).map(e => e.id);

        // 2. Get shifts
        const shiftsRes = await axios.get(`${API_URL}/hr/shifts`, config);
        const shiftId = (shiftsRes.data.shifts || [])[0]?.id;

        if (!shiftId || employeeIds.length === 0) {
            console.error('No shift or employees found to test.');
            return;
        }

        console.log(`Testing bulk assign for shift ${shiftId} and ${employeeIds.length} employees...`);

        // 3. Bulk assign
        const assignmentDate = new Date().toISOString().split('T')[0];
        const res = await axios.post(`${API_URL}/hr/shifts/bulk-assign`, {
            shiftId,
            employeeIds: employeeIds.slice(0, 1), // Just one for now
            dates: [assignmentDate]
        }, config);

        console.log('✅ Bulk Assign Response:', JSON.stringify(res.data, null, 2));

    } catch (error) {
        console.error('❌ Bulk Assign Failed:', error.response?.data || error.message);
    }
}

testBulkAssign();
