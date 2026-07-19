const axios = require('axios');

const api = axios.create({
  baseURL: 'https://maxp.online/api/v1',
  headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWxleWJwZzIwMDJianVvMm00NHk0a2lwIiwiZW1haWwiOiJzd2FuQGgybS5jb20iLCJyb2xlIjoiT1dORVIiLCJjb21wYW55SWQiOiJjbWxleWJwZjcwMDI4anVvMnd3cG1wOHJ0IiwiaWF0IjoxNzgzNTg3MDU1LCJleHAiOjE3ODM2MTU4NTV9.6ANYUx0uUpRs4lk_T8XWWtB1L9H1RBVmA7zZscymSOg', 'Content-Type': 'application/json' },
  timeout: 30000
});

async function main() {
  const res = await api.get('/returns/requests', { params: { page: 1, limit: 500 } });
  console.log('Response keys:', Object.keys(res.data));
  console.log('Total:', res.data?.total, 'Count:', res.data?.data?.length);
  console.log('Headers total:', res.headers['x-total-count'] || 'none');

  // Try approving by ID
  const item = res.data.data[0];
  console.log('\nItem:', JSON.stringify({ id: item.id, status: item.status, order: item.order?.orderNumber }));

  try {
    const approveRes = await api.put('/returns/requests/' + item.id, { status: 'APPROVED', isReviewed: true });
    console.log('Approve success:', approveRes.status, approveRes.data?.message);
  } catch (err) {
    console.error('Approve failed:', err.response?.status, JSON.stringify(err.response?.data), err.message);
  }
}

main().catch(console.error);
