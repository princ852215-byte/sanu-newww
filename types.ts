export interface Variant {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  type: 'veg' | 'non-veg';
  desc: string;
  img: string;
  variants?: Variant[];
}

export interface Settings {
  whatsapp: string;
  logoUrl: string;
  bannerUrl: string;
  tables: number;
  websiteUrl: string;
  tax: number;
  delivery: number;
  theme: 'black-gold' | 'royal-red' | 'forest-green';
}

export interface CartItem {
  product: MenuItem;
  selectedVariant: Variant | null; // Selected variant, or null if use base price
  quantity: number;
}
