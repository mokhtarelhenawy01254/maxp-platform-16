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

async function capture() {
    try {
        const page = await getPageInfo();
        const ws = new WebSocket(page.webSocketDebuggerUrl);

        let id = 1;
        const send = (method, params = {}) => new Promise((resolve) => {
            const currentId = id++;
            const cb = (data) => {
                const msg = JSON.parse(data);
                if (msg.id === currentId) {
                    ws.off('message', cb);
                    resolve(msg.result);
                }
            };
            ws.on('message', cb);
            ws.send(JSON.stringify({ id: currentId, method, params }));
        });

        ws.on('open', async () => {
            await send('Page.enable');
            const screenshot = await send('Page.captureScreenshot', { format: 'png' });
            const fs = require('fs');
            fs.writeFileSync('registration_status_check.png', Buffer.from(screenshot.data, 'base64'));
            console.log('📸 Screenshot saved to registration_status_check.png');
            ws.close();
            process.exit(0);
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
capture();
