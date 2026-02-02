import { useEffect, useMemo, useRef, useState } from "react";
import {
  Beef,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Droplet,
  History,
  Leaf,
  PenLine,
  Send,
  Sparkles,
  Upload,
  User,
  Wheat,
  X,
} from "lucide-react";
import "./App.css";

const APP_TITLE = "Coach Titan";
const DISCLAIMER =
  "免责声明：本工具基于常见营养学估算方法（拳掌法 + 基础代谢估算）仅供参考，不构成医疗/营养/训练处方。存在疾病、受伤、孕期或进食障碍风险请咨询医生或注册营养师。";
const SCHEMA_VERSION = 1;

const TONES = [
  { key: "pro", label: "理性" },
  { key: "casual", label: "随性" },
  { key: "strict", label: "严苛" },
];

const DEFAULT_PROFILE = {
  name: "",
  avatar: "",
  gender: "",
  age: "",
  height: "",
  weight: "",
  chest: "",
  waist: "",
  hip: "",
  goal: "减脂",
  trainingFreq: "每周 3-4 次",
  injuries: "无",
  notes: "",
};

const DEFAULT_HAND_MAP = {
  "减脂": {
    早餐: { proteinPalms: 1, carbCuppedHands: 1, fatThumbs: 0.5, vegFists: 1 },
    午餐: { proteinPalms: 1.5, carbCuppedHands: 0.5, fatThumbs: 0.5, vegFists: 2 },
    晚餐: { proteinPalms: 1.5, carbCuppedHands: 0.5, fatThumbs: 0.5, vegFists: 2 },
    加餐: { proteinPalms: 0.5, carbCuppedHands: 0.5, fatThumbs: 0, vegFists: 0.5 },
  },
  "增肌": {
    早餐: { proteinPalms: 1.5, carbCuppedHands: 1.5, fatThumbs: 1, vegFists: 1 },
    午餐: { proteinPalms: 1.5, carbCuppedHands: 1.5, fatThumbs: 1, vegFists: 1 },
    晚餐: { proteinPalms: 1.5, carbCuppedHands: 1, fatThumbs: 1, vegFists: 1 },
    加餐: { proteinPalms: 0.5, carbCuppedHands: 0.5, fatThumbs: 0.5, vegFists: 0.5 },
  },
  "维持": {
    早餐: { proteinPalms: 1, carbCuppedHands: 1, fatThumbs: 0.5, vegFists: 1 },
    午餐: { proteinPalms: 1.5, carbCuppedHands: 1, fatThumbs: 0.5, vegFists: 1.5 },
    晚餐: { proteinPalms: 1, carbCuppedHands: 0.5, fatThumbs: 0.5, vegFists: 1.5 },
    加餐: { proteinPalms: 0.5, carbCuppedHands: 0.5, fatThumbs: 0.5, vegFists: 0.5 },
  },
};

const CARB_RECO_MAP = {
  "减脂": {
    train: { 早餐: 0.5, 午餐: 0.5, 晚餐: 0.5, 加餐: 0 },
    rest: { 早餐: 0.5, 午餐: 0.5, 晚餐: 0.5, 加餐: 0 },
  },
  "增肌": {
    train: { 早餐: 1.5, 午餐: 1.5, 晚餐: 1, 加餐: 0.5 },
    rest: { 早餐: 1, 午餐: 1, 晚餐: 1, 加餐: 0 },
  },
  "维持": {
    train: { 早餐: 1, 午餐: 1.5, 晚餐: 1, 加餐: 0.5 },
    rest: { 早餐: 1, 午餐: 1, 晚餐: 0.5, 加餐: 0 },
  },
};

function parseTrainingDaysPerWeek(trainingFreq) {
  const s = String(trainingFreq || "");
  const nums = s.match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  const values = nums.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (values.length === 0) return null;
  if (values.length >= 2) return (values[0] + values[1]) / 2;
  return values[0];
}

function trainingFreqCarbDelta(goal, trainingFreq) {
  const g = (goal || "维持").trim();
  const days = parseTrainingDaysPerWeek(trainingFreq);
  if (days === null) return 0;
  let delta = 0;
  if (days <= 2) delta = -0.5;
  else if (days >= 3.5) delta = 0.5;
  if (g.includes("减脂") && delta > 0) delta = 0;
  return delta;
}

function getRecommendedCarb(goal, mealTime, isTrainingToday, trainingFreq) {
  const g = (goal || "维持").trim();
  const mt = (mealTime || "午餐").trim();
  const goalMap = CARB_RECO_MAP[g] || CARB_RECO_MAP["维持"];
  const mode = isTrainingToday ? "train" : "rest";
  const base = goalMap?.[mode]?.[mt];
  const baseNum = typeof base === "number" ? base : 0;
  const delta = trainingFreqCarbDelta(g, trainingFreq);
  return baseNum + delta;
}

function getActivityFactor(trainingFreq) {
  const days = parseTrainingDaysPerWeek(trainingFreq);
  if (days === null) return 1.4;
  if (days <= 2) return 1.4;
  if (days <= 4) return 1.55;
  if (days <= 6) return 1.7;
  return 1.8;
}

