import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with a large limit (50mb) to support image and file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initialisation of Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("⚠️ Warning: GEMINI_API_KEY is not defined. Gemini features will run in mock mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Intelligent fallback responder for Uzbek language educational queries
function getSmartFallbackResponse(message: string, isVoice: boolean = false): string {
  const msg = message.toLowerCase();
  
  if (msg.includes("salom") || msg.includes("assalom") || msg.includes("hello") || msg.includes("hi")) {
    return isVoice 
      ? "Assalomu alaykum! Ustoz AI yordamchingizman. Bugun qaysi fanni o'rganamiz?"
      : "Va alaykum assalom! EduVerse AI 'Ustoz AI' chat yordamchisiga xush kelibsiz. Bugun qaysi fanni o'rganishni istaysiz? Men sizga matematika, fizika, ingliz tili, tarix kabi ko'plab fanlardan mukammal dars bera olaman!";
  }
  
  if (msg.includes("matem") || msg.includes("hisob") || msg.includes("formula") || msg.includes("tenglama") || msg.includes("son")) {
    return isVoice
      ? "Matematika juda ajoyib fan! Masalan, kvadrat tenglamani yechish uchun Diskriminant formulasidan foydalanamiz: D teng b kvadrat minus to'rt a se. Qanday misolni yechamiz?"
      : "Matematika — bu barcha fanlarning otasi! Keling, biror mavzuni ko'rib chiqamiz. Masalan, kvadrat tenglamalar: ax² + bx + c = 0. Ularni yechish uchun Diskriminant formulasidan foydalanamiz:\n\n**D = b² - 4ac**\n\n- Agar D > 0 bo'lsa, tenglama 2 ta haqiqiy ildizga ega.\n- Agar D = 0 bo'lsa, 1 ta ildizga ega.\n- Agar D < 0 bo'lsa, haqiqiy ildizga ega emas.\n\nQanday misol yoki masala ustida ishlamoqchisiz? Menga yuboring, birgalikda yechamiz!";
  }
  
  if (msg.includes("ingliz") || msg.includes("english") || msg.includes("ielts") || msg.includes("cefr") || msg.includes("til") || msg.includes("grammar")) {
    return isVoice
      ? "Ingliz tilini o'rganish juda qiziq! IELTS yoki CEFR imtihonlariga tayyorlanyapsizmi? Speaking yoki Grammar bo'yicha yordam beraymi?"
      : "Ingliz tilini o'rganish va IELTS/CEFR darajangizni oshirish hozirgi zamonda juda muhim!\n\n**IELTS bo'limlari:**\n1. **Listening** (Eshitish)\n2. **Reading** (O'qish)\n3. **Writing** (Yozish)\n4. **Speaking** (Gapirish)\n\nGrammatika bo'yicha masalan, **Present Perfect** zamonini ko'rib chiqamiz: *Subject + have/has + Verb (V3)*. Misol: *I have already finished my homework.* (Men uy vazifamni bajarib bo'ldim).\n\nQaysi mavzuda suhbatlashamiz yoki qanday mashq bajaramiz?";
  }
  
  if (msg.includes("fizika") || msg.includes("nyuton") || msg.includes("kuch") || msg.includes("tezlik") || msg.includes("energiya")) {
    return isVoice
      ? "Fizika olami juda qiziq! Nyutonning ikkinchi qonunini eslaylik: Kuch massaning tezlanishga ko'paytmasiga teng. Qaysi fizik qonunni o'rganamiz?"
      : "Fizika olami tabiat sirlarini ochadi! Keling, eng muhim qonunlardan birini eslaymiz: **Nyutonning ikkinchi qonuni**:\n\n**F = m · a**\n\nBu yerda:\n- **F** — jismga ta'sir qiluvchi kuch (Nyutonda)\n- **m** — jism massasi (kg da)\n- **a** — jism olgan tezlanish (m/s² da)\n\nShuningdek, yorug'lik tezligi yoki mexanika bo'limlari haqida savollaringiz bormi? Yozing!";
  }
  
  if (msg.includes("kimyo") || msg.includes("reaksiya") || msg.includes("suv") || msg.includes("element") || msg.includes("mendeleyev")) {
    return isVoice
      ? "Kimyo moddalar va ularning o'zgarishi haqida! Masalan, suvning formulasi H2O, ya'ni vodorod va kisloroddan iborat. Qanday tajribani ko'ramiz?"
      : "Kimyo — moddalarning tuzilishi va ularning o'zaro ta'sirini o'rganuvchi mo''jizaviy fan!\n\nMendeleyev davriy jadvalidagi eng mashhur modda — suv: **H₂O** (2 ta Vodorod atomi va 1 ta Kislorod atomi).\n\nOrganik yoki noorganik kimyo mavzularidan qaysi biri sizga qiziq? Reaksiyalarni tenglashtirish yoki formulalarni hisoblashda yordam beraman!";
  }
  
  if (msg.includes("tarix") || msg.includes("amir temur") || msg.includes("bobur") || msg.includes("toshkent") || msg.includes("samarqand")) {
    return isVoice
      ? "Tarix o'tmishimiz ko'zgusi! Buyuk bobomiz Amir Temur 1336-yilda Keshda tug'ilgan. U buyuk davlat va adolat asoschisidir. Qaysi davrni o'rganamiz?"
      : "Tarix — kelajakni anglash uchun o'tmish saboqlaridir! Buyuk bobolarimiz haqida gapiradigan bo'lsak, **Amir Temur** (1336-1405) ulkan saltanat barpo etgan va *'Kuch — adolatdadir!'* shioriga amal qilgan.\n\nSohibqiron ilm-fan, madaniyat va me'morchilik rivojiga ulkan hissa qo'shgan. Samarqand va Shahrisabzdagi tarixiy obidalar buning yaqqol isbotidir.\n\nO'zbekiston yoki jahon tarixidan qaysi davrni batafsil o'rganishni istaysiz?";
  }

  // Handle queries about specific universities or general guidance
  if (msg.includes("harvard") || msg.includes("mit") || msg.includes("stanford") || msg.includes("oxford") || msg.includes("cambridge") || msg.includes("universitet") || msg.includes("grant") || msg.includes("topshirish")) {
    return "Universitet bo'yicha to'liq ma'lumot (AI tizimi orqali):\n\n**O'qishga kirish va hujjat topshirish talablari:**\n1. **Til sertifikati**: IELTS (minimum 6.5 - 7.5) yoki TOEFL (90 - 110)\n2. **Akademik ko'rsatkich**: SAT (minimum 1400 - 1580) yoki GPA 3.8+\n3. **Tavsiyanoma va Insho (Motivation Letter)**: O'zingiz haqingizda nufuzli insho va ustozlaringizdan 2-3 ta tavsiyanoma.\n4. **Moliyaviy yordam va Grantlar**: Ko'plab universitetlar, jumladan Harvard va MIT 'Need-Blind' grantlarini taklif etadi. Ya'ni oilaviy daromadingiz kam bo'lsa, o'qish va yashash xarajatlaringiz 100% qoplab beriladi.\n\nAriza topshirish odatda **Common App** yoki universitetning maxsus portali orqali amalga oshiriladi. Savollaringiz bormi? Yozing!";
  }
  
  // Custom smart dynamic reply generator
  const encouragement = [
    "Juda yaxshi va muhim savol bo'ldi!",
    "Bu mavzu haqiqatan ham va dars doirasida juda qiziqarli.",
    "Ajoyib izlanish! Ustoz AI sifatida sizga bu borada tushuntirish berishdan mamnunman."
  ];
  
  const closing = [
    "Bu borada yana qanday savollaringiz bor?",
    "Mavzuni yanada chuqurroq tahlil qilishimiz uchun biror misol keltiring.",
    "Keling, shu fanning keyingi bosqichlarini ham birgalikda o'rganamiz!"
  ];
  
  const randomEncouragement = encouragement[Math.floor(Math.random() * encouragement.length)];
  const randomClosing = closing[Math.floor(Math.random() * closing.length)];
  
  if (isVoice) {
    return `${randomEncouragement} Ushbu dars bo'yicha savolingiz juda o'rinli. Keling, buni amaliy misollar bilan o'rganamiz!`;
  }
  
  return `${randomEncouragement}\n\nUshbu mavzu bo'yicha siz so'ragan narsa juda muhim poydevor hisoblanadi. Bizning EduVerse AI platformamizda barcha fanlar darsliklari tizimli o'rgatiladi. Kelgusi qadamlarda dars tahlili va interaktiv topshiriqlarni ham bajarishimiz mumkin.\n\n**Siz uchun maslahat:** Doimiy ravishda kitoblar mutolaa qiling va Ustoz AI bilan muloqotda bo'ling.\n\n${randomClosing}`;
}

// Gemini Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, file } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      // Use intelligent educational fallback
      const fallbackText = getSmartFallbackResponse(message, false) + 
        "\n\n*(Eslatma: Haqiqiy Ustoz AI bilan jonli suhbatlashish uchun, o'ng tomondagi 'Settings > Secrets' bo'limida GEMINI_API_KEY o'rnatilganligini tekshiring.)*";
      return res.json({ text: fallbackText });
    }

    try {
      const ai = getGeminiClient();
      const contents: any[] = [];

    // Add conversational history if present
    if (history && Array.isArray(history)) {
      history.forEach((h: { role: string; content: string }) => {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        });
      });
    }

    // Prepare active input
    const parts: any[] = [];
    
    // Add file inline data if uploaded
    if (file && file.data && file.mimeType) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data.split(",")[1] || file.data, // Strip data URL prefix if exists
        },
      });
    }

    parts.push({ text: message });
    contents.push({ role: "user", parts });

    const systemInstruction = 
      "Siz EduVerse AI platformasining 'Ustoz AI' chat yordamchisiz. Vazifangiz o'quvchilarga xohlagan fanlari (matematika, fizika, kimyo, tarix, ingliz tili, CEFR, SAT, IELTS va h.k.) bo'yicha juda tushunarli, aniq va qiziqarli dars o'tish, savollariga javob berishdir. Har doim o'zbek tilida, juda samimiy va rag'batlantiruvchi ohangda javob bering. O'quvchiga yo'l ko'rsating va zarur hollarda misollar keltiring. Agar o'quvchi rasm yoki fayl yuborgan bo'lsa, uni ham tahlil qilib darsga qo'shib tushuntiring.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      },
    });

    res.json({ text: response.text });
  } catch (apiError: any) {
    console.warn("⚠️ Gemini API calling failed, falling back to smart responder:", apiError);
    const fallbackText = getSmartFallbackResponse(message, false) + 
      `\n\n*(Eslatma: Haqiqiy Gemini AI so'rovi amalga oshmadi: "${apiError.message || apiError}". Iltimos, 'Settings > Secrets' bo'limida to'g'ri GEMINI_API_KEY o'rnatilganini tekshiring.)*`;
    res.json({ text: fallbackText });
  }
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: error.message || "Xatolik yuz berdi" });
  }
});

