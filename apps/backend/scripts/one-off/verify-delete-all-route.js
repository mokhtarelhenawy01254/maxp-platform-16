// Quick verification that the delete-all route is loaded
try {
  const routes = require('../../routes/whatsappRoutes');
  const stack = routes.stack || [];
  const deleteAllRoute = stack.find(r => 
    r.route && r.route.path === '/chats/delete-all'
  );
  if (deleteAllRoute) {
    console.log('OK: DELETE ALL route found');
    console.log('Path:', deleteAllRoute.route.path);
    console.log('Methods:', Object.keys(deleteAllRoute.route.methods));
  } else {
    console.log('ERROR: DELETE ALL route NOT found');
    console.log('Available chat routes:', stack.filter(r => r.route && r.route.path.includes('/chats/')).map(r => r.route.path));
  }
} catch (e) {
  console.error('Error loading routes:', e.message);
}
