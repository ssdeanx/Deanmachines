import { TopNavbar } from '@/components/landing/TopNavbar';
import { LandingPageSection } from '@/components/landing/LandingPageSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { SolutionsSection } from '@/components/landing/SolutionsSection';
import { AboutSection } from '@/components/landing/AboutSection';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <main>
        <LandingPageSection />
        <FeaturesSection />
        <SolutionsSection />
        <AboutSection />
      </main>
    </div>
  );
}
