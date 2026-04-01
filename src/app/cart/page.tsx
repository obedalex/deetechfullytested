import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

const CartPage = () => {
  return (
    <section className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 bg-[#0d1117] px-4">
      {/* Icon */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <ShoppingBag className="h-10 w-10 text-slate-500" />
      </div>

      {/* Text */}
      <h1 className="text-xl font-bold text-white">Your cart is empty</h1>
      <p className="text-sm text-slate-500">
        Add some products to get started.
      </p>

      {/* CTA */}
      <Button
        size="lg"
        className="mt-2 rounded-full bg-cyan-400 px-8 font-semibold text-black hover:bg-cyan-300"
        asChild
      >
        <Link href="/shop">Continue Shopping</Link>
      </Button>
    </section>
  );
};

export default CartPage;
