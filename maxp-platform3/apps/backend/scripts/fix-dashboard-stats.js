const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('../prisma/generated/postgresql');

// Manually verify environment variables
if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL is missing from .env');
    process.exit(1);
}

// Initialize Prisma with the explicit datasource url
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.POSTGRES_URL,
        },
    },
});

async function fixUserData() {
    try {
        console.log('🚀 Starting fix for user data...');

        // User configuration
        const userEmail = 'shrouk9@gmail.com';
        const companyId = 'cmlcatkmn0000vb70t1k03jpd';

        // 1. Find the user
        const user = await prisma.user.findFirst({
            where: { email: userEmail, companyId }
        });

        if (!user) {
            console.error(`❌ User ${userEmail} not found in company ${companyId}`);
            // Fallback: search by email only
            const userByEmail = await prisma.user.findFirst({ where: { email: userEmail } });
            if (userByEmail) {
                console.log(`⚠️ User found but companyId mismatch. Found companyId: ${userByEmail.companyId}`);
            }
            return;
        }

        console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);

        // 2. Update User to be an Employee
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                employeeNumber: 'EMP00001',
                hireDate: new Date('2026-01-01'),
                isActive: true,
                contractType: 'FULL_TIME',
                departmentId: null, // Ensure valid or null
                positionId: null  // Ensure valid or null
            }
        });

        console.log('✅ User updated successfully with employeeNumber: EMP00001');

        // 3. Create Demo Attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Local midnight approximation or UTC depending on server

        // Check existing
        const existingAttendance = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId: user.id,
                    date: today
                }
            }
        });

        if (!existingAttendance) {
            const checkInTime = new Date();
            checkInTime.setHours(9, 0, 0, 0);

            await prisma.attendance.create({
                data: {
                    id: `demo-att-${Date.now()}`,
                    companyId: companyId,
                    userId: user.id,
                    date: today,
                    checkIn: checkInTime,
                    status: 'PRESENT',
                    checkInMethod: 'manual',
                    lateMinutes: 0
                }
            });
            console.log('✅ Created demo attendance for today.');
        } else {
            console.log('ℹ️ Attendance already exists for today.');
        }

    } catch (error) {
        console.error('❌ Error fixing data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixUserData();
