import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  ChevronRight,
  Play, 
  Trash2, 
  Plus, 
  Eye, 
  BookOpen, 
  HelpCircle, 
  Globe, 
  DollarSign, 
  Award, 
  Sparkles, 
  Send,
  Radio,
  Clock,
  Briefcase,
  Layers
} from "lucide-react";
import { 
  db, 
  auth 
} from "../firebase";
import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  arrayUnion, 
  increment,
  getDocs
} from "firebase/firestore";
import { Lesson, Podcast } from "../types";

// Helper to convert standard/short YouTube links to embed links
export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  let videoId = "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    videoId = match[2];
  } else {
    return url;
  }
  return `https://www.youtube.com/embed/${videoId}`;
}

interface SubpagesProps {
  activeSubpage: "talim" | "topgrand" | "market" | "sat" | "cefr" | "ielts" | "podcasts";
  onClose: () => void;
  isAdmin: boolean;
  isHelper?: boolean;
  userId: string;
}

export default function Subpages({ activeSubpage, onClose, isAdmin, isHelper = false, userId }: SubpagesProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden bento-bg text-white"
    >
      {/* Top Header: ONLY Back button on top left */}
      <div className="pt-3.5 pb-3 px-4 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-xl z-10">
        <button 
          onClick={onClose}
          className="flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 shadow-sm font-medium text-xs cursor-pointer active:scale-95 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Ortga</span>
        </button>
        <span className="text-xs font-bold text-white/70 tracking-wider uppercase font-mono">
          {activeSubpage === "talim" && "Ta'lim Bo'limi"}
          {activeSubpage === "topgrand" && "Top Grand Universitetlar"}
          {activeSubpage === "market" && "Online Market"}
          {activeSubpage === "sat" && "SAT Imtihoni"}
          {activeSubpage === "cefr" && "CEFR Tayyorgarlik"}
          {activeSubpage === "ielts" && "IELTS Tayyorgarlik"}
          {activeSubpage === "podcasts" && "Audio-Video Podcastlar"}
        </span>
        <div className="w-12" /> {/* Balancing width spacer */}
      </div>

      <div className="flex-1 overflow-y-auto w-full bg-transparent">
        {activeSubpage === "talim" && <TalimSection isAdmin={isAdmin} isHelper={isHelper} userId={userId} />}
        {activeSubpage === "topgrand" && <TopGrandSection userId={userId} />}
        {activeSubpage === "podcasts" && <PodcastsSection isAdmin={isAdmin} isHelper={isHelper} userId={userId} />}
        {["market", "sat", "cefr", "ielts"].includes(activeSubpage) && (
          <ComingSoonSection section={activeSubpage} />
        )}
      </div>
    </motion.div>
  );
}