function estimateDailyCalories(profile) {
  const weight = Number(profile.weight);
  const height = Number(profile.height);
  const age = Number(profile.age);
  if (!Number.isFinite(weight) || !Number.isFinite(height) || !Number.isFinite(age)) {
    return null;
  }
  if (weight <= 0 || height <= 0 || age <= 0) return null;

  const gender = (profile.gender || "").trim();
  const genderOffset = gender === "male" ? 5 : gender === "female" ? -161 : 0;
  const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
  const activity = getActivityFactor(profile.trainingFreq);
  const tdee = bmr * activity;
  const goal = (profile.goal || "维持").trim();
  let target = tdee;
  if (goal.includes("减脂")) target = tdee * 0.85;
  if (goal.includes("增肌")) target = tdee * 1.1;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target: Math.round(target),
    perMeal: Math.round(target / 3),
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function estimateMealByHand({
  proteinPalms = 1,
  carbCuppedHands = 1,
  fatThumbs = 1,
  vegFists = 1,
}) {
  const protein_g = proteinPalms * 25;
  const carbs_g = carbCuppedHands * 20;
  const fat_g = fatThumbs * 5;
  const kcal =
    proteinPalms * 150 +
    carbCuppedHands * 80 +
    fatThumbs * 45 +
    vegFists * 25;
  return { protein_g, carbs_g, fat_g, kcal };
}

function toneWrap(toneKey, text) {
  if (toneKey === "strict") {
    return `【直说】${text}（别纠结克重，先把结构做对）`;
  }
  if (toneKey === "casual") {
    return `OK～${text}（咱们走“够用就好”的路子）`;
  }
  return text;
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDateKey(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKeyToDate(dateKey) {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatAmount(value) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function normalizeHistoryEntry(entry) {
  const safe = entry && typeof entry === "object" ? entry : {};
  const timestamp = safe.timestamp || new Date().toLocaleString();
  const dateKey = safe.dateKey || getDateKey(timestamp);

  return {
    ...safe,
    id: safe.id || makeId(),
    schemaVersion: safe.schemaVersion || SCHEMA_VERSION,
    timestamp,
    dateKey,
    mealTime: safe.mealTime || "午餐",
    mealDesc: safe.mealDesc || "未命名餐食",
    kcal: Number(safe.kcal ?? 0),
    proteinPalms: Number(safe.proteinPalms ?? 0),
    carbCuppedHands: Number(safe.carbCuppedHands ?? 0),
    fatThumbs: Number(safe.fatThumbs ?? 0),
    vegFists: Number(safe.vegFists ?? 0),
    goal: safe.goal || "维持",
    summary: safe.summary || "",
    plan: safe.plan || "",
    safety: safe.safety || "",
    disclaimer: safe.disclaimer || DISCLAIMER,
    photoName: safe.photoName || "",
  };
}

function normalizeHistory(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map((item) => normalizeHistoryEntry(item));
}

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [history, setHistory] = useState(() =>
    normalizeHistory(loadLS("titan_history", []))
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [planMode, setPlanMode] = useState("whtr");
  const [showPlanChooser, setShowPlanChooser] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [coachAdvice, setCoachAdvice] = useState("");
  const [result, setResult] = useState(null);

  const [photoFront, setPhotoFront] = useState({ name: "", url: "", base64: "" });
  const [photoSide, setPhotoSide] = useState({ name: "", url: "", base64: "" });
  const frontInputRef = useRef(null);
  const sideInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const importInputRef = useRef(null);

  const [backupStatus, setBackupStatus] = useState("");

  const [carbTouched, setCarbTouched] = useState(false);
  const [meal, _setMeal] = useState({
    desc: "",
    proteinPalms: 1,
    carbCuppedHands: 1,
    fatThumbs: 1,
    vegFists: 1,
    mealTime: "午餐",
  });

  const [profile, setProfile] = useState(() =>
    loadLS("titan_profile", DEFAULT_PROFILE)
  );

  const [tone, setTone] = useState(() => loadLS("titan_tone", "pro"));
  const [isTrainingToday, setIsTrainingToday] = useState(() =>
    loadLS("titan_is_training_today", true)
  );

  const isSafetyGatePassed = useMemo(() => {
    const injuries = (profile.injuries || "").trim();
    const normalized = injuries.replace(/\s+/g, "");
    return normalized.length > 0;
  }, [profile.injuries]);

  const displayName = useMemo(() => {
    const name = (profile.name || "").trim();
    return name || "你";
  }, [profile.name]);

  useEffect(() => saveLS("titan_profile", profile), [profile]);
  useEffect(() => saveLS("titan_tone", tone), [tone]);
  useEffect(() => saveLS("titan_is_training_today", isTrainingToday), [isTrainingToday]);
  useEffect(() => saveLS("titan_history", history), [history]);
  useEffect(() => {
    if (!showToast) return undefined;
    const timer = setTimeout(() => setShowToast(false), 2500);
    return () => clearTimeout(timer);
  }, [showToast]);

  useEffect(() => {
    if (carbTouched) return;
    const recommendedCarb = clamp(
      getRecommendedCarb(profile.goal, meal.mealTime, isTrainingToday, profile.trainingFreq),
      0,
      8
    );
    setMealSafe((prev) => ({ ...prev, carbCuppedHands: recommendedCarb }));
  }, [profile.goal, meal.mealTime, isTrainingToday, carbTouched, profile.trainingFreq]);

  useEffect(() => {
    if (!photoFront.url) return undefined;
    return () => URL.revokeObjectURL(photoFront.url);
  }, [photoFront.url]);

  useEffect(() => {
    if (!photoSide.url) return undefined;
    return () => URL.revokeObjectURL(photoSide.url);
  }, [photoSide.url]);

  const est = useMemo(() => estimateMealByHand(meal), [meal]);

  const todayKey = getDateKey(new Date());
  const todayMeals = useMemo(
    () => history.filter((item) => item.dateKey === todayKey),
    [history, todayKey]
  );
  const todayTotals = useMemo(() => {
    return todayMeals.reduce(
      (acc, item) => {
        acc.kcal += item.kcal || 0;
        acc.protein += item.proteinPalms || 0;
        acc.carb += item.carbCuppedHands || 0;
        acc.fat += item.fatThumbs || 0;
        acc.veg += item.vegFists || 0;
        return acc;
      },
      {
        mealCount: todayMeals.length,
        kcal: 0,
        protein: 0,
        carb: 0,
        fat: 0,
        veg: 0,
      }
    );
  }, [todayMeals]);

  const weekMeals = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 6);
    return history.filter((item) => {
      const date = parseDateKeyToDate(item.dateKey) || new Date(item.timestamp);
      if (Number.isNaN(date.getTime())) return false;
      return date >= cutoff;
    });
  }, [history]);

  const weekSummary = useMemo(() => {
    if (weekMeals.length === 0) return null;
    const totals = weekMeals.reduce(
      (acc, item) => {
        acc.kcal += item.kcal || 0;
        acc.protein += item.proteinPalms || 0;
        acc.veg += item.vegFists || 0;
        return acc;
      },
      { kcal: 0, protein: 0, veg: 0 }
    );
    const mealCount = weekMeals.length;
    const avgKcal = Math.round(totals.kcal / mealCount);
    const avgProtein = totals.protein / mealCount;
    const avgVeg = totals.veg / mealCount;
    const hint = avgVeg >= 1.5 ? "蔬菜摄入较稳" : "蔬菜偏少，优先补一拳";

    return {
      mealCount,
      avgKcal,
      avgProtein,
      avgVeg,
      hint,
    };
  }, [weekMeals]);

  function setMealSafe(patch) {
    _setMeal((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      const roundHalf = (n) => Math.round(n * 2) / 2;
      return {
        ...next,
        proteinPalms: roundHalf(clamp(next.proteinPalms ?? prev.proteinPalms, 0, 8)),
        carbCuppedHands: roundHalf(clamp(next.carbCuppedHands ?? prev.carbCuppedHands, 0, 8)),
        fatThumbs: roundHalf(clamp(next.fatThumbs ?? prev.fatThumbs, 0, 8)),
        vegFists: roundHalf(clamp(next.vegFists ?? prev.vegFists, 0, 8)),
      };
    });
  }

  function applyDefaultHandMap(nextMealTime, mode = planMode) {
    const goal = (profile.goal || "维持").trim();
    const mealTime = (nextMealTime || meal.mealTime || "午餐").trim();
    const goalMap = DEFAULT_HAND_MAP[goal] || DEFAULT_HAND_MAP["维持"];
    const preset = goalMap?.[mealTime];
    if (!preset) return;

    let recommendedCarb = getRecommendedCarb(goal, mealTime, isTrainingToday, profile.trainingFreq);
    let proteinPalms = preset.proteinPalms;
    let vegFists = preset.vegFists;

    if (mode === "whtr") {
      const height = Number(profile.height);
      const waist = Number(profile.waist);
      const hasWhtr = Number.isFinite(height) && Number.isFinite(waist) && height > 0 && waist > 0;
      if (hasWhtr) {
        const whtr = waist / height;
        if (whtr >= 0.53) {
          recommendedCarb -= 0.5;
          vegFists += 0.5;
        } else if (whtr <= 0.45) {
          recommendedCarb += 0.5;
          proteinPalms += 0.5;
        }
      }
    } else if (mode === "basic") {
      const height = Number(profile.height);
      const weight = Number(profile.weight);
      const age = Number(profile.age);
      const hasBmi = Number.isFinite(height) && Number.isFinite(weight) && height > 0 && weight > 0;
      if (goal.includes("减脂")) {
        recommendedCarb -= 0.5;
        vegFists += 0.5;
      } else if (goal.includes("增肌")) {
        proteinPalms += 0.5;
        recommendedCarb += 0.5;
      }
      if (hasBmi) {
        const bmi = weight / ((height / 100) ** 2);
        if (bmi >= 26) {
          recommendedCarb -= 0.5;
          vegFists += 0.5;
        } else if (bmi <= 19) {
          recommendedCarb += 0.5;
          proteinPalms += 0.5;
        }
      }
      if (Number.isFinite(age) && age >= 45) {
        recommendedCarb -= 0.5;
        vegFists += 0.5;
      }
    }

    recommendedCarb = clamp(recommendedCarb, 0, 8);

    setMealSafe((prev) => ({
      ...prev,
      ...preset,
      proteinPalms,
      vegFists,
      carbCuppedHands: recommendedCarb,
    }));
    setCarbTouched(false);
  }

  function readImageBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result?.toString().split(",")[1] || "");
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  }

  async function analyzeWithVision({ prompt, imageBase64 }) {
    const response = await fetch("https://coach-titan-web2.vercel.app/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, imageBase64 }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Vision request failed");
    }

    return data?.data;
  }

  function extractResponseText(payload) {
    const output = payload?.output?.[0]?.content;
    if (Array.isArray(output)) {
      const textPart = output.find((part) => part?.type === "output_text" || part?.text);
      return textPart?.text || "";
    }
    return payload?.choices?.[0]?.message?.content || "";
  }

  function parseVisionResult(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  async function analyzeWithTwoPhotos({ frontBase64, sideBase64 }) {
    const topPrompt =
      "这是俯拍图，旁边可能有参照物（如手掌、餐具或手机）。请识别食物并按拳掌法估算，返回JSON：{\"desc\":\"餐食名称\",\"proteinPalms\":1,\"carbCuppedHands\":1,\"fatThumbs\":1,\"vegFists\":1}。只返回JSON。";
    const topData = await analyzeWithVision({ prompt: topPrompt, imageBase64: frontBase64 });
    const topText = extractResponseText(topData);
    const topResult = parseVisionResult(topText);

    if (!sideBase64) return topResult;

    const basePayload = topResult ? JSON.stringify(topResult) : "{}";
    const sidePrompt =
      `这是侧面图，旁边可能有参照物（如手掌、餐具或手机）。上一张俯拍估算为：${basePayload}。请结合侧面图修正份量，返回JSON：{"desc":"餐食名称","proteinPalms":1,"carbCuppedHands":1,"fatThumbs":1,"vegFists":1}。只返回JSON。`;
    const sideData = await analyzeWithVision({ prompt: sidePrompt, imageBase64: sideBase64 });
    const sideText = extractResponseText(sideData);
    const sideResult = parseVisionResult(sideText);

    return sideResult || topResult;
  }

  function handlePlanChoice(mode) {
    setPlanMode(mode);
    applyDefaultHandMap(meal.mealTime, mode);
    setShowPlanChooser(false);
  }

  async function handlePhotoChange(event, type) {
    const file = event.target.files?.[0];
    if (!file) return;

    let base64 = "";
    try {
      base64 = await readImageBase64(file);
    } catch (error) {
      console.error(error);
      return;
    }

    const nextPhoto = {
      name: file.name,
      url: URL.createObjectURL(file),
      base64,
    };

    const nextFront = type === "front" ? nextPhoto : photoFront;
    const nextSide = type === "side" ? nextPhoto : photoSide;

    if (type === "front") {
      setPhotoFront(nextPhoto);
    } else {
      setPhotoSide(nextPhoto);
    }

    if (!nextFront.base64 || !nextSide.base64) {
      return;
    }

    setIsAiProcessing(true);
    try {
      const result = await analyzeWithTwoPhotos({
        frontBase64: nextFront.base64,
        sideBase64: nextSide.base64,
      });
      if (result) {
        setMealSafe({
          desc: result.desc || meal.desc,
          proteinPalms: Number(result.proteinPalms) || meal.proteinPalms,
          carbCuppedHands: Number(result.carbCuppedHands) || meal.carbCuppedHands,
          fatThumbs: Number(result.fatThumbs) || meal.fatThumbs,
          vegFists: Number(result.vegFists) || meal.vegFists,
        });
      }
      setShowPreview(true);
    } catch (error) {
      console.error(error);
      setShowPreview(true);
    } finally {
      setIsAiProcessing(false);
    }
  }

  async function handleQuickAnalyze() {
    if (!meal.desc.trim()) return;
    setIsAiProcessing(true);
    try {
      const prompt = `用户描述了一餐：${meal.desc}。按拳掌法估算并返回JSON：{"desc":"餐食名称","proteinPalms":1,"carbCuppedHands":1,"fatThumbs":1,"vegFists":1}。只返回JSON。`;
      const data = await analyzeWithVision({ prompt });
      const text = extractResponseText(data);
      const result = parseVisionResult(text);

      if (result) {
        setMealSafe({
          desc: result.desc || meal.desc,
          proteinPalms: Number(result.proteinPalms) || meal.proteinPalms,
          carbCuppedHands: Number(result.carbCuppedHands) || meal.carbCuppedHands,
          fatThumbs: Number(result.fatThumbs) || meal.fatThumbs,
          vegFists: Number(result.vegFists) || meal.vegFists,
        });
      }

      setShowPreview(true);
    } catch (error) {
      console.error(error);
      setShowPreview(true);
    } finally {
      setIsAiProcessing(false);
    }
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  function buildBackupData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      titan_profile: profile,
      titan_tone: tone,
      titan_is_training_today: isTrainingToday,
      titan_history: history,
    };
  }

  async function handleExportBackup() {
    try {
      const data = buildBackupData();
      const json = JSON.stringify(data, null, 2);
      const filename = `coach-titan-backup-${getDateKey(new Date())}.json`;

      if (typeof window !== "undefined" && window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: "JSON",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
      } else {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
      setBackupStatus("备份已导出");
    } catch (error) {
      console.error(error);
      setBackupStatus("导出失败，请重试");
    }
  }

  function handleImportClick() {
    importInputRef.current?.click();
  }

  async function handleImportChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== "object") {
        setBackupStatus("备份文件格式不正确");
        return;
      }
      if (data.schemaVersion && data.schemaVersion > SCHEMA_VERSION) {
        setBackupStatus("备份版本较新，暂不支持导入");
        return;
      }
      const hasKeys =
        data.titan_profile &&
        data.titan_tone !== undefined &&
        data.titan_is_training_today !== undefined &&
        Array.isArray(data.titan_history);
      if (!hasKeys) {
        setBackupStatus("备份文件缺少必要字段");
        return;
      }

      const confirmed = window.confirm("导入将覆盖当前数据，是否继续？");
      if (!confirmed) {
        setBackupStatus("已取消导入");
        return;
      }

      const nextProfile = { ...DEFAULT_PROFILE, ...data.titan_profile };
      setProfile(nextProfile);
      setTone(data.titan_tone || "pro");
      setIsTrainingToday(Boolean(data.titan_is_training_today));
      setHistory(normalizeHistory(data.titan_history));
      setResult(null);
      setShowPreview(false);
      setIsEditMode(false);
      setActiveTab("home");
      setBackupStatus("备份已恢复");
    } catch (error) {
      console.error(error);
      setBackupStatus("导入失败，请检查文件");
    } finally {
      event.target.value = "";
    }
  }

  function genPlan() {
    const goal = (profile.goal || "").trim();
    const kcal = est.kcal;
    const dailyEstimate = estimateDailyCalories(profile);
    const basePerMeal = dailyEstimate?.perMeal
      || (goal.includes("减脂") ? 500 : goal.includes("增肌") ? 650 : 550);
    const highLine = basePerMeal * 1.15;
    const lowLine = basePerMeal * 0.85;
    let strategy = "";
    if (goal.includes("减脂")) {
      strategy =
        kcal > highLine
          ? "这餐偏高。下一餐建议：蛋白 1-1.5 掌 + 蔬菜 2 拳，碳水减半（0-0.5 拳），油脂尽量少。"
          : "这餐可控。下一餐建议：蛋白 1 掌 + 蔬菜 2 拳，碳水 0.5-1 拳（看你训练强度）。";
    } else if (goal.includes("增肌")) {
      strategy =
        kcal < lowLine
          ? "这餐偏少。下一餐建议：蛋白 1.5-2 掌 + 碳水 1-2 拳 + 蔬菜 1-2 拳，别怕碳水。"
          : "这餐不错。下一餐建议：蛋白 1.5 掌 + 碳水 1 拳 + 蔬菜 1-2 拳，油脂 1 拇指左右。";
    } else {
      strategy =
        "下一餐建议：蛋白 1 掌 + 蔬菜 2 拳 + 碳水 0.5-1 拳 + 油脂 1 拇指（按饥饿感微调）。";
    }

    const now = new Date();
    const dailyNote = dailyEstimate
      ? `参考日目标约 ${dailyEstimate.target} kcal（约 ${dailyEstimate.perMeal} kcal/餐）`
      : "";
    const summary = `估算结果：约 ${est.kcal} kcal（蛋白 ${est.protein_g}g / 碳水 ${est.carbs_g}g / 脂肪 ${est.fat_g}g）。${dailyNote ? ` ${dailyNote}` : ""}`;

    const injuries = (profile.injuries || "").trim();
    const safety = injuries
      ? `伤病提示：你填写的是「${injuries}」。如疼痛加重或不明原因不适，建议先降强度并咨询专业人士。`
      : "伤病提示：未填写。若有旧伤/疼痛史，建议补充。";

    const photoNames = [photoFront.name, photoSide.name].filter(Boolean).join(" / ");
    const newResult = normalizeHistoryEntry({
      id: makeId(),
      schemaVersion: SCHEMA_VERSION,
      timestamp: now.toLocaleString(),
      dateKey: getDateKey(now),
      summary: toneWrap(tone, summary),
      plan: toneWrap(tone, strategy),
      safety,
      disclaimer: DISCLAIMER,
      mealTime: meal.mealTime,
      mealDesc: meal.desc?.trim() || "未命名餐食",
      photoName: photoNames,
      kcal: est.kcal,
      proteinPalms: meal.proteinPalms,
      carbCuppedHands: meal.carbCuppedHands,
      fatThumbs: meal.fatThumbs,
      vegFists: meal.vegFists,
      goal: profile.goal,
    });

    setResult(newResult);
    setHistory((prev) => [newResult, ...prev]);
    setShowToast(true);
    setActiveTab("advice");
  }

  function resetAll() {
    localStorage.removeItem("titan_profile");
    localStorage.removeItem("titan_tone");
    localStorage.removeItem("titan_is_training_today");
    setProfile({
      name: "",
      avatar: "",
      age: "",
      height: "",
      weight: "",
      chest: "",
      waist: "",
      hip: "",
      goal: "减脂",
      trainingFreq: "每周 3-4 次",
      injuries: "无",
      notes: "",
    });
    setTone("pro");
    setIsTrainingToday(true);
    setCarbTouched(false);
    setMealSafe({
      desc: "",
      proteinPalms: 1,
      carbCuppedHands: 1,
      fatThumbs: 1,
      vegFists: 1,
      mealTime: "午餐",
    });
    setPhotoFront({ name: "", url: "", base64: "" });
    setPhotoSide({ name: "", url: "", base64: "" });
    setResult(null);
    setActiveTab("home");
  }

  function goToInput() {
    setShowPreview(false);
    setIsEditMode(false);
    setActiveTab("input");
  }

  function openEditMode() {
    setShowPreview(false);
    setIsEditMode(true);
  }

  function closeEditMode() {
    setIsEditMode(false);
  }

  function handleDeepAdvice() {
    if (!isSafetyGatePassed) {
      setActiveTab("profile");
      return;
    }
    if (history.length === 0) {
      setCoachAdvice("暂无记录，先记录一餐再查看复盘。");
      return;
    }
    const recentMeals = history.slice(0, 3);
    const historySummary = recentMeals.map((item) => `${item.mealTime}：${item.mealDesc}`).join("；");
    const mealCount = history.length;
    const trendHint = mealCount <= 1
      ? "今天记录较少，建议继续补全后再做综合复盘。"
      : "今天已连续记录，注意均衡蛋白与蔬菜的分配。";
    setCoachAdvice(`趋势复盘：今日已记录 ${mealCount} 餐。${historySummary ? `最近记录：${historySummary}。` : ""}${trendHint}`);
  }

  return (
    <>
      <div className="disclaimer-banner">{DISCLAIMER}</div>
      <div className="app">
        <header className="topbar">
          <div>
            <div className="app-title">{APP_TITLE}</div>
            <div className="app-subtitle">科技感 · 轻量饮食估算</div>
          </div>
          {!isSafetyGatePassed && (
            <div className="safety-badge">请完善伤病史以解锁深度建议</div>
          )}
        </header>
        {showToast && (
          <div className="toast">
            <CheckCircle2 size={16} />
            <span>已存入 Titan 日志</span>
          </div>
        )}

        <main className="content">
          {activeTab === "home" && !isEditMode && (
            <section className="home-container">
              <div className="home-header">
                <h1 className="greeting-text">Coach Titan：<br />
                  <span className="user-name">
                    {(profile.name || "").trim() ? (
                      `你好，${displayName}`
                    ) : (
                      <>你好，<span className="greeting-tip">请在档案页输入昵称</span></>
                    )}
                  </span>
                </h1>
              </div>

              <div className="action-grid">
                <button className="action-card primary" onClick={goToInput}>
                  <div className="icon-circle big">
                    <Camera size={36} strokeWidth={1.5} />
                  </div>
                  <div className="action-text">
                    <span className="action-title">拍照记录</span>
                    <span className="action-desc">双角度 · 参照物可选</span>
                  </div>
                </button>
                <button className="action-card secondary" onClick={goToInput}>
                  <div className="icon-circle">
                    <PenLine size={28} strokeWidth={1.5} />
                  </div>
                  <div className="action-text">
                    <span className="action-title">手动记录</span>
                    <span className="action-desc">精准输入</span>
                  </div>
                </button>
              </div>

              <div className="quick-input-row">
                <div className="input-group">
                  <input
                    value={meal.desc}
                    onChange={(e) => setMealSafe({ desc: e.target.value })}
                    placeholder="或者直接告诉我吃了什么..."
                    className="clean-input"
                  />
                  <button className="send-icon-btn" onClick={handleQuickAnalyze} disabled={isAiProcessing}>
                    <Send size={20} />
                  </button>
                </div>
              </div>

              <div className="home-card">
                <div className="home-title">今日概览</div>
                {todayTotals.mealCount === 0 ? (
                  <div className="historyMeta">今天还没记录，先记录一餐。</div>
                ) : (
                  <>
                    <div className="historyMeta">
                      已记录 {todayTotals.mealCount} 餐 · 约 {formatAmount(todayTotals.kcal)} kcal
                    </div>
                    <div className="historyMeta">
                      蛋白 {formatAmount(todayTotals.protein)} 掌 · 碳水 {formatAmount(todayTotals.carb)} 拳 · 油脂 {formatAmount(todayTotals.fat)} 指 · 蔬菜 {formatAmount(todayTotals.veg)} 拳
                    </div>
                  </>
                )}
              </div>

              {history.length > 0 && (
                <div className="home-card">
                  <div className="home-title">最近记录</div>
                  <div className="historyItem">
                    <div className="historyHeader">
                      <span>{history[0].mealTime}</span>
                      <span>{history[0].timestamp}</span>
                    </div>
                    <div className="historyTitle">{history[0].mealDesc}</div>
                    <div className="historyMeta">{history[0].summary}</div>
                  </div>
                </div>
              )}

              {showPreview && (
                <div className="preview-card">
                  <div className="preview-header">预览</div>
                  <div className="preview-body">
                    <div className="preview-images">
                      {photoFront.url ? (
                        <img src={photoFront.url} alt="front" className="preview-image" />
                      ) : (
                        <div className="preview-placeholder">俯拍</div>
                      )}
                      {photoSide.url ? (
                        <img src={photoSide.url} alt="side" className="preview-image" />
                      ) : (
                        <div className="preview-placeholder">侧面</div>
                      )}
                    </div>
                    <div className="preview-info">
                      <div className="preview-title">{meal.desc || "未命名餐食"}</div>
                      <div className="preview-meta">{meal.mealTime} · {est.kcal} kcal</div>
                    </div>
                  </div>
                  <div className="preview-actions">
                    <button className="primary" onClick={openEditMode}><PenLine size={18} className="mr-1" /> 微调分量</button>
                    <button onClick={() => setShowPreview(false)}>关闭</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === "profile" && !isEditMode && (
            <section className="profile-container">
              <div className="profile-header-card">
                <div className="avatar-section" onClick={() => avatarInputRef.current?.click()}>
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="avatar" className="avatar-img" />
                  ) : (
                    <div className="avatar-placeholder"><User size={32} /></div>
                  )}
                  <div className="avatar-badge"><Upload size={12} /></div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: "none" }}
                  />
                </div>
                <div className="profile-info-edit">
                  <label>昵称</label>
                  <input
                    className="ghost-input"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="点击设置昵称"
                  />
                </div>
              </div>

              <div className="section-label">身体数据</div>
              <div className="formRow">
                <label>性别</label>
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                >
                  <option value="">未填写</option>
                  <option value="female">女性</option>
                  <option value="male">男性</option>
                </select>
              </div>
              <div className="stats-grid">
                <ProfileStat
                  label="年龄"
                  value={profile.age}
                  onChange={(value) => setProfile({ ...profile, age: value })}
                />
                <ProfileStat
                  label="身高"
                  unit="cm"
                  value={profile.height}
                  onChange={(value) => setProfile({ ...profile, height: value })}
                />
                <ProfileStat
                  label="体重"
                  unit="kg"
                  value={profile.weight}
                  onChange={(value) => setProfile({ ...profile, weight: value })}
                />
                <ProfileStat
                  label="胸围"
                  unit="cm"
                  value={profile.chest}
                  onChange={(value) => setProfile({ ...profile, chest: value })}
                />
                <ProfileStat
                  label="腰围"
                  unit="cm"
                  value={profile.waist}
                  onChange={(value) => setProfile({ ...profile, waist: value })}
                />
                <ProfileStat
                  label="臀围"
                  unit="cm"
                  value={profile.hip}
                  onChange={(value) => setProfile({ ...profile, hip: value })}
                />
              </div>

              <div className="section-label">设置</div>
              <div className="formRow">
                <label>目标</label>
                <select
                  value={profile.goal}
                  onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                >
                  <option>减脂</option>
                  <option>增肌</option>
                  <option>维持</option>
                </select>
              </div>
              <div className="formRow">
                <label>训练频率</label>
                <select
                  value={profile.trainingFreq}
                  onChange={(e) => setProfile({ ...profile, trainingFreq: e.target.value })}
                >
                  <option value="每周 0-1 次">很少练（0-1）</option>
                  <option value="每周 1-2 次">偶尔练（1-2）</option>
                  <option value="每周 3-4 次">常规（3-4）</option>
                  <option value="每周 5-6 次">高频（5-6）</option>
                  <option value="每周 7 次">每天（7）</option>
                </select>
              </div>
              <div className="formRow">
                <label>伤病史</label>
                <input
                  value={profile.injuries}
                  onChange={(e) => setProfile({ ...profile, injuries: e.target.value })}
                  placeholder="例如：膝盖偶尔痛 / 腰椎间盘突出史 / 无"
                />
              </div>
              <div className="formRow">
                <label>备注</label>
                <textarea
                  rows={3}
                  value={profile.notes}
                  onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                  placeholder="例如：对乳糖敏感、晚餐常应酬、喜欢清淡"
                />
              </div>
              <div className="formRow">
                <label>语气风格</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)}>
                  {TONES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="section-label">数据备份</div>
              <div className="actions">
                <button type="button" className="secondary" onClick={handleExportBackup}>
                  导出备份
                </button>
                <button type="button" className="secondary" onClick={handleImportClick}>
                  导入备份
                </button>
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportChange}
                style={{ display: "none" }}
              />
              {backupStatus ? <div className="muted">{backupStatus}</div> : null}
            </section>
          )}

          {activeTab === "input" && !isEditMode && (
            <section className="card">
              <div className="header-row-back">
                <button className="icon-btn-back" onClick={() => setActiveTab("home")}>
                  <ChevronLeft size={24} />
                </button>
                <h2>饮食输入</h2>
              </div>
              <div className="photo-upload-box">
                <div className="photo-instruction">
                  <div className="photo-instruction-title">
                    <CreditCard size={16} />
                    <span>拍照估算</span>
                  </div>
                  <div className="photo-instruction-sub">参照物可选：手掌 / 手机 / 餐具，帮助估算更准</div>
                  <div className="photo-instruction-sub">没有参照物也可以继续记录</div>
                  <div className="photo-instruction-note">光线、距离、倾斜会影响识图，尽量明亮、平拍、靠近食物</div>
                </div>
                <div className="photo-grid">
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => handlePhotoChange(event, "front")}
                    className="hidden"
                    style={{ display: "none" }}
                  />
                  <input
                    ref={sideInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => handlePhotoChange(event, "side")}
                    className="hidden"
                    style={{ display: "none" }}
                  />
                  <button type="button" className="photo-slot" onClick={() => frontInputRef.current?.click()}>
                    {photoFront.url ? (
                      <img src={photoFront.url} alt="front" className="photo-thumb" />
                    ) : (
                      <Camera size={20} />
                    )}
                    <span>{photoFront.name ? "更换俯拍" : "上传俯拍"}</span>
                  </button>
                  <button type="button" className="photo-slot" onClick={() => sideInputRef.current?.click()}>
                    {photoSide.url ? (
                      <img src={photoSide.url} alt="side" className="photo-thumb" />
                    ) : (
                      <Camera size={20} />
                    )}
                    <span>{photoSide.name ? "更换侧面" : "上传侧面"}</span>
                  </button>
                </div>
                <div className="photo-privacy">为方便测量，不会存入数据库</div>
                {(photoFront.name || photoSide.name) && (
                  <div className="photo-filenames">
                    已选择：{photoFront.name || "未选俯拍"} / {photoSide.name || "未选侧面"}
                  </div>
                )}
              </div>

              <div className="formRow twoCol">
                <div>
                  <label>餐次</label>
                  <select
                    value={meal.mealTime}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCarbTouched(false);
                      setMealSafe({ mealTime: next });
                      applyDefaultHandMap(next);
                    }}
                  >
                    <option>早餐</option>
                    <option>午餐</option>
                    <option>晚餐</option>
                    <option>加餐</option>
                  </select>
                </div>
                <div>
                  <label>今日训练</label>
                  <select
                    value={isTrainingToday ? "yes" : "no"}
                    onChange={(e) => {
                      setCarbTouched(false);
                      setIsTrainingToday(e.target.value === "yes");
                    }}
                  >
                    <option value="yes">是</option>
                    <option value="no">否</option>
                  </select>
                </div>
              </div>

              <div className="formRow">
                <label>餐食描述</label>
                <input
                  value={meal.desc}
                  onChange={(e) => setMealSafe({ desc: e.target.value })}
                  placeholder="例如：牛肉饭 + 青菜"
                />
              </div>

              <div className="sliders">
                <Slider
                  label="蛋白质"
                  unit="掌"
                  Icon={Beef}
                  color="#22c55e"
                  value={meal.proteinPalms}
                  onChange={(v) => setMealSafe({ proteinPalms: v })}
                  min={0}
                  max={8}
                  step={0.5}
                />
                <Slider
                  label="碳水"
                  unit="拳"
                  Icon={Wheat}
                  color="#fde68a"
                  value={meal.carbCuppedHands}
                  onChange={(v) => {
                    setCarbTouched(true);
                    setMealSafe({ carbCuppedHands: v });
                  }}
                  min={0}
                  max={8}
                  step={0.5}
                />
                <Slider
                  label="油脂"
                  unit="指"
                  Icon={Droplet}
                  color="#f97316"
                  value={meal.fatThumbs}
                  onChange={(v) => setMealSafe({ fatThumbs: v })}
                  min={0}
                  max={8}
                  step={0.5}
                />
                <Slider
                  label="蔬菜"
                  unit="拳"
                  Icon={Leaf}
                  color="#16a34a"
                  value={meal.vegFists}
                  onChange={(v) => setMealSafe({ vegFists: v })}
                  min={0}
                  max={8}
                  step={0.5}
                />
              </div>

              <div className="estBox">
                <div className="estLine">
                  <span>实时估算</span>
                  <span>
                    {est.kcal} kcal ｜ P {est.protein_g}g / C {est.carbs_g}g / F {est.fat_g}g
                  </span>
                </div>
              </div>

              <div className="actions">
                <button className="primary" onClick={genPlan}><Sparkles size={18} className="mr-1" /> 生成策略</button>
                <button onClick={() => setShowPlanChooser(true)}>套用默认拳掌法</button>
                <button onClick={resetAll}>重置</button>
              </div>

              {showPlanChooser && (
                <div className="plan-chooser-overlay" onClick={() => setShowPlanChooser(false)}>
                  <div className="plan-chooser-sheet" onClick={(event) => event.stopPropagation()}>
                    <div className="plan-chooser-header">
                      <span>选择拳掌法估算方式</span>
                      <button className="icon-btn-back" onClick={() => setShowPlanChooser(false)}>
                        <X size={20} />
                      </button>
                    </div>
                    <button className="plan-option recommended center" onClick={() => handlePlanChoice("whtr")}>
                      <div className="plan-option-title">更准确（推荐）</div>
                      <div className="plan-option-desc">基于腰围 + 身高估算，更贴近体脂分析</div>
                    </button>
                    <button className="plan-option center" onClick={() => handlePlanChoice("basic")}>
                      <div className="plan-option-title">基础估算</div>
                      <div className="plan-option-desc">基于身高、体重、年龄与训练日快速生成</div>
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {isEditMode && (
            <section className="edit-panel">
              <div className="edit-header">
                <div>微调分量</div>
                <button onClick={closeEditMode} className="icon-btn"><Check size={24} /></button>
              </div>
              <div className="sliders">
                <Slider
                  label="蛋白质"
                  unit="掌"
                  Icon={Beef}
                  color="#22c55e"
                  value={meal.proteinPalms}
                  onChange={(v) => setMealSafe({ proteinPalms: v })}
                  min={0}
                  max={8}
                  step={0.5}
                />
                <Slider
                  label="碳水"
                  unit="拳"
                  Icon={Wheat}
                  color="#fde68a"
                  value={meal.carbCuppedHands}
                  onChange={(v) => {
                    setCarbTouched(true);
                    setMealSafe({ carbCuppedHands: v });
                  }}
                  min={0}
                  max={8}
                  step={0.5}
                />
                <Slider
                  label="油脂"
                  unit="指"
                  Icon={Droplet}
                  color="#f97316"
                  value={meal.fatThumbs}
                  onChange={(v) => setMealSafe({ fatThumbs: v })}
                  min={0}
                  max={8}
                  step={0.5}
                />
                <Slider
                  label="蔬菜"
                  unit="拳"
                  Icon={Leaf}
                  color="#16a34a"
                  value={meal.vegFists}
                  onChange={(v) => setMealSafe({ vegFists: v })}
                  min={0}
                  max={8}
                  step={0.5}
                />
              </div>
              <div className="actions">
                <button className="primary" onClick={genPlan}><Sparkles size={18} className="mr-1" /> 生成策略</button>
                <button onClick={closeEditMode}><ChevronRight className="rotate-180 mr-1" size={18} /> 返回</button>
              </div>
            </section>
          )}

          {activeTab === "advice" && !isEditMode && (
            <section className="card">
              <div className="header-row-back">
                <button className="icon-btn-back" onClick={() => setActiveTab("input")}>
                  <ChevronLeft size={24} />
                </button>
                <h2>规划建议</h2>
              </div>
              {!result ? (
                <div className="muted">先在“饮食输入”里生成策略。</div>
              ) : (
                <>
                  <div className="output">
                    <div className="bubble">
                      <b>结果摘要</b>
                      <p>{result.summary}</p>
                    </div>
                    <div className="bubble">
                      <b>下一步建议</b>
                      <p>{result.plan}</p>
                      {meal.desc?.trim() ? (
                        <p className="small">餐食描述：{meal.mealTime}「{meal.desc}」</p>
                      ) : null}
                    </div>
                    <div className="bubble">
                      <b>AI 解释（预留）</b>
                      <p>后续可接入模型，生成更细化的个性化说明。</p>
                    </div>
                    <div className="bubble warn">
                      <b>安全提示</b>
                      <p>{result.safety}</p>
                    </div>
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setActiveTab("history")}
                    >
                      查看日志
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === "history" && !isEditMode && (
            <section className="card">
              <h2>每餐记录</h2>
              <div className="historyActions">
                <button className="secondary" onClick={handleDeepAdvice}>
                  深度复盘
                </button>
                {!isSafetyGatePassed && (
                  <button className="secondary" onClick={() => setActiveTab("profile")}>
                    完善档案
                  </button>
                )}
              </div>
              {history.length > 0 && (
                weekSummary ? (
                  <div className="home-card">
                    <div className="home-title">近 7 天复盘</div>
                    <div className="historyMeta">
                      共 {weekSummary.mealCount} 餐 · 平均 {weekSummary.avgKcal} kcal/餐
                    </div>
                    <div className="historyMeta">
                      蛋白 {formatAmount(weekSummary.avgProtein)} 掌/餐 · 蔬菜 {formatAmount(weekSummary.avgVeg)} 拳/餐
                    </div>
                    <div className="historyMeta">{weekSummary.hint}</div>
                  </div>
                ) : (
                  <div className="muted">近 7 天暂无可复盘记录。</div>
                )
              )}
              {coachAdvice ? <div className="coachAdvice">{coachAdvice}</div> : null}
              {history.length === 0 ? (
                <div className="muted">暂无记录。</div>
              ) : (
                <div className="historyList">
                    {history.map((item, index) => (
                      <div className="historyItem" key={item.id || `${item.timestamp}-${index}`}>

                      <div className="historyHeader">
                        <span>{item.mealTime}</span>
                        <span>{item.timestamp}</span>
                      </div>
                      <div className="historyTitle">{item.mealDesc}</div>
                      <div className="historyMeta">{item.summary}</div>
                    </div>
                  ))}
                </div>
              )}
              {history.length > 0 ? (
                <button
                  className="secondary"
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem("titan_history");
                  }}
                >
                  清空记录
                </button>
              ) : null}
            </section>
          )}
        </main>

        <nav className="nav-bar">
          <NavButton Icon={Camera} label="记录" id="home" activeTab={activeTab} onSelect={setActiveTab} />
          <NavButton Icon={History} label="日志" id="history" activeTab={activeTab} onSelect={setActiveTab} />
          <NavButton Icon={User} label="档案" id="profile" activeTab={activeTab} onSelect={setActiveTab} />
        </nav>
      </div>
    </>
  );
}

