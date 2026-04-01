import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative w-full h-[60vh] sm:h-[70vh] min-h-96 sm:min-h-125 flex items-center overflow-hidden">
      {/* Background image */}
      <Image
        src="/laptop-hero.jpg"
        fill
        priority
        alt="hero section laptop"
        className="object-cover object-center sm:object-right"
        sizes="100vw"
      />

      {/* Dark overlay — stronger on mobile so text stays legible over the image */}
      <div className="absolute inset-0 bg-black/60 sm:bg-black/30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-start gap-4 sm:gap-5 w-full px-6 sm:px-12 lg:px-16 max-w-full sm:max-w-2xl">
        {/* Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 rounded-full border border-cyan-400/40 bg-black/30 text-cyan-400 text-xs sm:text-sm font-medium backdrop-blur-sm">
          <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-cyan-400 shrink-0" />
          New arrivals just dropped
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
          <span className="text-white">Next-Gen Tech,</span>
          <br />
          <span className="text-cyan-400">Delivered.</span>
        </h1>

        {/* Description */}
        <p className="text-slate-300 sm:text-slate-400 text-sm sm:text-base leading-relaxed max-w-xs sm:max-w-sm">
          Premium laptops, cutting-edge gadgets, and accessories — all curated
          for the tech-obsessed.
        </p>

        {/* CTA */}
        <Button
          size="lg"
          className="rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-6 sm:px-7 text-sm sm:text-base h-10 sm:h-11"
          asChild
        >
          <a href="/shop">Shop Now →</a>
        </Button>
      </div>
    </section>
  );
};

export default Hero;
