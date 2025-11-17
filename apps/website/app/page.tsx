import { SiteHeader } from "@/components/site-header";
import HeroSection from "@/components/landing/hero-section";
import ClientSection from "@/components/landing/client-section";
import { SphereMask } from "@/components/magicui/sphere-mask";
import CallToActionSection from "@/components/landing/cta-section";
import Particles from "@/components/magicui/particles";

export default function Home() {
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
        <HeroSection />
        <ClientSection />
        <SphereMask />
        <CallToActionSection />
      </main>
    </div>
  );
}
