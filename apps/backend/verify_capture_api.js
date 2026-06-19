const axios = require('axios');

async function verifyCapture() {
  const API_URL = 'http://localhost:3007/api/v1';
  const email = 'mokhtar@mokhtar.mokhtar';
  const password = process.env.PASSWORD || 'SuperAdmin@123';
  const templateId = 'femme-chic';
  const originCompanyId = 'cmmhkxobb0000vpk440j1n6ui'; // MaxP Platform

  try {
    console.log('--- API Verification Start ---');
    
    // 1. Login
    console.log('🔐 Logging in...');
    const loginRes = await axios.post(`${API_URL}/super-admin/login`, { email, password });
    const token = loginRes.data.data?.token || loginRes.data.token;
    
    if (!token) {
      console.error('❌ Login failed - no token received');
      return;
    }
    console.log('✅ Login successful');

    // 2. Call Capture API
    console.log(`📸 Capturing blueprint for ${templateId}...`);
    const captureRes = await axios.post(
      `${API_URL}/homepage/templates/system/${templateId}/capture-blueprint`,
      { originCompanyId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ API Response:', JSON.stringify(captureRes.data, null, 2));

  } catch (err) {
    console.error('❌ API Call Failed:', err.response?.status, err.response?.data || err.message);
  }
}

verifyCapture();
