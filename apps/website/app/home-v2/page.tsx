import { SiteHeader } from "@/components/site-header";
import Particles from "@/components/magicui/particles";
import HeroSectionV2 from "@/components/landing/hero-section-v2";
import FeaturesSection from "@/components/landing/features-section";
import UseCaseSection from "@/components/landing/use-case-section";
import BenefitsGrid from "@/components/landing/benefits-grid";
import CtaSectionV2 from "@/components/landing/cta-section-v2";

export default function HomeV2() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
      <Particles
        className="absolute inset-0"
        quantity={100}
        ease={80}
        color="#ffffff"
        refresh={false}
      />
      <SiteHeader />
      <main className="flex-1 w-full">
        <HeroSectionV2 />
        <FeaturesSection />
        <UseCaseSection />
        <BenefitsGrid />
        <CtaSectionV2 />
      </main>
    </div>
  );
}
