import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { MenuItem, Settings } from "./src/types";

const app = express();
const PORT = 3000;

// Path to persist JSON database
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Default initial menu items based on Amshi Cafe specialty catalog
const DEFAULT_MENU: MenuItem[] = [
  {
    id: "m1",
    name: "Steam Momos",
    category: "Momos",
    price: 60,
    type: "veg",
    desc: "Delicious steaming hot dumplings stuffed with freshly minced garden vegetables & spices, served alongside Amshi's signature hot garlic schezwan red chutney.",
    img: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 60 },
      { name: "Half", price: 30 }
    ]
  },
  {
    id: "m2",
    name: "Fry Momos",
    category: "Momos",
    price: 70,
    type: "veg",
    desc: "Deep fried to golden crisp perfection, stuffed with minced mix vegetables, onions & aromatic spices.",
    img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 70 },
      { name: "Half", price: 40 }
    ]
  },
  {
    id: "m3",
    name: "Kurkure Momos",
    category: "Momos",
    price: 80,
    type: "veg",
    desc: "Incredibly crunchy outside, stuffed with spiced vegetables, coated with a crisp cornflakes crust and fried.",
    img: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 80 },
      { name: "Half", price: 40 }
    ]
  },
  {
    id: "m4",
    name: "Cheese Momos",
    category: "Momos",
    price: 99,
    type: "veg",
    desc: "Decadent melted cheese and finely diced vegetables in soft steamed wrappers.",
    img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 99 },
      { name: "Half", price: 49 }
    ]
  },
  {
    id: "m5",
    name: "Paneer Momos",
    category: "Momos",
    price: 80,
    type: "veg",
    desc: "Delicious cottage cheese chunks with minced cilantro and light aromatic seasoning.",
    img: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 80 },
      { name: "Half", price: 49 }
    ]
  },
  {
    id: "m6",
    name: "Paneer Fry Momos",
    category: "Momos",
    price: 90,
    type: "veg",
    desc: "Deep fried paneer momos with delicious crispy textures and satisfying fillings.",
    img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 90 },
      { name: "Half", price: 59 }
    ]
  },
  {
    id: "m7",
    name: "Paneer Kurkure Momos",
    category: "Momos",
    price: 99,
    type: "veg",
    desc: "The ultimate crisp double-fried paneer dumplings with golden cornflakes coating.",
    img: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 99 },
      { name: "Half", price: 60 }
    ]
  },
  {
    id: "m8",
    name: "Paneer Cheese Momos",
    category: "Momos",
    price: 120,
    type: "veg",
    desc: "Filled with rich grated paneer plus gooey melted mozzarella cheese, truly royal.",
    img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 120 },
      { name: "Half", price: 80 }
    ]
  },
  {
    id: "n1",
    name: "Veg Chaumin",
    category: "Noodles",
    price: 80,
    type: "veg",
    desc: "Traditional street-style vegetable noodles prepared with soy sauce, fresh cabbage, carrots and spring onions.",
    img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 80 },
      { name: "Half", price: 40 }
    ]
  },
  {
    id: "n2",
    name: "Hakka Noodles",
    category: "Noodles",
    price: 99,
    type: "veg",
    desc: "Lightly tossed Indo-Chinese style noodles with green bell peppers, cabbage, carrot juliennes and mild seasoning.",
    img: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 99 },
      { name: "Half", price: 60 }
    ]
  },
  {
    id: "n3",
    name: "Schezwan Noodles",
    category: "Noodles",
    price: 99,
    type: "veg",
    desc: "Fiery stir-fried noodles tossed in Amshi's house-made spicy, tangy Schezwan sauce and fresh veggies.",
    img: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 99 },
      { name: "Half", price: 60 }
    ]
  },
  {
    id: "n4",
    name: "Garlic Noodles",
    category: "Noodles",
    price: 120,
    type: "veg",
    desc: "Fragrant wok-fried noodles exploding with roasted golden garlic cloves, butter, and select herbs.",
    img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 120 },
      { name: "Half", price: 80 }
    ]
  },
  {
    id: "r1",
    name: "Veggie Roll",
    category: "Rolls",
    price: 60,
    type: "veg",
    desc: "Freshly baked flatbread paratha wrapped with juicy spiced seasonal vegetable patties and tangy sauces.",
    img: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 60 },
      { name: "Half", price: 30 }
    ]
  },
  {
    id: "r2",
    name: "Paneer Roll",
    category: "Rolls",
    price: 80,
    type: "veg",
    desc: "Tandoori marinated spiced cottage cheese cubes tossed on the griddle and wrapped in crisp wheat flatbread.",
    img: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 80 },
      { name: "Half", price: 50 }
    ]
  },
  {
    id: "r3",
    name: "Cheese Roll",
    category: "Rolls",
    price: 99,
    type: "veg",
    desc: "Creamy cheese blend paratha rolls melted till warm and bubbling, inside tasty house seasonings.",
    img: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Full", price: 99 },
      { name: "Half", price: 60 }
    ]
  },
  {
    id: "p1",
    name: "Margherita Pizza",
    category: "Pizza",
    price: 99,
    type: "veg",
    desc: "Delightfully authentic thin crust oven pizza topped with premium tomato purée and real melted mozzarella.",
    img: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "p2",
    name: "Onion Pizza",
    category: "Pizza",
    price: 99,
    type: "veg",
    desc: "Sweet caramelized red onion rings over signature golden sauce with toasted mozzarella.",
    img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "p3",
    name: "Paneer Pizza",
    category: "Pizza",
    price: 149,
    type: "veg",
    desc: "High-protein loaded pizza featuring grilled paneer tikka cubes, onions, capsicums and rich golden cheese pull.",
    img: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "p4",
    name: "Sweet Corn Pizza",
    category: "Pizza",
    price: 99,
    type: "veg",
    desc: "Sweet American golden corn kernels layered thick on loaded stretch cheese.",
    img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "p5",
    name: "Farmhouse Pizza",
    category: "Pizza",
    price: 199,
    type: "veg",
    desc: "Fresh garden harvest toppings featuring capsicums, onions, tomatoes and exotic black olives on mozzarella.",
    img: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600&auto=format&fit=crop&q=80",
    variants: [
      { name: "Small", price: 199 },
      { name: "Medium", price: 299 }
    ]
  },
  {
    id: "j1",
    name: "Curacao Mojito",
    category: "Mojito",
    price: 69,
    type: "veg",
    desc: "Refreshing ocean blue premium curacao cocktail muddled with mint leaves, lemon juice, sugar syrup, and soda.",
    img: "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "j2",
    name: "Mint Mojito",
    category: "Mojito",
    price: 69,
    type: "veg",
    desc: "Classic fresh mint, crushed lemon wedges, ice, sugar syrup, and sparkling soda.",
    img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "j3",
    name: "Black Currant Mojito",
    category: "Mojito",
    price: 69,
    type: "veg",
    desc: "Rich, dark sweet black currant extract muddled with cooling mint leaves and sparkling soda.",
    img: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "j4",
    name: "Green Apple Mojito",
    category: "Mojito",
    price: 69,
    type: "veg",
    desc: "Crisp, tart green apple syrup infused with real lime wheels and fresh cooling mint leaves.",
    img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "j5",
    name: "Water Melon Mojito",
    category: "Mojito",
    price: 69,
    type: "veg",
    desc: "Refreshing summer blend of sweet watermelon syrup, fresh mint sprigs, and soda.",
    img: "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "j6",
    name: "Mango Mojito",
    category: "Mojito",
    price: 69,
    type: "veg",
    desc: "Tropical Alphonso mango pulpy reduction blended with classic mojito cooling herbs.",
    img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "j7",
    name: "Red Rose Mojito",
    category: "Mojito",
    price: 69,
    type: "veg",
    desc: "Elegant floral aromatic rose syrup, crushed mint leaves, sweet soda, and fresh lime.",
    img: "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "j8",
    name: "Strawberry Mojito",
    category: "Mojito",
    price: 69,
    type: "veg",
    desc: "Sweet luscious muddled strawberry sauce, cooling fresh mint, and fizzy sparkling soda.",
    img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "j9",
    name: "Bubble Gum Mojito",
    category: "Mojito",
    price: 69,
    type: "veg",
    desc: "Fun Nostalgic aromatic bubblegum infusion, fresh lime, mint leaves, and refreshing fizz.",
    img: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "t1",
    name: "Normal Tea",
    category: "Tea & Coffee",
    price: 13,
    type: "veg",
    desc: "Comforting home-style milk tea brewed with top grade Assam leaves and sugar.",
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "t2",
    name: "Lemon Tea",
    category: "Tea & Coffee",
    price: 19,
    type: "veg",
    desc: "Zesty black tea infused with fresh citrus lemon juice and honey for a quick antioxidant boost.",
    img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "t3",
    name: "Adrak Tea",
    category: "Tea & Coffee",
    price: 25,
    type: "veg",
    desc: "Traditional hot Indian Chai boiled with finely crushed fresh ginger root to warm up your day.",
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "t4",
    name: "Kulhad Tea",
    category: "Tea & Coffee",
    price: 25,
    type: "veg",
    desc: "Fragrant milk tea brewed with cardamom and ginger, served hot in authentic clay pots (kulhad).",
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "t5",
    name: "Elaichi Tea",
    category: "Tea & Coffee",
    price: 29,
    type: "veg",
    desc: "Indulgent aromatic Indian chai cooked with freshly ground cardamom pods and fresh milk.",
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c2",
    name: "Hot Coffee",
    category: "Tea & Coffee",
    price: 35,
    type: "veg",
    desc: "Strong steamed whipped coffee with fresh frothy hot milk and fine cocoa dust.",
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c3",
    name: "Chocolate Coffee",
    category: "Tea & Coffee",
    price: 45,
    type: "veg",
    desc: "Rich espresso double-shot combined with dark chocolate sauce and whipped cream.",
    img: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c4",
    name: "Caramel Coffee",
    category: "Tea & Coffee",
    price: 45,
    type: "veg",
    desc: "Sweet buttery rich caramel syrup blended inside hot cappuccino with whipped froth.",
    img: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c5",
    name: "Hazelnut Coffee",
    category: "Tea & Coffee",
    price: 45,
    type: "veg",
    desc: "Classic nutty roasted hazelnut flavor added to strong hot frothed cappuccino.",
    img: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c1",
    name: "Cold Coffee",
    category: "Tea & Coffee",
    price: 69,
    type: "veg",
    desc: "Creamy frothed rich blended cold coffee with chilled milk and chocolate syrup.",
    img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c6",
    name: "Kit Kat Cold Coffee",
    category: "Tea & Coffee",
    price: 99,
    type: "veg",
    desc: "Decadent thick cold coffee shake blended with real crispy KitKat chocolate bars and chocolate sauce.",
    img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "d1",
    name: "Vanilla Icecream",
    category: "Desserts",
    price: 50,
    type: "veg",
    desc: "High quality sweet and smooth Madagascar vanilla bean scoop.",
    img: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "d2",
    name: "Chocolate Icecream",
    category: "Desserts",
    price: 50,
    type: "veg",
    desc: "Dark chocolate rich milk scoop with delicious shaved chocolate flakes on top.",
    img: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "d3",
    name: "Strawberry Icecream",
    category: "Desserts",
    price: 50,
    type: "veg",
    desc: "Pure sweet strawberries pulp churned into fresh heavy milk cream.",
    img: "https://images.unsplash.com/photo-1560008511-11c63416e52d?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "d4",
    name: "Butterscotch Icecream",
    category: "Desserts",
    price: 50,
    type: "veg",
    desc: "Rich golden caramelized butterscotch scoop with crispy almond brittle crunch.",
    img: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "d5",
    name: "Mango Icecream",
    category: "Desserts",
    price: 50,
    type: "veg",
    desc: "Real pureed rich summer Alphonso mangoes scoop, velvety soft.",
    img: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "d6",
    name: "Coffee Icecream",
    category: "Desserts",
    price: 50,
    type: "veg",
    desc: "Roasted espresso bean flavor churned perfectly for cold sweet indulgence.",
    img: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "d7",
    name: "Cold Drink",
    category: "Desserts",
    price: 30,
    type: "veg",
    desc: "Chilled carbonated soft drinks served ice-cold to wash down your rich meal.",
    img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "q1",
    name: "Allo Petis",
    category: "Petis",
    price: 20,
    type: "veg",
    desc: "Warm golden flaky puff pastry baked crisp with a delicious spiced potato and green peas filling.",
    img: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "q2",
    name: "Paneer Petis",
    category: "Petis",
    price: 30,
    type: "veg",
    desc: "Melt-in-mouth baked puff pastry layers stuffed with savory cottage cheese crumbs and mild tandoori spices.",
    img: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "q3",
    name: "Cheese Petis",
    category: "Petis",
    price: 30,
    type: "veg",
    desc: "Flaky hot puff pastry bursting with molten liquid cheese and garlic herbs.",
    img: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "s1",
    name: "Plain Salted Fries",
    category: "Fries",
    price: 49,
    type: "veg",
    desc: "Golden classic potato fingers deep fried to a tender inside and salted to perfection.",
    img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "s2",
    name: "Peri Peri Fries",
    category: "Fries",
    price: 59,
    type: "veg",
    desc: "Crunchy golden french fries tossed in volcanic peri-peri hot spices.",
    img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "s3",
    name: "Cheese Fries",
    category: "Fries",
    price: 99,
    type: "veg",
    desc: "Overloaded crispy golden fries bathed in hot melted cheese sauce with tasty spices.",
    img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "s4",
    name: "Mayonnaise Fries",
    category: "Fries",
    price: 99,
    type: "veg",
    desc: "Crispy potato fries drizzled with sweet creamy garlic mayonnaise dressing.",
    img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "s5",
    name: "Cheese Balls (8P)",
    category: "Fries",
    price: 60,
    type: "veg",
    desc: "Eight pieces of golden-fried mini cheese spheres with mixed jalapeños and crispy breading.",
    img: "https://images.unsplash.com/photo-1541525393104-ba0848938a04?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "w1",
    name: "Veggie Sandwich",
    category: "Sandwiches",
    price: 89,
    type: "veg",
    desc: "Golden toasted buttered bread stuffed with cucumbers, tomatoes, potatoes, onions, and spicy green cilantro chutney.",
    img: "https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "w2",
    name: "Cheese Sandwich",
    category: "Sandwiches",
    price: 119,
    type: "veg",
    desc: "Classic triple-layer cheese sandwich grilled with butter and fresh green chutney.",
    img: "https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "w3",
    name: "Paneer Sandwich",
    category: "Sandwiches",
    price: 119,
    type: "veg",
    desc: "High protein sandwich with marinated grilled paneer, onions, capsicum, and premium sandwich mayo spread.",
    img: "https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "w4",
    name: "Makhani Sandwich",
    category: "Sandwiches",
    price: 129,
    type: "veg",
    desc: "Delicious sandwich infused with rich North-Indian butter paneer makhani gravy and melting mozzarella cheese.",
    img: "https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "w5",
    name: "Cheese Garlic Sandwich",
    category: "Sandwiches",
    price: 129,
    type: "veg",
    desc: "Intensely aromatic, loaded with toasted garlic butter, sharp cheddar, mozzarella, and dynamic sweet herbs.",
    img: "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "b1",
    name: "Crispy Veggies Burger",
    category: "Burger",
    price: 45,
    type: "veg",
    desc: "Delicious deep fried vegetable patty served with lettuce, onion slices, tomato, and creamy burger mayo.",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "b2",
    name: "Chilli Cheese Burger",
    category: "Burger",
    price: 69,
    type: "veg",
    desc: "Spicy crispy patty topped with hot chili pepper relish and a rich slice of melting butter cheese.",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "b3",
    name: "Paneer King Burger",
    category: "Burger",
    price: 69,
    type: "veg",
    desc: "Juicy crispy single paneer patty burger topped with crisp onions and house royal special tandoori sauce.",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "b4",
    name: "Makhani Burger",
    category: "Burger",
    price: 99,
    type: "veg",
    desc: "Loaded veggie patty burger dipped in legendary sweet & spicy butter makhani sauce.",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "b5",
    name: "Extra Loaded Burger",
    category: "Burger",
    price: 110,
    type: "veg",
    desc: "Mega double-decker burger layered with two crispy patties, double cheese slices, and special Amshi dressing.",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80"
  }
];

