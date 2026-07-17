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
  UserCheck
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
  where
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
  const [activeTab, setActiveTab] = useState<"posts" | "groups" | "voice">("posts");

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 ${isFullscreenMode ? "bg-[#090d16]" : ""}`}>
      {/* Community Tab Navigation Pills */}
      {!isFullscreenMode && (
        <div className="px-4 pt-3 pb-2 flex space-x-1.5 overflow-x-auto border-b border-slate-800 bg-[#0c1222] scrollbar-none">
          {[
            { id: "posts", label: "Postlar", icon: <MessageSquare className="w-3.5 h-3.5" /> },
            { id: "groups", label: "Guruhlar", icon: <Users className="w-3.5 h-3.5" /> },
            { id: "voice", label: "Ovozli", icon: <Mic className="w-3.5 h-3.5" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#0369a1] text-white shadow-sm"
                  : "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
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
          <GroupChatTab userId={userId} userName={userName} userPhoto={userPhoto} isFullscreenMode={isFullscreenMode} setIsFullscreenMode={setIsFullscreenMode} />
        )}
        {activeTab === "voice" && (
          <VoiceGroupsTab userId={userId} userName={userName} userPhoto={userPhoto} isFullscreenMode={isFullscreenMode} setIsFullscreenMode={setIsFullscreenMode} />
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
    if (!text.trim()) return;

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
                required
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
                  <div className="flex items-center space-x-2">
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
                        <div className="flex items-start space-x-2">
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
                            <div key={reply.id} className="bg-sky-50/30 p-2 rounded-xl border border-sky-100/20">
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
    </div>
  );
}

// ------------------ GROUP CHAT TAB ------------------
function GroupChatTab({ 
  userId, 
  userName, 
  userPhoto, 
  isFullscreenMode, 
  setIsFullscreenMode 
}: { 
  userId: string; 
  userName: string; 
  userPhoto: string; 
  isFullscreenMode?: boolean; 
  setIsFullscreenMode?: (val: boolean) => void; 
}) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  
  // Create Group Form
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load Groups in Real-time
  useEffect(() => {
    const q = query(collection(db, "chat_groups"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snap) => {
      const list: ChatGroup[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          name: d.name || "",
          creatorId: d.creatorId || "",
          createdAt: d.createdAt || "",
          active: d.active !== false
        });
      });

      // Automatically create a default general chat group if empty
      if (list.length === 0) {
        try {
          const defaultGroup = {
            name: "Umumiy Guruh 💬",
            creatorId: "system",
            active: true,
            createdAt: new Date().toISOString()
          };
          await addDoc(collection(db, "chat_groups"), defaultGroup);
        } catch (e) {
          console.error(e);
        }
      }

      setGroups(list);
      // Pick first group as active default if none selected
      if (list.length > 0 && !activeGroup) {
        setActiveGroup(list[0]);
      }
    });
    return () => unsubscribe();
  }, [activeGroup]);

  // Load active group messages
  useEffect(() => {
    if (!activeGroup) {
      setMessages([]);
      return;
    }

    const messagesQ = query(
      collection(db, "chat_groups", activeGroup.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(messagesQ, (snap) => {
      const list: GroupMessage[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          userId: d.userId || "",
          userName: d.userName || "O'quvchi",
          userPhoto: d.userPhoto || "",
          text: d.text || "",
          createdAt: d.createdAt || ""
        });
      });
      setMessages(list);
      // Scroll to bottom
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    });

    return () => unsubscribe();
  }, [activeGroup]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const docRef = await addDoc(collection(db, "chat_groups"), {
        name: newGroupName,
        creatorId: userId,
        active: true,
        createdAt: new Date().toISOString()
      });
      setNewGroupName("");
      setShowCreate(false);
      // Set created group active
      setActiveGroup({
        id: docRef.id,
        name: newGroupName,
        creatorId: userId,
        active: true,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Haqiqatdan ham ushbu guruhni butunlay o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "chat_groups", groupId));
      if (activeGroup?.id === groupId) setActiveGroup(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !activeGroup) return;

    try {
      const msgData = {
        userId,
        userName,
        userPhoto: userPhoto || "",
        text: textInput,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "chat_groups", activeGroup.id, "messages"), msgData);
      setTextInput("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-[75vh] overflow-hidden bg-[#090d16] text-slate-100">
      {/* Left side sidebar of groups */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col bg-[#0c1222]/80 overflow-y-auto p-2 space-y-2 scrollbar-none">
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-2 px-2 rounded-xl bg-indigo-600 text-white font-extrabold text-[9px] flex items-center justify-center gap-1 shadow-md hover:bg-indigo-700 cursor-pointer active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>GURUH</span>
        </button>

        {groups.map((g) => {
          const isActive = activeGroup?.id === g.id;
          const isMyGroup = g.creatorId === userId;
          return (
            <div
              key={g.id}
              onClick={() => setActiveGroup(g)}
              className={`p-2.5 rounded-2xl text-[10px] font-bold cursor-pointer border relative group select-none transition-all ${
                isActive 
                  ? "bg-[#0369a1] text-white border-sky-400/50 shadow-md" 
                  : "bg-[#131b2e] border-slate-800 text-slate-300 hover:bg-[#1a243d]"
              }`}
            >
              <p className="truncate pr-4 leading-tight">{g.name}</p>
              
              {isMyGroup && (
                <button
                  onClick={(e) => handleDeleteGroup(g.id, e)}
                  className="absolute right-1 top-2.5 p-1 rounded hover:bg-black/20 text-red-400 hidden group-hover:block"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right side active Chat Panel */}
      <div className="flex-1 flex flex-col bg-[#090d16] overflow-hidden">
        {activeGroup ? (
          <>
            {/* Active Group Header */}
            <div className="p-3 border-b border-slate-800 bg-[#0c1222] flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-100 truncate leading-none max-w-[120px]">{activeGroup.name}</span>
              <span className="text-[8px] bg-[#0369a1]/20 text-sky-400 font-extrabold px-2 py-0.5 rounded-full font-mono border border-sky-500/20">Real-time</span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#090d16]">
              {messages.map((m) => {
                const isMe = m.userId === userId;
                return (
                  <motion.div 
                    key={m.id} 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 22 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[85%] space-y-0.5">
                      {!isMe && (
                        <span className="text-[8px] font-bold text-sky-400 block px-1">{m.userName}</span>
                      )}
                      <div className={`p-2.5 rounded-2xl text-[10.5px] leading-relaxed shadow-sm ${
                        isMe 
                          ? "bg-[#0369a1] text-white rounded-br-none shadow-cyan-950/40" 
                          : "bg-[#131b2e] text-slate-100 rounded-bl-none border border-slate-800"
                      }`}>
                        {m.text}
                      </div>
                      <span className={`text-[7.5px] text-slate-500 font-mono block px-1 ${isMe ? "text-right" : ""}`}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat input box */}
            <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-800 bg-[#0c1222] flex space-x-1 items-center">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Xabar yozing..."
                required
                className="flex-1 bg-[#131b2e] border border-slate-800 rounded-xl py-2 px-3 text-[11px] text-white outline-none focus:border-sky-500/50 transition-all placeholder-slate-500"
              />
              <button type="submit" className="p-2.5 rounded-xl bg-[#0369a1] text-white hover:bg-sky-700 active:scale-95 transition-all cursor-pointer">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <Users className="w-10 h-10 text-slate-700 animate-pulse mb-2" />
            <p className="text-xs text-slate-500 italic">Muloqot boshlash uchun chap tarafdan guruh tanlang</p>
          </div>
        )}
      </div>

      {/* Create Group Dialog Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0c1222] border border-slate-800 rounded-3xl p-5 max-w-[320px] w-full shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-slate-100">Yangi Chat Guruhi</span>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400">Guruh Nomi *</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="Masalan: IELTS Speaking Club 💬"
                  className="w-full bg-[#131b2e] border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-sky-500/50 transition-all placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
              >
                Guruh Yaratish
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ------------------ VOICE GROUPS TAB ------------------
function VoiceGroupsTab({ 
  userId, 
  userName, 
  userPhoto, 
  isFullscreenMode, 
  setIsFullscreenMode 
}: { 
  userId: string; 
  userName: string; 
  userPhoto: string; 
  isFullscreenMode?: boolean; 
  setIsFullscreenMode?: (val: boolean) => void; 
}) {
  const [voices, setVoices] = useState<VoiceGroup[]>([]);
  const [joinedGroup, setJoinedGroup] = useState<VoiceGroup | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // Create Voice states
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");

  // Control Fullscreen when in voice room
  useEffect(() => {
    if (joinedGroup) {
      setIsFullscreenMode?.(true);
    } else {
      setIsFullscreenMode?.(false);
    }
    return () => {
      setIsFullscreenMode?.(false);
    };
  }, [joinedGroup, setIsFullscreenMode]);

  // Load active voice groups
  useEffect(() => {
    const q = query(collection(db, "voice_groups"), where("active", "==", true), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: VoiceGroup[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          name: d.name || "Ovozli Xona",
          creatorId: d.creatorId || "",
          creatorName: d.creatorName || "Ustoz",
          active: d.active !== false,
          participants: d.participants || [],
          createdAt: d.createdAt || ""
        });
      });
      setVoices(list);

      // Keep joinedGroup synced live
      if (joinedGroup) {
        const found = list.find(g => g.id === joinedGroup.id);
        if (found) {
          setJoinedGroup(found);
        } else {
          // Room deleted/closed by admin
          setJoinedGroup(null);
          setIsFullscreenMode?.(false);
        }
      }
    });
    return () => unsubscribe();
  }, [joinedGroup]);

  const handleCreateVoiceGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      const selfParticipant = { uid: userId, name: userName, photo: userPhoto || "" };
      const newRoom = {
        name: groupName,
        creatorId: userId,
        creatorName: userName,
        active: true,
        participants: [selfParticipant],
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "voice_groups"), newRoom);
      setGroupName("");
      setShowCreate(false);
      setJoinedGroup({ id: docRef.id, ...newRoom });
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinVoice = async (room: VoiceGroup) => {
    const hasJoined = room.participants.some(p => p.uid === userId);
    if (hasJoined) {
      setJoinedGroup(room);
      return;
    }

    try {
      const updatedParticipants = [
        ...room.participants,
        { uid: userId, name: userName, photo: userPhoto || "" }
      ];

      await updateDoc(doc(db, "voice_groups", room.id), {
        participants: updatedParticipants
      });

      setJoinedGroup({ ...room, participants: updatedParticipants });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveVoice = async () => {
    if (!joinedGroup) return;

    try {
      const updatedParticipants = joinedGroup.participants.filter(p => p.uid !== userId);
      await updateDoc(doc(db, "voice_groups", joinedGroup.id), {
        participants: updatedParticipants
      });
      setJoinedGroup(null);
      setIsFullscreenMode?.(false);
    } catch (e) {
      console.error(e);
      setJoinedGroup(null);
      setIsFullscreenMode?.(false);
    }
  };

  const handleDeleteVoiceGroup = async (room: VoiceGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Haqiqatdan ham ovozli xonani butunlay o'chirmoqchimisiz?")) return;

    try {
      await updateDoc(doc(db, "voice_groups", room.id), {
        active: false
      });
      if (joinedGroup?.id === room.id) {
        setJoinedGroup(null);
        setIsFullscreenMode?.(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-[#090d16] min-h-full text-slate-100">
      {/* ACTIVE ROOM IMMERSIVE FULLSCREEN SCREEN (If joined) */}
      {joinedGroup ? (
        <div className="fixed inset-0 bg-[#090d16] z-[100] flex flex-col justify-between p-6 overflow-hidden">
          {/* Animated Background Pulsing Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />

          {/* Top Header Row of Fullscreen Voice Room */}
          <div className="flex justify-between items-center z-10">
            <div>
              <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block font-mono">Ulanish faol</span>
              <h4 className="text-sm font-black truncate max-w-[200px] text-slate-100">{joinedGroup.name}</h4>
              <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">Xona yaratuvchisi: {joinedGroup.creatorName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[8px] bg-red-500/20 text-red-400 font-extrabold border border-red-500/30 px-3 py-1 rounded-full animate-pulse tracking-wider uppercase">Jonli efir</span>
            </div>
          </div>

          {/* Center Immersive Microphone Node and Waveforms */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 z-10">
            <div className="relative">
              {/* Pulsing Gooey Audio Circles */}
              {!isMuted && (
                <>
                  <motion.div 
                    animate={{ scale: [1, 1.35, 1], opacity: [0.15, 0, 0.15] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -inset-8 rounded-full border border-sky-500/20 pointer-events-none"
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.7, 1], opacity: [0.1, 0, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute -inset-14 rounded-full border border-sky-400/10 pointer-events-none"
                  />
                </>
              )}

              {/* Core Microphone Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMuted(!isMuted)}
                className={`w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-2xl relative transition-colors duration-300 ${
                  isMuted 
                    ? "bg-slate-800/80 border-4 border-slate-700 text-slate-400 shadow-slate-950/50" 
                    : "bg-sky-600 border-4 border-sky-400/30 text-white shadow-sky-500/20"
                }`}
              >
                {isMuted ? <MicOff className="w-10 h-10 mb-1" /> : <Mic className="w-10 h-10 mb-1 animate-bounce" />}
                <span className="text-[9px] font-black uppercase tracking-widest">{isMuted ? "Yopiq" : "Ochiq"}</span>
              </motion.button>
            </div>

            {/* Glowing Waveform Simulation */}
            <div className="flex justify-center items-center h-10 space-x-1 w-full max-w-[200px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(bar => {
                const animationDuration = `${0.3 + Math.random() * 0.7}s`;
                return (
                  <motion.div 
                    key={bar}
                    animate={isMuted ? { height: "4px" } : { height: ["6px", "32px", "6px"] }}
                    transition={isMuted ? {} : { duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: bar * 0.05 }}
                    style={isMuted ? {} : { animationDuration }}
                    className={`w-1 rounded-full transition-colors duration-300 ${isMuted ? "bg-slate-700" : "bg-sky-400"}`}
                  />
                );
              })}
            </div>

            <div className="text-center space-y-1">
              <p className="text-[11px] text-slate-300 font-bold">
                {isMuted ? "Mikrofoningiz o'chirilgan" : "Sizni hamma eshitmoqda..."}
              </p>
              <p className="text-[9px] text-slate-500 font-semibold font-mono">
                Mikrofonni boshqarish uchun o'rtadagi doirani bosing
              </p>
            </div>
          </div>

          {/* Bottom Participant Grid Section */}
          <div className="space-y-3 z-10 max-h-[160px] overflow-y-auto bg-slate-950/40 p-4 border border-slate-800/50 rounded-3xl">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Xonadagilar ({joinedGroup.participants.length} ishtirokchi)
            </span>
            <div className="grid grid-cols-4 gap-3">
              {joinedGroup.participants.map((p, idx) => {
                const isUserMicActive = idx % 3 === 0 && !isMuted; // simulated speaking
                return (
                  <div key={idx} className="flex flex-col items-center text-center space-y-1">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-slate-200 border-2 ${
                        isUserMicActive ? "border-green-400 ring-2 ring-green-400/20" : "border-slate-700"
                      }`}>
                        {p.name.slice(0, 1).toUpperCase()}
                      </div>
                      {/* Active green speaking dot */}
                      {isUserMicActive && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-950 rounded-full animate-ping" />
                      )}
                    </div>
                    <span className="text-[9px] text-slate-300 truncate w-full font-bold">{p.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex space-x-3 pt-4 border-t border-slate-800/60 z-10">
            <button
              onClick={handleLeaveVoice}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-extrabold text-[10px] tracking-widest uppercase transition-all active:scale-95 cursor-pointer shadow-md"
            >
              Ortga qaytish ↩
            </button>
            {joinedGroup.creatorId === userId && (
              <button
                onClick={(e) => handleDeleteVoiceGroup(joinedGroup, e)}
                className="flex-1 py-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 font-extrabold text-[10px] tracking-widest uppercase transition-all active:scale-95 cursor-pointer"
              >
                Xonani yakunlash
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Xonalar ro'yxati */
        <div className="space-y-4">
          {/* Intro Header */}
          <div className="relative overflow-hidden rounded-[24px] p-5 bg-[#0c1222] border border-slate-800 text-white shadow-md flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="text-sm font-extrabold flex items-center gap-1.5">
                <Mic className="w-5 h-5 text-sky-400 animate-pulse" />
                Ovozli Guruhlar
              </h3>
              <p className="text-[11px] text-slate-400 leading-snug">Jonli suhbat xonalari tashkil qiling va muloqot qiling</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center space-x-1 py-2 px-4 rounded-xl bg-sky-600 text-white font-extrabold text-[10px] hover:bg-sky-500 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>YARATISH</span>
            </button>
          </div>

          <h4 className="text-xs font-black text-slate-400 tracking-wider font-mono">Faol xonalar ({voices.length})</h4>
          {voices.length === 0 ? (
            <div className="p-8 text-center bg-[#0c1222] border border-slate-800/80 rounded-[28px] space-y-2">
              <Mic className="w-8 h-8 text-slate-700 mx-auto animate-pulse" />
              <p className="text-xs text-slate-400 font-medium">Hozirda faol xonalar topilmadi. Birinchi bo'lib xona oching!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {voices.map(room => {
                const isCreator = room.creatorId === userId;
                return (
                  <div 
                    key={room.id}
                    onClick={() => handleJoinVoice(room)}
                    className="p-4 bg-[#0c1222] border border-slate-800/80 rounded-[24px] flex items-center justify-between hover:border-slate-750 transition-all cursor-pointer shadow-md active:scale-98 group"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="p-3 bg-[#0369a1]/10 rounded-2xl text-sky-400 border border-sky-500/20 animate-pulse">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-100 group-hover:text-sky-400 transition-colors">{room.name}</h5>
                        <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Boshlovchi: {room.creatorName}</span>
                        <span className="inline-flex items-center text-[8px] font-extrabold text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded-full border border-sky-900/50 mt-1.5 font-mono">
                          {room.participants.length} ishtirokchi
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-1.5">
                      {isCreator && (
                        <button
                          onClick={(e) => handleDeleteVoiceGroup(room, e)}
                          className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create voice group modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0c1222] border border-slate-800 rounded-3xl p-5 max-w-[310px] w-full shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-slate-100">Ovozli Suhbat Xonasi</span>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVoiceGroup} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400">Xona Nomi *</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="Masalan: SAT English Practice 🎙️"
                  className="w-full bg-[#131b2e] border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-sky-500/50 transition-all placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#0369a1] text-white font-extrabold rounded-xl shadow-md hover:bg-sky-700 transition-all active:scale-95 cursor-pointer"
              >
                Xonani Boshlash
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ------------------ LIVE BROADCASTS TAB ------------------
function LiveBroadcastsTab({ userId, userName, isAdmin }: { userId: string; userName: string; isAdmin: boolean }) {
  const [streams, setStreams] = useState<LiveBroadcast[]>([]);
  const [activeStream, setActiveStream] = useState<LiveBroadcast | null>(null);

  // Live streaming client chat states
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);

  // Admin Broadcast title state
  const [liveTitle, setLiveTitle] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Load Active Streams in Real-time
  useEffect(() => {
    const q = query(collection(db, "live_broadcasts"), where("active", "==", true), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: LiveBroadcast[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          title: d.title || "Jonli Efir",
          creatorId: d.creatorId || "",
          creatorName: d.creatorName || "Tizim",
          active: d.active !== false,
          likesCount: d.likesCount || 0,
          createdAt: d.createdAt || ""
        });
      });
      setStreams(list);

      // Keep active stream sync’d
      if (activeStream) {
        const found = list.find(s => s.id === activeStream.id);
        if (found) {
          setActiveStream(found);
        } else {
          setActiveStream(null);
          alert("Efir tugatildi.");
        }
      }
    });
    return () => unsubscribe();
  }, [activeStream]);

  // Load live comments
  useEffect(() => {
    if (!activeStream) {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, "live_broadcasts", activeStream.id, "live_comments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const list: LiveComment[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          userId: d.userId || "",
          userName: d.userName || "Ko'ruvchi",
          text: d.text || "",
          createdAt: d.createdAt || ""
        });
      });
      setComments(list);
    });

    return () => unsubscribe();
  }, [activeStream]);

  const handleStartLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveTitle.trim()) return;

    try {
      const newLive = {
        title: liveTitle,
        creatorId: userId,
        creatorName: userName,
        active: true,
        likesCount: 0,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "live_broadcasts"), newLive);
      setLiveTitle("");
      setShowAddForm(false);
      setActiveStream({ id: docRef.id, ...newLive });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndLive = async () => {
    if (!activeStream) return;
    try {
      await updateDoc(doc(db, "live_broadcasts", activeStream.id), {
        active: false
      });
      setActiveStream(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendLiveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeStream) return;

    try {
      await addDoc(collection(db, "live_broadcasts", activeStream.id, "live_comments"), {
        userId,
        userName,
        text: commentText,
        createdAt: new Date().toISOString()
      });
      setCommentText("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleHeartClick = async () => {
    if (!activeStream) return;
    setFloatingHearts(prev => [...prev, Date.now()]);
    
    // Increment hearts in Firestore
    try {
      await updateDoc(doc(db, "live_broadcasts", activeStream.id), {
        likesCount: increment(1)
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Broadcast Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-r from-[#0369a1] to-[#0284c7] text-white shadow-md flex justify-between items-center">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-1.5">
            <Radio className="w-5 h-5 text-sky-200 animate-pulse" />
            Jonli Efirlar (Broadcast)
          </h3>
          <p className="text-[11px] text-sky-100 leading-snug">Oliy o'quv darslari va savol-javob efirlari</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={activeStream !== null}
            className="flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-white text-[#0369a1] font-bold text-[10px] hover:bg-sky-50 shadow-sm disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Go Live</span>
          </button>
        )}
      </div>

      {/* ACTIVE LIVE STREAM VIEWER (Overlay/Screen if streaming) */}
      {activeStream ? (
        <div className="bg-slate-950 rounded-[32px] overflow-hidden text-white h-[65vh] flex flex-col justify-between border border-slate-900 shadow-2xl relative animate-scale-up">
          
          {/* Animated Mock Stream Video */}
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center pointer-events-none">
            {/* Soft flashing live webcam effect */}
            <div className="w-24 h-24 rounded-full border-4 border-dashed border-red-500 flex items-center justify-center animate-spin" style={{ animationDuration: '10s' }} />
            <Radio className="w-8 h-8 text-red-500 absolute animate-pulse" />
            <span className="text-[10px] font-mono text-slate-500 mt-4">Jonli darslik ulashilmoqda...</span>
          </div>

          {/* Top Bar overlays */}
          <div className="p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-10">
            <div>
              <span className="text-[10px] bg-red-600 text-white font-extrabold px-2.5 py-0.5 rounded-full border border-white/10 animate-pulse">LIVE</span>
              <h4 className="text-xs font-black truncate max-w-[160px] mt-1">{activeStream.title}</h4>
            </div>
            
            <button
              onClick={activeStream.creatorId === userId ? handleEndLive : () => setActiveStream(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-[10px]"
            >
              {activeStream.creatorId === userId ? "Efirni tugatish" : "Chiqish ❌"}
            </button>
          </div>

          {/* Floating Hearts display container */}
          <div className="absolute inset-x-0 bottom-24 h-32 overflow-hidden pointer-events-none z-10">
            <AnimatePresence>
              {floatingHearts.map(id => (
                <motion.div
                  key={id}
                  initial={{ y: 80, x: 100 + Math.random() * 80, opacity: 1, scale: 0.8 }}
                  animate={{ y: -80, opacity: 0, scale: 1.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute text-red-500 text-lg"
                >
                  ❤️
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Bottom Live Comments Overlay overlaying mock screen */}
          <div className="p-3 bg-gradient-to-t from-black via-black/70 to-transparent space-y-2 z-10">
            
            {/* Comments roll */}
            <div className="h-28 overflow-y-auto space-y-1.5 scrollbar-none text-[10px]">
              {comments.map(c => (
                <div key={c.id} className="bg-white/10 border border-white/5 backdrop-blur-md rounded-xl p-2 max-w-[85%]">
                  <span className="font-bold text-sky-300 block">{c.userName}</span>
                  <p className="text-white/90 font-medium leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>

            {/* Input and Heart action controls */}
            <div className="flex space-x-1.5 items-center">
              <form onSubmit={handleSendLiveComment} className="flex-1 flex bg-white/10 rounded-xl overflow-hidden border border-white/15">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Jonli efirga yozing..."
                  required
                  className="flex-1 bg-transparent px-3 py-2 text-xs outline-none text-white border-none"
                />
                <button type="submit" className="p-2.5 text-sky-400 hover:text-sky-300">
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Heart floating trigger */}
              <button 
                onClick={handleHeartClick}
                className="p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-md active:scale-90 transition-all cursor-pointer flex items-center justify-center"
              >
                <Heart className="w-4 h-4 fill-white" />
              </button>

              <span className="text-[9px] font-bold font-mono text-slate-300">{activeStream.likesCount}</span>
            </div>
          </div>
        </div>
      ) : (
        /* List of active streams */
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-slate-600 tracking-wider font-mono">FAOL EFIRLAR ({streams.length})</h4>
          {streams.length === 0 ? (
            <div className="p-8 text-center bg-white border border-sky-100 rounded-3xl">
              <p className="text-xs text-slate-400 italic font-medium">Hozirda jonli dars efirlari olib borilmayapti.</p>
            </div>
          ) : (
            streams.map(stream => (
              <div 
                key={stream.id}
                onClick={() => setActiveStream(stream)}
                className="p-4 bg-white border border-sky-100/60 rounded-3xl flex items-center justify-between hover:border-red-300 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-3 bg-red-50 text-red-500 rounded-2xl animate-pulse">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-black text-slate-800 truncate leading-snug">{stream.title}</h5>
                    <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Ustoz: {stream.creatorName}</span>
                    <span className="inline-flex items-center text-[8px] font-bold text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100 mt-1.5 animate-pulse">
                      Live
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 text-[10px] font-bold text-red-500 font-mono">
                  <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                  <span>{stream.likesCount}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Admin Broadcast Title form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-5 max-w-[310px] w-full shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-sky-100 pb-2">
              <span className="text-xs font-black text-slate-800">Jonli Efir Boshlash</span>
              <button onClick={() => setShowAddForm(false)} className="p-1 rounded-full bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleStartLive} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Efir Sarlavhasi (Mavzusi) *</label>
                <input
                  type="text"
                  required
                  value={liveTitle}
                  onChange={e => setLiveTitle(e.target.value)}
                  placeholder="Masalan: IELTS Writing Task 2 Tahlili 📝"
                  className="w-full bg-slate-50 border border-sky-100 rounded-xl p-2.5 outline-none focus:border-red-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all"
              >
                Efirni Boshlash (Live)
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
