import fs from "node:fs";
import path from "node:path";
import { sql, eq, or } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { user, account } from "../src/server/db/schema";
import { createDbContext, closeDbContext } from "../src/server/db/client";

function loadEnvFile(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

function generatePassword(length = 16): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*+=";
  const buffer = new Uint32Array(length);
  crypto.getRandomValues(buffer);
  let res = "";
  for (let i = 0; i < length; i++) {
    res += chars[buffer[i] % chars.length];
  }
  return res;
}

async function runSeed() {
  loadEnvFile();

  const resetPasswords = process.argv.includes("--reset-passwords");
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("ERROR: DATABASE_URL is not set in environment or .env file.");
    process.exit(1);
  }

  const dbContext = await createDbContext(dbUrl);
  const { db } = dbContext;

  const adminsToSeed = [
    {
      username: "admin",
      email: "admin@nexabusinessgroup.com",
    },
    {
      username: "forum.admin",
      email: "forum.admin@nexabusinessgroup.com",
    },
  ];

  const credentialsOutput: Array<{
    username: string;
    email: string;
    password: string;
    status: string;
  }> = [];

  try {
    for (const target of adminsToSeed) {
      const [existingUser] = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(
          or(
            sql`lower(${user.name}) = ${target.username.toLowerCase()}`,
            sql`lower(${user.email}) = ${target.email.toLowerCase()}`,
          ),
        )
        .limit(1);

      if (existingUser) {
        if (resetPasswords) {
          const freshPassword = generatePassword(16);
          const hashedPassword = await hashPassword(freshPassword);

          // Update password in account table
          const [existingAccount] = await db
            .select({ id: account.id })
            .from(account)
            .where(
              eq(account.userId, existingUser.id),
            )
            .limit(1);

          if (existingAccount) {
            await db
              .update(account)
              .set({
                password: hashedPassword,
                updatedAt: new Date(),
              })
              .where(eq(account.id, existingAccount.id));
          } else {
            await db.insert(account).values({
              id: crypto.randomUUID(),
              accountId: existingUser.id,
              providerId: "credential",
              userId: existingUser.id,
              password: hashedPassword,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          // Ensure active admin role
          await db
            .update(user)
            .set({
              role: "admin",
              banned: false,
              updatedAt: new Date(),
            })
            .where(eq(user.id, existingUser.id));

          credentialsOutput.push({
            username: target.username,
            email: target.email,
            password: freshPassword,
            status: "password reset",
          });
          console.log(`Updated existing admin password: ${target.email}`);
        } else {
          console.log(`Admin user already exists: ${target.email} (skipping password update)`);
        }
      } else {
        const newPassword = generatePassword(16);
        const hashedPassword = await hashPassword(newPassword);
        const newUserId = crypto.randomUUID();
        const now = new Date();

        await db.insert(user).values({
          id: newUserId,
          name: target.username,
          email: target.email,
          emailVerified: true,
          role: "admin",
          banned: false,
          createdAt: now,
          updatedAt: now,
        });

        await db.insert(account).values({
          id: crypto.randomUUID(),
          accountId: newUserId,
          providerId: "credential",
          userId: newUserId,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        });

        credentialsOutput.push({
          username: target.username,
          email: target.email,
          password: newPassword,
          status: "created",
        });
        console.log(`Created new admin: ${target.email}`);
      }
    }

    // Write credentials.md only if new users were created or passwords reset
    if (credentialsOutput.length > 0) {
      const credentialsPath = path.resolve(process.cwd(), "credentials.md");
      let md = `# EBIF Administrator Seed Credentials\n\n`;
      md += `| Username | Email | Password | Production Login | Local Login |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- |\n`;

      for (const cred of credentialsOutput) {
        md += `| \`${cred.username}\` | \`${cred.email}\` | \`${cred.password}\` | https://ebif.nexabusinessgroup.com/admin/login | http://localhost:8080/admin/login |\n`;
      }

      md += `\n> **IMPORTANT**: Change or delete these credentials after first login. This file is gitignored and must never be committed.\n`;

      fs.writeFileSync(credentialsPath, md, "utf-8");
      console.log(`Generated seed credentials written to credentials.md (gitignored).`);
    } else {
      console.log(`No credential changes made. Existing accounts were preserved.`);
    }
  } finally {
    await closeDbContext(dbContext);
  }
}

runSeed().catch((err) => {
  console.error("Seed execution failed:", err);
  process.exit(1);
});
