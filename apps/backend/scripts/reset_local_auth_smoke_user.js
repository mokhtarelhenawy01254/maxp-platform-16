const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
  quiet: true,
});

const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { PrismaClient } = require("../prisma/generated/postgresql_v2");

const DEFAULT_EMAIL = "codex.woo.legacy.259794@example.com";
const DEFAULT_FIRST_NAME = "Codex";
const DEFAULT_LAST_NAME = "Smoke";
const DEFAULT_ROLE = "OWNER";

function getArg(name) {
  const flag = `--${name}`;
  const inline = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) {
    return inline.slice(flag.length + 1);
  }

  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function printUsage() {
  console.error(
    [
      "Usage:",
      "  node scripts/reset_local_auth_smoke_user.js --password <password>",
      "",
      "Optional flags:",
      `  --email <email>           default: ${DEFAULT_EMAIL}`,
      `  --first-name <name>      default: ${DEFAULT_FIRST_NAME}`,
      `  --last-name <name>       default: ${DEFAULT_LAST_NAME}`,
      `  --role <role>            default: ${DEFAULT_ROLE}`,
      "  --company-id <id>        create the user under a specific company",
    ].join("\n"),
  );
}

async function main() {
  const password = getArg("password") || process.env.LOCAL_AUTH_SMOKE_PASSWORD;
  if (!password) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const email = getArg("email") || DEFAULT_EMAIL;
  const firstName = getArg("first-name") || DEFAULT_FIRST_NAME;
  const lastName = getArg("last-name") || DEFAULT_LAST_NAME;
  const role = getArg("role") || DEFAULT_ROLE;
  const requestedCompanyId = getArg("company-id");

  const prisma = process.env.DATABASE_URL
    ? new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      })
    : new PrismaClient();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        companyId: true,
        role: true,
      },
    });

    let companyId = requestedCompanyId;
    if (!companyId) {
      companyId = existingUser?.companyId || null;
    }

    if (!existingUser && !companyId) {
      const company = await prisma.company.findFirst({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      });

      if (!company) {
        throw new Error("No active company found to attach the local smoke user.");
      }

      companyId = company.id;
    }

    if (!companyId) {
      throw new Error("Unable to resolve companyId for the local smoke user.");
    }

    const user = existingUser
      ? await prisma.user.update({
          where: { email },
          data: {
            password: hashedPassword,
            isActive: true,
            firstName,
            lastName,
            role,
            companyId,
          },
          select: {
            email: true,
            role: true,
            companyId: true,
            isActive: true,
          },
        })
      : await prisma.user.create({
          data: {
            id: randomUUID(),
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role,
            isActive: true,
            companyId,
            updatedAt: new Date(),
          },
          select: {
            email: true,
            role: true,
            companyId: true,
            isActive: true,
          },
        });

    console.log(
      JSON.stringify(
        {
          success: true,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          isActive: user.isActive,
          action: existingUser ? "updated" : "created",
          note: "Password reset completed for local auth smoke testing.",
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Failed to reset local auth smoke user:", error.message);
  process.exit(1);
});
