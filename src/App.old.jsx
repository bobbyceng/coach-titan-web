import { useEffect, useMemo, useState } from "react";
import "./App.css";

const APP_TITLE = "Coach Titan · 饮食 Demo";
const DISCLAIMER =
  "免责声明：本工具仅供参考与面试演示用途，不构成医疗/营养/训练处方。存在疾病、受伤、孕期或进食障碍风险请咨询医生或注册营养师。";

const TONES = [
  { key: "pro", label: "理性" },
  { key: "casual", label: "随性" },
  { key: "strict", label: "严苛" },
];

// 新增：目标 × 餐次 → 默认拳掌法份量（允许 0.5）
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

// 新增：训练日/休息日 → 每餐主食推荐（更舒适，且可按 0.5 调节）
// 说明：这里只做“主食（捧）”的自动建议；蛋白/油脂/蔬菜仍用 DEFAULT_HAND_MAP 的 preset。
const CARB_RECO_MAP = {
  "减脂": {
    train: { 早餐: 0.5, 午餐: 0.5, 晚餐: 0.5, 加餐: 0 },
    rest: { 早餐: 0.5, 午餐: 0.5, 晚餐: 0.5, 加餐: 0 },
  },
  "增肌": {
    // 训练日：三餐正常，晚餐稍低一点；加餐少量碳水更舒服
    train: { 早餐: 1.5, 午餐: 1.5, 晚餐: 1, 加餐: 0.5 },
    // 休息日：不强制加餐（加餐主食=0），三餐“正常量”
    rest: { 早餐: 1, 午餐: 1, 晚餐: 1, 加餐: 0 },
  },
  "维持": {
    train: { 早餐: 1, 午餐: 1.5, 晚餐: 1, 加餐: 0.5 },
    rest: { 早餐: 1, 午餐: 1, 晚餐: 0.5, 加餐: 0 },
  },
};

function parseTrainingDaysPerWeek(trainingFreq) {
  // Accepts strings like "每周 3-4 次", "每周4次", "3次", "5", etc.
  const s = String(trainingFreq || "");
  const nums = s.match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  const values = nums.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (values.length === 0) return null;
  // If a range is provided (e.g., 3-4), use the average
  if (values.length >= 2) return (values[0] + values[1]) / 2;
  return values[0];
}

