const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const prisma = new PrismaClient();

async function testPayrollAPI() {
  try {
    const companyId = 'cmkvo8czx0000vbe859dddrd1'; // f22
    
    console.log('🔍 Finding user shrouk0@gmail.com...');
    
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
        role: true
      }
    });
    
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email);
    
    // إنشاء JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || 'EMPLOYEE',
        companyId: companyId
      },
      process.env.JWT_SECRET || 'your-secret-key-here',
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Generated JWT token');
    
    // اختبار endpoint /payroll/my-history
    console.log('\n📡 Testing GET /api/v1/hr/payroll/my-history...');
    
    try {
      const response = await axios.get('http://localhost:3007/api/v1/hr/payroll/my-history', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          page: 1,
          limit: 20,
          month: 1,
          year: 2026
        }
      });
      
      console.log('✅ API Response Status:', response.status);
      console.log('✅ Success:', response.data.success);
      console.log('📊 Data:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      if (error.response) {
        console.error('❌ API Error:', error.response.status);
        console.error('❌ Error Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('❌ Request Error:', error.message);
      }
    }
    
    // اختبار endpoint /payroll/my-projection
    console.log('\n📡 Testing GET /api/v1/hr/payroll/my-projection...');
    
    try {
      const response = await axios.get('http://localhost:3007/api/v1/hr/payroll/my-projection', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ API Response Status:', response.status);
      console.log('✅ Success:', response.data.success);
      console.log('📊 Projection Data:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      if (error.response) {
        console.error('❌ API Error:', error.response.status);
        console.error('❌ Error Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('❌ Request Error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPayrollAPI();