const DEFAULT_SETTINGS: Settings = {
  whatsapp: "919000000000", // Default India number
  logoUrl: "",
  bannerUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1600&auto=format&fit=crop&q=80",
  tables: 15,
  websiteUrl: "", // Defaults to detect current page
  tax: 5,         // 5% GST
  delivery: 10,   // ₹10 packaging/service fee
  theme: "black-gold",
};

interface DbSchema {
  menu: MenuItem[];
  settings: Settings;
  adminPasswordHash: string; // Plain password for ease of this demo app, let's store it as "amshi123"
}

// Ensure database is initialized
function loadDb(): DbSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const data = JSON.parse(raw);
      // Ensure schemas are merged in case settings format changes
      return {
        menu: data.menu || DEFAULT_MENU,
        settings: { ...DEFAULT_SETTINGS, ...data.settings },
        adminPasswordHash: data.adminPasswordHash || "amshi123",
      };
    }
  } catch (err) {
    console.error("DB load error, fallback to defaults.", err);
  }
  return {
    menu: DEFAULT_MENU,
    settings: DEFAULT_SETTINGS,
    adminPasswordHash: "amshi123",
  };
}

function saveDb(data: DbSchema) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Critical: Could not write to database.", err);
  }
}

// Standard middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Routes
app.get("/api/menu", (req, res) => {
  const db = loadDb();
  res.json(db.menu);
});