function trainingFreqCarbDelta(goal, trainingFreq) {
  // Simple heuristic: higher training frequency => slightly more carbs; lower => slightly fewer.
  // Applies mainly to 增肌/维持. 减脂保持更保守。
  const g = (goal || "维持").trim();
  const days = parseTrainingDaysPerWeek(trainingFreq);
  if (days === null) return 0;

  // Buckets
  // <=2 days/wk: -0.5
  // 2.5-3 days/wk: 0
  // >=3.5 days/wk: +0.5  (方案2：把“常规(3-4)”也纳入轻微加碳)
  let delta = 0;
  if (days <= 2) delta = -0.5;
  else if (days >= 3.5) delta = 0.5;

  // For 减脂: keep conservative (no positive bump)
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

// 新增：将数值限定到 [min, max]
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// 新增：格式化份量（保留 .5，隐藏不必要的 .0）
function fmtPortion(x) {
  if (x === null || x === undefined) return "";
  if (Number.isInteger(x)) return String(x);
  return String(x).replace(/\.0+$/, "");
}

// —— 简化版拳掌法估算（非常粗略：用于 Demo）
// 目标：给“相对可解释”的估算，而不是精确克重
function estimateMealByHand({
  proteinPalms = 1,
  carbCuppedHands = 1,
  fatThumbs = 1,
  vegFists = 1,
}) {
  // 这里用“典型近似值”做估算（演示用）
  // proteinPalm: ~25g蛋白、~150kcal（瘦肉/鱼/蛋等平均）
  // carbCuppedHand: ~25g碳水、~110kcal（米饭/面/薯类平均）
  // fatThumb: ~5g脂肪、~45kcal（油/坚果/酱料平均）
  // vegFist: ~25kcal（蔬菜热量很低）
  const protein_g = proteinPalms * 25;
  const carbs_g = carbCuppedHands * 25;
  const fat_g = fatThumbs * 5;

  const kcal =
    proteinPalms * 150 +
    carbCuppedHands * 110 +
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
  return text; // 专业理性
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
  const [activeTab, setActiveTab] = useState("input");
  const [history, setHistory] = useState(() => loadLS("titan_history", []));
  const [mealPhotoName, setMealPhotoName] = useState("");

  // 主食是否被用户手动调整过：避免训练日/餐次切换时强制覆盖
  const [carbTouched, setCarbTouched] = useState(false);

  // Meal input (Module B)
  const [meal, _setMeal] = useState({
    desc: "",
    proteinPalms: 1,
    carbCuppedHands: 1,
    fatThumbs: 1,
    vegFists: 1,
    mealTime: "午餐",
  });

  // Profile (Module A)
  const [profile, setProfile] = useState(() =>
    loadLS("titan_profile", {
      goal: "减脂",
      trainingFreq: "每周 3-4 次",
      injuries: "无",
      notes: "",
    })
  );

  // Tone
  const [tone, setTone] = useState(() => loadLS("titan_tone", "pro"));

  // 今日是否训练（用于主食动态偏移）
  const [isTrainingToday, setIsTrainingToday] = useState(() =>
    loadLS("titan_is_training_today", true)
  );

  // Wrapper to ensure numeric fields snap to 0.5 and stay within sensible bounds
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

  // 套用默认拳掌法：按「目标 × 餐次」给 Module B 的滑条一个默认起点
  // 主食会根据“今日是否训练”自动取推荐值（更舒适，且休息日加餐主食为 0）
  function applyDefaultHandMap(nextMealTime) {
    const goal = (profile.goal || "维持").trim();
    const mealTime = (nextMealTime || meal.mealTime || "午餐").trim();

    const goalMap = DEFAULT_HAND_MAP[goal] || DEFAULT_HAND_MAP["维持"];
    const preset = goalMap?.[mealTime];
    if (!preset) return;

    const recommendedCarb = clamp(getRecommendedCarb(goal, mealTime, isTrainingToday, profile.trainingFreq), 0, 8);

    // 只覆盖四个数值，不动 desc/mealTime
    setMealSafe((prev) => ({
      ...prev,
      ...preset,
      carbCuppedHands: recommendedCarb,
    }));

    // 视为“自动值”，后续餐次/训练日切换可继续自动更新
    setCarbTouched(false);
  }

  // Output
  const [result, setResult] = useState(null);

  useEffect(() => saveLS("titan_profile", profile), [profile]);
  useEffect(() => saveLS("titan_tone", tone), [tone]);
  useEffect(() => saveLS("titan_is_training_today", isTrainingToday), [isTrainingToday]);
  useEffect(() => saveLS("titan_history", history), [history]);

  // 自动主食：当目标/餐次/训练日变化时，若用户没手动动过主食滑条，则自动套用推荐主食
  useEffect(() => {
    if (carbTouched) return;
    const recommendedCarb = clamp(
      getRecommendedCarb(profile.goal, meal.mealTime, isTrainingToday, profile.trainingFreq),
      0,
      8
    );
    setMealSafe((prev) => ({ ...prev, carbCuppedHands: recommendedCarb }));
  }, [profile.goal, meal.mealTime, isTrainingToday, carbTouched, profile.trainingFreq]);

  const est = useMemo(() => estimateMealByHand(meal), [meal]);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    setMealPhotoName(file ? file.name : "");
  }

function genPlan() {
  const goal = (profile.goal || "").trim();
  const kcal = est.kcal;

  // 1) 下一步策略（按目标）
  let strategy = "";
  if (goal.includes("减脂")) {
    strategy =
      kcal > 650
        ? "这餐偏高。下一餐建议：蛋白 1-1.5 掌 + 蔬菜 2 拳，主食减半（0-0.5 捧），油脂尽量少。"
        : "这餐可控。下一餐建议：蛋白 1 掌 + 蔬菜 2 拳，主食 0.5-1 捧（看你训练强度）。";
  } else if (goal.includes("增肌")) {
    strategy =
      kcal < 500
        ? "这餐偏少。下一餐建议：蛋白 1.5-2 掌 + 主食 1-2 捧 + 蔬菜 1-2 拳，别怕碳水。"
        : "这餐不错。下一餐建议：蛋白 1.5 掌 + 主食 1 捧 + 蔬菜 1-2 拳，油脂 1 拇指左右。";
  } else {
    // 维持/保持/未填写
    strategy =
      "下一餐建议：蛋白 1 掌 + 蔬菜 2 拳 + 主食 0.5-1 捧 + 油脂 1 拇指（按饥饿感微调）。";
  }

  // 2) 摘要（保证一定存在）
  const summary = `估算结果：约 ${est.kcal} kcal（蛋白 ${est.protein_g}g / 碳水 ${est.carbs_g}g / 脂肪 ${est.fat_g}g）。`;

  // 3) 安全提示（严苛语气也不要强制恐吓：直说即可）
  const injuries = (profile.injuries || "").trim();
  const safety = injuries
    ? `伤病提示：你填写的是「${injuries}」。如疼痛加重或不明原因不适，建议先降强度并咨询专业人士。`
    : "伤病提示：未填写。若有旧伤/疼痛史，建议补充。";

  // 4) 单一出口 setResult（不会出现 summary 未定义）
  const newResult = {
    timestamp: new Date().toLocaleString(),
    summary: toneWrap(tone, summary),
    plan: toneWrap(tone, strategy),
    safety,
    disclaimer: DISCLAIMER,
    mealTime: meal.mealTime,
    mealDesc: meal.desc?.trim() || "未命名餐食",
    photoName: mealPhotoName,
  };

  setResult(newResult);
  setHistory((prev) => [newResult, ...prev]);
  setActiveTab("advice");
}

  function resetAll() {
    localStorage.removeItem("titan_profile");
    localStorage.removeItem("titan_tone");
    localStorage.removeItem("titan_is_training_today");
    setProfile({ goal: "减脂", trainingFreq: "每周 3-4 次", injuries: "无", notes: "" });
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
    setMealPhotoName("");
    setResult(null);
    setActiveTab("input");
  }

  return (
    <>
      <div className="disclaimer-banner">{DISCLAIMER}</div>
      <div className="app">
        <header className="topbar">
          <div className="app-title">{APP_TITLE}</div>
          <div className="app-subtitle">饮食估算 · 训练日动态调整</div>
        </header>

        <main className="content">
          {activeTab === "profile" && (
            <section className="card">
              <h2>用户档案</h2>
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
            </section>
          )}

          {activeTab === "input" && (
            <section className="card">
              <h2>饮食输入</h2>
              <div className="photo-upload">
                <label className="photo-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                  <div className="photo-title">拍照或上传（可选）</div>
                  <div className="photo-subtitle">
                    {mealPhotoName ? `已选择：${mealPhotoName}` : "点击选择一张照片"}
                  </div>
                </label>
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
                  label="蛋白（掌）"
                  value={meal.proteinPalms}
                  onChange={(v) => setMealSafe({ proteinPalms: v })}
                  min={0}
                  max={8}
                  step={0.5}
                />
                <Slider
                  label="主食（捧）"
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
                  label="油脂（拇指）"
                  value={meal.fatThumbs}
                  onChange={(v) => setMealSafe({ fatThumbs: v })}
                  min={0}
                  max={8}
                  step={0.5}
                />
                <Slider
                  label="蔬菜（拳）"
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
                <button className="primary" onClick={genPlan}>生成策略</button>
                <button onClick={() => applyDefaultHandMap(meal.mealTime)}>套用默认拳掌法</button>
                <button onClick={resetAll}>重置</button>
              </div>
            </section>
          )}

          {activeTab === "advice" && (
            <section className="card">
              <h2>规划建议</h2>
              {!result ? (
                <div className="muted">先在“饮食输入”里生成策略。</div>
              ) : (
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
              )}
            </section>
          )}

          {activeTab === "history" && (
            <section className="card">
              <h2>每餐记录</h2>
              {history.length === 0 ? (
                <div className="muted">暂无记录。</div>
              ) : (
                <div className="historyList">
                  {history.map((item, index) => (
                    <div className="historyItem" key={`${item.timestamp}-${index}`}>
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
          <NavButton label="档案" id="profile" activeTab={activeTab} onSelect={setActiveTab} />
          <NavButton label="输入" id="input" activeTab={activeTab} onSelect={setActiveTab} />
          <NavButton label="建议" id="advice" activeTab={activeTab} onSelect={setActiveTab} />
          <NavButton label="记录" id="history" activeTab={activeTab} onSelect={setActiveTab} />
        </nav>
      </div>
    </>
  );
}

function NavButton({ label, id, activeTab, onSelect }) {
  const isActive = activeTab === id;
  return (
    <button
      className={`nav-button${isActive ? " active" : ""}`}
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  );
}

function Slider({ label, value, onChange, min, max, step = 1 }) {
  return (
    <div className="sliderRow">
      <div className="sliderHeader">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