// Gemini Voice/Explanation Endpoint
app.post("/api/voice", async (req, res) => {
  try {
    const { transcript } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      const fallbackText = getSmartFallbackResponse(transcript, true);
      return res.json({ text: fallbackText });
    }

    try {
      const ai = getGeminiClient();
      const systemInstruction = 
        "Siz EduVerse AI platformasining 'Ustoz AI' ovozli yordamchisiz. Siz o'quvchi bilan real vaqtda jonli ovoz orqali muloqot qilyapsiz. Shuning uchun javoblaringiz juda qisqa (maksimal 2 ta lo'nda va tushunarli gap), nutq ohangida aytishga juda oson va samimiy bo'lishi shart! Fanlarni, tillarni yoki savollarni bolalarga tushuntirgandek sodda tushuntiring. Hech qachon murakkab formulalar va uzun ro'yxatlar bermang.";

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: transcript,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (apiError: any) {
      console.warn("⚠️ Gemini API Voice calling failed, falling back to smart responder:", apiError);
      const fallbackText = getSmartFallbackResponse(transcript, true);
      res.json({ text: fallbackText });
    }
  } catch (error: any) {
    console.error("Gemini Voice Error:", error);
    res.status(500).json({ error: error.message || "Ovozli aloqada xatolik yuz berdi" });
  }
});

// Gemini Book Summarization Endpoint
app.post("/api/summarize", async (req, res) => {
  try {
    const { title, description, details } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.json({
        text: `**${title}** kitobi uchun qisqacha mazmun (Demo rejim):\n\nUshbu kitob "${description || "ilm-fan"}" mavzusiga bag'ishlangan bo'lib, o'quvchiga chuqur bilim ulashadi. AI kaliti ulanmaganligi sababli to'liq tahlil hozircha mavjud emas.`,
      });
    }

    const ai = getGeminiClient();
    const systemInstruction = 
      "Siz kitob tahlilchisiz. Berilgan kitob nomi, tavsifi va tafsilotlari asosida kitobning juda qiziqarli, lo'nda va tushunarli qisqacha mazmunini (summary) o'zbek tilida tayyorlab bering. Eng muhim 3 ta g'oyani va xulosani chiroyli Markdown formatida (bezakli bullet pointlar bilan) taqdim eting.";

    const prompt = `Kitob nomi: ${title}\nTavsif: ${description}\nTafsilotlar: ${details || "Mavjud emas"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Summarize Error:", error);
    res.status(500).json({ error: error.message || "Kitobni tahlil qilishda xatolik yuz berdi" });
  }
});

// Start server and handle Vite middleware
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
