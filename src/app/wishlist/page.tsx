import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const WishlistPage = () => {
  return (
    <section className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 bg-[#0d1117] px-4">
      {/* Icon */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <Heart className="h-10 w-10 text-slate-500" />
      </div>

      {/* Text */}
      <h1 className="text-xl font-bold text-white">Your wishlist is empty</h1>
      <p className="text-sm text-slate-500">
        Save products you love for later.
      </p>

      {/* CTA */}
      <Button
        size="lg"
        className="mt-2 rounded-full bg-cyan-400 px-8 font-semibold text-black hover:bg-cyan-300"
        asChild
      >
        <Link href="/shop">Browse Products</Link>
      </Button>
    </section>
  );
};

export default WishlistPage;