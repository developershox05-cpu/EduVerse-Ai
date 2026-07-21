import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  ThumbsUp, 
  Eye, 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  X, 
  Image as ImageIcon, 
  Users, 
  Radio, 
  Mic, 
  MicOff, 
  Camera, 
  MoreVertical,
  Paperclip,
  Clock,
  Heart,
  ChevronDown,
  UserCheck,
  ChevronLeft,
  FileText
} from "lucide-react";
import { 
  db, 
  storage 
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
  arrayRemove, 
  increment,
  getDocs,
  where,
  getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Post, PostComment, ChatGroup, GroupMessage, VoiceGroup, LiveBroadcast, LiveComment } from "../types";

interface CommunityProps {
  userId: string;
  userName: string;
  userPhoto: string;
  rewardCoins: (amount: number) => Promise<void>;
  isAdmin: boolean;
  isFullscreenMode?: boolean;
  setIsFullscreenMode?: (val: boolean) => void;
}

export default function Community({ 
  userId, 
  userName, 
  userPhoto, 
  rewardCoins, 
  isAdmin,
  isFullscreenMode = false,
  setIsFullscreenMode
}: CommunityProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "groups">("posts");

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 ${isFullscreenMode ? "bg-[#090d16]" : ""}`}>
      {/* Community Tab Navigation Pills */}
      {!isFullscreenMode && (
        <div className="px-4 pt-3 pb-2 flex space-x-1.5 overflow-x-auto border-b border-white/10 bg-black/40 backdrop-blur-md scrollbar-none">
          {[
            { id: "posts", label: "Postlar", icon: <MessageSquare className="w-3.5 h-3.5" /> },
            { id: "groups", label: "Mahalliy Guruhlar", icon: <Users className="w-3.5 h-3.5" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-black shadow-sm"
                  : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto w-full">
        {activeTab === "posts" && (
          <PostsFeed userId={userId} userName={userName} userPhoto={userPhoto} rewardCoins={rewardCoins} />
        )}
        {activeTab === "groups" && (
          <LocalGroupsTab isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}

// ------------------ HELPER FILE UPLOADER ------------------
async function uploadFileHelper(file: File, folder: string): Promise<string> {
  try {
    const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(fileRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (err) {
    console.warn("Storage upload failed, fallback to base64:", err);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// ------------------ POSTS FEED COMPONENT ------------------
function PostsFeed({ userId, userName, userPhoto, rewardCoins }: { userId: string; userName: string; userPhoto: string; rewardCoins: (amount: number) => Promise<void> }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [sortOrder, setSortOrder] = useState<"new" | "likes" | "views">("new");
  
  // Public Profile Modal State
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfileData, setSelectedProfileData] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Expanded post texts state
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});

  // Detailed Modal (Comments, Replies)
  const [detailedPost, setDetailedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");

  const handleViewUserProfile = async (uid: string) => {
    setSelectedProfileId(uid);
    setLoadingProfile(true);
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        setSelectedProfileData(userDoc.data());
      } else {
        setSelectedProfileData({
          uid,
          displayName: "EduVerse O'quvchisi",
          eduCoins: 0,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Load Posts in Real-time
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Post[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          userId: d.userId || "",
          authorName: d.authorName || "O'quvchi",
          authorPhoto: d.authorPhoto || "",
          text: d.text || "",
          imageUrl: d.imageUrl || "",
          likes: d.likes || [],
          likesCount: d.likesCount || 0,
          views: d.views || [],
          viewsCount: d.viewsCount || 0,
          commentsCount: d.commentsCount || 0,
          createdAt: d.createdAt || ""
        });
      });
      setPosts(list);
    });
    return () => unsubscribe();
  }, []);

  // Liking dynamic notification sender helper
  const triggerSocialNotification = async (recipientId: string, title: string, body: string) => {
    if (recipientId === userId) return;
    try {
      await addDoc(collection(db, "users", recipientId, "notifications"), {
        title,
        body,
        time: "Hozir",
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imageFile && !imagePreview) return;

    setLoading(true);
    try {
      let finalUrl = "";
      if (imageFile) {
        finalUrl = await uploadFileHelper(imageFile, "posts");
      }

      if (editingPostId) {
        // Edit Post
        const refPost = doc(db, "posts", editingPostId);
        const updateData: any = { text };
        if (finalUrl) updateData.imageUrl = finalUrl;
        await updateDoc(refPost, updateData);
        setEditingPostId(null);
      } else {
        // Create Post
        await addDoc(collection(db, "posts"), {
          userId,
          authorName: userName,
          authorPhoto: userPhoto || "",
          text,
          imageUrl: finalUrl,
          likes: [],
          likesCount: 0,
          views: [userId],
          viewsCount: 1,
          commentsCount: 0,
          createdAt: new Date().toISOString()
        });
        await rewardCoins(5); // 5 coins for making an educational post
      }

      setText("");
      setImageFile(null);
      setImagePreview("");
      setIsCreateOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditInit = (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPostId(post.id);
    setText(post.text);
    setImagePreview(post.imageUrl || "");
    setIsCreateOpen(true);
  };

  const handleDeletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Rostdan ham ushbu postni o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLikePost = async (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    const hasLiked = post.likes.includes(userId);
    const postRef = doc(db, "posts", post.id);

    try {
      if (hasLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(userId),
          likesCount: increment(-1)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(userId),
          likesCount: increment(1)
        });
        await triggerSocialNotification(
          post.userId,
          "Yangi Layk! ❤️",
          `${userName} sizning postingizga yoqdi deb baho berdi!`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDetailed = async (post: Post) => {
    setDetailedPost(post);
    
    // Increment post views once per session/user
    const hasViewed = post.views.includes(userId);
    if (!hasViewed && userId) {
      try {
        await updateDoc(doc(db, "posts", post.id), {
          views: arrayUnion(userId),
          viewsCount: increment(1)
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Subscribe to comments
    const commentsQ = query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(commentsQ, (snap) => {
      const list: PostComment[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          postId: post.id,
          userId: d.userId || "",
          authorName: d.authorName || "O'quvchi",
          authorPhoto: d.authorPhoto || "",
          text: d.text || "",
          createdAt: d.createdAt || "",
          likes: d.likes || [],
          likesCount: d.likesCount || 0,
          replies: d.replies || []
        });
      });
      setComments(list);
    });

    return () => unsubscribe();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !detailedPost) return;

    try {
      const commentDoc = {
        userId,
        authorName: userName,
        authorPhoto: userPhoto || "",
        text: commentInput,
        likes: [],
        likesCount: 0,
        replies: [],
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, "posts", detailedPost.id, "comments"), commentDoc);
      
      // Update comments counter
      await updateDoc(doc(db, "posts", detailedPost.id), {
        commentsCount: increment(1)
      });

      await triggerSocialNotification(
        detailedPost.userId,
        "Yangi Izoh! 💬",
        `${userName} postingizga izoh qoldirdi: "${commentInput.slice(0, 20)}..."`
      );

      setCommentInput("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleLikeComment = async (comment: PostComment) => {
    if (!detailedPost) return;
    const hasLiked = comment.likes.includes(userId);
    const commentRef = doc(db, "posts", detailedPost.id, "comments", comment.id);

    try {
      if (hasLiked) {
        await updateDoc(commentRef, {
          likes: arrayRemove(userId),
          likesCount: increment(-1)
        });
      } else {
        await updateDoc(commentRef, {
          likes: arrayUnion(userId),
          likesCount: increment(1)
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReply = async (comment: PostComment, e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !detailedPost) return;

    try {
      const updatedReplies = [
        ...(comment.replies || []),
        {
          id: Date.now().toString(),
          userId,
          authorName: userName,
          text: replyInput,
          createdAt: new Date().toISOString()
        }
      ];

      const commentRef = doc(db, "posts", detailedPost.id, "comments", comment.id);
      await updateDoc(commentRef, {
        replies: updatedReplies
      });

      await triggerSocialNotification(
        comment.userId,
        "Izohingizga Javob! ↩️",
        `${userName} sizning izohingizga javob berdi!`
      );

      setReplyInput("");
      setReplyToId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Sorting
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortOrder === "likes") return b.likesCount - a.likesCount;
    if (sortOrder === "views") return b.viewsCount - a.viewsCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="p-4 space-y-4">
      {/* Top filter and Add Post row */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1.5 text-[9px] font-bold uppercase font-mono">
          {[
            { id: "new", label: "Yangi" },
            { id: "likes", label: "Ko'p layk" },
            { id: "views", label: "Ko'p ko'rilgan" }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortOrder(opt.id as any)}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                sortOrder === opt.id 
                  ? "bg-[#0369a1]/10 text-[#0369a1] border-[#0369a1]/30" 
                  : "bg-white border-sky-100 text-slate-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setEditingPostId(null);
            setText("");
            setImagePreview("");
            setIsCreateOpen(true);
          }}
          className="flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-indigo-600 text-white font-bold text-[10px] hover:bg-indigo-700 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Yangi Post</span>
        </button>
      </div>

      {/* Create / Edit Post Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-5 max-w-[340px] w-full shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-sky-100/60">
              <h4 className="text-xs font-extrabold text-slate-800">
                {editingPostId ? "Postni Tahrirlash" : "Yangi Post Yozish"}
              </h4>
              <button 
                onClick={() => {
                  setIsCreateOpen(false);
                  setImageFile(null);
                  setImagePreview("");
                  setText("");
                }}
                className="p-1 rounded-full bg-slate-100 hover:bg-slate-200"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitPost} className="space-y-3.5 text-xs">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Nimalar haqida ulashmoqchisiz?.."
                rows={4}
                className="w-full bg-slate-50 border border-sky-100 rounded-2xl p-3 outline-none focus:border-indigo-400 text-xs shadow-inner resize-none"
              />

              {imagePreview && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-sky-100 bg-slate-50">
                  <img src={imagePreview} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview("");
                    }}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-1.5 py-2 px-3.5 rounded-xl border border-sky-100 bg-slate-50 text-slate-600 font-bold text-[10px] cursor-pointer hover:bg-sky-50">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Rasm yuklash (Galereya)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageSelect}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md"
              >
                {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{editingPostId ? "Yangilash" : "Joylashtirish"}</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Posts List Grid */}
      <div className="space-y-4">
        {sortedPosts.length === 0 ? (
          <div className="p-8 text-center bg-white border border-sky-100 rounded-3xl">
            <p className="text-xs text-slate-400 italic font-medium">Postlar mavjud emas</p>
          </div>
        ) : (
          sortedPosts.map((post) => {
            const isLong = post.text.length > 150;
            const showFull = expanded[post.id];
            const isMyPost = post.userId === userId;
            const hasLiked = post.likes.includes(userId);

            return (
              <div 
                key={post.id}
                onClick={() => handleOpenDetailed(post)}
                className="p-4 bg-white border border-sky-100/60 rounded-[28px] shadow-xs space-y-3 cursor-pointer hover:border-sky-200 transition-all flex flex-col"
              >
                {/* User Row */}
                <div className="flex items-center justify-between">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewUserProfile(post.userId);
                    }}
                    className="flex items-center space-x-2 cursor-pointer hover:opacity-80 active:scale-98 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center font-black text-xs text-white shadow-sm">
                      {post.authorName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="leading-tight">
                      <h5 className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                        {post.authorName}
                        {isMyPost && <span className="text-[8px] bg-sky-50 text-[#0369a1] px-1 rounded">Siz</span>}
                      </h5>
                      <span className="text-[8px] text-slate-400 font-medium font-mono">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "Bugun"}</span>
                    </div>
                  </div>

                  {/* Actions for post owner */}
                  {isMyPost && (
                    <div className="flex space-x-1" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => handleEditInit(post, e)}
                        className="p-1 rounded bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleDeletePost(post.id, e)}
                        className="p-1 rounded bg-red-50/50 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Text Content */}
                <div className="text-[11px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                  {showFull || !isLong ? post.text : `${post.text.slice(0, 150)}...`}
                  {isLong && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(prev => ({ ...prev, [post.id]: !prev[post.id] }));
                      }}
                      className="text-[#0369a1] font-bold ml-1.5 hover:underline"
                    >
                      {showFull ? "Yopish" : "Ko'proq"}
                    </button>
                  )}
                </div>

                {/* Post Image */}
                {post.imageUrl && (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-50 border border-sky-100/50">
                    <img src={post.imageUrl} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Social count metrics footer */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100/50 pt-2.5">
                  <div className="flex space-x-4">
                    {/* Likes */}
                    <button 
                      onClick={(e) => handleLikePost(post, e)}
                      className={`flex items-center space-x-1 hover:text-red-500 ${hasLiked ? "text-red-500" : ""}`}
                    >
                      <Heart className={`w-4 h-4 ${hasLiked ? "fill-red-500 text-red-500" : ""}`} />
                      <span>{post.likesCount}</span>
                    </button>

                    {/* Comments Count */}
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <span>{post.commentsCount} izoh</span>
                    </div>
                  </div>

                  {/* Views */}
                  <div className="flex items-center space-x-1 font-mono">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>{post.viewsCount}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detailed Comments overlay modal */}
      {detailedPost && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-50 flex items-end md:items-center justify-center p-4">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[32px] max-w-[350px] w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-sky-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-black text-slate-800">Izohlar ({comments.length})</span>
              <button 
                onClick={() => setDetailedPost(null)}
                className="p-1 rounded-full bg-slate-200 hover:bg-slate-300"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
              {comments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[11px] text-slate-400 italic">Ilk izohni yozib qoldiring!</p>
                </div>
              ) : (
                comments.map((comment) => {
                  const isCommentLiked = comment.likes.includes(userId);
                  return (
                    <div key={comment.id} className="space-y-2 border-b border-slate-100 pb-3">
                      <div className="flex items-start justify-between">
                        <div 
                          onClick={() => handleViewUserProfile(comment.userId)}
                          className="flex items-start space-x-2 cursor-pointer hover:opacity-80 transition-all"
                        >
                          <div className="w-6.5 h-6.5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm mt-0.5">
                            {comment.authorName.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-800">{comment.authorName}</span>
                            <p className="text-xs text-slate-600 mt-0.5 font-medium leading-relaxed">{comment.text}</p>
                            <span className="text-[8px] text-slate-400 font-semibold mt-1 block">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString() : "Hozir"}
                            </span>
                          </div>
                        </div>

                        {/* Comment Like action */}
                        <button 
                          onClick={() => handleLikeComment(comment)}
                          className={`p-1 flex items-center space-x-0.5 text-[9px] font-bold ${isCommentLiked ? "text-red-500" : "text-slate-400"}`}
                        >
                          <Heart className="w-3 h-3" />
                          <span>{comment.likesCount}</span>
                        </button>
                      </div>

                      {/* Comment Replies list */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="pl-6 space-y-2 pt-1 border-l border-sky-100">
                          {comment.replies.map((reply: any) => (
                            <div 
                              key={reply.id} 
                              onClick={() => handleViewUserProfile(reply.userId)}
                              className="bg-sky-50/30 p-2 rounded-xl border border-sky-100/20 cursor-pointer hover:bg-sky-50 transition-all"
                            >
                              <span className="text-[9px] font-bold text-slate-700 block">{reply.authorName}</span>
                              <p className="text-[10.5px] text-slate-600 font-semibold leading-tight">{reply.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Box trigger */}
                      <div className="pl-6">
                        {replyToId === comment.id ? (
                          <form 
                            onSubmit={(e) => handleAddReply(comment, e)}
                            className="flex items-center space-x-1.5 mt-1.5"
                          >
                            <input
                              type="text"
                              value={replyInput}
                              onChange={e => setReplyInput(e.target.value)}
                              placeholder="Javobingiz..."
                              required
                              className="flex-1 bg-white border border-sky-100 rounded-xl px-2.5 py-1 text-[10.5px] outline-none"
                            />
                            <button type="submit" className="text-indigo-600 text-[10.5px] font-bold">Yuborish</button>
                            <button type="button" onClick={() => setReplyToId(null)} className="text-slate-400 text-[10.5px]">Bekor</button>
                          </form>
                        ) : (
                          <button 
                            onClick={() => {
                              setReplyToId(comment.id);
                              setReplyInput("");
                            }}
                            className="text-[9px] text-[#0369a1] font-bold hover:underline"
                          >
                            Javob berish ↩️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Post comment form */}
            <form onSubmit={handleAddComment} className="p-2 border-t border-sky-100 bg-white flex space-x-1.5 items-center">
              <input 
                type="text" 
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder="Fikringizni bildiring..."
                required
                className="flex-1 bg-slate-50 border border-sky-100 rounded-xl py-2 px-3.5 text-xs outline-none focus:border-indigo-400"
              />
              <button 
                type="submit"
                className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Public Profile View Modal */}
      {selectedProfileId && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-md z-50 flex flex-col justify-between text-slate-100">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Top Header */}
            <div className="flex items-center justify-between pt-10">
              <button 
                onClick={() => {
                  setSelectedProfileId(null);
                  setSelectedProfileData(null);
                }}
                className="flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all font-semibold text-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Ortga</span>
              </button>
              <span className="text-xs font-bold font-mono text-white/55">FOYDALANUVCHI PROFILI</span>
            </div>

            {loadingProfile ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-white/55 animate-pulse">Ma'lumotlar yuklanmoqda...</span>
              </div>
            ) : selectedProfileData ? (
              <div className="space-y-5">
                {/* Main Profile Info Card */}
                <div className="bento-card p-6 border border-white/10 text-center space-y-4 relative overflow-hidden bg-white/5">
                  {selectedProfileData.isPremium && (
                    <div className="absolute top-3 right-3 bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                      ★ Premium
                    </div>
                  )}
                  
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#0369a1] to-indigo-500 flex items-center justify-center font-black text-3xl text-white shadow-xl mx-auto border-2 border-white/20">
                    {selectedProfileData.displayName ? selectedProfileData.displayName.slice(0, 1).toUpperCase() : "?"}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold text-white tracking-tight">{selectedProfileData.displayName || "EduVerse O'quvchisi"}</h4>
                    <p className="text-[10px] text-white/50 font-bold font-mono">
                      A'zolik sanasi: {selectedProfileData.createdAt ? new Date(selectedProfileData.createdAt).toLocaleDateString() : "Bugun"}
                    </p>
                  </div>

                  {/* Coins Balance Badge */}
                  <div className="inline-flex items-center space-x-1.5 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 text-xs font-extrabold text-amber-400 shadow-sm">
                    <span>🪙</span>
                    <span>{selectedProfileData.eduCoins || 0} EduCoin</span>
                  </div>
                </div>

                {/* Title / Header of their posts */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-extrabold text-white/70 flex items-center gap-1.5 px-1 uppercase tracking-wider font-mono">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Joylashtirgan barcha postlari:</span>
                  </h4>

                  {/* User specific posts */}
                  {(() => {
                    const userPosts = posts.filter(p => p.userId === selectedProfileId);
                    if (userPosts.length === 0) {
                      return (
                        <div className="p-8 text-center bg-white/5 border border-white/5 rounded-2xl">
                          <p className="text-xs text-white/40 italic font-medium">Postlar mavjud emas</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3 pb-6">
                        {userPosts.map((up) => {
                          return (
                            <div 
                              key={up.id}
                              onClick={() => {
                                handleOpenDetailed(up);
                              }}
                              className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-xs space-y-3 cursor-pointer hover:border-white/20 transition-all flex flex-col text-slate-100"
                            >
                              <div className="flex justify-between items-center text-[9px] text-white/40 font-bold">
                                <span className="font-mono">{up.createdAt ? new Date(up.createdAt).toLocaleDateString() : "Bugun"}</span>
                                <div className="flex space-x-2.5">
                                  <span className="flex items-center space-x-1">
                                    <ThumbsUp className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>{up.likesCount} ta layk</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>{up.commentsCount} ta izoh</span>
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">{up.text}</p>
                              {up.imageUrl && (
                                <img src={up.imageUrl} className="w-full max-h-[160px] object-cover rounded-xl mt-1 border border-white/5 shadow-inner" referrerPolicy="no-referrer" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white/5 border border-white/5 rounded-2xl">
                <p className="text-xs text-white/40 italic font-medium">Profil topilmadi</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------ LOCAL GROUPS TAB ------------------
interface LocalGroup {
  id: string;
  title: string;
  description: string;
  link: string;
  category: "group" | "channel";
  createdAt: string;
}

function LocalGroupsTab({ isAdmin }: { isAdmin: boolean }) {
  const [groups, setGroups] = useState<LocalGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "local_groups"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: LocalGroup[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          title: d.title || "",
          description: d.description || "",
          link: d.link || "",
          category: d.category || "channel",
          createdAt: d.createdAt || ""
        });
      });
      setGroups(list);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Rostdan ham ushbu guruhni o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "local_groups", groupId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bento-card p-4 border border-white/10 bg-white/5 space-y-1">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Mahalliy Guruhlar va Kanallar</h4>
        <p className="text-[10px] text-white/55 leading-relaxed font-semibold">
          Adminlarimiz tomonidan tavsiya etilgan eng foydali maxsus Telegram guruh va kanallari ro'yxati.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-white/40">Yuklanmoqda...</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="bento-card p-10 border border-white/5 bg-white/5 text-center space-y-2">
          <Users className="w-8 h-8 text-white/20 mx-auto" />
          <p className="text-xs font-bold text-white/55">Guruhlar topilmadi</p>
          <p className="text-[9px] text-white/40">Hozircha hech qanday foydali guruh kiritilmagan.</p>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {groups.map((group) => (
            <div 
              key={group.id}
              className="bento-card p-4 border border-white/10 bg-white/5 hover:border-white/20 transition-all flex justify-between items-center space-x-3 relative"
            >
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    group.category === "group" 
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" 
                      : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  }`}>
                    {group.category === "group" ? "Guruh" : "Kanal"}
                  </span>
                  <h4 className="text-xs font-extrabold text-white leading-tight truncate">{group.title}</h4>
                </div>
                <p className="text-[10.5px] text-white/60 font-semibold leading-relaxed line-clamp-2">
                  {group.description}
                </p>
              </div>

              <div className="flex flex-col space-y-1.5 flex-shrink-0 items-end">
                <a 
                  href={group.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-[10px] font-black shadow-md transition-all active:scale-95 block text-center"
                >
                  Qo'shilish
                </a>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-1 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg text-[9px] font-bold cursor-pointer transition-all active:scale-95"
                    title="O'chirish"
                  >
                    O'chirish
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
