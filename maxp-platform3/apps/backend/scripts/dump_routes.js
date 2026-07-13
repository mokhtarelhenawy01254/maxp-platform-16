const express = require('express');
const path = require('path');
const app = require(path.join(__dirname, '../server'));

function print(path, layer) {
    if (layer.route) {
        layer.route.stack.forEach(print.bind(null, path + (layer.route.path || '')));
    } else if (layer.name === 'router' && layer.handle.stack) {
        layer.handle.stack.forEach(print.bind(null, path + (layer.regexp.source.replace('\\/?', '').replace('(?=\\/|$)', '').replace('^', '').replace('\\', ''))));
    } else if (layer.method) {
        console.log('%s /%s', layer.method.toUpperCase(), path.split('/').filter(Boolean).join('/'));
    }
}

console.log('--- REGISTERED ROUTES ---');
app._router.stack.forEach(print.bind(null, ''));
console.log('--- END REGISTERED ROUTES ---');
process.exit(0);
