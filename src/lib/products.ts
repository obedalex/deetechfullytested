import { Product } from './types';

export const products: Product[] = [
  {
    id: "1",
    name: "Gaming Laptop Pro",
    price: 1299,
    image: "product-laptop-1.jpg",
    category: "laptops",
    description: "High-performance gaming laptop with RTX graphics",
    inStock: true
  },
  {
    id: "2",
    name: "Ultra Laptop",
    price: 1599,
    image: "product-laptop-2.jpg",
    category: "laptops",
    description: "Ultra-thin laptop with all-day battery life",
    inStock: true
  },
  {
    id: "3",
    name: "Wireless Headphones",
    price: 199,
    image: "product-headphones.jpg",
    category: "audio",
    description: "Premium noise-cancelling wireless headphones",
    inStock: true
  },
  {
    id: "4",
    name: "Mechanical Keyboard",
    price: 149,
    image: "product-keyboard.jpg",
    category: "accessories",
    description: "RGB mechanical keyboard with custom switches",
    inStock: true
  },
  {
    id: "5",
    name: "Gaming Mouse",
    price: 79,
    image: "product-mouse.jpg",
    category: "accessories",
    description: "High-precision gaming mouse with DPI control",
    inStock: true
  },
  {
    id: "6",
    name: "Smart Watch Pro",
    price: 299,
    image: "product-smartwatch.jpg",
    category: "wearables",
    description: "Fitness tracking smartwatch with heart rate monitor",
    inStock: true
  },
  {
    id: "7",
    name: "Tablet Ultra",
    price: 899,
    image: "product-tablet.jpg",
    category: "tablets",
    description: "10-inch tablet with stylus support",
    inStock: true
  },
  {
    id: "8",
    name: "Hero Laptop",
    price: 1199,
    image: "laptop-hero.jpg",
    category: "laptops",
    description: "All-purpose laptop for work and entertainment",
    inStock: false
  }
];

// Helper functions
export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};

export const getProductsByCategory = (category: string): Product[] => {
  return products.filter(product => product.category === category);
};

export const getCategories = (): string[] => {
  return [...new Set(products.map(product => product.category))];
};