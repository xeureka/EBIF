import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { createDbContext, closeDbContext } from "../src/server/db/client";
import { registrations } from "../src/server/db/schema";

function loadEnv(): string {
  const envPath = path.resolve(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      return trimmed.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("No DATABASE_URL in .env");
}

const ATTENDEES_DATA = [
  {
    fullName: "Abebe Kebede",
    email: "abebe.kebede@ethiotelecom.et",
    phone: "+251911223344",
    organization: "Ethio Telecom",
    jobTitle: "Chief Technology Officer",
    attendeeType: "Company",
    daysAgo: 0, // Today
  },
  {
    fullName: "Bethlehem Tilahun Alemu",
    email: "bethlehem@solerebels.com",
    phone: "+251911445566",
    organization: "SoleRebels",
    jobTitle: "Founder & CEO",
    attendeeType: "Company",
    daysAgo: 0, // Today
  },
  {
    fullName: "Zemedeneh Negatu",
    email: "zemedeneh@fairfaxafrica.com",
    phone: "+251912334455",
    organization: "Fairfax Africa Fund",
    jobTitle: "Global Chairman",
    attendeeType: "Investor",
    daysAgo: 1,
  },
  {
    fullName: "Dr. Fitsum Assefa",
    email: "fitsum.assefa@mopd.gov.et",
    phone: "+251911556677",
    organization: "Ministry of Planning and Development",
    jobTitle: "Minister",
    attendeeType: "Government Institution",
    daysAgo: 1,
  },
  {
    fullName: "Dr. Brook Taye",
    email: "brook.taye@cma.gov.et",
    phone: "+251912667788",
    organization: "Capital Market Authority",
    jobTitle: "Director General",
    attendeeType: "Government Institution",
    daysAgo: 2,
  },
  {
    fullName: "Dr. Eyob Tekalign",
    email: "eyob.tekalign@mofed.gov.et",
    phone: "+251911778899",
    organization: "Ministry of Finance",
    jobTitle: "State Minister",
    attendeeType: "Government Institution",
    daysAgo: 2,
  },
  {
    fullName: "Maya Horgan Famodu",
    email: "maya@ingressivecapital.com",
    phone: "+251977112233",
    organization: "Ingressive Capital",
    jobTitle: "Managing Partner",
    attendeeType: "Investor",
    daysAgo: 3,
  },
  {
    fullName: "Mathewos Asfaw",
    email: "mathewos.a@midroc.et",
    phone: "+251912990011",
    organization: "MIDROC Investment Group",
    jobTitle: "VP Corporate Finance",
    attendeeType: "Company",
    daysAgo: 3,
  },
  {
    fullName: "Samuel Alemayehu",
    email: "samuel@cambridgeindustries.et",
    phone: "+251911332211",
    organization: "Cambridge Industries",
    jobTitle: "Managing Director",
    attendeeType: "Company",
    daysAgo: 4,
  },
  {
    fullName: "Hanna Lemma",
    email: "hanna.lemma@uneca.org",
    phone: "+251911882233",
    organization: "UN Economic Commission for Africa",
    jobTitle: "Senior Private Sector Officer",
    attendeeType: "International Partner",
    daysAgo: 4,
  },
  {
    fullName: "Lars Christiansen",
    email: "l.christiansen@eib.org",
    phone: "+251977443322",
    organization: "European Investment Bank",
    jobTitle: "East Africa Regional Lead",
    attendeeType: "International Partner",
    daysAgo: 5,
  },
  {
    fullName: "Daniel Lemma",
    email: "daniel.l@renewcapital.com",
    phone: "+251912445566",
    organization: "RENEW Capital",
    jobTitle: "Investment Director",
    attendeeType: "Investor",
    daysAgo: 5,
  },
  {
    fullName: "Aklilu Tadesse",
    email: "aklilu.t@ipdc.gov.et",
    phone: "+251911667799",
    organization: "Industrial Parks Development Corporation",
    jobTitle: "CEO",
    attendeeType: "Government Institution",
    daysAgo: 6,
  },
  {
    fullName: "Frehiwot Tamiru",
    email: "frehiwot.t@ethiotelecom.et",
    phone: "+251911112233",
    organization: "Ethio Telecom",
    jobTitle: "Chief Executive Officer",
    attendeeType: "Company",
    daysAgo: 8,
  },
  {
    fullName: "Henok Assefa",
    email: "henok@preciseethiopia.com",
    phone: "+251911334477",
    organization: "Precise Consult",
    jobTitle: "Managing Partner",
    attendeeType: "Company",
    daysAgo: 10,
  },
  {
    fullName: "Markus Berndt",
    email: "markus.berndt@kfw.de",
    phone: "+251977889900",
    organization: "KfW Development Bank",
    jobTitle: "Country Director",
    attendeeType: "International Partner",
    daysAgo: 12,
  },
  {
    fullName: "Kassahun Bekele",
    email: "kassahun.b@dashenbanksc.com",
    phone: "+251911889911",
    organization: "Dashen Bank SC",
    jobTitle: "VP Retail & Digital Banking",
    attendeeType: "Company",
    daysAgo: 14,
  },
  {
    fullName: "Sophia Al-Mansoor",
    email: "sophia@gulf-invest.ae",
    phone: "+251977334411",
    organization: "Gulf Africa Investment Partners",
    jobTitle: "Managing Partner",
    attendeeType: "Investor",
    daysAgo: 15,
  },
];

async function seedAttendees() {
  const dbUrl = loadEnv();
  const dbContext = await createDbContext(dbUrl);
  const { db } = dbContext;

  try {
    console.log("Seeding realistic attendees into Neon database...");
    let insertedCount = 0;

    for (const a of ATTENDEES_DATA) {
      const [existing] = await db
        .select({ id: registrations.id })
        .from(registrations)
        .where(sql`lower(${registrations.email}) = ${a.email.toLowerCase()}`)
        .limit(1);

      if (existing) {
        console.log(`Attendee already exists: ${a.email}`);
        continue;
      }

      const referenceHex = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
      const createdAt = new Date(Date.now() - a.daysAgo * 24 * 60 * 60 * 1000);

      await db.insert(registrations).values({
        id: crypto.randomUUID(),
        fullName: a.fullName,
        email: a.email,
        phone: a.phone,
        organization: a.organization,
        jobTitle: a.jobTitle,
        attendeeType: a.attendeeType,
        attendingDays: "Nov 28, Nov 29, 2026",
        reference: `EBIF-${referenceHex}`,
        createdAt,
      });

      insertedCount++;
    }

    console.log(`✓ Successfully seeded ${insertedCount} new attendee records into Neon.`);
  } finally {
    await closeDbContext(dbContext);
  }
}

seedAttendees().catch((err) => {
  console.error("Attendee seed failed:", err);
  process.exit(1);
});
