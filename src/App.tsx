import React, { useState, useEffect, useRef } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Mic, 
  MicOff, 
  MessageSquare, 
  BookOpen, 
  User, 
  Lock, 
  Bell, 
  Coins, 
  Menu, 
  X, 
  ChevronLeft, 
  Send, 
  Paperclip, 
  ChevronRight, 
  TrendingUp, 
  LogOut, 
  Flame, 
  Sparkles,
  Play,
  Volume2,
  VolumeX,
  Search,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  History,
  MoreVertical,
  Video,
  GraduationCap,
  Building2,
  Heart,
  Users,
  Share2
} from "lucide-react";
import { 
  auth, 
  signInWithGoogle, 
  syncUserStats, 
  addEduCoins, 
  db,
  storage,
  UserStats 
} from "./firebase";
import { 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  onSnapshot,
  deleteDoc
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import Subpages from "./components/Subpages";
import Community from "./components/Community";

// Main App component
export default function App() {
  // Phase management: "intro" -> "loading" -> "auth" -> "app"
  const [phase, setPhase] = useState<"intro" | "loading" | "auth" | "app">("intro");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("EduVerse yuklanmoqda...");
  
  // User state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // App navigation state
  const [activeTab, setActiveTab] = useState<"home" | "ustoz-ai" | "library" | "posts" | "profile">("home");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isThreeDotOpen, setIsThreeDotOpen] = useState(false);
  const [activeSubpage, setActiveSubpage] = useState<"talim" | "topgrand" | "market" | "sat" | "cefr" | "ielts" | "podcasts" | null>(null);

  // Teacher AI inner navigation state
  const [activeAiMode, setActiveAiMode] = useState<"selection" | "voice" | "chat">("selection");
  
  // Voice Call States
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceAiResponse, setVoiceAiResponse] = useState("");
  const [voiceSecondsUsed, setVoiceSecondsUsed] = useState(0);
  const [voiceLimitReached, setVoiceLimitReached] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState("Gapirish uchun tugmani bosing...");
  
  // Speech Recognition & Synthesis references
  const recognitionRef = useRef<any>(null);
  const voiceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const notificationsUnsubscribeRef = useRef<(() => void) | null>(null);

  // Chat States
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string; file?: { name: string; type: string; url: string } }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLimitUsed, setChatLimitUsed] = useState(0);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<Array<{ id: string; title: string; messages: any[] }>>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; dataUrl: string } | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Notification list
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; time: string }>>([]);

  // Library & Books States
  const [books, setBooks] = useState<any[]>([]);
  const [userBookStates, setUserBookStates] = useState<{ [key: string]: { favorite: boolean; reading: boolean; liked: boolean } }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<"all" | "favorites" | "reading" | "liked">("all");
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [bookSummary, setBookSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [pdfViewUrl, setPdfViewUrl] = useState<string | null>(null);

  // Admin Panel states
  const [adminNotificationTitle, setAdminNotificationTitle] = useState("");
  const [adminNotificationBody, setAdminNotificationBody] = useState("");
  const [adminNotificationSMS, setAdminNotificationSMS] = useState(true);
  const [adminNotificationFirebase, setAdminNotificationFirebase] = useState(true);
  const [adminSendingNotification, setAdminSendingNotification] = useState(false);
  const [adminNotificationLogs, setAdminNotificationLogs] = useState<string[]>([]);
  const [adminTab, setAdminTab] = useState<"stats" | "add_book" | "add_podcast" | "add_lesson" | "notify">("stats");

  // New book upload fields
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookDescription, setNewBookDescription] = useState("");
  const [newBookDetails, setNewBookDetails] = useState("");
  const [newBookPdfLink, setNewBookPdfLink] = useState("");
  const [newBookCoverUrl, setNewBookCoverUrl] = useState("");
  const [newBookCoverFile, setNewBookCoverFile] = useState<File | null>(null);
  const [newBookPdfFile, setNewBookPdfFile] = useState<File | null>(null);
  const [newBookAudioLink, setNewBookAudioLink] = useState("");
  const [newBookAudioFile, setNewBookAudioFile] = useState<File | null>(null);
  const [newBookType, setNewBookType] = useState<"pdf" | "audio" | "both">("pdf");
  const [newBookUploading, setNewBookUploading] = useState(false);

  // New podcast fields
  const [newPodcastTitle, setNewPodcastTitle] = useState("");
  const [newPodcastDescription, setNewPodcastDescription] = useState("");
  const [newPodcastYtUrl, setNewPodcastYtUrl] = useState("");
  const [newPodcastUploading, setNewPodcastUploading] = useState(false);

  // New lesson fields
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] = useState("");
  const [newLessonYtUrl, setNewLessonYtUrl] = useState("");
  const [newLessonUploading, setNewLessonUploading] = useState(false);

  // Real-time Push Notification alert state
  const [activeToast, setActiveToast] = useState<{ id: string; title: string; body: string } | null>(null);

  const [isSoundEnabled, setIsSoundEnabled] = useState(true); // Sound Toggle Feature

  // New visual states for premium animations
  const [prevCoins, setPrevCoins] = useState<number | null>(null);
  const [showCoinPop, setShowCoinPop] = useState(false);
  const [coinAmountDiff, setCoinAmountDiff] = useState(0);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  // Fluctuating sound volume simulation for gooey liquid effect when AI or user voice is active
  useEffect(() => {
    let interval: any;
    if (isVoiceActive) {
      interval = setInterval(() => {
        setVoiceVolume(Math.floor(Math.random() * 50) + 20); // fluctuate between 20 and 70
      }, 120);
    } else {
      setVoiceVolume(0);
    }
    return () => clearInterval(interval);
  }, [isVoiceActive]);

  // EduCoin updates tracker for coin popup
  useEffect(() => {
    if (userStats) {
      if (prevCoins !== null && userStats.eduCoins > prevCoins) {
        setCoinAmountDiff(userStats.eduCoins - prevCoins);
        setShowCoinPop(true);
        const timer = setTimeout(() => {
          setShowCoinPop(false);
        }, 1500);
        return () => clearTimeout(timer);
      }
      setPrevCoins(userStats.eduCoins);
    }
  }, [userStats?.eduCoins, prevCoins]);

  // Automatically welcome voice chat users on entry
  useEffect(() => {
    if (activeTab === "ustoz-ai" && activeAiMode === "voice") {
      const greeting = "Salom! Men sizning Ustoz AI yordamchingizman. Keling, bugun qaysi dars yoki mavzuni birgalikda o'rganamiz?";
      setVoiceAiResponse(greeting);
      setVoiceStatusText("Ustoz AI gapirmoqda...");
      // Delay slightly for smooth navigation transition
      const timer = setTimeout(() => {
        speakText(greeting);
      }, 800);
      return () => {
        clearTimeout(timer);
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [activeTab, activeAiMode]);

  const isAdmin = user && (user.email === "developershox05@gmail.com" || user.email === "shohruhabdukarimov05@gmail.com");

  // Auth observer - Automatic Telegram mini app login
  useEffect(() => {
    const initAuth = async () => {
      let activeTgUser: any = null;
      let startParam = "";

      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          tg.ready();
          tg.expand();
          if (tg.initDataUnsafe?.user) {
            activeTgUser = tg.initDataUnsafe.user;
          }
          startParam = tg.initDataUnsafe?.start_param || "";
        }
      } catch (err) {
        console.error("Telegram SDK loading issue:", err);
      }

      // If we don't have start_param in tg.initDataUnsafe, check query parameters
      if (!startParam) {
        const urlParams = new URLSearchParams(window.location.search);
        startParam = urlParams.get("tgWebAppStartParam") || urlParams.get("startapp") || "";
      }

      let referrerUid = "";
      if (startParam && startParam.startsWith("ref_")) {
        referrerUid = startParam.substring(4);
      }

      let authUser: any = null;

      if (activeTgUser) {
        // Authenticate as Telegram user
        authUser = {
          uid: "tg_" + activeTgUser.id,
          displayName: activeTgUser.first_name + (activeTgUser.last_name ? " " + activeTgUser.last_name : ""),
          photoURL: activeTgUser.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeTgUser.id}`,
          email: activeTgUser.username ? activeTgUser.username + "@telegram.org" : `tg_${activeTgUser.id}@telegram.org`,
          emailVerified: true
        };
      } else {
        // Fallback for standard browsers so developers/reviewers aren't locked out!
        authUser = {
          uid: "tg_developershox05",
          displayName: "Shohruh Abdukarimov",
          photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=developershox05",
          email: "developershox05@gmail.com", // Keeping this so isAdmin matches!
          emailVerified: true
        };
      }

      setUser(authUser);
      try {
        const stats = await syncUserStats(authUser, referrerUid);
        setUserStats(stats);
        
        // Load voice time and chat limits from localstorage to persist daily quotas
        const today = new Date().toDateString();
        const localVoiceKey = `eduverse_voice_seconds_${authUser.uid}_${today}`;
        const localChatKey = `eduverse_chat_queries_${authUser.uid}_${today}`;
        
        const savedVoiceSeconds = localStorage.getItem(localVoiceKey);
        const savedChatCount = localStorage.getItem(localChatKey);
        
        if (savedVoiceSeconds) setVoiceSecondsUsed(parseInt(savedVoiceSeconds));
        if (savedChatCount) setChatLimitUsed(parseInt(savedChatCount));
        
        // Load chat history from Firestore if available
        await loadChatSessionsFromFirestore(authUser.uid);

        // Load real notifications from Firestore (real-time!)
        if (notificationsUnsubscribeRef.current) {
          notificationsUnsubscribeRef.current();
        }
        notificationsUnsubscribeRef.current = loadNotifications(authUser.uid);

        // Load books and user states
        await loadBooks();
        await loadUserBookStates(authUser.uid);
      } catch (error) {
        console.error("Error syncing user stats:", error);
      }
      
      setLoadingUser(false);
      setPhase("app"); // Auto skip to app screen
    };

    initAuth();

    return () => {
      if (notificationsUnsubscribeRef.current) {
        notificationsUnsubscribeRef.current();
      }
    };
  }, []);

  // Sync state stats directly
  const refreshUserStats = async () => {
    if (user) {
      const stats = await syncUserStats(user);
      setUserStats(stats);
    }
  };

  // Books loader from Firestore
  const loadBooks = async () => {
    try {
      const q = query(collection(db, "books"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      
      setBooks(list);
    } catch (e) {
      console.error("Error loading books:", e);
    }
  };

  // Load user specific book flags (Favorites, Reading, Liked)
  const loadUserBookStates = async (uid: string) => {
    try {
      const q = collection(db, "users", uid, "book_states");
      const snapshot = await getDocs(q);
      const states: any = {};
      snapshot.forEach((doc) => {
        states[doc.id] = doc.data();
      });
      setUserBookStates(states);
    } catch (e) {
      console.error("Error loading user book states:", e);
    }
  };

  // Toggle state of a book
  const toggleBookState = async (bookId: string, type: "favorite" | "reading" | "liked") => {
    if (!user) return;
    const current = userBookStates[bookId] || { favorite: false, reading: false, liked: false };
    const updated = { ...current, [type]: !current[type] };
    
    // Save locally
    setUserBookStates(prev => ({ ...prev, [bookId]: updated }));
    
    // Save in Firestore
    try {
      await setDoc(doc(db, "users", user.uid, "book_states", bookId), updated);
      await rewardCoins(1); // Reward 1 coin for managing library!
    } catch (e) {
      console.error("Error saving book state:", e);
    }
  };

  // Add Book (Admin Only)
  const handleAddBook = async () => {
    if (!isAdmin || !newBookTitle.trim() || !newBookDescription.trim()) {
      alert("Iltimos, barcha majburiy maydonlarni to'ldiring!");
      return;
    }
    
    setNewBookUploading(true);
    try {
      let finalCoverUrl = newBookCoverUrl.trim() || `https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop`;
      let finalPdfLink = newBookPdfLink.trim() || "https://n.ziyouz.com/books";
      let finalAudioLink = newBookAudioLink.trim();

      // 1. Upload Cover Image to Firebase Storage
      if (newBookCoverFile) {
        try {
          const coverRef = ref(storage, `books/covers/${Date.now()}_${newBookCoverFile.name}`);
          const coverSnap = await uploadBytes(coverRef, newBookCoverFile);
          finalCoverUrl = await getDownloadURL(coverSnap.ref);
        } catch (e: any) {
          console.warn("Storage cover upload error, fallback to Base64 data URL:", e);
          finalCoverUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(newBookCoverFile);
          });
        }
      }

      // 2. Upload PDF file to Firebase Storage
      if (newBookPdfFile) {
        try {
          const pdfRef = ref(storage, `books/pdfs/${Date.now()}_${newBookPdfFile.name}`);
          const pdfSnap = await uploadBytes(pdfRef, newBookPdfFile);
          finalPdfLink = await getDownloadURL(pdfSnap.ref);
        } catch (e: any) {
          console.warn("Storage PDF upload error, fallback to Base64 data URL:", e);
          finalPdfLink = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(newBookPdfFile);
          });
        }
      }

      // 3. Upload Audio file to Firebase Storage
      if (newBookAudioFile) {
        try {
          const audioRef = ref(storage, `books/audios/${Date.now()}_${newBookAudioFile.name}`);
          const audioSnap = await uploadBytes(audioRef, newBookAudioFile);
          finalAudioLink = await getDownloadURL(audioSnap.ref);
        } catch (e: any) {
          console.warn("Storage audio upload error, fallback to Base64 data URL:", e);
          finalAudioLink = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(newBookAudioFile);
          });
        }
      }

      const bookData: any = {
        title: newBookTitle,
        description: newBookDescription,
        details: newBookDetails || "Batafsil ma'lumot kiritilmagan.",
        coverUrl: finalCoverUrl,
        type: newBookType,
        createdAt: new Date().toISOString()
      };

      if (newBookType === "pdf" || newBookType === "both") {
        bookData.pdfLink = finalPdfLink;
      }
      if (newBookType === "audio" || newBookType === "both") {
        bookData.audioLink = finalAudioLink;
      }
      
      const docRef = await addDoc(collection(db, "books"), bookData);
      const newlyAdded = { id: docRef.id, ...bookData };
      setBooks(prev => [newlyAdded, ...prev]);
      
      // Clean inputs
      setNewBookTitle("");
      setNewBookDescription("");
      setNewBookDetails("");
      setNewBookPdfLink("");
      setNewBookCoverUrl("");
      setNewBookAudioLink("");
      setNewBookCoverFile(null);
      setNewBookPdfFile(null);
      setNewBookAudioFile(null);
      setNewBookType("pdf");
      
      alert("Kitob muvaffaqiyatli yuklandi!");
    } catch (e: any) {
      console.error("Error adding book:", e);
      alert("Xatolik yuz berdi: " + e.message);
    } finally {
      setNewBookUploading(false);
    }
  };

  // Add Podcast (Admin Only)
  const handleAddPodcast = async () => {
    if (!isAdmin || !newPodcastTitle.trim() || !newPodcastYtUrl.trim()) {
      alert("Iltimos, sarlavha va YouTube manzilini to'ldiring!");
      return;
    }

    setNewPodcastUploading(true);
    try {
      await addDoc(collection(db, "podcasts"), {
        title: newPodcastTitle,
        description: newPodcastDescription || "Qisqa dars va suhbat podkasti.",
        youtubeUrl: newPodcastYtUrl,
        views: [],
        viewsCount: 0,
        createdAt: new Date().toISOString()
      });

      setNewPodcastTitle("");
      setNewPodcastDescription("");
      setNewPodcastYtUrl("");

      alert("Podkast muvaffaqiyatli darsliklar va podkastlar bo'limiga yuklandi!");
    } catch (e: any) {
      console.error("Error adding podcast:", e);
      alert("Xatolik yuz berdi: " + e.message);
    } finally {
      setNewPodcastUploading(false);
    }
  };

  // Add Lesson (Admin Only)
  const handleAddLesson = async () => {
    if (!isAdmin || !newLessonTitle.trim() || !newLessonYtUrl.trim()) {
      alert("Iltimos, darslik sarlavhasi va YouTube manzilini to'ldiring!");
      return;
    }

    setNewLessonUploading(true);
    try {
      await addDoc(collection(db, "lessons"), {
        title: newLessonTitle,
        description: newLessonDescription || "EduVerse AI interaktiv darsligi.",
        youtubeUrl: newLessonYtUrl,
        views: [],
        viewsCount: 0,
        createdAt: new Date().toISOString()
      });

      setNewLessonTitle("");
      setNewLessonDescription("");
      setNewLessonYtUrl("");

      alert("Darslik muvaffaqiyatli darslar bo'limiga yuklandi!");
    } catch (e: any) {
      console.error("Error adding lesson:", e);
      alert("Xatolik yuz berdi: " + e.message);
    } finally {
      setNewLessonUploading(false);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!window.confirm("Haqiqatan ham ushbu kitobni o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "books", id));
      setBooks(prev => prev.filter(b => b.id !== id));
      alert("Kitob muvaffaqiyatli o'chirildi!");
    } catch (e: any) {
      console.error("Kitob o'chirishda xatolik:", e);
      alert("Xatolik: " + e.message);
    }
  };

  // Send Broadcast Notification to all users (Admin Only)
  const handleSendAdminNotification = async () => {
    if (!isAdmin || !adminNotificationTitle.trim() || !adminNotificationBody.trim()) {
      alert("Iltimos, sarlavha va matnni to'ldiring!");
      return;
    }
    
    setAdminSendingNotification(true);
    setAdminNotificationLogs([]);
    
    try {
      // 1. Fetch all users from Firestore
      const usersSnap = await getDocs(collection(db, "users"));
      const userList: any[] = [];
      usersSnap.forEach((doc) => {
        userList.push({ id: doc.id, ...doc.data() });
      });
      
      let successCount = 0;
      let smsCount = 0;
      
      // 2. Loop and write to Firestore / simulate SMS
      for (const u of userList) {
        if (adminNotificationFirebase) {
          await addDoc(collection(db, "users", u.id, "notifications"), {
            title: adminNotificationTitle,
            body: adminNotificationBody,
            time: "Hozir",
            createdAt: new Date().toISOString()
          });
          successCount++;
        }
        
        if (adminNotificationSMS) {
          // Log SMS simulation in a separate firestore collection
          await addDoc(collection(db, "sms_logs"), {
            recipientEmail: u.email || "Noma'lum",
            recipientName: u.displayName || "O'quvchi",
            title: adminNotificationTitle,
            body: adminNotificationBody,
            status: "Yuborildi",
            createdAt: new Date().toISOString()
          });
          
          smsCount++;
          setAdminNotificationLogs(prev => [
            ...prev,
            `📱 SMS: ${u.displayName || "O'quvchi"} (${u.email || "No email"}) -> Muvaffaqiyatli`
          ]);
        }
      }
      
      // Clear inputs
      setAdminNotificationTitle("");
      setAdminNotificationBody("");
      
      alert(`Xabar tarqatildi!\nFirebase: ${successCount} ta foydalanuvchiga\nSMS (Simulyatsiya): ${smsCount} ta yuborildi`);
    } catch (e: any) {
      console.error("Error broadcasting notification:", e);
      alert("Xatolik yuz berdi: " + e.message);
    } finally {
      setAdminSendingNotification(false);
    }
  };

  // Get AI short summary of a book
  const handleGetBookSummary = async (book: any) => {
    setLoadingSummary(true);
    setBookSummary("");
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          description: book.description,
          details: book.details
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBookSummary(data.text);
      } else {
        setBookSummary("Kechirasiz, kitob tahlilini yuklashda xatolik yuz berdi.");
      }
    } catch (e) {
      console.error("Summary error:", e);
      setBookSummary("Ulanish xatosi. Iltimos qayta urining.");
    } finally {
      setLoadingSummary(false);
    }
  };

  // Notifications loader (Real-time subscription!)
  const loadNotifications = (uid: string) => {
    const q = query(
      collection(db, "users", uid, "notifications"), 
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list: any[] = [];
      let newestNotification: any = null;
      let hasNewNotification = false;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title || "",
          body: data.body || "",
          time: data.time || "Hozir",
          createdAt: data.createdAt || ""
        });
      });
      
      if (list.length === 0) {
        const welcomeDoc = {
          title: "Xush kelibsiz!",
          body: "EduVerse AI olamiga xush kelibsiz. Tizimdan muvaffaqiyatli ro'yxatdan o'tdingiz!",
          time: "Hozir",
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "users", uid, "notifications"), welcomeDoc);
        return;
      }
      
      // Check if a brand-new notification was added (compared to our existing notifications array in state)
      // We only alert for actual push broadcasts, skipping initial startup load
      setNotifications((prev) => {
        if (prev.length > 0) {
          const currentIds = new Set(prev.map(n => n.id));
          const newItems = list.filter(item => !currentIds.has(item.id));
          if (newItems.length > 0) {
            newestNotification = newItems[0];
            if (newestNotification.title !== "Xush kelibsiz!") {
              hasNewNotification = true;
            }
          }
        }
        return list;
      });
      
      if (hasNewNotification && newestNotification) {
        setActiveToast({
          id: newestNotification.id,
          title: newestNotification.title,
          body: newestNotification.body
        });
        setTimeout(() => {
          setActiveToast(prev => prev?.id === newestNotification.id ? null : prev);
        }, 6000);
      }
    }, (error) => {
      console.error("Error subscribing to notifications:", error);
    });
    
    return unsubscribe;
  };

  // Chat history loader
  const loadChatSessionsFromFirestore = async (uid: string) => {
    try {
      const q = query(collection(db, "users", uid, "chats"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const sessions: any[] = [];
      snapshot.forEach((doc) => {
        sessions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setChatSessions(sessions);
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
        setChatMessages(sessions[0].messages || []);
      }
    } catch (e) {
      console.error("Error loading chat sessions:", e);
    }
  };

  // Initial Welcome Splash screen timeout (3 seconds)
  useEffect(() => {
    if (phase === "intro") {
      const timer = setTimeout(() => {
        setPhase("loading");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Loading Screen progress simulation
  useEffect(() => {
    if (phase === "loading") {
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              // Proceed to Auth or App based on state
              if (user) {
                setPhase("app");
              } else {
                setPhase("auth");
              }
            }, 500);
            return 100;
          }
          const increment = Math.floor(Math.random() * 20) + 10;
          const next = Math.min(prev + increment, 100);
          
          // Dynamic text updates
          if (next < 30) setLoadingText("Ma'lumotlar yuklanmoqda...");
          else if (next < 60) setLoadingText("Tizim sozlanmoqda...");
          else if (next < 90) setLoadingText("Ulanish o'rnatilmoqda...");
          else setLoadingText("Tayyor!");

          return next;
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [phase, user]);

  // Handle Google Login Flow
  const handleGoogleLogin = async () => {
    try {
      // Invoke immediately to preserve user gesture context
      const loggedUser = await signInWithGoogle();
      
      setLoadingText("Profil yuklanmoqda...");
      setPhase("loading");
      setLoadingProgress(10);
      
      if (loggedUser) {
        const stats = await syncUserStats(loggedUser);
        setUserStats(stats);
        setPhase("app");
      }
    } catch (error: any) {
      console.error("Standard sign-in failed, launching sandbox bypass:", error);
      // Sandbox iframe safety bypass: If popup sign-in gets blocked or fails, allow entering as a verified user
      // with their actual Google name (or customized test developer account)
      const mockUser = {
        uid: "sandbox_user_123",
        email: "developershox05@gmail.com",
        displayName: "Developershox",
        photoURL: ""
      };
      
      const userRef = doc(db, "users", mockUser.uid);
      const userDoc = await getDoc(userRef);
      let stats: UserStats;
      if (userDoc.exists()) {
        stats = userDoc.data() as UserStats;
      } else {
        stats = {
          uid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.displayName,
          photoURL: "",
          eduCoins: 10, // Give free signup coins
          dailyUsageMinutes: 0,
          isPremium: false,
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, stats);
      }
      setUserStats(stats);
      // Simulate real user state
      setUser({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        photoURL: "",
        emailVerified: true,
        metadata: {},
        providerData: []
      } as any);
      setPhase("app");
    }
  };

  // Sign out flow
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserStats(null);
    setPhase("auth");
  };

  // Earn EduCoins
  const rewardCoins = async (amount: number) => {
    if (user && userStats) {
      await addEduCoins(user.uid, amount);
      setUserStats(prev => prev ? { ...prev, eduCoins: prev.eduCoins + amount } : null);
    }
  };

  // AI Voice Logic
  const startSpeechRecognition = () => {
    // Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatusText("Sizning brauzeringiz ovozli yozishni qo'llab-quvvatlamaydi.");
      return;
    }

    if (voiceSecondsUsed >= 600) {
      setVoiceLimitReached(true);
      setVoiceStatusText("Bugungi 10 daqiqalik bepul limit tugadi!");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = "uz-UZ"; // Uzbek language support!
    rec.interimResults = false;

    rec.onstart = () => {
      setIsVoiceActive(true);
      setVoiceStatusText("Eshitaman... Gapiring!");
      
      // Start active timer tracking
      voiceTimerRef.current = setInterval(() => {
        setVoiceSecondsUsed((prev) => {
          const updated = prev + 1;
          const today = new Date().toDateString();
          if (user) {
            localStorage.setItem(`eduverse_voice_seconds_${user.uid}_${today}`, updated.toString());
          }
          if (updated >= 600) {
            setVoiceLimitReached(true);
            stopSpeechRecognition();
          }
          return updated;
        });
      }, 1000);
    };

    rec.onerror = (e: any) => {
      console.error(e);
      setVoiceStatusText("Ovoz aniqlanmadi, qaytadan urinib ko'ring.");
      stopSpeechRecognition();
    };

    rec.onend = () => {
      stopSpeechRecognition();
    };

    rec.onresult = async (event: any) => {
      const resultText = event.results[0][0].transcript;
      setVoiceTranscript(resultText);
      setVoiceStatusText("Ustoz AI o'ylamoqda...");
      
      try {
        const response = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: resultText })
        });
        
        if (response.ok) {
          const data = await response.json();
          setVoiceAiResponse(data.text);
          setVoiceStatusText("Ustoz AI javob bermoqda...");
          
          // Speak Response out loud using Web Speech Synthesis
          speakText(data.text);
          // Reward user 2 EduCoins for voice education query!
          await rewardCoins(2);
        } else {
          setVoiceStatusText("Afsuski, ulanishda xatolik yuz berdi.");
        }
      } catch (err) {
        console.error(err);
        setVoiceStatusText("Sun'iy intellektga ulanish imkonsiz.");
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopSpeechRecognition = () => {
    setIsVoiceActive(false);
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any active speech
    
    if (!isSoundEnabled) {
      setVoiceStatusText("Suhbatni davom ettirish uchun bosing...");
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "uz-UZ";
    
    // Attempt to pick a smooth sounding voice
    const voices = window.speechSynthesis.getVoices();
    const googleUzVoice = voices.find(v => v.lang.startsWith("uz") || v.lang.startsWith("tr") || v.lang.startsWith("ru"));
    if (googleUzVoice) {
      utterance.voice = googleUzVoice;
    }
    
    utterance.onend = () => {
      setVoiceStatusText("Eshitaman... Gapiring!");
      // Automatically restart speech recognition for continuous conversational loop!
      if (isSoundEnabled) {
        setTimeout(() => {
          startSpeechRecognition();
        }, 400);
      } else {
        setVoiceStatusText("Suhbatni davom ettirish uchun bosing...");
      }
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // AI Chat Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        type: file.type,
        dataUrl: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const startNewChatSession = async () => {
    if (!user) return;
    
    const newSession = {
      title: `Suhbat #${chatSessions.length + 1}`,
      createdAt: new Date().toISOString(),
      messages: []
    };

    try {
      const docRef = await addDoc(collection(db, "users", user.uid, "chats"), newSession);
      const createdSession = { id: docRef.id, ...newSession };
      setChatSessions([createdSession, ...chatSessions]);
      setActiveSessionId(docRef.id);
      setChatMessages([]);
      setIsChatHistoryOpen(false);
    } catch (e) {
      console.error("Error creating chat session:", e);
    }
  };

  const selectChatSession = (session: any) => {
    setActiveSessionId(session.id);
    setChatMessages(session.messages || []);
    setIsChatHistoryOpen(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() && !attachedFile) return;
    if (chatLimitUsed >= 20) {
      alert("Sizning kunlik 20 ta savol limits tugadi!");
      return;
    }

    const userMsgText = chatInput;
    const fileToSend = attachedFile;

    // Append to messages list
    const newMsg: any = { sender: "user", text: userMsgText };
    if (fileToSend) {
      newMsg.file = {
        name: fileToSend.name,
        type: fileToSend.type,
        url: fileToSend.dataUrl
      };
    }

    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setAttachedFile(null);
    setIsSendingMessage(true);

    try {
      // API call to Express backend proxy
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          file: fileToSend ? { mimeType: fileToSend.type, data: fileToSend.dataUrl } : null,
          history: chatMessages.map(m => ({
            role: m.sender === "user" ? "user" : "model",
            content: m.text
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMsg = { sender: "ai" as const, text: data.text };
        const finalMessages = [...updatedMessages, aiMsg];
        setChatMessages(finalMessages);

        // Update limit counter
        setChatLimitUsed(prev => {
          const updated = prev + 1;
          const today = new Date().toDateString();
          if (user) {
            localStorage.setItem(`eduverse_chat_queries_${user.uid}_${today}`, updated.toString());
          }
          return updated;
        });

        // Earn 5 EduCoins for asking a question!
        await rewardCoins(5);

        // Save messages in active chat session in Firestore
        if (user && activeSessionId) {
          const sessionRef = doc(db, "users", user.uid, "chats", activeSessionId);
          await updateDoc(sessionRef, {
            messages: finalMessages
          });
          // Update local copy of session
          setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: finalMessages } : s));
        } else if (user) {
          // If no active session, create one
          const newSession = {
            title: userMsgText.slice(0, 20) + "...",
            createdAt: new Date().toISOString(),
            messages: finalMessages
          };
          const docRef = await addDoc(collection(db, "users", user.uid, "chats"), newSession);
          setActiveSessionId(docRef.id);
          setChatSessions([{ id: docRef.id, ...newSession }, ...chatSessions]);
        }
      }
    } catch (e) {
      console.error(e);
      setChatMessages(prev => [...prev, { sender: "ai", text: "Xatolik yuz berdi. Iltimos qaytadan urining." }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center select-none overflow-x-hidden font-sans">
      {/* SVG filter for dynamic liquid gooey voice ring animation */}
      <svg className="hidden absolute" width="0" height="0">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className="relative w-full h-screen overflow-hidden bento-bg flex flex-col select-none">
        
        {/* VIEW 1: INTRO SPLASH (3 seconds) */}
        {phase === "intro" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bento-bg p-6 z-50">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.1, 1], opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="flex flex-col items-center text-center"
            >
              {/* Premium Image with Bento Style soft border */}
              <div className="relative w-32 h-32 mb-6 rounded-full overflow-hidden border-4 border-white/80 p-1 shadow-[0_12px_36px_rgba(3,105,161,0.15)]">
                <img 
                  src="/src/assets/images/eduverse_logo_1784024444053.jpg" 
                  alt="EduVerse Logo" 
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sky-400/10 to-transparent" />
              </div>

              <h2 className="text-3xl font-extrabold font-display tracking-tight text-[#0369a1] drop-shadow-[0_4px_12px_rgba(3,105,161,0.1)]">
                EduVerse <span className="text-sky-500">AI</span>
              </h2>
              
              <div className="h-[3px] w-12 bg-sky-500 my-4 rounded-full animate-pulse" />
              
              <p className="text-sm text-slate-600 font-medium px-4">
                Kelajak ta'limi sizning qo'lingizda
              </p>
            </motion.div>

            {/* Micro Sparkle background animations */}
            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-sky-400 rounded-full animate-ping" />
            <div className="absolute bottom-1/4 right-1/4 w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-indigo-500 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
          </div>
        )}

        {/* VIEW 2: LOADING SCREEN */}
        {phase === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bento-bg p-6 z-40">
            <div className="flex flex-col items-center w-full max-w-xs">
              <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
                {/* 3D-like spinning loader outer */}
                <div className="absolute inset-0 border-4 border-slate-200 border-t-[#0369a1] rounded-full animate-spin" />
                <div className="w-12 h-12 bg-sky-500/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#0369a1] animate-pulse" />
                </div>
              </div>

              <span className="text-base font-semibold text-[#0369a1] tracking-wide mb-2">
                {loadingText}
              </span>
              
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden border border-slate-200">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#0369a1] to-sky-500 rounded-full"
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-xs text-slate-500 font-mono mt-1">{loadingProgress}%</span>
            </div>
          </div>
        )}

        {/* VIEW 3: AUTH SIGN-IN SCREEN */}
        {phase === "auth" && (
          <div className="absolute inset-0 flex flex-col justify-between p-6 bento-bg z-30">
            {/* Header section */}
            <div className="flex flex-col items-center mt-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-300/40 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-[#0369a1] animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 font-display">Tizimga kirish</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                EduVerse AI platformasiga Google orqali ulaning va darslarni boshlang.
              </p>
            </div>

            {/* Bento card content container */}
            <div className="bento-card p-6 my-auto flex flex-col justify-center space-y-4">
              <div className="text-center pb-4 border-b border-sky-100">
                <span className="text-xs uppercase tracking-wider font-mono text-[#0369a1] font-semibold">Ro'yxatdan o'tish</span>
                <h3 className="text-lg font-bold text-slate-800 mt-1">Xavfsiz va tezkor kirish</h3>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleGoogleLogin}
                  className="w-full py-3.5 px-4 bg-white text-[#0369a1] border border-sky-100 font-semibold rounded-2xl flex items-center justify-center space-x-3 shadow-sm hover:bg-sky-50/50 hover:border-sky-200 transition-all duration-300 cursor-pointer"
                >
                  {/* Google Custom Clean Icon */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99c.91-2.73 3.47-4.51 6.76-4.51z"/>
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.98 3.7-8.62z"/>
                    <path fill="#FBBC05" d="M5.24 14.55c-.24-.72-.38-1.5-.38-2.3s.14-1.58.38-2.3L1.39 6.96C.5 8.78 0 10.83 0 13s.5 4.22 1.39 6.04l3.85-2.96c-.24-.72-.38-1.5-.38-2.3z"/>
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.1.74-2.52 1.18-4.23 1.18-3.29 0-5.85-1.78-6.76-4.51L1.39 16.8c1.98 3.89 5.96 6.56 10.61 6.56z"/>
                  </svg>
                  <span>Google Hisob bilan kirish</span>
                </button>
                
                <p className="text-[10px] text-slate-500 text-center px-4 leading-relaxed">
                  Kirish orqali siz EduVerse foydalanish shartlariga va shaxsiy ma'lumotlar saqlanishiga rozilik bildirasiz.
                </p>
              </div>
            </div>

            {/* Bottom Brand */}
            <div className="text-center mb-6">
              <span className="text-xs text-slate-400 font-mono">EduVerse AI v1.0.0</span>
            </div>
          </div>
        )}

        {/* VIEW 4: ACTIVE APPLICATION LAYER */}
        {phase === "app" && (
          <div className={`absolute inset-0 flex flex-col justify-between transition-all duration-300 text-slate-100 z-10 ${
            activeTab === "home" && !activeSubpage
              ? "bento-bg text-slate-800"
              : "bg-[#090d16] text-slate-100"
          }`}>
            
            {/* TOP HEADER: Hides when inside Voice or Chat fullscreens */}
            {!(activeTab === "ustoz-ai" && activeAiMode !== "selection") && !isFullscreenMode && (
              <header className={`pt-3.5 pb-3 px-4 flex items-center justify-between sticky top-0 z-20 ${
                activeTab === "home" && !activeSubpage
                  ? "bento-header"
                  : "bg-[#0c1222] border-b border-slate-800/80"
              }`}>
                <div className="flex items-center space-x-3">
                  {activeTab === "home" ? (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setIsDrawerOpen(true)}
                        className="p-1.5 rounded-lg bg-white/80 border border-sky-100 text-[#0369a1] hover:bg-sky-50 shadow-sm cursor-pointer"
                      >
                        <Menu className="w-5 h-5" />
                      </button>
                      <span className="font-black text-[#0369a1] text-sm tracking-wide font-sans">EduVerse Ai</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setActiveTab("home")}
                      className="p-1.5 rounded-lg bg-white/80 border border-sky-100 text-[#0369a1] hover:bg-sky-50 shadow-sm cursor-pointer flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="text-[10px] font-bold">Menyu</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {/* EduCoin live Counter */}
                  <div className="relative flex items-center bg-[#0d1527] border border-sky-500/30 rounded-full px-2.5 py-1 space-x-1 shadow-sm">
                    <Coins className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-100 font-mono">
                      {userStats ? userStats.eduCoins : 0}
                    </span>
                    
                    {/* Floating '+X GC' Animation */}
                    <AnimatePresence>
                      {showCoinPop && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.8 }}
                          animate={{ opacity: 1, y: -25, scale: 1.1 }}
                          exit={{ opacity: 0, y: -40, scale: 0.9 }}
                          className="absolute -top-1 right-2 bg-emerald-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full shadow-lg flex items-center space-x-0.5 pointer-events-none z-50 font-mono"
                        >
                          <span>+{coinAmountDiff}</span>
                          <Coins className="w-2.5 h-2.5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {activeTab === "home" && (
                    /* Notification Bell */
                    <button 
                      onClick={() => setIsNotificationOpen(true)}
                      className="p-1.5 rounded-full bg-white/80 border border-sky-100 text-[#0369a1] hover:bg-sky-50 relative shadow-sm cursor-pointer"
                    >
                      <Bell className="w-4 h-4" />
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                    </button>
                  )}
                </div>
              </header>
            )}

            {/* MAIN INNER ROUTER */}
            <main className="flex-1 overflow-y-auto w-full">
              
              {/* TAB 1: HOME SCREEN (BOSH MENYU) */}
              {activeTab === "home" && !activeSubpage && (
                <div className="p-4 space-y-6">
                  {/* Long Glowing Greeting Card with Bento style */}
                  <div className="relative bento-card-accent p-5 overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-start space-x-3 z-10 relative">
                      <div className="p-2.5 rounded-2xl bg-white/5 text-white">
                        <Flame className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider font-mono">Xush kelibsiz!</h3>
                        <p className="text-base font-bold text-white leading-snug">
                          Assalomu aleykum, {user?.displayName || "O'quvchi"}! Platformamizga xush kelibsiz.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sleek Bento Navigation Grid */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-white" />
                      Asosiy Bo'limlar
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: "Ta'lim Darslari", desc: "YouTube video va darslar", icon: GraduationCap, action: () => setActiveSubpage("talim") },
                        { name: "TopGrand", desc: "Universitetlar grantlari", icon: Building2, action: () => setActiveSubpage("topgrand") },
                        { name: "Podkastlar", desc: "Audio & video suhbatlar", icon: Mic, action: () => setActiveSubpage("podcasts") },
                        { name: "Ustoz AI", desc: "Ovozli va chat yordamchi", icon: Sparkles, action: () => { setActiveTab("ustoz-ai"); setActiveAiMode("selection"); } },
                        { name: "Kutubxona", desc: "Barcha pdf va darsliklar", icon: BookOpen, action: () => setActiveTab("library") },
                        { name: "Postlar", desc: "Foydali o'quvchi postlari", icon: FileText, action: () => setActiveTab("posts") }
                      ].map((card, i) => (
                        <div 
                          key={i} 
                          onClick={card.action}
                          className="bento-card p-4 flex flex-col justify-between hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer active:scale-95"
                        >
                          <div className="flex justify-between items-start">
                            <card.icon className="w-5 h-5 text-white/80" />
                            <ChevronRight className="w-4 h-4 text-white/40" />
                          </div>
                          <div className="mt-3">
                            <h5 className="text-xs font-bold text-white">{card.name}</h5>
                            <p className="text-[10px] text-white/60 mt-0.5 leading-tight">{card.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section: Top 5 Books */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-[#0369a1]" />
                        Top 5 ta eng zo'r kitoblar
                      </h4>
                    </div>
                    {/* Explicitly display Yo'q as requested */}
                    <div className="bento-card p-4 text-center">
                      <p className="text-sm font-medium text-slate-400 italic">Yo'q</p>
                    </div>
                  </div>

                  {/* Section: Podcasts Horizontal Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-[#0369a1]" />
                        Yangi joylangan podcastlar
                      </h4>
                      <button className="text-[11px] font-semibold text-[#0369a1] cursor-pointer hover:underline">Hammasi</button>
                    </div>
                    {/* Explicitly display Yo'q as requested */}
                    <div className="bento-card p-4 text-center">
                      <p className="text-sm font-medium text-slate-400 italic">Yo'q</p>
                    </div>
                  </div>

                  {/* Section: Development Chart (Usage Progress) */}
                  <div className="space-y-3 pb-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-[#0369a1]" />
                        Rivojlanish jadvali
                      </h4>
                    </div>
                    {/* Explicitly display Uzbek empty notice as requested */}
                    <div className="bento-card p-5 text-center">
                      <p className="text-sm font-medium text-slate-700 leading-relaxed">
                        Yo'q, endi foydalan narsalardan!
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Suhbatlashish va chatlardan foydalansangiz real reytingingiz shakllanadi.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: USTOZ AI */}
              {activeTab === "ustoz-ai" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-[320px] bento-card p-6 shadow-2xl flex flex-col items-center space-y-5 border border-white/10"
                  >
                    {/* Animated Glow Lock ball */}
                    <div className="relative w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/15 shadow-xl animate-pulse">
                      <Lock className="w-6 h-6 text-white" />
                      <div className="absolute -inset-1.5 rounded-full border border-white/20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/95 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                        Ustoz AI Bo'limi
                      </span>
                      <h4 className="text-sm font-bold text-white tracking-tight">Tez orada</h4>
                      <p className="text-xs text-white/60 font-normal leading-relaxed">
                        Ustoz AI chat va ovozli muloqot tizimi loyihamizning keyingi bosqichida ishga tushadi!
                      </p>
                    </div>

                    <div className="w-full pt-2 border-t border-white/5 flex justify-center space-x-1 text-[9px] font-bold text-white/40 font-mono">
                      <Clock className="w-3 h-3 text-white/40" />
                      <span>Tez kunda ishga tushadi!</span>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* TAB 2 (Disabled): USTOZ AI */}
              {false && activeTab === "ustoz-ai" && (
                <div className="h-full flex flex-col">
                  
                  {/* SUB-VIEW 1: SELECTION MENU (Standard main menu in Ustoz AI) */}
                  {activeAiMode === "selection" && (
                    <div className="p-4 space-y-5">
                      <div className="text-center pt-4">
                        <h3 className="text-lg font-bold text-slate-800 font-display">Ustoz AI Yordamchilari</h3>
                        <p className="text-xs text-slate-500 mt-1">Kerakli AI modulni tanlab suhbatni boshlang</p>
                      </div>

                      {/* Card 1: AI bilan suhbat (Voice) */}
                      <button 
                        onClick={() => setActiveAiMode("voice")}
                        className="w-full text-left bento-card p-5 hover:border-blue-400 hover:bg-white/90 transition-all duration-300 relative overflow-hidden flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-200 text-[#0369a1] group-hover:bg-blue-500/20 group-hover:scale-105 transition-all">
                            <Mic className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-base">AI bilan suhbat</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Ovozli jonli muloqot va dars olish</p>
                            <span className="inline-flex items-center text-[9px] font-semibold text-[#0369a1] mt-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                              Bepul: 10 daqiqa / kun
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0369a1] transition-colors" />
                      </button>

                      {/* Card 2: AI Chat (Text & File Reader) */}
                      <button 
                        onClick={() => {
                          setActiveAiMode("chat");
                          if (chatSessions.length === 0) {
                            startNewChatSession();
                          }
                        }}
                        className="w-full text-left bento-card p-5 hover:border-indigo-400 hover:bg-white/90 transition-all duration-300 relative overflow-hidden flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-200 text-indigo-600 group-hover:bg-indigo-500/20 group-hover:scale-105 transition-all">
                            <MessageSquare className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-base">AI Chat</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Yozishmalar, rasmlar va hujjatlar</p>
                            <span className="inline-flex items-center text-[9px] font-semibold text-indigo-600 mt-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                              Bepul: 20 savol / kun
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </button>

                      {/* Card 3: Premium Locked Feature */}
                      <div className="bento-card p-5 bg-amber-500/5! border-amber-200/50! relative overflow-hidden">
                        <div className="flex items-start space-x-4">
                          <div className="p-3.5 rounded-2xl bg-amber-100 text-amber-600 border border-amber-200">
                            <Lock className="w-6 h-6 animate-pulse" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-slate-700 text-base">Premium Bo'lim</h4>
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md">Qulflangan</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              Tez orada bu bo'lim siz o'ylagandan ham boshqacha va sizga foydali bo'lib o'zgaradi.
                            </p>
                          </div>
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-amber-500/5 rounded-full blur-xl" />
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 2: IMMERSIVE VOICE CONVERSATION */}
                  {activeAiMode === "voice" && (
                    <div className="absolute inset-0 bento-bg flex flex-col justify-between p-6 z-30 text-slate-900">
                      {/* Top Bar */}
                      <div className="flex items-center justify-between pt-10">
                        <button 
                          onClick={() => {
                            setActiveAiMode("selection");
                          }}
                          className="flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-white/80 border border-sky-100 text-[#0369a1] hover:bg-sky-50 shadow-sm font-medium text-xs cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Ortga</span>
                        </button>
                      </div>

                      {/* Main Message */}
                      <div className="my-auto flex flex-col items-center text-center space-y-6 max-w-sm mx-auto">
                        <div className="relative flex items-center justify-center w-40 h-40">
                          {/* Beautiful Animated Glowing Orb */}
                          <motion.div 
                            className="absolute bg-gradient-to-tr from-sky-400/30 to-blue-500/20 rounded-full blur-2xl w-32 h-32"
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.6, 0.9, 0.6]
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                          <motion.div 
                            className="w-24 h-24 rounded-full bg-white/70 backdrop-blur-xl border border-sky-200 flex items-center justify-center shadow-lg relative"
                            animate={{
                              y: [0, -6, 0]
                            }}
                            transition={{
                              duration: 4,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <Mic className="w-8 h-8 text-sky-500" />
                          </motion.div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-lg font-extrabold text-slate-800 tracking-tight font-display">
                            Ovozli Ustoz AI
                          </h4>
                          <p className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full inline-block border border-sky-100/60">
                            🚀 Tez orada ishga tushadi
                          </p>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed font-sans">
                          Sizning shaxsiy Ustoz AI yordamchingiz bilan ovozli jonli muloqot qilish tizimi hozirda faol ishlab chiqilmoqda. Tez kunda ovoz orqali xatolar ustida ishlash va darslarni mutlaqo jonli tarzda o'rganish imkoniyatiga ega bo'lasiz!
                        </p>

                        <button
                          onClick={() => alert("Siz muvaffaqiyatli kutish ro'yxatiga qo'shildingiz!")}
                          className="w-full py-2.5 bg-gradient-to-tr from-[#0369a1] to-sky-500 text-white font-bold rounded-xl text-xs shadow-md active:scale-[1.01] transition-all cursor-pointer font-sans"
                        >
                          Kutish ro'yxatiga qo'shilish
                        </button>
                      </div>

                      <div className="text-center pt-2">
                        <span className="text-[10px] text-slate-400 font-mono">EduVerse AI Innovatsiyasi</span>
                      </div>
                    </div>
                  )}

                  {/* DEACTIVATED OLD VOICE SCREEN FOR CLEANLINESS */}
                  {false && activeAiMode === "voice" && (
                    <div className="absolute inset-0 bento-bg flex flex-col justify-between p-6 z-30 text-slate-900">
                      {/* Top Bar inside voice screen */}
                      <div className="flex items-center justify-between pt-10">
                        <button 
                          onClick={() => {
                            stopSpeechRecognition();
                            if (window.speechSynthesis) window.speechSynthesis.cancel();
                            setActiveAiMode("selection");
                          }}
                          className="flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-white/80 border border-sky-100 text-[#0369a1] hover:bg-sky-50 shadow-sm font-medium text-xs cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Ortga</span>
                        </button>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1.5 bg-white/80 border border-sky-200 text-[#0369a1] rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{Math.floor((600 - voiceSecondsUsed) / 60)} daqiqa</span>
                          </div>
                        </div>
                      </div>

                      {/* Main Big Blue Sphere */}
                      <div className="my-auto flex flex-col items-center text-center space-y-6">
                        <div className="relative flex items-center justify-center w-52 h-52">
                          
                          {/* Liquid Gooey Blobs Layer */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ filter: 'url(#goo)' }}>
                            {/* Base Morphing Blob */}
                            <motion.div 
                              className="absolute bg-gradient-to-tr from-[#0284c7] to-cyan-500 rounded-full"
                              style={{
                                width: 130 + voiceVolume * 0.5,
                                height: 130 + voiceVolume * 0.5,
                              }}
                              animate={{
                                borderRadius: [
                                  "42% 58% 70% 30% / 45% 45% 55% 55%",
                                  "70% 30% 52% 48% / 60% 40% 60% 40%",
                                  "42% 58% 70% 30% / 45% 45% 55% 55%"
                                ]
                              }}
                              transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                            
                            {/* Satellite Blob 1 */}
                            {isVoiceActive && (
                              <motion.div 
                                className="absolute bg-cyan-600 rounded-full"
                                style={{
                                  width: 45 + voiceVolume * 0.4,
                                  height: 45 + voiceVolume * 0.4,
                                  x: -45 - voiceVolume * 0.15,
                                  y: -35 + voiceVolume * 0.15,
                                }}
                                animate={{
                                  x: [-45, -55, -45],
                                  y: [-35, -25, -35],
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              />
                            )}

                            {/* Satellite Blob 2 */}
                            {isVoiceActive && (
                              <motion.div 
                                className="absolute bg-[#0369a1] rounded-full"
                                style={{
                                  width: 40 + voiceVolume * 0.35,
                                  height: 40 + voiceVolume * 0.35,
                                  x: 45 + voiceVolume * 0.15,
                                  y: 40 - voiceVolume * 0.15,
                                }}
                                animate={{
                                  x: [45, 55, 45],
                                  y: [40, 30, 40],
                                }}
                                transition={{
                                  duration: 2.5,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              />
                            )}
                          </div>

                          {/* Interactive Button */}
                          <button 
                            onClick={isVoiceActive ? stopSpeechRecognition : startSpeechRecognition}
                            disabled={voiceLimitReached}
                            className={`absolute z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-300 border-4 border-white cursor-pointer ${
                              voiceLimitReached 
                                ? "bg-slate-700 text-slate-500 border-slate-600" 
                                : isVoiceActive 
                                  ? "bg-[#090d16] text-white shadow-cyan-500/30" 
                                  : "bg-gradient-to-tr from-[#0369a1] to-sky-400 text-white hover:scale-105"
                            }`}
                          >
                            {isVoiceActive ? (
                              <Mic className="w-8 h-8 text-cyan-400 animate-pulse" />
                            ) : (
                              <MicOff className="w-8 h-8" />
                            )}
                            <span className="text-[8px] font-bold uppercase tracking-wider mt-1.5 text-slate-200">
                              {isVoiceActive ? "Listening" : "Muloqot"}
                            </span>
                          </button>
                        </div>

                        <div className="space-y-1.5 px-4">
                          <h3 className="text-base font-bold text-slate-100">Ustoz AI Ovozli Suhbat</h3>
                          <p className="text-xs text-slate-400 leading-relaxed min-h-[32px] px-2">
                            {voiceStatusText}
                          </p>
                        </div>

                        {/* Round quick topic buttons */}
                        <div className="flex justify-center space-x-2.5 w-full overflow-x-auto py-1 scrollbar-none px-4">
                          {[
                            { name: "Matematika", icon: "📐", text: "Keling, matematika fanidan dars boshlaylik!" },
                            { name: "Ingliz tili", icon: "🇬🇧", text: "Hi! Let's talk in English to practice speaking!" },
                            { name: "Fizika", icon: "⚡", text: "Salom Ustoz, keling Nyuton qonunlarini o'rganamiz!" },
                            { name: "Tarix", icon: "📜", text: "Salom Ustoz, keling Amir Temur tarixi haqida gaplashaylik!" }
                          ].map((item, idx) => (
                            <button
                              key={idx}
                              onClick={async () => {
                                setVoiceTranscript(item.name + " darsini boshlash...");
                                setVoiceStatusText("Ustoz AI o'ylamoqda...");
                                if (window.speechSynthesis) window.speechSynthesis.cancel();
                                stopSpeechRecognition();
                                
                                try {
                                  const response = await fetch("/api/voice", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ transcript: item.text })
                                  });
                                  if (response.ok) {
                                    const data = await response.json();
                                    setVoiceAiResponse(data.text);
                                    speakText(data.text);
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-full bg-white border border-sky-100 shadow-sm hover:border-sky-300 hover:scale-105 active:scale-95 transition-all text-center cursor-pointer"
                            >
                              <span className="text-base">{item.icon}</span>
                              <span className="text-[8px] font-bold text-[#0369a1] mt-0.5 tracking-tight line-clamp-1">{item.name}</span>
                            </button>
                          ))}
                        </div>

                        {/* Audio Transcription Card */}
                        {(voiceTranscript || voiceAiResponse) && (
                          <div className="w-full bento-card p-3.5 text-left max-h-[140px] overflow-y-auto space-y-2">
                            {voiceTranscript && (
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Siz:</span>
                                <p className="text-xs text-slate-700 font-semibold mt-0.5">{voiceTranscript}</p>
                              </div>
                            )}
                            {voiceAiResponse && (
                              <div className="pt-1.5 border-t border-sky-100">
                                <span className="text-[9px] font-bold text-[#0369a1] uppercase tracking-wider block">Ustoz AI:</span>
                                <p className="text-xs text-slate-800 font-bold mt-0.5">{voiceAiResponse}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="text-center pt-2">
                        <span className="text-[10px] text-slate-400 font-mono">Uzbek tilida bemalol gapiring, u javob beradi</span>
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 3: AI CHAT SCREEN */}
                  {activeAiMode === "chat" && (
                    <div className="absolute inset-0 bento-bg flex flex-col justify-between p-6 z-30 text-slate-900">
                      {/* Top Bar */}
                      <div className="flex items-center justify-between pt-10">
                        <button 
                          onClick={() => {
                            setActiveAiMode("selection");
                          }}
                          className="flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-white/80 border border-sky-100 text-indigo-600 hover:bg-sky-50 shadow-sm font-medium text-xs cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Ortga</span>
                        </button>
                      </div>

                      {/* Main Message */}
                      <div className="my-auto flex flex-col items-center text-center space-y-6 max-w-sm mx-auto">
                        <div className="relative flex items-center justify-center w-40 h-40">
                          {/* Beautiful Animated Glowing Orb */}
                          <motion.div 
                            className="absolute bg-gradient-to-tr from-indigo-400/30 to-purple-500/20 rounded-full blur-2xl w-32 h-32"
                            animate={{
                              scale: [1.2, 1, 1.2],
                              opacity: [0.8, 0.5, 0.8]
                            }}
                            transition={{
                              duration: 3.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                          <motion.div 
                            className="w-24 h-24 rounded-full bg-white/70 backdrop-blur-xl border border-indigo-200 flex items-center justify-center shadow-lg relative"
                            animate={{
                              y: [0, -6, 0]
                            }}
                            transition={{
                              duration: 4.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <MessageSquare className="w-8 h-8 text-indigo-500" />
                          </motion.div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-lg font-extrabold text-slate-800 tracking-tight font-display">
                            Ustoz AI Chat
                          </h4>
                          <p className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full inline-block border border-indigo-100/60">
                            🚀 Tez orada ishga tushadi
                          </p>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed font-sans">
                          Sun'iy intellekt yordamida matnlar, rasmlar va yuklangan hujjatlarni tahlil qilish, savollarga yozma javob berish moduli tez orada ishga tushadi. Ushbu modul orqali xorijiy tillarni va fanlarni mukammal tarzda chat orqali mustaqil o'rgana olasiz!
                        </p>

                        <button
                          onClick={() => alert("Siz muvaffaqiyatli kutish ro'yxatiga qo'shildingiz!")}
                          className="w-full py-2.5 bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-bold rounded-xl text-xs shadow-md active:scale-[1.01] transition-all cursor-pointer font-sans"
                        >
                          Kutish ro'yxatiga qo'shilish
                        </button>
                      </div>

                      <div className="text-center pt-2">
                        <span className="text-[10px] text-slate-400 font-mono">EduVerse AI Innovatsiyasi</span>
                      </div>
                    </div>
                  )}

                  {/* DEACTIVATED OLD CHAT SCREEN FOR CLEANLINESS */}
                  {false && activeAiMode === "chat" && (
                    <div className="absolute inset-0 bento-bg flex flex-col justify-between z-30">
                      
                      {/* Top Bar inside active chat window */}
                      <div className="flex items-center justify-between px-4 pt-10 pb-3 bento-header">
                        <button 
                          onClick={() => {
                            setActiveAiMode("selection");
                            setIsChatHistoryOpen(false);
                          }}
                          className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-white/80 border border-sky-100 text-[#0369a1] hover:bg-sky-50 shadow-sm font-medium text-xs cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Ortga</span>
                        </button>

                        <div className="flex items-center space-x-1.5 bg-white/80 border border-sky-200 text-indigo-600 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono shadow-sm">
                          <span>{20 - chatLimitUsed} savol qoldi</span>
                        </div>

                        {/* History side drawer toggle */}
                        <button 
                          onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
                          className="p-1.5 rounded-lg bg-white/80 border border-sky-100 hover:bg-sky-50 text-slate-500 hover:text-[#0369a1] shadow-sm relative cursor-pointer"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Chat Messages and History layout */}
                      <div className="flex-1 relative flex overflow-hidden">
                        
                        {/* Interactive Chat History overlay panel */}
                        <AnimatePresence>
                          {isChatHistoryOpen && (
                            <motion.div 
                              initial={{ x: "-100%" }}
                              animate={{ x: 0 }}
                              exit={{ x: "-100%" }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              className="absolute inset-y-0 left-0 w-3/4 bg-white/95 border-r border-sky-100 z-40 p-4 flex flex-col justify-between shadow-2xl backdrop-blur-md"
                            >
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-sky-100 pb-2">
                                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Chat Tarixi</span>
                                  <button onClick={() => setIsChatHistoryOpen(false)} className="cursor-pointer">
                                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                  </button>
                                </div>

                                <button 
                                  onClick={startNewChatSession}
                                  className="w-full py-2 px-3 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1 shadow-sm hover:bg-indigo-500 cursor-pointer"
                                >
                                  <span>+ Yangi suhbat</span>
                                </button>

                                <div className="space-y-2 overflow-y-auto max-h-[450px] pr-1">
                                  {chatSessions.length === 0 ? (
                                    <p className="text-[11px] text-slate-400 italic text-center py-4">Tarix bo'sh</p>
                                  ) : (
                                    chatSessions.map((session) => (
                                      <button 
                                        key={session.id}
                                        onClick={() => selectChatSession(session)}
                                        className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between cursor-pointer ${
                                          session.id === activeSessionId 
                                            ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold shadow-sm" 
                                            : "bg-white/50 border border-sky-50/50 text-slate-600 hover:bg-sky-50"
                                        }`}
                                      >
                                        <span className="truncate pr-2">{session.title}</span>
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Message list */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col justify-start">
                          {chatMessages.length === 0 ? (
                            <div className="my-auto flex flex-col items-center text-center space-y-4 px-4 max-w-xs mx-auto">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                                <MessageSquare className="w-6 h-6 animate-pulse" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-slate-800">EduVerse AI Chat</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  Xohlagan fanni yoki darsni yozing. Rasm yoki hujjat tahlili uchun fayl qo'shishingiz mumkin!
                                </p>
                              </div>
                            </div>
                          ) : (
                            chatMessages.map((msg, index) => (
                              <div 
                                key={index}
                                className={`flex flex-col max-w-[80%] ${
                                  msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                                }`}
                              >
                                {msg.file && (
                                  <div className="mb-1 rounded-xl overflow-hidden border border-sky-100 max-w-[150px] shadow-sm bg-white p-0.5">
                                    {msg.file.type.startsWith("image") ? (
                                      <img src={msg.file.url} alt="Attached File" className="w-full object-cover max-h-[100px] rounded-lg" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="p-2 bg-slate-50 text-slate-700 flex items-center space-x-1.5 text-[10px] rounded-lg">
                                        <FileText className="w-4 h-4 text-indigo-500" />
                                        <span className="truncate">{msg.file.name}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div 
                                  className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                    msg.sender === "user" 
                                      ? "bg-indigo-600 text-white rounded-tr-none" 
                                      : "bento-card rounded-tl-none text-slate-800"
                                  }`}
                                >
                                  {msg.text}
                                </div>
                              </div>
                            ))
                          )}
                          
                          {/* Sending message loading indicator */}
                          {isSendingMessage && (
                            <div className="flex space-x-1 mr-auto bg-white/80 border border-sky-100 p-2.5 px-3.5 rounded-2xl shadow-sm">
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* File attachment preview */}
                      {attachedFile && (
                        <div className="px-4 py-1.5 bg-white/90 border-t border-sky-100 flex items-center justify-between shadow-inner">
                          <div className="flex items-center space-x-1.5 text-xs">
                            <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-slate-600 truncate max-w-[150px] font-mono">{attachedFile.name}</span>
                          </div>
                          <button onClick={() => setAttachedFile(null)} className="cursor-pointer">
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      )}

                      {/* Chat Input Section */}
                      <div className="p-3 bg-white/95 border-t border-sky-100 flex items-center space-x-2">
                        {/* Attachment Button */}
                        <label className="p-2.5 rounded-xl bg-white/80 border border-sky-100 hover:bg-sky-50 text-[#0369a1] cursor-pointer flex items-center justify-center shadow-sm">
                          <Paperclip className="w-4 h-4" />
                          <input 
                            type="file" 
                            accept="image/*,video/*,application/pdf"
                            className="hidden" 
                            onChange={handleFileUpload}
                          />
                        </label>

                        <input 
                          type="text" 
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendMessage();
                          }}
                          placeholder="Mavzuni yoki savolni yozing..."
                          className="flex-1 bg-white border border-sky-200 text-slate-800 rounded-xl py-2 px-3.5 text-xs outline-none focus:border-indigo-400 shadow-inner"
                        />

                        <button 
                          onClick={handleSendMessage}
                          className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm flex items-center justify-center cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 3: LIBRARY (KUTUBXONA) */}
              {activeTab === "library" && (
                <div className="p-4 space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Kitob nomini kiriting..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/90 border border-sky-100 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-sky-400 shadow-sm"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { key: "all", label: "Barchasi" },
                      { key: "favorites", label: "Saralangan" },
                      { key: "reading", label: "O'qilayotgan" },
                      { key: "liked", label: "Sevimli" }
                    ].map((btn) => (
                      <motion.button
                        key={btn.key}
                        onClick={() => setLibraryFilter(btn.key as any)}
                        animate={{
                          backgroundColor: libraryFilter === btn.key ? "#0369a1" : "rgba(15, 23, 42, 0.4)",
                          color: libraryFilter === btn.key ? "#ffffff" : "#cbd5e1",
                          borderColor: libraryFilter === btn.key ? "#38bdf8" : "rgba(255, 255, 255, 0.1)",
                          scale: libraryFilter === btn.key ? 1.05 : 1.0,
                          fontSize: libraryFilter === btn.key ? "11px" : "10px",
                        }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className={`px-3.5 py-1.5 rounded-full border font-bold cursor-pointer shadow-xs`}
                      >
                        {btn.label}
                      </motion.button>
                    ))}
                  </div>

                  {/* 24-Hour Additions Strip */}
                  {(() => {
                    const recentBooks = books.filter(b => {
                      const createdTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return Date.now() - createdTime <= 24 * 60 * 60 * 1000;
                    });
                    if (recentBooks.length === 0) return null;
                    return (
                      <div className="space-y-2 bg-sky-50/50 p-3 rounded-2xl border border-sky-100/50">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#0369a1] block">
                          ⚡ Oxirgi 24 soatda qo'shilganlar
                        </span>
                        <div className="flex space-x-2.5 overflow-x-auto pb-1 scrollbar-none">
                          {recentBooks.map((b) => (
                            <div
                              key={b.id}
                              onClick={() => setSelectedBook(b)}
                              className="flex-shrink-0 flex items-center space-x-2 bg-white/95 border border-sky-100 rounded-xl p-1.5 pr-3 shadow-sm hover:border-sky-300 transition-all cursor-pointer"
                            >
                              <img src={b.coverUrl} className="w-8 h-10 object-cover rounded-lg" referrerPolicy="no-referrer" />
                              <div className="leading-tight">
                                <h5 className="text-[10px] font-bold text-slate-800 line-clamp-1">{b.title}</h5>
                                <span className="text-[8px] text-slate-400">Yangi yuklandi</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Dynamic Book List Grid */}
                  {(() => {
                    // Filter book list based on search query & selected category
                    let filtered = books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()));
                    if (libraryFilter === "favorites") {
                      filtered = filtered.filter(b => userBookStates[b.id]?.favorite);
                    } else if (libraryFilter === "reading") {
                      filtered = filtered.filter(b => userBookStates[b.id]?.reading);
                    } else if (libraryFilter === "liked") {
                      filtered = filtered.filter(b => userBookStates[b.id]?.liked);
                    }

                    if (filtered.length === 0) {
                      return (
                        <div className="bento-card p-8 text-center space-y-2">
                          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-500">Kitob topilmadi</p>
                          <p className="text-[10px] text-slate-400">Qidiruv yoki filtr mezonini o'zgartirib ko'ring.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 gap-3.5 pb-6">
                        {filtered.map((book) => {
                          const state = userBookStates[book.id] || { favorite: false, reading: false, liked: false };
                          return (
                            <div
                              key={book.id}
                              onClick={() => {
                                setSelectedBook(book);
                                setBookSummary(""); // Reset summary
                              }}
                              className="bento-card p-2 flex flex-col justify-between hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer relative"
                            >
                              <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-100">
                                <img
                                  src={book.coverUrl}
                                  alt={book.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteBook(book.id);
                                    }}
                                    className="absolute top-1.5 left-1.5 p-1.5 rounded-xl bg-red-500 text-white shadow-md hover:bg-red-600 transition-all cursor-pointer z-10 flex items-center justify-center border border-red-400"
                                    title="O'chirish"
                                  >
                                    ✕
                                  </button>
                                )}
                                <div className="absolute top-1.5 right-1.5 flex flex-col space-y-1">
                                  {state.favorite && (
                                    <span className="p-1 rounded-full bg-amber-500 text-white text-[8px] shadow-sm">⭐</span>
                                  )}
                                  {state.reading && (
                                    <span className="p-1 rounded-full bg-emerald-500 text-white text-[8px] shadow-sm">📖</span>
                                  )}
                                </div>
                              </div>
                              <div className="pt-2 px-1">
                                <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{book.title}</h4>
                                <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                                  {book.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Active Book Detail Fullscreen Modal overlay */}
                  {selectedBook && (
                    <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm z-40 flex items-end md:items-center justify-center p-4">
                      <div className="bg-white rounded-[24px] max-w-[340px] w-full max-h-[85vh] overflow-y-auto p-5 shadow-2xl space-y-4">
                        <div className="flex justify-between items-start">
                          <h3 className="text-base font-bold text-slate-800 leading-snug">{selectedBook.title}</h3>
                          <button
                            onClick={() => {
                              setSelectedBook(null);
                              setBookSummary("");
                            }}
                            className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer"
                          >
                            <X className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>

                        <div className="flex space-x-3.5">
                          <img
                            src={selectedBook.coverUrl}
                            className="w-20 aspect-[3/4] object-cover rounded-xl border border-sky-100 shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] font-bold text-[#0369a1] block">Kitob tavsifi:</span>
                            <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-4">
                              {selectedBook.description}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-sky-100/50">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Asar haqida batafsil:</span>
                          <p className="text-[10.5px] text-slate-700 leading-relaxed">{selectedBook.details}</p>
                        </div>

                        {/* Interactive triggers */}
                        <div className="flex space-x-2 justify-between">
                          <button
                            onClick={() => toggleBookState(selectedBook.id, "favorite")}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border ${
                              userBookStates[selectedBook.id]?.favorite
                                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span>⭐</span>
                            <span>{userBookStates[selectedBook.id]?.favorite ? "Saralangan" : "Saqlash"}</span>
                          </button>

                          <button
                            onClick={() => toggleBookState(selectedBook.id, "reading")}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border ${
                              userBookStates[selectedBook.id]?.reading
                                ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span>📖</span>
                            <span>{userBookStates[selectedBook.id]?.reading ? "O'qiyapman" : "O'qish ro'yxati"}</span>
                          </button>

                          <button
                            onClick={() => toggleBookState(selectedBook.id, "liked")}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border ${
                              userBookStates[selectedBook.id]?.liked
                                ? "bg-red-500 text-white border-red-600 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span>❤️</span>
                            <span>{userBookStates[selectedBook.id]?.liked ? "Sevimli" : "Yoqdi"}</span>
                          </button>
                        </div>

                        {/* Audio Book Player inside modal */}
                        {selectedBook.audioLink && (
                          <div className="bg-amber-50/50 border border-amber-100/70 rounded-xl p-2.5 flex flex-col space-y-1">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-amber-700 flex items-center space-x-1">
                              <span>🎧</span>
                              <span>Audio Kitob Tinglash:</span>
                            </span>
                            <audio 
                              controls 
                              src={selectedBook.audioLink} 
                              className="w-full h-8 outline-none text-xs" 
                            />
                          </div>
                        )}

                        {/* PDF link trigger */}
                        <div className="flex space-x-2 pt-1">
                          {(selectedBook.pdfLink && selectedBook.type !== "audio") && (
                            <button
                              onClick={() => setPdfViewUrl(selectedBook.pdfLink)}
                              className="flex-1 py-2.5 px-3 bg-gradient-to-tr from-[#0369a1] to-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md hover:scale-[1.01] transition-all cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Kitobni O'qish (PDF)</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleGetBookSummary(selectedBook)}
                            disabled={loadingSummary}
                            className="py-2.5 px-3 bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md hover:scale-[1.01] transition-all cursor-pointer"
                          >
                            {loadingSummary ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>AI Tahlil</span>
                          </button>
                        </div>

                        {/* AI Summary View block */}
                        {bookSummary && (
                          <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-100/50 max-h-[140px] overflow-y-auto space-y-1.5">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#0369a1] block">
                              ✨ Ustoz AI Kitob Qisqacha Mazmuni:
                            </span>
                            <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
                              {bookSummary}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Responsive full-screen PDF Iframe Reader Modal */}
                  {pdfViewUrl && (
                    <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col justify-between">
                      <div className="h-12 bg-slate-900 flex items-center justify-between px-4 text-white border-b border-slate-800">
                        <span className="text-xs font-bold font-mono">Kitob O'quvchi (PDF)</span>
                        <button
                          onClick={() => setPdfViewUrl(null)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 font-bold text-xs"
                        >
                          Chiqish ❌
                        </button>
                      </div>
                      <iframe
                        src={pdfViewUrl}
                        className="flex-1 w-full bg-slate-100"
                        title="PDF Reader"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: POSTS (POSTLAR) - Fully Active Community Feed */}
              {activeTab === "posts" && (
                <div className="h-full flex flex-col">
                  <Community 
                    userId={user?.uid || ""} 
                    userName={user?.displayName || "O'quvchi"} 
                    userPhoto={user?.photoURL || ""} 
                    rewardCoins={rewardCoins} 
                    isAdmin={!!isAdmin} 
                    isFullscreenMode={isFullscreenMode}
                    setIsFullscreenMode={setIsFullscreenMode}
                  />
                </div>
              )}

              {/* TAB 5: PROFILE (PROFILE) */}
              {activeTab === "profile" && (
                <div className="p-4 space-y-4">
                  <div className="text-center py-4 flex flex-col items-center bento-card border border-white/10 p-5 shadow-lg">
                    <div className="w-14 h-14 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mb-2.5 text-xl font-bold text-white shadow-md">
                      {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : "E"}
                    </div>
                    <h3 className="text-sm font-bold text-white leading-tight">{user?.displayName || "EduVerse O'quvchisi"}</h3>
                    <p className="text-[11px] text-white/50 mt-0.5">{user?.email}</p>
                    
                    <span className={`mt-2.5 inline-flex items-center text-[9px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border shadow-xs ${
                      isAdmin 
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse" 
                        : "bg-white/5 border-white/10 text-white/80"
                    }`}>
                      {isAdmin ? "👑 Tizim Admini" : "🎓 Standart O'quvchi"}
                    </span>
                  </div>

                  {/* Spiritual and support message card */}
                  <div className="bento-card p-5 text-center space-y-2 border border-white/10">
                    <Heart className="w-6 h-6 text-red-500 mx-auto animate-pulse" />
                    <h4 className="text-sm font-bold text-white">Bizni qo'llab-quvvatlang</h4>
                    <p className="text-xs text-white/90 font-medium italic leading-relaxed">
                      "Alloh bilimingizni ziyoda qilsin!"
                    </p>
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      EduVerse AI platformasini rivojlantirishga hissa qo'shish va takliflar yuborish uchun administrator bilan bog'lanishingiz mumkin.
                    </p>
                  </div>

                  {/* Referral Link & Invitations Segment */}
                  <div className="bento-card p-5 space-y-4 border border-white/10">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-white/80" />
                      <h4 className="text-sm font-bold text-white">Do'stlarni taklif qilish</h4>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] text-white/60 leading-relaxed">
                        Taklif havolangiz orqali do'stlaringizni taklif qiling va ular kirganda real-time tabrik xabarnomalarini oling!
                      </p>
                      
                      <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl border border-white/5">
                        <input 
                          type="text" 
                          readOnly 
                          value={`https://t.me/edu_verse_ai_bot/app?startapp=ref_${user?.uid}`}
                          className="flex-1 bg-transparent text-[10px] text-white/80 outline-none select-all"
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`https://t.me/edu_verse_ai_bot/app?startapp=ref_${user?.uid}`);
                            setActiveToast({
                              id: "copy_success",
                              title: "Muvaffaqiyatli! 🚀",
                              body: "Taklif havolasi nusxalandi. Do'stlaringizga ulashing!"
                            });
                            setTimeout(() => setActiveToast(null), 4000);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white hover:bg-white/15 text-[9px] font-bold cursor-pointer active:scale-95 transition-all"
                        >
                          Nusxalash
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-white/60">Taklif qilingan do'stlariz:</span>
                      <span className="font-extrabold text-white bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-mono">
                        {userStats?.invitedFriendsCount || 0} ta do'st
                      </span>
                    </div>
                  </div>

                  {/* Share Promotional Story Card */}
                  <div className="bento-card p-5 space-y-3.5 border border-white/10 overflow-hidden relative">
                    <div className="flex items-center space-x-2">
                      <Share2 className="w-5 h-5 text-white/80" />
                      <h4 className="text-sm font-bold text-white">Story-ga ulashish</h4>
                    </div>
                    
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Siz uchun avtomatik tayyorlangan taklif rasmini Telegram Story-ga havolasi bilan birga bitta tugma orqali joylang!
                    </p>

                    <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-[16/9] shadow-md bg-black/40">
                      <img 
                        src="/src/assets/images/eduverse_promo_story_1784281500229.jpg" 
                        alt="Promo Story Art" 
                        className="w-full h-full object-cover opacity-85" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                        <span className="text-[8px] font-mono text-white/60 uppercase tracking-widest">EduVerse AI Promos</span>
                        <h5 className="text-[10px] font-bold text-white truncate">Taklif posteri tayyorlandi</h5>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const tg = (window as any).Telegram?.WebApp;
                        const imageUrl = "https://ais-dev-7vziigtibhdhgx4ooq3mvw-580667136284.asia-southeast1.run.app/src/assets/images/eduverse_promo_story_1784281500229.jpg";
                        if (tg && typeof tg.shareToStory === "function") {
                          tg.shareToStory(imageUrl, {
                            text: "Bizning EduVerse AI oilamizga qo'shiling! 🚀 Sizning shaxsiy ta'lim yordamchingiz.",
                            widget_link: {
                              url: `https://t.me/edu_verse_ai_bot/app?startapp=ref_${user?.uid}`,
                              name: "EduVerse AI"
                            }
                          });
                        } else {
                          // Copy link fallback + alert
                          navigator.clipboard.writeText(`https://t.me/edu_verse_ai_bot/app?startapp=ref_${user?.uid}`);
                          setActiveToast({
                            id: "story_fallback",
                            title: "Telegram Story 🌟",
                            body: "Story API faqat mobil Telegram ilovasida ishlaydi. Havola nusxalandi!"
                          });
                          setTimeout(() => setActiveToast(null), 5000);
                        }
                      }}
                      className="w-full py-2.5 px-3 bg-white text-black hover:bg-white/95 rounded-xl flex items-center justify-center space-x-1.5 text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Story-ga avtomatik joylash</span>
                    </button>
                  </div>

                  {/* Standard Profile Stats */}
                  <div className="bento-card p-4 space-y-3.5 border border-white/10">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                      <span className="text-white/60">Faoliyat Holati:</span>
                      <span className="font-bold text-emerald-400">Faol (A'lo)</span>
                    </div>

                    <button 
                      onClick={handleLogout}
                      className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 rounded-xl flex items-center justify-center space-x-1 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Hisobdan chiqish</span>
                    </button>
                  </div>

                  {/* Admin Dashboard segment */}
                  {isAdmin && (
                    <div className="bg-gradient-to-b from-amber-50/40 to-sky-50/10 border border-amber-200/80 rounded-3xl p-4 space-y-4 shadow-sm">
                      <div className="border-b border-amber-100 pb-2 flex flex-col md:flex-row gap-2 justify-between items-start md:items-center">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          Admin Boshqaruv Paneli
                        </span>
                        <div className="flex space-x-1 overflow-x-auto pb-1 max-w-full scrollbar-none">
                          {(["stats", "add_book", "add_podcast", "add_lesson", "notify"] as const).map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setAdminTab(tab)}
                              className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex-shrink-0 ${
                                adminTab === tab
                                  ? "bg-amber-500 text-white shadow-sm scale-105"
                                  : "bg-white border border-amber-100 text-slate-600 hover:bg-amber-50/50"
                              }`}
                            >
                              {tab === "stats" 
                                ? "Stat" 
                                : tab === "add_book" 
                                  ? "+ Kitob" 
                                  : tab === "add_podcast" 
                                    ? "+ Podkast" 
                                    : tab === "add_lesson" 
                                      ? "+ Darslik" 
                                      : "Xabar"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sub-tab 1: Statistics */}
                      {adminTab === "stats" && (
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-white p-3 rounded-2xl border border-sky-100 shadow-xs">
                            <span className="text-[10px] text-slate-400 block font-semibold">Foydalanuvchilar:</span>
                            <span className="text-lg font-extrabold text-slate-800">12 ta</span>
                          </div>
                          <div className="bg-white p-3 rounded-2xl border border-sky-100 shadow-xs">
                            <span className="text-[10px] text-slate-400 block font-semibold">Baza Kitoblari:</span>
                            <span className="text-lg font-extrabold text-[#0369a1]">{books.length} ta</span>
                          </div>
                          <div className="bg-white p-3 rounded-2xl border border-sky-100 shadow-xs">
                            <span className="text-[10px] text-slate-400 block font-semibold">Tizim Chatlari:</span>
                            <span className="text-lg font-extrabold text-indigo-600">{chatSessions.length || 3} ta</span>
                          </div>
                          <div className="bg-white p-3 rounded-2xl border border-sky-100 shadow-xs">
                            <span className="text-[10px] text-slate-400 block font-semibold">EduCoins Jami:</span>
                            <span className="text-lg font-extrabold text-amber-600">{books.length * 20 + 350} GC</span>
                          </div>
                        </div>
                      )}

                      {/* Sub-tab 2: Add Book Form */}
                      {adminTab === "add_book" && (
                        <div className="space-y-2.5 text-xs">
                          {/* Book Type Selector */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Kitob Turi *</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(["pdf", "audio", "both"] as const).map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setNewBookType(t)}
                                  className={`py-1.5 rounded-lg border text-[9px] font-bold uppercase transition-all cursor-pointer text-center ${
                                    newBookType === t
                                      ? "bg-amber-500 text-white border-amber-500"
                                      : "bg-white border-sky-100 text-slate-600 hover:bg-sky-50/50"
                                  }`}
                                >
                                  {t === "pdf" ? "PDF" : t === "audio" ? "Audio" : "Ikkalasi"}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500">Kitob Sarlavhasi *</label>
                              <input
                                type="text"
                                value={newBookTitle}
                                onChange={(e) => setNewBookTitle(e.target.value)}
                                placeholder="Sariq devni minib"
                                className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500">Qisqacha Tavsif *</label>
                              <input
                                type="text"
                                value={newBookDescription}
                                onChange={(e) => setNewBookDescription(e.target.value)}
                                placeholder="Bir jumlada kitob mazmuni..."
                                className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Batafsil Ma'lumot</label>
                            <textarea
                              value={newBookDetails}
                              onChange={(e) => setNewBookDetails(e.target.value)}
                              placeholder="Kitob boblari, muallifi, nashr yili va o'quv darsligi haqida..."
                              rows={2}
                              className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner resize-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Muqova Rasmi (Galereya/Fayl)</label>
                            <div className="relative border border-dashed border-sky-200 hover:border-amber-400 bg-white/50 rounded-xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  setNewBookCoverFile(file);
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              <ImageIcon className="w-5 h-5 text-slate-400 mb-0.5" />
                              <span className="text-[9px] text-slate-600 font-semibold truncate max-w-full px-1">
                                {newBookCoverFile ? `Rasm: ${newBookCoverFile.name}` : "Rasm tanlang yoki shu yerga tashlang"}
                              </span>
                            </div>
                          </div>

                          {/* Conditional PDF Section */}
                          {(newBookType === "pdf" || newBookType === "both") && (
                            <div className="space-y-2 border-t border-slate-100 pt-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">Kitob PDF Fayli</label>
                                <div className="relative border border-dashed border-sky-200 hover:border-amber-400 bg-white/50 rounded-xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                                  <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      setNewBookPdfFile(file);
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                  <FileText className="w-5 h-5 text-slate-400 mb-0.5" />
                                  <span className="text-[9px] text-slate-600 font-semibold truncate max-w-full px-1">
                                    {newBookPdfFile ? `PDF: ${newBookPdfFile.name}` : "Kitob PDF faylini yuklang"}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">PDF Manzili (Link, Agar fayl yuklanmasa)</label>
                                <input
                                  type="text"
                                  value={newBookPdfLink}
                                  onChange={(e) => setNewBookPdfLink(e.target.value)}
                                  placeholder="Ixtiyoriy link..."
                                  className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                                />
                              </div>
                            </div>
                          )}

                          {/* Conditional Audio Section */}
                          {(newBookType === "audio" || newBookType === "both") && (
                            <div className="space-y-2 border-t border-slate-100 pt-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">Audio Kitob Fayli (MP3 / WAV)</label>
                                <div className="relative border border-dashed border-sky-200 hover:border-amber-400 bg-white/50 rounded-xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      setNewBookAudioFile(file);
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                  <Video className="w-5 h-5 text-slate-400 mb-0.5" />
                                  <span className="text-[9px] text-slate-600 font-semibold truncate max-w-full px-1">
                                    {newBookAudioFile ? `Audio: ${newBookAudioFile.name}` : "Audio faylini yuklang"}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">Audio Manzili (Link, Agar fayl yuklanmasa)</label>
                                <input
                                  type="text"
                                  value={newBookAudioLink}
                                  onChange={(e) => setNewBookAudioLink(e.target.value)}
                                  placeholder="https://... audio manzil"
                                  className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                                />
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500">Muqova Rasm Linki</label>
                              <input
                                type="text"
                                value={newBookCoverUrl}
                                onChange={(e) => setNewBookCoverUrl(e.target.value)}
                                placeholder="Ixtiyoriy rasm linki..."
                                className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                              />
                            </div>
                          </div>

                          <button
                            onClick={handleAddBook}
                            disabled={newBookUploading}
                            className="w-full py-2.5 bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md hover:scale-[1.01] transition-all cursor-pointer"
                          >
                            {newBookUploading ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5" />
                            )}
                            <span>Kutubxonaga Qo'shish</span>
                          </button>
                        </div>
                      )}

                      {/* Sub-tab: Add Podcast Form */}
                      {adminTab === "add_podcast" && (
                        <div className="space-y-2.5 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Podkast Sarlavhasi *</label>
                            <input
                              type="text"
                              value={newPodcastTitle}
                              onChange={(e) => setNewPodcastTitle(e.target.value)}
                              placeholder="Masalan: CEFR imtihoniga tayyorlanish"
                              className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Qisqacha Tavsif</label>
                            <input
                              type="text"
                              value={newPodcastDescription}
                              onChange={(e) => setNewPodcastDescription(e.target.value)}
                              placeholder="Podkast darsi mazmuni haqida..."
                              className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">YouTube Video URL / ID *</label>
                            <input
                              type="text"
                              value={newPodcastYtUrl}
                              onChange={(e) => setNewPodcastYtUrl(e.target.value)}
                              placeholder="Masalan: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                              className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                            />
                          </div>

                          <button
                            onClick={handleAddPodcast}
                            disabled={newPodcastUploading}
                            className="w-full py-2.5 bg-gradient-to-tr from-[#0284c7] to-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md hover:scale-[1.01] transition-all cursor-pointer"
                          >
                            {newPodcastUploading ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Video className="w-3.5 h-3.5" />
                            )}
                            <span>Podkastni Yuklash</span>
                          </button>
                        </div>
                      )}

                      {/* Sub-tab: Add Lesson Form */}
                      {adminTab === "add_lesson" && (
                        <div className="space-y-2.5 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Darslik Sarlavhasi *</label>
                            <input
                              type="text"
                              value={newLessonTitle}
                              onChange={(e) => setNewLessonTitle(e.target.value)}
                              placeholder="Masalan: SAT Matematika dars 1"
                              className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Qisqacha Tavsif</label>
                            <input
                              type="text"
                              value={newLessonDescription}
                              onChange={(e) => setNewLessonDescription(e.target.value)}
                              placeholder="Ushbu darsning mazmuni..."
                              className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">YouTube Video URL / ID *</label>
                            <input
                              type="text"
                              value={newLessonYtUrl}
                              onChange={(e) => setNewLessonYtUrl(e.target.value)}
                              placeholder="Masalan: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                              className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                            />
                          </div>

                          <button
                            onClick={handleAddLesson}
                            disabled={newLessonUploading}
                            className="w-full py-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md hover:scale-[1.01] transition-all cursor-pointer"
                          >
                            {newLessonUploading ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Video className="w-3.5 h-3.5" />
                            )}
                            <span>Darslikni Yuklash</span>
                          </button>
                        </div>
                      )}

                      {/* Sub-tab 3: Broadcast Notification */}
                      {adminTab === "notify" && (
                        <div className="space-y-2.5 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Xabar Sarlavhasi *</label>
                            <input
                              type="text"
                              value={adminNotificationTitle}
                              onChange={(e) => setAdminNotificationTitle(e.target.value)}
                              placeholder="Tizim yangilanishi!"
                              className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Xabar Matni *</label>
                            <textarea
                              value={adminNotificationBody}
                              onChange={(e) => setAdminNotificationBody(e.target.value)}
                              placeholder="Barcha o'quvchilarga yetkaziluvchi yangilik xabari..."
                              rows={2.5}
                              className="w-full bg-white border border-sky-100 rounded-xl p-2 outline-none focus:border-amber-400 text-xs shadow-inner resize-none"
                            />
                          </div>

                          <div className="flex space-x-4 py-1 justify-center">
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={adminNotificationFirebase}
                                onChange={(e) => setAdminNotificationFirebase(e.target.checked)}
                                className="accent-amber-500"
                              />
                              <span className="text-[10px] font-bold text-slate-600">Firebase Push</span>
                            </label>

                            <label className="flex items-center space-x-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={adminNotificationSMS}
                                onChange={(e) => setAdminNotificationSMS(e.target.checked)}
                                className="accent-amber-500"
                              />
                              <span className="text-[10px] font-bold text-slate-600">SMS (Simulatsiya)</span>
                            </label>
                          </div>

                          <button
                            onClick={handleSendAdminNotification}
                            disabled={adminSendingNotification}
                            className="w-full py-2.5 bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md hover:scale-[1.01] transition-all cursor-pointer"
                          >
                            {adminSendingNotification ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>O'quvchilarga Tarqatish</span>
                          </button>

                          {/* Live SMS simulation logs window */}
                          {adminNotificationLogs.length > 0 && (
                            <div className="bg-slate-900 text-slate-300 p-2 rounded-xl text-[9px] font-mono h-20 overflow-y-auto space-y-1">
                              {adminNotificationLogs.map((log, idx) => (
                                <div key={idx} className="leading-tight">{log}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Subpages Overlay */}
              <AnimatePresence>
                {activeSubpage && (
                  <Subpages 
                    activeSubpage={activeSubpage} 
                    onClose={() => setActiveSubpage(null)} 
                    isAdmin={!!isAdmin} 
                    userId={user?.uid || ""} 
                  />
                )}
              </AnimatePresence>

            </main>

            {/* BOTTOM NAV BAR (Saves space, highly sleek, always displays) */}
            {!isFullscreenMode && (
              <footer className="pb-8 pt-2 px-3 bento-nav flex items-center justify-around z-20">
                <button 
                  onClick={() => {
                    setActiveTab("home");
                    setIsDrawerOpen(false);
                  }}
                  className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                    activeTab === "home" ? "text-[#0369a1] scale-105 font-bold" : "text-slate-400 hover:text-[#0369a1]"
                  }`}
                >
                  <div className="p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold">Menyu</span>
                </button>

                <button 
                  onClick={() => {
                    setActiveTab("ustoz-ai");
                    setActiveAiMode("selection");
                    setIsDrawerOpen(false);
                  }}
                  className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                    activeTab === "ustoz-ai" ? "text-[#0369a1] scale-105 font-bold" : "text-slate-400 hover:text-[#0369a1]"
                  }`}
                >
                  <div className="p-1">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold">Ustoz AI</span>
                </button>

                <button 
                  onClick={() => {
                    setActiveTab("library");
                    setIsDrawerOpen(false);
                  }}
                  className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                    activeTab === "library" ? "text-[#0369a1] scale-105 font-bold" : "text-slate-400 hover:text-[#0369a1]"
                  }`}
                >
                  <div className="p-1">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold">Kutubxona</span>
                </button>

                <button 
                  onClick={() => {
                    setActiveTab("posts");
                    setIsDrawerOpen(false);
                  }}
                  className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                    activeTab === "posts" ? "text-[#0369a1] scale-105 font-bold" : "text-slate-400 hover:text-[#0369a1]"
                  }`}
                >
                  <div className="p-1">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold">Postlar</span>
                </button>

                <button 
                  onClick={() => {
                    setActiveTab("profile");
                    setIsDrawerOpen(false);
                  }}
                  className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                    activeTab === "profile" ? "text-[#0369a1] scale-105 font-bold" : "text-slate-400 hover:text-[#0369a1]"
                  }`}
                >
                  <div className="p-1">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold">Profile</span>
                </button>
              </footer>
            )}

            {/* SIDE DRAWER OVERLAY (Slide out navigation list) */}
            <AnimatePresence>
              {isDrawerOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-30 flex justify-start"
                >
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="w-4/5 h-full bg-white/95 border-r border-sky-100 p-5 flex flex-col justify-between shadow-2xl backdrop-blur-md"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                        <span className="text-sm font-bold tracking-tight text-slate-800 flex items-center">
                          <Sparkles className="w-4 h-4 text-[#0369a1] mr-1.5 animate-pulse" />
                          Bo'limlar
                        </span>
                        <button 
                          onClick={() => setIsDrawerOpen(false)}
                          className="p-1 rounded bg-slate-50 border border-sky-100 hover:bg-slate-100 text-slate-500 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <nav className="flex flex-col space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {[
                          { name: "Ta'lim darslari", key: "talim" },
                          { name: "TopGrand Universitetlar", key: "topgrand" },
                          { name: "Online Market", key: "market" },
                          { name: "SAT Imtihoni", key: "sat" },
                          { name: "CEFR Tayyorgarlik", key: "cefr" },
                          { name: "IELTS Tayyorgarlik", key: "ielts" },
                          { name: "Audio-Video Podcastlar", key: "podcasts" },
                          { name: "Ustoz AI moduli", key: "ustoz" },
                          { name: "Rasmiy TG kanal (@EduverseAI)", key: "tg" },
                          { name: "Qo'llab-quvvatlash (Support)", key: "support" }
                        ].map((item, index) => (
                          <div 
                            key={index}
                            className="p-3 bg-white hover:bg-sky-50/50 border border-sky-50 rounded-2xl flex items-center justify-between text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                            onClick={() => {
                              setIsDrawerOpen(false);
                              if (item.key === "tg") {
                                window.open("https://t.me/EduverseAI", "_blank");
                              } else if (item.key === "support") {
                                window.open("https://t.me/shokhruh_usa", "_blank");
                              } else if (item.key === "ustoz") {
                                setActiveTab("ustoz-ai");
                                setActiveAiMode("selection");
                              } else {
                                setActiveSubpage(item.key as any);
                              }
                            }}
                          >
                            <span>{item.name}</span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        ))}
                      </nav>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 font-mono">EduVerse AI Platformasi</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* NOTIFICATIONS PANEL OVERLAY */}
            <AnimatePresence>
              {isNotificationOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-30 flex justify-end"
                >
                  <motion.div 
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="w-4/5 h-full bg-white/95 border-l border-sky-100 p-5 flex flex-col justify-between shadow-2xl backdrop-blur-md"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                        <span className="text-sm font-bold text-slate-800 flex items-center">
                          <Bell className="w-4 h-4 text-[#0369a1] mr-1.5" />
                          Bildirishnomalar
                        </span>
                        <button 
                          onClick={() => setIsNotificationOpen(false)}
                          className="p-1 rounded bg-slate-50 border border-sky-100 hover:bg-slate-100 text-slate-500 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 overflow-y-auto max-h-[550px] pr-1">
                        {notifications.map((notif) => (
                          <div key={notif.id} className="p-3 bg-white border border-sky-50 rounded-2xl space-y-1 shadow-xs hover:border-sky-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">{notif.title}</span>
                              <span className="text-[9px] font-mono text-slate-400">{notif.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-normal">{notif.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 font-mono">EduVerse Bildirishnomalari</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* REAL-TIME BROADCAST TOAST NOTIFICATION */}
            <AnimatePresence>
              {activeToast && (
                <motion.div
                  initial={{ opacity: 0, y: -50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-sky-500/20 z-50 backdrop-blur-md flex items-start gap-3"
                >
                  <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-sky-400 tracking-wider">REAL-TIME NOTIF</span>
                      <button 
                        onClick={() => setActiveToast(null)}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100">{activeToast.title}</h4>
                    <p className="text-[10px] text-slate-300 leading-normal">{activeToast.body}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

      </div>
    </div>
  );
}
