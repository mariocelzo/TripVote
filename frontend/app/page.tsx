// frontend/app/page.tsx
// Landing page — assembla tutti i componenti della home pubblica

import LandingNav   from "@/components/landing/LandingNav";
import Hero         from "@/components/landing/Hero";
import HowItWorks   from "@/components/landing/HowItWorks";
import Features     from "@/components/landing/Features";
import Testimonials from "@/components/landing/Testimonials";
import Pricing      from "@/components/landing/Pricing";
import Faq          from "@/components/landing/Faq";
import Footer       from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <LandingNav />
      <Hero />
      <HowItWorks />
      <Features />
      <Testimonials />
      <Pricing />
      <Faq />
      <Footer />
    </div>
  );
}
