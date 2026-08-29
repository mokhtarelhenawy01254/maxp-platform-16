const axios = require("axios");
const { getSharedPrismaClient } = require("../services/sharedDatabase");
const { getMetaGraphApiBaseUrl } = require("../config/metaApi");

async function resolveFacebookUser(accessToken) {
  const url = `${getMetaGraphApiBaseUrl()}/me`;
  const response = await axios.get(url, {
    params: { access_token: accessToken, fields: "id,name,email" },
    timeout: 8000,
  });
  return {
    id: response.data?.id || null,
    name: response.data?.name || null,
    email: response.data?.email || null,
  };
}

async function main() {
  const prisma = getSharedPrismaClient();

  const companies = await prisma.company.findMany({
    where: { facebookUserAccessToken: { not: null } },
    select: { id: true, name: true, facebookUserAccessToken: true },
  });

  let createdConnections = 0;
  let linkedPages = 0;

  for (const company of companies) {
    const token = company.facebookUserAccessToken;

    let user = null;
    try {
      user = await resolveFacebookUser(token);
    } catch (error) {
      console.warn(
        `⚠️ [BACKFILL] Could not resolve FB user for company ${company.id}: ${error.message}`,
      );
    }

    const facebookUserId = user?.id || `legacy:${company.id}`;

    const connection = await prisma.facebookAccountConnection.upsert({
      where: {
        companyId_facebookUserId: {
          companyId: company.id,
          facebookUserId,
        },
      },
      update: {
        accessToken: token,
        facebookUserName: user?.name || undefined,
        facebookUserEmail: user?.email || undefined,
        status: "connected",
        updatedAt: new Date(),
      },
      create: {
        companyId: company.id,
        facebookUserId,
        facebookUserName: user?.name || null,
        facebookUserEmail: user?.email || null,
        accessToken: token,
        status: "connected",
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    createdConnections++;

    const linked = await prisma.facebookPage.updateMany({
      where: { companyId: company.id, facebookAccountId: null },
      data: { facebookAccountId: connection.id },
    });
    linkedPages += linked.count;

    console.log(
      `✅ [BACKFILL] Company ${company.id} (${company.name}): connection ${connection.id}${user?.id ? "" : " (synthetic)"}, linked ${linked.count} pages`,
    );
  }

  console.log(
    `🎉 [BACKFILL] Done: ${createdConnections} connections, ${linkedPages} linked pages`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ [BACKFILL] Failed:", error);
  process.exit(1);
});
