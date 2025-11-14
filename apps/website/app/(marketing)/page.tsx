import { CTA } from "@/components/sections/cta";
import { Examples } from "@/components/sections/examples";
import { Features } from "@/components/sections/features";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { Hero } from "@/components/sections/hero";
import { Logos } from "@/components/sections/logos";

export default async function Page() {
  return (
    <>
      <Header />
      <Hero />
      <Logos />
      <Examples />
      <Features />
      <CTA />
      <Footer />
    </>
  );
}
