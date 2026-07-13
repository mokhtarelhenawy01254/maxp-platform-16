const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('../prisma/generated/postgresql');

// Ensure correct prisma client usage in services
// Most services use getSharedPrismaClient, which might need to be initialized or mocked if running standalone script
// However, the services export instances that use the shared client.
// We can try to initialize the shared client first.

const sharedDatabase = require('../services/sharedDatabase');

async function debugDashboard() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const role = 'OWNER';

    console.log('🚀 Starting HR Dashboard Debug...');

    try {
        // Initialize DB connection
        await sharedDatabase.getSharedPrismaClientAsync();
        console.log('✅ Database connected');

        // Import services
        const employeeService = require('../services/hr/employeeService');
        const attendanceService = require('../services/hr/attendanceService');
        const leaveService = require('../services/hr/leaveService');
        const departmentService = require('../services/hr/departmentService');

        // 1. Test getEmployeeStats
        try {
            console.log('Testing callback: employeeService.getEmployeeStats...');
            const employeeStats = await employeeService.getEmployeeStats(companyId);
            console.log('✅ getEmployeeStats success:', JSON.stringify(employeeStats, null, 2));
        } catch (e) {
            console.error('❌ getEmployeeStats failed:', e);
        }

        // 2. Test getTodayAttendance
        try {
            console.log('Testing callback: attendanceService.getTodayAttendance...');
            const todayAttendance = await attendanceService.getTodayAttendance(companyId);
            console.log('✅ getTodayAttendance success:', JSON.stringify(todayAttendance, null, 2));
        } catch (e) {
            console.error('❌ getTodayAttendance failed:', e);
        }

        // 3. Test getLeaveRequests
        try {
            console.log('Testing callback: leaveService.getLeaveRequests...');
            const pendingLeaves = await leaveService.getLeaveRequests(companyId, { status: 'PENDING', limit: 5 });
            console.log('✅ getLeaveRequests success:', JSON.stringify(pendingLeaves, null, 2));
        } catch (e) {
            console.error('❌ getLeaveRequests failed:', e);
        }

        // 4. Test getDepartmentStats
        try {
            console.log('Testing callback: departmentService.getDepartmentStats...');
            const departmentStats = await departmentService.getDepartmentStats(companyId);
            console.log('✅ getDepartmentStats success:', JSON.stringify(departmentStats, null, 2));
        } catch (e) {
            console.error('❌ getDepartmentStats failed:', e);
        }

    } catch (error) {
        console.error('❌ General Debug Error:', error);
    } finally {
        // Cleanup
        // await prisma.$disconnect(); 
        process.exit(0);
    }
}

debugDashboard();
