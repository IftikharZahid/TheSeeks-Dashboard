import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  updatePassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  getDoc,
  addDoc,
  getFirestore,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchBooks,
  fetchClasses,
  persistBooks,
  persistClasses,
  setBooks,
  setClasses,
  resetStatus,
  fetchDefaultFees,
  persistDefaultFees,
  fetchGroups,
  persistGroups,
  setGroups,
  fetchLibraryCategories,
  persistLibraryCategories,
  setLibraryCategories,
  persistExamSettings,
  fetchExamSettings,
  fetchUpdateNotice,
  persistUpdateNotice,
} from "../../store/slices/appSettingsSlice";
import {
  fetchStudents,
  resetStudentsStatus,
} from "../../store/slices/studentsSlice";
import * as XLSX from "xlsx";
import Card_Generator from "./Card_Generator";

const ADMIN_EMAILS = [
  "theseeksacademyfta@gmail.com",
  "iftikharzahid@outlook.com",
  "iftikharxahid@gmail.com",
];

const CustomDropdown = ({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [open]);

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="form-input"
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          cursor: "pointer",
          minWidth: 140,
          fontSize: 13,
          fontWeight: 500,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg3)",
          color: "var(--text)",
        }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginRight: 8,
          }}
        >
          {value || placeholder}
        </span>
        <span style={{ fontSize: 10, flexShrink: 0, opacity: 0.5 }}>▼</span>
      </div>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 9998 }}
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                position: "absolute",
                top: coords.top + 4,
                left: coords.left,
                width: Math.max(coords.width, 160),
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                zIndex: 9999,
                maxHeight: 180,
                overflowY: "auto",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <div
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                  background: value === "" ? "var(--bg3)" : "transparent",
                  color: "var(--text)",
                }}
              >
                {placeholder}
              </div>
              {options?.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                    background: value === opt ? "var(--bg3)" : "transparent",
                    color: "var(--text)",
                  }}
                >
                  {opt}
                </div>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

export interface NoticeIconOption {
  id: string;
  icon: string;
  label: string;
}

export const IconDropdown = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: NoticeIconOption[];
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [open]);

  const selectedOption = options.find((o) => o.id === value) || options[0];

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="form-input"
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          cursor: "pointer",
          minWidth: 140,
          fontSize: 13,
          fontWeight: 500,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg3)",
          color: "var(--text)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>{selectedOption?.icon}</span>
          <span>{selectedOption?.label}</span>
        </span>
        <span style={{ fontSize: 10, flexShrink: 0, opacity: 0.5, marginLeft: 8 }}>▼</span>
      </div>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 9998 }}
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                position: "absolute",
                top: coords.top + 4,
                left: coords.left,
                width: Math.max(coords.width, 160),
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                zIndex: 9999,
                maxHeight: 220,
                overflowY: "auto",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              {options.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: value === opt.id ? "var(--bg3)" : "transparent",
                    color: "var(--text)",
                    borderBottom: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = value === opt.id ? "var(--bg3)" : "transparent")}
                >
                  <span style={{ fontSize: 16 }}>{opt.icon}</span>
                  <span>{opt.label}</span>
                </div>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  );
};

export interface NoticeTemplateOption {
  id: string;
  label: string;
  icon: string;
  title: string;
  message: string;
}

export const TemplateDropdown = ({
  onSelect,
  options,
}: {
  onSelect: (val: NoticeTemplateOption) => void;
  options: NoticeTemplateOption[];
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [open]);

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "var(--primary, #3b82f6)",
          color: "#fff",
          boxShadow: "0 2px 4px rgba(59,130,246,0.3)"
        }}
      >
        <span>✨ Templates</span>
      </div>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 9998 }}
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                position: "absolute",
                top: coords.top + 4,
                left: coords.left + coords.width - 260,
                width: 260,
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                zIndex: 9999,
                maxHeight: 300,
                overflowY: "auto",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              }}
            >
              <div style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "var(--text2)", borderBottom: "1px solid var(--border)", background: "var(--bg3)" }}>
                SELECT A TEMPLATE
              </div>
              {options.map((opt) => {
                const iconMatch = NOTICE_ICONS.find(i => i.id === opt.icon);
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onSelect(opt);
                      setOpen(false);
                    }}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      background: "transparent",
                      color: "var(--text)",
                      borderBottom: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 18, marginTop: 2 }}>{iconMatch?.icon || "✨"}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>{opt.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </>
  );
};

// ── Components ────────────────────────────────────────────────────────────────
function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="settings-card"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflowX: "auto",
        boxShadow: "0 4px 12px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.03)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "var(--text2)",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        marginBottom: 12,
        paddingLeft: 4,
      }}
    >
      {label}
    </div>
  );
}

