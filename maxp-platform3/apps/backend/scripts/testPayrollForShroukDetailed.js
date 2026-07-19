const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const prisma = new PrismaClient();

async function testPayroll() {
  try {
    const companyId = 'cmkvo8czx0000vbe859dddrd1'; // f22
    
    const user = await prisma.user.findFirst({
      where: { 
        email: 'shrouk0@gmail.com',
        companyId
      },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true,
        role: true,
        baseSalary: true
      }
    });
    
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('📊 User details:', {
      id: user.id,
      baseSalary: user.baseSalary,
      role: user.role
    });
    
    // إنشاء JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || 'EMPLOYEE',
        companyId: companyId,
        id: user.id // Add id field
      },
      process.env.JWT_SECRET || 'your-secret-key-here',
      { expiresIn: '1h' }
    );
    
    console.log('\n🔑 JWT token generated');
    
    // Test 1: /payroll/my-history
    console.log('\n📡 Testing GET /api/v1/hr/payroll/my-history...');
    try {
      const response = await axios.get('http://localhost:3007/api/v1/hr/payroll/my-history', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { page: 1, limit: 20, month: 1, year: 2026 }
      });
      
      console.log('✅ Status:', response.status);
      console.log('✅ Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.payrolls && response.data.payrolls.length > 0) {
        console.log('\n📊 Payroll details:');
        response.data.payrolls.forEach((p, i) => {
          console.log(`\n${i + 1}. Payroll:`);
          console.log(`   - baseSalary: ${p.baseSalary}`);
          console.log(`   - netSalary: ${p.netSalary}`);
          console.log(`   - totalDeductions: ${p.totalDeductions}`);
          console.log(`   - status: ${p.status}`);
        });
      } else {
        console.log('⚠️ No payrolls returned');
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.status, error.response?.data);
    }
    
    // Test 2: /payroll/my-projection
    console.log('\n📡 Testing GET /api/v1/hr/payroll/my-projection...');
    try {
      const response = await axios.get('http://localhost:3007/api/v1/hr/payroll/my-projection', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Status:', response.status);
      console.log('✅ Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.projection) {
        const p = response.data.projection;
        console.log('\n📊 Projection details:');
        console.log(`   - baseSalary: ${p.baseSalary} (type: ${typeof p.baseSalary})`);
        console.log(`   - netSalary: ${p.netSalary} (type: ${typeof p.netSalary})`);
        console.log(`   - grossSalary: ${p.grossSalary} (type: ${typeof p.grossSalary})`);
        console.log(`   - totalDeductions: ${p.totalDeductions} (type: ${typeof p.totalDeductions})`);
        console.log(`   - totalAllowances: ${p.totalAllowances} (type: ${typeof p.totalAllowances})`);
        console.log(`   - status: ${p.status}`);
        console.log(`   - month: ${p.month}`);
        console.log(`   - year: ${p.year}`);
        
        // Check if values are actually numbers
        console.log('\n🔍 Value checks:');
        console.log(`   - baseSalary === 0: ${p.baseSalary === 0}`);
        console.log(`   - baseSalary == 0: ${p.baseSalary == 0}`);
        console.log(`   - baseSalary > 0: ${p.baseSalary > 0}`);
        console.log(`   - parseFloat(baseSalary): ${parseFloat(p.baseSalary)}`);
      }
    } catch (error) {
      console.error('❌ Error:', error.response?.status, error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPayroll();
