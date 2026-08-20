const fs = require('fs');

function resolveMyAttendance() {
  const file = 'apps/frontend/src/pages/employee/MyAttendance.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<<<<<<< Updated upstream\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> Stashed changes/, '$1');
  fs.writeFileSync(file, content);
  console.log('Fixed MyAttendance');
}

function resolveReturnSettings() {
  const file = 'apps/frontend/src/pages/returns/ReturnSettingsPage.tsx';
  let content = fs.readFileSync(file, 'utf8');
  // Both blocks contain valuable functions (`openTypeModal` in upstream, `deleteCategory` in stashed).
  // We'll just concatenate them.
  content = content.replace(/<<<<<<< Updated upstream\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> Stashed changes/g, '$1\n$2');
  fs.writeFileSync(file, content);
  console.log('Fixed ReturnSettingsPage');
}

resolveMyAttendance();
resolveReturnSettings();