function ProfileStat({ label, unit, value, onChange }) {
  return (
    <div className="stat-box">
      <label>{label}</label>
      <div className="stat-input">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="-"
        />
        {unit ? <span className="stat-unit">{unit}</span> : null}
      </div>
    </div>
  );
}

function NavButton({ label, Icon, id, activeTab, onSelect }) {
  const isActive = activeTab === id;
  return (
    <button
      className={`flex flex-col items-center justify-center w-full py-1 gap-1 transition-all duration-200 ${isActive ? "text-[#1b4332]" : "text-gray-400"}`}
      onClick={() => onSelect(id)}
    >
      <div className={`p-1 rounded-full transition-all duration-200 ${isActive ? "bg-[#b7e4c7]" : ""}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function Slider({ label, unit, Icon, color, value, onChange, min, max, step = 1 }) {
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className="slider-card">
      <div className="slider-head">
        <div className="slider-label">
          <span className="slider-icon" style={{ color }}>
            <Icon size={18} />
          </span>
          <span className="slider-title">{label}</span>
        </div>
        <div className="slider-value" style={{ color }}>
          {value}
          <span className="slider-unit">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-input"
        style={{
          background: `linear-gradient(to right, ${color} ${percent}%, #e5e7eb ${percent}%)`,
          color,
        }}
      />
    </div>
  );
}
