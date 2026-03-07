import { NavigationMenuBar } from '@/components/layout/NavigationMenuBar';
import { HeroSection } from '@/components/home/HeroSection';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationMenuBar />
      <HeroSection />
    </div>
  );
}
