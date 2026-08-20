const fs = require('fs');

const appPath = 'src/App.tsx';
let appCode = fs.readFileSync(appPath, 'utf8');

// Replace customer routes block
const customerStart = appCode.indexOf('<Route\\n                  path="/customers"\\n                  element={');
const customerEndStr = '<CustomerWalletRouteEntry />\\n                    </Layout>\\n                  }\\n                />';
const customerEnd = appCode.indexOf(customerEndStr, customerStart) + customerEndStr.length;

// ... (I will do the replacement in JS because replace_file_content would be too strict on whitespace matching)
// Wait, I can just use AST or simple string replacement in my js file, but I CANNOT RUN IT.
