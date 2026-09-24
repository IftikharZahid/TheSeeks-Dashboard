import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchExams,
  initExamsListener,
  saveExam,
  deleteExam,
  selectFilteredExams,
  selectStudentProgressList,
  selectResultDetails,
  saveBulkExams,
  selectBulkEntryData,
} from "../../store/slices/examsSlice";
import { fetchStudents } from "../../store/slices/studentsSlice";
import { fetchTeachers } from "../../store/slices/teachersSlice";
import {
  fetchClasses,
  fetchExamSettings,
  persistExamSettings,
  fetchSessions,
  persistSessions,
  fetchGroups,
} from "../../store/slices/appSettingsSlice";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { QRCodeCanvas } from "qrcode.react";

const numberToWords = (num: number): string => {
  if (num === 0) return "Zero";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  const toWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + toWords(n % 100) : "");
    if (n < 100000) return toWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + toWords(n % 1000) : "");
    return n.toString();
  };
  return toWords(num);
};

interface BookEntry {
  name: string;
  totalMarks: string;
  obtainedMarks: string;
}

interface ExamEntry {
  id: string;
  title: string;
  date: string;
  category: string;
  rollNo: string;
  studentName: string;
  studentEmail: string;
  studentClass: string;
  books?: BookEntry[];
  bookName?: string;
  totalMarks: string;
  obtainedMarks: string;
  status: string;
  description: string;
}

interface StudentProgress {
  studentName: string;
  fatherName: string;
  gender: string;
  rollNo: string;
  studentClass: string;
  studentEmail: string;
  totalMarks: number;
  obtainedMarks: number;
  testCount: number;
  tests: string[];
  latestExam: ExamEntry;
}

const CATEGORIES = ["Weekly", "Monthly", "Quarterly", "Half Book", "Full Book"];
const TITLE_OPTIONS = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);
// Classes are managed in Settings > Manage Classes — use `savedClasses` from Redux (appSettings.classes)

const DEFAULT_SUBJECTS = [
  "Tarjuma Tul Quran",
  "Islamiyat",
  "Urdu",
  "Pak Study",
  "English",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Computer Science",
  "Biology",
  "Sociology",
  "Psychology",
  "Economics",
  "Ethics",
];

const sortBooksSequence = <T extends { name: string }>(books: T[]): T[] => {
  const getSubjectRank = (name: string) => {
    const n = name.toLowerCase().trim();
    if (n.includes("tarjuma") || n.includes("tajuma") || n.includes("quran"))
      return 1;
    if (n.includes("islam")) return 2;
    if (n.includes("urdu")) return 3;
    if (n.includes("pak")) return 4;
    if (n.includes("eng")) return 5;
    if (n.includes("math")) return 6;
    if (n.includes("physic")) return 7;
    if (n.includes("chemist")) return 8;
    if (n.includes("comput")) return 9;
    return 999;
  };

  return [...books].sort((a, b) => {
    const rankA = getSubjectRank(a.name);
    const rankB = getSubjectRank(b.name);
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });
};

