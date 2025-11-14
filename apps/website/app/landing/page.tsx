import ClientSection from "@/components/landing/client-section";
import CallToActionSection from "@/components/landing/cta-section";
import HeroSection from "@/components/landing/hero-section";
import Particles from "@/components/magicui/particles";
import { SphereMask } from "@/components/magicui/sphere-mask";
import { Blog } from "@/components/sections/blog";
import { Community } from "@/components/sections/community";
import { CTA } from "@/components/sections/cta";
import { Examples } from "@/components/sections/examples";
import { Features } from "@/components/sections/features";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { Hero } from "@/components/sections/hero";
import { Logos } from "@/components/sections/logos";
import { Statistics } from "@/components/sections/statistics";
import { Testimonials } from "@/components/sections/testimonials";
import { UseCases } from "@/components/sections/use-cases";

export default async function Page() {
  return (
    <>
      {/* Original sections */}
      <HeroSection />
      <ClientSection />
      <SphereMask />
      <CallToActionSection />
      <Particles
        className="absolute inset-0 -z-10"
        quantity={50}
        ease={70}
        size={0.05}
        staticity={40}
        color={"#ffffff"}
      />

      {/* Template sections below - pick elements you want to keep */}
      <Header />
      <Hero />
      <Logos />
      <Examples />
      <UseCases />
      <Features />
      <Statistics />
      <Testimonials />
      <Community />
      <Blog />
      <CTA />
      <Footer />
    </>
  );
}
