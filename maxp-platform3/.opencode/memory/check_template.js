const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.aiAgentTemplate.findFirst({ where: { slug: 'social-media-image-agent' }, select: { slug: true, modelPolicy: true } }).then(r => { console.log(JSON.stringify(r, null, 2)); p.$disconnect(); });