export default function ResultsPage() {
  const dispatch = useAppDispatch();

  const { data: exams, status: examsStatus } = useAppSelector(
    (s: any) => s.exams,
  );
  const { data: studentsRaw, status: studentsStatus } = useAppSelector(
    (s: any) => s.students,
  );
  const { data: teachers, status: teachersStatus } = useAppSelector(
    (s: any) => s.teachers,
  );
  const savedClasses = useAppSelector((s: any) => s.appSettings.classes);
  const savedSessions =
    useAppSelector((s: any) => s.appSettings.sessions) || [];
  const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);
  const savedCategories = useAppSelector(
    (s: any) => s.appSettings.examCategories,
  );
  const savedTitles = useAppSelector((s: any) => s.appSettings.examTitles);
  const examSettingsStatus = useAppSelector(
    (s: any) => s.appSettings.examSettingsStatus,
  );
  const groups = useAppSelector((s: any) => s.appSettings.groups) || [];
  const groupsStatus = useAppSelector((s: any) => s.appSettings.groupsStatus);

  const loading =
    examsStatus === "loading" ||
    examsStatus === "idle" ||
    studentsStatus === "loading" ||
    teachersStatus === "loading" ||
    examSettingsStatus === "loading";

  // Students slice uses `id` for uid, but ExamsPage expects fallback arrays.
  // The Redux slice already normalizes fatherName, email, etc.
  const students = useMemo(
    () =>
      studentsRaw.map((s: any) => ({
        ...s,
        studentId: s.id,
        grade: s.grade || s.class || "",
        gender: s.gender || "",
        rollno: s.rollno || s.studentId || "",
      })),
    [studentsRaw],
  );

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterTestNo, setFilterTestNo] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [visibleCount, setVisibleCount] = useState(200);

  // Modals
  const [choiceModal, setChoiceModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [titleModal, setTitleModal] = useState(false);
  const [classModal, setClassModal] = useState(false);
  const [sessionModal, setSessionModal] = useState(false);
  const [summaryModal, setSummaryModal] = useState(false);
  const [summaryTab, setSummaryTab] = useState<"overview" | "toppers">(
    "overview",
  );

  // Subjects State
  const [savedSubjects, setSavedSubjects] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("school_saved_subjects");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SUBJECTS;
  });
  const [newSubjectInput, setNewSubjectInput] = useState("");

  const handleAddSavedSubject = () => {
    const val = newSubjectInput.trim();
    if (!val) return;
    if (savedSubjects.some((s) => s.toLowerCase() === val.toLowerCase()))
      return alert("Subject already exists");
    const updated = [...savedSubjects, val];
    setSavedSubjects(updated);
    localStorage.setItem("school_saved_subjects", JSON.stringify(updated));
    setNewSubjectInput("");
  };

  const handleDeleteSavedSubject = (subjectToRemove: string) => {
    if (!confirm(`Delete ${subjectToRemove}?`)) return;
    const updated = savedSubjects.filter((s) => s !== subjectToRemove);
    setSavedSubjects(updated);
    localStorage.setItem("school_saved_subjects", JSON.stringify(updated));
  };

  // Categories State
  const [newCategoryInput, setNewCategoryInput] = useState("");

  const handleAddSavedCategory = () => {
    const val = newCategoryInput.trim();
    if (!val) return;
    if (
      savedCategories.some((s: string) => s.toLowerCase() === val.toLowerCase())
    )
      return alert("Test type already exists");
    const updated = [...savedCategories, val];
    dispatch(persistExamSettings({ categories: updated, titles: savedTitles }));
    setNewCategoryInput("");
  };

  const handleDeleteSavedCategory = (categoryToRemove: string) => {
    if (!confirm(`Delete ${categoryToRemove}?`)) return;
    const updated = savedCategories.filter(
      (s: string) => s !== categoryToRemove,
    );
    dispatch(persistExamSettings({ categories: updated, titles: savedTitles }));
  };

  // Titles (Test Numbers) State
  const [newTitleInput, setNewTitleInput] = useState("");

  const handleAddSavedTitle = () => {
    const val = newTitleInput.trim();
    if (!val) return;
    if (savedTitles.some((s: string) => s.toLowerCase() === val.toLowerCase()))
      return alert("Test Number already exists");
    const updated = [...savedTitles, val];
    dispatch(
      persistExamSettings({ categories: savedCategories, titles: updated }),
    );
    setNewTitleInput("");
  };

  const handleDeleteSavedTitle = (titleToRemove: string) => {
    if (!confirm(`Delete ${titleToRemove}?`)) return;
    const updated = savedTitles.filter((s: string) => s !== titleToRemove);
    dispatch(
      persistExamSettings({ categories: savedCategories, titles: updated }),
    );
  };

  // Classes — now driven by Redux (appSettings/classes in Firestore via SettingsPage)

  const [newSessionInput, setNewSessionInput] = useState("");
  const handleAddSavedSession = () => {
    const val = newSessionInput.trim();
    if (!val) return;
    if (
      savedSessions.some((s: string) => s.toLowerCase() === val.toLowerCase())
    )
      return alert("Session already exists");
    dispatch(persistSessions([...savedSessions, val]));
    setNewSessionInput("");
  };

  const handleDeleteSavedSession = (sessToRemove: string) => {
    if (!confirm(`Delete ${sessToRemove}?`)) return;
    dispatch(
      persistSessions(savedSessions.filter((s: string) => s !== sessToRemove)),
    );
  };

  const [newClassInput, setNewClassInput] = useState("");

  const handleAddSavedClass = () => {
    // Classes are managed in Settings > Manage Classes
    // This modal is read-only in ExamsPage; use Settings to add/remove classes
  };

  const handleDeleteSavedClass = (_classToRemove: string) => {
    // Classes are managed in Settings > Manage Classes
  };

  // Bulk Entry State
  const [isBulkEntryMode, setIsBulkEntryMode] = useState(false);
  const [bulkColWidth, setBulkColWidth] = useState(100);
  const [bulkClass, setBulkClass] = useState("");
  const [bulkTestNo, setBulkTestNo] = useState("");
  const [bulkCategory, setBulkCategory] = useState(CATEGORIES[0]);
  const [bulkDate, setBulkDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [bulkSubjects, setBulkSubjects] = useState<
    { name: string; maxMarks: string }[]
  >([]);
  const [downloadingResults, setDownloadingResults] = useState(false);
  const [captureBatch, setCaptureBatch] = useState<any[] | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [bulkData, setBulkData] = useState<Record<string, string>>({}); // Key: rollNo_subjectName
  const [newBulkSubject, setNewBulkSubject] = useState("");
  const [newBulkTotalMarks, setNewBulkTotalMarks] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkGender, setBulkGender] = useState("");

  const [editingExam, setEditingExam] = useState<ExamEntry | null>(null);
  const [selectedStudentData, setSelectedStudentData] =
    useState<StudentProgress | null>(null); // For details modal/sheet

  // Student Details Spreadsheet State
  const [detailSubjects, setDetailSubjects] = useState<
    { name: string; maxMarks: string }[]
  >([]);
  const [detailData, setDetailData] = useState<Record<string, string>>({}); // Key: testNo_subjectName
  const [newDetailSubject, setNewDetailSubject] = useState("");
  const [newDetailTotalMarks, setNewDetailTotalMarks] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  // Selection State
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Form States
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [rollNo, setRollNo] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [description, setDescription] = useState("");

  // Multi-book state
  const [entryBooks, setEntryBooks] = useState<BookEntry[]>([]);
  const [currentBookName, setCurrentBookName] = useState("");
  const [currentTotalMarks, setCurrentTotalMarks] = useState("");
  const [currentObtainedMarks, setCurrentObtainedMarks] = useState("");

  // Active Tab in Form
  const [activeTab, setActiveTab] = useState<"info" | "marks">("info");

  useEffect(() => {
    let unsubscribeExams: (() => void) | undefined;
    if (examsStatus === "idle") {
      unsubscribeExams = initExamsListener(dispatch);
    }
    if (studentsStatus === "idle") dispatch(fetchStudents());
    if (teachersStatus === "idle") dispatch(fetchTeachers());
    if (classesStatus === "idle") dispatch(fetchClasses());
    if (groupsStatus === "idle" || !groupsStatus) dispatch(fetchGroups());
    if (examSettingsStatus === "idle") dispatch(fetchExamSettings());

    return () => {
      if (unsubscribeExams) unsubscribeExams();
    };
  }, [
    examsStatus,
    studentsStatus,
    teachersStatus,
    classesStatus,
    groupsStatus,
    examSettingsStatus,
    dispatch,
  ]);

  // ── Data Processing via RTK Selectors ───────────────────────────────────────────────

  const filters = useMemo(
    () => ({
      searchTerm,
      filterClass,
      filterTestNo,
      filterCategory,
      filterGender,
      filterSession,
      filterSubject,
      filterGroup,
    }),
    [
      searchTerm,
      filterClass,
      filterTestNo,
      filterCategory,
      filterGender,
      filterSession,
      filterSubject,
      filterGroup,
    ],
  );

  const filteredExams = useAppSelector((state) =>
    selectFilteredExams(state, filters),
  );
  const studentProgressList = useAppSelector((state) =>
    selectStudentProgressList(state, students, filters),
  );

  // ── Bulk Entry Logic ────────────────────────────────────────────────────────

  const bulkFilters = useMemo(
    () => ({
      bulkClass,
      bulkTestNo,
      bulkCategory,
    }),
    [bulkClass, bulkTestNo, bulkCategory],
  );

  const rtkBulkData = useAppSelector((state) =>
    selectBulkEntryData(state, bulkFilters),
  );

  useEffect(() => {
    if (!isBulkEntryMode || !bulkTestNo) return;
    setBulkSubjects(sortBooksSequence([...rtkBulkData.bulkSubjects]));
    setBulkData(rtkBulkData.existingData as any);
    // If there are relevant exams, maybe update the date/category
  }, [
    isBulkEntryMode,
    bulkTestNo,
    bulkClass,
    bulkCategory,
    JSON.stringify(rtkBulkData),
  ]);

  const handleAddBulkSubject = () => {
    if (!newBulkSubject.trim() || !newBulkTotalMarks.trim()) {
      alert("Enter subject name and total marks.");
      return;
    }
    if (
      bulkSubjects.some(
        (s) => s.name.toLowerCase() === newBulkSubject.trim().toLowerCase(),
      )
    ) {
      alert("Subject already exists.");
      return;
    }
    setBulkSubjects([
      ...bulkSubjects,
      { name: newBulkSubject.trim(), maxMarks: newBulkTotalMarks.trim() },
    ]);
    setNewBulkSubject("");
    setNewBulkTotalMarks("");
  };

  // ── Student Details Spreadsheet Logic ───────────────────────────────────────
  const detailFilters = useMemo(
    () => ({
      rollNo: selectedStudentData?.rollNo,
      studentName: selectedStudentData?.studentName,
      filterCategory,
      filterTestNo,
      filterSubject,
    }),
    [
      selectedStudentData?.rollNo,
      selectedStudentData?.studentName,
      filterCategory,
      filterTestNo,
      filterSubject,
    ],
  );

  const rtkResultDetails = useAppSelector((state) =>
    selectResultDetails(state, detailFilters),
  );

  useEffect(() => {
    if (!selectedStudentData) return;
    setDetailSubjects(sortBooksSequence(rtkResultDetails.detailSubjects));
    setDetailData(rtkResultDetails.existingData as any);
  }, [selectedStudentData, JSON.stringify(rtkResultDetails)]);

  const handleAddDetailSubject = () => {
    if (!newDetailSubject.trim() || !newDetailTotalMarks.trim()) {
      alert("Enter subject name and total marks.");
      return;
    }
    if (
      detailSubjects.some(
        (s) => s.name.toLowerCase() === newDetailSubject.trim().toLowerCase(),
      )
    ) {
      alert("Subject already exists.");
      return;
    }
    setDetailSubjects([
      ...detailSubjects,
      { name: newDetailSubject.trim(), maxMarks: newDetailTotalMarks.trim() },
    ]);
    setNewDetailSubject("");
    setNewDetailTotalMarks("");
  };

  const handleSaveStudentDetails = async () => {
    if (!selectedStudentData) return;
    setDetailLoading(true);

    const rollNo = selectedStudentData.rollNo;
    const studentName = selectedStudentData.studentName;
    const studentClass = selectedStudentData.studentClass;
    const studentEmail = selectedStudentData.studentEmail;
    let updateCount = 0;

    try {
      const baseTitles = filterTestNo
        ? [filterTestNo]
        : savedTitles.length > 0
          ? savedTitles
          : TITLE_OPTIONS;
      let rowsToProcess = baseTitles;
      if (!filterCategory) {
        const cats = savedCategories.length > 0 ? savedCategories : CATEGORIES;
        rowsToProcess = [];
        cats.forEach((c: string) => {
          baseTitles.forEach((t: string) => rowsToProcess.push(`${c} - ${t}`));
        });
      }

      for (const rowId of rowsToProcess) {
        let testNo = rowId;
        let category = filterCategory || CATEGORIES[0];

        if (!filterCategory) {
          const parts = rowId.split(" - ");
          if (parts.length === 2) {
            category = parts[0];
            testNo = parts[1];
          }
        }

        const testBooks: BookEntry[] = [];
        let totalObtained = 0;
        let totalPossible = 0;

        detailSubjects.forEach((sub) => {
          const val = detailData[`${rowId}_${sub.name}`];
          // @ts-ignore
          if (val && val.trim() !== "") {
            testBooks.push({
              name: sub.name,
              totalMarks: sub.maxMarks,
              // @ts-ignore
              obtainedMarks: val.trim(),
            });
            // @ts-ignore
            totalObtained += parseFloat(val) || 0;
            totalPossible += parseFloat(sub.maxMarks) || 0;
          }
        });

        const existingAll = exams.filter(
          (e: any) =>
            (e.rollNo === rollNo || e.studentName === studentName) &&
            e.title === testNo &&
            e.category === category,
        );
        const existing = existingAll[0];

        if (testBooks.length > 0) {
          const computedStatus =
            totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40
              ? "Pass"
              : "Fail";
          const docId = existing
            ? existing.id
            : `${category}_${studentClass}_${testNo}_${rollNo}`.replace(
                /\s+/g,
                "_",
              );

          const formattedDate =
            existing?.date || format(new Date(), "dd MMM yyyy");
          const examData = {
            id: docId,
            title: testNo,
            date: formattedDate,
            category: category,
            rollNo,
            studentName,
            studentEmail: (studentEmail || "").toLowerCase(),
            studentClass,
            books: sortBooksSequence(testBooks),
            totalMarks: totalPossible.toString(),
            obtainedMarks: totalObtained.toString(),
            status: computedStatus,
            description: existing?.description || "Details Uploaded Record",
          };

          dispatch(saveExam(examData as any));
          updateCount++;

          // Clean up any duplicates that might have caused ghost subjects
          for (let i = 1; i < existingAll.length; i++) {
            dispatch(deleteExam(existingAll[i].id));
          }
        } else if (existingAll.length > 0) {
          // Completely empty test, remove all related records
          existingAll.forEach((ex: any) => {
            dispatch(deleteExam(ex.id));
          });
          updateCount++;
        }
      }
      alert(
        `Successfully queued ${updateCount} test records for ${studentName}!`,
      );
    } catch (e) {
      console.error(e);
      alert("Failed to save student details");
    }

    setDetailLoading(false);
  };

  const handleSaveBulk = async () => {
    if (!bulkTestNo) {
      alert("Please select a Test No to save bulk data.");
      return;
    }
    setBulkLoading(true);

    const targetStudents = students.filter((s: any) => {
      const g = (s.grade || s.class || "").toLowerCase().trim();
      const matchClass = !bulkClass || g === bulkClass.toLowerCase().trim();
      return matchClass;
    });
    const formattedDate = format(new Date(bulkDate), "dd MMM yyyy");

    const examsToSave: any[] = [];

    try {
      for (const student of targetStudents) {
        const rollNo = student.studentId || student.rollno || student.id || "";
        const studentClassToSave = student.grade || student.class || "";

        // Collect all books that have an obtained mark filled in
        const studentBooks: BookEntry[] = [];
        let totalObtained = 0;
        let totalPossible = 0;

        bulkSubjects.forEach((sub) => {
          const val = bulkData[`${rollNo}_${sub.name}`];
          if (val && val.trim() !== "") {
            studentBooks.push({
              name: sub.name,
              totalMarks: sub.maxMarks,
              obtainedMarks: val.trim(),
            });
            totalObtained += parseFloat(val) || 0;
            totalPossible += parseFloat(sub.maxMarks) || 0;
          }
        });

        const existing = exams.find(
          (e: any) =>
            e.rollNo === rollNo &&
            e.title === bulkTestNo &&
            String(e.studentClass || "")
              .replace(/^class\s+/i, "")
              .trim()
              .toLowerCase() ===
              String(studentClassToSave)
                .replace(/^class\s+/i, "")
                .trim()
                .toLowerCase() &&
            e.category === bulkCategory,
        );

        // Only save if the student has at least one subject filled
        if (studentBooks.length > 0) {
          const computedStatus =
            totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40
              ? "Pass"
              : "Fail";
          const adminClass = String(studentClassToSave)
                .replace(/^class\s+/i, "")
            .trim();
          const docId = existing
            ? existing.id
            : `${bulkCategory}_${adminClass}_${bulkTestNo}_${rollNo}`.replace(
                /\s+/g,
                "_",
              );

          examsToSave.push({
            id: docId,
            title: bulkTestNo,
            date: formattedDate,
            category: bulkCategory,
            rollNo: rollNo,
            studentName: student.name,
            studentEmail: (student.email || "").toLowerCase(),
            studentClass: adminClass,
            books: sortBooksSequence(studentBooks),
            totalMarks: totalPossible.toString(),
            obtainedMarks: totalObtained.toString(),
            status: computedStatus,
            description: "Bulk Uploaded Record",
          });
        } else if (existing) {
          dispatch(deleteExam(existing.id));
        }
      }

      if (examsToSave.length > 0) {
        await dispatch(saveBulkExams({ examDataArray: examsToSave }));
        alert(`Successfully saved records for ${examsToSave.length} students!`);
      } else {
        alert("No data entered to save.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to queue bulk data");
    }

    setBulkLoading(false);
  };

  const handleDeleteSubjectBulk = async (subjectName: string) => {
    if (!bulkClass || !bulkCategory || !bulkTestNo) return;

    const targetExams = exams.filter((e: any) => {
      const eClass = String(e.studentClass || "")
        .replace(/^class\s+/i, "")
        .trim()
        .toLowerCase();
      const bClass = (bulkClass || "")
        .replace(/^class\s+/i, "")
        .trim()
        .toLowerCase();
      const eCategory = (e.category || "").trim().toLowerCase();
      const bCategory = (bulkCategory || "").trim().toLowerCase();
      const eTitle = (e.title || "").trim().toLowerCase();
      const bTitle = (bulkTestNo || "").trim().toLowerCase();
      return eClass === bClass && eCategory === bCategory && eTitle === bTitle;
    });

    if (targetExams.length === 0) return;

    setBulkLoading(true);
    const subjectLower = subjectName.trim().toLowerCase();
    let updatedCount = 0;
    let deletedCount = 0;

    try {
      for (const exam of targetExams) {
        if (exam.books && exam.books.length > 0) {
          const updatedBooks = exam.books.filter(
            (b: any) => b.name.trim().toLowerCase() !== subjectLower,
          );
          if (updatedBooks.length !== exam.books.length) {
            if (updatedBooks.length === 0) {
              dispatch(deleteExam(exam.id));
              deletedCount++;
            } else {
              let totMarks = 0;
              let obtMarks = 0;
              updatedBooks.forEach((b: any) => {
                totMarks += parseFloat(b.totalMarks) || 0;
                obtMarks += parseFloat(b.obtainedMarks) || 0;
              });
              const status =
                totMarks > 0 && (obtMarks / totMarks) * 100 >= 40
                  ? "Pass"
                  : "Fail";
              dispatch(
                saveExam({
                  ...exam,
                  books: updatedBooks,
                  totalMarks: totMarks.toString(),
                  obtainedMarks: obtMarks.toString(),
                  status,
                } as any),
              );
              updatedCount++;
            }
          }
        }
      }
      alert(
        `Deleted "${subjectName}" from ${updatedCount} records. Removed ${deletedCount} empty records entirely.`,
      );
    } catch (e) {
      console.error(e);
      alert("Error deleting subject data.");
    }
    setBulkLoading(false);
  };

  const handleDeleteBulk = async () => {
    if (!bulkClass || !bulkCategory || !bulkTestNo) {
      alert("Please select Class, Test Type, and Test No to delete records.");
      return;
    }

    const targetExams = exams.filter((e: any) => {
      const eClass = String(e.studentClass || "")
        .replace(/^class\s+/i, "")
        .trim()
        .toLowerCase();
      const bClass = (bulkClass || "")
        .replace(/^class\s+/i, "")
        .trim()
        .toLowerCase();
      const eCategory = (e.category || "").trim().toLowerCase();
      const bCategory = (bulkCategory || "").trim().toLowerCase();
      const eTitle = (e.title || "").trim().toLowerCase();
      const bTitle = (bulkTestNo || "").trim().toLowerCase();
      return eClass === bClass && eCategory === bCategory && eTitle === bTitle;
    });

    if (targetExams.length === 0) {
      alert(
        "No saved records found for the selected Class, Test Type, and Test No to delete.",
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to permanently delete ALL saved records for ${bulkClass} - ${bulkCategory} - ${bulkTestNo}? This action cannot be undone and will delete records for ${targetExams.length} students.`,
      )
    ) {
      return;
    }

    setBulkLoading(true);
    try {
      for (const exam of targetExams) {
        dispatch(deleteExam(exam.id));
      }
      alert(`Successfully deleted ${targetExams.length} records.`);
    } catch (e) {
      console.error(e);
      alert("An error occurred while deleting records.");
    }
    setBulkLoading(false);
  };

  const handleDownloadBulkResults = async (mode?: any) => {
    const isToppers = typeof mode === "string" && mode === "toppers";
    const activeClass = isBulkEntryMode ? bulkClass : filterClass;
    const activeCategory = isBulkEntryMode ? bulkCategory : filterCategory;
    const activeTestNo = isBulkEntryMode ? bulkTestNo : filterTestNo;
    const activeGender = isBulkEntryMode ? bulkGender : filterGender;
    const activeDate = isBulkEntryMode ? bulkDate : new Date().toISOString().split("T")[0];

    if (isBulkEntryMode) {
      if (!activeClass || !activeCategory || !activeTestNo) {
        alert("Please select Class, Test Type, and Test No to generate cards.");
        return;
      }
    } else if (!isToppers) {
      const hasSpecificFilters = filterClass && filterCategory && filterTestNo;
      const hasSearch = !!searchTerm;
      if (selectedStudents.length === 0 && !hasSpecificFilters && !hasSearch) {
        alert("Please select Class, Test Type, and Test No, or select specific students to generate cards.");
        return;
      }
    }

    setDownloadingResults(true);

    setTimeout(() => {
      try {
        let targetStudents: any[] = [];
        let testExams: any[] = [];

        if (isBulkEntryMode) {
          targetStudents = students.filter((s: any) => {
            const g = (s.grade || s.class || "").toLowerCase().trim();
            const matchClass = !activeClass || g === activeClass.toLowerCase().trim();
            if (!activeGender) return matchClass;
            const gv = (s.gender || "").toLowerCase().trim();
            const isMale = gv === "male" || gv === "m" || gv === "boy";
            const isFemale = gv === "female" || gv === "f" || gv === "girl";
            const matchGender = activeGender === "Male" ? isMale : isFemale;
            return matchClass && matchGender;
          });

          if (selectedStudents.length > 0) {
            targetStudents = targetStudents.filter((s: any) =>
              selectedStudents.includes(s.studentId) || selectedStudents.includes(s.rollno) || selectedStudents.includes(s.id)
            );
          }

          testExams = exams.filter((e: any) => {
            const eClass = String(e.studentClass || "").replace(/^class\s+/i, "").trim().toLowerCase();
            const bClass = String(activeClass || "").replace(/^class\s+/i, "").trim().toLowerCase();
            const eCategory = (e.category || "").trim().toLowerCase();
            const bCategory = (activeCategory || "").trim().toLowerCase();
            const eTitle = (e.title || "").trim().toLowerCase();
            const bTitle = (activeTestNo || "").trim().toLowerCase();
            return eClass === bClass && eCategory === bCategory && eTitle === bTitle;
          });
        } else if (isToppers) {
          const classGroups: Record<string, typeof studentProgressList> = {};
          studentProgressList.forEach((s) => {
            const clsName = s.studentClass || "Unknown";
            const sec = s.section ? ` (${s.section})` : "";
            const cls = `${clsName}${sec}`;
            if (!classGroups[cls]) classGroups[cls] = [];
            classGroups[cls].push(s);
          });
          const sortedClasses = Object.keys(classGroups).sort();
          let targetSpList: any[] = [];
          sortedClasses
            .filter((cls) => {
              let match = true;
              if (filterClass) {
                match = match && cls.toLowerCase().startsWith(filterClass.toLowerCase());
              }
              if (filterGroup) {
                match = match && (cls.includes(`(${filterGroup})`) || cls.trim() === filterGroup);
              }
              return match;
            })
            .forEach((cls) => {
              const classStudents = classGroups[cls]
                .filter((s) => s.obtainedMarks > 0)
                .sort((a, b) => b.obtainedMarks - a.obtainedMarks);
              
              let currentRank = 1;
              let previousMarks = -1;
              const rankedStudents = classStudents.map((s, idx) => {
                if (idx > 0 && s.obtainedMarks < previousMarks) {
                  currentRank++;
                }
                previousMarks = s.obtainedMarks;
                return { ...s, rank: currentRank };
              });

              const topStudents = rankedStudents.filter((s: any) => s.rank <= 3);
              targetSpList = [...targetSpList, ...topStudents];
            });

          targetStudents = targetSpList.map(sp => {
            const student = students.find((s: any) => 
                s.rollno === sp.rollNo || s.studentId === sp.rollNo || s.id === sp.rollNo
            );
            return student || { ...sp, studentId: sp.rollNo, name: sp.studentName };
          });
          
          testExams = targetSpList.map(sp => {
            const studentExams = exams.filter((e: any) => 
              (e.rollNo && e.rollNo === sp.rollNo) || 
              (e.studentName && e.studentName === sp.studentName)
            );
            let matchingExams = studentExams;
            if (filterCategory) {
              const cat = filterCategory.trim().toLowerCase();
              matchingExams = matchingExams.filter((e: any) => (e.category || '').trim().toLowerCase() === cat);
            }
            if (filterTestNo) {
              const tno = filterTestNo.trim().toLowerCase();
              matchingExams = matchingExams.filter((e: any) => (e.title || '').trim().toLowerCase() === tno);
            }
            matchingExams.sort((a: any, b: any) => (b.title || '').localeCompare(a.title || ''));
            return matchingExams.length > 0 ? matchingExams[0] : sp.latestExam;
          }).filter(Boolean);
        } else {
          const filteredProgress = selectedStudents.length > 0
            ? studentProgressList.filter(sp => selectedStudents.includes(sp.rollNo))
            : studentProgressList.slice(0, visibleCount);

          targetStudents = filteredProgress.map(sp => {
            const student = students.find((s: any) => 
                s.rollno === sp.rollNo || s.studentId === sp.rollNo || s.id === sp.rollNo
            );
            return student || { ...sp, studentId: sp.rollNo, name: sp.studentName };
          });
          
          testExams = filteredProgress.map(sp => {
            const studentExams = exams.filter((e: any) => 
              (e.rollNo && e.rollNo === sp.rollNo) || 
              (e.studentName && e.studentName === sp.studentName)
            );

            let matchingExams = studentExams;
            if (filterCategory) {
              const cat = filterCategory.trim().toLowerCase();
              matchingExams = matchingExams.filter((e: any) => (e.category || '').trim().toLowerCase() === cat);
            }
            if (filterTestNo) {
              const tno = filterTestNo.trim().toLowerCase();
              matchingExams = matchingExams.filter((e: any) => (e.title || '').trim().toLowerCase() === tno);
            }

            matchingExams.sort((a: any, b: any) => (b.title || '').localeCompare(a.title || ''));
            
            return matchingExams.length > 0 ? matchingExams[0] : sp.latestExam;
          }).filter(Boolean);
        }

        const peerRankings = exams
          .filter((ex: any) => {
            if (filterClass) {
              const exCls = (ex.studentClass || ex.class || "").replace(/^class\s+/i, "").trim().toLowerCase();
              const fltCls = filterClass.replace(/^class\s+/i, "").trim().toLowerCase();
              if (exCls !== fltCls) return false;
            }
            if (filterTestNo) {
              if ((ex.title || "").trim().toLowerCase() !== filterTestNo.trim().toLowerCase()) return false;
            }
            if (filterCategory) {
              if ((ex.category || "").trim().toLowerCase() !== filterCategory.trim().toLowerCase()) return false;
            }
            return true;
          })
          .map((ex: any) => {
            let obt = 0;
            let tot = 0;
            if (ex.books) {
              obt = ex.books.reduce(
                (sum: number, b: any) => sum + (parseFloat(b.obtainedMarks) || 0),
                0,
              );
              tot = ex.books.reduce(
                (sum: number, b: any) => sum + (parseFloat(b.totalMarks) || 0),
                0,
              );
            } else {
              obt = parseFloat(ex.obtainedMarks) || 0;
              tot = parseFloat(ex.totalMarks) || 0;
            }

            const rollNoOrId = ex.rollNo || ex.studentEmail || ex.studentName || "";
            const stuIdLow = String(rollNoOrId).toLowerCase();
            const studentRecord = students.find((s: any) => 
               String(s.studentId || "").toLowerCase() === stuIdLow || 
               String(s.rollno || "").toLowerCase() === stuIdLow ||
               String(s.id || "").toLowerCase() === stuIdLow
            );
            const group = studentRecord?.section || "";

            return {
              id: rollNoOrId,
              percentage: tot > 0 ? (obt / tot) * 100 : 0,
              obtained: obt,
              group: group,
            };
          })
          .sort((a: any, b: any) => {
            if (b.obtained !== a.obtained) return b.obtained - a.obtained;
            return b.percentage - a.percentage;
          });

        const getGradeAndRemarks = (percentage: number) => {
          if (percentage >= 90) return { grade: "A+", remarks: "Excellent" };
          if (percentage >= 80) return { grade: "A", remarks: "Very Good" };
          if (percentage >= 70) return { grade: "B", remarks: "Good" };
          if (percentage >= 60) return { grade: "C", remarks: "Satisfactory" };
          if (percentage >= 50) return { grade: "D", remarks: "Needs Improvement" };
          if (percentage >= 40) return { grade: "E", remarks: "Hard work" };
          return { grade: "Fail", remarks: "Hard work" };
        };

        const cardsData = targetStudents
          .map((student: any) => {
            const sId = (student.studentId || "").toString().trim().toLowerCase();
            const sRoll = (student.rollno || "").toString().trim().toLowerCase();

            const studentExams = testExams.filter((e: any) => {
              const eRoll = (e.rollNo || "").toString().trim().toLowerCase();
              return eRoll === sId || eRoll === sRoll;
            });

            if (studentExams.length === 0) return null;
            
            const studentExam = studentExams[0]; 

            let totalObtained = 0;
            let totalPossible = 0;
            let subjects: any[] = [];

            studentExams.forEach((examDoc: any) => {
              if (examDoc.books && examDoc.books.length > 0) {
                examDoc.books.forEach((b: any) => {
                  const obt = parseFloat(b.obtainedMarks) || 0;
                  const tot = parseFloat(b.totalMarks) || 0;
                  const perc = tot > 0 ? (obt / tot) * 100 : 0;
                  totalObtained += obt;
                  totalPossible += tot;
                  subjects.push({ ...b, percentage: perc, ...getGradeAndRemarks(perc) });
                });
              } else if (examDoc.bookName || examDoc.subject) {
                const obt = parseFloat(examDoc.obtainedMarks) || 0;
                const tot = parseFloat(examDoc.totalMarks) || 0;
                const perc = tot > 0 ? (obt / tot) * 100 : 0;
                totalObtained += obt;
                totalPossible += tot;
                subjects.push({ 
                  name: examDoc.bookName || examDoc.subject, 
                  totalMarks: examDoc.totalMarks, 
                  obtainedMarks: examDoc.obtainedMarks, 
                  percentage: perc, 
                  ...getGradeAndRemarks(perc) 
                });
              }
            });

            const overallPerc =
              totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;

            let position = "-";
            const stuIdLow = String(
              student.studentId ||
              student.rollno ||
              ""
            ).toLowerCase();
            
            const studentGroup = student.section || "";
            const groupPeerRankings = peerRankings.filter((r: any) => r.group === studentGroup);

            let currentRank = 1;
            let previousObtained = -1;
            const rankedGroupList = groupPeerRankings.map((item: any, index: number) => {
              if (index > 0 && item.obtained < previousObtained) {
                currentRank++;
              }
              previousObtained = item.obtained;
              return { ...item, rank: currentRank };
            });

            const myRecord = rankedGroupList.find(
              (r: any) => String(r.id || "").toLowerCase() === stuIdLow,
            );
            
            if (myRecord) {
              let posStr = myRecord.rank.toString();
              if (posStr.endsWith("1") && posStr !== "11") posStr += "st";
              else if (posStr.endsWith("2") && posStr !== "12") posStr += "nd";
              else if (posStr.endsWith("3") && posStr !== "13") posStr += "rd";
              else posStr += "th";
              position = posStr;
            }

            return {
              student,
              examDate: studentExam.date || activeDate,
              testCategory: studentExam.category || activeCategory || "Test",
              testTitle: studentExam.title || activeTestNo || "",
              studentClass: studentExam.studentClass || studentExam.class || student.class || student.grade || activeClass || "",
              session: student.session || studentExam.session || "2026-2027",
              subjects,
              totalObtained,
              totalPossible,
              overallPerc,
              gradeRes: getGradeAndRemarks(overallPerc),
              position,
            };
          })
          .filter(Boolean);

        if (cardsData.length === 0) {
          alert("No saved exam records found for the selected students.");
          return;
        }

        setCaptureBatch(cardsData);
        setShowPreviewModal(true);
      } catch (err: any) {
        console.error("Error generating preview cards:", err);
        alert(`An error occurred while generating result cards preview: ${err.message}\n${err.stack}`);
      } finally {
        setDownloadingResults(false);
      }
    }, 50);
  };

  const confirmDownloadPreview = () => {
    if (!captureBatch) return;
    setDownloadingResults(true);

    // Give React time to render the hidden items in the DOM if needed
    setTimeout(async () => {
      try {
        const zip = new JSZip();
        const container = document.getElementById(
          "capture-templates-container",
        );
        if (container) {
          for (let i = 0; i < captureBatch.length; i++) {
            const element = document.getElementById(`result-card-${i}`);
            if (element) {
              const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
              });
              const card = captureBatch[i];
              if (!card) continue;
              const sName = (
                card.student.fullname ||
                card.student.name ||
                "Unknown"
              ).replace(/[^a-zA-Z0-9]/g, "_");
              const sRoll =
                card.student.rollno ||
                card.student.studentId ||
                `STD-UNKNOWN`;

              if (captureBatch.length === 1) {
                canvas.toBlob((blob) => {
                  if (blob) saveAs(blob, `${sRoll}_${sName}.png`);
                });
              } else {
                const imgData = canvas.toDataURL("image/png").split(",")[1];
                zip.file(`${sRoll}_${sName}.png`, imgData, { base64: true });
              }
            }
          }

          if (captureBatch.length > 1) {
            const content = await zip.generateAsync({ type: "blob" });
            const activeClass = isBulkEntryMode ? bulkClass : filterClass;
            const activeCategory = isBulkEntryMode ? bulkCategory : filterCategory;
            const activeTestNo = isBulkEntryMode ? bulkTestNo : filterTestNo;
            saveAs(
              content,
              `Results_${activeClass}_${activeCategory}_${activeTestNo}.zip`,
            );
          }
        }
      } catch (err) {
        console.error("Error generating zip:", err);
        alert("An error occurred while generating result cards.");
      } finally {
        setDownloadingResults(false);
        setCaptureBatch(null);
        setShowPreviewModal(false);
      }
    }, 500); // Small delay to ensure UI updates before freezing
  };

  // ── Form Actions ─────────────────────────────────────────────────────────────

  const resetForm = () => {
    setEditingExam(null);
    setTitle("");
    setDate(new Date().toISOString().split("T")[0]);
    setCategory(CATEGORIES[0]);
    setRollNo("");
    setStudentName("");
    setStudentEmail("");
    setStudentClass("");
    setEntryBooks([]);
    setCurrentBookName("");
    setCurrentTotalMarks("");
    setCurrentObtainedMarks("");
    setDescription("");
    setActiveTab("info");
  };

  const handleAddBook = () => {
    if (
      !currentBookName.trim() ||
      !currentTotalMarks.trim() ||
      !currentObtainedMarks.trim()
    ) {
      alert("Please fill out book name, total marks, and obtained marks.");
      return;
    }
    if (
      entryBooks.some(
        (b) => b.name.toLowerCase() === currentBookName.trim().toLowerCase(),
      )
    ) {
      alert("This subject is already added.");
      return;
    }
    setEntryBooks([
      ...entryBooks,
      {
        name: currentBookName.trim(),
        totalMarks: currentTotalMarks.trim(),
        obtainedMarks: currentObtainedMarks.trim(),
      },
    ]);
    setCurrentBookName("");
    // Retain currentTotalMarks so subsequent subjects default to the same total marks
    setCurrentObtainedMarks("");
  };

  const handleSaveRecord = async () => {
    if (!title || !category || !studentName) {
      alert("Please fill Title, Category, and Student Name");
      return;
    }

    // Format Date to match mobile app's legacy format `DD MMM YYYY`
    const parsedDate = new Date(date);
    const formattedDate = format(parsedDate, "dd MMM yyyy");

    const isDuplicate = exams.some((exam: any) => {
      if (editingExam && exam.id === editingExam.id) return false;
      return (
        exam.title === title &&
        exam.category === category &&
        exam.rollNo === rollNo
      );
    });

    if (isDuplicate) {
      alert("An exam with this Test Type + Test No + Roll No already exists.");
      return;
    }

    let computedStatus = "Absent";
    let totalObtained = 0;
    let totalPossible = 0;

    if (entryBooks.length > 0) {
      entryBooks.forEach((book) => {
        totalObtained += parseFloat(book.obtainedMarks) || 0;
        totalPossible += parseFloat(book.totalMarks) || 0;
      });
      if (totalPossible > 0) {
        computedStatus =
          (totalObtained / totalPossible) * 100 >= 40 ? "Pass" : "Fail";
      }
    }

    const docId = editingExam ? editingExam.id : Date.now().toString();
    const examData = {
      id: docId,
      title,
      date: formattedDate, // Store as string like mobile app does
      category,
      rollNo,
      studentName,
      studentEmail,
      studentClass,
      books: entryBooks.length > 0 ? sortBooksSequence(entryBooks) : undefined,
      totalMarks: totalPossible.toString(),
      obtainedMarks: totalObtained.toString(),
      status: computedStatus,
      description,
    };

    try {
      dispatch(saveExam(examData as any));
      setFormModal(false);
    } catch (error) {
      alert("Failed to save entry");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      dispatch(deleteExam(id));
      setDetailsModal(false);
    } catch (e) {
      alert("Failed to delete");
    }
  };

  // ── Excel Upload ────────────────────────────────────────────────────────────

  const handleDownloadTemplate = () => {
    const headerRow = [
      {
        "Roll No": "STD-101",
        "Student Name": "Ahmed Ali",
        Class: "9th",
        "Test No": "T1",
        Category: "Monthly",
        Date: "2024-03-20",
        Email: "ahmed@example.com",
        Urdu_Total: 100,
        Urdu_Obtained: 85,
        English_Total: 100,
        English_Obtained: 72,
        Math_Total: 100,
        Math_Obtained: 90,
        Description: "First Test Example",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(headerRow);

    const wscols = [
      { wch: 15 }, // Roll No
      { wch: 25 }, // Student Name
      { wch: 15 }, // Class
      { wch: 15 }, // Test No
      { wch: 15 }, // Category
      { wch: 15 }, // Date
      { wch: 25 }, // Email
      { wch: 12 },
      { wch: 15 }, // Urdu
      { wch: 15 },
      { wch: 18 }, // English
      { wch: 12 },
      { wch: 15 }, // Math
      { wch: 30 }, // Description
    ];
    ws["!cols"] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exam Template");
    XLSX.writeFile(wb, "Exam_Record_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!Array.isArray(data) || data.length === 0) {
          alert("Invalid or empty excel file");
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const row of data as any[]) {
          try {
            const rollNo =
              row["Roll No"]?.toString() || row["rollNo"]?.toString();
            const studentName =
              row["Student Name"] || row["studentName"] || "Unknown Student";
            const studentClass = row["Class"] || row["studentClass"] || "";
            const title = row["Test No"] || row["title"];
            const category =
              row["Category"] || row["category"] || CATEGORIES[0];
            const dateRaw = row["Date"] || row["date"];
            const email = row["Email"] || row["studentEmail"] || "";
            const description =
              row["Description"] || row["description"] || "Uploaded via Excel";

            if (!rollNo || !title || !studentClass) {
              console.warn(
                "Skipping row missing required fields (Roll No, Test No, Class):",
                row,
              );
              errorCount++;
              continue;
            }

            let formattedDate = format(new Date(), "dd MMM yyyy");
            if (dateRaw) {
              if (typeof dateRaw === "number") {
                const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                const dateObj = new Date(
                  excelEpoch.getTime() + dateRaw * 86400000,
                );
                formattedDate = format(dateObj, "dd MMM yyyy");
              } else {
                formattedDate = format(new Date(dateRaw), "dd MMM yyyy");
              }
            }

            const books: BookEntry[] = [];
            let totalObtained = 0;
            let totalPossible = 0;

            Object.keys(row).forEach((key) => {
              if (key.endsWith("_Total")) {
                const subjectName = key.replace("_Total", "");
                const obtainedKey = `${subjectName}_Obtained`;

                const tMarks = parseFloat(row[key]) || 0;
                const oMarks = parseFloat(row[obtainedKey]) || 0;

                if (tMarks > 0 || oMarks > 0) {
                  books.push({
                    name: subjectName,
                    totalMarks: tMarks.toString(),
                    obtainedMarks: oMarks.toString(),
                  });
                  totalPossible += tMarks;
                  totalObtained += oMarks;
                }
              }
            });

            const computedStatus =
              totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40
                ? "Pass"
                : "Fail";

            const existing = exams.find(
              (e: any) =>
                e.rollNo === rollNo &&
                e.title === title &&
                e.studentClass === studentClass &&
                e.category === category,
            );
            const docId = existing
              ? existing.id
              : Date.now().toString() +
                "_" +
                rollNo +
                "_" +
                title +
                "_" +
                category;

            const examData = {
              id: docId,
              title,
              date: formattedDate,
              category,
              rollNo,
              studentName,
              studentEmail: (email || "").toLowerCase(),
              studentClass,
              books: books.length > 0 ? sortBooksSequence(books) : undefined,
              totalMarks: totalPossible.toString(),
              obtainedMarks: totalObtained.toString(),
              status: computedStatus,
              description,
            };

            dispatch(saveExam(examData as any));
            successCount++;
          } catch (err) {
            console.error("Error processing row:", row, err);
            errorCount++;
          }
        }

        alert(
          `Finished! Successfully imported ${successCount} records. ${errorCount > 0 ? `Failed ${errorCount} records.` : ""}`,
        );
        setUploadModal(false);
      } catch (err) {
        console.error(err);
        alert(
          "Failed to read Excel file or parse data. Please match the template format.",
        );
      }
    };
    reader.readAsBinaryString(file);

    if (e.target) e.target.value = "";
  };

  // ── Result Details Viewer ───────────────────────────────────────────────────

  const openDetailsSheet = (student: StudentProgress) => {
    setSelectedStudentData(student);
  };

  const handleDeleteAllRecords = async () => {
    const examsToDelete = exams.filter((e: any) => {
      const matchClass = !filterClass || e.studentClass === filterClass;
      const matchTestNo = !filterTestNo || e.title === filterTestNo;
      const matchCategory = !filterCategory || e.category === filterCategory;
      const matchSearch =
        !searchTerm ||
        (e.studentName &&
          e.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.rollNo &&
          e.rollNo.toString().toLowerCase().includes(searchTerm.toLowerCase()));

      let matchGender = true;
      if (filterGender) {
        const student = students.find(
          (s: any) =>
            s.rollno === e.rollNo ||
            s.studentId === e.rollNo ||
            s.name === e.studentName,
        );
        if (!student) {
          matchGender = false;
        } else {
          const gv = (student.gender || "").toLowerCase().trim();
          const isMale = gv === "male" || gv === "m" || gv === "boy";
          const isFemale = gv === "female" || gv === "f" || gv === "girl";
          matchGender = filterGender === "Male" ? isMale : isFemale;
        }
      }

      return (
        matchClass && matchTestNo && matchCategory && matchSearch && matchGender
      );
    });

    if (examsToDelete.length === 0)
      return alert("No records match the current filters.");

    let filterStr = [];
    if (filterClass) filterStr.push(`Class: ${filterClass}`);
    if (filterTestNo) filterStr.push(`Test: ${filterTestNo}`);
    if (filterCategory) filterStr.push(`Type: ${filterCategory}`);
    if (searchTerm) filterStr.push(`Search: ${searchTerm}`);
    if (filterGender) filterStr.push(`Gender: ${filterGender}`);

    const filterMsg =
      filterStr.length > 0 ? `(${filterStr.join(", ")})` : "ALL";

    if (
      !confirm(
        `Are you sure you want to clean ${examsToDelete.length} student records matching ${filterMsg}? This action is permanent and cannot be undone.`,
      )
    )
      return;

    const text = prompt('Type "DELETE" to confirm wiping these records:');
    if (text !== "DELETE") return;

    setBulkLoading(true);
    try {
      await Promise.all(
        examsToDelete.map(async (exam: any) => {
          if (exam.id) {
            if (filterSubject && exam.books && exam.books.length > 0) {
              const updatedBooks = exam.books.filter(
                (b: any) => b.name !== filterSubject,
              );
              if (updatedBooks.length === 0) {
                await dispatch(deleteExam(exam.id));
              } else if (updatedBooks.length !== exam.books.length) {
                let tot = 0;
                let obt = 0;
                updatedBooks.forEach((b: any) => {
                  tot += parseFloat(b.totalMarks) || 0;
                  obt += parseFloat(b.obtainedMarks) || 0;
                });
                const status =
                  tot > 0 && (obt / tot) * 100 >= 40 ? "Pass" : "Fail";
                await dispatch(
                  saveExam({
                    ...exam,
                    books: updatedBooks,
                    totalMarks: tot.toString(),
                    obtainedMarks: obt.toString(),
                    status,
                  } as any),
                );
              }
            } else {
              await dispatch(deleteExam(exam.id));
            }
          }
        }),
      );
      alert(`${examsToDelete.length} records deleted successfully.`);
      setSelectedStudents([]);
    } catch (error) {
      console.error(error);
      alert("Error deleting records.");
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelectStudent = (e: React.MouseEvent, rollNo: string) => {
    e.stopPropagation();
    if (selectedStudents.includes(rollNo)) {
      setSelectedStudents(selectedStudents.filter((r) => r !== rollNo));
    } else {
      setSelectedStudents([...selectedStudents, rollNo]);
    }
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudents(studentProgressList.map((s) => s.rollNo));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleExportExams = () => {
    const examsToExport = exams.filter((e: any) => {
      if (selectedStudents.length > 0 && !selectedStudents.includes(e.rollNo))
        return false;

      const matchClass = !filterClass || e.studentClass === filterClass;
      const matchTestNo = !filterTestNo || e.title === filterTestNo;
      const matchCategory = !filterCategory || e.category === filterCategory;
      
      let matchGroup = true;
      if (filterGroup) {
        const student = students.find(
          (s: any) =>
            s.rollno === e.rollNo ||
            s.studentId === e.rollNo ||
            s.id === e.rollNo
        );
        if (student) {
          matchGroup = student.section === filterGroup;
        } else {
          matchGroup = false;
        }
      }
      const matchSearch =
        !searchTerm ||
        (e.studentName &&
          e.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.rollNo &&
          e.rollNo.toString().toLowerCase().includes(searchTerm.toLowerCase()));

      let matchGender = true;
      if (filterGender) {
        const student = students.find(
          (s: any) =>
            s.rollno === e.rollNo ||
            s.studentId === e.rollNo ||
            s.name === e.studentName,
        );
        if (!student) {
          matchGender = false;
        } else {
          const gv = (student.gender || "").toLowerCase().trim();
          const isMale = gv === "male" || gv === "m" || gv === "boy";
          const isFemale = gv === "female" || gv === "f" || gv === "girl";
          matchGender = filterGender === "Male" ? isMale : isFemale;
        }
      }

      return (
        matchClass &&
        matchTestNo &&
        matchCategory &&
        matchSearch &&
        matchGender &&
        matchGroup
      );
    });

    if (examsToExport.length === 0) {
      alert("No matching records found to export.");
      return;
    }

    const flatData = examsToExport.map((e: any) => {
      const student = students.find(
        (s: any) =>
          s.rollno === e.rollNo ||
          s.studentId === e.rollNo ||
          s.name === e.studentName,
      );

      const flat: any = {
        "Roll No": e.rollNo,
        "Student Name": e.studentName,
        "Father Name": student?.fatherName || "",
        Gender: student?.gender || "",
        Class: e.studentClass,
        Session: e.session || student?.session || "",
        "Test No": e.title,
        Category: e.category,
        Date: e.date,
        "Total Marks": e.totalMarks,
        "Obtained Marks": e.obtainedMarks,
        Status: e.status || "",
      };
      if (e.books && Array.isArray(e.books)) {
        e.books.forEach((b: any) => {
          flat[`${b.name} Total`] = b.totalMarks;
          flat[`${b.name} Obtained`] = b.obtainedMarks;
        });
      }
      return flat;
    });

    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Exams");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Exams_Backup_${dateStr}.xlsx`);
  };

  const handleBulkDeleteSelected = async () => {
    if (
      !confirm(
        `Are you sure you want to delete records for ${selectedStudents.length} selected students?`,
      )
    )
      return;

    const examsToDelete = exams.filter((e: any) => {
      if (!selectedStudents.includes(e.rollNo)) return false;

      const matchClass = !filterClass || e.studentClass === filterClass;
      const matchTestNo = !filterTestNo || e.title === filterTestNo;
      const matchCategory = !filterCategory || e.category === filterCategory;
      const matchSearch =
        !searchTerm ||
        (e.studentName &&
          e.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.rollNo &&
          e.rollNo.toString().toLowerCase().includes(searchTerm.toLowerCase()));

      let matchGender = true;
      if (filterGender) {
        const student = students.find(
          (s: any) =>
            s.rollno === e.rollNo ||
            s.studentId === e.rollNo ||
            s.name === e.studentName,
        );
        if (!student) {
          matchGender = false;
        } else {
          const gv = (student.gender || "").toLowerCase().trim();
          const isMale = gv === "male" || gv === "m" || gv === "boy";
          const isFemale = gv === "female" || gv === "f" || gv === "girl";
          matchGender = filterGender === "Male" ? isMale : isFemale;
        }
      }

      return (
        matchClass && matchTestNo && matchCategory && matchSearch && matchGender
      );
    });

    if (examsToDelete.length === 0) {
      alert("No matching records found to delete for selected students.");
      return;
    }

    setBulkLoading(true);
    try {
      await Promise.all(
        examsToDelete.map(async (exam: any) => {
          if (exam.id) {
            if (filterSubject && exam.books && exam.books.length > 0) {
              const updatedBooks = exam.books.filter(
                (b: any) => b.name !== filterSubject,
              );
              if (updatedBooks.length === 0) {
                await dispatch(deleteExam(exam.id));
              } else if (updatedBooks.length !== exam.books.length) {
                let tot = 0;
                let obt = 0;
                updatedBooks.forEach((b: any) => {
                  tot += parseFloat(b.totalMarks) || 0;
                  obt += parseFloat(b.obtainedMarks) || 0;
                });
                const status =
                  tot > 0 && (obt / tot) * 100 >= 40 ? "Pass" : "Fail";
                await dispatch(
                  saveExam({
                    ...exam,
                    books: updatedBooks,
                    totalMarks: tot.toString(),
                    obtainedMarks: obt.toString(),
                    status,
                  } as any),
                );
              }
            } else {
              await dispatch(deleteExam(exam.id));
            }
          }
        }),
      );
      alert(`${examsToDelete.length} records deleted successfully.`);
      setSelectedStudents([]);
    } catch (error) {
      console.error(error);
      alert("Error deleting records.");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div
      className="page"
      style={{
        padding: "0px",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="page-header"
        style={{
          padding: "10px 20px",
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div>
            <div
              style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}
            >
              {isBulkEntryMode ? "📝 Bulk Spreadsheet Entry" : "📊 Results"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 1 }}>
              {isBulkEntryMode
                ? "Rapidly enter marks for an entire class"
                : "Comprehensive tracking of student performance"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!isBulkEntryMode && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "4px 10px",
                }}
              >
                <span style={{ fontSize: 11, color: "var(--text2)" }}>
                  Total
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--primary)",
                  }}
                >
                  {studentProgressList.length}
                </span>
                <span style={{ fontSize: 10, color: "var(--text2)" }}>
                  {filterClass || filterGender ? "found" : "students"}
                </span>
              </div>
            )}
            {!isBulkEntryMode && selectedStudents.length > 0 && (
              <button
                className="btn btn-primary"
                onClick={handleBulkDeleteSelected}
                title="Delete Selected Records"
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  height: 30,
                  background: "#ef4444",
                  borderColor: "#ef4444",
                  color: "#fff",
                }}
                disabled={bulkLoading}
              >
                {bulkLoading ? "..." : `🗑️ Delete (${selectedStudents.length})`}
              </button>
            )}
            {!isBulkEntryMode && (
              <button
                className="btn btn-ghost"
                onClick={() => setSummaryModal(true)}
                title="View Summary for current filters."
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  height: 30,
                  color: "var(--primary)",
                  borderColor: "rgba(59,130,246,0.2)",
                }}
              >
                📊 Summary
              </button>
            )}
            {!isBulkEntryMode && (
              <button
                className="btn btn-ghost"
                onClick={handleExportExams}
                title="Export current exams to Excel."
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  height: 30,
                  color: "#10b981",
                  borderColor: "rgba(16,185,129,0.2)",
                }}
              >
                📥 Export Backup
              </button>
            )}

            <button
              className="btn btn-secondary"
              style={{
                padding: "5px 12px",
                height: 30,
                fontSize: 12,
                background: "#10b981",
                color: "white",
                border: "none",
                display: "flex",
                alignItems: "center"
              }}
              onClick={handleDownloadBulkResults}
              disabled={downloadingResults}
            >
              {downloadingResults
                ? "Generating..."
                : "📥 Download Results"}
            </button>

            <button
              className={`btn ${isBulkEntryMode ? "btn-ghost" : "btn-primary"}`}
              onClick={() => setIsBulkEntryMode(!isBulkEntryMode)}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                height: 30,
                borderColor: "var(--primary)",
                color: isBulkEntryMode ? "var(--primary)" : "#fff",
              }}
            >
              {isBulkEntryMode ? "🔙 Back to Results" : "📝 Bulk Entry"}
            </button>
            {!isBulkEntryMode && (
              <button
                className="btn btn-primary"
                onClick={() => setChoiceModal(true)}
                style={{ padding: "5px 12px", fontSize: 12, height: 30 }}
              >
                ➕ Add
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter / Setup Bar */}
      <div
        className="responsive-filter-bar"
        style={{
          padding: "6px 20px",
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {!isBulkEntryMode ? (
          <>
            <div
              className="search-box"
              style={{
                flex: 1.5,
                background: "var(--bg3)",
                margin: 0,
                height: 30,
                minHeight: "unset",
              }}
            >
              <span className="search-icon" style={{ fontSize: 12 }}>
                🔍
              </span>
              <input
                placeholder="Search student, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: "transparent", fontSize: 12 }}
              />
            </div>
            <div
              style={{ display: "flex", flex: 1, alignItems: "center", gap: 4 }}
            >
              <select
                className="form-input"
                style={{ height: 30, fontSize: 12, padding: "0 8px", flex: 1 }}
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {savedClasses.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                title="Manage Classes"
                style={{ padding: "0 4px", height: 30 }}
                onClick={() => setClassModal(true)}
              >
                ⚙️
              </button>
            </div>
            <div
              style={{ display: "flex", flex: 1, alignItems: "center", gap: 4 }}
            >
              <select
                className="form-input"
                style={{ height: 30, fontSize: 12, padding: "0 8px", flex: 1 }}
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
              >
                <option value="">All Groups</option>
                {groups.map((g: any) => {
                  const grp = g.name || g;
                  return (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  );
                })}
              </select>
            </div>
            <div
              style={{ display: "flex", flex: 1, alignItems: "center", gap: 4 }}
            >
              <select
                className="form-input"
                style={{ height: 30, fontSize: 12, padding: "0 8px", flex: 1 }}
                value={filterTestNo}
                onChange={(e) => setFilterTestNo(e.target.value)}
              >
                <option value="">All Tests</option>
                {savedTitles.map((t: string) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                title="Manage Test Nos"
                style={{ padding: "0 4px", height: 30 }}
                onClick={() => setTitleModal(true)}
              >
                ⚙️
              </button>
            </div>
            <div
              style={{ display: "flex", flex: 1, alignItems: "center", gap: 4 }}
            >
              <select
                className="form-input"
                style={{ height: 30, fontSize: 12, padding: "0 8px", flex: 1 }}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Types</option>
                {savedCategories.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                title="Manage Test Types"
                style={{ padding: "0 4px", height: 30 }}
                onClick={() => setCategoryModal(true)}
              >
                ⚙️
              </button>
            </div>
            <div
              style={{ display: "flex", flex: 1, alignItems: "center", gap: 4 }}
            >
              <select
                className="form-input"
                style={{ height: 30, fontSize: 12, padding: "0 8px", flex: 1 }}
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
              >
                <option value="">All Subjects</option>
                {savedSubjects.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                title="Manage Subjects"
                style={{ padding: "0 4px", height: 30 }}
                onClick={() => setSubjectModal(true)}
              >
                ⚙️
              </button>
            </div>
            <div
              style={{
                display: "flex",
                gap: 2,
                background: "var(--bg3)",
                borderRadius: 6,
                padding: 2,
                border: "1px solid var(--border)",
              }}
            >
              {["", "Male", "Female"].map((g) => (
                <button
                  key={g}
                  onClick={() => setFilterGender(g)}
                  style={{
                    padding: "2px 8px",
                    height: 26,
                    fontSize: 11,
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: filterGender === g ? 700 : 400,
                    background:
                      filterGender === g ? "var(--primary)" : "transparent",
                    color: filterGender === g ? "#fff" : "var(--text2)",
                    transition: "all 0.15s",
                  }}
                >
                  {g === "" ? "All" : g === "Male" ? "👦 Boys" : "👧 Girls"}
                </button>
              ))}
            </div>
            {(searchTerm ||
              filterClass ||
              filterTestNo ||
              filterGender ||
              filterCategory ||
              filterSession ||
              filterSubject) && (
              <button
                className="btn btn-ghost"
                style={{
                  height: 30,
                  fontSize: 11,
                  color: "#ef4444",
                  borderColor: "rgba(239,68,68,0.2)",
                  padding: "0 10px",
                }}
                onClick={() => {
                  setSearchTerm("");
                  setFilterClass("");
                  setFilterTestNo("");
                  setFilterGender("");
                  setFilterCategory("");
                  setFilterSession("");
                  setFilterSubject("");
                }}
              >
                ✕ Clear
              </button>
            )}
          </>
        ) : (
          <>
            <div
              className="search-box"
              style={{
                flex: 1,
                background: "var(--bg3)",
                margin: 0,
                height: 30,
                minHeight: "unset",
              }}
            >
              <span className="search-icon" style={{ fontSize: 12 }}>
                🔍
              </span>
              <input
                placeholder="Search student, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: "transparent", fontSize: 12 }}
              />
            </div>
            <div
              style={{ display: "flex", flex: 1, alignItems: "center", gap: 4 }}
            >
              <select
                className="form-input"
                style={{ height: 30, fontSize: 12, padding: "0 8px", flex: 1 }}
                value={bulkClass}
                onChange={(e) => setBulkClass(e.target.value)}
              >
                <option value="">* Class</option>
                {savedClasses.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                title="Manage Classes"
                style={{ padding: "0 4px", height: 30 }}
                onClick={() => setClassModal(true)}
              >
                ⚙️
              </button>
            </div>
            <div
              style={{ display: "flex", flex: 1, alignItems: "center", gap: 4 }}
            >
              <select
                className="form-input"
                style={{ height: 30, fontSize: 12, padding: "0 8px", flex: 1 }}
                value={bulkTestNo}
                onChange={(e) => setBulkTestNo(e.target.value)}
              >
                <option value="">* Test No</option>
                {savedTitles.map((t: string) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                title="Manage Test Nos"
                style={{ padding: "0 4px", height: 30 }}
                onClick={() => setTitleModal(true)}
              >
                ⚙️
              </button>
            </div>
            <select
              className="form-input"
              style={{ height: 30, fontSize: 12, padding: "0 8px", flex: 1 }}
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              disabled={!bulkClass || !bulkTestNo}
            >
              {CATEGORIES.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="form-input"
              style={{ height: 30, fontSize: 12, padding: "0 8px", flex: 1 }}
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              disabled={!bulkClass || !bulkTestNo}
            />
            <div
              style={{
                display: "flex",
                gap: 2,
                background: "var(--bg3)",
                borderRadius: 6,
                padding: 2,
                border: "1px solid var(--border)",
              }}
            >
              {["", "Male", "Female"].map((g) => (
                <button
                  key={g}
                  onClick={() => setBulkGender(g)}
                  style={{
                    padding: "2px 8px",
                    height: 26,
                    fontSize: 11,
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: bulkGender === g ? 700 : 400,
                    background:
                      bulkGender === g ? "var(--primary)" : "transparent",
                    color: bulkGender === g ? "#fff" : "var(--text2)",
                    transition: "all 0.15s",
                  }}
                >
                  {g === "" ? "All" : g === "Male" ? "👦 Boys" : "👧 Girls"}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div
          className="loading"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <div className="spinner" />
          <span
            style={{ fontSize: 14, color: "var(--text2)", fontWeight: 500 }}
          >
            Loading...
          </span>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {!isBulkEntryMode ? (
            !selectedStudentData ? (
              // MASTER LIST VIEW
              <div
                className="table-wrap"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <div style={{ overflow: "auto", flex: 1 }}>
                  <table
                    style={{
                      background: "var(--card)",
                      minWidth: "100%",
                      borderCollapse: "collapse",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                      <tr
                        style={{
                          background:
                            "linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)",
                          color: "#fff",
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        <th
                          style={{
                            padding: "7px 10px",
                            borderRight: "1px solid rgba(255,255,255,0.15)",
                            width: 40,
                            textAlign: "center",
                            color: "#fff",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              studentProgressList.length > 0 &&
                              selectedStudents.length ===
                                studentProgressList.length
                            }
                            onChange={toggleSelectAll}
                            style={{ cursor: "pointer" }}
                          />
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            borderRight: "1px solid rgba(255,255,255,0.15)",
                            width: 60,
                            textAlign: "center",
                            color: "#fff",
                          }}
                        >
                          Roll
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            borderRight: "1px solid rgba(255,255,255,0.15)",
                            color: "#fff",
                          }}
                        >
                          Name
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            borderRight: "1px solid rgba(255,255,255,0.15)",
                            color: "rgba(255,255,255,0.8)",
                          }}
                        >
                          Father
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            borderRight: "1px solid rgba(255,255,255,0.15)",
                            color: "#fff",
                          }}
                        >
                          Class
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            borderRight: "1px solid rgba(255,255,255,0.15)",
                            color: "#fff",
                          }}
                        >
                          Session
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            borderRight: "1px solid rgba(255,255,255,0.15)",
                            textAlign: "center",
                            color: "#fff",
                          }}
                        >
                          Gender
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            borderRight: "1px solid rgba(255,255,255,0.15)",
                            textAlign: "center",
                            color: "#fff",
                          }}
                        >
                          Tests
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            textAlign: "center",
                            width: 80,
                            color: "#fff",
                          }}
                        >
                          Total
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            textAlign: "center",
                            width: 80,
                            color: "#fff",
                          }}
                        >
                          Obtained
                        </th>
                        <th
                          style={{
                            padding: "7px 10px",
                            textAlign: "center",
                            width: 60,
                            borderLeft: "1px solid rgba(255,255,255,0.15)",
                            color: "#fff",
                          }}
                        >
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentProgressList
                        .slice(0, visibleCount)
                        .map((s, i) => {
                          const pct =
                            s.totalMarks > 0
                              ? (
                                  (s.obtainedMarks / s.totalMarks) *
                                  100
                                ).toFixed(1)
                              : "0.0";
                          const pass = parseFloat(pct) >= 40;
                          return (
                            <tr
                              key={i}
                              style={{
                                cursor: "pointer",
                                borderBottom: "1px solid var(--border)",
                                background: selectedStudents.includes(s.rollNo)
                                  ? "rgba(59,130,246,0.1)"
                                  : i % 2 === 0
                                    ? "var(--card)"
                                    : "var(--bg3)",
                              }}
                              onClick={() => openDetailsSheet(s)}
                            >
                              <td
                                style={{
                                  padding: "5px 10px",
                                  borderRight: "1px solid var(--border)",
                                  textAlign: "center",
                                }}
                                onClick={(e) =>
                                  toggleSelectStudent(e, s.rollNo)
                                }
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedStudents.includes(s.rollNo)}
                                  readOnly
                                  style={{
                                    cursor: "pointer",
                                    pointerEvents: "none",
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  padding: "5px 10px",
                                  borderRight: "1px solid var(--border)",
                                  textAlign: "center",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {s.rollNo}
                              </td>
                              <td
                                style={{
                                  padding: "5px 10px",
                                  borderRight: "1px solid var(--border)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "var(--primary-light)",
                                }}
                              >
                                {s.studentName}
                              </td>
                              <td
                                style={{
                                  padding: "5px 10px",
                                  borderRight: "1px solid var(--border)",
                                  fontSize: 11,
                                  color: "var(--text2)",
                                }}
                              >
                                {s.fatherName || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "5px 10px",
                                  borderRight: "1px solid var(--border)",
                                  fontSize: 12,
                                }}
                              >
                                {s.studentClass}
                              </td>
                              <td
                                style={{
                                  padding: "5px 10px",
                                  borderRight: "1px solid var(--border)",
                                  fontSize: 11,
                                  color: "var(--text2)",
                                }}
                              >
                                {s.session ? (
                                  <span
                                    style={{
                                      background: "var(--bg3)",
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                      border: "1px solid var(--border)",
                                    }}
                                  >
                                    {s.session}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "5px 10px",
                                  borderRight: "1px solid var(--border)",
                                  textAlign: "center",
                                }}
                              >
                                {s.gender ? (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "1px 6px",
                                      borderRadius: 4,
                                      background:
                                        s.gender.toLowerCase() === "male"
                                          ? "rgba(99,102,241,0.12)"
                                          : "rgba(236,72,153,0.12)",
                                      color:
                                        s.gender.toLowerCase() === "male"
                                          ? "#818cf8"
                                          : "#ec4899",
                                    }}
                                  >
                                    {s.gender.toLowerCase() === "male"
                                      ? "♂ M"
                                      : "♀ F"}
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      color: "var(--text2)",
                                      fontSize: 11,
                                    }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "5px 10px",
                                  borderRight: "1px solid var(--border)",
                                  textAlign: "center",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "var(--primary)",
                                }}
                              >
                                {s.testCount}
                              </td>
                              <td
                                style={{
                                  padding: "5px 10px",
                                  textAlign: "center",
                                  fontSize: 12,
                                }}
                              >
                                {s.totalMarks}
                              </td>
                              <td
                                style={{
                                  padding: "5px 10px",
                                  textAlign: "center",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "var(--primary)",
                                }}
                              >
                                {s.obtainedMarks}
                              </td>
                              <td
                                style={{
                                  padding: "5px 10px",
                                  textAlign: "center",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: pass ? "#10b981" : "#ef4444",
                                  borderLeft: "1px solid var(--border)",
                                }}
                              >
                                {pct}%
                              </td>
                            </tr>
                          );
                        })}
                      {studentProgressList.length === 0 && (
                        <tr>
                          <td
                            colSpan={100}
                            className="empty"
                            style={{ padding: "30px", fontSize: 12 }}
                          >
                            No student records found matching filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {visibleCount < studentProgressList.length && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "8px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 11, padding: "4px 12px", height: 28 }}
                      onClick={() => setVisibleCount((v) => v + 20)}
                    >
                      Load More ({studentProgressList.length - visibleCount}{" "}
                      remaining)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // STUDENT DETAIL SPREADSHEET VIEW
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  height: "100%",
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    background: "var(--card)",
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    flexShrink: 0,
                  }}
                >
                  <button
                    className="btn btn-ghost"
                    onClick={() => setSelectedStudentData(null)}
                    style={{ padding: "2px 8px", fontSize: 11, height: 26 }}
                  >
                    ← Back
                  </button>
                  <div
                    style={{
                      width: 1,
                      height: 16,
                      background: "var(--border)",
                      margin: "0 2px",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {selectedStudentData.studentName}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text2)",
                      background: "var(--bg3)",
                      padding: "1px 6px",
                      borderRadius: 4,
                      border: "1px solid var(--border)",
                    }}
                  >
                    Roll: {selectedStudentData.rollNo}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text2)",
                      background: "var(--bg3)",
                      padding: "1px 6px",
                      borderRadius: 4,
                      border: "1px solid var(--border)",
                    }}
                  >
                    {selectedStudentData.studentClass}
                  </span>
                  <div style={{ flex: 1 }} />
                  <select
                    className="form-input"
                    style={{
                      width: 130,
                      height: 26,
                      fontSize: 11,
                      padding: "0 6px",
                    }}
                    value={newDetailSubject}
                    onChange={(e) => setNewDetailSubject(e.target.value)}
                  >
                    <option value="">+ Subject</option>
                    {savedSubjects
                      .filter(
                        (s) => !detailSubjects.some((ds) => ds.name === s),
                      )
                      .map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                  </select>
                  <button
                    className="btn btn-ghost"
                    title="Manage Subjects"
                    style={{ padding: "0 4px", height: 26 }}
                    onClick={() => setSubjectModal(true)}
                  >
                    ⚙️
                  </button>
                  <input
                    className="form-input"
                    style={{
                      width: 56,
                      height: 26,
                      fontSize: 11,
                      padding: "0 6px",
                    }}
                    type="number"
                    placeholder="Marks"
                    value={newDetailTotalMarks}
                    onChange={(e) => setNewDetailTotalMarks(e.target.value)}
                  />
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "0 8px", height: 26, fontSize: 11 }}
                    onClick={handleAddDetailSubject}
                  >
                    Add
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "0 10px", height: 26, fontSize: 11 }}
                    onClick={handleSaveStudentDetails}
                    disabled={detailLoading}
                  >
                    {detailLoading ? "..." : "💾 Save"}
                  </button>
                </div>

                <div
                  className="table-wrap"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    border: "1px solid var(--primary)",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ overflow: "auto", flex: 1 }}>
                    <table
                      style={{
                        background: "var(--card)",
                        minWidth: "100%",
                        borderCollapse: "collapse",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                        <tr style={{ background: "#0f172a", color: "#fff" }}>
                          <th
                            style={{
                              padding: "8px 12px",
                              borderRight: "1px solid rgba(255,255,255,0.1)",
                              width: 60,
                              textAlign: "center",
                              fontSize: 12,
                            }}
                          >
                            Test
                          </th>
                          {detailSubjects.map((sub, sIdx) => (
                            <th
                              key={sIdx}
                              style={{
                                borderRight: "1px solid rgba(255,255,255,0.1)",
                                minWidth: 100,
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  height: "100%",
                                }}
                              >
                                <select
                                  value={sub.name}
                                  onChange={(e) => {
                                    const newSubs = [...detailSubjects];
                                    newSubs[sIdx].name = e.target.value;
                                    setDetailSubjects(newSubs);
                                  }}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    borderBottom:
                                      "1px solid rgba(255,255,255,0.1)",
                                    color: "#fff",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    textAlign: "center",
                                    padding: "6px 4px",
                                    outline: "none",
                                    width: "100%",
                                    appearance: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  <option
                                    value={sub.name}
                                    style={{ color: "#000" }}
                                  >
                                    {sub.name}
                                  </option>
                                  {savedSubjects
                                    .filter(
                                      (s) =>
                                        s !== sub.name &&
                                        !detailSubjects.some(
                                          (ds) => ds.name === s,
                                        ),
                                    )
                                    .map((s) => (
                                      <option
                                        key={s}
                                        value={s}
                                        style={{ color: "#000" }}
                                      >
                                        {s}
                                      </option>
                                    ))}
                                </select>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "4px",
                                    background: "rgba(0,0,0,0.15)",
                                    position: "relative",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: "#94a3b8",
                                      marginRight: 4,
                                    }}
                                  >
                                    Total:
                                  </span>
                                  <input
                                    type="number"
                                    value={sub.maxMarks}
                                    onChange={(e) => {
                                      const newSubs = [...detailSubjects];
                                      newSubs[sIdx].maxMarks = e.target.value;
                                      setDetailSubjects(newSubs);
                                    }}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "#fbbf24",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      textAlign: "left",
                                      width: 40,
                                      outline: "none",
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      if (
                                        confirm(`Remove ${sub.name} column?`)
                                      ) {
                                        setDetailSubjects(
                                          detailSubjects.filter(
                                            (_, i) => i !== sIdx,
                                          ),
                                        );
                                      }
                                    }}
                                    title="Remove Subject"
                                    style={{
                                      position: "absolute",
                                      right: 4,
                                      background: "transparent",
                                      border: "none",
                                      color: "#ef4444",
                                      fontSize: 14,
                                      cursor: "pointer",
                                      padding: "0 4px",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </th>
                          ))}
                          <th
                            style={{ padding: "8px 12px", minWidth: 150 }}
                          ></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const baseTitles = filterTestNo
                            ? [filterTestNo]
                            : savedTitles.length > 0
                              ? savedTitles
                              : TITLE_OPTIONS;
                          let rows = baseTitles;
                          if (!filterCategory) {
                            const cats =
                              savedCategories.length > 0
                                ? savedCategories
                                : CATEGORIES;
                            rows = [];
                            cats.forEach((c: string) => {
                              baseTitles.forEach((t: string) =>
                                rows.push(`${c} - ${t}`),
                              );
                            });
                          }
                          return rows.map((t: string, i: number) => (
                            <tr
                              key={t}
                              style={{
                                borderBottom: "1px solid var(--border)",
                                background:
                                  i % 2 === 0 ? "var(--card)" : "var(--bg3)",
                              }}
                            >
                              <td
                                style={{
                                  padding: "6px 12px",
                                  borderRight: "1px solid var(--border)",
                                  textAlign: "center",
                                  fontWeight: 700,
                                  fontSize: 12,
                                  color: "var(--primary-light)",
                                }}
                              >
                                {t}
                              </td>
                              {detailSubjects.map((sub) => {
                                const key = `${t}_${sub.name}`;
                                // @ts-ignore
                                const cell = detailData[key] || "";

                                return (
                                  <td
                                    key={sub.name}
                                    style={{
                                      borderRight: "1px solid var(--border)",
                                      padding: 0,
                                    }}
                                  >
                                    <input
                                      type="number"
                                      style={{
                                        width: "100%",
                                        height: 36,
                                        border: "none",
                                        background: "transparent",
                                        textAlign: "center",
                                        color: "var(--text)",
                                        fontWeight: 700,
                                        fontSize: 14,
                                        outline: "none",
                                        padding: "0 4px",
                                      }}
                                      placeholder="-"
                                      // @ts-ignore
                                      value={cell || ""}
                                      onChange={(e) =>
                                        setDetailData({
                                          ...detailData,
                                          [key]: e.target.value,
                                        })
                                      }
                                      onFocus={(e) =>
                                        (e.target.style.background =
                                          "rgba(16,185,129,0.1)")
                                      }
                                      onBlur={(e) =>
                                        (e.target.style.background =
                                          "transparent")
                                      }
                                    />
                                  </td>
                                );
                              })}
                              <td></td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          ) : (
            // BULK ENTRY GRID VIEW
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                height: "100%",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  background: "var(--card)",
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text2)",
                  }}
                >
                  Add Column:
                </span>
                <select
                  className="form-input"
                  style={{
                    width: 140,
                    height: 26,
                    fontSize: 11,
                    padding: "0 6px",
                  }}
                  value={newBulkSubject}
                  onChange={(e) => setNewBulkSubject(e.target.value)}
                >
                  <option value="">Select Subject</option>
                  {savedSubjects
                    .filter((s) => !bulkSubjects.some((bs) => bs.name === s))
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </select>
                <button
                  className="btn btn-ghost"
                  title="Manage Subjects"
                  style={{ padding: "0 4px", height: 26 }}
                  onClick={() => setSubjectModal(true)}
                >
                  ⚙️
                </button>
                <input
                  className="form-input"
                  style={{
                    width: 80,
                    height: 26,
                    fontSize: 11,
                    padding: "0 6px",
                  }}
                  type="number"
                  placeholder="Total Marks"
                  value={newBulkTotalMarks}
                  onChange={(e) => setNewBulkTotalMarks(e.target.value)}
                />
                <button
                  className="btn btn-secondary"
                  style={{ padding: "0 8px", height: 26, fontSize: 11 }}
                  onClick={handleAddBulkSubject}
                >
                  + Add
                </button>
                <div style={{ flex: 1 }} />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "var(--bg3)",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    title="Decrease Width"
                    onClick={() => setBulkColWidth((w) => Math.max(60, w - 20))}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 16,
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    -
                  </button>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "0 8px",
                      color: "var(--text2)",
                      borderLeft: "1px solid var(--border)",
                      borderRight: "1px solid var(--border)",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      fontWeight: 600,
                    }}
                  >
                    {bulkColWidth}px
                  </span>
                  <button
                    title="Increase Width"
                    onClick={() =>
                      setBulkColWidth((w) => Math.min(300, w + 20))
                    }
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-secondary"
                    style={{
                      padding: "0 10px",
                      height: 26,
                      fontSize: 11,
                      background: "#ef4444",
                      color: "white",
                    }}
                    onClick={handleDeleteBulk}
                    disabled={bulkLoading}
                  >
                    🗑️ Delete Test
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "0 10px", height: 26, fontSize: 11 }}
                    onClick={handleSaveBulk}
                    disabled={bulkLoading}
                  >
                    {bulkLoading ? "Saving..." : "💾 Save All"}
                  </button>
                </div>
              </div>

              <div
                className="table-wrap"
                style={{
                  flex: 1,
                  border: "1px solid var(--primary)",
                  boxShadow: "0 0 0 1px rgba(99,102,241,0.2)",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  minWidth: 0,
                }}
              >
                <div style={{ overflow: "auto", flex: 1, minWidth: 0 }}>
                  <table
                    style={{
                      background: "var(--card)",
                      minWidth: "100%",
                      borderCollapse: "collapse",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <thead style={{ zIndex: 10 }}>
                      <tr style={{ color: "#fff" }}>
                        <th
                          style={{
                            position: "sticky",
                            top: 0,
                            background: "#3730a3",
                            zIndex: 11,
                            padding: "12px",
                            borderRight: "1px solid rgba(255,255,255,0.2)",
                            width: 40,
                            textAlign: "center",
                          }}
                        >
                          <input
                            type="checkbox"
                            title="Select All"
                            checked={selectedStudents.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const visible = students.filter((s: any) => {
                                  const g = (s.grade || s.class || "")
                                    .toLowerCase()
                                    .trim();
                                  const matchClass =
                                    !bulkClass ||
                                    g === bulkClass.toLowerCase().trim();
                                  let matchGender = true;
                                  if (bulkGender) {
                                    const gv = (s.gender || "")
                                      .toLowerCase()
                                      .trim();
                                    const isMale =
                                      gv === "male" ||
                                      gv === "m" ||
                                      gv === "boy";
                                    const isFemale =
                                      gv === "female" ||
                                      gv === "f" ||
                                      gv === "girl";
                                    matchGender =
                                      bulkGender === "Male" ? isMale : isFemale;
                                  }
                                  const matchSearch =
                                    !searchTerm ||
                                    (s.name &&
                                      s.name
                                        .toLowerCase()
                                        .includes(searchTerm.toLowerCase())) ||
                                    (s.studentId &&
                                      s.studentId
                                        .toString()
                                        .toLowerCase()
                                        .includes(searchTerm.toLowerCase()));
                                  return (
                                    matchClass && matchGender && matchSearch
                                  );
                                });
                                setSelectedStudents(
                                  visible.map((s: any) => s.studentId),
                                );
                              } else {
                                setSelectedStudents([]);
                              }
                            }}
                          />
                        </th>
                        <th
                          style={{
                            position: "sticky",
                            top: 0,
                            background: "#3730a3",
                            zIndex: 11,
                            padding: "12px 16px",
                            borderRight: "1px solid rgba(255,255,255,0.2)",
                            width: 80,
                            textAlign: "center",
                          }}
                        >
                          RollNo
                        </th>
                        <th
                          style={{
                            position: "sticky",
                            top: 0,
                            background: "#3730a3",
                            zIndex: 11,
                            padding: "12px 16px",
                            borderRight: "1px solid rgba(255,255,255,0.2)",
                            width: 250,
                            textAlign: "left",
                          }}
                        >
                          Student Name
                        </th>
                        {bulkSubjects.map((sub, sIdx) => (
                          <th
                            key={sIdx}
                            style={{
                              position: "sticky",
                              top: 0,
                              background: "#3730a3",
                              zIndex: 11,
                              borderRight: "1px solid rgba(255,255,255,0.2)",
                              minWidth: bulkColWidth,
                              width: bulkColWidth,
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                height: "100%",
                              }}
                            >
                              <select
                                value={sub.name}
                                onChange={(e) => {
                                  const newSubs = [...bulkSubjects];
                                  newSubs[sIdx].name = e.target.value;
                                  setBulkSubjects(newSubs);
                                }}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  borderBottom:
                                    "1px solid rgba(255,255,255,0.1)",
                                  color: "#fff",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  textAlign: "center",
                                  padding: "6px 4px",
                                  outline: "none",
                                  width: "100%",
                                  appearance: "none",
                                  cursor: "pointer",
                                }}
                              >
                                <option
                                  value={sub.name}
                                  style={{ color: "#000" }}
                                >
                                  {sub.name}
                                </option>
                                {savedSubjects
                                  .filter(
                                    (s) =>
                                      s !== sub.name &&
                                      !bulkSubjects.some((bs) => bs.name === s),
                                  )
                                  .map((s) => (
                                    <option
                                      key={s}
                                      value={s}
                                      style={{ color: "#000" }}
                                    >
                                      {s}
                                    </option>
                                  ))}
                              </select>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "4px",
                                  background: "rgba(0,0,0,0.15)",
                                  position: "relative",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: "#cbd5e1",
                                    marginRight: 4,
                                  }}
                                >
                                  Total:
                                </span>
                                <input
                                  type="number"
                                  value={sub.maxMarks}
                                  onChange={(e) => {
                                    const newSubs = [...bulkSubjects];
                                    newSubs[sIdx].maxMarks = e.target.value;
                                    setBulkSubjects(newSubs);
                                  }}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#fbbf24",
                                    fontSize: 10,
                                    fontWeight: 600,
                                    textAlign: "left",
                                    width: 30,
                                    outline: "none",
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Remove ${sub.name} column from view?`,
                                      )
                                    ) {
                                      setBulkSubjects(
                                        bulkSubjects.filter(
                                          (_, i) => i !== sIdx,
                                        ),
                                      );
                                      if (
                                        confirm(
                                          `Do you ALSO want to permanently delete all saved results for "${sub.name}" in this test (${bulkCategory} ${bulkTestNo}) from the database?`,
                                        )
                                      ) {
                                        handleDeleteSubjectBulk(sub.name);
                                      }
                                    }
                                  }}
                                  title="Remove Subject"
                                  style={{
                                    position: "absolute",
                                    right: 4,
                                    background: "transparent",
                                    border: "none",
                                    color: "#ef4444",
                                    fontSize: 12,
                                    cursor: "pointer",
                                    padding: "0 4px",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .filter((s: any) => {
                          const g = (s.grade || s.class || "")
                            .toLowerCase()
                            .trim();
                          const matchClass =
                            !bulkClass || g === bulkClass.toLowerCase().trim();

                          let matchGender = true;
                          if (bulkGender) {
                            const gv = (s.gender || "").toLowerCase().trim();
                            const isMale =
                              gv === "male" || gv === "m" || gv === "boy";
                            const isFemale =
                              gv === "female" || gv === "f" || gv === "girl";
                            matchGender =
                              bulkGender === "Male" ? isMale : isFemale;
                          }

                          const matchSearch =
                            !searchTerm ||
                            (s.name &&
                              s.name
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase())) ||
                            (s.studentId &&
                              s.studentId
                                .toString()
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()));

                          return matchClass && matchGender && matchSearch;
                        })
                        .map((s: any, i: any) => (
                          <tr
                            key={s.id}
                            style={{
                              borderBottom: "1px solid var(--border)",
                              background:
                                i % 2 === 0 ? "var(--card)" : "var(--bg3)",
                            }}
                          >
                            <td
                              style={{
                                padding: "6px 10px",
                                borderRight: "1px solid var(--border)",
                                textAlign: "center",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(s.studentId)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStudents((prev) => [
                                      ...prev,
                                      s.studentId,
                                    ]);
                                  } else {
                                    setSelectedStudents((prev) =>
                                      prev.filter((id) => id !== s.studentId),
                                    );
                                  }
                                }}
                              />
                            </td>
                            <td
                              style={{
                                padding: "6px 10px",
                                borderRight: "1px solid var(--border)",
                                textAlign: "center",
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                            >
                              {s.studentId}
                            </td>
                            <td
                              style={{
                                padding: "6px 10px",
                                borderRight: "1px solid var(--border)",
                                fontWeight: 600,
                                color: "var(--text)",
                                fontSize: 12,
                              }}
                            >
                              {s.name}
                              {(() => {
                                const gv = (s.gender || "")
                                  .toLowerCase()
                                  .trim();
                                const isMale =
                                  gv === "male" || gv === "m" || gv === "boy";
                                if (!gv) return null;
                                return (
                                  <span
                                    style={{
                                      marginLeft: 5,
                                      fontSize: 9,
                                      fontWeight: 700,
                                      padding: "1px 4px",
                                      borderRadius: 4,
                                      background: isMale
                                        ? "rgba(99,102,241,0.12)"
                                        : "rgba(236,72,153,0.12)",
                                      color: isMale ? "#818cf8" : "#ec4899",
                                    }}
                                  >
                                    {isMale ? "♂" : "♀"}
                                  </span>
                                );
                              })()}
                            </td>
                            {bulkTestNo ? (
                              bulkSubjects.map((sub) => {
                                const sRollNo =
                                  s.studentId || s.rollno || s.id || "";
                                const key = `${sRollNo}_${sub.name}`;
                                return (
                                  <td
                                    key={sub.name}
                                    style={{
                                      borderRight: "1px solid var(--border)",
                                      padding: 0,
                                    }}
                                  >
                                    <input
                                      type="number"
                                      style={{
                                        width: "100%",
                                        height: 36,
                                        border: "none",
                                        background: "transparent",
                                        textAlign: "center",
                                        color: "var(--primary-light)",
                                        fontWeight: 700,
                                        fontSize: 14,
                                        outline: "none",
                                        padding: "0 4px",
                                      }}
                                      placeholder="-"
                                      value={bulkData[key] || ""}
                                      onChange={(e) =>
                                        setBulkData({
                                          ...bulkData,
                                          [key]: e.target.value,
                                        })
                                      }
                                      onFocus={(e) =>
                                        (e.target.style.background =
                                          "rgba(99,102,241,0.1)")
                                      }
                                      onBlur={(e) =>
                                        (e.target.style.background =
                                          "transparent")
                                      }
                                    />
                                  </td>
                                );
                              })
                            ) : (
                              <td
                                colSpan={100}
                                style={{
                                  padding: "6px 10px",
                                  color: "var(--text2)",
                                  fontStyle: "italic",
                                  fontSize: 12,
                                }}
                              >
                                Select a Test No to enter marks
                              </td>
                            )}
                          </tr>
                        ))}
                      {students.filter((s: any) => {
                        const g = (s.grade || s.class || "")
                          .toLowerCase()
                          .trim();
                        const mc =
                          !bulkClass || g === bulkClass.toLowerCase().trim();

                        let mg = true;
                        if (bulkGender) {
                          const gv = (s.gender || "").toLowerCase().trim();
                          const isMale =
                            gv === "male" || gv === "m" || gv === "boy";
                          const isFemale =
                            gv === "female" || gv === "f" || gv === "girl";
                          mg = bulkGender === "Male" ? isMale : isFemale;
                        }

                        const ms =
                          !searchTerm ||
                          (s.name &&
                            s.name
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase())) ||
                          (s.studentId &&
                            s.studentId
                              .toString()
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()));

                        return mc && mg && ms;
                      }).length === 0 && (
                        <tr>
                          <td
                            colSpan={100}
                            className="empty"
                            style={{ padding: "30px" }}
                          >
                            No students found
                            {bulkClass ? " in " + bulkClass : ""}
                            {bulkGender ? ` (${bulkGender})` : ""}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals will go here below */}

      {subjectModal && (
        <div
          className="modal-overlay"
          onClick={() => setSubjectModal(false)}
          style={{ zIndex: 1000 }}
        >
          <div
            className="modal"
            style={{
              maxWidth: 400,
              display: "flex",
              flexDirection: "column",
              maxHeight: "80vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">Manage Subjects</div>
              <button
                className="modal-close"
                onClick={() => setSubjectModal(false)}
              >
                ✕
              </button>
            </div>
            <div
              className="modal-body"
              style={{ flex: 1, overflow: "auto", padding: 20 }}
            >
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="New subject name..."
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleAddSavedSubject()
                  }
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddSavedSubject}
                >
                  + Add
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {savedSubjects.map((s: string) => (
                  <div
                    key={s}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--bg3)",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s}</span>
                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: "4px",
                        height: "auto",
                        color: "#ef4444",
                      }}
                      onClick={() => handleDeleteSavedSubject(s)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {savedSubjects.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--text2)",
                      padding: 20,
                    }}
                  >
                    No subjects found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {categoryModal && (
        <div
          className="modal-overlay"
          onClick={() => setCategoryModal(false)}
          style={{ zIndex: 1000 }}
        >
          <div
            className="modal"
            style={{
              maxWidth: 400,
              display: "flex",
              flexDirection: "column",
              maxHeight: "80vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">Manage Test Types</div>
              <button
                className="modal-close"
                onClick={() => setCategoryModal(false)}
              >
                ✕
              </button>
            </div>
            <div
              className="modal-body"
              style={{ flex: 1, overflow: "auto", padding: 20 }}
            >
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="New test type..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleAddSavedCategory()
                  }
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddSavedCategory}
                >
                  + Add
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {savedCategories.map((s: string) => (
                  <div
                    key={s}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--bg3)",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s}</span>
                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: "4px",
                        height: "auto",
                        color: "#ef4444",
                      }}
                      onClick={() => handleDeleteSavedCategory(s)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {savedCategories.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--text2)",
                      padding: 20,
                    }}
                  >
                    No test types found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {titleModal && (
        <div
          className="modal-overlay"
          onClick={() => setTitleModal(false)}
          style={{ zIndex: 1000 }}
        >
          <div
            className="modal"
            style={{
              maxWidth: 400,
              display: "flex",
              flexDirection: "column",
              maxHeight: "80vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">Manage Test Numbers</div>
              <button
                className="modal-close"
                onClick={() => setTitleModal(false)}
              >
                ✕
              </button>
            </div>
            <div
              className="modal-body"
              style={{ flex: 1, overflow: "auto", padding: 20 }}
            >
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="New test number..."
                  value={newTitleInput}
                  onChange={(e) => setNewTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSavedTitle()}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddSavedTitle}
                >
                  + Add
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {savedTitles.map((s: string) => (
                  <div
                    key={s}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--bg3)",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s}</span>
                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: "4px",
                        height: "auto",
                        color: "#ef4444",
                      }}
                      onClick={() => handleDeleteSavedTitle(s)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {savedTitles.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--text2)",
                      padding: 20,
                    }}
                  >
                    No test numbers found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {classModal && (
        <div
          className="modal-overlay"
          onClick={() => setClassModal(false)}
          style={{ zIndex: 1000 }}
        >
          <div
            className="modal"
            style={{
              maxWidth: 400,
              display: "flex",
              flexDirection: "column",
              maxHeight: "80vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">Manage Classes</div>
              <button
                className="modal-close"
                onClick={() => setClassModal(false)}
              >
                ✕
              </button>
            </div>
            <div
              className="modal-body"
              style={{ flex: 1, overflow: "auto", padding: 20 }}
            >
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="New class..."
                  value={newClassInput}
                  onChange={(e) => setNewClassInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSavedClass()}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddSavedClass}
                >
                  + Add
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {savedClasses.map((s: string) => (
                  <div
                    key={s}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--bg3)",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s}</span>
                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: "4px",
                        height: "auto",
                        color: "#ef4444",
                      }}
                      onClick={() => handleDeleteSavedClass(s)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {savedClasses.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--text2)",
                      padding: 20,
                    }}
                  >
                    No classes found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Choice Modal */}
      {choiceModal && (
        <div className="modal-overlay" onClick={() => setChoiceModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">Add New Record</div>
              <button
                className="modal-close"
                onClick={() => setChoiceModal(false)}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <button
                className="btn btn-primary"
                onClick={() => {
                  setChoiceModal(false);
                  resetForm();
                  setFormModal(true);
                }}
              >
                ✍️ Manual Entry
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setChoiceModal(false);
                  setUploadModal(true);
                }}
              >
                📄 Upload Excel File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Upload Modal */}
      {uploadModal && (
        <div className="modal-overlay" onClick={() => setUploadModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div
                className="modal-title"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span
                  style={{
                    color: "var(--primary)",
                    background: "rgba(99,102,241,0.1)",
                    padding: 6,
                    borderRadius: 8,
                  }}
                >
                  📄
                </span>
                Excel Upload
              </div>
              <button
                className="modal-close"
                onClick={() => setUploadModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text2)",
                  marginBottom: 20,
                }}
              >
                Upload an <b>.xlsx</b> file containing exam records. Ensure
                columns match the required format.
              </p>
              <button
                className="btn btn-ghost"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  border: "1px solid var(--border)",
                  marginBottom: 20,
                }}
                onClick={handleDownloadTemplate}
              >
                <span
                  style={{
                    background: "#1D6F42",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 24,
                    height: 24,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  ↓
                </span>
                Download Excel Template
              </button>
              <div
                style={{
                  background: "var(--bg3)",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px dashed var(--border)",
                  textAlign: "center",
                }}
              >
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Form Modal */}
      {formModal && (
        <div className="modal-overlay" onClick={() => {}}>
          <div
            className="modal"
            style={{
              maxWidth: 650,
              height: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                padding: "20px 24px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
              }}
            >
              <div style={{ flex: 1 }}>
                <div className="modal-title" style={{ color: "white" }}>
                  {editingExam ? "Edit Record" : "New Record"}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.8)",
                    marginTop: 2,
                  }}
                >
                  {editingExam
                    ? "Update exam details"
                    : "Enter student exam details"}
                </div>
              </div>
              <button
                onClick={() => setFormModal(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "white",
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--border)",
                background: "var(--card)",
              }}
            >
              <button
                onClick={() => setActiveTab("info")}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === "info" ? "var(--primary)" : "transparent"}`,
                  color:
                    activeTab === "info" ? "var(--primary)" : "var(--text2)",
                  fontWeight: activeTab === "info" ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                👤 Basic Info
              </button>
              <button
                onClick={() => setActiveTab("marks")}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === "marks" ? "var(--primary)" : "transparent"}`,
                  color:
                    activeTab === "marks" ? "var(--primary)" : "var(--text2)",
                  fontWeight: activeTab === "marks" ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                📚 Marks & Subjects
              </button>
            </div>

            <div
              className="modal-body"
              style={{ flex: 1, overflow: "auto", padding: "24px" }}
            >
              {activeTab === "info" ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <div className="form-row" style={{ gap: 12 }}>
                    <div className="form-group" style={{ flex: 2 }}>
                      <label className="form-label">Search Student Data</label>
                      <input
                        className="form-input"
                        list="student-list"
                        placeholder="Start typing name..."
                        value={studentName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStudentName(val);
                          const found = students.find(
                            (s: any) => s.name === val,
                          );
                          if (found) {
                            setRollNo(found.studentId || "");
                            setStudentClass(found.grade || "");
                            setStudentEmail(found.email || "");
                          }
                        }}
                      />
                      <datalist id="student-list">
                        {students.map((s: any) => (
                          <option key={s.id} value={s.name}>
                            {s.studentId}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Roll No</label>
                      <input
                        className="form-input"
                        placeholder="Auto-filled"
                        value={rollNo}
                        readOnly
                        style={{
                          background: "var(--bg3)",
                          color: "var(--text2)",
                          cursor: "not-allowed",
                        }}
                      />
                    </div>
                  </div>
                  <div className="form-row" style={{ gap: 12 }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Email</label>
                      <input
                        className="form-input"
                        placeholder="Auto-filled"
                        value={studentEmail}
                        readOnly
                        style={{
                          background: "var(--bg3)",
                          color: "var(--text2)",
                          cursor: "not-allowed",
                        }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label
                        className="form-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        Class
                        <button
                          className="btn btn-ghost"
                          title="Manage Classes"
                          style={{ padding: 0, height: "auto", lineHeight: 1 }}
                          onClick={(e) => {
                            e.preventDefault();
                            setClassModal(true);
                          }}
                        >
                          ⚙️
                        </button>
                      </label>
                      <select
                        className="form-input"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                      >
                        <option value="">Select Class</option>
                        {savedClasses.map((c: string) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div
                    style={{
                      height: 1,
                      background: "var(--border)",
                      margin: "4px 0",
                    }}
                  />

                  <div className="form-row" style={{ gap: 12 }}>
                    <div className="form-group">
                      <label
                        className="form-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        Test No
                        <button
                          className="btn btn-ghost"
                          title="Manage Test Nos"
                          style={{ padding: 0, height: "auto", lineHeight: 1 }}
                          onClick={(e) => {
                            e.preventDefault();
                            setTitleModal(true);
                          }}
                        >
                          ⚙️
                        </button>
                      </label>
                      <select
                        className="form-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      >
                        <option value="">Select Test</option>
                        {savedTitles.map((t: string) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label
                        className="form-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        Type
                        <button
                          className="btn btn-ghost"
                          title="Manage Test Types"
                          style={{ padding: 0, height: "auto", lineHeight: 1 }}
                          onClick={(e) => {
                            e.preventDefault();
                            setCategoryModal(true);
                          }}
                        >
                          ⚙️
                        </button>
                      </label>
                      <select
                        className="form-input"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {savedCategories.map((c: string) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input
                        className="form-input"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {/* Added Books */}
                  {entryBooks.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {entryBooks.map((book, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "var(--bg3)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "8px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div style={{ minWidth: 90 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "var(--text)",
                              }}
                            >
                              {book.name}
                            </div>
                            <div
                              style={{ fontSize: 10, color: "var(--text2)" }}
                            >
                              Marks breakdown:
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="number"
                              style={{
                                width: 50,
                                padding: "4px",
                                borderRadius: 4,
                                border: "1px solid var(--border)",
                                background: "var(--bg)",
                                fontSize: 12,
                                textAlign: "center",
                                fontWeight: "bold",
                                color: "var(--primary)",
                              }}
                              value={book.obtainedMarks}
                              onChange={(e) => {
                                const newBooks = [...entryBooks];
                                newBooks[idx].obtainedMarks = e.target.value;
                                setEntryBooks(newBooks);
                              }}
                            />
                            <span
                              style={{ color: "var(--text2)", fontSize: 12 }}
                            >
                              /
                            </span>
                            <input
                              type="number"
                              style={{
                                width: 50,
                                padding: "4px",
                                borderRadius: 4,
                                border: "1px solid var(--border)",
                                background: "var(--bg)",
                                fontSize: 12,
                                textAlign: "center",
                                color: "var(--text2)",
                              }}
                              value={book.totalMarks}
                              onChange={(e) => {
                                const newBooks = [...entryBooks];
                                newBooks[idx].totalMarks = e.target.value;
                                setEntryBooks(newBooks);
                              }}
                            />
                          </div>
                          <button
                            onClick={() =>
                              setEntryBooks(
                                entryBooks.filter((_, i) => i !== idx),
                              )
                            }
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#ef4444",
                              border: "none",
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              cursor: "pointer",
                              marginLeft: 4,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Book Area */}
                  <div
                    style={{
                      background: "rgba(99,102,241,0.03)",
                      padding: 12,
                      borderRadius: 10,
                      border: "1px dashed rgba(99,102,241,0.3)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--primary)",
                      }}
                    >
                      + ADD SUBJECT
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        flexWrap: "nowrap",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <input
                          className="form-input"
                          style={{
                            width: "100%",
                            height: 36,
                            padding: "0 12px",
                            fontSize: 13,
                            minWidth: 100,
                          }}
                          list="available-subjects"
                          placeholder="Type or select subject..."
                          value={currentBookName}
                          onChange={(e) => setCurrentBookName(e.target.value)}
                        />
                        <datalist id="available-subjects">
                          {Array.from(
                            new Set([
                              ...savedSubjects,
                              ...teachers
                                .map((t: any) => t.booktitle || t.subject)
                                .filter(Boolean),
                            ]),
                          ).map((name: any, idx) => {
                            // Hide if already in entryBooks
                            if (
                              entryBooks.some(
                                (b) =>
                                  b.name.toLowerCase() === name.toLowerCase(),
                              )
                            )
                              return null;
                            return <option key={idx} value={name} />;
                          })}
                        </datalist>
                      </div>
                      <div style={{ width: 70 }}>
                        <input
                          className="form-input"
                          style={{
                            width: "100%",
                            height: 36,
                            padding: "0 8px",
                            fontSize: 13,
                            textAlign: "center",
                          }}
                          type="number"
                          placeholder="Total"
                          value={currentTotalMarks}
                          onChange={(e) => setCurrentTotalMarks(e.target.value)}
                        />
                      </div>
                      <div style={{ width: 70 }}>
                        <input
                          className="form-input"
                          style={{
                            width: "100%",
                            height: 36,
                            padding: "0 8px",
                            fontSize: 13,
                            textAlign: "center",
                          }}
                          type="number"
                          placeholder="Obt"
                          value={currentObtainedMarks}
                          onChange={(e) =>
                            setCurrentObtainedMarks(e.target.value)
                          }
                        />
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{
                          height: 36,
                          padding: "0 16px",
                          borderRadius: 6,
                          fontSize: 13,
                          whiteSpace: "nowrap",
                        }}
                        onClick={handleAddBook}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: 4 }}>
                    <label className="form-label">
                      Notes / Description (Optional)
                    </label>
                    <textarea
                      className="form-input"
                      style={{
                        resize: "vertical",
                        minHeight: 50,
                        fontSize: 13,
                      }}
                      placeholder="Additional instructions..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div
              className="modal-footer"
              style={{
                borderTop: "1px solid var(--border)",
                background: "var(--card)",
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => setFormModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveRecord}>
                {editingExam ? "Update Record" : "Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {summaryModal && (
        <div className="modal-overlay" onClick={() => setSummaryModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 800, padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                padding: "20px",
                background: "var(--primary)",
                color: "#fff",
                border: "none",
              }}
            >
              <div className="modal-title" style={{ color: "#fff", display: "flex", alignItems: "center", gap: 15 }}>
                📊 Entry Summary
                {summaryTab === "toppers" && (
                  <button
                    onClick={() => handleDownloadBulkResults("toppers")}
                    disabled={downloadingResults}
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "1px solid rgba(255,255,255,0.4)",
                      color: "#fff",
                      padding: "4px 12px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: downloadingResults ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    {downloadingResults ? "⏳ Downloading..." : "🖨️ Print Results"}
                  </button>
                )}
              </div>
              <button
                className="modal-close"
                onClick={() => setSummaryModal(false)}
                style={{ color: "#fff" }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              >
                <button
                  onClick={() => setSummaryTab("overview")}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "transparent",
                    border: "none",
                    borderBottom:
                      summaryTab === "overview"
                        ? "2px solid var(--primary)"
                        : "2px solid transparent",
                    color:
                      summaryTab === "overview"
                        ? "var(--primary)"
                        : "var(--text2)",
                    fontWeight: summaryTab === "overview" ? 700 : 500,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  📊 Overview
                </button>
                <button
                  onClick={() => setSummaryTab("toppers")}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "transparent",
                    border: "none",
                    borderBottom:
                      summaryTab === "toppers"
                        ? "2px solid var(--primary)"
                        : "2px solid transparent",
                    color:
                      summaryTab === "toppers"
                        ? "var(--primary)"
                        : "var(--text2)",
                    fontWeight: summaryTab === "toppers" ? 700 : 500,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  🏆 Class Toppers
                </button>
              </div>

              <div
                style={{ padding: 20, maxHeight: "60vh", overflowY: "auto" }}
              >
                {summaryTab === "overview"
                  ? (() => {
                      const baseStudents = students.filter((s: any) => {
                        const mc = !filterClass || s.grade === filterClass;
                        const gv = (s.gender || "").toLowerCase().trim();
                        const isMale =
                          gv === "male" || gv === "m" || gv === "boy";
                        const isFemale =
                          gv === "female" || gv === "f" || gv === "girl";
                        const mg =
                          !filterGender ||
                          (filterGender === "Male" ? isMale : isFemale);
                        const ms =
                          !searchTerm ||
                          (s.name &&
                            s.name
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase())) ||
                          (s.studentId &&
                            s.studentId
                              .toString()
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()));
                        return mc && mg && ms;
                      });

                      let enteredCount = 0;
                      let missingStudents: any[] = [];

                      baseStudents.forEach((student: any) => {
                        const hasExam = exams.some((e: any) => {
                          const matchUser =
                            e.rollNo === student.rollno ||
                            e.studentName === student.name;
                          const matchClass =
                            !filterClass || e.studentClass === filterClass;
                          const matchTestNo =
                            !filterTestNo || e.title === filterTestNo;
                          const matchCategory =
                            !filterCategory || e.category === filterCategory;
                          return (
                            matchUser &&
                            matchClass &&
                            matchTestNo &&
                            matchCategory
                          );
                        });

                        if (hasExam) {
                          enteredCount++;
                        } else {
                          missingStudents.push(student);
                        }
                      });

                      const pct =
                        baseStudents.length > 0
                          ? Math.round(
                              (enteredCount / baseStudents.length) * 100,
                            )
                          : 0;

                      return (
                        <>
                          <div
                            style={{
                              marginBottom: 15,
                              fontSize: 13,
                              color: "var(--text2)",
                            }}
                          >
                            <strong>Filters Applied:</strong>
                            <br />
                            Class: <b>{filterClass || "All"}</b> | Gender:{" "}
                            <b>{filterGender || "All"}</b> | Test:{" "}
                            <b>{filterTestNo || "All"}</b> | Type:{" "}
                            <b>{filterCategory || "All"}</b>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              marginBottom: 20,
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                background: "var(--bg3)",
                                padding: 15,
                                borderRadius: 8,
                                textAlign: "center",
                                border: "1px solid var(--border)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 24,
                                  fontWeight: 800,
                                  color: "var(--text)",
                                }}
                              >
                                {baseStudents.length}
                              </div>
                              <div
                                style={{ fontSize: 11, color: "var(--text2)" }}
                              >
                                Target Students
                              </div>
                            </div>
                            <div
                              style={{
                                flex: 1,
                                background: "var(--bg3)",
                                padding: 15,
                                borderRadius: 8,
                                textAlign: "center",
                                border: "1px solid var(--border)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 24,
                                  fontWeight: 800,
                                  color: "var(--primary)",
                                }}
                              >
                                {enteredCount}
                              </div>
                              <div
                                style={{ fontSize: 11, color: "var(--text2)" }}
                              >
                                Results Added
                              </div>
                            </div>
                            <div
                              style={{
                                flex: 1,
                                background: "var(--bg3)",
                                padding: 15,
                                borderRadius: 8,
                                textAlign: "center",
                                border: "1px solid #ef4444",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 24,
                                  fontWeight: 800,
                                  color: "#ef4444",
                                }}
                              >
                                {missingStudents.length}
                              </div>
                              <div style={{ fontSize: 11, color: "#ef4444" }}>
                                Missing Data
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              height: 8,
                              background: "var(--bg3)",
                              borderRadius: 4,
                              overflow: "hidden",
                              marginBottom: 20,
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: "var(--primary)",
                              }}
                            />
                          </div>

                          {missingStudents.length > 0 && (
                            <div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  marginBottom: 10,
                                }}
                              >
                                Missing Students ({missingStudents.length}):
                              </div>
                              <div
                                style={{
                                  maxHeight: 200,
                                  overflowY: "auto",
                                  background: "var(--bg3)",
                                  borderRadius: 8,
                                  padding: 10,
                                  border: "1px solid var(--border)",
                                }}
                              >
                                {missingStudents.map((ms) => (
                                  <div
                                    key={ms.studentId}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      padding: "6px 0",
                                      borderBottom: "1px solid var(--border)",
                                    }}
                                  >
                                    <span
                                      style={{ fontSize: 13, fontWeight: 600 }}
                                    >
                                      {ms.name}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 12,
                                        color: "var(--text2)",
                                      }}
                                    >
                                      {ms.studentId}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()
                  : (() => {
                      // Group by Class and Section
                      const classGroups: Record<
                        string,
                        typeof studentProgressList
                      > = {};
                      studentProgressList.forEach((s) => {
                        const clsName = s.studentClass || "Unknown";
                        const sec = s.section ? ` (${s.section})` : "";
                        const cls = `${clsName}${sec}`;
                        if (!classGroups[cls]) classGroups[cls] = [];
                        classGroups[cls].push(s);
                      });

                      const sortedClasses = Object.keys(classGroups).sort();

                      return (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 20,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              background: "var(--bg3)",
                              padding: "12px 16px",
                              borderRadius: 8,
                              border: "1px solid var(--border)",
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--text2)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Filters:
                            </div>
                            <select
                              className="form-input"
                              style={{
                                flex: 1,
                                minWidth: 150,
                                padding: "8px 12px",
                                fontSize: 13,
                                height: 38,
                              }}
                              value={filterClass}
                              onChange={(e) => setFilterClass(e.target.value)}
                            >
                              <option value="">All Classes</option>
                              {savedClasses.map((c: string) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            <select
                              className="form-input"
                              style={{
                                flex: 1,
                                minWidth: 150,
                                padding: "8px 12px",
                                fontSize: 13,
                                height: 38,
                              }}
                              value={filterTestNo}
                              onChange={(e) => setFilterTestNo(e.target.value)}
                            >
                              <option value="">All Tests</option>
                              {savedTitles.map((t: string) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                            <select
                              className="form-input"
                              style={{
                                flex: 1,
                                minWidth: 150,
                                padding: "8px 12px",
                                fontSize: 13,
                                height: 38,
                              }}
                              value={filterGroup}
                              onChange={(e) => setFilterGroup(e.target.value)}
                            >
                              <option value="">All Groups</option>
                              {groups.map((g: any) => {
                                const grp = g.name || g;
                                return (
                                  <option key={grp} value={grp}>
                                    {grp}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {sortedClasses.length === 0 && (
                            <div
                              style={{
                                textAlign: "center",
                                padding: 20,
                                color: "var(--text2)",
                              }}
                            >
                              No records found.
                            </div>
                          )}

                          {sortedClasses
                            .filter((cls) => {
                              let match = true;
                              if (filterClass) {
                                match = match && cls.toLowerCase().startsWith(filterClass.toLowerCase());
                              }
                              if (filterGroup) {
                                match = match && (cls.includes(`(${filterGroup})`) || cls.trim() === filterGroup);
                              }
                              return match;
                            })
                            .map((cls) => {
                              const classStudents = classGroups[cls]
                                .filter((s) => s.obtainedMarks > 0)
                                .sort((a, b) => b.obtainedMarks - a.obtainedMarks);
                              
                              let currentRank = 1;
                              let previousMarks = -1;
                              const rankedStudents = classStudents.map((s, idx) => {
                                if (idx > 0 && s.obtainedMarks < previousMarks) {
                                  currentRank++;
                                }
                                previousMarks = s.obtainedMarks;
                                return { ...s, rank: currentRank };
                              });

                              const topStudents = rankedStudents.filter((s: any) => s.rank <= 3);

                            if (topStudents.length === 0) return null;

                            return (
                              <div
                                key={cls}
                                style={{
                                  background: "var(--bg3)",
                                  borderRadius: 8,
                                  padding: 12,
                                  border: "1px solid var(--border)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    marginBottom: 10,
                                    color: "var(--primary)",
                                  }}
                                >
                                  Class: {cls}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                  }}
                                >
                                  {topStudents.map((ts: any) => {
                                    const position =
                                      ts.rank === 1
                                        ? "🥇 1st"
                                        : ts.rank === 2
                                          ? "🥈 2nd"
                                          : "🥉 3rd";
                                    const color =
                                      ts.rank === 1
                                        ? "#fbbf24"
                                        : ts.rank === 2
                                          ? "#94a3b8"
                                          : "#b45309";
                                    const pct =
                                      ts.totalMarks > 0
                                        ? (
                                            (ts.obtainedMarks / ts.totalMarks) *
                                            100
                                          ).toFixed(1)
                                        : "0.0";
                                    return (
                                      <div
                                        key={ts.rollNo}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          padding: "8px 12px",
                                          background: "var(--card)",
                                          borderRadius: 6,
                                          border: `1px solid ${color}33`,
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: 60,
                                            fontWeight: 800,
                                            color,
                                            fontSize: 13,
                                          }}
                                        >
                                          {position}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <div
                                            style={{
                                              fontSize: 13,
                                              fontWeight: 700,
                                            }}
                                          >
                                            {ts.studentName}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: 11,
                                              color: "var(--text2)",
                                            }}
                                          >
                                            Roll: {ts.rollNo}
                                          </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                          <div
                                            style={{
                                              fontSize: 14,
                                              fontWeight: 800,
                                              color: "var(--text)",
                                            }}
                                          >
                                            {ts.obtainedMarks}{" "}
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 500,
                                                color: "var(--text2)",
                                              }}
                                            >
                                              / {ts.totalMarks}
                                            </span>
                                          </div>
                                          <div
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: "var(--primary)",
                                            }}
                                          >
                                            {pct}%
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
              </div>
            </div>
          </div>
        </div>
      )}
      {showPreviewModal && captureBatch && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "16px 24px",
              backgroundColor: "#1e293b",
              borderBottom: "1px solid #334155",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ color: "#f8fafc", margin: 0, fontSize: 18 }}>
              Preview Result Cards ({captureBatch.length})
            </h2>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-ghost"
                style={{ color: "#cbd5e1" }}
                onClick={() => {
                  setShowPreviewModal(false);
                  setCaptureBatch(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmDownloadPreview}
                disabled={downloadingResults}
              >
                {downloadingResults ? "Downloading..." : "Download Now"}
              </button>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
            }}
          >
            <div
              id="capture-templates-container"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                width: 794,
              }}
            >

          {captureBatch.map((data: any, i: number) => (
            <div
              key={i}
              id={`result-card-${i}`}
              style={{
                width: 794,
                minHeight: 1123,
                padding: "40px 40px",
                background: "#fff",
                color: "#000",
                fontFamily: "sans-serif",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header exactly like Mobile App */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderBottom: "3px solid #3730A3",
                  paddingBottom: 15,
                  marginBottom: 20,
                }}
              >
                <img
                  src="/logo.png"
                  style={{
                    position: "absolute",
                    left: 0,
                    width: 60,
                    height: 60,
                    objectFit: "contain",
                  }}
                  alt="Logo"
                />
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#1E3A8A",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    The Seeks Academy Fort Abbas
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#475569",
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    Result Sheet ({data.testCategory} {data.testTitle} Session {data.session})
                  </div>
                </div>
              </div>

              {/* Student Info Section */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 8,
                  padding: "15px 20px",
                  border: "1px solid #E2E8F0",
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", marginBottom: 10 }}>
                  <div style={{ flex: 1, display: "flex" }}>
                    <div
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        color: "#475569",
                        fontSize: 14,
                      }}
                    >
                      Name:
                    </div>
                    <div
                      style={{
                        flex: 2,
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: 14,
                      }}
                    >
                      {data.student.fullname || data.student.name || "-"}
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex" }}>
                    <div
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        color: "#475569",
                        fontSize: 14,
                      }}
                    >
                      Roll No.
                    </div>
                    <div
                      style={{
                        flex: 2,
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: 14,
                      }}
                    >
                      {data.student.rollno || data.student.studentId || "-"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex" }}>
                  <div style={{ flex: 1, display: "flex" }}>
                    <div
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        color: "#475569",
                        fontSize: 14,
                      }}
                    >
                      Father Name:
                    </div>
                    <div
                      style={{
                        flex: 2,
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: 14,
                      }}
                    >
                      {data.student.fathername ||
                        data.student.fatherName ||
                        "-"}
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex" }}>
                    <div
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        color: "#475569",
                        fontSize: 14,
                      }}
                    >
                      Class:
                    </div>
                    <div
                      style={{
                        flex: 2,
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: 14,
                      }}
                    >
                      {data.studentClass}
                      {data.student.section ? ` (${data.student.section})` : ""}
                    </div>
                  </div>
                </div>
              </div>

              {/* Marks Table constructed using Flex to perfectly match React Native layout */}
              <div
                style={{
                  position: "relative",
                  border: "1px solid #E2E8F0",
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: 10,
                  backgroundColor: "#fff",
                }}
              >
                {/* Watermark Logo */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 300,
                    height: 300,
                    backgroundImage: "url('/logo.png')",
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    opacity: 0.05,
                    zIndex: 0,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    background: "#3730A3",
                    color: "#fff",
                    padding: "12px",
                    fontWeight: 600,
                    fontSize: 14,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div style={{ flex: 2 }}>Subjects</div>
                  <div style={{ flex: 1, textAlign: "center" }}>Total</div>
                  <div style={{ flex: 1, textAlign: "center" }}>Obtained</div>
                  <div style={{ flex: 1, textAlign: "center" }}>%</div>
                  <div style={{ flex: 1, textAlign: "center" }}>Grade</div>
                  <div
                    style={{ flex: 1.5, textAlign: "left", paddingLeft: 10 }}
                  >
                    Remarks
                  </div>
                </div>

                {data.subjects.map((sub: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      padding: "12px",
                      background: idx % 2 === 1 ? "rgba(0,0,0,0.03)" : "transparent",
                      borderBottom: "1px solid #E2E8F0",
                      fontSize: 14,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <div style={{ flex: 2, fontWeight: 600, color: "#1E293B" }}>
                      {sub.name}
                    </div>
                    <div
                      style={{ flex: 1, textAlign: "center", color: "#475569" }}
                    >
                      {sub.totalMarks}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        textAlign: "center",
                        fontWeight: 700,
                        color: "#0F172A",
                      }}
                    >
                      {sub.obtainedMarks}
                    </div>
                    <div
                      style={{ flex: 1, textAlign: "center", color: "#475569" }}
                    >
                      {sub.percentage.toFixed(1)}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        textAlign: "center",
                        fontWeight: 700,
                        color: sub.grade === "Fail" ? "#DC2626" : "#16A34A",
                      }}
                    >
                      {sub.grade}
                    </div>
                    <div
                      style={{
                        flex: 1.5,
                        textAlign: "left",
                        paddingLeft: 10,
                        color: "#64748B",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {sub.remarks}
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    display: "flex",
                    background: "#1E293B",
                    color: "#fff",
                    padding: "12px",
                    fontSize: 14,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div style={{ flex: 2, fontWeight: 700 }}>Total</div>
                  <div
                    style={{ flex: 1, textAlign: "center", fontWeight: 700 }}
                  >
                    {data.totalPossible}
                  </div>
                  <div
                    style={{ flex: 1, textAlign: "center", fontWeight: 700 }}
                  >
                    {data.totalObtained}
                  </div>
                  <div
                    style={{ flex: 1, textAlign: "center", fontWeight: 700 }}
                  >
                    {data.overallPerc.toFixed(1)}
                  </div>
                  <div
                    style={{
                      flex: 2.5,
                      textAlign: "left",
                      paddingLeft: 10,
                      fontWeight: 700,
                    }}
                  >
                    Position:{" "}
                    <span style={{ color: "#FBBF24" }}>{data.position}</span>
                  </div>
                </div>
              </div>

              {/* Post-Table Notes Section */}
              <div style={{ flex: 1, padding: "0 10px" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 15px 0", color: "#0f172a" }}>
                  The candidate has {data.gradeRes.grade === "Fail" ? "Failed" : "Passed"} and obtained Marks {numberToWords(Math.round(data.totalObtained))}.
                </h3>
                
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#1e293b", textTransform: "uppercase" }}>Note:</h4>
                <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.6, textAlign: "justify" }}>
                  (i) This result card is issued for informational purposes only. In case of any errors, omissions, or necessary corrections, the student must contact the Academy Administration within 2 days of the result declaration.
                  <br />
                  (ii) A star (*) next to a subject indicates that the student has passed with concessional marks (grace marks) as per Academy rules.
                </div>
              </div>

              {/* Footer exactly like Mobile App */}
              <div
                style={{
                  marginTop: "auto",
                  borderTopWidth: 2,
                  borderTopColor: "#E2E8F0",
                  borderTopStyle: "solid",
                  paddingTop: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#475569",
                    fontStyle: "italic",
                    marginBottom: 30,
                    textAlign: "center",
                  }}
                >
                  Please contact the Principal for further support with your
                  child's progress.
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      paddingLeft: 10,
                    }}
                  >
                    <QRCodeCanvas
                      value="https://play.google.com/store/apps/details?id=com.TheSeeksAcademy.Students"
                      size={60}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        color: "#475569",
                        fontWeight: 600,
                        maxWidth: 150,
                      }}
                    >
                      Scan to download
                      <br />
                      The Seeks Students App
                      <br />
                      from Google Play Store
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      paddingRight: 40,
                      paddingBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 250,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          width: "100%",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            color: "#1E293B",
                            fontWeight: 600,
                          }}
                        >
                          Parent's Signature:
                        </span>
                        <div
                          style={{ flex: 1, borderBottom: "1px solid #1E293B" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 10,
                    color: "#94a3b8",
                    fontStyle: "italic",
                    letterSpacing: 0.5,
                  }}
                >
                  <div style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                    Printed on: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    <br />
                    <span style={{ fontSize: 9 }}>
                      This result is auto-generated by <span style={{ fontWeight: 600, color: "#64748b" }}>Admin Panel</span>
                    </span>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 15, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span>The Seeks Academy, Near Mudrassa Mazhar-ul-Aloom, Fort Abbas</span>
                    </div>
                    
                    <div style={{ width: 1, height: 12, backgroundColor: "#cbd5e1" }}></div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <span>0348-7000302</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
