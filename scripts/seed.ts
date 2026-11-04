import fs from "node:fs";
import path from "node:path";
import { sql, eq, or } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { user, account, registrations } from "../src/server/db/schema";
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

    // Also seed sample realistic attendees if registrations table is empty or --attendees requested
    const seedAttendeesFlag = process.argv.includes("--attendees");
    const [regCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(registrations);

    if (regCount?.count === 0 || seedAttendeesFlag) {
      const sampleAttendees = [
        { fullName: "Abebe Kebede", email: "abebe.kebede@ethiotelecom.et", phone: "+251911223344", organization: "Ethio Telecom", jobTitle: "Chief Technology Officer", attendeeType: "Company", daysAgo: 0 },
        { fullName: "Bethlehem Tilahun Alemu", email: "bethlehem@solerebels.com", phone: "+251911445566", organization: "SoleRebels", jobTitle: "Founder & CEO", attendeeType: "Company", daysAgo: 0 },
        { fullName: "Zemedeneh Negatu", email: "zemedeneh@fairfaxafrica.com", phone: "+251912334455", organization: "Fairfax Africa Fund", jobTitle: "Global Chairman", attendeeType: "Investor", daysAgo: 1 },
        { fullName: "Dr. Fitsum Assefa", email: "fitsum.assefa@mopd.gov.et", phone: "+251911556677", organization: "Ministry of Planning and Development", jobTitle: "Minister", attendeeType: "Government Institution", daysAgo: 1 },
        { fullName: "Dr. Brook Taye", email: "brook.taye@cma.gov.et", phone: "+251912667788", organization: "Capital Market Authority", jobTitle: "Director General", attendeeType: "Government Institution", daysAgo: 2 },
        { fullName: "Dr. Eyob Tekalign", email: "eyob.tekalign@mofed.gov.et", phone: "+251911778899", organization: "Ministry of Finance", jobTitle: "State Minister", attendeeType: "Government Institution", daysAgo: 2 },
        { fullName: "Maya Horgan Famodu", email: "maya@ingressivecapital.com", phone: "+251977112233", organization: "Ingressive Capital", jobTitle: "Managing Partner", attendeeType: "Investor", daysAgo: 3 },
        { fullName: "Mathewos Asfaw", email: "mathewos.a@midroc.et", phone: "+251912990011", organization: "MIDROC Investment Group", jobTitle: "VP Corporate Finance", attendeeType: "Company", daysAgo: 3 },
        { fullName: "Samuel Alemayehu", email: "samuel@cambridgeindustries.et", phone: "+251911332211", organization: "Cambridge Industries", jobTitle: "Managing Director", attendeeType: "Company", daysAgo: 4 },
        { fullName: "Hanna Lemma", email: "hanna.lemma@uneca.org", phone: "+251911882233", organization: "UN Economic Commission for Africa", jobTitle: "Senior Private Sector Officer", attendeeType: "International Partner", daysAgo: 4 },
        { fullName: "Lars Christiansen", email: "l.christiansen@eib.org", phone: "+251977443322", organization: "European Investment Bank", jobTitle: "East Africa Regional Lead", attendeeType: "International Partner", daysAgo: 5 },
        { fullName: "Daniel Lemma", email: "daniel.l@renewcapital.com", phone: "+251912445566", organization: "RENEW Capital", jobTitle: "Investment Director", attendeeType: "Investor", daysAgo: 5 },
        { fullName: "Aklilu Tadesse", email: "aklilu.t@ipdc.gov.et", phone: "+251911667799", organization: "Industrial Parks Development Corporation", jobTitle: "CEO", attendeeType: "Government Institution", daysAgo: 6 },
        { fullName: "Frehiwot Tamiru", email: "frehiwot.t@ethiotelecom.et", phone: "+251911112233", organization: "Ethio Telecom", jobTitle: "Chief Executive Officer", attendeeType: "Company", daysAgo: 8 },
        { fullName: "Henok Assefa", email: "henok@preciseethiopia.com", phone: "+251911334477", organization: "Precise Consult", jobTitle: "Managing Partner", attendeeType: "Company", daysAgo: 10 },
        { fullName: "Markus Berndt", email: "markus.berndt@kfw.de", phone: "+251977889900", organization: "KfW Development Bank", jobTitle: "Country Director", attendeeType: "International Partner", daysAgo: 12 },
        { fullName: "Kassahun Bekele", email: "kassahun.b@dashenbanksc.com", phone: "+251911889911", organization: "Dashen Bank SC", jobTitle: "VP Retail & Digital Banking", attendeeType: "Company", daysAgo: 14 },
        { fullName: "Sophia Al-Mansoor", email: "sophia@gulf-invest.ae", phone: "+251977334411", organization: "Gulf Africa Investment Partners", jobTitle: "Managing Partner", attendeeType: "Investor", daysAgo: 15 },
      ];

      let addedAttendees = 0;
      for (const a of sampleAttendees) {
        const [existing] = await db
          .select({ id: registrations.id })
          .from(registrations)
          .where(sql`lower(${registrations.email}) = ${a.email.toLowerCase()}`)
          .limit(1);

        if (!existing) {
          const refHex = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
          await db.insert(registrations).values({
            id: crypto.randomUUID(),
            fullName: a.fullName,
            email: a.email,
            phone: a.phone,
            organization: a.organization,
            jobTitle: a.jobTitle,
            attendeeType: a.attendeeType,
            attendingDays: "Nov 28, Nov 29, 2026",
            reference: `EBIF-${refHex}`,
            createdAt: new Date(Date.now() - a.daysAgo * 24 * 60 * 60 * 1000),
          });
          addedAttendees++;
        }
      }
      if (addedAttendees > 0) {
        console.log(`Seeded ${addedAttendees} sample attendee records into registrations.`);
      }
    }
  } finally {
    await closeDbContext(dbContext);
  }
}

runSeed().catch((err) => {
  console.error("Seed execution failed:", err);
  process.exit(1);
});
