const { t: i18n } = require('./i18n');
const WebSocket = require('ws');
const http = require('http');

async function getPageInfo() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const pages = JSON.parse(data);
                const registerPage = pages.find(p => p.url.includes('register')) || pages[0];
                resolve(registerPage);
            });
        }).on('error', reject);
    });
}

async function registerCompany() {
    try {
        const page = await getPageInfo();
        console.log('🔗 Connecting to:', page.url);
        const ws = new WebSocket(page.webSocketDebuggerUrl);

        let id = 1;
        const send = (method, params = {}) => new Promise((resolve, reject) => {
            const currentId = id++;
            const cb = (data) => {
                const msg = JSON.parse(data);
                if (msg.id === currentId) {
                    ws.off('message', cb);
                    if (msg.error) reject(msg.error);
                    else resolve(msg.result);
                }
            };
            ws.on('message', cb);
            ws.send(JSON.stringify({ id: currentId, method, params }));
        });

        ws.on('open', async () => {
            console.log('✅ Connected.');
            await send('Runtime.enable');
            await send('Page.enable');
            await send('DOM.enable');

            console.log('🌐 Navigating to registration page...');
            await send('Page.navigate', { url: 'http://localhost:3000/auth/register' });
            await new Promise(r => setTimeout(r, 4000));

            const typeInto = async (selector, text) => {
                const { result } = await send('Runtime.evaluate', { expression: `document.querySelector('${selector}').getBoundingClientRect()` });
                const { x, y } = result.value || { x: 0, y: 0 };

                // Click to focus
                const focusScript = `document.querySelector('${selector}').focus()`;
                await send('Runtime.evaluate', { expression: focusScript });
                await new Promise(r => setTimeout(r, 100));

                // Clear existing text if any
                await send('Runtime.evaluate', { expression: `document.querySelector('${selector}').value = ""` });

                // Type text using Input.insertText (most reliable for React)
                for (const char of text) {
                    await send('Input.insertText', { text: char });
                    await new Promise(r => setTimeout(r, 20)); // Small delay between keys
                }

                // Trigger blur to ensure validation runs
                await send('Runtime.evaluate', { expression: `document.querySelector('${selector}').blur()` });
            };

            console.log('📝 Typing form data...');

            async function fillForm() {
                const fields = [
                    { selector: 'input[name="companyName"]', text: 'Alpha Corp', label: i18n.t('msg.b56e97a6') },
                    { selector: 'input[name="firstName"]', text: 'Alpha', label: i18n.t('msg.88ec4dcf') },
                    { selector: 'input[name="lastName"]', text: 'Admin', label: i18n.t('msg.b853405d') },
                    { selector: 'input[name="email"]', text: 'alpha.corp.test@example.com', label: i18n.t('msg.2436aacc') },
                    { selector: 'input[name="phone"]', text: '+201011223344', label: i18n.t('msg.0947ad57') },
                    { selector: 'input[name="password"]', text: 'AlphaPassword123!', label: i18n.t('msg.bcb75ee3') },
                    { selector: 'input[name="confirmPassword"]', text: 'AlphaPassword123!', label: i18n.t('msg.6a507e0a') }
                ];

                for (const field of fields) {
                    // Try to find by name, if fails try by label
                    const findScript = `
                        (function() {
                            let el = document.querySelector('${field.selector}');
                            if (!el) {
                                const labels = Array.from(document.querySelectorAll('label'));
                                const label = labels.find(l => l.innerText.includes('${field.label}'));
                                if (label && label.nextElementSibling) {
                                    el = label.nextElementSibling.querySelector('input') || label.nextElementSibling;
                                }
                            }
                            if (el && el.tagName !== 'INPUT') el = el.querySelector('input');
                            return el ? "FOUND" : "NOT_FOUND";
                        })()
                    `;
                    const findResult = await send('Runtime.evaluate', { expression: findScript });
                    if (findResult.result.value === "NOT_FOUND") {
                        console.warn(`⚠️ Field ${field.label} NOT FOUND`);
                        continue;
                    }

                    await typeInto(field.selector, field.text);
                    await new Promise(r => setTimeout(r, 200));
                }
            }

            await fillForm();

            console.log('🚀 Submitting...');
            const submitScript = `
                (function() {
                    const btn = Array.from(document.querySelectorAll('button')).find(b => 
                        b.type === 'submit' || 
                        b.innerText.includes(i18n.t('msg.cc44786b')) || 
                        b.innerText.includes('Register')
                    );
                    if (btn) {
                        if (btn.disabled) return "Button DISABLED";
                        btn.click();
                        return "Clicked SUCCESS";
                    }
                    return "Button NOT FOUND";
                })()
            `;
            const submitResult = await send('Runtime.evaluate', { expression: submitScript });
            console.log('Submit result:', submitResult.result.value);

            console.log('⏳ Waiting for navigation (10 seconds)...');
            await new Promise(r => setTimeout(r, 10000));

            const screenshot = await send('Page.captureScreenshot', { format: 'png' });
            const fs = require('fs');
            fs.writeFileSync('registration_success.png', Buffer.from(screenshot.data, 'base64'));
            console.log('📸 Screenshot saved to registration_success.png');

            ws.close();
            process.exit(0);
        });

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

registerCompany();
