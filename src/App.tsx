import React, { useState, useEffect, useRef } from "react";
import { 
  ShoppingBasket, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  Coffee, 
  Lock, 
  Unlock, 
  Settings as SettingsIcon, 
  QrCode, 
  MapPin, 
  RotateCcw, 
  Utensils, 
  Check, 
  Eye, 
  EyeOff, 
  X, 
  LayoutDashboard, 
  LogOut, 
  Globe, 
  Percent, 
  Leaf, 
  Flame, 
  Printer, 
  Download, 
  AlertTriangle,
  BadgePercent,
  Compass,
  ArrowRight,
  Upload,
  Calendar,
  Clock,
  ClipboardList,
  User as UserIcon,
  ShoppingBag,
  Github
} from "lucide-react";
import { MenuItem, Settings, CartItem, Variant } from "./types";
import { DEFAULT_MENU, DEFAULT_SETTINGS } from "./constants";
import { createPortal } from "react-dom";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User,
  updateProfile
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  orderBy, 
  onSnapshot, 
  updateDoc 
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access denied:", e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage write denied:", e);
    }
  },
  removeItem: (key: string): void => {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage removal denied:", e);
    }
  }
};
const localStorage = safeLocalStorage;

export default function App() {
  // --- STATE SYSTEM ---
  const [menu, setMenu] = useState<MenuItem[]>(DEFAULT_MENU);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem("amshi_admin_token") || null;
  });
  const [isDownloadedApp, setIsDownloadedApp] = useState<boolean>(() => {
    return localStorage.getItem("amshi_downloaded_app") === "true" || window.location.search.includes("app=downloaded");
  });
  const [appModalOpen, setAppModalOpen] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [qrTable, setQrTable] = useState<string>("4");
  const [qrLocation, setQrLocation] = useState<string>("Premium Lounge, Desk 4");

  const [currentHash, setCurrentHash] = useState<string>(() => window.location.hash);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>(" ");
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // GPS integration
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [diningPreference, setDiningPreference] = useState<"dine-in" | "delivery">("dine-in");
  const [locationModalOpen, setLocationModalOpen] = useState<boolean>(false);
  
  // Admin operational states
  const [activeAdminTab, setActiveAdminTab] = useState<"menu" | "qr" | "bookings">("menu");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Product Creation Modal Status
  const [productModalOpen, setProductModalOpen] = useState<boolean>(false);
  const [formProductId, setFormProductId] = useState<string>("");
  const [formProductName, setFormProductName] = useState<string>("");
  const [formProductCategory, setFormProductCategory] = useState<string>("Momos");
  const [formProductPrice, setFormProductPrice] = useState<number>(0);
  const [formProductType, setFormProductType] = useState<"veg" | "non-veg">("veg");
  const [formProductVariants, setFormProductVariants] = useState<string>("");
  const [formProductImg, setFormProductImg] = useState<string>("");
  const [formProductDesc, setFormProductDesc] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Global Toast Settings
  const [toastMessage, setToastMessage] = useState<string>("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
  const [toastActive, setToastActive] = useState<boolean>(false);

  // Firebase Authentication & Table Booking Storage States
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authName, setAuthName] = useState<string>("");
  const [authPhone, setAuthPhone] = useState<string>("");
  const [adminEmailInput, setAdminEmailInput] = useState<string>("sosanu491@gmail.com");
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>("sanu980@");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [enteredPins, setEnteredPins] = useState<{ [bookingId: string]: string }>({});
  const [printReceiptData, setPrintReceiptData] = useState<any | null>(null);
  const [bookingForm, setBookingForm] = useState({
    name: "",
    phone: "",
    tableNum: "",
    guests: 2,
    date: "",
    time: "18:00",
    requests: ""
  });

  // Ref structures
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // --- INITIAL BOOT & RE-SYNC ---
  useEffect(() => {
    // 1. Fetch menu and parameters
    const fetchData = async () => {
      try {
        setLoading(true);
        const [menuRes, settingsRes] = await Promise.all([
          fetch("/api/menu"),
          fetch("/api/settings")
        ]);
        
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setMenu(menuData);
        }
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
        }
      } catch (err) {
        console.error("Networking connection failed on initial boot", err);
        showToast("Server connection error, offline mode.", "error");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

    // 2. Parse Table badge from URL parameters (?table=5) or from URL fragments (#table=5)
    const params = new URLSearchParams(window.location.search);
    let tab = params.get("table");
    let loc = params.get("location");
    if (!tab) {
      // Check alternative hash attributes (e.g. #/?table=12 or similar)
      const matches = window.location.href.match(/[?&]table=(\d+)/);
      if (matches) {
        tab = matches[1];
      }
    }
    if (!loc) {
      const locMatches = window.location.href.match(/[?&]location=([^&]+)/);
      if (locMatches) {
        try {
          loc = decodeURIComponent(locMatches[1]);
        } catch (e) {
          loc = locMatches[1];
        }
      }
    }
    if (tab) {
      setTableNumber(tab);
      setDiningPreference("dine-in");
      if (loc) {
        setDeliveryAddress(loc);
        showToast(`Table QR Connected: Table ${tab} (${loc}) verified.`, "success");
      } else {
        setDeliveryAddress(`Table ${tab} Lobby`);
        showToast(`Table QR Connected: Table ${tab} verified.`, "success");
      }
    } else {
      setDiningPreference("delivery");
    }

    // 3. Hash routing changes event listener
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // --- FIREBASE SECURITY AUTH & REALTIME BOOKINGS PERSISTENCE SUBSCRIPTION ---
  useEffect(() => {
    // Attempt to hydrate local guest session first
    const storedGuest = localStorage.getItem("amshi_guest_session");
    if (storedGuest) {
      try {
        const guestData = JSON.parse(storedGuest);
        setFirebaseUser(guestData);
        setBookingForm(prev => ({
          ...prev,
          name: prev.name || guestData.displayName || guestData.email?.split("@")[0] || ""
        }));
        if (guestData.email === "sosanu491@gmail.com") {
          setAdminToken("verified-admin");
          localStorage.setItem("amshi_admin_token", "verified-admin");
        }
      } catch (e) {
        console.error("Failed to parse stored guest", e);
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        localStorage.removeItem("amshi_guest_session");
        setFirebaseUser(user);
        
        // Load custom user profile name if logged in
        let localName = "";
        let localPhone = "";
        const storedProfile = localStorage.getItem(`amshi_profile_${user.uid}`);
        if (storedProfile) {
          try {
            const p = JSON.parse(storedProfile);
            localName = p.name;
            localPhone = p.phone;
          } catch {}
        }

        setBookingForm(prev => ({
          ...prev,
          name: localName || user.displayName || prev.name || user.email?.split("@")[0] || "",
          phone: localPhone || prev.phone || ""
        }));

        if (user.email === "sosanu491@gmail.com") {
          setAdminToken("verified-admin");
          localStorage.setItem("amshi_admin_token", "verified-admin");
          showToast("Welcome Administrator! Session unlocked.", "success");
        } else {
          setAdminToken(null);
          localStorage.removeItem("amshi_admin_token");
        }
      } else {
        const currentGuest = localStorage.getItem("amshi_guest_session");
        if (currentGuest) {
          try {
            const guestData = JSON.parse(currentGuest);
            setFirebaseUser(guestData);
            if (guestData.email === "sosanu491@gmail.com") {
              setAdminToken("verified-admin");
              localStorage.setItem("amshi_admin_token", "verified-admin");
            } else {
              setAdminToken(null);
              localStorage.removeItem("amshi_admin_token");
            }
          } catch {
            setFirebaseUser(null);
            setAdminToken(null);
            localStorage.removeItem("amshi_admin_token");
            setUserBookings([]);
          }
        } else {
          setFirebaseUser(null);
          setAdminToken(null);
          localStorage.removeItem("amshi_admin_token");
          setUserBookings([]);
        }
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Subscribe to user bookings when firebaseUser changes
  useEffect(() => {
    if (!firebaseUser) return;
    try {
      const q = query(
        collection(db, "bookings"),
        where("userId", "==", firebaseUser.uid)
      );
      const unsubscribeBookings = onSnapshot(q, (snapshot) => {
        const bookingsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort descending by createdAt inside JS is robust if firestore index is not built yet
        bookingsList.sort((a: any, b: any) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setUserBookings(bookingsList);
      }, (error) => {
        console.error("Firestore onSnapshot error:", error);
        handleFirestoreError(error, OperationType.LIST, "bookings");
      });
      return () => unsubscribeBookings();
    } catch (err) {
      console.error("Error setting up user bookings subscription:", err);
    }
  }, [firebaseUser]);

  // Synchronize custom user profile details from Firestore
  useEffect(() => {
    if (!firebaseUser || firebaseUser.isGuest) return;
    
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const q = query(collection(db, "users"), where("uid", "==", firebaseUser.uid));
        const snap = await getDocs(q);
        if (snap.empty || !isMounted) return;
        
        const uDoc = snap.docs[0].data();
        if (uDoc.name && isMounted) {
          setBookingForm(prev => ({
            ...prev,
            name: uDoc.name,
            phone: uDoc.phone || prev.phone
          }));
          
          // Save locally to prevent excessive reads
          localStorage.setItem(`amshi_profile_${firebaseUser.uid}`, JSON.stringify({
            name: uDoc.name,
            phone: uDoc.phone || ""
          }));
        }
      } catch (err) {
        console.warn("Could not synchronize remote user profile:", err);
      }
    };
    
    loadProfile();
    return () => { isMounted = false; };
  }, [firebaseUser]);

  // Subscribe to all bookings for Admin Console View
  useEffect(() => {
    if (!adminToken) return;
    isInitialLoadRef.current = true; // Reset so initial load snapshot does not ring a sound
    try {
      const q = collection(db, "bookings");
      const unsubscribeAllBookings = onSnapshot(q, (snapshot) => {
        const bookingsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort descending
        bookingsList.sort((a: any, b: any) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });

        // Detect new incoming pending orders
        if (!isInitialLoadRef.current) {
          let hasNewPending = false;
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const itemData = change.doc.data();
              if (itemData && itemData.status === "pending") {
                hasNewPending = true;
              }
            }
          });
          if (hasNewPending) {
            playNotificationSound();
          }
        } else {
          isInitialLoadRef.current = false;
        }

        setAllBookings(bookingsList);
      }, (error) => {
        console.error("Firestore onSnapshot all bookings error:", error);
        handleFirestoreError(error, OperationType.LIST, "bookings");
      });
      return () => unsubscribeAllBookings();
    } catch (err) {
      console.error("Error setting up all bookings subscription:", err);
    }
  }, [adminToken]);

  // --- AUTOMATIC ADMIN BYPASS ROUTING & DOWNLOADED APP GUARDS ---
  useEffect(() => {
    if (isDownloadedApp && currentHash === "#admin") {
      window.location.hash = "";
      showToast("Access Restricted: Admin panel is not available on downloaded app.", "error");
    }
    if (currentHash === "#admin-login") {
      if (isDownloadedApp) {
        window.location.hash = "";
        showToast("Access Restricted: Admin credentials denied in downloaded App Mode.", "error");
      }
    }
  }, [currentHash, isDownloadedApp]);

  // --- ANIMATE HIGH-FIDELITY INTERACTIVE FLUID WAVE & STEAM VFX ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    // Dynamic resize handler
    const handleResize = () => {
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || 600;
    };
    window.addEventListener("resize", handleResize);

    // Types for high fidelity effects
    interface WaterDrop {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      color: string;
      life: number;
    }

    interface SteamBubble {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      maxLife: number;
      life: number;
      wobbleSpeed: number;
      wobbleRange: number;
    }

    interface FoodBob {
      x: number;
      y: number;
      val: string;
      size: number;
      angle: number;
      spinSpeed: number;
      bobOffset: number;
      speed: number;
    }

    interface MouseWave {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
      color: string;
    }

    // Initialize systems
    const drops: WaterDrop[] = [];
    const steam: SteamBubble[] = [];
    const mouseWakes: MouseWave[] = [];

    // Food floating in fluid currents
    const foodItems = ["🥟", "🍜", "🍹", "☕", "🌶️", "✨", "🥟", "🍹"];
    const foods: FoodBob[] = Array.from({ length: 12 }, (_, i) => ({
      x: (width / 12) * i + Math.random() * 30,
      y: height * 0.4 + Math.random() * (height * 0.3),
      val: foodItems[i % foodItems.length],
      size: Math.random() * 12 + 16,
      angle: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.015,
      bobOffset: Math.random() * 100,
      speed: Math.random() * 0.02 + 0.01,
    }));

    // Prepopulate some initial drips
    for (let i = 0; i < 20; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: Math.random() * 1.5 + 0.8,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.3,
        color: Math.random() > 0.4 ? "#C5A880" : "#38BDF8",
        life: 1
      });
    }

    // Dynamic wave settings
    const waves = [
      { y: height * 0.82, length: 0.003, amplitude: 16, speed: 0.03, phase: 0, color: "rgba(197, 168, 128, 0.15)" },
      { y: height * 0.85, length: 0.004, amplitude: 12, speed: -0.02, phase: Math.PI / 2, color: "rgba(56, 189, 248, 0.12)" },
      { y: height * 0.88, length: 0.002, amplitude: 22, speed: 0.015, phase: Math.PI, color: "rgba(15, 23, 42, 0.45)" }
    ];

    // Listen to mouse actions directly on Hero section parent
    const parent = canvas.parentElement;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = parent?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Spawn subtle water droplets on movement
      if (Math.random() < 0.25) {
        drops.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 1.2 + 0.5,
          radius: Math.random() * 2.5 + 1.2,
          alpha: 0.8,
          color: Math.random() > 0.5 ? "#C5A880" : "#38BDF8",
          life: 1
        });
      }

      // Spawn delicate steam puffs of heat
      if (Math.random() < 0.1) {
        steam.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -(Math.random() * 0.7 + 0.3),
          radius: Math.random() * 6 + 4,
          alpha: 0.45,
          maxLife: Math.random() * 60 + 50,
          life: 0,
          wobbleSpeed: Math.random() * 0.05 + 0.01,
          wobbleRange: Math.random() * 1.5 + 0.5
        });
      }
    };

    const handleMouseClick = (e: MouseEvent) => {
      const rect = parent?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Big concentric golden water splash wake
      mouseWakes.push({
        x,
        y,
        radius: 2,
        maxRadius: 110,
        alpha: 0.8,
        color: "#C5A880"
      });

      mouseWakes.push({
        x,
        y,
        radius: 12,
        maxRadius: 85,
        alpha: 0.6,
        color: "#38BDF8"
      });

      // Scatter instant sparkling particles
      for (let i = 0; i < 18; i++) {
        drops.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6 - 2,
          radius: Math.random() * 3 + 1,
          alpha: 0.9,
          color: Math.random() > 0.3 ? "#C5A880" : "#E2E8F0",
          life: 1
        });
      }
    };

    if (parent) {
      parent.addEventListener("mousemove", handleMouseMove);
      parent.addEventListener("click", handleMouseClick);
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const time = Date.now();

      // --- REALISTIC GENTLE CULINARY GLOWS & ELEMENTAL AMBIENCE ---
      const centerX = width / 2;
      const centerY = height * 0.42;

      // Subtle, soft luxury golden background pulse
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = "#C5A880";
      ctx.beginPath();
      ctx.arc(0, 0, 250, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- STYLIZED CHEWING/EATING MOUTH ANIMATION (व्यंजन आचमन) ---
      const mouthX = centerX;
      const mouthY = height * 0.35;
      const chewingCycle = Math.sin(time / 220); // cycle for chewing
      const mouthWidth = 46 + chewingCycle * 5;
      const mouthHeight = Math.max(2, 14 + chewingCycle * 11);

      ctx.save();
      ctx.translate(mouthX, mouthY);
      // Chewing glowing aura
      ctx.fillStyle = "rgba(197, 168, 128, 0.06)";
      ctx.beginPath();
      ctx.arc(0, 5, 35, 0, Math.PI * 2);
      ctx.fill();

      // Draw satisfied smiling cheeks
      ctx.strokeStyle = "#C5A880";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.65;
      
      // Left cheek dimple
      ctx.beginPath();
      ctx.arc(-mouthWidth / 2 - 4, -4, 4, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();

      // Right cheek dimple
      ctx.beginPath();
      ctx.arc(mouthWidth / 2 + 4, -4, 4, Math.PI * 1.5, Math.PI * 0.5);
      ctx.stroke();

      // Animated Chewing Lip / Smiling Mouth
      ctx.beginPath();
      ctx.moveTo(-mouthWidth / 2, 0);
      // Quadratic curve for lower lip, which opens & closes based on chewing rate
      ctx.quadraticCurveTo(0, mouthHeight, mouthWidth / 2, 0);
      ctx.quadraticCurveTo(0, mouthHeight / 2 - 2, -mouthWidth / 2, 0);
      ctx.fillStyle = "rgba(19, 21, 26, 0.8)";
      ctx.fill();
      ctx.strokeStyle = "#C5A880";
      ctx.stroke();

      // Sparkling flavor notes entering the mouth
      if (Math.random() < 0.15) {
        drops.push({
          x: mouthX + (Math.random() - 0.5) * 60,
          y: mouthY - 35,
          vx: (Math.random() - 0.5) * 1,
          vy: 2.2,
          radius: Math.random() * 2 + 1,
          alpha: 0.9,
          color: "#C5A880",
          life: 1
        });
      }

      ctx.restore();


      // --- HOLOGRAPHIC TRANSLUCENT COLLECTING BOWL (पात्र) ---
      const bowlX = centerX;
      const bowlY = height * 0.56;
      const bowlW = 100;
      const bowlH = 40;

      ctx.save();
      ctx.translate(bowlX, bowlY);
      ctx.globalAlpha = 0.45;

      // Outer golden glow of the bowl
      ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
      ctx.beginPath();
      ctx.ellipse(0, bowlH / 2, bowlW, bowlH, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bowl outline
      ctx.strokeStyle = "#C5A880";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Draw top ellipse of bowl
      ctx.ellipse(0, 0, bowlW / 2, 8, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Draw bottom bowl body
      ctx.beginPath();
      ctx.moveTo(-bowlW / 2, 0);
      ctx.quadraticCurveTo(-bowlW / 2 + 10, bowlH, 0, bowlH);
      ctx.quadraticCurveTo(bowlW / 2 - 10, bowlH, bowlW / 2, 0);
      ctx.strokeStyle = "rgba(197, 168, 128, 0.7)";
      ctx.stroke();

      // Fluid liquid level inside the bowl
      ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
      ctx.beginPath();
      ctx.ellipse(0, 2 + Math.sin(time / 300) * 1.5, bowlW / 2 - 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();


      // 1. Draw Liquid Ripples / Waves at bottom of Hero
      waves.forEach((w) => {
        w.phase += w.speed;
        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let x = 0; x <= width; x += 4) {
          const waveY = w.y + Math.sin(x * w.length + w.phase) * w.amplitude;
          ctx.lineTo(x, waveY);
        }

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = w.color;
        ctx.fill();
      });

      // 2. Render and update interactive mouse clicks
      for (let i = mouseWakes.length - 1; i >= 0; i--) {
        const w = mouseWakes[i];
        w.radius += 2.2;
        w.alpha -= 0.015;

        if (w.alpha <= 0 || w.radius >= w.maxRadius) {
          mouseWakes.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = w.alpha;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Spontaneous water spray generator (Simulating dripping/flowing fresh water)
      if (Math.random() < 0.35 && drops.length < 30) {
        // Many particles fall directly into the center bowl or mouth
        const targetCenterX = Math.random() < 0.65 ? (centerX + (Math.random() - 0.5) * 80) : (Math.random() * width);
        drops.push({
          x: targetCenterX,
          y: -10,
          vx: targetCenterX === centerX ? 0 : (Math.random() - 0.5) * 0.4,
          vy: Math.random() * 3 + 1.5,
          radius: Math.random() * 2 + 1,
          alpha: Math.random() * 0.6 + 0.3,
          color: Math.random() > 0.4 ? "#38BDF8" : "#C5A880",
          life: 1
        });
      }

      // 4. Culinary food aroma steam rising (Aromatic smoke/clouds VFX)
      if (Math.random() < 0.15 && steam.length < 12) {
        steam.push({
          x: Math.random() * width,
          y: height + 10,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -(Math.random() * 0.6 + 0.4),
          radius: Math.random() * 14 + 6,
          alpha: 0.35,
          maxLife: Math.random() * 160 + 120,
          life: 0,
          wobbleSpeed: Math.random() * 0.03 + 0.01,
          wobbleRange: Math.random() * 2 + 0.5
        });
      }

      // 5. Draw & Update falling water beads
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.045; // gravity factor

        // Splash on checking bowl surface
        if (Math.abs(d.x - bowlX) < bowlW / 2 && Math.abs(d.y - bowlY) < 10) {
          // splash on the holographic plate
          if (drops.length < 35) {
            for (let splashCount = 0; splashCount < 3; splashCount++) {
              drops.push({
                x: d.x,
                y: d.y,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 1.5 - 0.5,
                radius: d.radius * 0.7,
                alpha: d.alpha * 0.8,
                color: "#38BDF8",
                life: 1
              });
            }
          }
          drops.splice(i, 1);
          continue;
        }

        // Splash on wave interface
        if (d.y >= height * 0.83) {
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.radius * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = d.color;
          ctx.globalAlpha = d.alpha * 0.5;
          ctx.fill();

          drops.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.vx * 1.5, d.y - d.vy * 1.5);
        ctx.strokeStyle = d.color;
        ctx.lineWidth = d.radius;
        ctx.lineCap = "round";
        ctx.globalAlpha = d.alpha;
        ctx.stroke();
      }

      // 6. Draw & Update aromatic steam puffs (Steaming kitchen effect)
      for (let i = steam.length - 1; i >= 0; i--) {
        const s = steam[i];
        s.life++;
        s.y += s.vy;
        s.x += s.vx + Math.sin(s.life * s.wobbleSpeed) * s.wobbleRange * 0.1;
        s.radius += 0.06;

        const prog = s.life / s.maxLife;
        const currentAlpha = s.alpha * (1 - prog);

        if (s.life >= s.maxLife || currentAlpha <= 0) {
          steam.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = `rgba(229, 213, 192, ${currentAlpha * 0.18})`;
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 7. Draw & Update Gourmet Food bobbing slowly in visual space
      foods.forEach((f) => {
        f.bobOffset += f.speed;
        const currentY = f.y + Math.sin(f.bobOffset) * 12;
        f.angle += f.spinSpeed;

        ctx.save();
        ctx.translate(f.x, currentY);
        ctx.rotate(f.angle);
        ctx.globalAlpha = 0.58;
        ctx.font = `${f.size}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(f.val, 0, 0);

        ctx.beginPath();
        ctx.arc(0, 0, f.size * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(197,168,128,0.06)";
        ctx.fill();

        ctx.restore();
      });

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (parent) {
        parent.removeEventListener("mousemove", handleMouseMove);
        parent.removeEventListener("click", handleMouseClick);
      }
      cancelAnimationFrame(animFrameId);
    };
  }, [loading]);

  // --- INTEGRATED GEOLOCATION ENGINE ---
  const requestGPSCoordinates = () => {
    setLocationModalOpen(true);
  };

  const confirmAndRequestGPS = () => {
    setLocationModalOpen(false);
    if (!navigator.geolocation) {
      showToast("Your browser does not support GPS Geolocation.", "error");
      return;
    }
    setGpsLoading(true);
    showToast("Contacting satellites... Please click allow.", "info");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoordinates(coords);
        setGpsLoading(false);
        showToast("精准 coordinates verified!", "success");
      },
      (err) => {
        console.error("GPS fetching error", err);
        setGpsLoading(false);
        showToast("GPS Blocked. Please provide address detail manually.", "error");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const closeLocationModal = () => {
    setLocationModalOpen(false);
  };

  // --- THEME & INTEGRATED ACCENTS PRESETS ---
  const themeColors = {
    "black-gold": { primary: "#C5A880", light: "#E5D5C0", dark: "#9A7D56", textHex: "text-gold" },
    "royal-red": { primary: "#e11d48", light: "#fda4af", dark: "#9f1239", textHex: "text-rose-500" },
    "forest-green": { primary: "#10b981", light: "#6ee7b7", dark: "#065f46", textHex: "text-emerald-500" },
  };

  const currentTheme = themeColors[settings.theme] || themeColors["black-gold"];
  const dynamicThemeCSS = {
    "--color-gold": currentTheme.primary,
    "--color-gold-light": currentTheme.light,
    "--color-gold-dark": currentTheme.dark,
  } as React.CSSProperties;

  // --- ACTIONS: CART DISPATCH SYSTEMS ---
  const addToCart = (product: MenuItem, selectedVariant: Variant | null) => {
    setCart((prevCart) => {
      // Find matching item in cart (by ID and matching variant name if applicable)
      const existingIdx = prevCart.findIndex(
        (c) =>
          c.product.id === product.id &&
          ((!selectedVariant && !c.selectedVariant) ||
            (selectedVariant && c.selectedVariant && c.selectedVariant.name === selectedVariant.name))
      );

      if (existingIdx !== -1) {
        const nextCart = [...prevCart];
        nextCart[existingIdx].quantity += 1;
        showToast(`${product.name} increased in basket.`, "success");
        return nextCart;
      } else {
        showToast(`${product.name} added to basket.`, "success");
        return [...prevCart, { product, selectedVariant, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((_, idx) => idx !== index));
      showToast("Dish removed from basket.", "info");
      return;
    }
    setCart((prev) => {
      const nextCart = [...prev];
      nextCart[index].quantity = quantity;
      return nextCart;
    });
  };

  const getCartTotals = () => {
    const baseSubtotal = cart.reduce((total, item) => {
      const price = item.selectedVariant ? item.selectedVariant.price : item.product.price;
      return total + price * item.quantity;
    }, 0);

    const taxAmount = parseFloat(((baseSubtotal * settings.tax) / 100).toFixed(2));
    const deliveryFees = diningPreference === "delivery" ? settings.delivery : 0;
    const granTotal = parseFloat((baseSubtotal + taxAmount + deliveryFees).toFixed(2));

    return { baseSubtotal, taxAmount, deliveryFees, granTotal };
  };

  // --- DISPATCH WHATSAPP EXCELLENCE PAYLOAD ---
  const sendOrderViaWhatsApp = () => {
    if (cart.length === 0) {
      showToast("Order Basket is empty!", "error");
      return;
    }

    const { baseSubtotal, taxAmount, deliveryFees, granTotal } = getCartTotals();
    const cleanWhatsAppPhone = settings.whatsapp.replace(/\D/g, ""); // Clean formatting

    // Header Blocks
    let text = `*🍁 AMSHI CAFE ORDER FORM 🍁*\n`;
    text += `===================================\n`;
    text += `*⌚ Ordered On:* ${new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}\n`;
    
    if (diningPreference === "dine-in") {
      text += `*🍽️ Service Preference:* *DINE-IN*\n`;
      text += `*🪑 Table Identifier:* *Table No: ${tableNumber || "General Lobby"}*\n`;
    } else {
      text += `*🛵 Service Preference:* *HOME DELIVERY / TAKE AWAY*\n`;
      if (deliveryAddress.trim()) {
        text += `*🏠 Deliver To:* ${deliveryAddress.trim()}\n`;
      }
      if (gpsCoordinates) {
        text += `*📍 Verified GPS Location:* https://www.google.com/maps?q=${gpsCoordinates.lat},${gpsCoordinates.lng}\n`;
      } else {
        text += `*⚠️ Geolocation status:* GPS coordinates not pre-verified by customer.\n`;
      }
    }
    text += `===================================\n\n`;

    // Dishes Loop
    text += `*🛍️ ORDERED DISHES:*\n`;
    cart.forEach((item, index) => {
      const activePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
      const variantLabel = item.selectedVariant ? ` (${item.selectedVariant.name})` : "";
      text += `${index + 1}. *${item.product.name}${variantLabel}* x ${item.quantity}  👉  ₹${activePrice * item.quantity}\n`;
    });
    text += `\n`;

    // Cost Breakdown Summary
    text += `===================================\n`;
    text += `*Base Subtotal:* ₹${baseSubtotal}\n`;
    text += `*Taxes / GST (${settings.tax}%):* ₹${taxAmount}\n`;
    if (diningPreference === "delivery" && settings.delivery > 0) {
      text += `*Convenience / Service Charge:* ₹${deliveryFees}\n`;
    }
    text += `*---------------------------------*\n`;
    text += `*💰 GRAND TOTAL:* *₹${granTotal}*\n`;
    text += `===================================\n\n`;
    text += `_Draft has been dispatched automatically from Amshi QR Table client._`;

    // Build trigger link
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/${cleanWhatsAppPhone}?text=${encodedText}`;

    // Prompt redirection and empty customer parameters state
    try {
      const waWin = window.open(whatsappUrl, "_blank");
      if (!waWin) {
        window.location.href = whatsappUrl;
      }
    } catch (e) {
      window.location.href = whatsappUrl;
    }
    showToast("Redirection to WhatsApp secure window triggered!", "success");
    setCart([]);
    setCartOpen(false);
  };

  // --- ACTIONS: ADMIN CONSOLE OPERATIONS ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!adminEmailInput || !adminPasswordInput) {
      setLoginError("Email and Password fields are required.");
      return;
    }

    // Strict admin credential checks according to user prompt
    if (adminEmailInput === "sosanu491@gmail.com" && adminPasswordInput === "sanu980@") {
      try {
        // Attempt standard Firebase Auth for Admin
        try {
          await signInWithEmailAndPassword(auth, adminEmailInput, adminPasswordInput);
        } catch (firebaseErr: any) {
          console.warn("Standard Firebase Auth for Admin login failed or not provisioned yet. Proceeding with local override...", firebaseErr);
        }
        setAdminToken("verified-admin");
        localStorage.setItem("amshi_admin_token", "verified-admin");
        setAdminEmailInput("");
        setAdminPasswordInput("");
        window.location.hash = "#admin";
        showToast("Welcome Administrator! Access granted.", "success");
      } catch (err: any) {
        setLoginError("An unexpected error occurred.");
      }
    } else {
      // "agar koi kuch or signup ya login kre to customer ka khule"
      try {
        try {
          await signInWithEmailAndPassword(auth, adminEmailInput, adminPasswordInput);
          showToast("Signed in as Customer successfully.", "success");
          setAdminEmailInput("");
          setAdminPasswordInput("");
          window.location.hash = ""; // Return to main screen
          setBookingModalOpen(true); // Open their account panel
        } catch (firebaseErr: any) {
          if (firebaseErr.code === "auth/operation-not-allowed" || firebaseErr.code === "auth/auth-domain-config-required") {
            console.warn("Firebase Auth disabled. Falling back to local customer session...");
            const guestUser = {
              uid: "local_guest_" + adminEmailInput.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Math.floor(Math.random() * 1000000),
              email: adminEmailInput,
              displayName: adminEmailInput.split("@")[0],
              isGuest: true
            };
            localStorage.setItem("amshi_guest_session", JSON.stringify(guestUser));
            setFirebaseUser(guestUser);
            
            showToast("Signed in as Customer (Local Session).", "success");
            setAdminEmailInput("");
            setAdminPasswordInput("");
            window.location.hash = "";
            setBookingModalOpen(true);
          } else {
            throw firebaseErr;
          }
        }
      } catch (firebaseErr: any) {
        console.error("Firebase customer login attempt fail", firebaseErr);
        let errMsg = "Incorrect credentials. Only the Master Admin can access this panel.";
        if (firebaseErr.code === "auth/invalid-credential") {
          errMsg = "Incorrect email or security password.";
        }
        setLoginError(errMsg);
        showToast(errMsg, "error");
      }
    }
  };

  const adminLogout = () => {
    setAdminToken(null);
    localStorage.removeItem("amshi_admin_token");
    window.location.hash = "";
    showToast("Logged out of Admin Console safely.", "success");
  };

  // --- ACTIONS: USER AUTHENTICATION & FIREBASE DATA TRANSACTIONS ---
  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    
    if (!authEmail || !authPassword) {
      setAuthError("Email and password fields cannot be left blank.");
      setAuthLoading(false);
      return;
    }

    // Auto-check for standard Admin credentials in normal user section too!
    const checkEmail = authEmail.trim().toLowerCase();
    const checkPassword = authPassword.trim();
    if (checkEmail === "sosanu491@gmail.com" && checkPassword === "sanu980@") {
      try {
        try {
          await signInWithEmailAndPassword(auth, checkEmail, checkPassword);
        } catch (fbErr) {
          console.warn("Admin standard authentication issue, proceeding with session activation...", fbErr);
        }
        setAdminToken("verified-admin");
        localStorage.setItem("amshi_admin_token", "verified-admin");
        setBookingModalOpen(false);
        setAuthEmail("");
        setAuthPassword("");
        window.location.hash = "#admin";
        showToast("Welcome Administrator! Opened Management Panel.", "success");
        setAuthLoading(false);
        return;
      } catch (err: any) {
        console.error("Admin signin override failure", err);
      }
    }
    
    try {
      if (authMode === "signin") {
        // Enforce strict registration check: "glt register user se login na ho"
        if (authEmail.trim().toLowerCase() !== "sosanu491@gmail.com") {
          const checkQuery = query(collection(db, "users"), where("email", "==", authEmail.trim().toLowerCase()));
          const userSnap = await getDocs(checkQuery);
          if (userSnap.empty) {
            throw { code: "auth/user-not-found", message: "This email is not registered (यह ईमेल पंजीकृत नहीं है). Please Sign Up first." };
          }
        }

        try {
          await signInWithEmailAndPassword(auth, authEmail, authPassword);
          showToast("Signed in as " + authEmail + " successfully.", "success");
          setBookingModalOpen(false); // Close Modal on clean login
        } catch (firebaseErr: any) {
          // Fallback to local session if auth provider is disabled or missing
          if (firebaseErr.code === "auth/operation-not-allowed" || firebaseErr.code === "auth/auth-domain-config-required") {
            console.warn("Firebase Auth Email/Password disabled or unavailable. Falling back to local session...");
            const guestUser = {
              uid: "local_guest_" + authEmail.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Math.floor(Math.random() * 1000000),
              email: authEmail,
              displayName: authEmail.split("@")[0],
              isGuest: true
            };
            localStorage.setItem("amshi_guest_session", JSON.stringify(guestUser));
            setFirebaseUser(guestUser);
            setBookingForm(prev => ({
              ...prev,
              name: prev.name || guestUser.displayName || guestUser.email?.split("@")[0] || ""
            }));
            showToast("Signed in as " + authEmail + " (Local Guest Session)", "success");
            setBookingModalOpen(false);
          } else {
            throw firebaseErr; // Reraise other errors
          }
        }
      } else {
        // Sign Up Mode
        if (!authName) {
          setAuthError("Your full name must be typed to create an account.");
          setAuthLoading(false);
          return;
        }
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
          const registeredUser = userCredential.user;
          
          // Update profile display name immediately
          try {
            await updateProfile(registeredUser, { displayName: authName });
          } catch (profErr) {
            console.warn("Failed to set display name on auth profile:", profErr);
          }

          // Store name & details in Firestore "users" collection
          try {
            await addDoc(collection(db, "users"), {
              uid: registeredUser.uid,
              name: authName,
              phone: authPhone,
              email: authEmail,
              createdAt: new Date().toISOString()
            });
          } catch (docErr) {
            console.warn("Failed to write to users collection, continuing locally...", docErr);
          }

          // Cache profile details locally for fast reference
          localStorage.setItem(`amshi_profile_${registeredUser.uid}`, JSON.stringify({
            name: authName,
            phone: authPhone
          }));

          // Log the user out immediately as requested: "phly sign up krn hoga name sb dalke fir signin"
          await signOut(auth);

          showToast("Profile created successfully! Please sign in with your email/password.", "success");
          setAuthMode("signin");
          // Keep the email populated to make signing in faster
          setAuthPassword("");
        } catch (firebaseErr: any) {
          // Fallback to local session if auth provider is disabled or missing
          if (firebaseErr.code === "auth/operation-not-allowed" || firebaseErr.code === "auth/auth-domain-config-required") {
            console.warn("Firebase Auth Email/Password disabled or unavailable. Falling back to local session...");
            const guestUser = {
              uid: "local_guest_" + authEmail.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Math.floor(Math.random() * 1000000),
              email: authEmail,
              displayName: authName || authEmail.split("@")[0],
              isGuest: true
            };
            localStorage.setItem("amshi_guest_session", JSON.stringify(guestUser));
            setFirebaseUser(guestUser);
            setBookingForm(prev => ({
              ...prev,
              name: authName || guestUser.displayName || "",
              phone: authPhone || ""
            }));
            
            localStorage.setItem(`amshi_profile_${guestUser.uid}`, JSON.stringify({
              name: authName || guestUser.displayName,
              phone: authPhone || ""
            }));

            showToast("Account created as " + authEmail + " (Local Guest Session)", "success");
            setBookingModalOpen(false);
          } else {
            throw firebaseErr; // Reraise other errors
          }
        }
      }
      // Reset inputs
      setAuthName("");
      setAuthPhone("");
    } catch (err: any) {
      console.error("Firebase auth transaction failed", err);
      let errMsg = err.message || "Authentication error occurred.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        errMsg = "Incorrect password! Please enter correct credentials (गलत पासवर्ड!).";
      } else if (err.code === "auth/user-not-found") {
        errMsg = err.message || "This email is not registered (यह ईमेल पंजीकृत नहीं है). Please Sign Up first.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "This email is already registered. Please sign in instead.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "The password is too weak. Must be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Please format your email address correctly.";
      }
      setAuthError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleFirebaseLogout = async () => {
    try {
      localStorage.removeItem("amshi_guest_session");
      await signOut(auth);
      setFirebaseUser(null);
      showToast("Signed out of your Amshi account.", "info");
    } catch (err) {
      console.error("Firebase logout failure", err);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      showToast("Please register or sign in to complete your order.", "error");
      return;
    }
    
    const { name, phone, tableNum, requests } = bookingForm;
    if (!name.trim() || !phone.trim()) {
      showToast("Please provide your name and phone number.", "error");
      return;
    }

    if (diningPreference === "delivery" && !deliveryAddress.trim()) {
      showToast("Please enter a delivery address for COD delivery.", "error");
      return;
    }

    if (cart.length === 0) {
      showToast("Your cart is empty! Please add dishes to place an order.", "error");
      return;
    }

    try {
      const selectedTable = diningPreference === "dine-in" 
        ? (tableNum ? parseInt(tableNum) : (tableNumber ? parseInt(tableNumber) : null))
        : null;

      const orderItems = cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.selectedVariant ? item.selectedVariant.price : item.product.price,
        variant: item.selectedVariant ? item.selectedVariant.name : null,
        quantity: item.quantity,
      }));

      const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

      const resData = {
        userId: firebaseUser.uid,
        userEmail: firebaseUser.email || "guest@amshi.com",
        name: name.trim(),
        phone: phone.trim(),
        tableNum: selectedTable,
        guests: 1,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }),
        requests: requests.trim(),
        deliveryAddress: diningPreference === "delivery" ? deliveryAddress.trim() : "",
        diningPreference,
        status: "pending",
        createdAt: new Date().toISOString(),
        items: orderItems,
        grandTotal: getCartTotals().granTotal,
        type: "cod_order",
        deliveryPin
      };
      
      await addDoc(collection(db, "bookings"), resData);
      showToast(`Order placed successfully via Cash on Delivery!`, "success");
      
      // Clear cart & close modals
      setCart([]);
      setCartOpen(false);
      setBookingModalOpen(false);

      // Reset request text
      setBookingForm(prev => ({
        ...prev,
        requests: ""
      }));
    } catch (err: any) {
      console.error("Failed to commit order to Firestore", err);
      showToast("Order placement failed: " + err.message, "error");
      handleFirestoreError(err, OperationType.CREATE, "bookings");
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { status: "cancelled" });
      showToast("Reservation cancelled successfully.", "info");
    } catch (err: any) {
      console.error("Firestore cancellation failed", err);
      showToast("Cancellation failed: " + err.message, "error");
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { status: newStatus });
      showToast(`Reservation status updated to ${newStatus}.`, "success");
    } catch (err: any) {
      console.error("Admin status update failed", err);
      showToast("Status update failed: " + err.message, "error");
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleVerifyDeliveryPin = async (bookingId: string, inputPin: string, correctPin: string) => {
    if (!inputPin || inputPin.trim() === "") {
      showToast("Please enter the delivery verification code (कृपया डिलीवरी कोड दर्ज करें).", "error");
      return;
    }
    if (inputPin.trim() === correctPin) {
      try {
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, { status: "delivered" });
        showToast("Delivery verified! Order completed successfully (डिलीवरी सफल!).", "success");
        setEnteredPins(prev => {
          const updated = { ...prev };
          delete updated[bookingId];
          return updated;
        });
      } catch (err: any) {
        console.error("Delivery status commit failed", err);
        showToast("Failed to complete delivery: " + err.message, "error");
      }
    } else {
      showToast("Incorrect Code! Delivery verification failed (गलत कोड दर्ज किया गया!).", "error");
    }
  };

  const handlePrintBooking = (booking: any) => {
    setPrintReceiptData(booking);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to permanently delete this reservation record?")) return;
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
      showToast("Reservation record permanently deleted.", "success");
    } catch (err: any) {
      console.error("Deletion failure:", err);
      showToast("Deletion failed: " + err.message, "error");
      handleFirestoreError(err, OperationType.DELETE, `bookings/${bookingId}`);
    }
  };

  const saveAdminSettings = async (updatedSettings: Settings) => {
    setSettings(updatedSettings);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (!res.ok) {
        showToast("Failed to write updated settings back to server.", "error");
      }
    } catch (err) {
      console.error("Error writing settings through cloud persistence", err);
    }
  };



  // --- DISH / DISH VARIANT SAVING WORKFLOWS ---
  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Parse Variants string safely
    // Format: Full:120,Half:80
    let parsedVariants: Variant[] | undefined = undefined;
    if (formProductVariants.trim()) {
      try {
        const parts = formProductVariants.split(",");
        parsedVariants = parts.map((p) => {
          const sub = p.split(":");
          if (sub.length !== 2) throw new Error("Invalid variant pairing tag");
          const priceVal = parseFloat(sub[1].trim());
          if (isNaN(priceVal)) throw new Error("Variant cost is not a number value");
          return { name: sub[0].trim(), price: priceVal };
        });
      } catch (err) {
        setFormError("Variants formatting must follow exactly: Full:120,Half:80 structure");
        return;
      }
    }

    const payload: MenuItem = {
      id: formProductId || undefined as any,
      name: formProductName,
      category: formProductCategory,
      price: formProductPrice,
      type: formProductType,
      desc: formProductDesc,
      img: formProductImg || "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80",
      variants: parsedVariants,
    };

    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local list
        setMenu((prev) => {
          if (formProductId) {
            return prev.map((item) => (item.id === formProductId ? data.item : item));
          } else {
            return [...prev, data.item];
          }
        });
        showToast("Gourmet dish entry captured and synchronized.", "success");
        closeProductModal();
      } else {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error || errorData?.message || res.statusText || `Status ${res.status}`;
        setFormError(`Write database constraints failure on host: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Critical communications layout crash", err);
      setFormError("Hardware network connection refused.");
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this dish item? This is non-reversible!")) {
      return;
    }
    try {
      const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMenu((prev) => prev.filter((item) => item.id !== id));
        showToast("Dish permanently deleted.", "success");
      } else {
        showToast("Error deleting item from express endpoint.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network link failed during delete request.", "error");
    }
  };

  const openProductModal = (item?: MenuItem) => {
    if (item) {
      setFormProductId(item.id);
      setFormProductName(item.name);
      setFormProductCategory(item.category);
      setFormProductPrice(item.price);
      setFormProductType(item.type);
      setFormProductDesc(item.desc);
      setFormProductImg(item.img);
      setFormProductVariants(
        item.variants ? item.variants.map((v) => `${v.name}:${v.price}`).join(",") : ""
      );
    } else {
      setFormProductId("");
      setFormProductName("");
      setFormProductCategory("Momos");
      setFormProductPrice(0);
      setFormProductType("veg");
      setFormProductDesc("");
      setFormProductImg("");
      setFormProductVariants("");
    }
    setFormError(null);
    setProductModalOpen(true);
  };

  const closeProductModal = () => {
    setProductModalOpen(false);
  };

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // First tone (E5, high chime)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.3);

      // Second tone (A5, higher sweet chord, slightly offset)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc2.start(audioCtx.currentTime + 0.15);
      osc2.stop(audioCtx.currentTime + 0.5);
    } catch (err) {
      console.warn("Web Audio chime failed to initialize:", err);
    }
  };

  // --- SYSTEM WIDE UTILITIES ---
  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setToastActive(true);
  };

  useEffect(() => {
    if (toastActive) {
      const timer = setTimeout(() => setToastActive(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastActive]);

  // Extract dynamically generated lists
  const categoriesList = ["All", ...Array.from(new Set(menu.map((m) => m.category)))];

  const filteredMenuProducts = menu.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const printAllQrCodes = () => {
    window.print();
  };

  const downloadTableQrCode = (tableNum: number) => {
    const baseAddress = settings.websiteUrl || (window.location.origin + window.location.pathname);
    const url = baseAddress.endsWith('/') ? `${baseAddress}?table=${tableNum}` : `${baseAddress}/?table=${tableNum}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    
    // Create an invisible anchor tag to dispatch downloads
    const a = document.createElement("a");
    a.href = qrUrl;
    a.target = "_blank";
    a.download = `Amshi_Table_${tableNum}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("QR code print window request triggered.", "success");
  };

  // Toggle Password Dot Reveal
  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  // Clear current active categories selection filters
  const resetFiltersField = () => {
    setSearchQuery(" ");
    setSelectedCategory("All");
  };

  // --- EXCELLENCE COMPILATION OF JSX VIEWS ---
  return (
    <div 
      className="min-h-screen text-gray-200 font-sans antialiased selection:bg-gold selection:text-dark-bg relative transition-colors duration-300"
      style={dynamicThemeCSS}
    >
      
      {/* 1. SOLID TOP FIXED NAVIGATION BAR */}
      <nav id="top-navbar" className="fixed top-0 left-0 right-0 z-40 bg-[#0F1115]/80 backdrop-blur-xl border-b border-gold/10 shadow-lg shadow-black/50 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 select-none">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Amshi logo" className="h-9 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl font-bold tracking-widest text-gold">
                  AMSHI CAFE
                </span>
              </div>
            )}
          </a>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">
              <span className="text-gold">Menu</span>
              <span className="hover:text-gold transition-colors cursor-pointer" onClick={() => showToast("Amshi cafe history: Handcrafted since 2012.", "info")}>Our Story</span>
              <span className="hover:text-gold transition-colors cursor-pointer" onClick={() => showToast("Reviewing visual presentation assets.", "info")}>Gallery</span>
            </nav>

            {/* Customer Orders & Auth Profile Toggle */}
            <button
              id="book-table-btn"
              onClick={() => {
                setBookingModalOpen(true);
                if (!bookingForm.date) {
                  const today = new Date().toISOString().split("T")[0];
                  setBookingForm(prev => ({ ...prev, date: today }));
                }
              }}
              className="bg-gold text-dark-bg hover:bg-white border border-gold px-5 py-2 rounded-lg text-[11px] uppercase font-black tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:shadow-[0_0_20px_rgba(212,175,55,0.6)] hover:scale-105 animate-pulse"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-dark-bg" /> Orders & Account
            </button>

            {tableNumber ? (
              <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-gold/40 bg-gold/10">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse"></span>
                <span className="text-[10px] font-bold text-gold uppercase tracking-widest">Table {tableNumber}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-gold/15 bg-gold/5">
                <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Digital Menu</span>
              </div>
            )}
            
            {/* Quick Administrator routing (Only visible when authenticated as admin) */}
            {!isDownloadedApp && adminToken && (
              currentHash === "#admin" ? (
                <button 
                  onClick={() => window.location.hash = ""} 
                  className="bg-[#181B22] border border-gold/20 hover:border-gold px-3.5 py-1.5 rounded text-[10px] uppercase tracking-wider text-gray-400 hover:text-gold transition-all flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5 text-gold" /> Menu
                </button>
              ) : (
                <button 
                  onClick={() => window.location.hash = "#admin"} 
                  className="bg-gold text-dark-bg hover:bg-gold-light font-black px-3.5 py-1.5 rounded text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> Admin
                </button>
              )
            )}
          </div>
        </div>
      </nav>

      {/* 2. LOADING SPLASH */}
      {loading ? (
        <div id="full-loading" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-dark-bg z-50">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gold/10 border-t-gold animate-spin"></div>
          </div>
          <p className="font-serif italic text-gold text-sm tracking-widest uppercase animate-pulse">Amshi Culinary Suite Loading...</p>
        </div>
      ) : (
        <>
          {/* CUSTOMER MENU INTERFACE VIEW */}
          {currentHash === "" && (
            <div id="customer-portal" className="pt-16 pb-28 relative">
              
              {/* HERO CHAMPION BANNER */}
              <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0 bg-dark-bg">
                  <div 
                    className="w-full h-full bg-cover bg-center animate-kenburns transition-all duration-700 opacity-90" 
                    style={{ backgroundImage: `linear-gradient(rgba(5, 6, 8, 0.72), rgba(5, 6, 8, 0.94)), url(${settings.bannerUrl})` }}
                  ></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent z-10"></div>
                
                {/* Full-width Realistic Liquid, Wave, Water & Steam Flow VFX */}
                <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-15 mix-blend-screen opacity-75"></canvas>
                
                {/* Embedded Particles container */}
                <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
                  <div className="particle" style={{ left: "10%", animationDelay: "1s", animationDuration: "14s" }}></div>
                  <div className="particle" style={{ left: "25%", animationDelay: "4s", animationDuration: "19s" }}></div>
                  <div className="particle" style={{ left: "55%", animationDelay: "2s", animationDuration: "15s" }}></div>
                  <div className="particle" style={{ left: "75%", animationDelay: "8s", animationDuration: "23s" }}></div>
                  <div className="particle" style={{ left: "90%", animationDelay: "3s", animationDuration: "12s" }}></div>
                </div>

                <div className="relative z-20 text-center px-4 max-w-4xl mx-auto space-y-6 flex flex-col items-center justify-center pt-8">
                  <span className="text-gold uppercase tracking-[0.3em] font-semibold text-xs animate-pulse">AMSHI GOURMET EXPERIENCE</span>
                  
                  {/* Dynamic background canvas space */}
                  <div className="relative w-full max-w-lg overflow-hidden py-1">
                    
                    <div className="relative z-20 select-none">
                      <h1 className="text-6xl md:text-8xl text-white font-serif font-semibold tracking-tight text-3d-gold">
                        AMSHI
                      </h1>
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-gold"></div>
                        <h2 className="font-serif text-2xl md:text-4xl text-gold font-light italic tracking-widest uppercase">
                          Cafe
                        </h2>
                        <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-gold"></div>
                      </div>
                    </div>
                  </div>

                  {/* Coffee cup steaming mockup icon */}
                  <div className="w-20 h-16 mx-auto select-none flex items-end justify-center relative">
                    <svg viewBox="0 0 100 80" className="w-14 h-14 drop-shadow-[0_0_8px_rgba(197,168,128,0.3)]">
                      <g stroke="#E5D5C0" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7">
                        <path d="M42 35 Q38 25 44 15 T38 -5" className="steam-line-1"/>
                        <path d="M50 35 Q46 22 52 10 T46 -10" className="steam-line-2"/>
                        <path d="M58 35 Q54 28 60 18 T54 -2" className="steam-line-3"/>
                      </g>
                      <path d="M30 40 L35 70 C36 74, 64 74, 65 70 L70 40 Z" fill="#8d5538"/>
                      <rect x="32" y="48" width="36" height="4" fill="#C5A880"/>
                      <path d="M70 45 Q80 50 70 58" fill="none" stroke="#8d5538" strokeWidth="4.5" strokeLinecap="round"/>
                      <ellipse cx="50" cy="40" rx="20" ry="4" fill="#5c2e16"/>
                    </svg>
                  </div>

                  <p className="text-gray-400 text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
                    Indulge in our artisan pastries, rich spiced momos, premium mocktails, and fresh gourmet bites. Order directly from your table for contactless luxury.
                  </p>
                  
                  <div className="pt-2">
                    <a 
                      href="#menu-section" 
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold text-dark-bg font-bold px-8 py-3.5 rounded-full shadow-lg shadow-gold/25 hover:scale-105 transition-all text-xs uppercase tracking-widest border border-gold-light/20 inline-flex items-center gap-2"
                    >
                      Browse Specially Catalog
                    </a>
                  </div>
                </div>
              </section>

              {/* DYNAMIC PRODUCTS WRAPPER AREA */}
              <main id="menu-section" className="max-w-7xl mx-auto px-4 py-16 space-y-12 scroll-mt-20">
                


                {/* Integrated Search controller */}
                <div className="relative max-w-xl mx-auto">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                    <Search className="w-5 h-5 text-gold/70" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search Amshi specialities, momos, beverages..." 
                    value={searchQuery.trim() === "" ? "" : searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0F1115]/80 backdrop-blur-sm border border-gold/20 hover:border-gold/50 focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/20 text-white rounded-2xl py-4 pl-12 pr-12 transition-all duration-300 placeholder-gray-500 text-sm shadow-xl shadow-black/50"
                  />
                  {searchQuery !== " " && (
                    <button 
                      onClick={() => setSearchQuery(" ")} 
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Categories Tab Drawer */}
                <div className="flex items-center gap-6 overflow-x-auto py-3 px-6 bg-dark-accent/20 rounded-2xl border border-gold/15 backdrop-blur-md hide-scrollbar scroll-smooth justify-start md:justify-center shadow-inner">
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex-shrink-0 text-[10px] uppercase tracking-widest font-bold pb-2 transition-all cursor-pointer focus:outline-none ${
                        selectedCategory === cat 
                          ? "text-gold border-b-2 border-gold font-black" 
                          : "text-gray-500 hover:text-white border-b-2 border-transparent"
                      }`}
                    >
                      {cat === "All" ? "Signature Selection" : cat}
                    </button>
                  ))}
                </div>

                {/* Responsive grid display catalog */}
                {filteredMenuProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredMenuProducts.map((dish) => {
                      // Manage localized state block inside render loop for variants
                      return (
                        <MenuItemCard 
                          key={dish.id} 
                          dish={dish} 
                          onAddToBasket={(product, variant) => addToCart(product, variant)} 
                          textHexColor={currentTheme.textHex}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-24 space-y-4">
                    <AlertTriangle className="w-12 h-12 mx-auto text-gold/40" />
                    <h3 className="text-xl font-medium text-white">No culinary matches listed</h3>
                    <p className="text-xs text-gray-500">Try modifying your search or reset filters</p>
                    <button 
                      onClick={resetFiltersField}
                      className="bg-dark-accent text-gold text-xs font-semibold px-4 py-2 rounded-lg border border-gold/20 hover:bg-gold hover:text-dark-bg transition-all"
                    >
                      Clear Search Filters
                    </button>
                  </div>
                )}
              </main>

              {/* ACTIVE BASKET FLOATING BAR CONTROLS */}
              {cart.length > 0 && (
                <div 
                  id="floating-basket-bar" 
                  className="fixed bottom-6 left-1/2 -translate-x-1/2 z-35 w-[92%] max-w-md bg-[#0F1115]/95 backdrop-blur-xl border border-gold/30 p-4 rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-gold text-[#050608] w-10 h-10 rounded-lg flex items-center justify-center relative shadow-md">
                      <ShoppingBasket className="w-5 h-5 text-[#050608]" />
                      <span className="absolute -top-1.5 -right-1.5 bg-white text-[#050608] text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border border-[#050608]">
                        {cart.reduce((acum, c) => acum + c.quantity, 0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Estimated Total</p>
                      <p className="font-bold text-lg leading-none text-white tracking-tight">₹{getCartTotals().granTotal}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setCartOpen(true)}
                    className="bg-gold hover:bg-gold-light text-[#050608] font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    Confirm Order <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. SECURE PASSCODE SCREEN FOR MERCHANTS */}
          {currentHash === "#admin-login" && (
            <div id="staff-auth-portal" className="min-h-screen flex items-center justify-center px-4 relative pt-16">
              <div className="absolute w-[350px] h-[350px] rounded-full bg-gold/5 blur-[120px] top-1/4 left-1/4 pointer-events-none"></div>
              
              <div className="w-full max-w-md bg-dark-card/45 backdrop-blur-xl border border-gold/15 p-8 rounded-3xl shadow-2xl space-y-6 relative z-10">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-14 h-14 bg-gold/10 border border-gold/30 rounded-full flex items-center justify-center text-gold shadow-lg shadow-gold/5">
                    <Lock className="w-6 h-6 text-gold animate-pulse" />
                  </div>
                  <h2 className="font-serif text-3xl text-white font-bold tracking-wider">MEMBER PORTAL</h2>
                  <p className="text-[10px] text-gold uppercase tracking-[0.2em] font-semibold">Management Authenticator</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {loginError && (
                    <div className="p-3 bg-red-950/25 border border-red-500/25 text-red-400 text-xs font-semibold rounded-xl animate-fadeIn">
                      {loginError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gold uppercase tracking-widest font-extrabold block">Email Address (ईमेल)</label>
                    <input 
                      type="email" 
                      required 
                      value={adminEmailInput}
                      onChange={(e) => setAdminEmailInput(e.target.value)}
                      placeholder="E.g. member@example.com" 
                      className="w-full bg-[#181B22] border border-gray-700/50 focus:border-gold focus:outline-none rounded-xl py-3 px-4 text-xs text-white placeholder-gray-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gold uppercase tracking-widest font-extrabold block">Security Password (पासवर्ड)</label>
                    <div className="relative">
                      <input 
                        type={passwordVisible ? "text" : "password"} 
                        required 
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full bg-[#181B22] border border-gray-700/50 focus:border-gold focus:outline-none rounded-xl py-3 pl-4 pr-10 text-xs text-white placeholder-gray-500"
                      />
                      <button 
                        type="button" 
                        onClick={togglePasswordVisibility} 
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gold"
                      >
                        {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold text-dark-bg font-extrabold py-3.5 rounded-xl transition-all text-xs uppercase tracking-widest border border-gold-light/20 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    Authenticate User
                  </button>
                </form>

                <div className="text-center pt-2">
                  <button 
                    onClick={() => window.location.hash = ""} 
                    className="text-[11px] text-gray-500 hover:text-gold uppercase tracking-widest transition-colors font-medium"
                  >
                    ← Return to Dining Room
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. MASTER CONSOLE FOR CAFE ADMINS */}
          {currentHash === "#admin" && (
            <div id="full-admin-console" className="pt-24 pb-28 max-w-7xl mx-auto px-4 space-y-8 relative z-20">
              
              {!adminToken ? (
                <div className="text-center py-20 space-y-4">
                  <AlertTriangle className="w-14 h-14 mx-auto text-red-500" />
                  <h3 className="text-xl font-bold text-white">Access Violation</h3>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">Please authorize your credentials before manipulating dynamic datasets.</p>
                  <button 
                    onClick={() => window.location.hash = "#admin-login"}
                    className="bg-gold text-dark-bg font-bold px-5 py-2.5 rounded-lg text-xs hover:bg-gold-dark transition-all uppercase tracking-widest"
                  >
                    Authenticate Now
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gold/15 pb-6 gap-4">
                    <div>
                      <span className="text-xs text-gold font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Durable Server Persistence Synced</span>
                      </span>
                      <h1 className="font-serif text-3xl md:text-4xl text-white font-bold mt-1">Management Desk</h1>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                      <button 
                        onClick={() => openProductModal()}
                        className="bg-gold hover:bg-gold-dark text-dark-bg font-bold px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> Add Speciality
                      </button>
                      <button 
                        onClick={adminLogout}
                        className="bg-red-950/40 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest transition-all"
                      >
                        <LogOut className="w-4 h-4 mr-0.5 inline-block" /> Logout
                      </button>
                      <button 
                        onClick={() => window.location.hash = ""}
                        className="bg-dark-accent border border-gray-700 hover:border-gold text-gray-300 hover:text-gold px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest transition-all"
                      >
                        Exit Admin
                      </button>
                    </div>
                  </div>

                  {/* MASTER CAFE PARAMETERS SETUP */}
                  <div className="bg-dark-card border border-gold/10 p-6 rounded-2xl space-y-6 shadow-xl">
                    <h3 className="font-serif text-lg text-gold flex items-center gap-2">
                      <SettingsIcon className="w-5 h-5" /> Cafe Configurations
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gold uppercase tracking-wider font-bold">WhatsApp Recipient Number</label>
                        <input 
                          type="text" 
                          value={settings.whatsapp}
                          onChange={(e) => saveAdminSettings({ ...settings, whatsapp: e.target.value })}
                          className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-sm text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-gold uppercase tracking-wider font-bold">Custom Header Logo URL</label>
                        <input 
                          type="text" 
                          value={settings.logoUrl}
                          onChange={(e) => saveAdminSettings({ ...settings, logoUrl: e.target.value })}
                          placeholder="Leave empty for textual logo"
                          className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-sm-white text-xs placeholder-gray-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-gold uppercase tracking-wider font-bold">Hero Background Image URL</label>
                        <input 
                          type="text" 
                          value={settings.bannerUrl}
                          onChange={(e) => saveAdminSettings({ ...settings, bannerUrl: e.target.value })}
                          className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-sm-white text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-gold uppercase tracking-wider font-bold">Total Dining Tables (QR Count)</label>
                        <input 
                          type="number" 
                          min={1}
                          max={100}
                          value={settings.tables}
                          onChange={(e) => saveAdminSettings({ ...settings, tables: parseInt(e.target.value) || 1 })}
                          className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-sm-white text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-gold uppercase tracking-wider font-bold">Custom Web Domain URL</label>
                        <input 
                          type="text" 
                          placeholder="e.g. https://amshicafe.com"
                          value={settings.websiteUrl}
                          onChange={(e) => saveAdminSettings({ ...settings, websiteUrl: e.target.value })}
                          className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-sm-white text-xs placeholder-gray-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-gold uppercase tracking-wider font-bold">GST % Tax Rate</label>
                        <input 
                          type="number" 
                          min={0}
                          max={50}
                          value={settings.tax}
                          onChange={(e) => saveAdminSettings({ ...settings, tax: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-sm-white text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-gold uppercase tracking-wider font-bold">Packaging / Service Fee (₹)</label>
                        <input 
                          type="number" 
                          min={0}
                          value={settings.delivery}
                          onChange={(e) => saveAdminSettings({ ...settings, delivery: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-sm-white text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-gold uppercase tracking-wider font-bold">Theme Color Presets</label>
                        <select 
                          value={settings.theme}
                          onChange={(e) => saveAdminSettings({ ...settings, theme: e.target.value as any })}
                          className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-sm text-white text-xs"
                        >
                          <option value="black-gold">Premium Slate Black & Gold</option>
                          <option value="royal-red">Crimson Red Majesty</option>
                          <option value="forest-green">Deep Forest Emerald Green</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-800 flex flex-wrap justify-between items-center gap-3">
                      <p className="text-[10px] text-gray-500 font-sans tracking-wide">
                        * Color shifts and configurations sync instantly across all scanned table menus. Logo URL can override typography.
                      </p>
                      <button 
                        onClick={printAllQrCodes}
                        className="bg-gold text-dark-bg text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gold-dark transition-all"
                      >
                        <Printer className="w-4 h-4" /> Print Full QR Sheets
                      </button>
                    </div>
                  </div>

                  {/* ADMIN PANEL NAVIGATION TABS */}
                  <div className="flex flex-wrap border-b border-gray-800 mb-6">
                    <button 
                      onClick={() => setActiveAdminTab("menu")} 
                      className={`active border-b-2 px-4 sm:px-6 py-3.5 text-xs tracking-widest uppercase transition-all font-bold ${
                        activeAdminTab === "menu" ? "border-gold text-gold" : "border-transparent text-gray-400 hover:text-white"
                      }`}
                    >
                      Dish Collection
                    </button>
                    <button 
                      onClick={() => setActiveAdminTab("qr")} 
                      className={`active border-b-2 px-4 sm:px-6 py-3.5 text-xs tracking-widest uppercase transition-all font-bold ${
                        activeAdminTab === "qr" ? "border-gold text-gold" : "border-transparent text-gray-400 hover:text-white"
                      }`}
                    >
                      Table QR Codes
                    </button>
                    <button 
                      onClick={() => setActiveAdminTab("bookings")} 
                      className={`active border-b-2 px-4 sm:px-6 py-3.5 text-xs tracking-widest uppercase transition-all font-bold flex items-center gap-2 ${
                        activeAdminTab === "bookings" ? "border-gold text-gold" : "border-transparent text-gray-400 hover:text-white"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" /> Bookings
                    </button>
                  </div>

                  {/* TAB: DISH COLLECTION MANAGER */}
                  {activeAdminTab === "menu" && (
                    <div className="bg-dark-card border border-gold/10 rounded-2xl overflow-hidden shadow-xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="border-b border-gold/10 bg-dark-accent text-gold text-[10px] uppercase tracking-widest font-bold">
                              <th className="p-4">Dish Details</th>
                              <th className="p-4">Category</th>
                              <th className="p-4">Dietary</th>
                              <th className="p-4 text-center">Variants Attached</th>
                              <th className="p-4 text-right">Base Cost</th>
                              <th className="p-4 text-center">Operation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800 text-sm">
                            {menu.map((dish) => (
                              <tr key={dish.id} className="hover:bg-dark-accent/40 transition-colors">
                                <td className="p-4 flex items-center gap-3 min-w-[280px]">
                                  <img 
                                    src={dish.img} 
                                    alt={dish.name} 
                                    className="w-12 h-12 rounded-lg object-cover border border-gold/15" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <h4 className="font-bold text-white leading-snug">{dish.name}</h4>
                                    <p className="text-[10px] text-gray-500 line-clamp-1 max-w-xs">{dish.desc}</p>
                                  </div>
                                </td>
                                <td className="p-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">{dish.category}</td>
                                <td className="p-4">
                                  {dish.type === "veg" ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                      <Leaf className="w-3 h-3 text-emerald-400" /> Veg
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                                      <Flame className="w-3 h-3 text-rose-400" /> Non-veg
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-center text-xs">
                                  {dish.variants && dish.variants.length > 0 ? (
                                    <span className="text-gold font-bold bg-gold/10 px-2 py-1 rounded border border-gold/15 text-[10px]">
                                      {dish.variants.length} custom ({dish.variants.map(v => v.name).join(", ")})
                                    </span>
                                  ) : (
                                    <span className="text-gray-600 italic text-[10px]">—</span>
                                  )}
                                </td>
                                <td className="p-4 text-right font-serif font-semibold text-white">₹{dish.price}</td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button 
                                      onClick={() => openProductModal(dish)}
                                      className="bg-dark-accent p-2 rounded-lg text-gray-400 hover:text-gold border border-gray-800 hover:border-gold/30 transition-colors"
                                      title="Edit Dish Properties"
                                    >
                                      <SettingsIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => deleteProduct(dish.id)}
                                      className="bg-red-950/10 p-2 rounded-lg text-red-400 hover:bg-red-500 hover:text-white border border-red-500/10 transition-all"
                                      title="Delete Dish"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB: GENERATED DYNAMIC QR SHEETS */}
                  {activeAdminTab === "qr" && (
                    <div className="space-y-6">
                      <div className="bg-dark-accent/40 border border-gold/10 p-4 rounded-xl flex items-center gap-3">
                        <QrCode className="w-6 h-6 text-gold" />
                        <div>
                          <h4 className="text-sm font-bold text-white">Contactless QR Code Center (एक ही QR कोड)</h4>
                          <p className="text-xs text-gray-400">Generate, print, or test stable static scan links that remain unchanged regardless of manual edits.</p>
                        </div>
                      </div>

                      {/* Master Universal QR Code (एक ही QR से सब हो) */}
                      <div className="bg-[#10141D] border border-gold/20 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-[4px] h-full bg-gradient-to-b from-gold via-amber-500 to-gold"></div>
                        
                        <div className="bg-white p-3.5 rounded-2xl shadow-xl shrink-0 group">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + window.location.pathname)}`} 
                            alt="Master System Universal QR" 
                            className="w-48 h-48 object-contain mx-auto transition-transform group-hover:scale-103 duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="space-y-4 flex-1">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-mono font-bold text-gold px-2.5 py-0.5 rounded bg-gold/10 border border-gold/10">
                              Primary Master QR Code (एक ही QR कोड)
                            </span>
                            <h3 className="font-serif text-lg sm:text-xl font-bold text-white mt-1">One QR Runs Everything!</h3>
                            <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
                              This single static QR Code is locked to the live application domain. Editing dishes, categories, taxes, theme color, or store configurations <strong>will never alter this QR code</strong>. You can print this once, stick it anywhere (front counter, tables, delivery flyers), and customers can view the entire menu, register instantly, and place Cash on Delivery orders easily.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <a 
                              href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(window.location.origin + window.location.pathname)}`}
                              target="_blank"
                              className="bg-gold text-dark-bg hover:bg-gold-light px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <Download className="w-4 h-4" /> Download Print Form (HD)
                            </a>
                            <a 
                              href={window.location.origin + window.location.pathname} 
                              target="_blank" 
                              className="bg-[#12151C] border border-gold/25 hover:border-gold text-gold hover:text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <Globe className="w-4 h-4" /> Open Live App Menu
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: settings.tables }).map((_, index) => {
                          const tableNum = index + 1;
                          const currentAppPath = window.location.origin + window.location.pathname;
                          const targetDeepLink = currentAppPath.endsWith('/') ? `${currentAppPath}?table=${tableNum}` : `${currentAppPath}/?table=${tableNum}`;
                          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(targetDeepLink)}`;

                          return (
                            <div 
                              key={tableNum} 
                              className="bg-dark-card border border-gold/10 p-5 rounded-3xl text-center space-y-4 shadow-xl flex flex-col justify-between items-center group hover:border-gold/30 transition-colors relative overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 bg-gold text-dark-bg text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                                Table {tableNum}
                              </div>
                              
                              <div className="pt-2">
                                <span className="font-serif text-2xl font-bold text-white">Table No. {tableNum}</span>
                                <p className="text-[10px] text-gold uppercase tracking-widest mt-1">Contactless Ordering Card</p>
                              </div>

                              <div className="bg-white p-3.5 rounded-2xl shadow-inner relative my-2">
                                <img 
                                  src={qrUrl} 
                                  alt={`Table ${tableNum} QR`} 
                                  className="w-40 h-40 object-contain mx-auto transition-transform group-hover:scale-103 duration-300"
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              <div className="w-full space-y-2">
                                <p className="text-[10px] text-gray-500 font-mono break-all line-clamp-1 border-t border-gray-800 pt-2.5">
                                  {targetDeepLink}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  <button 
                                    onClick={() => downloadTableQrCode(tableNum)}
                                    className="bg-dark-accent hover:border-gold border border-gray-800 text-gray-300 hover:text-gold py-2 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1"
                                  >
                                    <Download className="w-3 h-3" /> Get QR
                                  </button>
                                  <a 
                                    href={targetDeepLink} 
                                    target="_blank" 
                                    className="bg-gold/10 border border-gold/15 text-gold hover:bg-gold hover:text-dark-bg py-2 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1"
                                  >
                                    <Globe className="w-3 h-3" /> Open
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB: BOOKINGS MANAGEMENT */}
                  {activeAdminTab === "bookings" && (
                    <div className="space-y-6">
                      
                      {/* Booking Stats Summary Panel */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-dark-card border border-gold/10 p-4 rounded-2xl">
                          <p className="text-[10px] text-gray-500 uppercase font-black">All Reservations</p>
                          <p className="text-2xl font-bold font-serif text-white mt-1">{allBookings.length}</p>
                        </div>
                        <div className="bg-dark-card border border-gold/10 p-4 rounded-2xl">
                          <p className="text-[10px] text-amber-500 uppercase font-black">Pending Approval</p>
                          <p className="text-2xl font-bold font-serif text-amber-500 mt-1">
                            {allBookings.filter(b => b.status === "pending" || !b.status).length}
                          </p>
                        </div>
                        <div className="bg-dark-card border border-[#C5A880]/20 p-4 rounded-2xl">
                          <p className="text-[10px] text-emerald-400 uppercase font-black">Approved Confirmed</p>
                          <p className="text-2xl font-bold font-serif text-emerald-400 mt-1">
                            {allBookings.filter(b => b.status === "confirmed" || b.status === "approved").length}
                          </p>
                        </div>
                        <div className="bg-dark-card border border-gold/10 p-4 rounded-2xl">
                          <p className="text-[10px] text-rose-400 uppercase font-black">Cancelled Orders</p>
                          <p className="text-2xl font-bold font-serif text-rose-400 mt-1">
                            {allBookings.filter(b => b.status === "cancelled").length}
                          </p>
                        </div>
                      </div>

                      {/* Bookings Logs Card List / Table Grid */}
                      <div className="bg-dark-card border border-gold/10 rounded-3xl overflow-hidden shadow-xl">
                        <div className="p-5 border-b border-gold/10 bg-dark-accent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-white uppercase tracking-wider font-serif">Live Cash on Delivery Orders Feed</h4>
                            <p className="text-xs text-gray-400 mt-0.5">Track, confirm/approve, or cancel dine-in or home-delivered COD purchases.</p>
                          </div>
                        </div>

                        {allBookings.length === 0 ? (
                          <div className="p-12 text-center flex flex-col items-center justify-center">
                            <ShoppingBag className="w-10 h-10 text-gray-600 mb-3 animate-pulse" />
                            <p className="text-sm font-bold text-gray-300">No Orders Present</p>
                            <p className="text-xs text-gray-500 mt-1">Customers placing COD requests will display here in real-time.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                              <thead>
                                <tr className="border-b border-gold/10 bg-dark-accent/50 text-gold text-[10px] uppercase tracking-widest font-bold">
                                  <th className="p-4">Customer Info</th>
                                  <th className="p-4">Method & Destination</th>
                                  <th className="p-4">Dishes & Invoice Grand Total</th>
                                  <th className="p-4">Special Requests</th>
                                  <th className="p-4">Current Status</th>
                                  <th className="p-4 text-center font-mono">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800 text-xs">
                                {allBookings.map((b) => (
                                  <tr key={b.id} className="hover:bg-gold-[5%]/5 transition-colors">
                                    <td className="p-4">
                                      <p className="font-bold text-white text-sm">{b.name}</p>
                                      <p className="text-gray-400 text-[10px] mt-0.5">{b.phone}</p>
                                      <p className="text-[9px] text-gold/60 font-mono mt-0.5">{b.userEmail}</p>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex flex-col gap-0.5">
                                        <p className="font-semibold text-white flex items-center gap-1.5 uppercase font-mono">
                                          {b.diningPreference || "Dine-In"}
                                        </p>
                                        <p className="text-gray-400 text-[10.5px]">
                                          {b.diningPreference === "delivery" 
                                            ? (b.deliveryAddress || "Home delivery requested") 
                                            : `Table Number: ${b.tableNum || "Lobby / Auto"}`}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      {b.items && b.items.length > 0 ? (
                                        <div className="space-y-0.5 text-[11px] font-mono text-gray-300">
                                          {b.items.map((it: any, idx: number) => (
                                            <div key={idx} className="flex gap-2">
                                              <span className="text-gold">•</span>
                                              <span>{it.name} {it.variant ? `(${it.variant})` : ""} × {it.quantity}</span>
                                            </div>
                                          ))}
                                          <p className="text-white font-serif font-extrabold mt-1.5 text-xs bg-gold/10 px-2 py-1 rounded border border-gold/10 inline-block">
                                            Total: ₹{b.grandTotal || b.items.reduce((acc: number, cur: any) => acc + (cur.price * cur.quantity), 0)} COD
                                          </p>
                                        </div>
                                      ) : (
                                        <div>
                                          <p className="text-gray-400 italic">Table Hold only</p>
                                          <p className="text-gold font-bold">Standard Holds</p>
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-4 max-w-xs">
                                      {b.requests ? (
                                        <p className="text-gray-300 italic whitespace-normal break-words bg-[#090C10] p-2 rounded-lg border border-gray-800">
                                          "{b.requests}"
                                        </p>
                                      ) : (
                                        <span className="text-gray-600 block italic">None</span>
                                      )}
                                    </td>
                                    <td className="p-4">
                                      <span className={`text-[9.5px] uppercase font-bold px-2.5 py-1 rounded-full border block text-center ${
                                        b.status === "delivered"
                                          ? "bg-[#10B981]/20 border-emerald-500/40 text-emerald-400 font-extrabold"
                                          : b.status === "confirmed" || b.status === "approved"
                                            ? "bg-[#10B981]/15 border-[#10B981]/30 text-emerald-400"
                                            : b.status === "cancelled"
                                              ? "bg-[#EF4444]/15 border-[#EF4444]/30 text-rose-400"
                                              : "bg-[#F59E0B]/15 border-[#F59E0B]/30 text-amber-400"
                                      }`}>
                                        {b.status === "delivered" ? "Delivered Success" : (b.status === "confirmed" || b.status === "approved" ? "Approved" : (b.status || "Pending"))}
                                      </span>

                                      {/* Delivery PIN Code Input Verification form */}
                                      {b.diningPreference === "delivery" && b.status !== "delivered" && b.status !== "cancelled" && (
                                        <div className="mt-2.5 p-2 bg-[#141822] border border-gold/15 rounded-xl text-center min-w-[120px] animate-fadeIn">
                                          <label className="text-[8px] text-gold uppercase tracking-wider font-extrabold block mb-1">Verify delivery PIN</label>
                                          <div className="flex gap-1 justify-center">
                                            <input 
                                              type="text" 
                                              placeholder="PIN" 
                                              maxLength={4}
                                              value={enteredPins[b.id] || ""}
                                              onChange={(e) => setEnteredPins(prev => ({ ...prev, [b.id]: e.target.value }))}
                                              className="w-11 bg-dark-bg border border-gold/20 focus:border-gold focus:outline-none rounded px-1.5 py-0.5 text-center font-mono text-xs text-white"
                                            />
                                            <button 
                                              type="button"
                                              onClick={() => handleVerifyDeliveryPin(b.id, enteredPins[b.id], b.deliveryPin)}
                                              className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-dark-bg text-[9px] font-black uppercase rounded transition-all cursor-pointer"
                                            >
                                              Verify
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-4">
                                      <div className="flex flex-wrap items-center justify-center gap-1.5 min-w-[210px]">
                                        {/* Print Packing receipt button */}
                                        <button
                                          onClick={() => handlePrintBooking(b)}
                                          className="px-2.5 py-1.5 bg-gold hover:bg-gold-dark text-dark-bg text-[10px] font-extrabold uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-md border border-gold-light/20"
                                          title="Print sticky label packing slip"
                                        >
                                          <Printer className="w-3 h-3 text-dark-bg" /> Print Slip
                                        </button>

                                        {b.status !== "confirmed" && b.status !== "approved" && b.status !== "delivered" && (
                                          <button
                                            onClick={() => handleUpdateBookingStatus(b.id, "approved")}
                                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-dark-bg text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer"
                                          >
                                            Confirm
                                          </button>
                                        )}
                                        {b.status !== "cancelled" && b.status !== "delivered" && (
                                          <button
                                            onClick={() => handleUpdateBookingStatus(b.id, "cancelled")}
                                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteBooking(b.id)}
                                          className="px-2 py-1.5 bg-transparent hover:bg-rose-500 hover:text-white border border-gray-700 hover:border-transparent text-gray-400 text-[10px] font-semibold uppercase rounded-lg transition-colors cursor-pointer"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 5. GUEST BUNDLE CART DRAWER COMPONENT */}
          <div 
            onClick={() => setCartOpen(false)}
            className={`fixed inset-0 bg-dark-bg/85 backdrop-blur-md z-50 transition-all duration-300 ${
              cartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          ></div>

          <div 
            className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#0F1115]/98 backdrop-blur-xl border-l border-gold/15 z-50 transition-transform duration-300 flex flex-col shadow-2xl ${
              cartOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-gold/10 flex items-center justify-between bg-dark-accent/60">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <Utensils className="w-5 h-5 text-gold" />
                  <h3 className="font-serif text-lg font-bold text-white">Your Order Basket</h3>
                </div>
                <span className="text-[10px] text-gold font-bold mt-1 uppercase tracking-widest">
                  {diningPreference === "dine-in" 
                    ? `Seat Table No: ${tableNumber || "Direct Lobby Slot"}` 
                    : "Direct Home Delivery Mode"}
                </span>
              </div>
              <button 
                onClick={() => setCartOpen(false)} 
                className="text-gray-400 hover:text-white p-2.5 hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Item rows container */}
            <div className="flex-grow overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <ShoppingBasket className="w-14 h-14 text-gold/25" />
                  <p className="font-serif text-white italic">Your basket is totally empty</p>
                  <p className="text-[10px] text-gray-500 max-w-xs">Add products from our specialities list before checking out.</p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const activePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
                  return (
                    <div 
                      key={`${item.product.id}-${item.selectedVariant?.name || 'base'}`} 
                      className="bg-dark-accent/40 border border-gray-800 p-3.5 rounded-2xl flex items-start gap-3 relative hover:border-gold/20 transition-colors"
                    >
                      <img 
                        src={item.product.img} 
                        alt={item.product.name} 
                        className="w-14 h-14 rounded-xl object-cover border border-gold/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-grow space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-white text-xs leading-snug">{item.product.name}</h4>
                          <span className="font-serif text-xs font-semibold text-gold">₹{activePrice * item.quantity}</span>
                        </div>
                        {item.selectedVariant && (
                          <span className="text-[10px] font-bold text-gold uppercase bg-gold/10 px-2 py-0.5 rounded border border-gold/15">
                            {item.selectedVariant.name}
                          </span>
                        )}
                        <div className="flex justify-between items-center pt-2">
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => updateQuantity(idx, item.quantity - 1)}
                              className="bg-dark-bg hover:bg-gold hover:text-dark-bg text-gray-400 p-1 rounded transition-colors border border-gray-800"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-xs w-6 text-center text-white">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(idx, item.quantity + 1)}
                              className="bg-dark-bg hover:bg-gold hover:text-dark-bg text-gray-400 p-1 rounded transition-colors border border-gray-800"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <button 
                            onClick={() => updateQuantity(idx, 0)}
                            className="text-red-400/80 hover:text-red-500 p-1.5 transition-colors hover:bg-red-500/10 rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Base calculations blocks */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-gold/10 bg-dark-accent/80 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Base Subtotal</span>
                    <span>₹{getCartTotals().baseSubtotal}</span>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3 h-3 text-gold/80" /> GST / Taxes ({settings.tax}%)
                    </span>
                    <span>₹{getCartTotals().taxAmount}</span>
                  </div>

                  {diningPreference === "delivery" && settings.delivery > 0 && (
                    <div className="flex justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <ShoppingBasket className="w-3 h-3 text-gold/80" /> Packaging & Services Fee
                      </span>
                      <span>₹{getCartTotals().deliveryFees}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-white text-base pt-2.5 border-t border-gray-800">
                    <span>Grand Total</span>
                    <span className="text-gold text-lg font-serif">₹{getCartTotals().granTotal}</span>
                  </div>
                </div>

                {/* Segmented Dining selector options */}
                {tableNumber ? (
                  <div className="bg-gold/10 border border-gold/20 p-3.5 rounded-2xl text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-widest">Dine-In Linked</span>
                    <span className="text-sm font-black text-gold">Table No. {tableNumber}</span>
                    <p className="text-[9px] text-gray-500 italic mt-1">Automatically Connected via QR — No selection needed.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-wider font-extrabold text-gold block">Dining Preference</label>
                    <div className="grid grid-cols-2 gap-2 bg-dark-bg/60 p-1 rounded-xl border border-gold/15">
                      <button
                        onClick={() => setDiningPreference("dine-in")}
                        className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          diningPreference === "dine-in" 
                            ? "bg-gold text-dark-bg font-extrabold" 
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        Dine In
                      </button>
                      <button
                        onClick={() => setDiningPreference("delivery")}
                        className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          diningPreference === "delivery" 
                            ? "bg-gold text-dark-bg font-extrabold" 
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        Home Delivery
                      </button>
                    </div>
                  </div>
                )}

                {/* Delivery options addressing container */}
                {diningPreference === "delivery" && (
                  <div className="space-y-2 py-1">
                    <label className="text-[9px] uppercase tracking-wider font-extrabold text-gold block">Delivery Destination</label>
                    <input 
                      type="text" 
                      placeholder="Write Name, Suite / House No..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full bg-dark-bg border border-gold/15 focus:border-gold focus:outline-none rounded-xl p-3 text-xs text-white"
                    />

                    {gpsCoordinates ? (
                      <div className="text-center text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 py-2.5 rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
                        <Check className="w-3.5 h-3.5" /> GPS Verified (Satellite Link Armed)
                      </div>
                    ) : (
                      <button 
                        onClick={requestGPSCoordinates}
                        disabled={gpsLoading}
                        className="w-full bg-dark-bg border border-gold/25 hover:border-gold text-gold font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all hover:scale-101 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5 text-gold animate-bounce" /> 
                        {gpsLoading ? "Contacting Satellites..." : "Verify GPS Delivery Pin"}
                      </button>
                    )}
                  </div>
                )}

                {diningPreference === "delivery" ? (
                  <button 
                    onClick={() => {
                      setCartOpen(false);
                      setBookingModalOpen(true);
                    }}
                    className="w-full py-4 mb-2.5 bg-gradient-to-r from-gold to-[#D4AF37] text-dark-bg font-black rounded text-[10px] uppercase tracking-[0.3em] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:brightness-110"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Order via Cash on Delivery (COD)
                  </button>
                ) : (
                  <button 
                    onClick={sendOrderViaWhatsApp}
                    className="w-full py-4 border border-gold text-gold hover:bg-gold hover:text-[#050608] rounded text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-gold/10"
                  >
                    <svg className="w-4 h-4 fill-current mr-0.5" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.197 1.45 4.882 1.45 5.51 0 9.991-4.478 9.993-9.986.002-2.67-1.03-5.178-2.903-7.05-1.874-1.873-4.384-2.905-7.062-2.906-5.518 0-10.002 4.48-10.005 9.988 0 1.748.459 3.456 1.332 4.972l-.988 3.606 3.69-.968c1.534.837 3.13 1.266 4.704 1.266zm10.14-5.26c-.302-.152-1.79-.882-2.067-.983-.278-.1-.48-.152-.68.152-.2.303-.775.983-.95 1.185-.175.203-.35.228-.65.076-.3-.15-1.27-.468-2.42-1.493-.893-.797-1.496-1.782-1.67-2.086-.176-.303-.018-.467.132-.618.136-.135.303-.35.454-.526.152-.177.202-.278.302-.464.1-.186.05-.35-.025-.502-.075-.152-.68-1.643-.93-2.246-.245-.588-.495-.508-.68-.518-.178-.01-.383-.01-.588-.01-.205 0-.538.077-.82.386-.282.31-1.077 1.05-1.077 2.56 0 1.51 1.1 2.972 1.25 3.175.15.203 2.164 3.305 5.24 4.636.732.316 1.302.505 1.746.646.737.234 1.407.2 1.938.12.593-.09 1.79-.73 2.042-1.432.253-.7.253-1.3.177-1.432-.075-.133-.277-.208-.578-.36z"/>
                    </svg>
                    Checkout and Send Order
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 6. GEOLOCATION PROMPTS DIALOG CONTAINER */}
          {locationModalOpen && (
            <div className="fixed inset-0 bg-[#050608]/92 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[#0F1115] border border-gold/25 w-full max-w-sm rounded-[2.5rem] p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent"></div>
                
                <div className="mx-auto w-16 h-16 bg-gold/10 border border-gold/35 rounded-full flex items-center justify-center shadow-lg">
                  <Compass className="w-8 h-8 text-gold animate-spin" />
                </div>
                
                <h3 className="font-serif text-xl text-white font-bold">GPS Location Authorization</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Amshi Cafe uses your browser's secure GPS parameters to supply courier riders with a direct navigation link. Please tap Allow on the dialog box.
                </p>
                
                <div className="pt-2 flex flex-col gap-2">
                  <button 
                    onClick={confirmAndRequestGPS}
                    className="w-full bg-gold text-dark-bg font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-widest active:scale-95 shadow-md hover:brightness-110"
                  >
                    Authenticate Satellite Pin
                  </button>
                  <button 
                    onClick={closeLocationModal}
                    className="w-full bg-dark-accent border border-gray-700 text-gray-400 py-3 rounded-xl text-xs uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 8. SIMULATED APP DOWNLOAD PROGRESS OVERLAY */}
          {appModalOpen && (
            <div className="fixed inset-0 bg-[#050608]/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-[#0F1115] border border-gold/25 w-full max-w-sm rounded-[2rem] p-6 text-center space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent"></div>
                
                <div className="mx-auto w-16 h-16 bg-gold/10 border border-gold/35 rounded-full flex items-center justify-center shadow-lg">
                  <Upload className="w-8 h-8 text-gold animate-bounce rotate-180" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-serif text-xl text-white font-bold">Downloading Standalone App</h3>
                  <p className="text-xs text-gray-400">Packaging Amshi Cafe standalone client APK for your device...</p>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700/50 p-0.5">
                    <div 
                      className="bg-gradient-to-r from-gold to-gold-dark h-1 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] font-mono text-gold font-bold">{downloadProgress || 0}% Complete</p>
                </div>

                <p className="text-[8px] text-gray-500 italic">
                  Isolates public ordering experience by removing password elements and administration views.
                </p>
              </div>
            </div>
          )}

          {/* 9. DETAILED HIGH-RESOLUTION TABLE QR OVERLAY */}
          {qrModalOpen && (
            <div className="fixed inset-0 bg-[#050608]/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-[#0F1115] border border-gold/25 w-full max-w-sm rounded-[2rem] p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent"></div>
                
                <div className="flex justify-between items-center border-b border-gold/10 pb-3">
                  <h3 className="font-serif text-base text-white font-bold">DESK QR CODE</h3>
                  <button 
                    onClick={() => setQrModalOpen(false)}
                    className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider px-2 py-1"
                  >
                    Close
                  </button>
                </div>

                <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto border-4 border-gold">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=0F1115&bgcolor=FFFFFF&data=${encodeURIComponent(
                      window.location.origin + window.location.pathname + `?table=${qrTable}&location=${encodeURIComponent(qrLocation)}`
                    )}`} 
                    alt="High Res Table QR" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-white font-bold uppercase">Table #{qrTable}</p>
                  <p className="text-[10px] text-gold font-semibold uppercase tracking-wider">{qrLocation}</p>
                </div>

                <p className="text-[9px] text-gray-400 max-w-xs mx-auto">
                  Print and stick this QR code on Table {qrTable}. Scanning it automatically configures dining preferences, presets the table location code, and opens the live digital menu!
                </p>

                <a 
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&color=0F1115&bgcolor=FFFFFF&data=${encodeURIComponent(
                    window.location.origin + window.location.pathname + `?table=${qrTable}&location=${encodeURIComponent(qrLocation)}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center block py-2.5 bg-gold text-[#050608] font-black rounded text-[9px] uppercase tracking-widest hover:bg-gold-light transition-all cursor-pointer"
                >
                  Print / Save QR Image
                </a>
              </div>
            </div>
          )}

          {/* 7. DISH CREATOR MODAL FORM DIALOG */}
          {productModalOpen && (
            <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-dark-card border border-gold/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
                <div className="p-5 border-b border-gold/10 flex items-center justify-between bg-dark-accent shrink-0">
                  <span className="font-serif text-lg text-gold font-bold">
                    {formProductId ? "Modify Dish Properties (व्यंजन संपादित करें)" : "Add New Dish (नया व्यंजन जोड़ें)"}
                  </span>
                  <button onClick={closeProductModal} className="text-gray-400 hover:text-white p-1.5 focus:outline-none">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleProductFormSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gold/20">
                  {formError && (
                    <div className="p-3 rounded-xl bg-red-950/25 border border-red-500/25 text-red-400 text-xs font-semibold">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 block">
                      <label className="text-[10px] text-gold uppercase tracking-wider font-bold block">Dish Name</label>
                      <input 
                        type="text" 
                        required 
                        value={formProductName}
                        onChange={(e) => setFormProductName(e.target.value)}
                        className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-xs text-white" 
                      />
                    </div>
                    <div className="space-y-1 block">
                      <label className="text-[10px] text-gold uppercase tracking-wider font-bold block">Category</label>
                      <select 
                        value={formProductCategory}
                        onChange={(e) => setFormProductCategory(e.target.value)}
                        className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-xs text-white"
                      >
                        <option value="Momos">Momos</option>
                        <option value="Noodles">Noodles</option>
                        <option value="Rolls">Rolls</option>
                        <option value="Pizza">Pizza</option>
                        <option value="Mojito">Mojito</option>
                        <option value="Tea & Coffee">Tea & Coffee</option>
                        <option value="Desserts">Desserts</option>
                        <option value="Petis">Petis</option>
                        <option value="Fries">Fries</option>
                        <option value="Sandwiches">Sandwiches</option>
                        <option value="Burger">Burger</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 block">
                      <label className="text-[10px] text-gold uppercase tracking-wider font-bold block">Base Price (₹)</label>
                      <input 
                        type="number" 
                        required 
                        min={0}
                        value={formProductPrice}
                        onChange={(e) => setFormProductPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-xs text-white" 
                      />
                    </div>
                    <div className="space-y-1 block">
                      <label className="text-[10px] text-gold uppercase tracking-wider font-bold block">Dietary Type</label>
                      <select 
                        value={formProductType}
                        onChange={(e) => setFormProductType(e.target.value as any)}
                        className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-xs text-white"
                      >
                        <option value="veg">Veg</option>
                        <option value="non-veg">Non-Veg</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 block">
                    <label className="text-[10px] text-gold uppercase tracking-wider font-bold block">
                      Dish Price Variants (Optional. Format: Full:120,Half:85)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Leave completely empty to use the base price only"
                      value={formProductVariants}
                      onChange={(e) => setFormProductVariants(e.target.value)}
                      className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-xs text-white" 
                    />
                  </div>

                  <div className="space-y-2 block">
                    <label className="text-[10px] text-gold uppercase tracking-wider font-bold block">
                      Dish Visual Representation
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Upload from Gallery</span>
                        <label className="flex flex-col items-center justify-center h-24 border border-dashed border-gold/30 rounded-lg cursor-pointer bg-[#181B22] hover:bg-gold/5 hover:border-gold/60 transition-all">
                          <Upload className="w-5 h-5 text-gold/70 mb-1" />
                          <span className="text-[9px] text-gold/90 font-bold uppercase tracking-widest">Select Photo</span>
                          <span className="text-[7px] text-gray-500">PNG, JPG, WebP, SVG</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                showToast("Compressing image from gallery...", "info");
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas = document.createElement("canvas");
                                    const MAX_WIDTH = 640;
                                    const MAX_HEIGHT = 640;
                                    let width = img.width;
                                    let height = img.height;

                                    if (width > height) {
                                      if (width > MAX_WIDTH) {
                                        height *= MAX_WIDTH / width;
                                        width = MAX_WIDTH;
                                      }
                                    } else {
                                      if (height > MAX_HEIGHT) {
                                        width *= MAX_HEIGHT / height;
                                        height = MAX_HEIGHT;
                                      }
                                    }

                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext("2d");
                                    if (ctx) {
                                      ctx.drawImage(img, 0, 0, width, height);
                                      const dataUrl = canvas.toDataURL("image/jpeg", 0.7); // 70% quality
                                      setFormProductImg(dataUrl);
                                      showToast("Gallery photo compressed & loaded successfully!", "success");
                                    } else {
                                      setFormProductImg(event.target?.result as string);
                                      showToast("Image loaded from gallery!", "success");
                                    }
                                  };
                                  img.onerror = () => {
                                    setFormProductImg(event.target?.result as string);
                                    showToast("Image loaded from gallery!", "success");
                                  };
                                  img.src = event.target?.result as string;
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Or Paste Image URL</span>
                        <textarea 
                          rows={4}
                          value={formProductImg}
                          onChange={(e) => setFormProductImg(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full h-24 bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2 text-[10px] text-white resize-none" 
                        />
                      </div>
                    </div>
                    {formProductImg && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#111317] p-3 border border-emerald-500/30 rounded-xl">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <img 
                            src={formProductImg} 
                            alt="Preview" 
                            className="w-12 h-12 object-cover rounded-lg border border-emerald-500/20" 
                            onError={(e) => {
                              // Suppress broken image visual feedback
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                              Photo Attached Successfully!
                            </p>
                            <p className="text-[8px] text-gray-500 truncate">{formProductImg.startsWith('data:') ? 'Local Base64 Asset' : formProductImg}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 shrink-0">
                          <button 
                            type="button"
                            onClick={() => {
                              showToast("Photo applied and linked with the dish!", "success");
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-[#050608] font-black px-4 py-1.5 rounded text-[10px] uppercase tracking-widest transition-all"
                          >
                            ✔ Ok / Done
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFormProductImg("")}
                            className="text-red-400 hover:text-red-500 text-[10px] uppercase font-bold tracking-wider px-2"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 block">
                    <label className="text-[10px] text-gold uppercase tracking-wider font-bold block">Fictional Description</label>
                    <textarea 
                      required 
                      rows={3}
                      value={formProductDesc}
                      onChange={(e) => setFormProductDesc(e.target.value)}
                      className="w-full bg-[#181B22] border border-gray-700 focus:border-gold focus:outline-none rounded-lg p-2.5 text-xs text-white text-[11px]" 
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-gray-800 shrink-0">
                    <button 
                      type="button" 
                      onClick={closeProductModal}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                    >
                      Cancel / Close (बंद करें)
                    </button>
                    <button 
                      type="submit" 
                      className="bg-gold hover:bg-gold-dark text-dark-bg font-black px-5 py-2 rounded-lg text-xs transition-all uppercase tracking-wider"
                    >
                      Save / Commit Changes (सुरक्षित करें)
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* --- CULINARY TABLE BOOKING & USER AUTH MODAL --- */}
          {bookingModalOpen && (
            <div className="fixed inset-0 bg-dark-bg/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0D1015]/95 border border-gold/25 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
                
                {/* Modal Header */}
                <div className="p-5 border-b border-gold/15 flex items-center justify-between bg-dark-accent shrink-0">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-gold" />
                    <span className="font-serif text-base sm:text-lg text-gold font-extrabold tracking-wide">
                      Customer Panel & Order Status (ऑर्डर एवं खाता)
                    </span>
                  </div>
                  <button 
                    onClick={() => setBookingModalOpen(false)} 
                    className="text-gray-400 hover:text-white p-1.5 focus:outline-none transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gold/20">
                  {!firebaseUser ? (
                    /* Authentication Section */
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-0 min-h-[480px]">
                      <div className="md:col-span-5 bg-gradient-to-br from-[#12151B] to-[#060709] p-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gold/10">
                        <div>
                          <div className="flex items-center gap-2.5 mb-6">
                            <Coffee className="w-6 h-6 text-gold" />
                            <span className="font-serif text-base font-bold text-white tracking-widest uppercase">AMSHI DINER</span>
                          </div>
                          <h3 className="font-serif text-xl font-bold text-gold mb-3 leading-snug">Premium Digital Ordering</h3>
                          <p className="text-[11px] text-gray-400 leading-relaxed space-y-2">
                            <span>Join the Amshi Dining experience! Create an account to place and track all your Cash on Delivery orders, customize dish options, and look up approval status.</span>
                          </p>
                        </div>
                        <div className="text-[10px] text-gold/50 mt-8 md:mt-0 font-mono leading-relaxed">
                          * Securely managed by your private, authenticated Firebase profile.
                        </div>
                      </div>
                      
                      <div className="md:col-span-7 p-7 sm:p-9 flex flex-col justify-center">
                        <h4 className="font-serif text-lg text-white font-bold mb-1.5">
                          {authMode === "signin" ? "Sign In to Account" : "Register Customer Profile"}
                        </h4>
                        <p className="text-[11px] text-gray-400 mb-6">
                          {authMode === "signin" 
                            ? "Enter your credentials to access your live profile and active order records." 
                            : "Create an account in seconds to begin placing Cash on Delivery orders with a single tap."
                          }
                        </p>
                        
                        <form onSubmit={handleAuthAction} className="space-y-4">
                          {authError && (
                            <div className="p-3 bg-red-950/25 border border-red-500/25 text-red-400 text-xs font-semibold rounded-xl">
                              {authError}
                            </div>
                          )}
                          
                          {authMode === "signup" && (
                            <>
                              <div className="space-y-1.5 animate-fadeIn">
                                <label className="text-[9px] text-gold uppercase tracking-widest font-extrabold block">Full Name (पूरा नाम)</label>
                                <input 
                                  type="text"
                                  required
                                  placeholder="E.g. Rahul Kumar"
                                  value={authName}
                                  onChange={(e) => setAuthName(e.target.value)}
                                  className="w-full bg-[#161920] border border-gold/20 focus:border-gold focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 transition-colors"
                                />
                              </div>
                              
                              <div className="space-y-1.5 animate-fadeIn">
                                <label className="text-[9px] text-gold uppercase tracking-widest font-extrabold block">Phone / Mobile (मोबाइल नंबर)</label>
                                <input 
                                  type="tel"
                                  required
                                  placeholder="E.g. 9876543210"
                                  value={authPhone}
                                  onChange={(e) => setAuthPhone(e.target.value)}
                                  className="w-full bg-[#161920] border border-gold/20 focus:border-gold focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 transition-colors"
                                />
                              </div>
                            </>
                          )}

                          <div className="space-y-1.5">
                            <label className="text-[9px] text-gold uppercase tracking-widest font-extrabold block">Email Address</label>
                            <input 
                              type="email"
                              required
                              placeholder="you@example.com"
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              className="w-full bg-[#161920] border border-gold/20 focus:border-gold focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 transition-colors"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] text-gold uppercase tracking-widest font-extrabold block">Security Password</label>
                            <input 
                              type="password"
                              required
                              minLength={6}
                              placeholder="••••••"
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              className="w-full bg-[#161920] border border-gold/20 focus:border-gold focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 transition-colors"
                            />
                          </div>

                          <button 
                            type="submit"
                            disabled={authLoading}
                            className="w-full py-3 bg-gold hover:bg-gold-light text-dark-bg disabled:bg-gray-800 disabled:text-gray-500 font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {authLoading ? (
                              <span className="w-4.5 h-4.5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                              <>
                                {authMode === "signin" ? "Login to Profile" : "Register Account"}
                              </>
                            )}
                          </button>
                        </form>

                        <div className="mt-6 pt-5 border-t border-gold/10 text-center">
                          <button
                            onClick={() => {
                              setAuthMode(authMode === "signin" ? "signup" : "signin");
                              setAuthError(null);
                            }}
                            className="text-[11px] font-semibold text-gold hover:text-white transition-colors cursor-pointer"
                          >
                            {authMode === "signin" 
                              ? "Don't have an account? Sign up now" 
                              : "Already registered? Sign in instead"
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Authed COD Ordering Panel + logs view */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                      
                      {/* Left: Make COD Order form or empty notice */}
                      <div className="lg:col-span-6 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-gold/15">
                        <div className="flex items-center justify-between mb-5 bg-[#141820] p-3 rounded-2xl border border-gold/10">
                          <div className="min-w-0">
                            <p className="text-[9px] text-gold uppercase tracking-widest font-bold">Customer Profile</p>
                            <p className="text-xs text-white font-mono font-medium truncate">{firebaseUser.email}</p>
                          </div>
                          <button
                            onClick={handleFirebaseLogout}
                            className="text-[9px] text-gray-400 hover:text-rose-400 border border-gray-700 hover:border-rose-500/30 px-2 py-1 rounded bg-[#0A0D12] transition-all flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <LogOut className="w-3 h-3" /> Logout
                          </button>
                        </div>

                        {cart.length === 0 ? (
                          <div className="py-12 text-center space-y-4">
                            <ShoppingBag className="w-12 h-12 text-gold/40 mx-auto animate-pulse" />
                            <h4 className="font-serif text-base text-gold font-bold">Your Cart is Empty</h4>
                            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                              Add delicious dishes of your choice from the live digital menu, then tap "Order via Cash on Delivery" to complete your checkout instantly.
                            </p>
                            <button
                              onClick={() => setBookingModalOpen(false)}
                              className="mt-2 px-6 py-2 border border-gold/40 hover:border-gold text-gold text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-gold/10 transition-all cursor-pointer"
                            >
                              Explore Menu Dishes
                            </button>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-serif text-base text-gold font-bold mb-1">Confirm Cash on Delivery Order</h4>
                            <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                              You have selected <strong className="text-white">{cart.reduce((a, b) => a + b.quantity, 0)} items</strong>. Complete the details below to dispatch your order with Cash on Delivery (COD).
                            </p>
                            
                            <form onSubmit={handleCreateBooking} className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1 block">
                                  <label className="text-[9px] text-gold uppercase tracking-wider font-extrabold block">Your Name</label>
                                  <input 
                                    type="text"
                                    required
                                    value={bookingForm.name}
                                    onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                                    placeholder="E.g. Sanu"
                                    className="w-full bg-[#12151C] border border-gold/15 focus:border-gold focus:outline-none rounded-xl px-3 py-2 text-xs text-white"
                                  />
                                </div>
                                <div className="space-y-1 block">
                                  <label className="text-[9px] text-gold uppercase tracking-wider font-extrabold block">Phone Number</label>
                                  <input 
                                    type="tel"
                                    required
                                    value={bookingForm.phone}
                                    onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                                    placeholder="E.g. +91 9876543210"
                                    className="w-full bg-[#12151C] border border-gold/15 focus:border-gold focus:outline-none rounded-xl px-3 py-2 text-xs text-white"
                                  />
                                </div>
                              </div>

                                <div className="p-3.5 bg-dark-bg/60 rounded-2xl border border-gold/10 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Dining Preference:</span>
                                    <span className="text-[10px] uppercase font-serif font-bold text-gold">{diningPreference === "dine-in" ? "Dine In" : "Home Delivery"}</span>
                                  </div>

                                  {diningPreference === "dine-in" ? (
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] text-gold uppercase tracking-wider font-extrabold block">Table Identifiers</label>
                                      {tableNumber ? (
                                        <div className="bg-[#12151C] border border-gold/15 rounded-xl px-3 py-2.5 text-xs text-gold font-bold">
                                          Table No. {tableNumber} (Automatically Connected)
                                        </div>
                                      ) : (
                                        <select
                                          value={bookingForm.tableNum}
                                          onChange={(e) => setBookingForm({ ...bookingForm, tableNum: e.target.value })}
                                          className="w-full bg-[#12151C] border border-gold/15 focus:border-gold focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white"
                                        >
                                          <option value="">Table {tableNumber || "Auto Detect / Lobby"}</option>
                                          {Array.from({ length: settings.tables || 10 }).map((_, i) => (
                                            <option key={i+1} value={i+1}>Table No. {i+1}</option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                  ) : (
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] text-gold uppercase tracking-wider font-extrabold block">Delivery destination address</label>
                                    <textarea 
                                      rows={2}
                                      required
                                      value={deliveryAddress}
                                      onChange={(e) => setDeliveryAddress(e.target.value)}
                                      placeholder="Suite/Apartment, Street Address..."
                                      className="w-full bg-[#12151C] border border-gold/15 focus:border-gold focus:outline-none rounded-xl px-3 py-2 text-xs text-white resize-none"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1 block">
                                <label className="text-[9px] text-gold uppercase tracking-wider font-extrabold block">Special Instructions or Requests</label>
                                <textarea 
                                  rows={2}
                                  value={bookingForm.requests}
                                  onChange={(e) => setBookingForm({ ...bookingForm, requests: e.target.value })}
                                  placeholder="E.g. Extra spicy, no onions, keep napkins..."
                                  className="w-full bg-[#12151C] border border-gold/15 focus:border-gold focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white resize-none"
                                />
                              </div>

                              <div className="p-3 bg-gold/10 border border-gold/20 rounded-2xl flex items-center justify-between">
                                <span className="text-xs font-serif text-white font-bold">Total Order Cost:</span>
                                <span className="text-base font-serif text-gold font-extrabold">₹{getCartTotals().granTotal}</span>
                              </div>

                              <button 
                                type="submit"
                                className="w-full py-3 bg-gradient-to-r from-gold to-[#D4AF37] hover:brightness-110 text-dark-bg font-black rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                              >
                                <Check className="w-4 h-4" /> Place Cash on Delivery Order
                              </button>
                            </form>
                          </>
                        )}
                      </div>

                      {/* Right: User bookings list logs */}
                      <div className="lg:col-span-6 p-6 sm:p-8 bg-gradient-to-b from-[#0A0D12] to-[#040608] flex flex-col min-h-[400px] max-h-[80vh]">
                        <div className="flex items-center gap-2 mb-4 animate-fade-in">
                          <ClipboardList className="w-4 h-4 text-gold" />
                          <h4 className="font-serif text-sm text-white font-extrabold uppercase tracking-wider">Your Order History</h4>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 scrollbar-thin scrollbar-thumb-gold/10">
                          {userBookings.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[#0E1116] rounded-2xl border border-dashed border-gold/10 mt-6 animate-fade-in">
                              <ShoppingBag className="w-7 h-7 text-gray-500 mb-2.5" />
                              <p className="text-[11px] text-gray-400 font-semibold mb-1">No Orders Placed Yet</p>
                              <p className="text-[9px] text-gray-600 max-w-xs">Fill in your cart with delicious dishes, and place a Cash on Delivery order to see it tracked here live.</p>
                            </div>
                          ) : (
                            userBookings.map((b) => (
                              <div key={b.id} className="p-4 bg-[#11141A] border border-gold/15 rounded-2xl shadow-xl flex flex-col justify-between hover:border-gold/30 transition-all">
                                <div className="flex items-start justify-between gap-3 mb-2.5">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">Invoice: </span>
                                    <span className="text-[10px] font-mono font-medium text-gold bg-gold/10 px-1.5 py-0.5 rounded border border-gold/10">{b.id?.slice(-6).toUpperCase()}</span>
                                  </div>
                                  
                                  {/* Status Pills */}
                                  <span className={`text-[8.5px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                                    b.status === "confirmed" || b.status === "approved"
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                      : b.status === "cancelled"
                                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                        : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                  }`}>
                                    {b.status === "confirmed" || b.status === "approved" ? "Approved" : (b.status || "Pending")}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-y-2 text-[10px] text-gray-300 border-t border-b border-gray-800/60 py-2.5 mb-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-gold" />
                                    <span>{b.date}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-gold" />
                                    <span>{b.time}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Method: </span>
                                    <span className="font-bold text-white uppercase">{b.diningPreference || "Dine-In"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">{b.diningPreference === "delivery" ? "Delivery" : "Table"}: </span>
                                    <span className="font-bold text-white">
                                      {b.diningPreference === "delivery" ? "Home" : `No. ${b.tableNum || 'Auto'}`}
                                    </span>
                                  </div>
                                </div>

                                {b.items && b.items.length > 0 && (
                                  <div className="mb-2.5 text-[10px] bg-dark-bg/40 p-2.5 rounded-xl border border-gold/5 space-y-1">
                                    <p className="text-[8px] font-extrabold uppercase tracking-widest text-[#9CA3AF] mb-1">Ordered Dishes</p>
                                    {b.items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between text-white font-mono text-[9px]">
                                        <span>{item.name} {item.variant ? `(${item.variant})` : ""} × {item.quantity}</span>
                                        <span className="text-gold">₹{item.price * item.quantity}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between text-[10px] font-serif font-black text-gold p-1 bg-gold/5 rounded mt-1.5 border-t border-gold/10">
                                      <span>GRAND TOTAL COD:</span>
                                      <span>₹{b.grandTotal || b.items.reduce((acc: number, cur: any) => acc + (cur.price * cur.quantity), 0)}</span>
                                    </div>
                                  </div>
                                )}

                                {b.deliveryAddress && (
                                  <p className="text-[9.5px] text-gray-400 bg-rose-950/10 p-2 rounded-lg border border-red-900/10 mb-2.5">
                                    <strong className="text-white text-[8px] uppercase tracking-wider block">Ship to:</strong> {b.deliveryAddress}
                                  </p>
                                )}

                                {b.requests && (
                                  <p className="text-[9.5px] text-gray-400 italic bg-[#090C10] p-2 rounded-lg border border-gray-800 mb-3 line-clamp-2">
                                    "{b.requests}"
                                  </p>
                                )}

                                {b.deliveryPin && b.status !== "delivered" && b.status !== "cancelled" && (
                                  <div className="mb-3 p-3 bg-gradient-to-r from-amber-500/10 to-gold/10 border border-gold/30 rounded-xl flex items-center justify-between gap-2.5 animate-fadeIn">
                                    <div className="flex-1">
                                      <span className="text-[10px] text-gold font-extrabold uppercase tracking-wider flex items-center gap-1">
                                        <Check className="w-3 h-3 text-gold" /> Delivery Code (ओटीपी कोड)
                                      </span>
                                      <p className="text-[8.5px] text-gray-400 leading-tight mt-0.5">Rider ko order milne par hi ye code batayein</p>
                                    </div>
                                    <span className="text-sm font-mono font-black text-gold bg-gold/15 px-3 py-1 rounded-lg border border-gold/40 tracking-wider shadow-md">{b.deliveryPin}</span>
                                  </div>
                                )}

                                {b.status === "delivered" && (
                                  <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-emerald-400">
                                    <p className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Order Delivered (सफलतापूर्वक प्राप्त)
                                    </p>
                                    <p className="text-[8.5px] text-gray-400 leading-tight mt-0.5">Thank you for dining with Amshi! Sweet smiles served.</p>
                                  </div>
                                )}

                                {b.status !== "cancelled" && b.status !== "confirmed" && b.status !== "approved" && b.status !== "delivered" && (
                                  <button
                                    onClick={() => handleCancelBooking(b.id)}
                                    className="w-full text-center py-1.5 text-[10px] hover:bg-rose-500/10 hover:border-rose-500/30 border border-gray-800 hover:text-rose-400 rounded-lg text-gray-400 transition-colors cursor-pointer font-bold tracking-wider"
                                  >
                                    Cancel Order
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* 8. SINGLE GLOBAL REUSABLE TOAST ELEMENT */}
          <div 
            id="reusable-toast-badge" 
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-xl transition-all duration-300 ${
              toastActive ? "translate-y-0 opacity-100 animate-slideUp" : "translate-y-12 opacity-0 pointer-events-none"
            } ${
              toastType === "error" 
                ? "bg-rose-600 text-white" 
                : toastType === "info" 
                  ? "bg-sky-600 text-white" 
                  : "bg-gold text-dark-bg font-extrabold"
            }`}
          >
            {toastType === "error" ? (
              <AlertTriangle className="w-4 h-4" />
            ) : toastType === "info" ? (
              <Compass className="w-4 h-4 animate-spin-slow" />
            ) : (
              <Check className="w-4 h-4 font-black" />
            )}
            <span className="text-xs md:text-sm tracking-wide font-sans">{toastMessage}</span>
          </div>
        </>
      )}

      {/* 6. STATIC PRINT RECEIPT COMPANION PORTAL OVERLAY */}
      {printReceiptData && createPortal(
        <>
          <style>{`
            @media print {
              /* Ensure only the print container is shown, hide everything else */
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 76mm !important;
                font-family: 'Courier New', Courier, monospace !important;
                font-size: 11px !important;
              }
              #root {
                display: none !important;
                height: 0 !important;
                overflow: hidden !important;
              }
              #print-receipt-section {
                display: block !important;
                visibility: visible !important;
                width: 76mm !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                margin: 0 !important;
                padding: 4mm !important;
                box-sizing: border-box !important;
                background: white !important;
                color: black !important;
              }
            }
          `}</style>
          
          <div id="print-receipt-section" className="hidden print:block bg-white text-black p-4 font-mono text-xs max-w-[76mm] border border-gray-400 rounded-lg">
            <div className="text-center border-b border-dashed border-black pb-2 mb-2">
              <h2 className="text-base font-black tracking-wider uppercase">AMSHI CAFE</h2>
              <p className="text-[10px] text-gray-800 uppercase font-extrabold tracking-wider mt-0.5">Kitchen Packing Slip</p>
              <div className="w-full h-px border-t border-dashed border-gray-500 my-1"></div>
              <p className="text-[10px] font-bold uppercase">Keep on Delivery Box/Bag</p>
            </div>

            <div className="space-y-1 text-xs border-b border-dashed border-black pb-2 mb-2">
              <div className="flex justify-between">
                <span>INVOICE ID:</span>
                <span className="font-black text-sm">#{printReceiptData.id?.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE / TIME:</span>
                <span className="font-bold">{printReceiptData.date || "TODAY"} @ {printReceiptData.time || "NOW"}</span>
              </div>
              <div className="flex justify-between">
                <span>METHOD:</span>
                <span className="font-black bg-black text-white px-2 py-0.5 rounded text-[10px] uppercase">{printReceiptData.diningPreference || "Dine-In"}</span>
              </div>
              {printReceiptData.deliveryPin && (
                <div className="flex justify-between items-center text-xs font-black bg-gray-100 p-1 rounded border border-gray-400 mt-1">
                  <span>DELIVERY PIN:</span>
                  <span className="text-sm font-black px-1.5 py-0.5 bg-black text-white rounded">{printReceiptData.deliveryPin}</span>
                </div>
              )}
            </div>

            <div className="space-y-1 text-xs mb-2">
              <p className="text-[10px] font-extrabold uppercase text-gray-800">CLIENT DETAILS:</p>
              <p className="text-sm font-black uppercase">{printReceiptData.name}</p>
              <p className="text-xs font-bold leading-none">{printReceiptData.phone}</p>
              
              {printReceiptData.diningPreference === "delivery" ? (
                <div className="mt-1.5 p-1.5 bg-gray-100 rounded border border-gray-300">
                  <strong className="block text-[8px] uppercase text-gray-800 mb-0.5">SHIPPING ADDRESS:</strong>
                  <p className="text-xs font-bold leading-tight text-black font-sans">{printReceiptData.deliveryAddress}</p>
                </div>
              ) : (
                <p className="text-xs font-black mt-1 bg-black text-white inline-block px-1.5 py-0.5 rounded">📌 TABLE: No. {printReceiptData.tableNum || 'Auto'}</p>
              )}
            </div>

            <div className="border-t border-b border-dashed border-black py-2 my-2">
              <p className="text-[10px] font-bold uppercase text-gray-800 mb-1.5">ITEMS TO PACK:</p>
              <div className="space-y-2">
                {printReceiptData.items?.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs font-black">
                    <span className="text-sm">⚡ {it.quantity} x {it.name} {it.variant ? `(${it.variant})` : ""}</span>
                    <span>₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {printReceiptData.requests && (
              <div className="bg-gray-100 p-1.5 rounded mb-2 border border-gray-300 text-xs text-left">
                <strong className="block text-[8px] uppercase text-gray-800 mb-0.5">KITCHEN REQUESTS:</strong>
                <p className="italic text-black font-extrabold leading-tight">"{printReceiptData.requests}"</p>
              </div>
            )}

            <div className="text-right pt-1.5 space-y-0.5">
              <div className="flex justify-between text-sm font-black border-t border-dashed border-black pt-2">
                <span>TOTAL COD:</span>
                <span>₹{printReceiptData.grandTotal}</span>
              </div>
              <div className="w-full text-center mt-4 pt-1 border-t border-dotted border-gray-400">
                <p className="text-[9px] font-bold">--- THANK YOU ---</p>
                <p className="text-[8px] text-gray-600">Amshi Cafe • Sweet Smiles Served</p>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* FOOTER */}
      <footer className="w-full border-t border-gold/10 py-6 text-center text-[10px] text-gray-500 bg-[#050608] z-30 relative mt-auto">
        <p className="tracking-widest uppercase">AMSHI CAFE © 2026</p>
        <p className="mt-1 text-gray-600">Premium Contactless Multi-Table QR Dining Client</p>
      </footer>
    </div>
  );
}

// --- EXTRACTED CLIENT-SIDE MODULAR ITEMS CARD VIEW ---
interface MenuItemCardProps {
  key?: React.Key | string;
  dish: MenuItem;
  onAddToBasket: (product: MenuItem, variant: any) => void;
  textHexColor: string;
}

function MenuItemCard({ dish, onAddToBasket, textHexColor }: MenuItemCardProps) {
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);

  const hasVariants = dish.variants && dish.variants.length > 0;
  const activeVariant = hasVariants ? dish.variants![selectedVariantIdx] : null;
  const displayPrice = activeVariant ? activeVariant.price : dish.price;

  return (
    <div 
      className="bg-[#0F1115] border border-gold/20 rounded-2xl overflow-hidden flex flex-col h-full group transition-all duration-500 hover:border-gold hover:shadow-[0_0_35px_rgba(197,168,128,0.3)] relative"
    >
      {/* Dynamic Glowing Aurora Backlight */}
      <div className="absolute inset-0 bg-gradient-to-tr from-gold/0 via-gold/0 to-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10"></div>
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-gold/15 rounded-full blur-2xl group-hover:bg-gold/30 transition-all duration-500 pointer-events-none"></div>

      {/* Picture Frame */}
      <div className="relative h-40 overflow-hidden bg-gray-900">
        <img 
          src={dish.img} 
          alt={dish.name} 
          className="w-full h-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-108 group-hover:opacity-95"
          referrerPolicy="no-referrer"
        />
        
        {/* Soft radial golden gradient glow on picture overlay */}
        <div className="absolute inset-0 bg-radial-glow opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1115] via-transparent to-transparent"></div>
        
        {/* Floating chef special tracker */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#050608]/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-gold/40 shadow-[0_0_12px_rgba(197,168,128,0.35)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gold"></span>
          </span>
          <span className="text-[7.5px] font-black text-gold tracking-widest uppercase">Chef Special</span>
        </div>

        {/* Dietary types badge dots */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {dish.type === "veg" ? (
            <span className="inline-flex items-center gap-1 bg-emerald-950/85 backdrop-blur-md border border-emerald-500/35 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <Leaf className="w-3 h-3 text-emerald-400 animate-pulse" /> Veg
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-red-950/85 backdrop-blur-md border border-red-500/35 text-rose-400 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-[0_0_10px_rgba(244,63,94,0.2)]">
              <Flame className="w-3 h-3 text-rose-400 animate-pulse" /> Non-Veg
            </span>
          )}
        </div>

        {/* Category tag bubble */}
        <div className="absolute bottom-3 left-3 bg-dark-bg/90 backdrop-blur-md border border-gold/30 text-gold text-[7.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded shadow-[0_0_10px_rgba(197,168,128,0.25)]">
          {dish.category}
        </div>
      </div>

      {/* Cost descriptions metadata */}
      <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-serif text-lg font-bold text-white group-hover:text-gold group-hover:drop-shadow-[0_0_10px_rgba(197,168,128,0.4)] transition-all duration-300 leading-snug">
              {dish.name}
            </h3>
            <span className="font-serif text-base font-black text-gold shrink-0 drop-shadow-[0_0_8px_rgba(197,168,128,0.3)]">
              ₹{displayPrice}
            </span>
          </div>
          
          {/* Neon animated separator rule under name */}
          <div className="w-0 group-hover:w-16 h-[1.5px] bg-gradient-to-r from-gold to-transparent transition-all duration-500"></div>

          <p className="text-[11px] text-gray-400 italic mt-1 leading-relaxed line-clamp-3">
            {dish.desc}
          </p>
        </div>

        {/* Responsive Options and Basket actions block */}
        <div className="space-y-4 mt-auto pt-2.5 border-t border-gold/10">
          
          {hasVariants && (
            <div className="space-y-1.5">
              <span className="text-[8px] uppercase font-bold text-gray-500 tracking-wider block">Portions Selector</span>
              <div className="grid grid-cols-2 gap-1.5">
                {dish.variants!.map((v, i) => (
                  <button
                    key={v.name}
                    onClick={() => setSelectedVariantIdx(i)}
                    className={`py-1 rounded text-[9px] uppercase font-bold tracking-widest transition-all ${
                      selectedVariantIdx === i 
                        ? "bg-gold/20 border border-gold text-gold shadow-[0_0_12px_rgba(197,168,128,0.25)]" 
                        : "bg-dark-accent border border-gray-800 text-gray-500 hover:text-white"
                    }`}
                  >
                    {v.name} (₹{v.price})
                  </button>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={() => onAddToBasket(dish, activeVariant)}
            className="w-full py-2.5 bg-gold hover:bg-gold-light text-[#050608] text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(197,168,128,0.45)] active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Add to Basket
          </button>
        </div>
      </div>
    </div>
  );
}