app.post("/api/menu", (req, res) => {
  const item: MenuItem = req.body;
  if (!item.name || !item.category || item.price === undefined) {
    res.status(400).json({ error: "Missing required properties" });
    return; // Fast exit
  }

  const db = loadDb();
  if (item.id) {
    const idx = db.menu.findIndex((m) => m.id === item.id);
    if (idx !== -1) {
      db.menu[idx] = item;
    } else {
      db.menu.push(item);
    }
  } else {
    item.id = "dish_" + Date.now().toString(36);
    db.menu.push(item);
  }

  saveDb(db);
  res.json({ success: true, item });
});

app.delete("/api/menu/:id", (req, res) => {
  const id = req.params.id;
  const db = loadDb();
  const initialLen = db.menu.length;
  db.menu = db.menu.filter((m) => m.id !== id);
  if (db.menu.length === initialLen) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  saveDb(db);
  res.json({ success: true });
});

app.get("/api/settings", (req, res) => {
  const db = loadDb();
  res.json(db.settings);
});

app.post("/api/settings", (req, res) => {
  const settings: Settings = req.body;
  if (!settings.whatsapp) {
    res.status(400).json({ error: "WhatsApp receiver is required" });
    return;
  }
  const db = loadDb();
  db.settings = { ...db.settings, ...settings };
  saveDb(db);
  res.json({ success: true, settings: db.settings });
});

app.post("/api/login", (req, res) => {
  const { password } = req.body;
  const db = loadDb();
  if (password === db.adminPasswordHash) {
    res.json({ success: true, token: "session_token_" + Date.now() });
  } else {
    res.status(401).json({ error: "Unauthorized access path. Incorrect password." });
  }
});

// Configure Vite or Static Assets serving after API routes and before listening
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Amshi Cafe full-stack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical failure during server bootstrapping:", err);
});
