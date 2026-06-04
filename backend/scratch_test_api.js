
const axios = require('axios');

async function main() {
  const productId = 'cmnaax1c40001vbxwmrzrla2g';
  const companyId = 'cmmj9a5qz0000vbdwpnlkc94i';
  const url = `http://localhost:3008/api/v1/public/products/${productId}?companyId=${companyId}`;
  
  console.log(`Fetching from: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'x-company-id': companyId
      }
    });
    
    console.log('Response Success:', response.data.success);
    if (response.data.success) {
        console.log('Product images:', response.data.data.images);
        console.log('Product main image:', response.data.data.mainImage);
    } else {
        console.log('Response error:', response.data.error);
    }
  } catch (err) {
    console.error('Fetch error:', err.response?.data || err.message);
  }
}

main().catch(console.error);
