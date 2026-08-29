const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const newToken = 'EAAK1VXsn5y8BSV2d8EuIgw4ITZCS1oiapIJANKtrMZA7FtgLznvSqz9QUgzv9dYLomYp3M8A1lXZCitRpeTIkdYLB4lwLrtcuZA8tPBgTRjsKFtUO1PhLGHUvlpS86zSYt5ZBw8M8zgMI0EQrGZAROPeJWZBytflIMu9g0qGXKf20Fv4ro4TQwNldJtv6ViLnFzawqp';
  
  const result = await prisma.facebookAdsConnectionSource.update({
    where: { id: 'eb889426-d724-4a80-b8dd-a157850ac22a' },
    data: { accessToken: newToken }
  });
  
  console.log('Updated token for source:', result.id, result.facebookUserName);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
