import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { RegistrationForm } from "@/components/registration/RegistrationForm";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [{ title: "Register | Ethiopian Business & Investment Forum" }],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Register | Ethiopian Business & Investment Forum";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-paper text-cream">
      <SiteHeader homePrefix="/" />

      <main>
        <section className="mx-auto w-full max-w-[760px] px-5 py-12 md:py-16">
          <div className="border border-line bg-ink">
            <RegistrationForm key={formKey} onClose={() => setFormKey((key) => key + 1)} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
