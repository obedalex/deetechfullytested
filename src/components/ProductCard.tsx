// app/components/ProductCard.tsx

import Link from "next/link";

export default function ProductCard({ product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="rounded-lg border p-4 hover:shadow-md transition"
    >
      <img
        src={product.image}
        alt={product.name}
        className="mb-2 h-40 w-full object-cover rounded-md"
      />
      <h3 className="font-semibold">{product.name}</h3>
      <p className="text-sm text-muted-foreground">${product.price}</p>
    </Link>
  );
}
