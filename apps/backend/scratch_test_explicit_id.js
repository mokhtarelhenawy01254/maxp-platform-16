
const axios = require('axios');

async function main() {
  const productId = 'd8709322-0949-41e9-bad5-2409c95a25e1';
  // Try with y4 subdomain
  const url = `http://localhost:3008/api/v1/public/products/${productId}?companyId=cmmj9a5qz0000vbdwpnlkc94i`;
  
  console.log(`Fetching from: ${url}`);
  
  try {
    const response = await axios.get(url);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.response?.data || err.message);
  }
}

main().catch(console.error);
