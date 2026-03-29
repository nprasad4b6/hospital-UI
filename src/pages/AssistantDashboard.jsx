import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Zap, Pencil, User } from "lucide-react";
import { useQueueVoice } from "../hooks/useQueueVoice";
import { toTitleCase } from "../utils/formatters";
import { auth } from "../firebase";

const SOCKET_SERVER = process.env.REACT_APP_API_URL || "http://localhost:5000";

const AssistantDashboard = () => {
  const navigate = useNavigate();
  // keep entire queue data so we can print all patients for the day
  const [fullQueue, setFullQueue] = useState([]);
  const [socket, setSocket] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    // compute IST today
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const ist = new Date(Date.now() + IST_OFFSET_MS);
    const y = ist.getUTCFullYear();
    const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
    const d = String(ist.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [showAllByDate, setShowAllByDate] = useState(false);
  const [showLastThreeMonths, setShowLastThreeMonths] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [historyPatients, setHistoryPatients] = useState([]);
  const [doctorBreakStatus, setDoctorBreakStatus] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});
  const [undoAction, setUndoAction] = useState(null);
  const [selectedDateTotalCount, setSelectedDateTotalCount] = useState(0);
  const [doctors, setDoctors] = useState([]);
  const [activeDoctorId, setActiveDoctorId] = useState(null);
  const activeDoctorTab = useMemo(() => {
    if (!activeDoctorId) return 0;
    const idx = doctors.findIndex((d) => d._id === activeDoctorId);
    return idx >= 0 ? idx + 1 : 0;
  }, [activeDoctorId, doctors]);
  const isAllDoctorsSelected = activeDoctorTab === 0;
  const [editingPatient, setEditingPatient] = useState(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "FEMALE",
    guardianName: "",
    relation: "",
    address: "",
  });
  const undoTimeoutRef = useRef(null);
  const showAllByDateRef = useRef(showAllByDate);
  const selectedDateRef = useRef(selectedDate);
  const updateQueueDisplayRef = useRef(null);
  const { announcePatientCall, isSupported: isVoiceSupported } =
    useQueueVoice();

  // Fetch active doctors once on mount for tab rendering
  useEffect(() => {
    axios
      .get(`${SOCKET_SERVER}/api/doctors`)
      .then((res) => setDoctors(Array.isArray(res.data) ? res.data : []))
      .catch(() => setDoctors([]));
  }, []);

  const systemToday = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const isPastDateView = selectedDate < systemToday;
  const isLastThreeMonthsMode = showLastThreeMonths;
  const isShowAllMode = !showLastThreeMonths && showAllByDate;
  const isTodayMode = !showLastThreeMonths && !showAllByDate;
  const showNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  }, []);

  // Keep refs in sync with state so socket handlers always read latest values
  useEffect(() => {
    showAllByDateRef.current = showAllByDate;
  }, [showAllByDate]);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // update queue state based on server-sent queue
  const updateQueueDisplay = useCallback((queue) => {
    // keep a copy of the entire queue (used for printing/export)
    setFullQueue(queue || []);
  }, []);

  // Keep ref in sync so the socket handler always calls the latest version
  useEffect(() => {
    updateQueueDisplayRef.current = updateQueueDisplay;
  }, [updateQueueDisplay]);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server - Assistant");
      if (showAllByDateRef.current && selectedDateRef.current) {
        newSocket.emit("GET_QUEUE_BY_DATE", selectedDateRef.current);
      } else {
        newSocket.emit("GET_QUEUE");
      }
    });

    newSocket.on("QUEUE_UPDATE", (data) => {
      updateQueueDisplayRef.current(data);
    });

    newSocket.on("PATIENT_REGISTERED", (payload) => {
      if (payload && payload.queue) {
        updateQueueDisplayRef.current(payload.queue);
      } else {
        newSocket.emit("GET_QUEUE");
      }
    });

    newSocket.on("PATIENT_STARTED", (payload) => {
      if (payload && payload.queue) {
        updateQueueDisplayRef.current(payload.queue);
      } else {
        newSocket.emit("GET_QUEUE");
      }
    });

    newSocket.on("CONSULTATION_STARTED", () => {
      showNotification("Consultation started!");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    return () => {
      newSocket.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle date selection change
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setShowLastThreeMonths(false);
    setShowAllByDate(true);
    if (socket) {
      socket.emit("GET_QUEUE_BY_DATE", newDate);
    }
  };

  const handleToggleShowAll = () => {
    setShowLastThreeMonths(false);
    setShowAllByDate(true);
    if (socket) {
      socket.emit("GET_QUEUE_BY_DATE", selectedDate);
    }
  };

  const handleResetToToday = () => {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const ist = new Date(Date.now() + IST_OFFSET_MS);
    const y = ist.getUTCFullYear();
    const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
    const d = String(ist.getUTCDate()).padStart(2, "0");
    const today = `${y}-${m}-${d}`;
    setSelectedDate(today);
    setShowLastThreeMonths(false);
    setShowAllByDate(false);
    if (socket) socket.emit("GET_QUEUE");
  };

  const queueRefresh = () => {
    if (showLastThreeMonths) {
      fetchHistoryPatients(patientSearch);
      return;
    }

    if (socket) {
      if (showAllByDate && selectedDate) {
        socket.emit("GET_QUEUE_BY_DATE", selectedDate);
      } else {
        socket.emit("GET_QUEUE");
      }
    }
  };

  const fetchHistoryPatients = useCallback(
    async (searchText = "") => {
      try {
        const response = await axios.get(
          `${SOCKET_SERVER}/api/patients/history`,
          {
            params: {
              months: 3,
              search: searchText?.trim() || undefined,
            },
          },
        );

        setHistoryPatients(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to fetch patient history:", error);
        showNotification("Failed to load last 3 months patient visits");
      }
    },
    [showNotification],
  );

  const fetchSelectedDateTotalCount = useCallback(async () => {
    if (!selectedDate) return;
    try {
      const response = await axios.get(`${SOCKET_SERVER}/api/queue-by-date`, {
        params: { date: selectedDate },
      });
      const list = Array.isArray(response.data) ? response.data : [];
      setSelectedDateTotalCount(list.length);
    } catch (error) {
      console.error("Failed to fetch selected date total count:", error);
    }
  }, [selectedDate]);

  // Badge count: scoped to active doctor when a tab is selected
  const badgePatientCount = useMemo(() => {
    if (!activeDoctorId) return selectedDateTotalCount;
    return fullQueue.filter((p) => String(p?.doctorId) === activeDoctorId)
      .length;
  }, [activeDoctorId, selectedDateTotalCount, fullQueue]);

  // Per-doctor waiting patient counts for tab badges
  const doctorWaitingCounts = useMemo(() => {
    const counts = {};
    fullQueue.forEach((p) => {
      if (p.status === "WAITING" && p.doctorId) {
        const key = String(p.doctorId);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [fullQueue]);

  const allWaitingCount = useMemo(
    () => fullQueue.filter((p) => p.status === "WAITING").length,
    [fullQueue],
  );

  // Per-doctor: lowest token number among WAITING patients (for tab badge)
  const doctorNextTokens = useMemo(() => {
    const tokens = {};
    fullQueue.forEach((p) => {
      if (p.status === "WAITING" && p.doctorId) {
        const key = String(p.doctorId);
        if (tokens[key] === undefined || p.tokenNumber < tokens[key]) {
          tokens[key] = p.tokenNumber;
        }
      }
    });
    return tokens;
  }, [fullQueue]);

  // Derive break state for whichever doctor tab is active
  const isBreak = !!doctorBreakStatus[activeDoctorId || "all"];

  // Name of the currently selected doctor (null = All)
  const activeDoctorName = useMemo(() => {
    if (!activeDoctorId) return null;
    return doctors.find((d) => d._id === activeDoctorId)?.name || null;
  }, [activeDoctorId, doctors]);

  // Current IN_PROGRESS patient for active doctor tab (or first in-progress for All)
  const activeCurrentPatient = useMemo(() => {
    const inProgressList = fullQueue.filter((p) => p.status === "IN_PROGRESS");
    if (activeDoctorId) {
      return (
        inProgressList.find((p) => String(p?.doctorId) === activeDoctorId) ||
        null
      );
    }
    return inProgressList[0] || null;
  }, [fullQueue, activeDoctorId]);

  // announce currently served patient in active doctor scope when it changes
  useEffect(() => {
    if (activeCurrentPatient && voiceEnabled && isVoiceSupported) {
      announcePatientCall(
        activeCurrentPatient.tokenNumber,
        activeCurrentPatient.name,
      );
    }
  }, [
    activeCurrentPatient,
    voiceEnabled,
    isVoiceSupported,
    announcePatientCall,
  ]);

  useEffect(() => {
    fetchSelectedDateTotalCount();
  }, [fetchSelectedDateTotalCount, fullQueue.length]);

  const handleToggleLastThreeMonths = () => {
    setShowAllByDate(false);
    setShowLastThreeMonths(true);
    fetchHistoryPatients(patientSearch);
  };

  useEffect(() => {
    if (!showLastThreeMonths) return;

    const timeoutId = setTimeout(() => {
      fetchHistoryPatients(patientSearch);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [patientSearch, showLastThreeMonths, fetchHistoryPatients]);

  const registerUndoAction = (label, operations) => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    setUndoAction({ label, operations });
    undoTimeoutRef.current = setTimeout(() => {
      setUndoAction(null);
    }, 6000);
  };

  const handleUndo = async () => {
    if (!undoAction?.operations?.length) return;
    try {
      await Promise.all(
        undoAction.operations.map((op) =>
          axios.put(`${SOCKET_SERVER}/api/patients/${op.id}/status`, {
            status: op.from,
          }),
        ),
      );
      showNotification("Last action undone");
      setUndoAction(null);
      queueRefresh();
    } catch (error) {
      console.error("Undo failed:", error);
      showNotification("Failed to undo action");
    }
  };

  const handleCallNext = async () => {
    if (isPastDateView) {
      showNotification("Actions are disabled for past dates");
      return;
    }

    if (isAllDoctorsSelected) {
      showNotification("Select a specific doctor first to call next patient");
      return;
    }

    if (!socket || isLoading) return;

    const currentInProgress = activeDoctorId
      ? fullQueue.find(
          (p) =>
            p.status === "IN_PROGRESS" &&
            String(p?.doctorId) === activeDoctorId,
        )
      : fullQueue.find((p) => p.status === "IN_PROGRESS");

    // When a doctor tab is active, only pick from that doctor's waiting patients
    const waitingPool = activeDoctorId
      ? fullQueue.filter(
          (p) =>
            p.status === "WAITING" && String(p?.doctorId) === activeDoctorId,
        )
      : fullQueue.filter((p) => p.status === "WAITING");
    const nextWaiting = waitingPool
      .slice()
      .sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999))[0];

    setIsLoading(true);
    try {
      if (activeDoctorId && nextWaiting) {
        // Doctor-scoped: complete current for selected doctor, then promote next for same doctor
        if (currentInProgress?._id) {
          await axios.put(
            `${SOCKET_SERVER}/api/patients/${currentInProgress._id}/status`,
            { status: "COMPLETED" },
          );
        }
        await axios.put(
          `${SOCKET_SERVER}/api/patients/${nextWaiting._id}/status`,
          { status: "IN_PROGRESS" },
        );
      } else {
        // Global: use existing start-consultation endpoint
        await axios.post(`${SOCKET_SERVER}/api/start-consultation`, {});
      }

      showNotification("Calling next patient...");

      const ops = [];
      if (currentInProgress?._id) {
        ops.push({
          id: currentInProgress._id,
          from: "IN_PROGRESS",
          to: "COMPLETED",
        });
      }
      if (nextWaiting?._id) {
        ops.push({ id: nextWaiting._id, from: "WAITING", to: "IN_PROGRESS" });
      }
      if (ops.length) {
        registerUndoAction("Call Next", ops);
      }
      queueRefresh();
    } catch (error) {
      console.error("Call next failed:", error);
      showNotification("Failed to call next patient");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVisitDone = async () => {
    if (!activeCurrentPatient?._id || isLoading) return;

    setIsLoading(true);
    try {
      await axios.put(
        `${SOCKET_SERVER}/api/patients/${activeCurrentPatient._id}/status`,
        {
          status: "COMPLETED",
        },
      );

      showNotification("Visit marked as completed");
      queueRefresh();
    } catch (error) {
      console.error("Visit done failed:", error);
      showNotification("Failed to mark visit as completed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreakToggle = () => {
    const key = activeDoctorId || "all";
    const currentBreak = !!doctorBreakStatus[key];
    const nextBreak = !currentBreak;
    setDoctorBreakStatus((prev) => ({ ...prev, [key]: nextBreak }));
    if (socket) {
      socket.emit("DOCTOR_BREAK_STATUS", {
        isOnBreak: nextBreak,
        doctorId: key,
      });
    }
    showNotification(`Doctor ${nextBreak ? "on break" : "back"}`);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      showNotification("Failed to logout");
    }
  };

  const handleStatusAction = async (
    patientId,
    status,
    message,
    previousStatus,
    options = {},
  ) => {
    if (isPastDateView) {
      showNotification("Actions are disabled for past dates");
      return;
    }

    const { confirmMessage = "", enableUndo = true } = options;

    if (confirmMessage) {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;
    }

    try {
      await axios.put(`${SOCKET_SERVER}/api/patients/${patientId}/status`, {
        status,
      });
      showNotification(message);

      if (enableUndo && previousStatus && previousStatus !== status) {
        registerUndoAction(message, [
          {
            id: patientId,
            from: previousStatus,
            to: status,
          },
        ]);
      }

      queueRefresh();
    } catch (error) {
      console.error("Status update failed:", error);
      showNotification("Failed to update patient status");
    }
  };

  const handleEmergencyCall = async (patientId, patientName) => {
    if (isPastDateView) {
      showNotification("Actions are disabled for past dates");
      return;
    }

    if (!patientId || isLoading) return;

    const safeName = toTitleCase(patientName || "Patient");
    const currentInProgress = fullQueue.find((p) => p.status === "IN_PROGRESS");

    if (currentInProgress && currentInProgress._id !== patientId) {
      const currentName = toTitleCase(
        currentInProgress.name || "Current Patient",
      );
      const confirmed = window.confirm(
        `Patient ${currentName} is inside. Mark them as DONE and call ${safeName} now?`,
      );
      if (!confirmed) return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${SOCKET_SERVER}/api/patients/call`, {
        patientId,
      });

      showNotification(`Emergency call started for ${safeName}`);
      queueRefresh();

      const calledPatient = response?.data?.patient || response?.data || null;
      const tokenToAnnounce = calledPatient?.tokenNumber;
      const nameToAnnounce = calledPatient?.name || patientName;

      if (voiceEnabled && isVoiceSupported && tokenToAnnounce) {
        announcePatientCall(tokenToAnnounce, nameToAnnounce);
      }
    } catch (error) {
      console.error("Emergency call failed:", error);
      showNotification("Failed to start emergency call");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (patient) => {
    if (!patient?._id) return;
    setEditingPatient(patient);
    setEditForm({
      name: patient?.name || "",
      phone: patient?.phone || "",
      age:
        patient?.age === undefined || patient?.age === null
          ? ""
          : String(patient.age),
      gender: patient?.gender || "FEMALE",
      guardianName: patient?.guardianName || "",
      relation: patient?.relation || "",
      address: patient?.address || "",
    });
  };

  const closeEditModal = () => {
    if (isEditSaving) return;
    setEditingPatient(null);
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePatientEdit = async () => {
    if (!editingPatient?._id || isEditSaving) return;

    const name = String(editForm.name || "").trim();
    const phone = String(editForm.phone || "").trim();
    const ageText = String(editForm.age || "").trim();
    const guardianName = String(editForm.guardianName || "").trim();
    const relation = String(editForm.relation || "").trim();
    const address = String(editForm.address || "").trim();

    if (!name || name.length < 2) {
      showNotification("Name must be at least 2 characters");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      showNotification("Phone number must be 10 digits");
      return;
    }
    if (!ageText || Number.isNaN(Number(ageText))) {
      showNotification("Age is required");
      return;
    }
    const age = Number(ageText);
    if (age < 0 || age > 120) {
      showNotification("Age must be between 0 and 120");
      return;
    }

    if (relation && !["Father", "Mother", "Guardian"].includes(relation)) {
      showNotification("Invalid relation selected");
      return;
    }

    setIsEditSaving(true);
    try {
      await axios.put(`${SOCKET_SERVER}/api/patients/${editingPatient._id}`, {
        name,
        phone,
        age,
        gender: editForm.gender || "FEMALE",
        guardianName,
        relation,
        address,
      });

      showNotification("Patient details updated");
      setEditingPatient(null);
      queueRefresh();
    } catch (error) {
      console.error("Patient edit failed:", error);
      const serverMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update patient details";
      showNotification(serverMessage);
    } finally {
      setIsEditSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const waitingSkippedPatients = fullQueue.filter(
    (p) =>
      p.status === "WAITING" ||
      p.status === "SKIPPED" ||
      p.status === "ON_HOLD" ||
      p.status === "SENT_FOR_TEST",
  );

  const togglePatientInfo = (patientId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [patientId]: !prev[patientId],
    }));
  };

  const displayedPatients = useMemo(() => {
    const query = String(patientSearch || "")
      .trim()
      .toLowerCase();
    const source = showLastThreeMonths
      ? historyPatients
      : showAllByDate
        ? fullQueue
        : fullQueue
            .filter((patient) => patient.status === "WAITING")
            .filter((patient) =>
              activeDoctorId
                ? String(patient?.doctorId) === activeDoctorId
                : true,
            )
            .slice(0, 5);
    const searchableList = showLastThreeMonths ? historyPatients : fullQueue;

    let list = !query
      ? source
      : searchableList.filter((patient) => {
          const name = String(patient?.name || "").toLowerCase();
          const phone = String(patient?.phone || "").toLowerCase();
          const token = String(patient?.tokenNumber || "");
          return (
            name.includes(query) ||
            phone.includes(query) ||
            token.includes(query)
          );
        });

    if (activeDoctorId) {
      list = list.filter((p) => String(p?.doctorId) === activeDoctorId);
    }

    return list;
  }, [
    patientSearch,
    fullQueue,
    showAllByDate,
    showLastThreeMonths,
    historyPatients,
    activeDoctorId,
  ]);

  // Get next waiting patient to display in placeholder
  const nextPatient = useMemo(() => {
    const waiting = displayedPatients.filter((p) => p.status === "WAITING");
    return waiting.length > 0 ? waiting[0] : null;
  }, [displayedPatients]);

  const normalizedNameCount = displayedPatients.reduce((acc, patient) => {
    const key = String(patient?.name || "")
      .trim()
      .toLowerCase();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    // Auto-expand cards with duplicate names so assistant can verify details immediately
    const duplicateIds = displayedPatients
      .filter((patient) => {
        const key = String(patient?.name || "")
          .trim()
          .toLowerCase();
        return key && normalizedNameCount[key] > 1;
      })
      .map((patient) => patient._id)
      .filter(Boolean);

    if (duplicateIds.length === 0) return;

    setExpandedCards((prev) => {
      const next = { ...prev };
      duplicateIds.forEach((id) => {
        if (next[id] === undefined) {
          next[id] = true;
        }
      });
      return next;
    });
  }, [displayedPatients, normalizedNameCount]);

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  /**
   * Always print full selected-day records by fetching server-side date-filtered data
   * so print output is complete even if current UI shows only a subset.
   */
  const handlePrint = async () => {
    try {
      const response = await axios.get(`${SOCKET_SERVER}/api/queue-by-date`, {
        params: { date: selectedDate },
      });
      const doctorNameById = Object.fromEntries(
        (doctors || []).map((d) => [String(d?._id || ""), d?.name || "-"]),
      );

      const patientsForDate = Array.isArray(response.data) ? response.data : [];
      const sortedPatientsForDate = patientsForDate
        .slice()
        .sort((a, b) => (a?.tokenNumber || 0) - (b?.tokenNumber || 0));

      if (sortedPatientsForDate.length === 0) {
        showNotification("No patients found for selected date");
        return;
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const title = `All Patients for ${selectedDate}`;
      let html = "<html><head>";
      html += `<title>${escapeHtml(title)}</title>`;
      html += "<style>";
      html += "body{font-family:Arial,sans-serif;padding:16px;color:#111;}";
      html += "h2{margin:0 0 6px 0;}";
      html += "p{margin:0 0 12px 0;color:#555;}";
      html += "table{width:100%;border-collapse:collapse;font-size:12px;}";
      html +=
        "th,td{border:1px solid #444;padding:6px;text-align:left;vertical-align:top;}";
      html += "th{background:#f3f4f6;font-weight:700;}";
      html +=
        ".status-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-weight:700;font-size:11px;line-height:1.4;}";
      html += ".status-completed{background:#dcfce7;color:#166534;}";
      html += ".status-sent-for-test{background:#e0e7ff;color:#3730a3;}";
      html += ".status-waiting{background:#e5e7eb;color:#1e3a8a;}";
      html += ".status-skipped{background:#fee2e2;color:#991b1b;}";
      html += ".status-default{background:#f3f4f6;color:#374151;}";
      html += "</style></head><body>";
      html += `<h2>${escapeHtml(title)}</h2>`;
      html += `<p>Total Patients: ${sortedPatientsForDate.length}</p>`;
      html += "<table><thead><tr>";
      html +=
        "<th>Token</th><th>Name</th><th>Phone</th><th>Age</th><th>Gender</th><th>Doctor</th><th>Guardian Name</th><th>Relation</th><th>Place/City</th><th>Type</th><th>Status</th><th>Created At</th><th>Started At</th><th>Completed At</th>";
      html += "</tr></thead><tbody>";

      sortedPatientsForDate.forEach((patient) => {
        const rawStatus = String(patient?.status || "").toUpperCase();
        const normalizedStatus =
          rawStatus === "ON_HOLD" ? "SENT_FOR_TEST" : rawStatus;
        const statusClass =
          normalizedStatus === "COMPLETED"
            ? "status-completed"
            : normalizedStatus === "SENT_FOR_TEST"
              ? "status-sent-for-test"
              : normalizedStatus === "WAITING"
                ? "status-waiting"
                : normalizedStatus === "SKIPPED"
                  ? "status-skipped"
                  : "status-default";
        const completedAtDisplay =
          normalizedStatus === "SENT_FOR_TEST"
            ? "In Test"
            : formatDateTime(patient?.completedAt);
        const doctorName =
          typeof patient?.doctorId === "object" && patient?.doctorId?.name
            ? patient.doctorId.name
            : doctorNameById[String(patient?.doctorId || "")] || "-";
        html += "<tr>";
        html += `<td>${escapeHtml(patient?.tokenNumber)}</td>`;
        html += `<td>${escapeHtml(patient?.name)}</td>`;
        html += `<td>${escapeHtml(patient?.phone)}</td>`;
        html += `<td>${escapeHtml(patient?.age)}</td>`;
        html += `<td>${escapeHtml(patient?.gender)}</td>`;
        html += `<td>${escapeHtml(doctorName)}</td>`;
        html += `<td>${escapeHtml(patient?.guardianName || "-")}</td>`;
        html += `<td>${escapeHtml(patient?.relation || "-")}</td>`;
        html += `<td>${escapeHtml(patient?.address || "-")}</td>`;
        html += `<td>${escapeHtml(patient?.type)}</td>`;
        html += `<td><span class="status-badge ${statusClass}">${escapeHtml(normalizedStatus || "-")}</span></td>`;
        html += `<td>${escapeHtml(formatDateTime(patient?.createdAt))}</td>`;
        html += `<td>${escapeHtml(formatDateTime(patient?.startedAt))}</td>`;
        html += `<td>${escapeHtml(completedAtDisplay)}</td>`;
        html += "</tr>";
      });

      html += "</tbody></table></body></html>";

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error("Failed to print full day patient list:", error);
      showNotification("Failed to load full patient list for print");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-50 to-blue-50 p-4 pb-28 md:pb-6">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b-2 border-medical-200 shadow-md py-2 px-4 md:p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2 md:gap-3">
          <div>
            <div className="flex items-center">
              <img
                src="/shalom-logo.avif"
                alt="Shalom Hospital Logo"
                style={{ height: "45px", width: "auto", marginRight: "10px" }}
              />
              <h1 className="text-base md:text-2xl font-bold text-medical-700 leading-tight">
                Assistant Panel
              </h1>
            </div>
            <p className="text-[10px] md:text-xs text-gray-600 hidden md:block">
              Clinical Assistant Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/patient-registration"
              className="hidden md:inline text-xs px-3 py-2 rounded-lg bg-medical-100 text-medical-700 hover:bg-medical-200 font-semibold"
            >
              Patient Registration
            </a>

            <a
              href="/lobby"
              className="hidden md:inline text-xs px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-semibold"
            >
              Lobby Display
            </a>

            {/* Date filter & Show All toggle */}
            <div className="hidden md:flex items-center gap-2 bg-white px-3 py-1 rounded-lg">
              <label className="text-xs text-gray-700 font-semibold mr-2">
                Filter date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="text-xs px-2 py-1 border rounded-md"
              />
              <button
                type="button"
                onClick={handleToggleShowAll}
                className={`ml-3 text-xs px-2 py-1 rounded whitespace-nowrap min-w-[90px] ${isShowAllMode ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                {isShowAllMode ? "Showing All" : "Show All"}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="ml-2 text-xs px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600"
                title="Print patient list for selected date"
              >
                Print
              </button>
            </div>

            {/* Voice Toggle in Header */}
            {isVoiceSupported && (
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`rounded-full p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all ${
                  voiceEnabled
                    ? "bg-green-100 text-green-600 hover:bg-green-200"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
                title={voiceEnabled ? "Voice Enabled" : "Voice Disabled"}
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  {voiceEnabled ? (
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z M17.3 11c0 2.29-1.72 4.21-4 4.47v2.53h2v2H9v-2h2v-2.53c-2.28-.26-4-2.18-4-4.47H5c0 3.53 2.61 6.43 6 6.92v2.08h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  ) : (
                    <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.40989519,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L21.714504,3.42671123 L3.03521743,6.3286752 L3.50612381,12.4744748 Z" />
                  )}
                </svg>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="text-xs px-3 py-2 min-h-[44px] rounded-lg bg-red-500 text-white hover:bg-red-600 font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-24 left-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse max-w-md mx-auto">
          {notification}
        </div>
      )}

      {/* Main Content - Top Padding for Fixed Header */}
      <div className="max-w-7xl mx-auto mt-14 md:mt-24 px-4">
        {isPastDateView && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Viewing history: Actions are disabled for past dates.
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - 40% */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            {/* Doctor Break Status */}
            <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-medical-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {activeDoctorName ? activeDoctorName : "Doctor Status"}
                  </p>
                  {activeDoctorName && (
                    <p className="text-[11px] text-gray-400 leading-tight">
                      {doctors.find((d) => d._id === activeDoctorId)
                        ?.specialization || ""}
                    </p>
                  )}
                  <p
                    className={`text-xs font-bold mt-0.5 ${isBreak ? "text-orange-600" : "text-green-600"}`}
                  >
                    {isBreak ? "🔴 ON BREAK" : "🟢 ACTIVE"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="self-center rounded-lg bg-blue-50 border border-blue-100 shadow-sm px-3 py-2 min-w-[132px] text-center flex flex-col items-center justify-center">
                    <p className="text-2xl font-black text-blue-900 leading-none">
                      {badgePatientCount}
                    </p>
                    <p className="text-[10px] font-semibold text-blue-700 mt-1 uppercase tracking-wide inline-flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {activeDoctorId ? "Dr. Patients" : "Total Patients"}
                    </p>
                  </div>

                  {/* Break Toggle Switch */}
                  <button
                    type="button"
                    onClick={handleBreakToggle}
                    className={`relative inline-flex h-10 w-16 items-center rounded-full transition-all ${isBreak ? "bg-orange-500" : "bg-green-500"} shadow-md`}
                  >
                    <span
                      className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${isBreak ? "translate-x-7" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Toggle to pause wait-time countdowns
              </p>
            </div>

            {/* Active Patient Card */}
            {activeCurrentPatient ? (
              <div className="bg-gradient-to-br from-medical-600 to-medical-700 rounded-3xl shadow-2xl p-6 text-white">
                <p className="text-sm font-semibold opacity-90">
                  NOW BEING SERVED
                </p>

                <div className="my-4">
                  <p className="text-6xl font-black text-center mb-2">
                    {activeCurrentPatient.tokenNumber}
                  </p>
                  <p className="text-center text-medical-100 font-semibold">
                    Token Number
                  </p>
                </div>

                <div className="bg-white bg-opacity-10 rounded-xl p-4 mb-4 space-y-2">
                  <div>
                    <p className="text-xs opacity-75">PATIENT NAME</p>
                    <p className="text-lg font-bold">
                      {toTitleCase(activeCurrentPatient.name)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs opacity-75">PHONE</p>
                      <p className="text-sm font-semibold">
                        {activeCurrentPatient.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs opacity-75">AGE / GENDER</p>
                      <p className="text-sm font-semibold">
                        {activeCurrentPatient.age ?? "-"} /{" "}
                        {activeCurrentPatient.gender || "FEMALE"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs opacity-75">TYPE</p>
                      <p
                        className={`text-sm font-bold ${activeCurrentPatient.type === "BOOKED" ? "text-yellow-300" : "text-blue-300"}`}
                      >
                        {activeCurrentPatient.type}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCallNext}
                  disabled={
                    isLoading ||
                    isBreak ||
                    isPastDateView ||
                    isAllDoctorsSelected
                  }
                  className={`w-full py-5 px-6 rounded-2xl font-bold text-lg transition-all transform ${isBreak || isPastDateView || isAllDoctorsSelected ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-60" : "bg-green-500 hover:bg-green-600 text-white active:scale-95 shadow-lg"} flex items-center justify-center gap-3`}
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="w-6 h-6 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v4m6.364 1.636l-2.828-2.828m2.828 9.172l2.828 2.828M12 20v-4m-6.364-1.636l2.828 2.828m-2.828-9.172l-2.828-2.828"
                        />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 011.502-.684l1.498 4.493a1 1 0 00.948.684H19a2 2 0 012 2v2M3 5v12a2 2 0 002 2h14a2 2 0 002-2V5m-5 8h.01M9 9h.01"
                        />
                      </svg>
                      CALL NEXT
                    </>
                  )}
                </button>

                <button
                  onClick={handleVisitDone}
                  disabled={isLoading}
                  className="w-full mt-3 py-3 px-4 rounded-xl font-bold text-sm bg-white text-medical-700 hover:bg-medical-50 disabled:opacity-60"
                >
                  Visit Done
                </button>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button
                    onClick={() =>
                      handleStatusAction(
                        activeCurrentPatient._id,
                        "SKIPPED",
                        "Patient moved to skipped list",
                        activeCurrentPatient.status,
                        {
                          confirmMessage:
                            "Skip current patient? You can undo this for a few seconds.",
                        },
                      )
                    }
                    disabled={isLoading || isBreak || isPastDateView}
                    className="py-3 px-3 rounded-xl font-bold text-sm bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-60"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() =>
                      handleStatusAction(
                        activeCurrentPatient._id,
                        "SENT_FOR_TEST",
                        "Patient sent for test",
                        activeCurrentPatient.status,
                        {
                          confirmMessage:
                            "Mark current patient as Sent for Test?",
                        },
                      )
                    }
                    disabled={isLoading || isBreak || isPastDateView}
                    className="py-3 px-3 rounded-xl font-bold text-sm bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60"
                  >
                    Sent for Test
                  </button>
                </div>

                {isBreak && (
                  <p className="text-center text-yellow-200 text-xs font-semibold mt-3">
                    ⏸ Doctor is on break - Resume to call next patient
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-lg p-8 text-center border-2 border-dashed border-gray-200">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-lg font-bold text-gray-800 mb-1">
                  No Current Patient
                </p>
                <p className="text-gray-600 text-sm mb-4">
                  {nextPatient
                    ? `Next to be called: #${nextPatient.tokenNumber} ${toTitleCase(nextPatient.name)}`
                    : "Queue is empty or all patients are completed"}
                </p>
                {nextPatient && (
                  <div className="text-xs text-gray-500 mb-4 pb-3 border-b border-gray-200">
                    <span className="inline-block">📞 {nextPatient.phone}</span>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={handleCallNext}
                    disabled={
                      isLoading ||
                      isBreak ||
                      isPastDateView ||
                      isAllDoctorsSelected
                    }
                    className={`w-full py-3 px-4 rounded-2xl font-bold text-base transition-all transform ${isBreak || isPastDateView || isAllDoctorsSelected ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-60" : "bg-green-500 hover:bg-green-600 text-white active:scale-95 shadow-lg"}`}
                  >
                    {isLoading ? "Processing..." : "CALL NEXT"}
                  </button>

                  {isBreak && (
                    <p className="text-center text-yellow-600 text-xs font-semibold mt-3">
                      ⏸ Doctor is on break - Resume to call next patient
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <button
                      disabled
                      className="py-3 px-3 rounded-xl font-bold text-sm bg-yellow-300 text-white opacity-60 cursor-not-allowed"
                    >
                      Skip
                    </button>
                    <button
                      disabled
                      className="py-3 px-3 rounded-xl font-bold text-sm bg-orange-300 text-white opacity-60 cursor-not-allowed"
                    >
                      Sent for Test
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - 60% Upcoming Patients */}
          <div className="col-span-12 lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-lg p-4 h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    📋 Upcoming Patients
                  </h2>
                  <p className="text-xs text-gray-600">
                    {showLastThreeMonths
                      ? `Last 3 months visits • ${displayedPatients.length}`
                      : patientSearch.trim()
                        ? `Search results • ${displayedPatients.length}`
                        : `Next in queue • ${displayedPatients.length}`}
                  </p>

                  {/* Date controls (visible inside Upcoming card for reliability) */}
                  <div className="mt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs text-gray-600 font-medium">
                        Date
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="text-xs px-2 py-1 border rounded-md"
                      />
                      <button
                        type="button"
                        onClick={handleToggleShowAll}
                        className={`ml-2 text-xs px-2 py-1 rounded ${isShowAllMode ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"}`}
                      >
                        {isShowAllMode ? "Showing All" : "Show All"}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToToday}
                        className={`ml-2 text-xs px-2 py-1 rounded border ${isTodayMode ? "bg-gray-800 text-white border-gray-800" : "bg-gray-50 text-gray-700"}`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleLastThreeMonths}
                        className={`ml-2 text-xs px-2 py-1 rounded border ${isLastThreeMonthsMode ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700"}`}
                        title="Search patient visits in the last 3 months"
                      >
                        Last 3 Months
                      </button>
                      <button
                        onClick={handlePrint}
                        className="ml-2 text-xs px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600"
                        title="Print patient list for selected date"
                      >
                        Print
                      </button>
                      <input
                        type="text"
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        placeholder="Search name, token, or phone"
                        className="ml-2 text-xs px-2 py-1 border rounded-md min-w-[220px]"
                      />
                      {patientSearch.trim() && (
                        <button
                          onClick={() => setPatientSearch("")}
                          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Doctor Tabs */}
              {doctors.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar">
                  {/* All tab */}
                  <button
                    type="button"
                    onClick={() => setActiveDoctorId(null)}
                    className={`relative shrink-0 text-xs px-3 pt-1.5 pb-2 rounded-lg font-semibold border-2 transition-all whitespace-nowrap min-h-[44px] ${
                      activeDoctorId === null
                        ? "bg-blue-600 text-white border-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.4)] border-b-[3px]"
                        : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    All
                    {allWaitingCount > 0 && (
                      <span
                        className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold flex items-center justify-center leading-none ${
                          activeDoctorId === null
                            ? "bg-white text-blue-700"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {allWaitingCount}
                      </span>
                    )}
                  </button>

                  {doctors.map((doc) => {
                    const waitCount = doctorWaitingCounts[doc._id] || 0;
                    const nextToken = doctorNextTokens[doc._id];
                    const isActive = activeDoctorId === doc._id;
                    return (
                      <button
                        key={doc._id}
                        type="button"
                        onClick={() => setActiveDoctorId(doc._id)}
                        className={`relative shrink-0 text-xs px-3 pt-1.5 pb-2 rounded-lg font-semibold border-2 transition-all whitespace-nowrap min-h-[44px] ${
                          isActive
                            ? "bg-blue-600 text-white border-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.4)] border-b-[3px]"
                            : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                        }`}
                        title={doc.specialization}
                      >
                        {doc.name}
                        {nextToken !== undefined && (
                          <span
                            className={`block text-[9px] font-bold mt-0.5 leading-none ${
                              isActive ? "text-blue-100" : "text-blue-500"
                            }`}
                          >
                            #{nextToken}
                          </span>
                        )}
                        {waitCount > 0 && (
                          <span
                            className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold flex items-center justify-center leading-none ${
                              isActive
                                ? "bg-white text-blue-700"
                                : "bg-blue-600 text-white"
                            }`}
                          >
                            {waitCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className={`space-y-3 animate-fadeIn`}>
                {displayedPatients.length === 0 ? (
                  <div className="p-6 text-center text-gray-600">
                    {patientSearch.trim()
                      ? "No matching patients found"
                      : "No upcoming patients"}
                  </div>
                ) : (
                  displayedPatients.map((patient) => {
                    const nameKey = String(patient?.name || "")
                      .trim()
                      .toLowerCase();
                    const hasDuplicateName = nameKey
                      ? normalizedNameCount[nameKey] > 1
                      : false;
                    const isExpanded = !!expandedCards[patient._id];

                    return (
                      <div
                        key={patient._id}
                        className={`p-3 md:p-4 rounded-lg border transition-all duration-200 hover:shadow-md hover:border-blue-200 ${
                          isPastDateView ? "readonly-card" : ""
                        } ${
                          hasDuplicateName
                            ? "border-amber-200 bg-amber-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                                Token
                              </p>
                              <p className="text-2xl font-bold text-blue-600 leading-none mt-0.5">
                                {patient.tokenNumber}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            {hasDuplicateName && (
                              <span
                                className="text-amber-600 text-xs font-bold"
                                title="Duplicate name in queue"
                              >
                                ⚠ Same name
                              </span>
                            )}
                            <button
                              onClick={() => togglePatientInfo(patient._id)}
                              className="text-xs px-3 py-2 rounded-md font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors active:bg-blue-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                              {isExpanded ? "Hide" : "Info"}
                            </button>
                            <select
                              value={patient.status}
                              onChange={(e) =>
                                handleStatusAction(
                                  patient._id,
                                  e.target.value,
                                  "Patient status updated",
                                  patient.status,
                                  { enableUndo: true },
                                )
                              }
                              disabled={isPastDateView}
                              className="text-xs px-2 py-2 rounded-md border border-gray-300 bg-white font-medium hover:border-gray-400 transition-colors min-h-[44px] cursor-pointer"
                              title="Manual status override"
                            >
                              <option value="WAITING">Waiting</option>
                              <option value="IN_PROGRESS">In-Progress</option>
                              <option value="SENT_FOR_TEST">
                                Sent for Test
                              </option>
                              <option value="SKIPPED">Skipped</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {toTitleCase(patient.name)}
                              </p>
                              <button
                                type="button"
                                onClick={() => openEditModal(patient)}
                                disabled={isPastDateView}
                                className={`transition-colors ${!isPastDateView ? "text-gray-400 hover:text-blue-600" : "text-gray-300 cursor-not-allowed"}`}
                                title={
                                  !isPastDateView
                                    ? "Edit Patient"
                                    : "Edit disabled for past dates"
                                }
                                aria-label={`Edit ${toTitleCase(patient.name)}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleEmergencyCall(patient._id, patient.name)
                                }
                                disabled={isPastDateView}
                                className={`transition-colors ${!isPastDateView ? "text-gray-400 hover:text-yellow-500" : "text-gray-300 cursor-not-allowed"}`}
                                title={
                                  !isPastDateView
                                    ? "Quick Call/Emergency"
                                    : "Quick Call/Emergency disabled for past dates"
                                }
                                aria-label={`Quick Call/Emergency for ${toTitleCase(patient.name)}`}
                              >
                                <Zap className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              📞 {patient.phone}
                            </p>
                            {isExpanded && (
                              <div className="mt-2 text-xs text-gray-700 space-y-1">
                                <p>
                                  <span className="font-semibold">Age:</span>{" "}
                                  {patient.age ?? "-"}
                                </p>
                                <p>
                                  <span className="font-semibold">Gender:</span>{" "}
                                  {patient.gender || "FEMALE"}
                                </p>
                                {(patient.guardianName || patient.relation) && (
                                  <p>
                                    <span className="font-semibold">
                                      {patient.relation
                                        ? patient.relation
                                        : "Guardian"}
                                      :
                                    </span>{" "}
                                    {patient.guardianName || "-"}
                                  </p>
                                )}
                                {patient.address && (
                                  <p>
                                    <span className="font-semibold">
                                      Place/City:
                                    </span>{" "}
                                    {patient.address}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded ${patient.type === "BOOKED" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                            >
                              {patient.type}
                            </span>
                            {showLastThreeMonths ? (
                              <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-700">
                                {formatDateTime(patient.createdAt)}
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-2 py-1 rounded bg-medical-100 text-medical-800">
                                Position: {patient.position}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Waiting / Skipped / On Hold Re-entry Section */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            🧾 Waiting / Skipped / On Hold
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Re-add patients when they return from tests or arrive late
          </p>

          {waitingSkippedPatients.length === 0 ? (
            <p className="text-sm text-gray-500">No patients in this section</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {waitingSkippedPatients.map((patient) => {
                const statusColor =
                  patient.status === "ON_HOLD" ||
                  patient.status === "SENT_FOR_TEST"
                    ? "bg-orange-100 text-orange-700"
                    : patient.status === "SKIPPED"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-blue-100 text-blue-700";

                return (
                  <div
                    key={`reentry-${patient._id}`}
                    className={`flex items-center justify-between border rounded-lg p-3 ${isPastDateView ? "readonly-card" : ""}`}
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {toTitleCase(patient.name)} (#{patient.tokenNumber})
                      </p>
                      <p className="text-xs text-gray-600">{patient.phone}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${statusColor}`}
                      >
                        {patient.status === "ON_HOLD" ||
                        patient.status === "SENT_FOR_TEST"
                          ? "SENT FOR TEST"
                          : patient.status}
                      </span>

                      {(patient.status === "SKIPPED" ||
                        patient.status === "ON_HOLD" ||
                        patient.status === "SENT_FOR_TEST") && (
                        <button
                          onClick={() =>
                            handleStatusAction(
                              patient._id,
                              "WAITING",
                              "Patient re-added to queue",
                              patient.status,
                            )
                          }
                          disabled={isPastDateView}
                          className="text-xs px-2 py-1 rounded bg-green-500 hover:bg-green-600 text-white font-semibold"
                        >
                          Re-add to Queue
                        </button>
                      )}

                      <select
                        value={patient.status}
                        onChange={(e) =>
                          handleStatusAction(
                            patient._id,
                            e.target.value,
                            "Patient status updated",
                            patient.status,
                            { enableUndo: true },
                          )
                        }
                        disabled={isPastDateView}
                        className="text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                        title="Manual status override"
                      >
                        <option value="WAITING">Waiting</option>
                        <option value="IN_PROGRESS">In-Progress</option>
                        <option value="SENT_FOR_TEST">Sent for Test</option>
                        <option value="SKIPPED">Skipped</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Navigation - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] flex items-center justify-around py-2 md:hidden">
        <a
          href="/patient-registration"
          className="flex flex-col items-center gap-0.5 px-6 min-h-[44px] justify-center rounded-lg text-medical-700 active:bg-medical-50"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          <span className="text-[10px] font-semibold">Registration</span>
        </a>
        <a
          href="/lobby"
          className="flex flex-col items-center gap-0.5 px-6 min-h-[44px] justify-center rounded-lg text-indigo-700 active:bg-indigo-50"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span className="text-[10px] font-semibold">Lobby</span>
        </a>
      </div>

      {undoAction && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
          <span className="text-sm">{undoAction.label} applied</span>
          <button
            onClick={handleUndo}
            className="text-sm font-bold px-3 py-1 rounded bg-blue-500 hover:bg-blue-600"
          >
            Undo
          </button>
        </div>
      )}

      {editingPatient && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800">
                Edit Patient Details
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-sm px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                disabled={isEditSaving}
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    handleEditFieldChange("name", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) =>
                      handleEditFieldChange(
                        "phone",
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={editForm.age}
                    onChange={(e) =>
                      handleEditFieldChange("age", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={editForm.gender}
                  onChange={(e) =>
                    handleEditFieldChange("gender", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Father / Mother Name
                </label>
                <input
                  type="text"
                  value={editForm.guardianName}
                  onChange={(e) =>
                    handleEditFieldChange("guardianName", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Relation
                </label>
                <select
                  value={editForm.relation}
                  onChange={(e) =>
                    handleEditFieldChange("relation", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white"
                >
                  <option value="">Select relation</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Place / City
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) =>
                    handleEditFieldChange("address", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isEditSaving}
                className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePatientEdit}
                disabled={isEditSaving}
                className="px-3 py-2 text-sm rounded-lg bg-medical-600 text-white hover:bg-medical-700 disabled:opacity-60"
              >
                {isEditSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Safe Area Padding */}
      <div className="h-10" />
    </div>
  );
};

export default AssistantDashboard;
