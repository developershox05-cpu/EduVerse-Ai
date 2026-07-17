import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  getFirestore,
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  increment,
  Firestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  where
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCul9dAPpniy60fIGRlJXvIOzaGaQHN2j8",
  authDomain: "gen-lang-client-0971673086.firebaseapp.com",
  projectId: "gen-lang-client-0971673086",
  storageBucket: "gen-lang-client-0971673086.firebasestorage.app",
  messagingSenderId: "221463684977",
  appId: "1:221463684977:web:3e6bc0ae433399d69cb8d0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID from config
export const db: Firestore = getFirestore(app, "ai-studio-57614103-a3d2-46aa-9eba-1f3b4c016692");

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Storage
export const storage = getStorage(app);

// Google Sign-In wrapper
export async function signInWithGoogle() {
  googleProvider.setCustomParameters({
    prompt: "select_account"
  });
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase Sign In Error:", error);
    throw error;
  }
}

// User Firestore Stats interface
export interface UserStats {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  eduCoins: number;
  dailyUsageMinutes: number;
  isPremium: boolean;
  createdAt: string;
  invitedBy?: string;
  invitedFriendsCount?: number;
  invitedFriendsList?: string[];
}

// Sync or fetch user stats from Firestore
export async function syncUserStats(user: any, invitedByUid?: string): Promise<UserStats> {
  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    return userDoc.data() as UserStats;
  } else {
    // Create new profile
    const newStats: UserStats = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "EduVerse O'quvchisi",
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
      eduCoins: 0,
      dailyUsageMinutes: 0,
      isPremium: false,
      createdAt: new Date().toISOString(),
      invitedBy: invitedByUid || "",
      invitedFriendsCount: 0,
      invitedFriendsList: []
    };
    await setDoc(userRef, newStats);

    // If invited by someone, update their count and trigger a notification!
    if (invitedByUid && invitedByUid !== user.uid) {
      try {
        const referrerRef = doc(db, "users", invitedByUid);
        const referrerDoc = await getDoc(referrerRef);
        if (referrerDoc.exists()) {
          const refData = referrerDoc.data();
          const currentList = refData.invitedFriendsList || [];
          if (!currentList.includes(user.uid)) {
            // Update referrer's list and count
            await updateDoc(referrerRef, {
              invitedFriendsCount: increment(1),
              invitedFriendsList: arrayUnion(user.uid)
            });

            // Write a real live notification into referrer's subcollection "notifications"!
            const notifCollection = collection(db, "users", invitedByUid, "notifications");
            await addDoc(notifCollection, {
              title: "Yangi taklif qilingan do'st! 🎉",
              body: `${user.displayName} kirdi, rahmat! Alloh bilimingizni ziyoda qilsin! 📚`,
              read: false,
              createdAt: new Date().toISOString(),
              type: "referral_success"
            });
          }
        }
      } catch (err) {
        console.error("Referrer update failed:", err);
      }
    }

    return newStats;
  }
}

// Add coins to user in Firestore
export async function addEduCoins(userId: string, amount: number) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      eduCoins: increment(amount)
    });
  } catch (e) {
    console.error("Failed to add EduCoins:", e);
  }
}
