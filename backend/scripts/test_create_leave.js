
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function testLeaveRequest() {
    try {
        const email = 'mokhtar@mokhtar.com';
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.error('❌ User not found');
            return;
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, companyId: user.companyId, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key', // Fallback if env not loaded
            { expiresIn: '1h' }
        );

        console.log('🔍 Testing "Self-Service" Leave Request (No employeeId in body)...');

        try {
            const response = await axios.post('http://localhost:3007/api/v1/hr/leaves', {
                type: 'ANNUAL',
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                reason: 'Test from script'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('✅ Request SUCCEEDED:', response.status);
            console.log('   Leave ID:', response.data.leave.id);

            // Cleanup
            await prisma.leaveRequest.delete({ where: { id: response.data.leave.id } });
            console.log('   (Cleaned up test record)');

        } catch (apiError) {
            console.error('❌ Request FAILED:', apiError.response ? apiError.response.status : apiError.message);
            if (apiError.response) {
                console.error('   Data:', apiError.response.data);
            }
        }

    } catch (error) {
        console.error('❌ Script Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testLeaveRequest();
