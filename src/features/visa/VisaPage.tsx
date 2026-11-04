import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Globe2,
  Plane,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useRegistrationModal } from "@/components/registration/RegistrationModalProvider";
import { BackToTop } from "@/components/ui/BackToTop";
import { ContactInfo } from "@/components/ui/ContactInfo";
import { event } from "@/data/event";

const E_VISA_URL = "https://www.evisa.gov.et/";

const facts = [
  { icon: Globe2, label: "Application type", value: "Ethiopian eVisa" },
  { icon: Clock, label: "Processing", value: "1–3 business days" },
  { icon: Wallet, label: "Tourist visa fee", value: "USD 62 · 30 days" },
  { icon: ShieldCheck, label: "Apply only via", value: E_VISA_URL },
];

const applicationSteps = [
  "Select Apply Now and choose your visa category.",
  "Complete the online application form.",
  "Upload your supporting documents.",
  "Pay the visa fee online.",
  "Receive your approved e-Visa by email.",
];

const visaCategories = [
  "Tourist Visa",
  "Workshop/Conference Visa",
  "Journalist Visa",
  "Investment Visa",
];

const visaFees = [
  "Fees are set by the Ethiopian Immigration and Citizenship Service and are payable online at the time of application.",
  "A Single Entry Tourist Visa, valid for 30 days, costs USD 62.",
  "No fee for diplomatic and official passport holders travelling on official business.",
  "Payment is by Visa or Mastercard, and the card must be enabled for online transactions. The fee is non-refundable and payment does not guarantee approval.",
  "Delegates obtaining a visa on arrival may pay in USD, EUR, GBP or CAD, or by card.",
];

const supportingDocuments = [
  "All supporting documents must be in English.",
  "A colour image of your passport information page.",
  "A recent colour photograph taken within the last six months, against a plain light background.",
  `Your ${event.name} letter of invitation, required for the Workshop/Conference Visa category.`,
  "Confirmed accommodation details in Addis Ababa.",
  "Return or onward flight details.",
];

const exemptCountries = ["Djibouti", "Kenya"];

const visaOnArrivalCountries = [
  "Algeria",
  "Angola",
  "Argentina",
  "Australia",
  "Austria",
  "Bahrain",
  "Belarus",
  "Belgium",
  "Benin",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Central African Republic",
  "Chad",
  "China",
  "Comoros",
  "Congo",
  "Congo D.R.C",
  "Côte d'Ivoire",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Equatorial Guinea",
  "Estonia",
  "Eswatini",
  "Finland",
  "France",
  "Gabon",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Guinea",
  "Guinea-Bissau",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Jordan",
  "Kenya",
  "Kosovo",
  "Kuwait",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Mali",
  "Malta",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Monaco",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Namibia",
  "Netherlands",
  "New Zealand",
  "Niger",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "São Tomé and Príncipe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sweden",
  "Switzerland",
  "Taiwan, China",
  "Tanzania",
  "Thailand",
  "The Gambia",
  "Togo",
  "Tunisia",
  "Türkiye",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States of America",
  "Zambia",
  "Zimbabwe",
];