function SettingRow({
  icon,
  color,
  label,
  desc,
  right,
  onClick,
  danger,
}: {
  icon: string;
  color: string;
  label: string;
  desc?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        cursor: onClick ? "pointer" : "default",
        background:
          hov && onClick
            ? danger
              ? "rgba(239,68,68,0.08)"
              : "var(--bg3)"
            : "transparent",
        transition: "all 0.1s ease",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          flexShrink: 0,
          background: `${color}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          boxShadow: `inset 0 0 0 1px ${color}30`,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: danger ? "#ef4444" : "var(--text)",
          }}
        >
          {label}
        </div>
        {desc && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text2)",
              marginTop: 2,
              lineHeight: 1.3,
            }}
          >
            {desc}
          </div>
        )}
      </div>
      {right ??
        (onClick && (
          <span style={{ color: "var(--text2)", fontSize: 16 }}>›</span>
        ))}
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        cursor: "pointer",
        background: value ? "#10b981" : "var(--bg3)",
        border: `1px solid ${value ? "#10b981" : "var(--border)"}`,
        position: "relative",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 1,
          left: value ? 17 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "all 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  maxWidth = 400,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number | string;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 16px 16px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: 12,
          border: "1px solid var(--border)",
          width: "100%",
          maxWidth: maxWidth,
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--card)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg3)",
              border: "none",
              color: "var(--text2)",
              cursor: "pointer",
              width: 24,
              height: 24,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              transition: "all 0.15s",
            }}
            className="hover-brightness"
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main Content ──────────────────────────────────────────────────────────────
const NOTICE_ICONS: NoticeIconOption[] = [
  { id: "alert", icon: "🚨", label: "Alert" },
  { id: "success", icon: "🎉", label: "Success" },
  { id: "important", icon: "⚠️", label: "Important" },
  { id: "info", icon: "ℹ️", label: "Info" },
  { id: "update", icon: "🔄", label: "Update" },
  { id: "star", icon: "⭐", label: "Star" },
  { id: "rocket", icon: "🚀", label: "App Update" },
  { id: "bell", icon: "🔔", label: "Notification" },
  { id: "megaphone", icon: "📣", label: "Announcement" },
  { id: "graduation", icon: "🎓", label: "Academic" },
  { id: "calendar", icon: "📅", label: "Event" },
  { id: "book", icon: "📖", label: "Study" },
];

const MESSAGE_TEMPLATES: NoticeTemplateOption[] = [
  {
    id: "update",
    label: "App Update",
    icon: "rocket",
    title: "New Version Available!",
    message: "A new version of the app is available with new features and improvements. Please update to the latest version to enjoy a better experience."
  },
  {
    id: "success",
    label: "Success & Maintenance",
    icon: "success",
    title: "Task Completed Successfully",
    message: "The scheduled maintenance and data sync have been completed successfully. All systems are operating normally."
  },
  {
    id: "important",
    label: "Important Notice",
    icon: "important",
    title: "Important Notice",
    message: "Please note that the academy will remain closed tomorrow due to unforeseen circumstances. Further details will be shared soon."
  },
  {
    id: "alert",
    label: "Emergency Alert",
    icon: "alert",
    title: "System Alert",
    message: "We are currently experiencing technical difficulties with our servers. Our team is working to resolve this issue as soon as possible."
  },
  {
    id: "event",
    label: "Upcoming Event",
    icon: "calendar",
    title: "Upcoming Event Reminder",
    message: "Don't forget! The annual sports gala is starting next week. Make sure you have registered and prepared for the events."
  },
  {
    id: "study",
    label: "Exam Schedule",
    icon: "book",
    title: "Exam Schedule Released",
    message: "The final term exam schedule has been released and is available in the app. Best of luck with your preparations!"
  }
];

export default function SettingsPage() {
  const { user, profile, logout } = useAuth();
  const dispatch = useAppDispatch();
  const email = user?.email?.toLowerCase() || "";
  const isAdmin = ADMIN_EMAILS.includes(email);

  // Redux — Books & Classes
  const books = useAppSelector((s: any) => s.appSettings.books);
  const booksStatus = useAppSelector((s: any) => s.appSettings.booksStatus);
  const classes = useAppSelector((s: any) => s.appSettings.classes);
  const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);
  const groups = useAppSelector((s: any) => s.appSettings.groups);
  const groupsStatus = useAppSelector((s: any) => s.appSettings.groupsStatus);
  const defaultFees = useAppSelector((s: any) => s.appSettings.defaultFees);
  const defaultFeesStatus = useAppSelector(
    (s: any) => s.appSettings.defaultFeesStatus,
  );
  const libraryCategories = useAppSelector(
    (s: any) => s.appSettings.libraryCategories,
  );
  const libraryCategoriesStatus = useAppSelector(
    (s: any) => s.appSettings.libraryCategoriesStatus,
  );
  const examTitles = useAppSelector((s: any) => s.appSettings.examTitles);
  const examCategories = useAppSelector(
    (s: any) => s.appSettings.examCategories,
  );
  const examSettingsStatus = useAppSelector(
    (s: any) => s.appSettings.examSettingsStatus,
  );
  const updateNotice = useAppSelector((s: any) => s.appSettings.updateNotice);

  // Always fetch fresh data from Firestore on mount
  useEffect(() => {
    dispatch(fetchBooks());
    dispatch(fetchClasses());
    dispatch(fetchGroups());
    dispatch(fetchDefaultFees());
    dispatch(fetchLibraryCategories());
    dispatch(fetchExamSettings());
    dispatch(fetchUpdateNotice());
  }, [dispatch]);

  // Initial state loading synchronously to prevent UI flicker
  const [darkMode, setDarkMode] = useState(
    () => document.documentElement.getAttribute("data-theme") !== "light",
  );
  const [compactLayout, setCompactLayout] = useState(
    () => document.documentElement.getAttribute("data-layout") === "compact",
  );
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifBrowser, setNotifBrowser] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [autoSyncLoading, setAutoSyncLoading] = useState(true);
  const [sysIntUnlocked, setSysIntUnlocked] = useState(false);
  const [sysIntEmail, setSysIntEmail] = useState("");
  const [sysIntPassword, setSysIntPassword] = useState("");
  const [sysIntError, setSysIntError] = useState("");

  useEffect(() => {
    const loadSyncSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "appSettings", "sync"));
        if (docSnap.exists()) {
          setAutoSync(docSnap.data().realTimeSyncEnabled ?? true);
        }
      } catch (err) {
        console.error("Failed to load sync settings", err);
      } finally {
        setAutoSyncLoading(false);
      }
    };
    loadSyncSettings();
  }, []);

  const handleAutoSyncToggle = async (val: boolean) => {
    setAutoSync(val);
    try {
      await setDoc(
        doc(db, "appSettings", "sync"),
        {
          realTimeSyncEnabled: val,
          updatedAt: new Date(),
          updatedBy: user?.email || "unknown",
        },
        { merge: true },
      );
    } catch (err) {
      console.error("Failed to save sync settings", err);
    }
  };
  const handleUnlockSysInt = async () => {
    setSysIntError("");
    if (!sysIntEmail || !sysIntPassword) {
      setSysIntError("Please enter both email and password.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, sysIntEmail, sysIntPassword);
      setSysIntUnlocked(true);
      setModal("proSettings");
      setSysIntPassword("");
    } catch (err: any) {
      console.error("Failed to unlock System Integration:", err);
      setSysIntError("Invalid credentials or authentication failed.");
    }
  };

  const [modal, setModal] = useState<
    | "changePassword"
    | "profile"
    | "privacy"
    | "help"
    | "books"
    | "classes"
    | "groups"
    | "backup"
    | "defaultFees"
    | "upload"
    | "idCard"
    | "firebaseConfig"
    | "unlockSysInt"
    | "proSettings"
    | "libraryCategories"
    | "testNumbers"
    | "examCategories"
    | "homeScreenSettings"
    | "appUpdateNotice"
    | null
  >(null);

  // App Update Notice state
  const [updateNoticeData, setUpdateNoticeData] = useState({
    enabled: false, version: "1.0.0", title: "App Update Notice", message: "", buttonText: "Got it", audience: "All", icon: "alert"
  });
  const [updateNoticeLoading, setUpdateNoticeLoading] = useState(false);

  // Firebase Config UI state
  const [fbConfig, setFbConfig] = useState({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: "",
  });
  const [fbConfigMsg, setFbConfigMsg] = useState("");

  // Local UI state for Books inline editing
  const [newBookName, setNewBookName] = useState("");
  const [editBookIndex, setEditBookIndex] = useState<number | null>(null);
  const [editBookValue, setEditBookValue] = useState("");
  const booksLoading = booksStatus === "idle" || booksStatus === "loading";

  // Local UI state for Classes inline editing
  const [newClassName, setNewClassName] = useState("");
  const [editClassIndex, setEditClassIndex] = useState<number | null>(null);
  const [editClassValue, setEditClassValue] = useState("");
  const classesLoading =
    classesStatus === "idle" || classesStatus === "loading";

  // Local UI state for Groups inline editing
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupBooks, setNewGroupBooks] = useState<string[]>([]);
  const [editGroupIndex, setEditGroupIndex] = useState<number | null>(null);
  const [editGroupValue, setEditGroupValue] = useState("");
  const [editGroupBooks, setEditGroupBooks] = useState<string[]>([]);
  const [newTestNo, setNewTestNo] = useState("");
  const [editTestNoIndex, setEditTestNoIndex] = useState<number | null>(null);
  const [editTestNoValue, setEditTestNoValue] = useState("");

  const [newCategory, setNewCategory] = useState("");
  const [editCategoryIndex, setEditCategoryIndex] = useState<number | null>(
    null,
  );
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const groupsLoading = groupsStatus === "idle" || groupsStatus === "loading";

  // Local UI state for Library Categories inline editing
  const [newLibraryCategoryName, setNewLibraryCategoryName] = useState("");
  const [newLibraryCategoryIcon, setNewLibraryCategoryIcon] =
    useState("folder");
  const [newLibraryCategorySubtitle, setNewLibraryCategorySubtitle] =
    useState("");
  const [editLibraryCategoryIndex, setEditLibraryCategoryIndex] = useState<
    number | null
  >(null);
  const [editLibraryCategoryValue, setEditLibraryCategoryValue] = useState("");
  const [editLibraryCategoryIconValue, setEditLibraryCategoryIconValue] =
    useState("folder");
  const [
    editLibraryCategorySubtitleValue,
    setEditLibraryCategorySubtitleValue,
  ] = useState("");
  const libraryCategoriesLoading =
    libraryCategoriesStatus === "idle" || libraryCategoriesStatus === "loading";

  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const handleDragStart = (index: number) => setDraggedCatIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (index: number) => {
    if (draggedCatIndex === null || draggedCatIndex === index) return;
    const updated = [...libraryCategories];
    const draggedItem = updated[draggedCatIndex];
    updated.splice(draggedCatIndex, 1);
    updated.splice(index, 0, draggedItem);
    dispatch(setLibraryCategories(updated));
    dispatch(persistLibraryCategories(updated));
    setDraggedCatIndex(null);
  };

  const ICON_MAP: Record<string, string> = {
    layers: "📚",
    map: "🗺️",
    bulb: "💡",
    headset: "🎧",
    book: "📖",
    folder: "📁",
    document: "📄",
    videocam: "🎥",
    "document-text": "📝",
    flask: "🧪",
    earth: "🌍",
    language: "🗣️",
    business: "🏢",
    cash: "💵",
    code: "💻",
  };
  const AVAILABLE_ICONS = Object.keys(ICON_MAP);

  // Books handlers
  const handleAddBook = () => {
    if (!newBookName.trim()) return;
    const updated = [...books, newBookName.trim()];
    dispatch(setBooks(updated));
    dispatch(persistBooks(updated));
    setNewBookName("");
  };
  const handleUpdateBook = (index: number) => {
    if (!editBookValue.trim()) return;
    const updated = [...books];
    updated[index] = editBookValue.trim();
    dispatch(setBooks(updated));
    dispatch(persistBooks(updated));
    setEditBookIndex(null);
    setEditBookValue("");
  };
  const handleDeleteBook = (index: number) => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    const updated = books.filter((_: string, i: number) => i !== index);
    dispatch(setBooks(updated));
    dispatch(persistBooks(updated));
  };

  // Classes handlers

  const handleAddTestNo = () => {
    const val = newTestNo.trim();
    if (!val) return;
    if (examTitles.some((t: string) => t.toLowerCase() === val.toLowerCase()))
      return alert("Test Number already exists");
    dispatch(
      persistExamSettings({
        categories: examCategories,
        titles: [...examTitles, val],
      }),
    );
    setNewTestNo("");
  };

  const handleUpdateTestNo = (idx: number) => {
    const val = editTestNoValue.trim();
    if (!val) {
      setEditTestNoIndex(null);
      return;
    }
    if (
      examTitles.some(
        (t: string, i: number) =>
          i !== idx && t.toLowerCase() === val.toLowerCase(),
      )
    )
      return alert("Test Number already exists");
    const updated = [...examTitles];
    updated[idx] = val;
    dispatch(
      persistExamSettings({ categories: examCategories, titles: updated }),
    );
    setEditTestNoIndex(null);
  };

  const handleDeleteTestNo = (idx: number) => {
    if (!confirm("Delete this test number?")) return;
    const updated = examTitles.filter((_: any, i: number) => i !== idx);
    dispatch(
      persistExamSettings({ categories: examCategories, titles: updated }),
    );
  };

  const handleAddCategory = () => {
    const val = newCategory.trim();
    if (!val) return;
    if (
      examCategories.some((c: string) => c.toLowerCase() === val.toLowerCase())
    )
      return alert("Category already exists");
    dispatch(
      persistExamSettings({
        categories: [...examCategories, val],
        titles: examTitles,
      }),
    );
    setNewCategory("");
  };

  const handleUpdateCategory = (idx: number) => {
    const val = editCategoryValue.trim();
    if (!val) {
      setEditCategoryIndex(null);
      return;
    }
    if (
      examCategories.some(
        (c: string, i: number) =>
          i !== idx && c.toLowerCase() === val.toLowerCase(),
      )
    )
      return alert("Category already exists");
    const updated = [...examCategories];
    updated[idx] = val;
    dispatch(persistExamSettings({ categories: updated, titles: examTitles }));
    setEditCategoryIndex(null);
  };

  const handleDeleteCategory = (idx: number) => {
    if (!confirm("Delete this category?")) return;
    const updated = examCategories.filter((_: any, i: number) => i !== idx);
    dispatch(persistExamSettings({ categories: updated, titles: examTitles }));
  };

  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    const updated = [...classes, newClassName.trim()];
    dispatch(setClasses(updated));
    dispatch(persistClasses(updated));
    setNewClassName("");
  };
  const handleUpdateClass = async (index: number) => {
    if (!editClassValue.trim()) return;
    const oldClassName = classes[index];
    const newClassName = editClassValue.trim();

    const updated = [...classes];
    updated[index] = newClassName;
    dispatch(setClasses(updated));
    dispatch(persistClasses(updated));
    setEditClassIndex(null);
    setEditClassValue("");

    if (oldClassName && oldClassName !== newClassName) {
      try {
        const studentsProfileRef = collection(db, "studentsprofile");
        const qProfile = query(
          studentsProfileRef,
          where("class", "==", oldClassName),
        );
        const snapProfile = await getDocs(qProfile);

        const studentsRef = collection(db, "students");
        const qStudents = query(
          studentsRef,
          where("grade", "==", oldClassName),
        );
        const snapStudents = await getDocs(qStudents);

        if (!snapProfile.empty || !snapStudents.empty) {
          const batch = writeBatch(db);
          snapProfile.docs.forEach((d) => {
            batch.update(d.ref, { class: newClassName });
          });
          snapStudents.docs.forEach((d) => {
            batch.update(d.ref, { grade: newClassName, class: newClassName });
          });
          await batch.commit();
        }

        dispatch(resetStudentsStatus());
        dispatch(fetchStudents() as any);
      } catch (err) {
        console.error("Failed to migrate students for renamed class:", err);
      }
    }
  };
  const handleDeleteClass = (index: number) => {
    if (!confirm("Delete this class?")) return;
    const updated = classes.filter((_: string, i: number) => i !== index);
    dispatch(setClasses(updated));
    dispatch(persistClasses(updated));
  };

  // Groups handlers
  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const updated = [
      ...groups,
      { name: newGroupName.trim(), books: newGroupBooks },
    ];
    dispatch(setGroups(updated));
    dispatch(persistGroups(updated));
    setNewGroupName("");
    setNewGroupBooks([]);
  };
  const handleUpdateGroup = async (index: number) => {
    if (!editGroupValue.trim()) return;
    const oldGroupName = groups[index]?.name || groups[index];
    const newGroupName = editGroupValue.trim();

    const updated = [...groups];
    updated[index] = { name: newGroupName, books: editGroupBooks };
    dispatch(setGroups(updated));
    dispatch(persistGroups(updated));
    setEditGroupIndex(null);
    setEditGroupValue("");
    setEditGroupBooks([]);

    if (typeof oldGroupName === "string" && oldGroupName !== newGroupName) {
      try {
        const studentsProfileRef = collection(db, "studentsprofile");
        const qProfile = query(
          studentsProfileRef,
          where("section", "==", oldGroupName),
        );
        const snapProfile = await getDocs(qProfile);

        const studentsRef = collection(db, "students");
        const qStudents = query(
          studentsRef,
          where("section", "==", oldGroupName),
        );
        const snapStudents = await getDocs(qStudents);

        if (!snapProfile.empty || !snapStudents.empty) {
          const batch = writeBatch(db);
          snapProfile.docs.forEach((d) => {
            batch.update(d.ref, { section: newGroupName });
          });
          snapStudents.docs.forEach((d) => {
            batch.update(d.ref, { section: newGroupName });
          });
          await batch.commit();
        }

        dispatch(resetStudentsStatus());
        dispatch(fetchStudents() as any);
      } catch (err) {
        console.error(
          "Failed to migrate students for renamed group/section:",
          err,
        );
      }
    }
  };
  const handleDeleteGroup = (index: number) => {
    if (!confirm("Delete this group?")) return;
    const updated = groups.filter((_: any, i: number) => i !== index);
    dispatch(setGroups(updated));
    dispatch(persistGroups(updated));
  };

  // Library Categories handlers
  const handleAddLibraryCategory = () => {
    if (!newLibraryCategoryName.trim()) return;
    const newCategory = {
      name: newLibraryCategoryName.trim(),
      icon: newLibraryCategoryIcon,
      subtitle: newLibraryCategorySubtitle.trim(),
    };
    const updated = [...libraryCategories, newCategory];
    dispatch(setLibraryCategories(updated));
    dispatch(persistLibraryCategories(updated));
    setNewLibraryCategoryName("");
    setNewLibraryCategoryIcon("folder");
    setNewLibraryCategorySubtitle("");
  };
  const handleUpdateLibraryCategory = async (index: number) => {
    if (!editLibraryCategoryValue.trim()) return;
    const oldCategoryName =
      libraryCategories[index]?.name || libraryCategories[index];
    const newCategoryName = editLibraryCategoryValue.trim();
    const newCategoryIcon = editLibraryCategoryIconValue;
    const newCategorySubtitle = editLibraryCategorySubtitleValue.trim();

    const updated = [...libraryCategories];
    updated[index] = {
      name: newCategoryName,
      icon: newCategoryIcon,
      subtitle: newCategorySubtitle,
    };
    dispatch(setLibraryCategories(updated));
    dispatch(persistLibraryCategories(updated));
    setEditLibraryCategoryIndex(null);
    setEditLibraryCategoryValue("");
    setEditLibraryCategoryIconValue("folder");
    setEditLibraryCategorySubtitleValue("");

    if (oldCategoryName !== newCategoryName) {
      try {
        const noticesRef = collection(db, "notices");
        const q = query(noticesRef, where("category", "==", oldCategoryName));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach((d) => {
            batch.update(d.ref, { category: newCategoryName });
          });
          await batch.commit();
        }
      } catch (err) {
        console.error("Failed to migrate notices for renamed category:", err);
      }
    }
  };
  const handleDeleteLibraryCategory = (index: number) => {
    if (!confirm("Delete this category?")) return;
    const updated = libraryCategories.filter(
      (_: any, i: number) => i !== index,
    );
    dispatch(setLibraryCategories(updated));
    dispatch(persistLibraryCategories(updated));
  };
  const handleMoveLibraryCategory = (
    index: number,
    direction: "up" | "down",
  ) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === libraryCategories.length - 1) return;
    const updated = [...libraryCategories];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    dispatch(setLibraryCategories(updated));
    dispatch(persistLibraryCategories(updated));
  };

  // Default Fees handlers
  const [localDefaultFees, setLocalDefaultFees] = useState<
    Record<string, number>
  >({});
  useEffect(() => {
    if (modal === "defaultFees") {
      setLocalDefaultFees(defaultFees || {});
    }
  }, [modal, defaultFees]);

  const handleSaveDefaultFees = async () => {
    dispatch(persistDefaultFees(localDefaultFees));
    setModal(null);
  };

  // Backup logic
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    students: true,
    ledger: true,
    teachers: true,
    attendance: true,
    timetable: true,
    videoGalleries: true,
    assignments: true,
    exams: true,
  });

  const handleExportBackup = async () => {
    setBackupLoading(true);
    try {
      const collectionsToBackup = Object.keys(backupOptions).filter(
        (k) => backupOptions[k as keyof typeof backupOptions],
      );
      const workbook = XLSX.utils.book_new();

      for (const colName of collectionsToBackup) {
        const snap = await getDocs(collection(db, colName));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Flatten nested objects/arrays for Excel rows
        let flatData: any[] = [];

        if (data.length === 0) {
          flatData = [{ Status: "No data found for this collection." }];
        } else {
          flatData = data.map((item: Record<string, any>) => {
            const flat: any = {};
            for (const key in item) {
              const val = item[key];
              if (val && typeof val === "object") {
                // Handle Firestore Timestamp
                if (val.toDate && typeof val.toDate === "function") {
                  flat[key] = val.toDate().toLocaleString();
                }
                // Handle Serialized Timestamp
                else if (
                  val.seconds !== undefined &&
                  val.nanoseconds !== undefined
                ) {
                  flat[key] = new Date(val.seconds * 1000).toLocaleString();
                }
                // Handle Arrays
                else if (Array.isArray(val)) {
                  if (val.every((v) => typeof v !== "object")) {
                    flat[key] = val.join(", ");
                  } else {
                    flat[key] = JSON.stringify(val);
                  }
                }
                // Handle Generic Objects
                else {
                  flat[key] = JSON.stringify(val);
                }
              } else {
                flat[key] = val;
              }
            }
            return flat;
          });
        }

        const worksheet = XLSX.utils.json_to_sheet(flatData);
        XLSX.utils.book_append_sheet(workbook, worksheet, colName);
      }

      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `TheSeeksAcademy_Backup_${dateStr}.xlsx`);

      setModal(null);
    } catch (err) {
      console.error("Backup failed", err);
      alert("Failed to export backup. Check console for details.");
    } finally {
      setBackupLoading(false);
    }
  };

  // Group messaging settings
  const [studentMessaging, setStudentMessaging] = useState(false);
  const [dailyMessageLimit, setDailyMessageLimit] = useState(10);
  const [messagingLoading, setMessagingLoading] = useState(true);
  const [messagingSaveMsg, setMessagingSaveMsg] = useState("");

  // Load messaging settings from Firestore
  useEffect(() => {
    const loadMessagingSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "appSettings", "messaging"));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setStudentMessaging(data.studentMessagingEnabled ?? false);
          setDailyMessageLimit(data.dailyMessageLimit ?? 10);
        }
      } catch (err) {
        console.error("Failed to load messaging settings:", err);
      } finally {
        setMessagingLoading(false);
      }
    };
    loadMessagingSettings();
  }, []);

  // Save messaging settings to Firestore
  const saveMessagingSettings = async (enabled: boolean, limit: number) => {
    try {
      await setDoc(
        doc(db, "appSettings", "messaging"),
        {
          studentMessagingEnabled: enabled,
          dailyMessageLimit: limit,
          updatedAt: new Date(),
          updatedBy: user?.email || "unknown",
        },
        { merge: true },
      );
      setMessagingSaveMsg("✅ Saved");
      setTimeout(() => setMessagingSaveMsg(""), 2000);
    } catch (err) {
      console.error("Failed to save messaging settings:", err);
      setMessagingSaveMsg("❌ Failed");
      setTimeout(() => setMessagingSaveMsg(""), 3000);
    }
  };

  const handleStudentMessagingToggle = (val: boolean) => {
    setStudentMessaging(val);
    saveMessagingSettings(val, dailyMessageLimit);
  };

  const handleDailyLimitChange = (val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= 999) {
      setDailyMessageLimit(num);
    } else if (val === "") {
      setDailyMessageLimit(0);
    }
  };

  const handleDailyLimitSave = () => {
    saveMessagingSettings(studentMessaging, dailyMessageLimit);
  };

  // Home Screen Settings
  const [homeScreenConfig, setHomeScreenConfig] = useState({
    topperSliderEnabled: true,
    customSliderEnabled: true,
    customSlides: [] as any[],
    topperExamTitle: "",
    topperExamCategory: "",
    customSliderDirection: "right-to-left",
  });
  const [homeScreenLoading, setHomeScreenLoading] = useState(true);
  const [homeScreenSaveMsg, setHomeScreenSaveMsg] = useState("");
  const [newCustomSlideUrl, setNewCustomSlideUrl] = useState("");
  const [newCustomSlideLink, setNewCustomSlideLink] = useState("");
  const [newCustomSlideTemplate, setNewCustomSlideTemplate] =
    useState("image_only");
  const [newCustomSlideText, setNewCustomSlideText] = useState("");
  const [newCustomSlideBgColor, setNewCustomSlideBgColor] = useState("#3b82f6");
  const [newCustomSlideTextColor, setNewCustomSlideTextColor] =
    useState("#ffffff");
  const [editingCustomSlideId, setEditingCustomSlideId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadHomeScreenSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "appSettings", "homeScreen"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setHomeScreenConfig({
            topperSliderEnabled: data.topperSliderEnabled ?? true,
            customSliderEnabled: data.customSliderEnabled ?? true,
            customSlides: data.customSlides || [],
            topperExamTitle: data.topperExamTitle || "",
            topperExamCategory: data.topperExamCategory || "",
            customSliderDirection:
              data.customSliderDirection || "right-to-left",
          });
        }
      } catch (err) {
        console.error("Failed to load home screen settings:", err);
      } finally {
        setHomeScreenLoading(false);
      }
    };
    loadHomeScreenSettings();
  }, []);

  const saveHomeScreenSettings = async (newConfig: any) => {
    try {
      await setDoc(
        doc(db, "appSettings", "homeScreen"),
        {
          ...newConfig,
          updatedAt: new Date(),
          updatedBy: user?.email || "unknown",
        },
        { merge: true },
      );
      setHomeScreenSaveMsg("✅ Saved");
      setTimeout(() => setHomeScreenSaveMsg(""), 2000);
    } catch (err) {
      console.error("Failed to save home screen settings:", err);
      setHomeScreenSaveMsg("❌ Failed");
      setTimeout(() => setHomeScreenSaveMsg(""), 3000);
    }
  };

  const handleTopperSliderToggle = (val: boolean) => {
    const newConfig = { ...homeScreenConfig, topperSliderEnabled: val };
    setHomeScreenConfig(newConfig);
    saveHomeScreenSettings(newConfig);
  };

  const handleCustomSliderToggle = (val: boolean) => {
    const newConfig = { ...homeScreenConfig, customSliderEnabled: val };
    setHomeScreenConfig(newConfig);
    saveHomeScreenSettings(newConfig);
  };

  const handleCustomSliderDirectionToggle = (val: boolean) => {
    const direction = val ? "left-to-right" : "right-to-left";
    const newConfig = { ...homeScreenConfig, customSliderDirection: direction };
    setHomeScreenConfig(newConfig);
    saveHomeScreenSettings(newConfig);
  };

  const handleSaveCustomSlide = () => {
    if (!newCustomSlideText.trim()) return;

    const slideData = {
      id: editingCustomSlideId || "slide_" + Date.now(),
      template: newCustomSlideTemplate,
      imageUrl: newCustomSlideUrl.trim(),
      link: newCustomSlideLink.trim(),
      text: newCustomSlideText.trim(),
      backgroundColor: newCustomSlideBgColor,
      textColor: newCustomSlideTextColor,
    };

    let newCustomSlides = [...homeScreenConfig.customSlides];
    if (editingCustomSlideId) {
      newCustomSlides = newCustomSlides.map((slide) =>
        slide.id === editingCustomSlideId ? slideData : slide,
      );
    } else {
      newCustomSlides.push(slideData);
    }

    const newConfig = {
      ...homeScreenConfig,
      customSlides: newCustomSlides,
    };
    setHomeScreenConfig(newConfig);
    saveHomeScreenSettings(newConfig);

    // Reset fields
    handleCancelEditCustomSlide();
  };

  const handleEditCustomSlide = (slide: any) => {
    setEditingCustomSlideId(slide.id);
    setNewCustomSlideTemplate(slide.template || "image_only");
    setNewCustomSlideUrl(slide.imageUrl || "");
    setNewCustomSlideLink(slide.link || "");
    setNewCustomSlideText(slide.text || "");
    setNewCustomSlideBgColor(slide.backgroundColor || "#3b82f6");
    setNewCustomSlideTextColor(slide.textColor || "#ffffff");
  };

  const handleCancelEditCustomSlide = () => {
    setEditingCustomSlideId(null);
    setNewCustomSlideUrl("");
    setNewCustomSlideLink("");
    setNewCustomSlideText("");
    setNewCustomSlideTemplate("image_only");
    setNewCustomSlideBgColor("#3b82f6");
    setNewCustomSlideTextColor("#ffffff");
  };

  const handleDeleteCustomSlide = (slideId: string) => {
    if (!confirm("Are you sure you want to delete this custom slide?")) return;
    const newConfig = {
      ...homeScreenConfig,
      customSlides: homeScreenConfig.customSlides.filter(
        (s: any) => s.id !== slideId,
      ),
    };
    setHomeScreenConfig(newConfig);
    saveHomeScreenSettings(newConfig);
  };

  const handleToggleHideCustomSlide = (slideId: string) => {
    const newConfig = {
      ...homeScreenConfig,
      customSlides: homeScreenConfig.customSlides.map((s: any) => 
        s.id === slideId ? { ...s, hidden: !s.hidden } : s
      ),
    };
    setHomeScreenConfig(newConfig);
    saveHomeScreenSettings(newConfig);
  };

  useEffect(() => {
    setDarkMode(
      document.documentElement.getAttribute("data-theme") !== "light",
    );
    setCompactLayout(
      document.documentElement.getAttribute("data-layout") === "compact",
    );
  }, []);

  // Change password form
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState("");

  // Profile edit form
  const [profileName, setProfileName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  useEffect(() => {
    if (modal === "profile") {
      setProfileName(profile?.fullname || user?.displayName || "");
      setProfileMsg("");
    }
  }, [modal, profile, user]);

  // Reset email
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  // Handlers
  const handleDarkMode = (val: boolean) => {
    setDarkMode(val);
    document.documentElement.setAttribute("data-theme", val ? "dark" : "light");
    localStorage.setItem("theme", val ? "dark" : "light");
  };

  const handleCompactLayout = (val: boolean) => {
    setCompactLayout(val);
    if (val) {
      document.documentElement.setAttribute("data-layout", "compact");
      localStorage.setItem("layout", "compact");
    } else {
      document.documentElement.removeAttribute("data-layout");
      localStorage.setItem("layout", "default");
    }
  };

  const handleChangePassword = async () => {
    setCpError("");
    setCpSuccess("");
    if (!cpNew || !cpConfirm || !cpCurrent) {
      setCpError("All fields are required.");
      return;
    }
    if (cpNew.length < 6) {
      setCpError("Password must be at least 6 characters.");
      return;
    }
    if (cpNew !== cpConfirm) {
      setCpError("Passwords do not match.");
      return;
    }
    setCpLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user!.email!, cpCurrent);
      await reauthenticateWithCredential(user!, credential);
      await updatePassword(user!, cpNew);
      setCpSuccess("Password updated successfully! ✅");
      setCpCurrent("");
      setCpNew("");
      setCpConfirm("");
      setTimeout(() => setModal(null), 1500);
    } catch (err: any) {
      const map: Record<string, string> = {
        "auth/wrong-password": "Current password is incorrect.",
        "auth/invalid-credential": "Current password is incorrect.",
        "auth/requires-recent-login":
          "Please sign out and sign in again to change your password.",
        "auth/weak-password": "New password is too weak.",
      };
      setCpError(map[err.code] || err.message || "Failed to update password.");
    } finally {
      setCpLoading(false);
    }
  };

  const handleSendReset = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    setResetMsg("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetMsg(`✅ Reset link sent to ${user.email}`);
    } catch {
      setResetMsg("❌ Failed to send reset email.");
    } finally {
      setTimeout(() => setResetMsg(""), 4000);
      setResetLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.email || !profileName.trim()) return;
    setProfileLoading(true);
    setProfileMsg("");
    try {
      // Update auth profile
      await updateProfile(user, { displayName: profileName.trim() });

      // Update firestore profile collection
      const q = query(
        collection(db, "profile"),
        where("email", "==", user.email),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "profile", snap.docs[0].id), {
          fullname: profileName.trim(),
        });
      } else {
        // If it doesn't exist, create it (edge case)
        await setDoc(doc(db, "profile", user.uid), {
          email: user.email,
          fullname: profileName.trim(),
          role: "admin",
          createdAt: new Date(),
        });
      }
      setProfileMsg("✅ Profile updated successfully!");
      setTimeout(() => {
        setModal(null);
        window.location.reload(); // Refresh to update context
      }, 1000);
    } catch (err) {
      console.error(err);
      setProfileMsg("❌ Failed to save profile updates.");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (modal === "firebaseConfig") {
      setFbConfigMsg("");
      try {
        const stored = localStorage.getItem("custom_firebase_config");
        if (stored) {
          const parsed = JSON.parse(stored);
          const parsedWithoutMeasurement = { ...parsed };
          delete parsedWithoutMeasurement.measurementId;
          setFbConfig({
            ...parsedWithoutMeasurement,
            measurementId: parsed.measurementId || "",
          });
        } else {
          import("../../firebase").then((m) => {
            const mConf = { ...m.firebaseConfig };
            const measId = mConf.measurementId || "";
            delete mConf.measurementId;
            setFbConfig({ ...mConf, measurementId: measId });
          });
        }
      } catch {
        // Ignore parsing error
      }
    }
  }, [modal]);

  const handleSaveFbConfig = async () => {
    if (!fbConfig.apiKey || !fbConfig.projectId) {
      setFbConfigMsg("❌ API Key and Project ID are required.");
      return;
    }

    setFbConfigMsg("⏳ Initializing Modules...");

    try {
      // Initialize secondary app
      const tempApp = initializeApp(fbConfig, "TempApp_" + Date.now());
      const tempDb = getFirestore(tempApp);

      const initOperations = async () => {
        await setDoc(
          doc(tempDb, "appSettings", "sync"),
          {
            realTimeSyncEnabled: true,
            updatedAt: new Date(),
          },
          { merge: true },
        );

        await setDoc(
          doc(tempDb, "appSettings", "messaging"),
          {
            dailyLimit: 0,
            updatedAt: new Date(),
          },
          { merge: true },
        );
      };

      // Firebase writes can hang indefinitely if rules block them or db doesn't exist yet
      // We use a 3 second timeout so the user isn't stuck.
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 3000),
      );

      try {
        await Promise.race([initOperations(), timeoutPromise]);
      } catch (initErr) {
        console.warn(
          "Initialization timed out or was blocked by rules, proceeding anyway.",
          initErr,
        );
      }

      localStorage.setItem("custom_firebase_config", JSON.stringify(fbConfig));
      setFbConfigMsg("✅ Configuration saved! Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error("Initialization failed:", err);
      // Fallback: still save config even if initialization completely crashed
      localStorage.setItem("custom_firebase_config", JSON.stringify(fbConfig));
      setFbConfigMsg("✅ Saved with warnings. Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const handleResetFbConfig = () => {
    localStorage.removeItem("custom_firebase_config");
    setFbConfigMsg("✅ Configuration reset. Reloading...");
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleDownloadBackup = () => {
    const content = `=========================================
      FIREBASE CONFIGURATION BACKUP      
=========================================
Date: ${new Date().toLocaleString()}

API Key:
${fbConfig.apiKey || "Not provided"}

Auth Domain:
${fbConfig.authDomain || "Not provided"}

Project ID:
${fbConfig.projectId || "Not provided"}

Storage Bucket:
${fbConfig.storageBucket || "Not provided"}

Messaging Sender ID:
${fbConfig.messagingSenderId || "Not provided"}

App ID:
${fbConfig.appId || "Not provided"}

Measurement ID:
${fbConfig.measurementId || "Not provided"}

=========================================
Keep this file secure. Do not share it.
=========================================

-----------------------------------------
Developer & Support Information
-----------------------------------------
If you encounter any issues or need further
customizations, please contact the developer:

Name:       Iftikhar Zahid
Role:       Full Stack Developer
Portfolio:  https://iftikharzahid.github.io
GitHub:     https://github.com/iftikharzahid
LinkedIn:   https://linkedin.com/in/iftikharzahid
WhatsApp:   https://wa.link/330h0s
-----------------------------------------`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `firebase-config-backup-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isPageLoading =
    booksStatus === "idle" ||
    booksStatus === "loading" ||
    classesStatus === "idle" ||
    classesStatus === "loading" ||
    groupsStatus === "idle" ||
    groupsStatus === "loading" ||
    defaultFeesStatus === "idle" ||
    defaultFeesStatus === "loading" ||
    messagingLoading ||
    autoSyncLoading ||
    homeScreenLoading;

  if (isPageLoading) {
    return (
      <div
        className="page"
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
        }}
      >
        <div
          className="loading"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            className="spinner"
            style={{
              width: 40,
              height: 40,
              borderWidth: 3,
              borderColor: "var(--border)",
              borderTopColor: "var(--primary)",
            }}
          />
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text2)",
              letterSpacing: 0.5,
            }}
          >
            Loading Settings...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page"
      style={{
        padding: 0,
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.3s ease-out forwards",
      }}
    >
      {/* Header */}
      <div
        className="page-header settings-header"
        style={{
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
          background: "var(--card)",
          zIndex: 10,
        }}
      >
        <div>
          <div className="page-title" style={{ fontSize: 20, marginBottom: 4 }}>
            ⚙️ Settings
          </div>
          <div className="page-sub" style={{ fontSize: 12 }}>
            Manage your account, appearance, and system preferences
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              if (!sysIntUnlocked) setModal("unlockSysInt");
              else setModal("proSettings");
            }}
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "8px 16px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
              textTransform: "uppercase",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "translateY(-1px)")
            }
            onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
          >
            <span style={{ fontSize: 16 }}>💎</span>{" "}
            {sysIntUnlocked ? "Pro Settings" : "Get Pro"}
          </button>
        )}
      </div>

      <div className="settings-scroll-container">
        <div
          className="responsive-grid-2 settings-grid"
          style={{ maxWidth: 1400, margin: "0 auto" }}
        >
          {/* ── LEFT COLUMN ─────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Account Module */}
            <section>
              <SectionLabel label="Account & Security" />
              <Card>
                {/* Profile Header */}
                <div
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderBottom: "1px solid var(--border)",
                    background:
                      "linear-gradient(to right, rgba(99,102,241,0.05), transparent)",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 11,
                      flexShrink: 0,
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#fff",
                      boxShadow: "0 4px 10px rgba(99,102,241,0.2)",
                    }}
                  >
                    {(
                      profile?.fullname ||
                      user?.displayName ||
                      user?.email ||
                      "A"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      {profile?.fullname || user?.displayName || "Admin User"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text2)",
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {user?.email}
                      {user?.emailVerified && (
                        <span
                          style={{ color: "#10b981", fontSize: 11 }}
                          title="Verified"
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <div style={{ marginTop: 5 }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            background: "rgba(99,102,241,0.15)",
                            color: "#818cf8",
                            padding: "2px 8px",
                            borderRadius: 20,
                            border: "1px solid rgba(99,102,241,0.3)",
                            letterSpacing: 0.5,
                          }}
                        >
                          ✦ SUPER ADMIN
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <SettingRow
                  icon="✏️"
                  color="#3b82f6"
                  label="Edit Profile Information"
                  desc="Update your display name and details"
                  onClick={() => setModal("profile")}
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="🔑"
                  color="#8b5cf6"
                  label="Update Password"
                  desc="Change your login credentials securely"
                  onClick={() => {
                    setCpError("");
                    setCpSuccess("");
                    setCpCurrent("");
                    setCpNew("");
                    setCpConfirm("");
                    setModal("changePassword");
                  }}
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="📧"
                  color="#6366f1"
                  label="Send Password Reset"
                  desc={`Reset link will be sent via email`}
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      {resetMsg && (
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: resetMsg.startsWith("✅")
                              ? "#10b981"
                              : "#ef4444",
                          }}
                        >
                          {resetMsg}
                        </div>
                      )}
                      <button
                        className="btn btn-secondary"
                        style={{
                          fontSize: 12,
                          padding: "6px 14px",
                          borderRadius: 8,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendReset();
                        }}
                        disabled={resetLoading}
                      >
                        {resetLoading ? "Sending..." : "Send Link"}
                      </button>
                    </div>
                  }
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="🚪"
                  color="#ef4444"
                  label="Sign Out"
                  desc="End your current admin session"
                  danger
                  onClick={logout}
                />
              </Card>
            </section>

            {/* Academy Data Module */}
            <section>
              <SectionLabel label="Academy Configuration" />
              <Card>
                <SettingRow
                  icon="🎫"
                  color="#6366f1"
                  label="Manage Classes"
                  desc="Add, update, or remove classes for student assignment"
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {classesStatus === "loading" ? (
                        <span style={{ fontSize: 10, color: "var(--text2)" }}>
                          Loading...
                        </span>
                      ) : classes.length > 0 ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: "rgba(99,102,241,0.12)",
                            color: "#818cf8",
                            padding: "2px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {classes.length}
                        </span>
                      ) : null}
                      <span style={{ color: "var(--text2)", fontSize: 16 }}>
                        ›
                      </span>
                    </div>
                  }
                  onClick={() => setModal("classes")}
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="👥"
                  color="#f59e0b"
                  label="Manage Groups / Sections"
                  desc="Add, update, or remove student groups (e.g. F.Sc Medical)"
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {groupsStatus === "loading" ? (
                        <span style={{ fontSize: 10, color: "var(--text2)" }}>
                          Loading...
                        </span>
                      ) : groups.length > 0 ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: "rgba(245,158,11,0.12)",
                            color: "#d97706",
                            padding: "2px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {groups.length}
                        </span>
                      ) : null}
                      <span style={{ color: "var(--text2)", fontSize: 16 }}>
                        ›
                      </span>
                    </div>
                  }
                  onClick={() => setModal("groups")}
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="📝"
                  color="#ec4899"
                  label="Manage Test Numbers"
                  desc="Add, update, or remove test numbers (e.g. T1, T2)"
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {examSettingsStatus === "loading" ? (
                        <span style={{ fontSize: 10, color: "var(--text2)" }}>
                          Loading...
                        </span>
                      ) : examTitles.length > 0 ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: "rgba(236,72,153,0.12)",
                            color: "#ec4899",
                            padding: "2px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {examTitles.length}
                        </span>
                      ) : null}
                      <span style={{ color: "var(--text2)", fontSize: 16 }}>
                        ›
                      </span>
                    </div>
                  }
                  onClick={() => setModal("testNumbers")}
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />

                <SettingRow
                  icon="📋"
                  color="#14b8a6"
                  label="Manage Exam Types"
                  desc="Add, update, or remove exam types (e.g. Weekly, Monthly)"
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {examSettingsStatus === "loading" ? (
                        <span style={{ fontSize: 10, color: "var(--text2)" }}>
                          Loading...
                        </span>
                      ) : examCategories.length > 0 ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: "rgba(20,184,166,0.12)",
                            color: "#14b8a6",
                            padding: "2px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {examCategories.length}
                        </span>
                      ) : null}
                      <span style={{ color: "var(--text2)", fontSize: 16 }}>
                        ›
                      </span>
                    </div>
                  }
                  onClick={() => setModal("examCategories")}
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />

                <SettingRow
                  icon="📚"
                  color="#ec4899"
                  label="Manage Books / Subjects"
                  desc="Add, update, or remove exam subjects"
                  onClick={() => setModal("books")}
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="📂"
                  color="#0ea5e9"
                  label="Manage e-Library Sections"
                  desc="Add, update, or remove e-Library categories"
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {libraryCategoriesStatus === "loading" ? (
                        <span style={{ fontSize: 10, color: "var(--text2)" }}>
                          Loading...
                        </span>
                      ) : libraryCategories.length > 0 ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: "rgba(14,165,233,0.12)",
                            color: "#38bdf8",
                            padding: "2px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {libraryCategories.length}
                        </span>
                      ) : null}
                      <span style={{ color: "var(--text2)", fontSize: 16 }}>
                        ›
                      </span>
                    </div>
                  }
                  onClick={() => setModal("libraryCategories")}
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="💰"
                  color="#10b981"
                  label="Manage Default Fees"
                  desc="Set default monthly fees for each class"
                  onClick={() => setModal("defaultFees")}
                />
              </Card>
            </section>

            {/* Data Management */}
            <section>
              <SectionLabel label="Data Management" />
              <Card>
                <SettingRow
                  icon="💾"
                  color="#3b82f6"
                  label="Backup Database"
                  desc="Download records as a secure Excel file"
                  onClick={() => setModal("backup")}
                />

                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="🪪"
                  color="#10b981"
                  label="Generate ID Cards"
                  desc="Create professional ID cards for Students and Staff"
                  onClick={() => setModal("idCard")}
                />
              </Card>
            </section>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* App Preferences */}
            <section>
              <SectionLabel label="App Layout & Customization" />
              <Card>
                <SettingRow
                  icon="📱"
                  color="#10b981"
                  label="Show Topper Slider"
                  desc="Display top performers on the student home screen"
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Toggle
                        value={homeScreenConfig.topperSliderEnabled}
                        onChange={handleTopperSliderToggle}
                      />
                    </div>
                  }
                />
                {homeScreenConfig.topperSliderEnabled && (
                  <>
                    <div
                      style={{
                        height: 1,
                        background: "var(--border)",
                        margin: "0 16px",
                      }}
                    />
                    <div
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          flexShrink: 0,
                          background: "rgba(16,185,129,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          boxShadow: "inset 0 0 0 1px rgba(16,185,129,0.2)",
                        }}
                      >
                        🏆
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          Select Toppers Exam
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text2)",
                            marginTop: 2,
                            lineHeight: 1.3,
                          }}
                        >
                          Choose which exam's toppers to display (Optional)
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <CustomDropdown
                          value={homeScreenConfig.topperExamTitle || ""}
                          onChange={(val) => {
                            const newConfig = {
                              ...homeScreenConfig,
                              topperExamTitle: val,
                            };
                            setHomeScreenConfig(newConfig);
                            saveHomeScreenSettings(newConfig);
                          }}
                          options={examTitles}
                          placeholder="Any Test Number"
                        />
                        <CustomDropdown
                          value={homeScreenConfig.topperExamCategory || ""}
                          onChange={(val) => {
                            const newConfig = {
                              ...homeScreenConfig,
                              topperExamCategory: val,
                            };
                            setHomeScreenConfig(newConfig);
                            saveHomeScreenSettings(newConfig);
                          }}
                          options={examCategories}
                          placeholder="Any Exam Type"
                        />
                      </div>
                    </div>
                  </>
                )}
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="🖼️"
                  color="#3b82f6"
                  label="Show Custom Slider"
                  desc="Display promotional slides and banners on the student home screen"
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Toggle
                        value={homeScreenConfig.customSliderEnabled}
                        onChange={handleCustomSliderToggle}
                      />
                    </div>
                  }
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="↔️"
                  color="#ec4899"
                  label="Urdu Marquee Mode"
                  desc="When enabled, slides will move left-to-right for Urdu content. When disabled, they move right-to-left for English."
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Toggle
                        value={
                          homeScreenConfig.customSliderDirection ===
                          "left-to-right"
                        }
                        onChange={handleCustomSliderDirectionToggle}
                      />
                    </div>
                  }
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="🛠️"
                  color="#8b5cf6"
                  label="Manage Custom Slides"
                  desc="Add, edit, or remove image slides for the home screen"
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {homeScreenConfig.customSlides.length > 0 ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: "rgba(59,130,246,0.12)",
                            color: "#3b82f6",
                            padding: "2px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {homeScreenConfig.customSlides.length}
                        </span>
                      ) : null}
                      <span style={{ color: "var(--text2)", fontSize: 16 }}>
                        ›
                      </span>
                    </div>
                  }
                  onClick={() => setModal("homeScreenSettings")}
                />
              </Card>
            </section>

            {/* Group Messaging Controls & Notifications */}
            <section>
              <SectionLabel label="Communications & Notifications" />
              <Card>
                <SettingRow
                  icon="🚀"
                  color="#1E3A8A"
                  label="App Update Notice"
                  desc="Manage the popup notice shown to users after an app update"
                  right={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {updateNotice?.enabled && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(16,185,129,0.12)", color: "#10b981", padding: "2px 8px", borderRadius: 20 }}>Active</span>
                      )}
                      <span style={{ color: "var(--text2)", fontSize: 16 }}>›</span>
                    </div>
                  }
                  onClick={() => {
                    if (updateNotice) {
                      setUpdateNoticeData({
                        ...updateNotice,
                        icon: updateNotice.icon || "alert"
                      });
                    }
                    setModal("appUpdateNotice");
                  }}
                />
                <div style={{ height: 1, background: "var(--border)", margin: "0 16px" }} />
                <SettingRow
                  icon="💬"
                  color="#6366f1"
                  label="Allow Student Messages"
                  desc="Let students send messages in group chats"
                  right={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {messagingSaveMsg && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: messagingSaveMsg.startsWith("✅")
                              ? "#10b981"
                              : "#ef4444",
                          }}
                        >
                          {messagingSaveMsg}
                        </span>
                      )}
                      <Toggle
                        value={studentMessaging}
                        onChange={handleStudentMessagingToggle}
                      />
                    </div>
                  }
                />
                {studentMessaging && (
                  <>
                    <div
                      style={{
                        height: 1,
                        background: "var(--border)",
                        margin: "0 16px",
                      }}
                    />
                    <div
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          flexShrink: 0,
                          background: "rgba(245,158,11,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          boxShadow: "inset 0 0 0 1px rgba(245,158,11,0.2)",
                        }}
                      >
                        📊
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          Daily Message Limit
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text2)",
                            marginTop: 2,
                            lineHeight: 1.3,
                          }}
                        >
                          Max messages each student can send per day (0 =
                          unlimited)
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={dailyMessageLimit}
                          onChange={(e) =>
                            handleDailyLimitChange(e.target.value)
                          }
                          onBlur={handleDailyLimitSave}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleDailyLimitSave();
                          }}
                          style={{
                            width: 64,
                            padding: "6px 8px",
                            fontSize: 13,
                            fontWeight: 700,
                            textAlign: "center",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "var(--bg3)",
                            color: "var(--text)",
                            outline: "none",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text2)",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          /day
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: "0 14px 12px" }}>
                      <div
                        style={{
                          background: "rgba(99,102,241,0.08)",
                          border: "1px solid rgba(99,102,241,0.15)",
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontSize: 11,
                          color: "var(--text2)",
                          lineHeight: 1.5,
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <span>ℹ️</span>
                        <span>
                          Students who exceed the daily limit will be blocked
                          from sending until the next day. Set to{" "}
                          <strong style={{ color: "var(--text)" }}>0</strong>{" "}
                          for unlimited messages.
                        </span>
                      </div>
                    </div>
                  </>
                )}
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="📬"
                  color="#8b5cf6"
                  label="Email Digest"
                  desc="Receive weekly summary reports of academy activity"
                  right={<Toggle value={notifEmail} onChange={setNotifEmail} />}
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="🔔"
                  color="#ec4899"
                  label="Push Notifications"
                  desc="Desktop alerts for new complaints or important notices"
                  right={
                    <Toggle
                      value={notifBrowser}
                      onChange={(v) => {
                        if (v && "Notification" in window) {
                          Notification.requestPermission().then((p) =>
                            setNotifBrowser(p === "granted"),
                          );
                        } else {
                          setNotifBrowser(v);
                        }
                      }}
                    />
                  }
                />
              </Card>
            </section>

            {/* Platform Info */}
            <section>
              <SectionLabel label="About & Support" />
              {/* Status block */}
              <div
                style={{
                  background: "var(--card)",
                  borderRadius: 10,
                  border: "1px solid rgba(16,185,129,0.2)",
                  padding: "9px 13px",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 0 3px rgba(16,185,129,0.18)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}
                  >
                    All Systems Operational
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text2)",
                      marginTop: 1,
                    }}
                  >
                    Project:{" "}
                    <span
                      style={{ color: "var(--text)", fontFamily: "monospace" }}
                    >
                      theseeksacademy-66d12
                    </span>
                  </div>
                </div>
              </div>

              <Card>
                <SettingRow
                  icon="ℹ️"
                  color="#6366f1"
                  label="About Dashboard"
                  desc="Version 1.0.0 · React / Vite"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("open-about"))
                  }
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="🛡️"
                  color="#f59e0b"
                  label="Data Security & Privacy"
                  desc="Review how academy data is protected"
                  onClick={() => setModal("privacy")}
                />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "0 16px",
                  }}
                />
                <SettingRow
                  icon="❓"
                  color="#0ea5e9"
                  label="Help & Documentation"
                  desc="Guides for using the admin features"
                  onClick={() => setModal("help")}
                />
              </Card>
            </section>
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}

      {/* Home Screen Settings Modal */}
      {modal === "appUpdateNotice" && (
        <Modal
          title="App Update Notice"
          onClose={() => setModal(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg3)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Enable Notice</div>
                <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>Show the update popup in mobile app</div>
              </div>
              <Toggle value={updateNoticeData.enabled} onChange={(val) => setUpdateNoticeData({ ...updateNoticeData, enabled: val })} />
            </div>
            
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Notice Icon</div>
                <IconDropdown
                  value={updateNoticeData.icon || "alert"}
                  onChange={(val) => setUpdateNoticeData({ ...updateNoticeData, icon: val })}
                  options={NOTICE_ICONS}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Popup Title</div>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: "8px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", height: 38 }}
                  value={updateNoticeData.title}
                  onChange={(e) => setUpdateNoticeData({ ...updateNoticeData, title: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Message Content</div>
                <TemplateDropdown 
                  options={MESSAGE_TEMPLATES}
                  onSelect={(template) => {
                    setUpdateNoticeData({
                      ...updateNoticeData,
                      message: template.message,
                      title: template.title,
                      icon: template.icon
                    });
                  }}
                />
              </div>
              <textarea
                className="form-input"
                rows={3}
                style={{ padding: "8px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 60 }}
                value={updateNoticeData.message}
                onChange={(e) => setUpdateNoticeData({ ...updateNoticeData, message: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Button Text</div>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: "8px 12px", fontSize: 13, width: "100%", boxSizing: "border-box" }}
                  value={updateNoticeData.buttonText}
                  onChange={(e) => setUpdateNoticeData({ ...updateNoticeData, buttonText: e.target.value })}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Audience</div>
                <CustomDropdown
                  value={updateNoticeData.audience}
                  onChange={(val) => setUpdateNoticeData({ ...updateNoticeData, audience: val })}
                  options={["All", "Teachers", "Students"]}
                  placeholder="Select Audience"
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                className="btn-primary"
                disabled={updateNoticeLoading}
                style={{ 
                  padding: "12px 24px", 
                  fontSize: 14, 
                  borderRadius: 10, 
                  width: "100%", 
                  fontWeight: 600,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                  border: "none",
                  cursor: updateNoticeLoading ? "not-allowed" : "pointer",
                  backgroundColor: "var(--primary, #3b82f6)",
                  color: "#ffffff",
                  opacity: updateNoticeLoading ? 0.7 : 1,
                  transition: "all 0.2s"
                }}
                onClick={async () => {
                  if (updateNoticeLoading) return;
                  setUpdateNoticeLoading(true);
                  try {
                    await dispatch(persistUpdateNotice(updateNoticeData)).unwrap();
                    setModal(null);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setUpdateNoticeLoading(false);
                  }
                }}
              >
                {updateNoticeLoading && (
                  <svg style={{ width: 18, height: 18, color: '#fff' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"></circle>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                    </path>
                  </svg>
                )}
                <span>{updateNoticeLoading ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === "homeScreenSettings" && (
        <Modal
          title="Manage Custom Slides"
          onClose={() => setModal(null)}
          maxWidth={700}
        >
          <div
            style={{
              fontSize: 13,
              color: "var(--text2)",
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            Add promotional banners, announcements, or custom images to display
            on the student app's home screen.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "var(--bg3)",
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}
              >
                {editingCustomSlideId ? "Edit Slide" : "Add New Slide"}
              </div>

              <input
                className="form-input"
                style={{ padding: "8px 12px", fontSize: 12 }}
                placeholder="Slide Text / Message"
                value={newCustomSlideText}
                onChange={(e) => setNewCustomSlideText(e.target.value)}
              />

              <input
                className="form-input"
                style={{ padding: "8px 12px", fontSize: 12, marginTop: 4 }}
                placeholder="Link URL (Optional - opens on tap)"
                value={newCustomSlideLink}
                onChange={(e) => setNewCustomSlideLink(e.target.value)}
              />

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    border: "none",
                    fontWeight: 700,
                    borderRadius: 8,
                  }}
                  onClick={handleSaveCustomSlide}
                  disabled={!newCustomSlideText.trim()}
                >
                  {editingCustomSlideId ? "Update Slide" : "+ Add Slide"}
                </button>
                {editingCustomSlideId && (
                  <button
                    className="btn btn-ghost"
                    style={{
                      padding: "8px 12px",
                      background: "var(--bg2)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      fontWeight: 600,
                      borderRadius: 8,
                    }}
                    onClick={handleCancelEditCustomSlide}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: 8,
                }}
              >
                Current Slides
              </div>
              {homeScreenConfig.customSlides.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text2)",
                    textAlign: "center",
                    padding: "20px 0",
                    background: "var(--bg3)",
                    borderRadius: 8,
                  }}
                >
                  No custom slides added yet.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {homeScreenConfig.customSlides.map((slide: any) => (
                    <div
                      key={slide.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        background: "var(--card)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text)",
                            marginBottom: 2,
                          }}
                        >
                          📝 Text Slide
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text2)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {slide.text}
                        </div>
                        {slide.link && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "#3b82f6",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              marginTop: 2,
                            }}
                          >
                            🔗 {slide.link}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", color: slide.hidden ? "#10b981" : "#f59e0b" }}
                          onClick={() => handleToggleHideCustomSlide(slide.id)}
                        >
                          {slide.hidden ? "Unhide" : "Hide"}
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", color: "#6366f1" }}
                          onClick={() => handleEditCustomSlide(slide)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", color: "#ef4444" }}
                          onClick={() => handleDeleteCustomSlide(slide.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Change Password Modal */}
      {modal === "changePassword" && (
        <Modal title="Change Security Password" onClose={() => setModal(null)}>
          <div
            style={{
              fontSize: 13,
              color: "var(--text2)",
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            For security reasons, you must provide your current password before
            setting a new one. This will update your login for both the Web
            Dashboard and the Mobile App.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12 }}>
                Current Password
              </label>
              <input
                type="password"
                className="form-input"
                value={cpCurrent}
                onChange={(e) => {
                  setCpCurrent(e.target.value);
                  setCpError("");
                  setCpSuccess("");
                }}
                placeholder="Enter current password"
                style={{ padding: "8px 12px", fontSize: 13 }}
              />
            </div>
            <div style={{ height: 1, background: "var(--border)" }} />
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12 }}>
                New Password
              </label>
              <input
                type="password"
                className="form-input"
                value={cpNew}
                onChange={(e) => {
                  setCpNew(e.target.value);
                  setCpError("");
                  setCpSuccess("");
                }}
                placeholder="Must be at least 6 characters"
                style={{ padding: "8px 12px", fontSize: 13 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12 }}>
                Confirm New Password
              </label>
              <input
                type="password"
                className="form-input"
                value={cpConfirm}
                onChange={(e) => {
                  setCpConfirm(e.target.value);
                  setCpError("");
                  setCpSuccess("");
                }}
                placeholder="Re-enter new password"
                style={{ padding: "8px 12px", fontSize: 13 }}
              />
            </div>

            {cpError && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  display: "flex",
                  gap: 8,
                }}
              >
                <span>⚠️</span> {cpError}
              </div>
            )}
            {cpSuccess && (
              <div
                style={{
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#34d399",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  display: "flex",
                  gap: 8,
                }}
              >
                <span>✅</span> {cpSuccess}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: "10px" }}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                  border: "none",
                }}
                onClick={handleChangePassword}
                disabled={cpLoading || !cpCurrent || !cpNew || !cpConfirm}
              >
                {cpLoading ? "Updating credentials..." : "Update Password"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Profile Modal */}
      {modal === "profile" && (
        <Modal title="Edit Profile Details" onClose={() => setModal(null)}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 800,
                color: "#fff",
                boxShadow: "0 10px 25px rgba(99,102,241,0.4)",
                marginBottom: 16,
              }}
            >
              {(profileName || user?.email || "A").charAt(0).toUpperCase()}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12 }}>
                Admin Display Name
              </label>
              <input
                className="form-input"
                value={profileName}
                onChange={(e) => {
                  setProfileName(e.target.value);
                  setProfileMsg("");
                }}
                placeholder="e.g. Iftikhar Zahid"
                style={{ padding: "8px 12px", fontSize: 13 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12 }}>
                Email Address (Read-only)
              </label>
              <input
                className="form-input"
                value={user?.email || ""}
                disabled
                style={{
                  opacity: 0.6,
                  cursor: "not-allowed",
                  padding: "8px 12px",
                  fontSize: 13,
                  background: "var(--bg3)",
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text2)",
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                Email acts as your unique identifier and cannot be changed here.
                Contact support if you need to migrate accounts.
              </div>
            </div>

            {profileMsg && (
              <div
                style={{
                  background: profileMsg.startsWith("✅")
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(239,68,68,0.1)",
                  border: `1px solid ${profileMsg.startsWith("✅") ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                  color: profileMsg.startsWith("✅") ? "#34d399" : "#f87171",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                }}
              >
                {profileMsg}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: "10px" }}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: "10px" }}
                onClick={handleSaveProfile}
                disabled={profileLoading || !profileName.trim()}
              >
                {profileLoading ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Privacy Policy */}
      {modal === "privacy" && (
        <Modal title="Security & Privacy Policy" onClose={() => setModal(null)}>
          <div
            style={{
              maxHeight: 400,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              paddingRight: 8,
            }}
          >
            <div
              style={{
                background: "rgba(16,185,129,0.1)",
                padding: 12,
                borderRadius: 10,
                border: "1px solid rgba(16,185,129,0.2)",
                color: "#10b981",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                gap: 10,
              }}
            >
              <span>🛡️</span> Your academy data is protected by enterprise-grade
              security.
            </div>
            {[
              [
                "Data Storage & Encryption",
                "All student data, fee records, and attendance logs are stored on Google Cloud Firestore. Data is encrypted both in transit (TLS/SSL) and at rest (AES-256).",
              ],
              [
                "Authentication security",
                "Admin authentication is managed securely via Firebase. Passwords are mathematically hashed and salted. We never store or transmit plain-text passwords.",
              ],
              [
                "Access Control",
                "This dashboard is strictly limited to authorized administrator accounts. Student and Teacher logins will be rejected.",
              ],
              [
                "Data Sync",
                "Information synchronized between the mobile app and this web dashboard occurs over secure, authenticated WebSocket connections.",
              ],
            ].map(([title, body]) => (
              <div key={title} style={{ padding: "0 4px" }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: 6,
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text2)",
                    lineHeight: 1.6,
                  }}
                >
                  {body}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Help Center */}
      {modal === "help" && (
        <Modal title="Admin Support & Guides" onClose={() => setModal(null)}>
          <div
            style={{
              maxHeight: 400,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              paddingRight: 8,
            }}
          >
            {[
              [
                "How does real-time sync work?",
                "Both this web dashboard and the mobile app connect to the same Firebase database. When a teacher marks attendance on mobile, it instantly appears on your dashboard charts without refreshing.",
              ],
              [
                "Adding a new Student",
                'Navigate to the "Students" tab and click "Add Student". Provide details and setup their default fee structure. They will be immediately able to log in to the mobile app.',
              ],
              [
                "Managing Fee Records",
                'The "Fees" module automatically tracks pending amounts. Click any student row to explicitly manage their Paid vs Total fee amounts.',
              ],
              [
                "I need to change an admin password",
                'You can safely reset any account\'s password (including your own) by clicking "Send Password Reset". An email will be dispatched with a secure link.',
              ],
            ].map(([q, a]) => (
              <div
                key={q}
                style={{
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--primary-light)",
                    marginBottom: 8,
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <span>Q.</span> {q}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text2)",
                    lineHeight: 1.6,
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>
                    A.
                  </span>{" "}
                  {a}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Backup Database Modal */}
      {modal === "backup" && (
        <Modal title="Backup Database" onClose={() => setModal(null)}>
          <div
            style={{
              fontSize: 13,
              color: "var(--text2)",
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            Select the collections you want to include in this backup. The data
            will be downloaded as a structured Excel file (.xlsx) with a
            separate sheet for each collection.
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 24,
              maxHeight: "50vh",
              overflowY: "auto",
              paddingRight: 8,
            }}
          >
            {[
              {
                id: "students",
                label: "Students",
                desc: "Profiles and basic information",
              },
              {
                id: "fees",
                label: "Fee Records",
                desc: "Financial transactions and ledger",
              },
              { id: "teachers", label: "Teachers", desc: "Staff profiles" },
              {
                id: "attendance",
                label: "Attendance",
                desc: "Daily attendance logs",
              },
              { id: "timetable", label: "Timetable", desc: "Class schedules" },
              {
                id: "videoGalleries",
                label: "Video Galleries",
                desc: "Video courses and links",
              },
              {
                id: "assignments",
                label: "Assignments",
                desc: "Student assignments",
              },
              {
                id: "exams",
                label: "Exams",
                desc: "Exam schedules and records",
              },
            ].map((opt) => (
              <label
                key={opt.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  cursor: "pointer",
                  background: "var(--bg3)",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                <input
                  type="checkbox"
                  checked={backupOptions[opt.id as keyof typeof backupOptions]}
                  onChange={(e) =>
                    setBackupOptions((prev) => ({
                      ...prev,
                      [opt.id]: e.target.checked,
                    }))
                  }
                  style={{
                    marginTop: 2,
                    width: 16,
                    height: 16,
                    accentColor: "var(--primary)",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {opt.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text2)",
                      marginTop: 2,
                    }}
                  >
                    {opt.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, padding: "10px" }}
              onClick={() => setModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{
                flex: 1,
                padding: "10px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
              }}
              onClick={handleExportBackup}
              disabled={
                backupLoading || !Object.values(backupOptions).some(Boolean)
              }
            >
              {backupLoading ? "Exporting..." : "Download Backup"}
            </button>
          </div>
        </Modal>
      )}

      {/* Classes Modal */}
      {modal === "classes" && (
        <Modal
          title="Manage Classes"
          onClose={() => {
            setModal(null);
            setEditClassIndex(null);
            setNewClassName("");
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Add input */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-input"
                style={{ flex: 1, padding: "9px 12px", fontSize: 13 }}
                placeholder="e.g. 9th, 10th, 1st Year..."
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddClass()}
                autoFocus
              />
              <button
                className="btn btn-primary"
                style={{
                  padding: "9px 18px",
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  border: "none",
                  fontWeight: 700,
                  borderRadius: 8,
                }}
                onClick={handleAddClass}
                disabled={!newClassName.trim()}
              >
                + Add
              </button>
            </div>
            {/* Count header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text2)",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                {classesLoading
                  ? "Loading..."
                  : `${classes.length} Class${classes.length !== 1 ? "es" : ""}`}
              </span>
              {!classesLoading && classes.length > 0 && (
                <span style={{ fontSize: 11, color: "var(--text2)" }}>
                  Click ✏️ to edit
                </span>
              )}
            </div>
            {/* Pill grid */}
            <div
              style={{
                minHeight: 80,
                maxHeight: 320,
                overflowY: "auto",
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignContent: "flex-start",
                background: "var(--bg3)",
                borderRadius: 10,
                border: "1px solid var(--border)",
                padding: 14,
              }}
            >
              {classesLoading ? (
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    padding: "24px 0",
                    color: "var(--text2)",
                    fontSize: 13,
                  }}
                >
                  ⏳ Loading classes from Firestore...
                </div>
              ) : classes.length === 0 ? (
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    padding: "24px 0",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎓</div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    No classes yet
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text2)",
                      marginTop: 4,
                    }}
                  >
                    Add your first class above
                  </div>
                </div>
              ) : (
                classes.map((cls: string, index: number) =>
                  editClassIndex === index ? (
                    <div
                      key={index}
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <input
                        className="form-input"
                        style={{
                          width: 110,
                          padding: "5px 10px",
                          fontSize: 13,
                          borderRadius: 8,
                        }}
                        value={editClassValue}
                        onChange={(e) => setEditClassValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateClass(index);
                          if (e.key === "Escape") setEditClassIndex(null);
                        }}
                        autoFocus
                      />
                      <button
                        className="btn btn-primary"
                        style={{
                          padding: "5px 10px",
                          fontSize: 12,
                          borderRadius: 8,
                          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                          border: "none",
                        }}
                        onClick={() => handleUpdateClass(index)}
                      >
                        ✓
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{
                          padding: "5px 8px",
                          fontSize: 12,
                          borderRadius: 8,
                        }}
                        onClick={() => setEditClassIndex(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      key={index}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background:
                          "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.10))",
                        border: "1px solid rgba(99,102,241,0.25)",
                        borderRadius: 999,
                        padding: "6px 12px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#818cf8",
                        boxShadow: "0 1px 3px rgba(99,102,241,0.1)",
                      }}
                    >
                      <span>🎓</span>
                      <span>{cls}</span>
                      <button
                        title="Edit"
                        onClick={() => {
                          setEditClassIndex(index);
                          setEditClassValue(cls);
                        }}
                        style={{
                          background: "rgba(99,102,241,0.15)",
                          border: "none",
                          cursor: "pointer",
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          color: "#818cf8",
                          padding: 0,
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        title="Delete"
                        onClick={() => handleDeleteClass(index)}
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          border: "none",
                          cursor: "pointer",
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          color: "#ef4444",
                          padding: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ),
                )
              )}
            </div>
            {!classesLoading && classes.length > 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text2)",
                  textAlign: "center",
                }}
              >
                ℹ️ Changes are saved automatically to Firestore
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Groups Modal */}
      {modal === "groups" && (
        <Modal
          title="Manage Groups / Sections"
          onClose={() => {
            setModal(null);
            setEditGroupIndex(null);
            setNewGroupName("");
            setNewGroupBooks([]);
          }}
          maxWidth={850}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Add input */}
            {editGroupIndex === null && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "var(--bg3)",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  Add New Group
                </div>
                <input
                  className="form-input"
                  style={{ padding: "9px 12px", fontSize: 13 }}
                  placeholder="e.g. F.Sc Medical, ICS..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text2)",
                    marginTop: 4,
                  }}
                >
                  Select Books for this Group
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  {books.map((book: string) => (
                    <label
                      key={book}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: "var(--bg2)",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newGroupBooks.includes(book)}
                        onChange={(e) => {
                          if (e.target.checked)
                            setNewGroupBooks([...newGroupBooks, book]);
                          else
                            setNewGroupBooks(
                              newGroupBooks.filter((b) => b !== book),
                            );
                        }}
                      />
                      {book}
                    </label>
                  ))}
                  {books.length === 0 && (
                    <span style={{ fontSize: 11, color: "var(--text2)" }}>
                      No books available. Add books first.
                    </span>
                  )}
                </div>
                <button
                  className="btn btn-primary"
                  style={{
                    padding: "9px 18px",
                    background: "linear-gradient(135deg,#f59e0b,#d97706)",
                    border: "none",
                    fontWeight: 700,
                    borderRadius: 8,
                    alignSelf: "flex-start",
                    marginTop: 4,
                  }}
                  onClick={handleAddGroup}
                  disabled={!newGroupName.trim()}
                >
                  + Add Group
                </button>
              </div>
            )}
            {/* Count header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text2)",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                {groupsLoading
                  ? "Loading..."
                  : `${groups.length} Group${groups.length !== 1 ? "s" : ""}`}
              </span>
              {!groupsLoading && groups.length > 0 && (
                <span style={{ fontSize: 11, color: "var(--text2)" }}>
                  Click ✏️ to edit
                </span>
              )}
            </div>
            {/* Pill grid */}
            <div
              style={{
                minHeight: 120,
                maxHeight: 450,
                overflowY: "auto",
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignContent: "flex-start",
                background: "var(--bg3)",
                borderRadius: 10,
                border: "1px solid var(--border)",
                padding: 14,
              }}
            >
              {groupsLoading ? (
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    padding: "24px 0",
                    color: "var(--text2)",
                    fontSize: 13,
                  }}
                >
                  ⏳ Loading groups...
                </div>
              ) : groups.length === 0 ? (
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    padding: "24px 0",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    No groups yet
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text2)",
                      marginTop: 4,
                    }}
                  >
                    Add your first group above
                  </div>
                </div>
              ) : (
                groups.map((grp: any, index: number) =>
                  editGroupIndex === index ? (
                    <div
                      key={index}
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        background: "var(--bg1)",
                        padding: 12,
                        borderRadius: 10,
                        border: "1px solid var(--primary)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        Edit Group
                      </div>
                      <input
                        className="form-input"
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          borderRadius: 8,
                        }}
                        value={editGroupValue}
                        onChange={(e) => setEditGroupValue(e.target.value)}
                      />
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--text2)",
                        }}
                      >
                        Select Books
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          maxHeight: 200,
                          overflowY: "auto",
                        }}
                      >
                        {books.map((book: string) => (
                          <label
                            key={book}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              background: "var(--bg2)",
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              border: "1px solid var(--border)",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={editGroupBooks.includes(book)}
                              onChange={(e) => {
                                if (e.target.checked)
                                  setEditGroupBooks([...editGroupBooks, book]);
                                else
                                  setEditGroupBooks(
                                    editGroupBooks.filter((b) => b !== book),
                                  );
                              }}
                            />
                            {book}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button
                          className="btn btn-primary"
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            borderRadius: 8,
                            background:
                              "linear-gradient(135deg,#f59e0b,#d97706)",
                            border: "none",
                          }}
                          onClick={() => handleUpdateGroup(index)}
                        >
                          Save Changes
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            borderRadius: 8,
                          }}
                          onClick={() => setEditGroupIndex(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={index}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background:
                          "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.10))",
                        border: "1px solid rgba(245,158,11,0.25)",
                        borderRadius: 999,
                        padding: "6px 12px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#d97706",
                        boxShadow: "0 1px 3px rgba(245,158,11,0.1)",
                      }}
                    >
                      <span>👥</span>
                      <span>{grp.name || grp}</span>
                      {grp.books && grp.books.length > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            background: "rgba(245,158,11,0.2)",
                            padding: "2px 6px",
                            borderRadius: 10,
                          }}
                        >
                          {grp.books.length} books
                        </span>
                      )}
                      <button
                        title="Edit"
                        onClick={() => {
                          setEditGroupIndex(index);
                          setEditGroupValue(grp.name || grp);
                          setEditGroupBooks(grp.books || []);
                        }}
                        style={{
                          background: "rgba(245,158,11,0.15)",
                          border: "none",
                          cursor: "pointer",
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          color: "#d97706",
                          padding: 0,
                          marginLeft: 4,
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        title="Delete"
                        onClick={() => handleDeleteGroup(index)}
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          border: "none",
                          cursor: "pointer",
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          color: "#ef4444",
                          padding: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Library Categories Modal */}
      {modal === "libraryCategories" && (
        <Modal
          title="Manage e-Library Sections"
          onClose={() => {
            setModal(null);
            setEditLibraryCategoryIndex(null);
            setNewLibraryCategoryName("");
            setNewLibraryCategorySubtitle("");
            setNewLibraryCategoryIcon("folder");
          }}
          maxWidth={850}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* ── Add New Section Form ── */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(14,165,233,0.07), rgba(2,132,199,0.04))",
                border: "1px solid rgba(14,165,233,0.2)",
                borderRadius: 14,
                padding: 18,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#0284c7",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>✚</span> New Section
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 5 }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text2)",
                      letterSpacing: 0.3,
                    }}
                  >
                    ICON
                  </label>
                  <select
                    value={newLibraryCategoryIcon}
                    onChange={(e) => setNewLibraryCategoryIcon(e.target.value)}
                    className="form-input"
                    style={{
                      padding: "9px 10px",
                      fontSize: 14,
                      width: 138,
                      borderRadius: 9,
                    }}
                  >
                    {AVAILABLE_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {ICON_MAP[icon]} {icon}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text2)",
                      letterSpacing: 0.3,
                    }}
                  >
                    SECTION NAME <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    style={{
                      padding: "9px 12px",
                      fontSize: 13,
                      borderRadius: 9,
                    }}
                    placeholder="e.g. Past Papers, Syllabus..."
                    value={newLibraryCategoryName}
                    onChange={(e) => setNewLibraryCategoryName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  marginBottom: 16,
                }}
              >
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text2)",
                    letterSpacing: 0.3,
                  }}
                >
                  SUBTITLE{" "}
                  <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>
                    (description shown on mobile card)
                  </span>
                </label>
                <input
                  className="form-input"
                  style={{ padding: "9px 12px", fontSize: 13, borderRadius: 9 }}
                  placeholder="e.g. Browse exam papers & solutions..."
                  value={newLibraryCategorySubtitle}
                  onChange={(e) =>
                    setNewLibraryCategorySubtitle(e.target.value)
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleAddLibraryCategory()
                  }
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--bg1)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    minHeight: 52,
                  }}
                >
                  {newLibraryCategoryName.trim() ? (
                    <>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        {ICON_MAP[newLibraryCategoryIcon] || "📁"}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--text)",
                            lineHeight: 1.2,
                          }}
                        >
                          {newLibraryCategoryName}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text2)",
                            marginTop: 2,
                          }}
                        >
                          {newLibraryCategorySubtitle || (
                            <em style={{ opacity: 0.5 }}>No subtitle</em>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text2)",
                        fontStyle: "italic",
                        opacity: 0.6,
                      }}
                    >
                      Live preview will appear here…
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAddLibraryCategory}
                  disabled={!newLibraryCategoryName.trim()}
                  style={{
                    padding: "11px 22px",
                    background: newLibraryCategoryName.trim()
                      ? "linear-gradient(135deg,#0ea5e9,#0284c7)"
                      : "var(--bg3)",
                    border: "none",
                    borderRadius: 9,
                    fontWeight: 700,
                    fontSize: 13,
                    color: newLibraryCategoryName.trim()
                      ? "#fff"
                      : "var(--text2)",
                    cursor: newLibraryCategoryName.trim()
                      ? "pointer"
                      : "not-allowed",
                    boxShadow: newLibraryCategoryName.trim()
                      ? "0 4px 14px rgba(14,165,233,0.35)"
                      : "none",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  + Add Section
                </button>
              </div>
            </div>

            {/* ── Sections List ── */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}
                >
                  {libraryCategoriesLoading
                    ? "Loading…"
                    : `${libraryCategories.length} Section${libraryCategories.length !== 1 ? "s" : ""}`}
                </span>
                {!libraryCategoriesLoading && libraryCategories.length > 0 && (
                  <span style={{ fontSize: 11, color: "var(--text2)" }}>
                    Click ✏️ Edit to modify or drag ⠿ to reorder
                  </span>
                )}
              </div>

              <div
                style={{
                  maxHeight: 450,
                  overflowY: "auto",
                  paddingRight: 6,
                  paddingLeft: 2,
                  paddingBottom: 10,
                }}
              >
                {libraryCategoriesLoading ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "var(--text2)",
                      fontSize: 13,
                    }}
                  >
                    ⏳ Loading sections…
                  </div>
                ) : libraryCategories.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: 4,
                      }}
                    >
                      No sections yet
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>
                      Use the form above to add your first section
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: "var(--bg2)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                    }}
                  >
                    {libraryCategories.map((cat: any, index: number) => {
                      const catName = cat.name || cat;
                      const catIcon = cat.icon || "folder";
                      const catSubtitle = cat.subtitle || "";
                      const palette = [
                        "#0ea5e9",
                        "#8b5cf6",
                        "#10b981",
                        "#f59e0b",
                        "#06b6d4",
                        "#ec4899",
                        "#6366f1",
                        "#f43f5e",
                      ];
                      const cardColor = palette[index % palette.length];
                      return (
                        <div
                          key={index}
                          draggable={editLibraryCategoryIndex === null}
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(index)}
                          style={{
                            borderBottom:
                              index < libraryCategories.length - 1
                                ? "1px solid var(--border)"
                                : "none",
                            cursor:
                              editLibraryCategoryIndex === null
                                ? "grab"
                                : "default",
                            opacity: draggedCatIndex === index ? 0.5 : 1,
                            background: "var(--bg2)",
                            position: "relative",
                          }}
                        >
                          {editLibraryCategoryIndex === index ? (
                            <div
                              style={{
                                padding: "16px 20px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                                borderLeft: `4px solid #0ea5e9`,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#0284c7",
                                  textTransform: "uppercase",
                                  letterSpacing: 1,
                                }}
                              >
                                ✎ Editing Section
                              </div>
                              <div style={{ display: "flex", gap: 10 }}>
                                <select
                                  value={editLibraryCategoryIconValue}
                                  onChange={(e) =>
                                    setEditLibraryCategoryIconValue(
                                      e.target.value,
                                    )
                                  }
                                  className="form-input"
                                  style={{
                                    padding: "10px 12px",
                                    fontSize: 14,
                                    borderRadius: 8,
                                    width: 140,
                                    flexShrink: 0,
                                  }}
                                >
                                  {AVAILABLE_ICONS.map((icon) => (
                                    <option key={icon} value={icon}>
                                      {ICON_MAP[icon]} {icon}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  className="form-input"
                                  style={{
                                    flex: 1,
                                    padding: "10px 14px",
                                    fontSize: 14,
                                    borderRadius: 8,
                                  }}
                                  placeholder="Section name"
                                  value={editLibraryCategoryValue}
                                  onChange={(e) =>
                                    setEditLibraryCategoryValue(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleUpdateLibraryCategory(index);
                                    if (e.key === "Escape")
                                      setEditLibraryCategoryIndex(null);
                                  }}
                                  autoFocus
                                />
                              </div>
                              <input
                                className="form-input"
                                style={{
                                  padding: "10px 14px",
                                  fontSize: 14,
                                  borderRadius: 8,
                                }}
                                placeholder="Subtitle shown on mobile card…"
                                value={editLibraryCategorySubtitleValue}
                                onChange={(e) =>
                                  setEditLibraryCategorySubtitleValue(
                                    e.target.value,
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleUpdateLibraryCategory(index);
                                  if (e.key === "Escape")
                                    setEditLibraryCategoryIndex(null);
                                }}
                              />
                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  justifyContent: "flex-end",
                                  marginTop: 4,
                                }}
                              >
                                <button
                                  onClick={() =>
                                    setEditLibraryCategoryIndex(null)
                                  }
                                  style={{
                                    padding: "8px 20px",
                                    background: "var(--bg3)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "var(--text2)",
                                    cursor: "pointer",
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateLibraryCategory(index)
                                  }
                                  style={{
                                    padding: "8px 24px",
                                    background:
                                      "linear-gradient(135deg,#0ea5e9,#0284c7)",
                                    border: "none",
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#fff",
                                    cursor: "pointer",
                                    boxShadow: "0 2px 8px rgba(14,165,233,0.3)",
                                  }}
                                >
                                  ✓ Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 18,
                                padding: "16px 20px",
                                borderLeft: `4px solid ${cardColor}`,
                              }}
                            >
                              <div
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 12,
                                  background: `linear-gradient(135deg, ${cardColor}, ${cardColor}bb)`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 22,
                                  flexShrink: 0,
                                  boxShadow: `0 4px 12px ${cardColor}35`,
                                }}
                              >
                                {ICON_MAP[catIcon] || "📁"}
                              </div>
                              <div
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  paddingRight: 10,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: "var(--text)",
                                    marginBottom: 4,
                                  }}
                                >
                                  {catName}
                                </div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "var(--text2)",
                                    opacity: catSubtitle ? 0.8 : 0.5,
                                    fontStyle: catSubtitle
                                      ? "normal"
                                      : "italic",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {catSubtitle ||
                                    "No subtitle — click Edit to add one"}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  flexShrink: 0,
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    cursor: "grab",
                                    padding: "0 10px",
                                    color: "var(--text2)",
                                    fontSize: 20,
                                    opacity: 0.6,
                                    marginRight: 4,
                                  }}
                                  title="Drag to reorder"
                                >
                                  ⠿
                                </div>
                                <button
                                  onClick={() => {
                                    setEditLibraryCategoryIndex(index);
                                    setEditLibraryCategoryValue(catName);
                                    setEditLibraryCategoryIconValue(catIcon);
                                    setEditLibraryCategorySubtitleValue(
                                      catSubtitle,
                                    );
                                  }}
                                  style={{
                                    padding: "8px 16px",
                                    background: "var(--bg3)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "var(--text)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteLibraryCategory(index)
                                  }
                                  style={{
                                    padding: "8px 12px",
                                    background: "rgba(239,68,68,0.07)",
                                    border: "1px solid rgba(239,68,68,0.2)",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    fontSize: 14,
                                    color: "#ef4444",
                                  }}
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Subjects Modal - removed, replaced by Classes */}
      {modal === "books" && (
        <Modal
          title="Manage Books / Subjects"
          onClose={() => {
            setModal(null);
            setEditBookIndex(null);
            setNewBookName("");
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-input"
                style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
                placeholder="Add a new book / subject..."
                value={newBookName}
                onChange={(e) => setNewBookName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddBook()}
              />
              <button
                className="btn btn-primary"
                style={{
                  padding: "8px 16px",
                  background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                  border: "none",
                }}
                onClick={handleAddBook}
                disabled={!newBookName.trim()}
              >
                Add
              </button>
            </div>

            <div
              style={{
                background: "var(--bg3)",
                borderRadius: 8,
                border: "1px solid var(--border)",
                maxHeight: 300,
                overflowY: "auto",
                marginTop: 8,
              }}
            >
              {booksLoading ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: "var(--text2)",
                    fontSize: 13,
                  }}
                >
                  Loading books...
                </div>
              ) : books.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: "var(--text2)",
                    fontSize: 13,
                  }}
                >
                  No books found.
                </div>
              ) : (
                books.map((book: string, index: number) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderBottom:
                        index < books.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    {editBookIndex === index ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flex: 1,
                          marginRight: 8,
                        }}
                      >
                        <input
                          className="form-input"
                          style={{ flex: 1, padding: "4px 8px", fontSize: 13 }}
                          value={editBookValue}
                          onChange={(e) => setEditBookValue(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleUpdateBook(index)
                          }
                          autoFocus
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => handleUpdateBook(index)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => setEditBookIndex(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {book}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            className="btn btn-ghost"
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              height: 26,
                            }}
                            onClick={() => {
                              setEditBookIndex(index);
                              setEditBookValue(book);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              height: 26,
                              color: "#ef4444",
                            }}
                            onClick={() => handleDeleteBook(index)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
      {/* Default Fees Modal */}
      {modal === "defaultFees" && (
        <Modal title="Manage Default Fees" onClose={() => setModal(null)}>
          <div
            style={{
              fontSize: 13,
              color: "var(--text2)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Set the default fee amount for each class. This will be
            automatically applied to new fee records for students in these
            classes.
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: 300,
              overflowY: "auto",
              marginBottom: 20,
              paddingRight: 4,
            }}
          >
            {classes.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text2)",
                  textAlign: "center",
                  padding: 20,
                }}
              >
                No classes available. Add classes first.
              </div>
            ) : (
              classes.map((clsName: string) => (
                <div
                  key={clsName}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "10px 14px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: "var(--text)",
                    }}
                  >
                    {clsName}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "var(--bg1)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "4px 8px",
                      width: 140,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "var(--text2)",
                        marginRight: 6,
                      }}
                    >
                      PKR
                    </span>
                    <input
                      type="number"
                      value={localDefaultFees[clsName] || ""}
                      placeholder="0"
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setLocalDefaultFees((prev) => ({
                          ...prev,
                          [clsName]: isNaN(val) ? 0 : val,
                        }));
                      }}
                      style={{
                        width: "100%",
                        border: "none",
                        background: "transparent",
                        outline: "none",
                        fontSize: 13,
                        color: "var(--text)",
                        fontWeight: 600,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, padding: 10 }}
              onClick={() => setModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: 10 }}
              onClick={handleSaveDefaultFees}
            >
              Save Fees
            </button>
          </div>
        </Modal>
      )}

      {/* ID Card Generator Modal */}
      {modal === "idCard" && <Card_Generator onClose={() => setModal(null)} />}
      {/* Firebase Config Modal */}
      {modal === "firebaseConfig" && (
        <Modal
          title="Firebase Configuration"
          onClose={() => setModal(null)}
          maxWidth={650}
        >
          <div
            style={{
              fontSize: 13,
              color: "var(--text2)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Update the API keys below to connect this dashboard to a new
            institution's database. This configuration is saved locally in your
            browser.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              maxHeight: "60vh",
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {Object.keys(fbConfig).map((key) => (
              <div className="form-group" key={key} style={{ marginBottom: 0 }}>
                <label
                  className="form-label"
                  style={{
                    fontSize: 12,
                    textTransform: "capitalize",
                    marginBottom: 4,
                  }}
                >
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </label>
                <input
                  className="form-input"
                  value={(fbConfig as any)[key]}
                  onChange={(e) =>
                    setFbConfig({ ...fbConfig, [key]: e.target.value })
                  }
                  placeholder={`Enter ${key}`}
                  style={{ padding: "6px 10px", fontSize: 13 }}
                />
              </div>
            ))}
          </div>

          {fbConfigMsg && (
            <div
              style={{
                marginTop: 16,
                background: fbConfigMsg.startsWith("✅")
                  ? "rgba(16,185,129,0.1)"
                  : "rgba(239,68,68,0.1)",
                border: `1px solid ${fbConfigMsg.startsWith("✅") ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                color: fbConfigMsg.startsWith("✅") ? "#34d399" : "#f87171",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
              }}
            >
              {fbConfigMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              className="btn btn-secondary"
              style={{
                padding: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
              }}
              onClick={handleDownloadBackup}
              title="Download Backup Text File"
            >
              <span>📥</span> Backup
            </button>
            <button
              className="btn btn-secondary"
              style={{
                flex: 1,
                padding: 10,
                color: "#ef4444",
                borderColor: "rgba(239,68,68,0.3)",
              }}
              onClick={handleResetFbConfig}
            >
              Reset Default
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: 10 }}
              onClick={handleSaveFbConfig}
            >
              Save & Apply
            </button>
          </div>
        </Modal>
      )}

      {/* Unlock System Integration Modal */}
      {modal === "unlockSysInt" && (
        <Modal title="Authentication Required" onClose={() => setModal(null)}>
          <div
            style={{
              fontSize: 13,
              color: "var(--text2)",
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            Please authenticate as Super Admin to unlock the System Integration
            section.
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12 }}>
                Email
              </label>
              <input
                type="email"
                className="form-input"
                value={sysIntEmail}
                onChange={(e) => {
                  setSysIntEmail(e.target.value);
                  setSysIntError("");
                }}
                placeholder="Enter super admin email"
                style={{ padding: "8px 12px", fontSize: 13 }}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12 }}>
                Password
              </label>
              <input
                type="password"
                className="form-input"
                value={sysIntPassword}
                onChange={(e) => {
                  setSysIntPassword(e.target.value);
                  setSysIntError("");
                }}
                placeholder="Enter super admin password"
                style={{ padding: "8px 12px", fontSize: 13 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUnlockSysInt();
                }}
              />
            </div>
          </div>
          {sysIntError && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                display: "flex",
                gap: 8,
                marginBottom: 20,
              }}
            >
              <span>⚠️</span> {sysIntError}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, padding: 10 }}
              onClick={() => setModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: 10 }}
              onClick={handleUnlockSysInt}
            >
              Verify & Unlock
            </button>
          </div>
        </Modal>
      )}

      {/* Pro Settings Modal */}
      {modal === "proSettings" && (
        <Modal title="System Integration (Pro)" onClose={() => setModal(null)}>
          <div
            style={{
              fontSize: 13,
              color: "var(--text2)",
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            Manage advanced synchronization and deployment settings for your
            mobile application.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                background: "var(--card)",
                borderRadius: 12,
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <SettingRow
                icon="⚡"
                color="#10b981"
                label="Firebase Real-time Sync"
                desc="Keep dashboard constantly updated with mobile app"
                right={
                  <Toggle value={autoSync} onChange={handleAutoSyncToggle} />
                }
              />
              <div
                style={{
                  height: 1,
                  background: "var(--border)",
                  margin: "0 16px",
                }}
              />
              <SettingRow
                icon="🔥"
                color="#f59e0b"
                label="Firebase Configuration"
                desc="Update API keys to deploy for a new institution"
                onClick={() => setModal("firebaseConfig")}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              className="btn btn-primary"
              style={{
                padding: "10px 28px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "translateY(-1px)")
              }
              onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
              onClick={() => setModal(null)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