// ------------------ TALIM SECTION ------------------
function TalimSection({ isAdmin, isHelper = false, userId }: { isAdmin: boolean; isHelper?: boolean; userId: string }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "lessons"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Lesson[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          title: d.title || "",
          description: d.description || "",
          youtubeUrl: d.youtubeUrl || "",
          views: d.views || [],
          viewsCount: d.viewsCount || 0,
          createdAt: d.createdAt || ""
        });
      });
      setLessons(list);
    }, (error) => {
      console.error("Lessons snapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !ytUrl.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "lessons"), {
        title,
        description: desc,
        youtubeUrl: ytUrl,
        views: [],
        viewsCount: 0,
        createdAt: new Date().toISOString()
      });
      setTitle("");
      setDesc("");
      setYtUrl("");
      setShowAddForm(false);
    } catch (e) {
      console.error("Error adding lesson:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Rostdan ham ushbu darsni o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "lessons", id));
      if (activeLesson?.id === id) setActiveLesson(null);
    } catch (e) {
      console.error("Error deleting lesson:", e);
    }
  };

  const handleSelectLesson = async (lesson: Lesson) => {
    setActiveLesson(lesson);
    // Register views exactly once per user
    const hasViewed = lesson.views.includes(userId);
    if (!hasViewed && userId) {
      try {
        const lessonRef = doc(db, "lessons", lesson.id);
        await updateDoc(lessonRef, {
          views: arrayUnion(userId),
          viewsCount: increment(1)
        });
      } catch (err) {
        console.error("Error registering lesson view:", err);
      }
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Intro Banner */}
      <div className="relative overflow-hidden rounded-3xl p-5 border border-white/10 bg-white/5 text-white shadow-xl">
        <h3 className="text-sm font-extrabold flex items-center gap-1.5">
          <BookOpen className="w-5 h-5 text-white" />
          Professional Video Darsliklar
        </h3>
        <p className="text-xs text-white/60 mt-1 leading-relaxed">
          Oliy sifatli va foydali darsliklar ro'yxati. Bilimingizni istalgan joyda bepul oshiring!
        </p>
      </div>

      {/* Admin Panel button */}
      {(isAdmin || isHelper) && (
        <div className="flex justify-end">
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/95 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? "Yopish" : "Dars Qo'shish"}</span>
          </button>
        </div>
      )}

      {/* Add lesson form modal */}
      {showAddForm && (
        <form onSubmit={handleAddLesson} className="p-4 rounded-2xl border border-white/10 bg-white/5 text-xs space-y-3 shadow-inner">
          <div className="space-y-1">
            <label className="font-bold text-white/70">Dars nomi *</label>
            <input 
              type="text" 
              required
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="Masalan: Present Perfect Continuous tushunish" 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 outline-none focus:border-white/20 text-white text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-white/70">Dars haqida izoh (Tavsif)</label>
            <textarea 
              value={desc} 
              onChange={e => setDesc(e.target.value)}
              placeholder="Ushbu dars nimalarni o'rgatadi..." 
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 outline-none focus:border-white/20 text-white text-xs resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-white/70">YouTube Video Havolasi (Link) *</label>
            <input 
              type="url" 
              required
              value={ytUrl} 
              onChange={e => setYtUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 outline-none focus:border-white/20 text-white text-xs"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 bg-white hover:bg-white/95 text-black font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1 transition-all cursor-pointer"
          >
            {loading ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Darsni Joylash</span>
          </button>
        </form>
      )}

      {/* Active Video Player frame */}
      {activeLesson && (
        <div className="p-3 bg-white/5 rounded-[28px] text-white shadow-2xl space-y-3 overflow-hidden border border-white/10 animate-scale-up">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
            <iframe 
              src={getYouTubeEmbedUrl(activeLesson.youtubeUrl)} 
              title={activeLesson.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="space-y-1 px-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">{activeLesson.title}</h4>
              <button 
                onClick={() => setActiveLesson(null)} 
                className="text-[10px] bg-white/10 px-2.5 py-1 rounded-full text-white/80 hover:text-white hover:bg-white/25 transition-all cursor-pointer"
              >
                Yopish
              </button>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">{activeLesson.description}</p>
          </div>
        </div>
      )}

      {/* Lessons List Grid */}
      <div className="space-y-3.5">
        <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Mavjud darslar ({lessons.length})</h4>
        {lessons.length === 0 ? (
          <div className="p-8 text-center bg-white/5 border border-white/10 rounded-3xl">
            <p className="text-xs text-white/40 italic font-medium">Hozircha darslar mavjud emas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div 
                key={lesson.id}
                onClick={() => handleSelectLesson(lesson)}
                className={`p-3 bg-white/5 border rounded-2xl flex items-center justify-between hover:bg-white/10 hover:border-white/20 active:scale-[0.99] transition-all cursor-pointer shadow-xs ${
                  activeLesson?.id === lesson.id ? "border-white/40 bg-white/10" : "border-white/10"
                }`}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-3 bg-white/10 rounded-xl text-white">
                    <Play className="w-5 h-5 fill-white/20" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-white truncate leading-snug">{lesson.title}</h5>
                    <p className="text-[10px] text-white/60 line-clamp-1 mt-0.5 leading-relaxed">{lesson.description}</p>
                    <div className="flex items-center space-x-2 mt-1.5 text-[9px] text-white/40 font-semibold font-mono">
                      <span className="flex items-center space-x-0.5">
                        <Eye className="w-3 h-3 text-white/60" />
                        <span>{lesson.viewsCount} marta</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                {isAdmin && (
                  <button 
                    onClick={(e) => handleDeleteLesson(lesson.id, e)}
                    className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-red-500/20 hover:text-red-400 active:scale-95 transition-all cursor-pointer ml-2 border border-white/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------ TOP GRAND SECTION ------------------
interface University {
  name: string;
  country: string;
  ranking: string;
  tuition: string;
  acceptance: string;
  link: string;
  description: string;
  image: string;
}

function TopGrandSection({ userId }: { userId: string }) {
  const [selectedCountry, setSelectedCountry] = useState<string>("usa");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedUni, setSelectedUni] = useState<University | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"info" | "admission" | "apply" | "ai">("info");
  
  // Custom Chatbot state inside university popup or general
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Salom! Top Grand Universitetlari bo'yicha maslahatchi AI xizmatiga xush kelibsiz. Qaysi universitetning qabul shartlari, kontrakt to'lovi yoki stipendiyalari haqida ma'lumot olishni istaysiz?" }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const countriesList = [
    { id: "usa", name: "AQSh", flag: "🇺🇸", desc: "Amerika nufuzli oliygohlari" },
    { id: "uk", name: "Buyuk Qirollik", flag: "🇬🇧", desc: "Buyuk Britaniya qadimiy ta'limi" },
    { id: "germany", name: "Germaniya", flag: "🇩🇪", desc: "Evropa bepul davlat universitetlari" },
    { id: "korea", name: "Janubiy Koreya", flag: "🇰🇷", desc: "Osiyo yetakchi texnologiyalari" },
    { id: "japan", name: "Yaponiya", flag: "🇯🇵", desc: "Kunchiqar fan va innovatsiyalari" },
    { id: "uzb", name: "O'zbekiston", flag: "🇺🇿", desc: "O'zbekiston milliy va xalqaro oliygohlari" }
  ];

  // Deterministic university generator that outputs exactly 55 unique universities for each country
  const getUniversities = (countryId: string): University[] => {
    const baseData: Record<string, {
      countryName: string;
      image: string;
      tuitionRange: string;
      acceptanceRange: string;
      names: string[];
    }> = {
      usa: {
        countryName: "AQSh",
        image: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=400&auto=format&fit=crop",
        tuitionRange: "$45,000 - $65,000 / yil",
        acceptanceRange: "4% - 15%",
        names: [
          "Massachusetts Institute of Technology (MIT)", "Harvard University", "Stanford University", "Yale University", "Princeton University",
          "California Institute of Technology (Caltech)", "Columbia University", "University of Chicago", "University of Pennsylvania", "Cornell University",
          "Johns Hopkins University", "Northwestern University", "UC Berkeley", "UCLA", "New York University (NYU)",
          "University of Michigan", "Carnegie Mellon University", "Duke University", "Boston University", "University of Southern California (USC)",
          "University of Texas at Austin", "University of Washington", "UC San Diego", "University of Illinois", "Georgia Institute of Technology",
          "University of North Carolina", "University of Wisconsin-Madison", "Purdue University", "University of Minnesota", "Ohio State University",
          "Boston College", "Tufts University", "Vanderbilt University", "Emory University", "Rice University",
          "Georgetown University", "University of Notre Dame", "Washington University in St. Louis", "University of Rochester", "Case Western Reserve",
          "Northeastern University", "University of Florida", "UC Irvine", "UC Davis", "UC Santa Barbara",
          "Rutgers University", "University of Maryland", "University of Pittsburgh", "Penn State University", "Arizona State University",
          "Michigan State University", "Virginia Tech", "Texas A&M University", "University of Utah", "University of Colorado Boulder"
        ]
      },
      uk: {
        countryName: "Birlashgan Qirollik (UK)",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&auto=format&fit=crop",
        tuitionRange: "£18,000 - £35,000 / yil",
        acceptanceRange: "10% - 25%",
        names: [
          "University of Cambridge", "University of Oxford", "Imperial College London", "University College London (UCL)", "University of Edinburgh",
          "King's College London", "University of Manchester", "University of Bristol", "University of Glasgow", "University of Southampton",
          "University of Birmingham", "University of Leeds", "University of Sheffield", "University of Nottingham", "Queen Mary University of London",
          "University of Warwick", "Cardiff University", "Newcastle University", "Durham University", "University of York",
          "University of Bath", "University of Exeter", "University of Sussex", "University of Leicester", "University of Aberdeen",
          "University of Liverpool", "University of East Anglia", "University of Surrey", "University of Dundee", "University of St Andrews",
          "Loughborough University", "Lancaster University", "Heriot-Watt University", "Brunel University London", "University of Essex",
          "University of Strathclyde", "University of Reading", "Swansea University", "Bangor University", "University of Stirling",
          "Aberystwyth University", "University of Plymouth", "Coventry University", "Manchester Metropolitan University", "Nottingham Trent University",
          "University of Portsmouth", "University of Greenwich", "University of Westminster", "Kingston University", "Middlesex University",
          "Northumbria University", "Sheffield Hallam University", "University of Salford", "University of Bradford", "University of Huddersfield"
        ]
      },
      germany: {
        countryName: "Germaniya",
        image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&auto=format&fit=crop",
        tuitionRange: "€0 (Bepul davlat ta'limi) / yil",
        acceptanceRange: "15% - 35%",
        names: [
          "Technical University of Munich (TUM)", "LMU Munich", "Heidelberg University", "Humboldt University of Berlin", "Free University of Berlin",
          "Karlsruhe Institute of Technology (KIT)", "RWTH Aachen University", "Technical University of Berlin", "University of Tübingen", "University of Freiburg",
          "University of Göttingen", "University of Hamburg", "University of Bonn", "University of Cologne", "Goethe University Frankfurt",
          "University of Münster", "University of Stuttgart", "TU Dresden", "Leipzig University", "FAU Erlangen-Nuremberg",
          "University of Würzburg", "University of Konstanz", "University of Duisburg-Essen", "University of Bremen", "Hannover Medical School",
          "TU Darmstadt", "University of Kiel", "University of Jena", "University of Regensburg", "University of Potsdam",
          "Ulm University", "University of Giessen", "University of Bayreuth", "University of Kaiserslautern", "University of Hohenheim",
          "University of Rostock", "University of Greifswald", "Siegen University", "Paderborn University", "University of Passau",
          "TU Ilmenau", "Bauhaus-University Weimar", "University of Bamberg", "Frankfurt School of Finance", "Jacobs University Bremen",
          "TU Clausthal", "University of Oldenburg", "University of Osnabrück", "University of Mannheim", "TU Chemnitz",
          "University of Koblenz-Landau", "University of Kassel", "University of Hildesheim", "University of Lübeck", "TU Dortmund"
        ]
      },
      korea: {
        countryName: "Janubiy Koreya",
        image: "https://images.unsplash.com/photo-1607237138185-eedd996e5b09?w=400&auto=format&fit=crop",
        tuitionRange: "$4,000 - $8,000 / yil",
        acceptanceRange: "5% - 20%",
        names: [
          "Seoul National University (SNU)", "KAIST", "Yonsei University", "Korea University", "POSTECH",
          "Sungkyunkwan University (SKKU)", "Hanyang University", "UNIST", "GIST", "Kyung Hee University",
          "Sejong University", "Ewha Womans University", "Sogang University", "Chung-Ang University", "Pusan National University",
          "Kyungpook National University", "Ajou University", "Inha University", "Jeonbuk National University", "Chonnam National University",
          "Dongguk University", "Konkuk University", "Dankook University", "Yeungnam University", "Chungnam National University",
          "Inje University", "University of Ulsan", "Kookmin University", "Soongsil University", "Seoul Tech",
          "Chosun University", "Gyeongsang National University", "Jeju National University", "Kangwon National University", "Chungbuk National University",
          "University of Seoul", "Hallym University", "Keimyung University", "Donga University", "Kyonggi University",
          "Sunchon National University", "Changwon National University", "Kumoh National Institute", "Mokpo National University", "Andong National University",
          "Kunsan National University", "Kongju National University", "Hanbat National University", "Korea National University of Education", "Kwangwoon University",
          "Myongji University", "Sangmyung University", "Hansung University", "Seokyeong University", "Sookmyung Women's University"
        ]
      },
      japan: {
        countryName: "Yaponiya",
        image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&auto=format&fit=crop",
        tuitionRange: "$5,000 - $10,000 / yil",
        acceptanceRange: "8% - 22%",
        names: [
          "University of Tokyo", "Kyoto University", "Tokyo Institute of Technology", "Osaka University", "Tohoku University",
          "Nagoya University", "Kyushu University", "Hokkaido University", "Waseda University", "Keio University",
          "University of Tsukuba", "Kobe University", "Hiroshima University", "Chiba University", "Okayama University",
          "Yokohama National University", "Kanazawa University", "Kumamoto University", "Shinshu University", "Osaka Metropolitan University",
          "Nagasaki University", "Niigata University", "Gifu University", "Kagoshima University", "Shizuoka University",
          "Tokyo Medical and Dental University", "Ritsumeikan University", "Sophia University", "Meiji University", "Doshisha University",
          "Tokyo Metropolitan University", "Tokyo University of Science", "Kyushu Institute of Technology", "Toyota Technological Institute", "Yamagata University",
          "Ehime University", "University of Yamanashi", "Saitama University", "Tokushima University", "University of Toyama",
          "Miyazaki University", "Saga University", "University of the Ryukyus", "Akita University", "Tottori University",
          "Shimane University", "Kochi University", "Fukui University", "Muroran Institute of Technology", "Kitami Institute of Technology",
          "Aichi University", "Kansai University", "Kwansei Gakuin University", "Hosei University", "Chuo University"
        ]
      },
      uzb: {
        countryName: "O'zbekiston",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&auto=format&fit=crop",
        tuitionRange: "5,000,000 - 30,000,000 UZS / yil",
        acceptanceRange: "10% - 35%",
        names: [
          "Westminster International University in Tashkent (WIUT)", "Management Development Institute of Singapore in Tashkent (MDIST)", "Turin Polytechnic University in Tashkent", "Tashkent State University of Economics (TSUE)", "University of World Economy and Diplomacy (UWED)",
          "New Uzbekistan University", "AKFA University", "Webster University in Tashkent", "INHA University in Tashkent", "Amity University in Tashkent",
          "National University of Uzbekistan (NUUz)", "Samarkand State University (SamDU)", "Tashkent State Technical University (TDTU)", "Tashkent University of Information Technologies (TUIT)", "Tashkent Medical Academy (TMA)",
          "Tashkent State University of Uzbek Language and Literature", "Tashkent State Law University (TSUL)", "Samarkand State Foreign Languages Institute", "Urgench State University", "Bukhara State University",
          "Andijan State University", "Fergana State University", "Namangan State University", "Karshi State University", "Gulistan State University",
          "Jizzakh State Pedagogical University", "Navoi State Mining Institute", "Termez State University", "Nukus State Pedagogical Institute", "Karakalpak State University",
          "Kokand State Pedagogical Institute", "Chirchik State Pedagogical Institute", "Tashkent Chemical-Technological Institute", "Tashkent Institute of Irrigation and Agricultural Engineers", "Tashkent Financial Institute",
          "Tashkent Pharmaceutical Institute", "Tashkent State Dental Institute", "Tashkent State Pedagogical University (TDPU)", "Uzbekistan State University of Physical Education and Sport", "Uzbekistan State World Languages University (UzSWLU)",
          "Uzbekistan State Institute of Arts and Culture", "National Institute of Fine Arts and Design", "Tashkent State Transport University", "Samarkand State Medical University", "Samarkand Veterinary Medicine Institute",
          "Fergana Polytechnic Institute", "Andijan Machine-Building Institute", "Bukhara Engineering-Technological Institute", "Karshi Engineering-Economics Institute", "Nukus Branch of TUIT",
          "Urgench Branch of TUIT", "Samarkand Branch of TUIT", "Fergana Branch of TUIT", "Karshi Branch of TUIT", "Nukus Branch of TMA"
        ]
      }
    };

    const current = baseData[countryId];
    if (!current) return [];

    return current.names.map((name, index) => ({
      name: name,
      country: current.countryName,
      ranking: `Dunyo reytingi #${index + 1} (QS)`,
      tuition: current.tuitionRange,
      acceptance: current.acceptanceRange,
      link: "https://www.google.com/search?q=" + encodeURIComponent(name),
      description: `Ushbu nufuzli oliygoh ${current.countryName} mamlakatining eng yetakchi va yuqori reytingli ilm-fan maskanlaridan biridir. Akademik poydevor va chuqur bilim ulashadi.`,
      image: current.image
    }));
  };

  const activeUnisList = getUniversities(selectedCountry);
  
  const filteredUnis = activeUnisList.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendUniMessage = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    setMessages(prev => [...prev, { sender: "user", text: textToSend }]);
    if (!customText) setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Universitet bo'yicha savol: "${textToSend}". Iltimos, ushbu mavzu yuzasidan barcha qabul shartlari va qadamlarini o'zbek tilida aniq va batafsil tushuntirib bering.`,
          history: messages.map(m => ({
            role: m.sender === "user" ? "user" : "model",
            content: m.text
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { sender: "ai", text: data.text }]);
        
        // Auto speech if active
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data.text.replace(/[*#`_-]/g, ""));
          utterance.lang = "uz-UZ";
          window.speechSynthesis.speak(utterance);
        }
      } else {
        setMessages(prev => [...prev, { sender: "ai", text: "Kechirasiz, ma'lumot olishda xatolik yuz berdi." }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: "ai", text: "AI ulanishida xatolik yuz berdi." }]);
    } finally {
      setSending(false);
    }
  };

  const speakUniText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (isAiSpeaking) {
      setIsAiSpeaking(false);
      return;
    }
    setIsAiSpeaking(true);
    const cleanText = text.replace(/[*#`_-]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "uz-UZ";
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="p-4 space-y-4 bg-transparent min-h-full">
      {/* Country selection row */}
      <div className="space-y-1.5">
        <label className="text-xs font-extrabold text-white block">Davlatingizni tanlang:</label>
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {countriesList.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCountry(c.id);
                setSearchQuery("");
              }}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs ${
                selectedCountry === c.id 
                  ? "bg-white text-black" 
                  : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
              }`}
            >
              <Globe className="w-3.5 h-3.5 opacity-80" />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={`Eng sara ${activeUnisList.length} ta oliygoh ichidan qidirish...`}
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs outline-none focus:border-white/25 pl-9 font-medium text-white placeholder-white/40"
        />
        <svg className="w-4 h-4 text-white/40 absolute left-3 top-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Floating AI Consultant trigger */}
      <div className="flex justify-end">
        <button 
          onClick={() => {
            setChatOpen(!chatOpen);
            setMessages([
              { sender: "ai", text: `Salom! Siz ${selectedCountry === "uzb" ? "O'zbekiston" : selectedCountry.toUpperCase()} universitetlari ro'yxatini tahlil qilyapsiz. Qabul shartlari va talablari haqida savolingizni berishingiz mumkin!` }
            ]);
          }}
          className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold hover:bg-white/15 transition-all cursor-pointer shadow-md"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{chatOpen ? "Ro'yxatga Qaytish" : "AI Shaxsiy Maslahatchi"}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {chatOpen ? (
          /* University AI Consultation Chatbot View */
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col h-[60vh] bg-slate-50 border border-sky-100 rounded-3xl overflow-hidden shadow-lg"
          >
            {/* Chat top header */}
            <div className="bg-indigo-600 text-white p-3 flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Grand AI Konsultanti ({selectedCountry.toUpperCase()})
              </span>
              <span className="text-[9px] bg-indigo-500 px-2 py-0.5 rounded-full font-bold">Faol</span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-white">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3 rounded-2xl max-w-[85%] text-[11px] leading-relaxed shadow-xs ${
                    m.sender === "user" 
                      ? "bg-indigo-600 text-white rounded-br-none" 
                      : "bg-slate-50 text-slate-800 rounded-bl-none border border-sky-100/40"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 p-3 rounded-2xl rounded-bl-none border border-sky-100/40 text-[11px] text-slate-400 font-medium">
                    AI tahlil qilmoqda...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-2 border-t border-sky-100 bg-slate-50 flex space-x-1.5 items-center">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSendUniMessage(); }}
                placeholder="Grantlar, IELTS shartlari va hujjatlar haqida..."
                className="flex-1 bg-white border border-sky-100 rounded-xl py-2 px-3.5 text-xs outline-none focus:border-indigo-400"
              />
              <button 
                onClick={() => handleSendUniMessage()}
                className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* Universities Cards List */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
              <span>Jami: {filteredUnis.length} ta oliygoh topildi</span>
              <span>50+ daxshatli tanlov!</span>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {filteredUnis.slice(0, 55).map((uni, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setSelectedUni(uni);
                    setActiveDetailTab("info");
                  }}
                  className="bg-white border border-sky-100/80 rounded-2xl overflow-hidden shadow-xs hover:border-indigo-400 cursor-pointer transition-all flex flex-col p-3 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 max-w-[80%]">
                      <h4 className="text-xs font-extrabold text-slate-800 line-clamp-1">{uni.name}</h4>
                      <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 font-bold">
                        <span>📍 {uni.country}</span>
                        <span>•</span>
                        <span className="text-indigo-600">{uni.ranking}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 mt-1" />
                  </div>
                  
                  <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {uni.description}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-50 text-[9px] font-bold text-slate-600">
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-100/50">💵 Kontrakt: {uni.tuition}</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-100/50">🎯 Qabul: {uni.acceptance}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* University Detailed Information Modal Layer */}
      <AnimatePresence>
        {selectedUni && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="bg-white w-full max-w-[420px] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Top Header with back and close button */}
              <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black truncate max-w-[280px]">{selectedUni.name}</h4>
                  <p className="text-[9px] font-bold text-indigo-200">Tizimlashtirilgan AI Yo'llanmasi</p>
                </div>
                <button 
                  onClick={() => setSelectedUni(null)}
                  className="p-1 rounded-full bg-black/10 hover:bg-black/20 text-white transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Selection Tabs */}
              <div className="flex border-b border-sky-100 bg-slate-50 text-[10px] font-bold text-slate-500">
                {[
                  { id: "info", label: "Ma'lumot", icon: "🏛️" },
                  { id: "admission", label: "Kirish Yo'llari", icon: "🔑" },
                  { id: "apply", label: "Topshirish", icon: "📝" },
                  { id: "ai", label: "Ustoz AI", icon: "🤖" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id as any)}
                    className={`flex-1 py-3 text-center border-b-2 transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                      activeDetailTab === tab.id 
                        ? "border-indigo-600 text-indigo-600 bg-white font-extrabold" 
                        : "border-transparent hover:text-slate-700"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content Display Area */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed min-h-[250px]">
                
                {activeDetailTab === "info" && (
                  <div className="space-y-3">
                    <div className="aspect-video w-full rounded-2xl overflow-hidden border border-sky-100 bg-slate-50 shadow-inner">
                      <img src={selectedUni.image} className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="space-y-1.5 pt-1">
                      <h5 className="font-extrabold text-slate-800 text-[13px]">Universitet haqida umumiy real ma'lumot:</h5>
                      <p className="text-slate-600 font-medium">{selectedUni.description}</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-sky-100/50 space-y-2 text-[11px] font-semibold text-slate-600">
                      <div className="flex justify-between">
                        <span>📌 Mamlakat & Joylashuv:</span>
                        <span className="text-indigo-600 font-extrabold">{selectedUni.country}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🏆 QS Dunyo Reytingi:</span>
                        <span className="text-indigo-600 font-extrabold">{selectedUni.ranking}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>💵 O'rtacha yillik kontrakt:</span>
                        <span className="text-amber-600 font-extrabold">{selectedUni.tuition}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🎯 Talabalar qabul darajasi:</span>
                        <span className="text-emerald-600 font-extrabold">{selectedUni.acceptance}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === "admission" && (
                  <div className="space-y-3 pt-1">
                    <h5 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600">🔑</span>
                      Kirish Yo'llari va Talablar (Sertifikatlar):
                    </h5>
                    
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-2xl border border-sky-100 bg-white shadow-xs space-y-1">
                        <span className="text-[10px] font-extrabold text-indigo-600 block">1. Ingliz tili (IELTS / TOEFL):</span>
                        <p className="text-[11px] text-slate-600 font-medium">
                          Nufuzli yo'nalishlar uchun **IELTS minimum 6.5 dan 7.5** ballgacha talab qilinadi. Muqobil ravishda **TOEFL iBT 90 - 100** ball ham qabul qilinadi.
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl border border-sky-100 bg-white shadow-xs space-y-1">
                        <span className="text-[10px] font-extrabold text-indigo-600 block">2. Akademik ko'rsatkich (GPA):</span>
                        <p className="text-[11px] text-slate-600 font-medium">
                          Maktab attestati yoki Kollej/Litsey diplomi bo'yicha baholaringiz o'rtachasi **minimum 4.5/5** (yoki **GPA 3.5+ / 4.0**) bo'lishi lozim.
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl border border-sky-100 bg-white shadow-xs space-y-1">
                        <span className="text-[10px] font-extrabold text-indigo-600 block">3. SAT yoki Ichki imtihonlar (SAT / ACT):</span>
                        <p className="text-[11px] text-slate-600 font-medium">
                          Xalqaro universitetlar uchun **SAT imtihoni (minimum 1350 - 1520)** yoki universitetning o'zining matematika hamda mantiqiy fikrlash bo'yicha ichki testidan o'tish lozim.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === "apply" && (
                  <div className="space-y-3 pt-1">
                    <h5 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600">📝</span>
                      Hujjat Topshirish Bosqichlari (How to Apply):
                    </h5>

                    <ol className="space-y-2.5 pl-1">
                      <li className="flex gap-2 items-start">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                        <div className="text-[11px] font-medium text-slate-600">
                          <strong className="text-slate-800 font-extrabold block">Platformani tanlash</strong>
                          Hujjatlar xalqaro **Common App**, **Coalition App** tizimlari yoki universitet rasmiy sayti orqali onlayn topshiriladi.
                        </div>
                      </li>
                      <li className="flex gap-2 items-start">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                        <div className="text-[11px] font-medium text-slate-600">
                          <strong className="text-slate-800 font-extrabold block">Motivation Letter (Insho yozish)</strong>
                          Nima uchun aynan shu yo'nalish va universitetni tanlaganingiz haqida 500-650 so'zdan iborat kuchli motivatsion insho tayyorlang.
                        </div>
                      </li>
                      <li className="flex gap-2 items-start">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                        <div className="text-[11px] font-medium text-slate-600">
                          <strong className="text-slate-800 font-extrabold block">Tavsiyanomalar olish</strong>
                          O'zingiz tahsil olgan maktabning 2 ta o'qituvchisi (masalan, matematika va ingliz tili) hamda maktab direktoridan tavsiyanoma (Recommendation Letter) yuklang.
                        </div>
                      </li>
                      <li className="flex gap-2 items-start">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                        <div className="text-[11px] font-medium text-slate-600">
                          <strong className="text-slate-800 font-extrabold block">Deadlinelarni tekshirish</strong>
                          Kuzgi qabul uchun hujjat topshirish muddatlari odatda **Early Decision** (1-noyabr) yoki **Regular Decision** (1-janvar/mart) hisoblanadi.
                        </div>
                      </li>
                    </ol>
                  </div>
                )}

                {activeDetailTab === "ai" && (
                  <div className="flex flex-col h-[280px] bg-slate-50 rounded-2xl overflow-hidden border border-sky-100">
                    <div className="bg-indigo-600 text-white p-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Shaxsiy {selectedUni.name} AI Konsultanti
                      </span>
                      <button 
                        onClick={() => speakUniText(`Assalomu alaykum! Men ${selectedUni.name} bo'yicha maxsus o'qitilgan maslahatgichiman. Qabul talablari va bepul grantlar olish haqida istalgan narsani so'rashingiz mumkin.`)}
                        className={`p-1 rounded-full bg-white/20 hover:bg-white/35 transition-all text-white ${isAiSpeaking ? "animate-pulse" : ""}`}
                        title="Ovozli eshitish"
                      >
                        <Radio className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 p-2 overflow-y-auto space-y-2 text-[10px] bg-white">
                      <div className="p-2 rounded-xl bg-slate-50 text-slate-700 leading-normal border border-sky-100/50">
                        <strong>Ustoz AI:</strong> Salom! Men {selectedUni.name} bo'yicha shaxsiy koordinatoringizman. Pastdagi tayyor savollardan birini bosing yoki o'zingiz yozing!
                      </div>

                      <div className="flex flex-wrap gap-1.5 py-1.5">
                        <button 
                          onClick={() => handleSendUniMessage(`Menga ${selectedUni.name} bepul grant olish sirlari va qadamlarini o'rgat.`)}
                          className="bg-indigo-50 border border-indigo-100 text-indigo-700 py-1 px-2 rounded-lg font-bold hover:bg-indigo-100"
                        >
                          🎓 Qanday grant olsam bo'ladi?
                        </button>
                        <button 
                          onClick={() => handleSendUniMessage(`Menga ${selectedUni.name} talab qilinadigan IELTS va SAT ballari haqida ayt.`)}
                          className="bg-indigo-50 border border-indigo-100 text-indigo-700 py-1 px-2 rounded-lg font-bold hover:bg-indigo-100"
                        >
                          📚 IELTS/SAT qancha so'raydi?
                        </button>
                      </div>

                      {messages.slice(1).map((m, idx) => (
                        <div key={idx} className={`p-2 rounded-xl text-slate-700 leading-normal border border-sky-100/30 ${m.sender === "user" ? "bg-indigo-50 border-indigo-100" : "bg-slate-50"}`}>
                          <strong>{m.sender === "user" ? "Siz" : "Ustoz AI"}:</strong> {m.text}
                        </div>
                      ))}
                    </div>

                    <div className="p-1 border-t border-sky-100 bg-slate-50 flex space-x-1 items-center">
                      <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Yozish..."
                        className="flex-1 bg-white border border-sky-100 rounded-xl py-1 px-2.5 text-[10px] outline-none"
                      />
                      <button 
                        onClick={() => handleSendUniMessage()}
                        className="p-1.5 rounded-xl bg-indigo-600 text-white"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Bottom action footer */}
              <div className="p-4 border-t border-sky-50 bg-slate-50/50 flex space-x-2">
                <a 
                  href={selectedUni.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-white border border-indigo-200 text-indigo-600 text-center font-bold text-[10px] rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Gugl orqali to'liq ko'rish
                </a>
                
                <button
                  onClick={() => {
                    setActiveDetailTab("ai");
                  }}
                  className="flex-1 py-3 bg-indigo-600 text-white text-center font-bold text-[10px] rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-1 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Tizimli qabulni boshlash
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------ PODCASTS SECTION ------------------
function PodcastsSection({ isAdmin, isHelper = false, userId }: { isAdmin: boolean; isHelper?: boolean; userId: string }) {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [activePodcast, setActivePodcast] = useState<Podcast | null>(null);

  // Form states
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "podcasts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Podcast[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          title: d.title || "",
          description: d.description || "",
          youtubeUrl: d.youtubeUrl || "",
          views: d.views || [],
          viewsCount: d.viewsCount || 0,
          createdAt: d.createdAt || ""
        });
      });
      setPodcasts(list);
    }, (error) => {
      console.error("Podcasts snapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleAddPodcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !ytUrl.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "podcasts"), {
        title,
        description: desc,
        youtubeUrl: ytUrl,
        views: [],
        viewsCount: 0,
        createdAt: new Date().toISOString()
      });
      setTitle("");
      setDesc("");
      setYtUrl("");
      setShowAdd(false);
    } catch (e) {
      console.error("Error adding podcast:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePodcast = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Rostdan ham ushbu podcastni o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "podcasts", id));
      if (activePodcast?.id === id) setActivePodcast(null);
    } catch (e) {
      console.error("Error deleting podcast:", e);
    }
  };

  const handleSelectPodcast = async (podcast: Podcast) => {
    setActivePodcast(podcast);
    const hasViewed = podcast.views.includes(userId);
    if (!hasViewed && userId) {
      try {
        const podcastRef = doc(db, "podcasts", podcast.id);
        await updateDoc(podcastRef, {
          views: arrayUnion(userId),
          viewsCount: increment(1)
        });
      } catch (err) {
        console.error("Error registering podcast view:", err);
      }
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Intro Banner */}
      <div className="relative overflow-hidden rounded-3xl p-5 border border-white/10 bg-white/5 text-white shadow-xl">
        <h3 className="text-sm font-extrabold flex items-center gap-1.5">
          <Radio className="w-5 h-5 text-white animate-pulse" />
          Foydali Podcastlar
        </h3>
        <p className="text-xs text-white/60 mt-1 leading-relaxed">
          Ingliz tili, SAT, CEFR va nufuzli universitetlar bo'yicha ekspertlardan eksklyuziv audio-video suhbatlar.
        </p>
      </div>

      {/* Admin Panel button */}
      {(isAdmin || isHelper) && (
        <div className="flex justify-end">
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/95 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{showAdd ? "Yopish" : "Podcast Qo'shish"}</span>
          </button>
        </div>
      )}

      {/* Add podcast form modal */}
      {showAdd && (
        <form onSubmit={handleAddPodcast} className="p-4 rounded-2xl border border-white/10 bg-white/5 text-xs space-y-3 shadow-inner">
          <div className="space-y-1">
            <label className="font-bold text-white/70">Podcast nomi *</label>
            <input 
              type="text" 
              required
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="Masalan: IELTS 9 olish sirlari!" 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 outline-none focus:border-white/20 text-white text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-white/70">Podcast tavsifi</label>
            <textarea 
              value={desc} 
              onChange={e => setDesc(e.target.value)}
              placeholder="Ushbu suhbat nimalar haqida..." 
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 outline-none focus:border-white/20 text-white text-xs resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-white/70">YouTube Video Havolasi (Link) *</label>
            <input 
              type="url" 
              required
              value={ytUrl} 
              onChange={e => setYtUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 outline-none focus:border-white/20 text-white text-xs"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 bg-white hover:bg-white/95 text-black font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1 transition-all cursor-pointer"
          >
            {loading ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Podcastni Joylash</span>
          </button>
        </form>
      )}

      {/* Active Podcast Player frame */}
      {activePodcast && (
        <div className="p-3 bg-white/5 rounded-[28px] text-white shadow-2xl space-y-3 overflow-hidden border border-white/10 animate-scale-up">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
            <iframe 
              src={getYouTubeEmbedUrl(activePodcast.youtubeUrl)} 
              title={activePodcast.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="space-y-1 px-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">{activePodcast.title}</h4>
              <button 
                onClick={() => setActivePodcast(null)} 
                className="text-[10px] bg-white/10 px-2.5 py-1 rounded-full text-white/80 hover:text-white hover:bg-white/25 transition-all cursor-pointer"
              >
                Yopish
              </button>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">{activePodcast.description}</p>
          </div>
        </div>
      )}

      {/* Podcasts List */}
      <div className="space-y-3.5">
        <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Barcha podcastlar ({podcasts.length})</h4>
        {podcasts.length === 0 ? (
          <div className="p-8 text-center bg-white/5 border border-white/10 rounded-3xl">
            <p className="text-xs text-white/40 italic font-medium">Yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {podcasts.map((pod) => (
              <div 
                key={pod.id}
                onClick={() => handleSelectPodcast(pod)}
                className={`p-3 bg-white/5 border rounded-2xl flex items-center justify-between hover:bg-white/10 hover:border-white/20 active:scale-[0.99] transition-all cursor-pointer shadow-xs ${
                  activePodcast?.id === pod.id ? "border-white/40 bg-white/10" : "border-white/10"
                }`}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-3 bg-white/10 rounded-xl text-white">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-white truncate leading-snug">{pod.title}</h5>
                    <p className="text-[10px] text-white/60 line-clamp-1 mt-0.5 leading-relaxed">{pod.description}</p>
                    <div className="flex items-center space-x-2 mt-1.5 text-[9px] text-white/40 font-semibold font-mono">
                      <span className="flex items-center space-x-0.5">
                        <Eye className="w-3 h-3 text-white/60" />
                        <span>{pod.viewsCount} marta ko'rildi</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                {isAdmin && (
                  <button 
                    onClick={(e) => handleDeletePodcast(pod.id, e)}
                    className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-red-500/20 hover:text-red-400 active:scale-95 transition-all cursor-pointer ml-2 border border-white/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------ COMING SOON PORTAL ------------------
function ComingSoonSection({ section }: { section: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-transparent">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-[310px] bento-card p-6 shadow-2xl flex flex-col items-center space-y-5 border border-white/10"
      >
        {/* Animated Glow ball */}
        <div className="relative w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/15 shadow-xl animate-pulse">
          {section === "market" && <Briefcase className="w-6 h-6 text-white" />}
          {section === "sat" && <Layers className="w-6 h-6 text-white" />}
          {section === "cefr" && <Award className="w-6 h-6 text-white" />}
          {section === "ielts" && <Sparkles className="w-6 h-6 text-white" />}
          
          <div className="absolute -inset-1.5 rounded-full border border-white/20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            {section === "market" && "Online Market"}
            {section === "sat" && "SAT Prep"}
            {section === "cefr" && "CEFR Prep"}
            {section === "ielts" && "IELTS Prep"}
          </span>
          <h4 className="text-sm font-bold text-white tracking-tight">Tizimlashtirilmoqda</h4>
          <p className="text-xs text-white/60 font-normal leading-relaxed">
            Hozircha bu bo'limimiz tizimlashtirilmoqda, iltimos kuting, tez orada yangilaymiz.
          </p>
        </div>

        <div className="w-full pt-2 border-t border-white/5 flex justify-center space-x-1 text-[9px] font-bold text-white/40 font-mono">
          <Clock className="w-3 h-3 text-white/40" />
          <span>Tez kunda ochiq havola!</span>
        </div>
      </motion.div>
    </div>
  );
}