const visaBeforeTravellingCountries = ["Egypt", "Eritrea", "Libya", "Nigeria", "Sudan"];

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={className} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function SectionHeading({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-gold mb-3">{label}</p>
      <h2 className="font-display text-[32px] md:text-[40px] leading-[1.1] tracking-tight">{title}</h2>
      {description && <p className="text-mute max-w-[65ch] mt-4">{description}</p>}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm text-mute">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-gold" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CountryList({ countries }: { countries: string[] }) {
  return (
    <ul className="columns-2 md:columns-3 lg:columns-4 gap-x-6 text-sm text-mute">
      {countries.map((country) => (
        <li key={country} className="break-inside-avoid py-1.5 border-b border-line/60">
          {country}
        </li>
      ))}
    </ul>
  );
}

function RegisterCTA({
  title,
  description,
  className = "",
}: {
  title: string;
  description: string;
  className?: string;
}) {
  const { openRegistration } = useRegistrationModal();

  return (
    <section className={`mx-auto max-w-[1200px] px-6 md:px-10 py-16 md:py-20 ${className}`}>
      <div className="border border-line p-6 md:p-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-[32px] md:text-[40px] leading-[1.1] tracking-tight">{title}</h2>
          <p className="text-mute max-w-[65ch] mt-3">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => openRegistration()}
          className="inline-flex shrink-0 items-center justify-center gap-2 px-6 py-3 text-sm font-medium border border-gold bg-gold text-ink transition-colors duration-150 hover:bg-gold-2 cursor-pointer"
        >
          Register
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

export function VisaPage() {
  return (
    <div>
      <SiteHeader homePrefix="/" />
      <main>
        <section className="border-b border-line">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-16 md:py-24">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-mute mb-3">Visa Information</p>
              <h1 className="font-display text-[40px] md:text-[56px] leading-[1.05] tracking-tight max-w-[20ch]">
                Your guide to entering Ethiopia
              </h1>
              <p className="text-mute max-w-[65ch] mt-5">
                Everything you need to know about obtaining a visa for the {event.name} at{" "}
                {event.venue}, {event.city}, on {event.dates}. Please review the requirements below
                and apply through the official Government of Ethiopia portal before you travel.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-8">
                <a
                  href={E_VISA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium border border-gold bg-gold text-ink transition-colors duration-150 hover:bg-gold-2"
                >
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#how-to-apply"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium border border-line text-cream transition-colors duration-150 hover:border-cream"
                >
                  Read the guide
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12 md:py-16 border-b border-line">
          <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {facts.map((fact) => {
              const Icon = fact.icon;
              return (
                <div key={fact.label} className="border border-line p-5">
                  <Icon className="h-5 w-5 mb-4 text-gold" />
                  <p className="text-xs uppercase tracking-[0.2em] text-mute">{fact.label}</p>
                  <p className="font-medium mt-2">
                    {fact.value === E_VISA_URL ? (
                      <a
                        href={fact.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold underline underline-offset-4 hover:text-gold-2"
                      >
                        {fact.value}
                      </a>
                    ) : (
                      fact.value
                    )}
                  </p>
                </div>
              );
            })}
          </Reveal>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-12 md:py-16 border-b border-line">
          <Reveal className="border border-line p-6 md:p-8 flex gap-4">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-gold" />
            <div>
              <h2 className="font-display text-2xl tracking-tight">Important Remark</h2>
              <p className="text-sm text-mute mt-3 max-w-[80ch]">
                It is the responsibility of each individual travelling to Ethiopia to meet the correct
                visa requirements. The information below is only a reference to assist you in obtaining
                your visa as efficiently as possible.
              </p>
            </div>
          </Reveal>
        </section>

        <section
          id="how-to-apply"
          className="mx-auto max-w-[1200px] px-6 md:px-10 py-16 md:py-24 border-b border-line"
        >
          <Reveal>
            <SectionHeading
              label="Ethiopia e-Visa Application System"
              title="Apply online before you travel"
              description="All visa applications are made online through the official Government of Ethiopia portal."
            />
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <Reveal className="lg:col-span-7">
              <div className="border border-line p-6 md:p-8">
                <p className="text-sm text-mute flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-gold" />
                  Applications submitted through third-party or commercial websites are not recognised
                  by the Ethiopian immigration authorities.
                </p>
                <h3 className="font-medium mt-6 mb-3">The application process is fully online</h3>
                <p className="text-sm text-mute mb-4">
                  Applications are made by selecting Apply Now, choosing your visa category, completing
                  the form, uploading supporting documents and paying the visa fee.
                </p>
                <ol className="space-y-2">
                  {applicationSteps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3 text-sm text-mute">
                      <span className="font-display text-gold leading-none w-5 shrink-0">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
            <Reveal className="lg:col-span-5" delay={80}>
              <div className="border border-line p-6 md:p-8">
                <h3 className="font-medium mb-4">Four categories are available</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {visaCategories.map((category) => (
                    <div key={category} className="border border-line px-4 py-3 text-sm">
                      {category}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-mute mt-5">
                  Delegates attending {event.name} should select the <strong>Tourist Visa</strong> and
                  upload their letter of invitation.
                </p>
              </div>
            </Reveal>
          </div>
          <Reveal className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4" delay={120}>
            <div className="border border-line p-5">
              <p className="font-medium">Approval by email</p>
              <p className="text-sm text-mute mt-2">
                Once approved, the e-Visa is sent electronically to the email address used for
                submitting the application.
              </p>
            </div>
            <div className="border border-line p-5">
              <p className="font-medium">Print your e-Visa</p>
              <p className="text-sm text-mute mt-2">
                Print a copy of the approved e-Visa and carry it with you. A payment receipt is not a
                visa and will not be accepted at the border.
              </p>
            </div>
            <div className="border border-line p-5">
              <p className="font-medium">Entry point and timing</p>
              <p className="text-sm text-mute mt-2">
                e-Visa holders must enter Ethiopia through Addis Ababa Bole International Airport.
                Applications should be submitted at least four weeks before the date of travel.
              </p>
            </div>
          </Reveal>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-16 md:py-24 border-b border-line">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <Reveal>
              <SectionHeading label="Visa Fees" title="Fees and payment" />
              <BulletList items={visaFees} />
            </Reveal>
            <Reveal delay={80}>
              <SectionHeading label="Supporting Documents" title="What to prepare" />
              <BulletList items={supportingDocuments} />
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-16 md:py-24 border-b border-line">
          <Reveal>
            <SectionHeading
              label="Requirements"
              title="Passport, processing and health"
              description="Make sure your travel documents meet these requirements before submitting your application."
            />
          </Reveal>
          <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-4" delay={80}>
            <div className="border border-line p-6">
              <FileText className="h-5 w-5 mb-4 text-gold" />
              <h3 className="font-medium">Passport Requirements</h3>
              <p className="text-sm text-mute mt-3">
                All visitors to Ethiopia must have a passport valid for at least six months from the
                intended date of entry, with at least two blank pages for endorsement. Damaged travel
                documents are not accepted.
              </p>
            </div>
            <div className="border border-line p-6">
              <Clock className="h-5 w-5 mb-4 text-gold" />
              <h3 className="font-medium">Processing</h3>
              <p className="text-sm text-mute mt-3">
                Standard processing is one to three business days. An urgent service is available where
                the need can be evidenced. Delegates are advised to allow additional time in the period
                immediately before the conference.
              </p>
            </div>
            <div className="border border-line p-6">
              <ShieldCheck className="h-5 w-5 mb-4 text-gold" />
              <h3 className="font-medium">Health Requirements</h3>
              <p className="text-sm text-mute mt-3">
                A yellow fever vaccination certificate is required for travellers arriving from, or
                transiting through, a country with a risk of yellow fever transmission. Given the range
                of routings to Addis Ababa, all delegates are advised to carry a valid certificate. The
                vaccine must be administered at least ten days before travel.
              </p>
            </div>
          </Reveal>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-16 md:py-24 border-b border-line">
          <Reveal>
            <SectionHeading
              label="Visa-Exempt Countries"
              title="Citizens who do not require a visa"
              description="If your passport was issued by either of the following countries, you do not require a visa to enter Ethiopia. Your passport must still be valid for at least six months with two blank pages."
            />
          </Reveal>
          <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-4" delay={80}>
            {exemptCountries.map((country) => (
              <div key={country} className="border border-line px-5 py-4 font-medium">
                {country}
              </div>
            ))}
          </Reveal>
          <Reveal className="mt-4 border border-line p-6 md:p-8 text-sm text-mute space-y-3" delay={120}>
            <p>
              Holders of diplomatic, service and official passports, United Nations Laissez-Passer,
              African Union travel documents and African Development Bank travel documents may also be
              exempt. Delegates travelling on these documents should contact the Forum Secretariat to
              confirm their position before making travel arrangements.
            </p>
            <p>
              Delegates transiting through Addis Ababa Bole International Airport to an onward
              destination, who remain within the international transit area, do not require a visa.
            </p>
          </Reveal>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-16 md:py-24 border-b border-line">
          <Reveal>
            <SectionHeading
              label="Visa on Arrival"
              title="Eligible countries and territories"
              description="If your passport was issued by any of the following countries or territories, a tourist visa on arrival is available at Addis Ababa Bole International Airport."
            />
          </Reveal>
          <Reveal className="border border-line p-6 md:p-8" delay={80}>
            <CountryList countries={visaOnArrivalCountries} />
          </Reveal>
          <Reveal className="mt-4 border border-line p-6 md:p-8 flex gap-4" delay={120}>
            <Plane className="h-5 w-5 mt-0.5 shrink-0 text-gold" />
            <p className="text-sm text-mute">
              Visa on arrival is issued at the discretion of immigration officers and is intended for
              tourism. Delegates travelling to attend a conference are expected to arrange entry in
              advance and are strongly advised to apply for an e-Visa before departure. Airlines may
              refuse boarding to passengers travelling without valid entry documentation.
            </p>
          </Reveal>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-16 md:py-24 border-b border-line">
          <Reveal>
            <SectionHeading
              label="Apply in Advance"
              title="Citizens who must obtain a visa before travelling"
              description="Citizens of the following countries are not eligible for a visa on arrival and must hold an approved e-Visa, or a visa issued by an Ethiopian diplomatic mission, before boarding. This applies regardless of African Union membership."
            />
          </Reveal>
          <Reveal className="grid grid-cols-2 md:grid-cols-5 gap-4" delay={80}>
            {visaBeforeTravellingCountries.map((country) => (
              <div key={country} className="border border-line px-5 py-4 font-medium">
                {country}
              </div>
            ))}
          </Reveal>
          <Reveal className="mt-4 border border-line p-6 md:p-8 flex gap-4" delay={120}>
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-gold" />
            <p className="text-sm text-mute">
              Citizens of any country not listed in either of the two sections above are likewise not
              eligible for a visa on arrival and must apply online in advance through the official
              portal.
            </p>
          </Reveal>
        </section>

        <RegisterCTA
          title="Attending the Forum?"
          description={`Register for the ${event.name} at ${event.venue}, ${event.city}, on ${event.dates} before arranging your travel so you have your invitation letter ready for the visa application.`}
          className="border-t border-line"
        />

        <section className="mx-auto max-w-[1200px] px-6 md:px-10 pt-16 md:pt-24">
          <Reveal>
            <ContactInfo compact />
          </Reveal>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 md:px-10 py-16 md:py-24">
          <Reveal className="border border-line p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <p className="text-xs uppercase tracking-[0.2em] text-mute mb-3">Ready to travel?</p>
                <h2 className="font-display text-[32px] md:text-[40px] leading-[1.1] tracking-tight">
                  Start your Ethiopian eVisa application
                </h2>
                <p className="text-mute max-w-[65ch] mt-4">
                  Fees, processing times and eligibility are set by the Ethiopian government and may
                  change. Always apply through the official portal and keep a copy of your approved
                  visa with your travel documents.
                </p>
              </div>
              <div className="lg:col-span-4 lg:text-right">
                <a
                  href={E_VISA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium border border-gold bg-gold text-ink transition-colors duration-150 hover:bg-gold-2"
                >
                  Apply Now
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
}
