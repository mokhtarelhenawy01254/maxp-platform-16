
const axios = require('axios');

async function testApiFlow() {
    const API_URL = 'http://localhost:3007/api/v1'; // Based on .env PORT=3007

    try {
        console.log('Step 1: Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'h2m@maxpi.com',
            password: 'Password123!'
        });

        const token = loginRes.data.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log('✅ Login successful. Token obtained.');

        console.log('\nStep 2: Fetching employees (ACTIVE)...');
        const employeesRes = await axios.get(`${API_URL}/hr/employees?limit=100&status=ACTIVE`, config);
        const employees = employeesRes.data.employees || [];
        console.log(`✅ Received ${employees.length} employees.`);
        if (employees.length > 0) {
            console.log('Sample employee:', {
                id: employees[0].id,
                name: `${employees[0].firstName} ${employees[0].lastName}`,
                status: employees[0].status
            });
        } else {
            console.warn('⚠️ No employees found! This might be why they don\'t show in the dialog.');
        }

        console.log('\nStep 3: Fetching shifts...');
        const shiftsRes = await axios.get(`${API_URL}/hr/shifts`, config);
        const shifts = shiftsRes.data.shifts || [];
        console.log(`✅ Received ${shifts.length} shifts.`);

        if (shifts.length > 0) {
            const shiftId = shifts[0].id;
            console.log(`\nStep 4: Fetching details for shift ID: ${shiftId}`);
            const shiftDetailsRes = await axios.get(`${API_URL}/hr/shifts/${shiftId}`, config);
            const assignments = shiftDetailsRes.data.shift?.assignments || [];
            console.log(`✅ Received ${assignments.length} assignments for this shift.`);

            // Check for conflict detection logic (simulated)
            const assignmentDate = new Date().toISOString().split('T')[0];
            const conflicts = assignments.filter(a => a.date.split('T')[0] === assignmentDate);
            console.log(`🔍 Current conflicts for ${assignmentDate}: ${conflicts.length}`);
        }

        console.log('\nCONCLUSION: API Flow is operational.');

    } catch (error) {
        console.error('❌ API Test Failed:', error.response?.data || error.message);
        if (error.response?.status === 404) {
            console.error('Check if the server is running on port 3007.');
        }
    }
}

testApiFlow();
