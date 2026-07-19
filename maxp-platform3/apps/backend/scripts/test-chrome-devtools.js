const WebSocket = require('ws');
const http = require('http');

async function getPageInfo() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const pages = JSON.parse(data);
                resolve(pages[0]);
            });
        }).on('error', reject);
    });
}

async function testPage() {
    try {
        const page = await getPageInfo();
        console.log('📄 Page Info:');
        console.log('Title:', page.title);
        console.log('URL:', page.url);
        console.log('\n🔌 Connecting to WebSocket...\n');

        const ws = new WebSocket(page.webSocketDebuggerUrl);
        let messageId = 1;
        const results = {
            consoleErrors: [],
            jsErrors: [],
            networkErrors: [],
            performance: {},
            accessibility: []
        };

        ws.on('open', () => {
            console.log('✅ Connected to Chrome DevTools\n');

            // Enable Console
            ws.send(JSON.stringify({
                id: messageId++,
                method: 'Console.enable'
            }));

            // Enable Runtime
            ws.send(JSON.stringify({
                id: messageId++,
                method: 'Runtime.enable'
            }));

            // Enable Network
            ws.send(JSON.stringify({
                id: messageId++,
                method: 'Network.enable'
            }));

            // Enable Log
            ws.send(JSON.stringify({
                id: messageId++,
                method: 'Log.enable'
            }));

            // Get console messages
            setTimeout(() => {
                ws.send(JSON.stringify({
                    id: messageId++,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: `
              (function() {
                const errors = [];
                const warnings = [];
                
                // Check for common issues
                const issues = {
                  missingElements: [],
                  brokenImages: [],
                  emptyInputs: [],
                  hiddenErrors: []
                };
                
                // Check for broken images
                document.querySelectorAll('img').forEach(img => {
                  if (!img.complete || img.naturalHeight === 0) {
                    issues.brokenImages.push(img.src || 'No src');
                  }
                });
                
                // Check for empty required inputs
                document.querySelectorAll('input[required]').forEach(input => {
                  if (!input.value) {
                    issues.emptyInputs.push(input.name || input.id || 'unnamed');
                  }
                });
                
                // Check for elements with error classes
                document.querySelectorAll('.error, [class*="error"]').forEach(el => {
                  if (el.textContent.trim()) {
                    issues.hiddenErrors.push(el.textContent.trim());
                  }
                });
                
                return {
                  url: window.location.href,
                  title: document.title,
                  issues: issues,
                  elementCount: document.querySelectorAll('*').length,
                  scriptCount: document.querySelectorAll('script').length,
                  styleCount: document.querySelectorAll('link[rel="stylesheet"], style').length
                };
              })()
            `,
                        returnByValue: true
                    }
                }));
            }, 1000);

            // Get performance metrics
            setTimeout(() => {
                ws.send(JSON.stringify({
                    id: messageId++,
                    method: 'Performance.getMetrics'
                }));
            }, 1500);

            // Close after collecting data
            setTimeout(() => {
                ws.close();
            }, 3000);
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data);

            // Console errors
            if (message.method === 'Console.messageAdded') {
                const msg = message.params.message;
                if (msg.level === 'error') {
                    results.consoleErrors.push(msg.text);
                    console.log('❌ Console Error:', msg.text);
                } else if (msg.level === 'warning') {
                    console.log('⚠️  Console Warning:', msg.text);
                }
            }

            // Runtime errors
            if (message.method === 'Runtime.exceptionThrown') {
                const error = message.params.exceptionDetails;
                results.jsErrors.push(error.text || error.exception?.description);
                console.log('💥 JavaScript Error:', error.text || error.exception?.description);
            }

            // Network errors
            if (message.method === 'Network.loadingFailed') {
                results.networkErrors.push(message.params.errorText);
                console.log('🌐 Network Error:', message.params.errorText);
            }

            // Page evaluation result
            if (message.result && message.result.result && message.result.result.value) {
                const pageData = message.result.result.value;
                console.log('\n📊 Page Analysis:');
                console.log('━'.repeat(50));
                console.log('Total Elements:', pageData.elementCount);
                console.log('Scripts:', pageData.scriptCount);
                console.log('Stylesheets:', pageData.styleCount);
                console.log('\n🔍 Issues Found:');
                console.log('━'.repeat(50));

                if (pageData.issues.brokenImages.length > 0) {
                    console.log('\n🖼️  Broken Images:', pageData.issues.brokenImages.length);
                    pageData.issues.brokenImages.forEach(src => console.log('  -', src));
                }

                if (pageData.issues.emptyInputs.length > 0) {
                    console.log('\n📝 Empty Required Inputs:', pageData.issues.emptyInputs.length);
                    pageData.issues.emptyInputs.forEach(name => console.log('  -', name));
                }

                if (pageData.issues.hiddenErrors.length > 0) {
                    console.log('\n⚠️  Error Messages on Page:', pageData.issues.hiddenErrors.length);
                    pageData.issues.hiddenErrors.forEach(err => console.log('  -', err));
                }

                if (pageData.issues.brokenImages.length === 0 &&
                    pageData.issues.emptyInputs.length === 0 &&
                    pageData.issues.hiddenErrors.length === 0) {
                    console.log('✅ No obvious issues found!');
                }
            }

            // Performance metrics
            if (message.result && message.result.metrics) {
                console.log('\n⚡ Performance Metrics:');
                console.log('━'.repeat(50));
                message.result.metrics.forEach(metric => {
                    if (['Timestamp', 'Documents', 'Frames', 'JSHeapUsedSize', 'JSHeapTotalSize'].includes(metric.name)) {
                        let value = metric.value;
                        if (metric.name.includes('Size')) {
                            value = (value / 1024 / 1024).toFixed(2) + ' MB';
                        }
                        console.log(`${metric.name}: ${value}`);
                    }
                });
            }
        });

        ws.on('close', () => {
            console.log('\n━'.repeat(50));
            console.log('🏁 Testing Complete!');
            console.log('━'.repeat(50));
        });

        ws.on('error', (error) => {
            console.error('WebSocket Error:', error.message);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testPage();
