import { NavigationMenuBar } from '@/components/layout/NavigationMenuBar';
import { HeroSection } from '@/components/home/HeroSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { PricingSection } from '@/components/home/PricingSection';
import { PartnersSection } from '@/components/home/PartnersSection';
import { Footer } from '@/components/home/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavigationMenuBar />
      <HeroSection />
      <HowItWorksSection />
      <PricingSection />
      <PartnersSection />
      <Footer />
    </div>
  );
}
