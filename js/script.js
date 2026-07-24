/* ========================================
   樱时信笺 · 剧本数据 (script.js) v2
   结构：序章 → 共通线5日×3时段 → 个人线4章×3结局 → 真结局
   节点字段扩展：day/time/keywords/cg/miniGame/letter/cg_unlock
   ======================================== */

/* ============ 角色定义 ============ */
const CHARACTERS = {
  shiyu:   { name: "林诗雨", color: "#a8c5e8", accent: "#6a8ec0" },
  xiazhi:  { name: "夏织",   color: "#f0b878", accent: "#d89048" },
  sunian:  { name: "苏念",   color: "#c8a8e0", accent: "#9070c0" },
  shen:    { name: "沈屿",   color: "#b8c8d0", accent: "#88a0b0" },
  teacher: { name: "班主任",  color: "#c0c0a8", accent: "#909078" },
  senior:  { name: "学姐",   color: "#d8d8a8", accent: "#a8a878" },
  mystery: { name: "???",    color: "#d8d8d8", accent: "#a0a0a0" },
};

/* ============ 立绘 SVG ============ */
const PORTRAITS = {
  shiyu: `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="syh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2438"/><stop offset="1" stop-color="#161020"/></linearGradient><linearGradient id="syu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a7aaa"/><stop offset="1" stop-color="#3a5a8a"/></linearGradient></defs>
    <path d="M30,90 Q40,30 100,28 Q160,30 170,90 L172,300 L28,300 Z" fill="url(#syu)"/>
    <path d="M40,80 Q50,25 100,25 Q150,25 160,80 L168,240 L128,240 L128,130 L72,130 L72,240 L32,240 Z" fill="url(#syh)"/>
    <ellipse cx="100" cy="110" rx="40" ry="46" fill="#fde2cc"/>
    <path d="M58,82 Q66,52 100,52 Q134,52 142,82 Q132,70 100,70 Q68,70 58,82 Z" fill="url(#syh)"/>
    <path d="M58,82 Q66,76 78,76 Q72,98 58,98 Z" fill="url(#syh)"/>
    <path d="M142,82 Q134,76 122,76 Q128,98 142,98 Z" fill="url(#syh)"/>
    <ellipse cx="84" cy="116" rx="5" ry="7" fill="#3a3a5a"/>
    <ellipse cx="116" cy="116" rx="5" ry="7" fill="#3a3a5a"/>
    <circle cx="84" cy="116" r="12" fill="none" stroke="#4a4a5a" stroke-width="2.2"/>
    <circle cx="116" cy="116" r="12" fill="none" stroke="#4a4a5a" stroke-width="2.2"/>
    <line x1="96" y1="116" x2="104" y2="116" stroke="#4a4a5a" stroke-width="2.2"/>
    <path d="M93,138 Q100,141 107,138" stroke="#c87878" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M55,210 L100,185 L145,210 L150,300 L50,300 Z" fill="#fff8fa" opacity="0.95"/>
    <path d="M100,185 L100,300" stroke="#3a5a8a" stroke-width="2"/>
    <path d="M84,212 L100,228 L116,212" fill="#d87090" stroke="#3a5a8a" stroke-width="1.5"/>
  </svg>`,

  xiazhi: `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="xzh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a30"/><stop offset="1" stop-color="#5a3818"/></linearGradient><linearGradient id="xzu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0a868"/><stop offset="1" stop-color="#d88848"/></linearGradient></defs>
    <path d="M30,90 Q40,30 100,28 Q160,30 170,90 L172,300 L28,300 Z" fill="url(#xzu)"/>
    <path d="M48,75 Q55,30 100,28 Q145,30 152,75 L150,150 Q140,140 130,138 L132,100 Q100,95 68,100 L70,138 Q60,140 50,150 Z" fill="url(#xzh)"/>
    <ellipse cx="100" cy="112" rx="40" ry="46" fill="#f5c898"/>
    <path d="M60,82 Q68,55 100,55 Q132,55 140,82 Q120,68 100,68 Q80,68 60,82 Z" fill="url(#xzh)"/>
    <path d="M58,82 Q50,70 48,55 Q60,62 64,75 Z" fill="url(#xzh)"/>
    <path d="M142,82 Q150,70 152,55 Q140,62 136,75 Z" fill="url(#xzh)"/>
    <ellipse cx="84" cy="118" rx="5" ry="7" fill="#4a2a1a"/>
    <ellipse cx="116" cy="118" rx="5" ry="7" fill="#4a2a1a"/>
    <path d="M80,108 Q84,104 90,108" stroke="#4a2a1a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M110,108 Q116,104 120,108" stroke="#4a2a1a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M90,140 Q100,146 110,140" stroke="#a85040" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="68" cy="128" r="5" fill="#f59878" opacity="0.6"/>
    <circle cx="132" cy="128" r="5" fill="#f59878" opacity="0.6"/>
    <path d="M55,210 L100,185 L145,210 L150,300 L50,300 Z" fill="#fff5e8" opacity="0.95"/>
    <path d="M100,185 L100,300" stroke="#d88848" stroke-width="2"/>
    <path d="M84,212 L100,228 L116,212" fill="#f0a868" stroke="#a8602a" stroke-width="1.5"/>
  </svg>`,

  sunian: `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="snh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0e8ff"/><stop offset="0.5" stop-color="#b8a8e0"/><stop offset="1" stop-color="#7a68a8"/></linearGradient><linearGradient id="snu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a8ac8"/><stop offset="1" stop-color="#6a5a98"/></linearGradient></defs>
    <path d="M30,90 Q40,30 100,28 Q160,30 170,90 L172,300 L28,300 Z" fill="url(#snu)"/>
    <path d="M38,80 Q45,25 100,22 Q155,25 162,80 L170,260 L120,260 L120,135 L80,135 L80,260 L30,260 Z" fill="url(#snh)"/>
    <ellipse cx="100" cy="108" rx="40" ry="46" fill="#fceddc"/>
    <path d="M56,80 Q62,48 100,46 Q138,48 144,80 Q130,62 100,62 Q70,62 56,80 Z" fill="url(#snh)"/>
    <path d="M56,80 Q48,95 46,140 Q58,120 60,95 Z" fill="url(#snh)"/>
    <path d="M144,80 Q152,95 154,140 Q142,120 140,95 Z" fill="url(#snh)"/>
    <ellipse cx="84" cy="114" rx="5" ry="7" fill="#5a4a78"/>
    <ellipse cx="116" cy="114" rx="5" ry="7" fill="#5a4a78"/>
    <path d="M78,104 Q84,100 92,104" stroke="#7a68a8" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M108,104 Q116,100 122,104" stroke="#7a68a8" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M94,136 Q100,138 106,136" stroke="#b87090" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M55,210 L100,185 L145,210 L150,300 L50,300 Z" fill="#f0e8ff" opacity="0.95"/>
    <path d="M100,185 L100,300" stroke="#6a5a98" stroke-width="2"/>
    <path d="M76,210 Q100,200 124,210 Q120,225 100,228 Q80,225 76,210 Z" fill="#7a68a8" opacity="0.7"/>
  </svg>`,

  shen: `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="shh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3428"/><stop offset="1" stop-color="#1a1610"/></linearGradient><linearGradient id="shu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a8898"/><stop offset="1" stop-color="#4a5868"/></linearGradient></defs>
    <path d="M30,90 Q40,30 100,28 Q160,30 170,90 L172,300 L28,300 Z" fill="url(#shu)"/>
    <path d="M50,75 Q55,28 100,26 Q145,28 150,75 L148,130 Q120,120 100,120 Q80,120 52,130 Z" fill="url(#shh)"/>
    <ellipse cx="100" cy="110" rx="40" ry="46" fill="#fde0c8"/>
    <path d="M60,82 Q66,55 100,55 Q134,55 140,82 Q120,70 100,70 Q80,70 60,82 Z" fill="url(#shh)"/>
    <ellipse cx="84" cy="116" rx="5" ry="7" fill="#2a2a3a"/>
    <ellipse cx="116" cy="116" rx="5" ry="7" fill="#2a2a3a"/>
    <path d="M78,106 Q84,102 92,106" stroke="#2a2a3a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M108,106 Q116,102 122,106" stroke="#2a2a3a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M92,138 Q100,142 108,138" stroke="#a86858" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M55,210 L100,185 L145,210 L150,300 L50,300 Z" fill="#e8e8f0" opacity="0.95"/>
    <path d="M100,185 L100,300" stroke="#4a5868" stroke-width="2"/>
    <path d="M84,212 L100,228 L116,212" fill="#7a8898" stroke="#2a3848" stroke-width="1.5"/>
  </svg>`,

  senior: `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="srh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8d8a8"/><stop offset="1" stop-color="#a8a878"/></linearGradient><linearGradient id="sru" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8b890"/><stop offset="1" stop-color="#888860"/></linearGradient></defs>
    <path d="M30,90 Q40,30 100,28 Q160,30 170,90 L172,300 L28,300 Z" fill="url(#sru)"/>
    <path d="M45,80 Q52,30 100,28 Q148,30 155,80 L150,180 Q120,170 100,170 Q80,170 50,180 Z" fill="url(#srh)"/>
    <ellipse cx="100" cy="112" rx="40" ry="46" fill="#fcedc8"/>
    <path d="M58,84 Q66,55 100,55 Q134,55 142,84 Q120,72 100,72 Q80,72 58,84 Z" fill="url(#srh)"/>
    <ellipse cx="84" cy="118" rx="5" ry="7" fill="#3a3a2a"/>
    <ellipse cx="116" cy="118" rx="5" ry="7" fill="#3a3a2a"/>
    <path d="M92,140 Q100,144 108,140" stroke="#886848" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M55,210 L100,185 L145,210 L150,300 L50,300 Z" fill="#f8f8d8" opacity="0.95"/>
    <path d="M84,212 L100,228 L116,212" fill="#b8b890" stroke="#888860" stroke-width="1.5"/>
  </svg>`,
};

/* ============ 场景标签 ============ */
const SCENE_LABELS = {
  school_gate: "樱海学园·校门",
  classroom: "高二(3)班教室",
  library: "图书馆",
  field: "操场",
  art_room: "美术室",
  hallway: "走廊",
  rooftop: "天台",
  home_room: "沈屿的房间",
  cherry_full: "樱花大道",
  summer: "盛夏·海边",
  autumn: "深秋·校园",
  winter: "寒冬·学园",
  night: "夜晚·街道",
  rain: "雨天·檐下",
  cafeteria: "食堂",
  seaside: "海边",
  festival: "学园祭",
  sportsmeet: "运动会",
  ending_good: "结局",
  ending_normal: "结局",
  ending_bad: "结局",
  ending_true: "真结局",
};

/* ============ 关键词定义 ============ */
const KEYWORDS = {
  "小说":   "林诗雨偷偷在写的东西",
  "角色A":  "她稿纸上反复出现的角色",
  "全国赛": "夏织备战的赛事",
  "特招":   "夏织家庭的隐痛",
  "紫":     "苏念画里反复出现的颜色",
  "挣":     "苏念画作的主题",
  "匿名信": "塞进你书包的神秘信",
  "学姐":   "信的真正主人",
  "樱花祭": "学园最后的春夜",
  "回信":   "你需要给出的答案",
};

/* ============ 关键词合成配方（摆脱传统收集：把收集变成创造） ============ */
const COMPOSE_RECIPES = [
  { a: "樱花祭", b: "回信",   result: "祭信",     resultName: "祭信",     desc: "在樱花祭之夜送出的回信。一种只属于此刻的承诺。" },
  { a: "匿名信", b: "学姐",   result: "未寄信",   resultName: "未寄信",   desc: "学姐写给自己却没有寄出的信。" },
  { a: "紫",     b: "挣",     result: "挣紫",     resultName: "挣紫",     desc: "从紫里挣出来——苏念真正想画的东西。" },
  { a: "小说",   b: "角色A",  result: "她就是我", resultName: "她就是我", desc: "林诗雨稿纸上的角色A，其实是她自己。" },
  { a: "全国赛", b: "特招",   result: "她的选择", resultName: "她的选择", desc: "夏织要的不是名次，而是被允许做选择。" },
  { a: "学姐",   b: "回信",   result: "替她回",   resultName: "替她回",   desc: "替学姐回她没敢回给自己的那封信。" },
  { a: "祭信",   b: "未寄信", result: "樱花信",   resultName: "樱花信",   desc: "把祭信与未寄信合在一起，就是打破循环的钥匙。" },
];
window.COMPOSE_RECIPES = COMPOSE_RECIPES;

/* ============ CG 定义（SVG 字符画） ============ */
const CGS = [
  { id: "cg_meet_shiyu", title: "走廊的初次相遇", heroine: "林诗雨", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="240" fill="#2a1a3a"/><rect y="180" width="400" height="60" fill="#1a0a2a"/><line x1="50" y1="0" x2="50" y2="180" stroke="#5a3a6a" stroke-width="2"/><line x1="350" y1="0" x2="350" y2="180" stroke="#5a3a6a" stroke-width="2"/><circle cx="120" cy="100" r="40" fill="#fde2cc"/><rect x="80" y="140" width="80" height="80" fill="#3a5a8a"/><circle cx="280" cy="100" r="40" fill="#fde0c8"/><rect x="240" y="140" width="80" height="80" fill="#4a5868"/><text x="200" y="220" text-anchor="middle" fill="#ffb8c8" font-size="14" font-family="serif">— 走廊的初次相遇 —</text></svg>` },
  { id: "cg_meet_xiazhi", title: "操场上的阳光", heroine: "夏织", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ec5e0"/><stop offset="1" stop-color="#bfe0ee"/></linearGradient></defs><rect width="400" height="160" fill="url(#sky1)"/><rect y="160" width="400" height="80" fill="#9bc97a"/><circle cx="330" cy="50" r="30" fill="#ffe890"/><rect x="180" y="100" width="40" height="80" fill="#d88848"/><circle cx="200" cy="90" r="25" fill="#f5c898"/><text x="200" y="220" text-anchor="middle" fill="#5a3818" font-size="14" font-family="serif">— 操场上的阳光 —</text></svg>` },
  { id: "cg_meet_sunian", title: "画室里的紫", heroine: "苏念", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="240" fill="#2a2438"/><rect x="50" y="60" width="300" height="160" fill="#7a68a8"/><circle cx="200" cy="100" r="35" fill="#fceddc"/><rect x="170" y="135" width="60" height="85" fill="#9a8ac8"/><rect x="80" y="180" width="60" height="40" fill="#5a4a78"/><text x="200" y="225" text-anchor="middle" fill="#c8a8e0" font-size="14" font-family="serif">— 画室里的紫 —</text></svg>` },
  { id: "cg_letter", title: "樱花瓣的信", heroine: "共通", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="240" fill="#3a2a48"/><rect x="120" y="60" width="160" height="120" fill="#fff8ee" stroke="#d87090" stroke-width="2"/><path d="M180,90 Q200,80 220,90 Q210,110 200,120 Q190,110 180,90 Z" fill="#ffb8c8"/><line x1="140" y1="130" x2="260" y2="130" stroke="#c8a8a8" stroke-width="1"/><line x1="140" y1="145" x2="240" y2="145" stroke="#c8a8a8" stroke-width="1"/><line x1="140" y1="160" x2="220" y2="160" stroke="#c8a8a8" stroke-width="1"/><text x="200" y="220" text-anchor="middle" fill="#ffd8e4" font-size="14" font-family="serif">— 樱花瓣的信 —</text></svg>` },
  { id: "cg_sportsmeet", title: "运动会终点", heroine: "共通", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="240" fill="#8ec5e0"/><rect y="160" width="400" height="80" fill="#c89858"/><rect x="0" y="160" width="400" height="4" fill="#fff"/><rect x="180" y="100" width="40" height="80" fill="#d88848"/><circle cx="200" cy="90" r="25" fill="#f5c898"/><rect x="350" y="60" width="6" height="120" fill="#fff"/><rect x="340" y="60" width="26" height="20" fill="#ff6060"/><text x="200" y="225" text-anchor="middle" fill="#5a3818" font-size="14" font-family="serif">— 运动会终点 —</text></svg>` },
  { id: "cg_festival", title: "学园祭之夜", heroine: "共通", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ft" cx="0.5" cy="0.4"><stop offset="0" stop-color="#ffb8c8"/><stop offset="1" stop-color="#3a2a48"/></radialGradient></defs><rect width="400" height="240" fill="url(#ft)"/><rect y="180" width="400" height="60" fill="#1a0a2a"/><circle cx="80" cy="50" r="3" fill="#fff" opacity="0.8"/><circle cx="150" cy="30" r="2" fill="#fff" opacity="0.6"/><circle cx="320" cy="60" r="3" fill="#fff" opacity="0.8"/><rect x="160" y="100" width="80" height="100" fill="#2a1a38"/><rect x="170" y="120" width="60" height="20" fill="#ffd890"/><text x="200" y="225" text-anchor="middle" fill="#ffd8e4" font-size="14" font-family="serif">— 学园祭之夜 —</text></svg>` },
  { id: "cg_shiyu_good", title: "回 头", heroine: "林诗雨", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="240" fill="#ffd88a"/><rect y="180" width="400" height="60" fill="#c8884a"/><circle cx="200" cy="100" r="35" fill="#fde2cc"/><rect x="160" y="135" width="80" height="80" fill="#3a5a8a"/><rect x="180" y="60" width="40" height="30" fill="#fff8ee"/><text x="200" y="225" text-anchor="middle" fill="#5a3818" font-size="14" font-family="serif">— 回 头 —</text></svg>` },
  { id: "cg_xiazhi_good", title: "终 点 线", heroine: "夏织", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="240" fill="#ffd88a"/><rect y="160" width="400" height="80" fill="#9bc97a"/><rect x="0" y="160" width="400" height="4" fill="#fff"/><rect x="394" y="160" width="6" height="4" fill="#000"/><rect x="170" y="100" width="40" height="80" fill="#d88848"/><circle cx="190" cy="90" r="25" fill="#f5c898"/><text x="200" y="225" text-anchor="middle" fill="#5a3818" font-size="14" font-family="serif">— 终 点 线 —</text></svg>` },
  { id: "cg_sunian_good", title: "挣", heroine: "苏念", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="240" fill="#e8b8c8"/><rect x="50" y="50" width="300" height="160" fill="#7a68a8"/><circle cx="200" cy="120" r="25" fill="#fceddc"/><path d="M150,90 L250,90 L250,180 L150,180 Z" fill="none" stroke="#fff" stroke-width="2"/><text x="200" y="225" text-anchor="middle" fill="#3a2a48" font-size="14" font-family="serif">— 挣 —</text></svg>` },
  { id: "cg_true", title: "樱 花 信", heroine: "真结局", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="tt" cx="0.5" cy="0.5"><stop offset="0" stop-color="#fff8ee"/><stop offset="1" stop-color="#d87090"/></radialGradient></defs><rect width="400" height="240" fill="url(#tt)"/><circle cx="100" cy="50" r="6" fill="#ffb8c8" opacity="0.8"/><circle cx="300" cy="40" r="5" fill="#ffb8c8" opacity="0.7"/><circle cx="200" cy="80" r="4" fill="#fff" opacity="0.8"/><circle cx="60" cy="180" r="5" fill="#ffb8c8" opacity="0.6"/><circle cx="340" cy="200" r="6" fill="#ffb8c8" opacity="0.7"/><rect x="140" y="100" width="120" height="80" fill="#fff8ee" stroke="#d87090" stroke-width="2"/><text x="200" y="150" text-anchor="middle" fill="#3a2a48" font-size="20" font-family="serif">回 信</text><text x="200" y="225" text-anchor="middle" fill="#5a3818" font-size="14" font-family="serif">— 樱 花 信 —</text></svg>` },
];

/* ============ 全结局定义 ============ */
const ENDINGS = [
  { id: "shiyu_good",   heroine: "林诗雨", title: "回 头",   type: "GOOD",   desc: "她终于敢回头。" },
  { id: "shiyu_normal", heroine: "林诗雨", title: "半 章",   type: "NORMAL", desc: "她留下了半章，也留下了自己。" },
  { id: "shiyu_bad",    heroine: "林诗雨", title: "未 活 过", type: "BAD",    desc: "她回过头，看见的依然没走过。" },
  { id: "xiazhi_good",  heroine: "夏织",   title: "终 点 线", type: "GOOD",   desc: "有人等在终点。" },
  { id: "xiazhi_normal",heroine: "夏织",   title: "第三名", type: "NORMAL", desc: "她拿了第三，留了下来。" },
  { id: "xiazhi_bad",   heroine: "夏织",   title: "一 个 人", type: "BAD",    desc: "她终于一个人了。" },
  { id: "sunian_good",  heroine: "苏念",   title: "挣",     type: "GOOD",   desc: "她松开了手。" },
  { id: "sunian_normal",heroine: "苏念",   title: "网 展", type: "NORMAL", desc: "她在自己的网展开了个展。" },
  { id: "sunian_bad",   heroine: "苏念",   title: "按 住",   type: "BAD",    desc: "她按住了自己。" },
  { id: "true_end",     heroine: "真结局", title: "樱 花 信", type: "TRUE",  desc: "你替她回了一封信，也写下自己。" },
];

/* ============ 剧本节点 ============ */
const SCRIPT = {

  /* ============ 序章（扩展：男主背景 + 时间循环提示） ============ */
  prologue_1: {
    day: 1, time: "morning", bg: "cherry_full", speaker: "",
    // 循环专属文本：根据 loopCount 显示不同开场
    text: "四月，樱海学园。连风都染着粉白，从校门口一路铺到教学楼，像有人提前替我铺好了红毯。",
    loopText: [
      "四月，樱海学园。连风都染着粉白，从校门口一路铺到教学楼，像有人提前替我铺好了红毯。",
      "——又是四月。樱花照旧开。风照旧从校门口铺到教学楼。可我明明记得，这一切已经发生过一次。",
      "——第三次四月。我已经不再惊讶了。樱花、风、红毯，所有东西都和上一次一样。可这次我会带一些上次没带走的东西。",
      "——又一次四月。我能背下每片樱花落下的位置。可樱花不是用来背的，它们是用来写的。这次我试着写。",
      "——还是四月。我不再数这是第几次了。我只是想——这一次，能不能合成那封信。"
    ],
    next: "prologue_2"
  },
  prologue_2: { day: 1, time: "morning", bg: "cherry_full", speaker: "", text: "我，沈屿。两周前父亲说工作调动，母亲说随你便。两个人已经冷战三个月。我选了住校。", next: "prologue_3" },
  prologue_3: { day: 1, time: "morning", bg: "school_gate", speaker: "", text: "手里攥着皱巴巴的入学通知书，胸口闷得发紧。教学楼的钟响起来时，我还没找到教务处。", next: "prologue_4" },
  prologue_4: { day: 1, time: "morning", bg: "hallway", chars: [{id:"shiyu", pos:"center"}], speaker: "???", text: "——同学，你挡在路中间了。", next: "prologue_5", keyword: "林诗雨" },
  prologue_5: { day: 1, time: "morning", bg: "hallway", char: "shiyu", speaker: "", text: "回过头，是个戴眼镜的女生。黑长直，臂弯里抱着一摞作业本，神情是优等生特有的那种礼貌。", next: "prologue_6" },
  prologue_6: { day: 1, time: "morning", bg: "hallway", char: "shiyu", speaker: "林诗雨", text: "我是高二(3)班班长，林诗雨。你就是今天转来的沈屿吧？班主任让我来接你。", next: "prologue_7" },
  prologue_7: { day: 1, time: "morning", bg: "hallway", char: "shiyu", speaker: "沈屿", text: "……麻烦你了。", next: "prologue_8" },
  prologue_8: {
    day: 1, time: "morning", bg: "hallway", char: "shiyu", speaker: "林诗雨",
    text: "跟我来。座位在你前面，看不清黑板就说一声。",
    next: "prologue_9",
    add: { affection: { shiyu: 1 } },
    cg_unlock: "cg_meet_shiyu",
    memory: { id: "序章·诗雨", title: "走廊相遇", text: "她回头的时候，我以为她在看墙，其实她在看我。" },
    // 视角切换：解锁记忆后可看诗雨内心
    perspective: {
      who: "林诗雨",
      text: "——又是一个不敢抬头的转学生。我递出地图的时候手指在抖，他没看见。我也不想让他看见。其实那张地图我画了三遍。第一遍太潦草，第二遍太用力，第三遍——刚刚好。可我画了三遍这件事，谁也不知道。",
      memory: "诗雨·走廊",
      requiresMemory: false // 序章直接可看，不需要先解锁记忆
    }
  },
  prologue_9: { day: 1, time: "morning", bg: "classroom", char: null, speaker: "", text: "推开门的瞬间，整间教室的目光都甩了过来。班主任咳嗽一声，才把它们压回去。", next: "prologue_10" },
  prologue_10: { day: 1, time: "morning", bg: "classroom", speaker: "班主任", text: "都安静。这是新转来的沈屿同学，希望大家多照顾。诗雨，带他到座位。", next: "prologue_11" },
  prologue_11: { day: 1, time: "morning", bg: "classroom", char: "shiyu", speaker: "", text: "我坐下的瞬间，前面的林诗雨回过头，把一张校园地图推到我桌上。地图画得极细致。", next: "prologue_12" },
  prologue_12: { day: 1, time: "morning", bg: "classroom", char: "shiyu", speaker: "林诗雨", text: "食堂、图书馆、医务室都标了。找不到就回来问我，别乱跑。", next: "prologue_13" },
  prologue_13: { day: 1, time: "morning", bg: "classroom", speaker: "沈屿", text: "……谢谢。地图画得很清楚。", next: "prologue_14" },
  prologue_14: { day: 1, time: "morning", bg: "classroom", char: "shiyu", speaker: "林诗雨", text: "嗯。", next: "prologue_15" },
  prologue_15: { day: 1, time: "morning", bg: "classroom", speaker: "", text: "她转回去的瞬间，地图边角露出极小一行字，像是被反复涂改过：「角色 A 推开门——」", next: "prologue_16", keyword: "角色A" },
  prologue_16: { day: 1, time: "morning", bg: "classroom", speaker: "沈屿", text: "（……角色 A？她在写什么？）", next: "prologue_17" },
  prologue_17: { day: 1, time: "morning", bg: "classroom", char: "shiyu", speaker: "林诗雨", text: "看什么？上课了。", next: "prologue_18" },
  prologue_18: { day: 1, time: "morning", bg: "classroom", speaker: "", text: "上午的课结束得很慢。下课铃一响，教室瞬间炸开。我正想躲出去透气——", next: "prologue_19" },
  prologue_19: { day: 1, time: "noon", bg: "field", char: "xiazhi", speaker: "夏织", text: "转学生！正好——你是新来的对吧？田径社缺人，下午来试一下！", next: "prologue_20", cg_unlock: "cg_meet_xiazhi" },
  prologue_20: { day: 1, time: "noon", bg: "field", speaker: "沈屿", text: "你是……？", next: "prologue_21" },
  prologue_21: { day: 1, time: "noon", bg: "field", char: "xiazhi", speaker: "夏织", text: "夏织，田径社王牌兼招新委员！哇你腿挺长的，天生练短跑的料。", next: "prologue_22", add: { affection: { xiazhi: 1 } } },
  prologue_22: { day: 1, time: "noon", bg: "field", speaker: "沈屿", text: "我没怎么跑过……", next: "prologue_23" },
  prologue_23: { day: 1, time: "noon", bg: "field", char: "xiazhi", speaker: "夏织", text: "没事，下午放学来操场就行。不来我就去班里堵你！", next: "prologue_24" },
  prologue_24: { day: 1, time: "noon", bg: "hallway", char: null, speaker: "", text: "她风一样走了。我盯着手里被塞进的传单，苦笑。下午放学，我故意绕了远路，结果还是迷了路。", next: "prologue_25" },
  prologue_25: { day: 1, time: "evening", bg: "art_room", char: "sunian", speaker: "???", text: "……别动。", next: "prologue_26", cg_unlock: "cg_meet_sunian" },
  prologue_26: { day: 1, time: "evening", bg: "art_room", speaker: "", text: "推开半掩的门，画室里只有一个女生，对着画布发呆。她的头发是淡紫渐变，像被人泼了一桶月光。", next: "prologue_27", keyword: "紫" },
  prologue_27: { day: 1, time: "evening", bg: "art_room", char: "sunian", speaker: "苏念", text: "门。你挡到光了。", next: "prologue_28" },
  prologue_28: { day: 1, time: "evening", bg: "art_room", speaker: "沈屿", text: "抱歉，我迷路了……", next: "prologue_29" },
  prologue_29: { day: 1, time: "evening", bg: "art_room", char: "sunian", speaker: "苏念", text: "美术室在东侧尽头。你走反了。出去时把门带上。", next: "prologue_30" },
  prologue_30: { day: 1, time: "evening", bg: "art_room", speaker: "", text: "她连头都没回。画布上是一片未干的紫，像是把整个黄昏都压了进去。", next: "prologue_31" },
  prologue_31: { day: 1, time: "evening", bg: "school_gate", char: null, speaker: "", text: "走出校门时，太阳已经压到海面上。樱花大道尽头是橘色的海。", next: "prologue_32" },
  prologue_32: { day: 1, time: "evening", bg: "school_gate", speaker: "", text: "书包侧袋里多了一样东西——一张折成樱花瓣形状的信纸，没有署名。", next: "prologue_33", keyword: "匿名信", cg_unlock: "cg_letter" },
  prologue_33: { day: 1, time: "evening", bg: "home_room", speaker: "", text: "「致转学生：第一个周末，请你做一个选择。樱海有三条未走完的路，你会走哪一条？」", next: "prologue_34" },
  prologue_34: { day: 1, time: "evening", bg: "home_room", speaker: "沈屿", text: "……谁放的？", next: "prologue_35" },
  prologue_35: { day: 1, time: "evening", bg: "home_room", speaker: "", text: "没有人回答。窗外樱花簌簌。我决定先睡，第二天再看。", next: "common_day2_morning" },

  /* ============ 共通线 · 第 2 日 ============ */
  common_day2_morning: {
    day: 2, time: "morning", bg: "classroom", char: "shiyu", speaker: "",
    text: "第二天早自习。林诗雨的笔在纸上沙沙作响，写一会儿又涂掉。夏织从前门探了个头进来，被她躲开了。苏念的座位是空的——美术社的人常翘早自习。",
    next: "day2_choice"
  },
  day2_choice: {
    day: 2, time: "morning", bg: "classroom", char: null,
    choice: {
      prompt: "第 2 日 · 上午 · 去哪里？",
      options: [
        { text: "图书馆（林诗雨）", next: "d2_library_1", add: { affection: { shiyu: 1 } } },
        { text: "操场（夏织）",     next: "d2_field_1",   add: { affection: { xiazhi: 1 } } },
        { text: "美术室（苏念）",   next: "d2_art_1",    add: { affection: { sunian: 1 } } },
        { text: "天台透气",         next: "d2_rooftop_1", add: { affection: { shen: 1 } } },
        {
          text: "★ 旧校舍后面（？） ★",
          next: "d2_senior_easter",
          requires: () => window.__game && window.__game.state && window.__game.state.playCount >= 1,
          add: { affection: { shen: 2 } }
        },
      ],
      // 循环解锁的额外选项
      loopChoice: [
        {
          minLoop: 1,
          text: "⟲ 直接去樱花树下（循环记忆）",
          next: "d2_loop_memory",
          requires_memory: "序章·诗雨"
        },
        {
          minLoop: 2,
          text: "⟲⟲ 找学姐问个明白（深度循环）",
          next: "d2_loop_senior",
          requires_memory: "诗雨·走廊"
        }
      ]
    }
  },
  // 循环专属剧情：在樱花树下回忆
  d2_loop_memory: { day: 2, time: "morning", bg: "cherry_full", char: null, speaker: "", text: "我去了樱花树下。这一次我不再急着走主线。我只是站一会儿，看看风。", next: "d2_loop_memory_2" },
  d2_loop_memory_2: { day: 2, time: "morning", bg: "cherry_full", char: null, speaker: "沈屿", text: "——奇怪。上一次我也站在这里。可那一次，我没看见风的方向。", next: "d2_loop_memory_3" },
  d2_loop_memory_3: { day: 2, time: "morning", bg: "cherry_full", char: null, speaker: "沈屿", text: "风是从海那边吹来的。它穿过樱花，穿过我，穿过身后那栋楼。它什么都没带走。可这次我听见它在说话。", next: "d2_loop_memory_4", memory: { id: "樱花树下的风", title: "听见风", text: "风是从海那边吹来的。它什么都没带走。可这次我听见它在说话。" } },
  d2_loop_memory_4: { day: 2, time: "morning", bg: "cherry_full", char: null, speaker: "沈屿", text: "——它说，循环不是用来逃的。循环是用来写的。", next: "d2_loop_memory_5" },
  d2_loop_memory_5: { day: 2, time: "morning", bg: "cherry_full", char: null, speaker: "", text: "我点点头。然后回去上课。今天该走哪条路，还是得选。", next: "d2_noon" },
  // 循环专属剧情：找学姐
  d2_loop_senior: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "——你又来了。这次是第几次？我自己都数不清了。", next: "d2_loop_senior_2" },
  d2_loop_senior_2: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "沈屿", text: "学姐，你知道循环这件事？", next: "d2_loop_senior_3" },
  d2_loop_senior_3: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "三年前我也知道。可知道没用。要合成「樱花信」，你必须先有「祭信」和「未寄信」。这两样——一样要你替别人回信，一样要你替自己回信。", next: "d2_loop_senior_4", memory: { id: "学姐·提示", title: "合成配方", text: "要合成「樱花信」，必须先有「祭信」和「未寄信」。" } },
  d2_loop_senior_4: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "「祭信」= 樱花祭 + 回信。你只有在樱花祭之夜真的回了一封信，才会得到它。", next: "d2_loop_senior_5" },
  d2_loop_senior_5: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "「未寄信」= 匿名信 + 学姐。也就是——你要把我留下来的那封信，读懂。", next: "d2_loop_senior_6" },
  d2_loop_senior_6: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "去吧。这一次，别再走一半。", next: "d2_noon" },
  /* —— 二周目彩蛋：学姐的旧校舍 —— */
  d2_senior_easter: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "???", text: "——你来啦。我就知道，第二个春天你会再回来一次。", next: "d2_senior_easter_2", keyword: "学姐" },
  d2_senior_easter_2: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "三年前我也站在你这个位置。三条路我都走了一半。告诉你一些我没告诉过自己的话：", next: "d2_senior_easter_3" },
  d2_senior_easter_3: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "诗雨的小说，写下去比写完重要。夏织的脚，停下来比跑出去重要。苏念的紫，松手比画完重要。", next: "d2_senior_easter_4" },
  d2_senior_easter_4: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "你不必替她们走完。你只要在她们卡住的时候，递一句话。这封信——也替我递给自己。", next: "d2_senior_easter_5", cg_unlock: "cg_letter" },
  d2_senior_easter_5: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "去吧。下午食堂见。", next: "d2_noon" },
  d2_library_1: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "", text: "图书馆二楼靠窗的位置，林诗雨正埋头抄写着什么。听到脚步声，她飞快把本子塞进抽屉。", next: "d2_library_2" },
  d2_library_2: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……你来干嘛？", next: "d2_library_3" },
  d2_library_3: { day: 2, time: "morning", bg: "library", speaker: "沈屿", text: "还书。顺便——你藏的那个本子，是在写小说？", next: "d2_library_4" },
  d2_library_4: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……你看到了？", next: "d2_library_5" },
  d2_library_5: { day: 2, time: "morning", bg: "library", speaker: "沈屿", text: "只看到「角色 A 推开门」。继续写下去吧，我不打扰你。", next: "d2_library_6" },
  d2_library_6: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……没人知道我在写。家里希望我考法律系。如果让他们知道——", next: "d2_library_7" },
  d2_library_7: { day: 2, time: "morning", bg: "library", speaker: "沈屿", text: "那你为什么还在写？", next: "d2_library_8" },
  d2_library_8: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "因为……不写的话，我会忘掉自己是谁。这本小说，是写给我外婆的。她去年走了，是个作家。", next: "d2_library_9", set: { flag_shiyu_secret: true, flag_shiyu_grandma: true } },
  d2_library_9: { day: 2, time: "morning", bg: "library", speaker: "", text: "窗外的樱花被风吹进图书馆，落在她摊开的稿纸上。她没去拂，只是看着它。", next: "d2_noon" },

  d2_field_1: { day: 2, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "来了来了！热身先跑两圈——欸你怎么脸那么白，没吃早饭？", next: "d2_field_2" },
  d2_field_2: { day: 2, time: "morning", bg: "field", speaker: "沈屿", text: "吃了。你不用训练吗？", next: "d2_field_3" },
  d2_field_3: { day: 2, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "我？我备战全国赛。教练说再不拿名次，特招名额就没了。", next: "d2_field_4" },
  d2_field_4: { day: 2, time: "morning", bg: "field", speaker: "沈屿", text: "特招？", next: "d2_field_5" },
  d2_field_5: { day: 2, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……嗯。家里那边，挺复杂的。我妈再婚了。只有跑出去，我才能——算了，不说了。陪我跑一组？", next: "d2_field_6", set: { flag_xiazhi_family: true } },
  d2_field_6: { day: 2, time: "morning", bg: "field", speaker: "", text: "她的笑容在阳光底下很亮，可我总觉得那下面压着什么。跑完后她塞给我一瓶水。", next: "d2_noon" },

  d2_art_1: { day: 2, time: "morning", bg: "art_room", char: "sunian", speaker: "", text: "美术室里只有苏念一人。画布上还是那片紫，但角落多了几道焦黑的划痕。", next: "d2_art_2" },
  d2_art_2: { day: 2, time: "morning", bg: "art_room", speaker: "沈屿", text: "昨天那幅……还没画完？", next: "d2_art_3" },
  d2_art_3: { day: 2, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "画不完。它不让我画完。紫色是我哥哥最喜欢的颜色。他三年前走了。", next: "d2_art_4", set: { flag_sunian_block: true, flag_sunian_brother: true } },
  d2_art_4: { day: 2, time: "morning", bg: "art_room", speaker: "沈屿", text: "……什么叫——它不让你画完？", next: "d2_art_5" },
  d2_art_5: { day: 2, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "从去年省展拿了金奖之后，我就再没完成过一幅。他们说我是天才。可天才不该卡在草稿里三年。", next: "d2_art_6" },
  d2_art_6: { day: 2, time: "morning", bg: "art_room", speaker: "沈屿", text: "也许你不是画不完，是不敢画完。画完了，就得证明下一幅还能更好。", next: "d2_art_7" },
  d2_art_7: { day: 2, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……", next: "d2_art_8" },
  d2_art_8: { day: 2, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "你这种话，别人没说过。出去吧，让我一个人待一会儿。", next: "d2_noon" },

  d2_rooftop_1: { day: 2, time: "morning", bg: "rooftop", char: null, speaker: "", text: "天台的风很大，把海的声音送过来。我靠在栏杆上，第一次觉得能喘口气。", next: "d2_rooftop_2" },
  d2_rooftop_2: { day: 2, time: "morning", bg: "rooftop", char: null, speaker: "沈屿", text: "（匿名信说的三条路……我现在一条都看不清。）", next: "d2_rooftop_3" },
  d2_rooftop_3: { day: 2, time: "morning", bg: "rooftop", speaker: "", text: "风把一张便条吹到我脚边。上面只有一行字：「学姐也是转学生。」", next: "d2_noon", keyword: "学姐" },

  d2_noon: { day: 2, time: "noon", bg: "cafeteria", char: null, speaker: "", text: "中午。食堂人多得像沙丁鱼罐头。我端着托盘找不到位置——", next: "d2_noon_2" },
  d2_noon_2: { day: 2, time: "noon", bg: "cafeteria", chars: [{id:"xiazhi", pos:"left"}, {id:"shiyu", pos:"right"}], speaker: "夏织", text: "这儿这儿！转学生，坐我跟班长中间！", next: "d2_noon_3" },
  d2_noon_3: { day: 2, time: "noon", bg: "cafeteria", char: null, speaker: "", text: "夏织和林诗雨居然坐在一起。一个像太阳，一个像月亮，气场却并不冲突。", next: "d2_noon_4" },
  d2_noon_4: { day: 2, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "夏织，运动会报名表你交了没？", next: "d2_noon_5" },
  d2_noon_5: { day: 2, time: "noon", bg: "cafeteria", char: "xiazhi", speaker: "夏织", text: "交了交了。女子 100 米、4×100 接力。诗雨你呢？", next: "d2_noon_6" },
  d2_noon_6: { day: 2, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "我只报了 1500 米。走个过场。", next: "d2_noon_7" },
  d2_noon_7: { day: 2, time: "noon", bg: "cafeteria", speaker: "沈屿", text: "苏念呢？", next: "d2_noon_8" },
  d2_noon_8: { day: 2, time: "noon", bg: "cafeteria", char: "xiazhi", speaker: "夏织", text: "苏念？她运动会从来都请假。美术社那帮人跟我们不是一个次元。", next: "d2_noon_9" },
  d2_noon_9: { day: 2, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "……她其实来过。去年看了一会儿就走了，没报名。", next: "d2_noon_10" },
  d2_noon_10: { day: 2, time: "noon", bg: "cafeteria", speaker: "", text: "我注意到她们说苏念时，眼神都温和了一些。原来三个人之间，是有故事的。", next: "d2_evening" },
  d2_evening: { day: 2, time: "evening", bg: "home_room", char: null, speaker: "", text: "晚上回宿舍。匿名信的事还压在心里。我决定先把信收好，明天再想。", next: "common_day3_morning" },

  /* ============ 第 3 日 · 运动会预选 ============ */
  common_day3_morning: { day: 3, time: "morning", bg: "classroom", speaker: "班主任", text: "运动会预选今天下午开始。各项目负责人课间到体育组抽签。", next: "d3_choice" },
  d3_choice: {
    day: 3, time: "morning", bg: "classroom",
    choice: {
      prompt: "第 3 日 · 上午 · 帮谁？",
      options: [
        { text: "帮林诗雨整理报名表", next: "d3_shiyu_1", add: { affection: { shiyu: 2 } } },
        { text: "陪夏织热身",         next: "d3_xiazhi_1", add: { affection: { xiazhi: 2 } } },
        { text: "去美术室叫苏念",     next: "d3_sunian_1", add: { affection: { sunian: 2 } } },
      ]
    }
  },
  d3_shiyu_1: { day: 3, time: "morning", bg: "classroom", char: "shiyu", speaker: "林诗雨", text: "……谢谢。报名表我一个人整理了三天。", next: "d3_shiyu_2" },
  d3_shiyu_2: { day: 3, time: "morning", bg: "classroom", speaker: "沈屿", text: "为什么不让别人帮？", next: "d3_shiyu_3" },
  d3_shiyu_3: { day: 3, time: "morning", bg: "classroom", char: "shiyu", speaker: "林诗雨", text: "交给别人，就要解释为什么我要把每一栏都做得这么细。我不想解释。", next: "d3_shiyu_4" },
  d3_shiyu_4: { day: 3, time: "morning", bg: "classroom", speaker: "", text: "她说话时笔没停。我注意到她写到「女子 100 米」时停顿了一下。", next: "d3_noon" },
  d3_xiazhi_1: { day: 3, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "你来啦？正好帮我掐表。今天我想试 11.9。", next: "d3_xiazhi_2" },
  d3_xiazhi_2: { day: 3, time: "morning", bg: "field", speaker: "", text: "她起跑的瞬间，左脚踝微微一滞。但她咬着牙冲完了全程。11.92。", next: "d3_xiazhi_3" },
  d3_xiazhi_3: { day: 3, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……还差一点。再来一组。", next: "d3_xiazhi_4" },
  d3_xiazhi_4: { day: 3, time: "morning", bg: "field", speaker: "沈屿", text: "你左脚——", next: "d3_xiazhi_5" },
  d3_xiazhi_5: { day: 3, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "没事！旧伤，习惯了。别告诉教练。", next: "d3_xiazhi_6", set: { flag_xiazhi_injury: true } },
  d3_xiazhi_6: { day: 3, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "来嘛，陪我冲一组！我喊你掐表，你顺便帮我看下节奏。", next: "d3_xiazhi_minigame" },
  d3_xiazhi_minigame: {
    day: 3, time: "morning", bg: "field", char: "xiazhi", speaker: "",
    text: "——按下方向键配合她的节奏。",
    minigame: "running",
    scoreBonus: { affection: { xiazhi: 1 } },
    next: "d3_noon"
  },
  d3_sunian_1: { day: 3, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……你来干嘛。", next: "d3_sunian_2" },
  d3_sunian_2: { day: 3, time: "morning", bg: "art_room", speaker: "沈屿", text: "运动会预选，你想报名吗？", next: "d3_sunian_3" },
  d3_sunian_3: { day: 3, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……我不去人多的地方。", next: "d3_sunian_4" },
  d3_sunian_4: { day: 3, time: "morning", bg: "art_room", speaker: "沈屿", text: "那去年你为什么来过一次？", next: "d3_sunian_5" },
  d3_sunian_5: { day: 3, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……我想看一个人跑。后来她摔了，我没看完就走了。", next: "d3_noon" },
  d3_noon: { day: 3, time: "noon", bg: "sportsmeet", char: null, speaker: "", text: "下午，运动会预选。操场被各色运动服染成流动的色块。", next: "d3_noon_2" },
  d3_noon_2: { day: 3, time: "noon", bg: "sportsmeet", char: "xiazhi", speaker: "", text: "女子 100 米预选。夏织在第三道。发令枪响，她第一个冲出去。", next: "d3_noon_3", cg_unlock: "cg_sportsmeet" },
  d3_noon_3: { day: 3, time: "noon", bg: "sportsmeet", char: "xiazhi", speaker: "", text: "——但 60 米处，她左脚一软。她踉跄了一下，咬着牙没倒，最后第二名冲线。", next: "d3_noon_4" },
  d3_noon_4: { day: 3, time: "noon", bg: "sportsmeet", char: "xiazhi", speaker: "夏织", text: "……没事。没事！只是崴了一下。", next: "d3_noon_5" },
  d3_noon_5: { day: 3, time: "noon", bg: "sportsmeet", chars: [{id:"shiyu", pos:"left"}, {id:"sunian", pos:"right"}], speaker: "", text: "我看到林诗雨和苏念都站在场边。林诗雨手里攥着冰袋，苏念抱着画本，谁都没说话。", next: "d3_noon_6" },
  d3_noon_6: { day: 3, time: "noon", bg: "sportsmeet", speaker: "", text: "夏织抬头看到她们，愣了一下，然后笑得眼睛弯成月亮：「都来啦？」", next: "d3_evening" },
  d3_evening: { day: 3, time: "evening", bg: "home_room", char: null, speaker: "", text: "回宿舍。我打开抽屉，匿名信旁边又多了一封。", next: "letter_1" },

  /* —— 信件系统 1 —— */
  letter_1: {
    day: 3, time: "evening", bg: "home_room", char: null,
    speaker: "",
    text: "「第二封信。问题：当一个人明明在跑，却越跑越累，是该让她继续，还是让她停一停？」",
    letter: {
      id: "letter_1",
      prompt: "你的回信——",
      options: [
        { text: "让她继续。停下会更疼。", value: "go",   next: "letter_1_after" },
        { text: "让她停一停。喘口气再跑。", value: "stop", next: "letter_1_after" },
        { text: "问她自己想跑多远。",         value: "ask",  next: "letter_1_after" },
      ]
    }
  },
  letter_1_after: { day: 3, time: "evening", bg: "home_room", speaker: "沈屿", text: "我把信封好，放在窗台上。明天它就会不见。", next: "common_day4_morning" },

  /* ============ 第 4 日 · 学园祭筹备 ============ */
  common_day4_morning: { day: 4, time: "morning", bg: "classroom", speaker: "班主任", text: "学园祭还有一周。各班今天定主题。文艺社、田径社、美术社都要出节目。", next: "d4_choice" },
  d4_choice: {
    day: 4, time: "morning", bg: "classroom",
    choice: {
      prompt: "第 4 日 · 上午 · 谁的社团需要帮忙？",
      options: [
        { text: "文艺社 · 帮林诗雨排剧本", next: "d4_shiyu_1", add: { affection: { shiyu: 2 } } },
        { text: "田径社 · 帮夏织布置场地",   next: "d4_xiazhi_1", add: { affection: { xiazhi: 2 } } },
        { text: "美术社 · 帮苏念搬画",       next: "d4_sunian_1", add: { affection: { sunian: 2 } } },
      ]
    }
  },
  d4_shiyu_1: { day: 4, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……你要帮我排剧本？", next: "d4_shiyu_2" },
  d4_shiyu_2: { day: 4, time: "morning", bg: "library", speaker: "沈屿", text: "反正我也没事。剧本我看过半章了。", next: "d4_shiyu_3" },
  d4_shiyu_3: { day: 4, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……那是写给我外婆的。她没写完最后一本。我在替她写。", next: "d4_shiyu_4" },
  d4_shiyu_4: { day: 4, time: "morning", bg: "library", speaker: "", text: "她把稿纸递给我。第一页边角写着：「献给外婆，替她写完这一章。」", next: "d4_shiyu_5" },
  d4_shiyu_5: { day: 4, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……你帮我写一句开场吧。我卡在这一句卡了三天。", next: "d4_shiyu_minigame" },
  d4_shiyu_minigame: {
    day: 4, time: "morning", bg: "library", char: "shiyu", speaker: "",
    text: "——打字写出一句开场。",
    minigame: "writing",
    scoreBonus: { affection: { shiyu: 1 } },
    next: "d4_noon"
  },
  d4_xiazhi_1: { day: 4, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "田径社要办一个「奔跑接力」展，让来宾体验短跑。你帮我搭跑道。", next: "d4_xiazhi_2" },
  d4_xiazhi_2: { day: 4, time: "morning", bg: "field", speaker: "", text: "我们搬了一上午的桩和彩带。她左脚踝贴着膏药，但没说。", next: "d4_xiazhi_3" },
  d4_xiazhi_3: { day: 4, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……沈屿，你说跑下去，真的能跑出去吗？", next: "d4_noon" },
  d4_sunian_1: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……美术社要办画展。我得交一幅。", next: "d4_sunian_2" },
  d4_sunian_2: { day: 4, time: "morning", bg: "art_room", speaker: "沈屿", text: "你不是卡了三年吗？", next: "d4_sunian_3" },
  d4_sunian_3: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……但我必须交。否则省展邀请会作废。帮我搬旧画，看看有没有能改的。", next: "d4_sunian_4" },
  d4_sunian_4: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "搬完了。这一堆你看着乱，可每一张都是我卡住的那一年。来，帮我调一组色，看看哪一组能配出我要的那种紫。", next: "d4_sunian_minigame" },
  d4_sunian_minigame: {
    day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "",
    text: "——把颜色匹配到对应的目标框。",
    minigame: "painting",
    scoreBonus: { affection: { sunian: 1 } },
    next: "d4_noon"
  },
  d4_noon: { day: 4, time: "noon", bg: "cafeteria", char: null, speaker: "", text: "中午吃饭时，三女主破天荒坐到了一桌。我端着托盘远远看着。", next: "d4_noon_2" },
  d4_noon_2: { day: 4, time: "noon", bg: "cafeteria", chars: [{id:"shiyu", pos:"left"}, {id:"xiazhi", pos:"center"}, {id:"sunian", pos:"right"}], speaker: "夏织", text: "我提议——学园祭那天，我们三个一起出节目。诗雨写本子，我跑展，苏念画海报。", next: "d4_noon_3" },
  d4_noon_3: { day: 4, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "……可以。", next: "d4_noon_4" },
  d4_noon_4: { day: 4, time: "noon", bg: "cafeteria", char: "sunian", speaker: "苏念", text: "海报……我画。", next: "d4_noon_5" },
  d4_noon_5: { day: 4, time: "noon", bg: "cafeteria", speaker: "", text: "三个互不相让的人，难得地达成了默契。我忽然意识到，她们才是彼此的「三条路」。", next: "d4_evening" },
  d4_evening: { day: 4, time: "evening", bg: "home_room", char: null, speaker: "", text: "晚上。第三封信到了。「问题：如果三条路其实通向同一个地方，你还要走吗？」", next: "letter_2" },
  letter_2: {
    day: 4, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "「如果三条路其实通向同一个地方，你还要走吗？」",
    letter: {
      id: "letter_2",
      prompt: "你的回信——",
      options: [
        { text: "要。走本身就是意义。",       value: "walk",  next: "letter_2_after" },
        { text: "不要。那我宁愿停在这里。",   value: "stop",  next: "letter_2_after" },
        { text: "问问她们想不想一起走。",     value: "together", next: "letter_2_after" },
      ]
    }
  },
  letter_2_after: { day: 4, time: "evening", bg: "home_room", speaker: "沈屿", text: "信封好，放在窗台。明天就是决定路线的日子。", next: "common_day5_morning" },

  /* ============ 第 5 日 · 路线决定日 ============ */
  common_day5_morning: { day: 5, time: "morning", bg: "rooftop", char: null, speaker: "", text: "第 5 日清晨。我爬上天台透气。海风把樱花吹成一场粉色的雨。", next: "d5_route_check" },
  d5_route_check: {
    // 根据好感度自动选线
    if: { var: "affection.shiyu", gte: 3, then: "route_shiyu_1" },
    else: "d5_check_xiazhi"
  },
  d5_check_xiazhi: {
    if: { var: "affection.xiazhi", gte: 3, then: "route_xiazhi_1" },
    else: "d5_check_sunian"
  },
  d5_check_sunian: {
    if: { var: "affection.sunian", gte: 3, then: "route_sunian_1" },
    else: "d5_default_choice"
  },
  d5_default_choice: {
    day: 5, time: "morning", bg: "rooftop",
    choice: {
      prompt: "这个周末，去见谁？",
      options: [
        { text: "图书馆找林诗雨", next: "route_shiyu_1" },
        { text: "操场找夏织",     next: "route_xiazhi_1" },
        { text: "美术室找苏念",   next: "route_sunian_1" },
      ]
    }
  },

  /* ============ 林诗雨线 · 4 章 × 3 结局 ============ */
  route_shiyu_1: { day: 5, time: "morning", bg: "library", char: "shiyu", speaker: "", text: "周六图书馆。林诗雨一个人坐在老位置，稿纸叠得更高了。", next: "sy_2" },
  sy_2: { day: 5, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "你来了。我以为你不会来。", next: "sy_3" },
  sy_3: { day: 5, time: "morning", bg: "library", speaker: "沈屿", text: "你说不写会忘掉自己。我来看看，你还记不记得自己。", next: "sy_4" },
  sy_4: { day: 5, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……我妈昨天翻了我的书包。", next: "sy_5" },
  sy_5: { day: 5, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "她没说什么。只是把稿纸原样放回去，做了一桌我最爱吃的菜。比骂我还可怕。", next: "sy_6" },
  sy_6: { day: 5, time: "morning", bg: "library", speaker: "沈屿", text: "她爱你，只是用错了方式。", next: "sy_7" },
  sy_7: { day: 5, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "我知道。可那方式压了我十七年。小说写的是个优等生毕业前消失了。所有人都觉得她去了好大学，只有她自己知道，她去了很远的地方。", next: "sy_8" },
  sy_8: { day: 5, time: "morning", bg: "library", speaker: "沈屿", text: "你想给她一个结局吗？", next: "sy_9" },
  sy_9: { day: 5, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "我想。但我写不出。每次写到她消失那一刻，我的手就停了。最末一行：「她回过头，看见了自己从未活过的人生。」", next: "sy_minigame" },
  sy_minigame: {
    day: 5, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨",
    text: "……你愿不愿意替我写一句试试？就一句。写到这句之后，我就接着写。",
    minigame: "writing",
    scoreBonus: { affection: { shiyu: 3 } },
    next: "sy_choice_1"
  },
  sy_choice_1: {
    day: 5, time: "morning", bg: "library",
    choice: {
      prompt: "怎么回应她？",
      options: [
        { text: "那就让她回头之后，开始活下去。",   next: "sy_10_good",   add: { affection: { shiyu: 3 }, flag_sy_route: "good" } },
        { text: "也许她该先写完半章，再决定。",     next: "sy_10_normal", add: { affection: { shiyu: 2 }, flag_sy_route: "normal" } },
        { text: "也许她真的该消失一次。",           next: "sy_10_bad",    add: { flag_sy_route: "bad" } }
      ]
    }
  },

  /* —— GOOD —— */
  sy_10_good: { day: 6, time: "evening", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……活下去？原来可以这么写啊。让她回头，然后活下去。", next: "sy_11_good" },
  sy_11_good: { day: 7, time: "evening", bg: "library", char: "shiyu", speaker: "", text: "她连夜写完了。第二天清晨把稿子推给我，眼睛红着。", next: "sy_12_good" },
  sy_12_good: { day: 8, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "我投了校刊。用笔名。", next: "sy_13_good" },
  sy_13_good: { day: 9, time: "evening", bg: "cherry_full", char: "shiyu", speaker: "", text: "一个月后，校刊印出来了。封面上印着她的笔名。她把样书塞进我手里。", next: "sy_14_good", cg_unlock: "cg_shiyu_good" },
  sy_14_good: { day: 9, time: "evening", bg: "cherry_full", char: "shiyu", speaker: "林诗雨", text: "我妈看了。她哭了很久，然后说——再写一本。", next: "sy_15_good" },
  sy_15_good: { day: 9, time: "evening", bg: "cherry_full", char: "shiyu", speaker: "林诗雨", text: "扉页我写了：「献给外婆，也献给那个让我回头的人。」", next: "sy_ending_good" },
  sy_ending_good: {
    day: 9, time: "evening", bg: "ending_good", char: "shiyu", speaker: "",
    text: "那年樱花开尽之前，她把那本小说的样书塞进我手里。她终于敢回头，看见自己开始活下去。",
    ending: { id: "shiyu_good", type: "GOOD ENDING", title: "回 头", text: "她终于敢回头，看见自己开始活下去。" }
  },

  /* —— NORMAL —— */
  sy_10_normal: { day: 6, time: "evening", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……半章。", next: "sy_11_normal" },
  sy_11_normal: { day: 7, time: "morning", bg: "library", char: "shiyu", speaker: "", text: "她写了半章就停了。她说剩下的半章要留给外婆，也留给自己。", next: "sy_12_normal" },
  sy_12_normal: { day: 8, time: "evening", bg: "home_room", char: "shiyu", speaker: "林诗雨", text: "我没投校刊。我把稿子放进了外婆的旧书箱。我跟她说，等我考完法律系，再写下一章。", next: "sy_13_normal" },
  sy_13_normal: { day: 9, time: "evening", bg: "home_room", char: "shiyu", speaker: "林诗雨", text: "我妈昨天看了我抽屉里的半章稿。她什么都没说，只把稿纸抚平了。", next: "sy_14_normal" },
  sy_14_normal: { day: 9, time: "evening", bg: "home_room", char: "shiyu", speaker: "林诗雨", text: "沈屿，谢谢你让我写完半章。剩下的，我自己慢慢写。", next: "sy_ending_normal" },
  sy_ending_normal: {
    day: 9, time: "evening", bg: "ending_normal", char: "shiyu", speaker: "",
    text: "她留下了半章，也留下了自己。法律系她会去读，但她答应自己——业余继续写。",
    ending: { id: "shiyu_normal", type: "NORMAL ENDING", title: "半 章", text: "她留下了半章，也留下了自己。" }
  },

  /* —— BAD —— */
  sy_10_bad: { day: 6, time: "evening", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……消失一次。也对。也许她真的该消失一次。", next: "sy_11_bad" },
  sy_11_bad: { day: 7, time: "morning", bg: "rain", char: null, speaker: "", text: "一周后的雨天，林诗雨没有来上学。课桌上只留了一张便条：「转学了。谢谢你来图书馆。」", next: "sy_12_bad" },
  sy_12_bad: { day: 7, time: "morning", bg: "library", char: null, speaker: "", text: "抽屉里那一叠稿纸，最末一行永远停在那里：「她回过头，看见了自己从未活过的人生。」", next: "sy_ending_bad" },
  sy_ending_bad: {
    day: 7, time: "morning", bg: "ending_bad", char: null, speaker: "",
    text: "我再也没有见过她。听说她去了北方一座很远的城市，读了她不喜欢的法律系。",
    ending: { id: "shiyu_bad", type: "BAD ENDING", title: "未 活 过", text: "她回过头，看见的依然是没走过的人生。" }
  },

  /* ============ 夏织线 · 4 章 × 3 结局 ============ */
  route_xiazhi_1: { day: 5, time: "morning", bg: "field", char: "xiazhi", speaker: "", text: "周末的操场空旷。夏织一个人在跑道上，影子被太阳拉得很长。", next: "xz_2" },
  xz_2: { day: 5, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "你来啦？正好，帮我计个时。", next: "xz_3" },
  xz_3: { day: 5, time: "morning", bg: "field", speaker: "沈屿", text: "你一个人练？教练呢？", next: "xz_4" },
  xz_4: { day: 5, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "教练上周辞退我了。他说我发挥不稳定，浪费特招名额。", next: "xz_5" },
  xz_5: { day: 5, time: "morning", bg: "field", speaker: "沈屿", text: "那你还跑？", next: "xz_6" },
  xz_6: { day: 5, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "不跑我去哪？回那个家？我爸小时候带我练跑，摔过一次膝盖，旧伤。我妈再婚之后，那已经不是我的家了。", next: "xz_7", set: { flag_xiazhi_injury: true } },
  xz_7: { day: 5, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "我爸每月打钱过来，附带一句「最近怎么样」。我每次都回「挺好的」。", next: "xz_8" },
  xz_8: { day: 5, time: "morning", bg: "field", speaker: "", text: "她说着笑起来，眼睛却红了一圈。", next: "xz_9" },
  xz_9: { day: 5, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "全国赛下个月。我自己报名的，没教练。你愿意——陪我练到那天吗？", next: "xz_minigame" },
  xz_minigame: {
    day: 5, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织",
    text: "先陪我冲一组，看看我的节奏还在不在。",
    minigame: "running",
    scoreBonus: { affection: { xiazhi: 3 } },
    next: "xz_choice_1"
  },
  xz_choice_1: {
    day: 5, time: "morning", bg: "field",
    choice: {
      prompt: "怎么回答？",
      options: [
        { text: "我陪你。一直陪你到终点线。",         next: "xz_10_good",   add: { affection: { xiazhi: 3 }, flag_xz_route: "good" } },
        { text: "我帮你练，但要先去治脚。",           next: "xz_10_normal", add: { affection: { xiazhi: 2 }, flag_xz_route: "normal" } },
        { text: "你不需要别人陪，你自己就够了。",     next: "xz_10_bad",    add: { flag_xz_route: "bad" } }
      ]
    }
  },

  /* —— GOOD —— */
  xz_10_good: { day: 6, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……终点线啊。好。", next: "xz_11_good" },
  xz_11_good: { day: 7, time: "evening", bg: "summer", char: "xiazhi", speaker: "", text: "整整一个月，我们清晨练起跑，黄昏练冲刺。她左脚的旧伤我每天帮她敷冰。成绩一点点回来。", next: "xz_12_good" },
  xz_12_good: { day: 7, time: "evening", bg: "summer", char: "xiazhi", speaker: "夏织", text: "今天跑进了 11.8。沈屿——我没跑过这么快。", next: "xz_13_good" },
  xz_13_good: { day: 8, time: "morning", bg: "summer", char: "xiazhi", speaker: "夏织", text: "全国赛那天，你来当我的场外。我不需要教练，我需要你站在终点等我。", next: "xz_14_good" },
  xz_14_good: { day: 8, time: "morning", bg: "summer", char: "xiazhi", speaker: "", text: "发令枪响那一刻，她第一个冲出去。一百米，十一个对手，最后她以第二名撞线。", next: "xz_15_good", cg_unlock: "cg_xiazhi_good" },
  xz_15_good: { day: 8, time: "morning", bg: "ending_good", char: "xiazhi", speaker: "夏织", text: "——第二名。沈屿，第二名！", next: "xz_ending_good" },
  xz_ending_good: {
    day: 8, time: "morning", bg: "ending_good", char: "xiazhi", speaker: "",
    text: "她扑进我怀里，笑着哭。她说：「原来被人等在终点，是这种感觉。」",
    ending: { id: "xiazhi_good", type: "GOOD ENDING", title: "终 点 线", text: "她第一次相信，跑出去和有人等着，可以同时发生。" }
  },

  /* —— NORMAL —— */
  xz_10_normal: { day: 6, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……治脚？我懂。可我现在停不下来。", next: "xz_11_normal" },
  xz_11_normal: { day: 7, time: "evening", bg: "summer", char: "xiazhi", speaker: "", text: "她答应我去看了医生。旧伤，需要静养一个月。她还是偷偷练，但减量了。", next: "xz_12_normal" },
  xz_12_normal: { day: 8, time: "morning", bg: "summer", char: "xiazhi", speaker: "夏织", text: "全国赛我跑了第三。第三名。", next: "xz_13_normal" },
  xz_13_normal: { day: 8, time: "morning", bg: "summer", char: "xiazhi", speaker: "夏织", text: "没拿到特招名额。但教练说我可以明年再战，留校复读一年。", next: "xz_14_normal" },
  xz_14_normal: { day: 8, time: "morning", bg: "summer", char: "xiazhi", speaker: "夏织", text: "……沈屿，第三名也挺好的，对吧？明年我再跑一次。这次有人等我。", next: "xz_ending_normal" },
  xz_ending_normal: {
    day: 8, time: "morning", bg: "ending_normal", char: "xiazhi", speaker: "",
    text: "她拿了第三名，留校复读一年。脚伤好了。她说，明年再跑，有人等就够。",
    ending: { id: "xiazhi_normal", type: "NORMAL ENDING", title: "第三名", text: "她拿了第三，留了下来。" }
  },

  /* —— BAD —— */
  xz_10_bad: { day: 6, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……对。我自己就够了。", next: "xz_11_bad" },
  xz_11_bad: { day: 7, time: "morning", bg: "rain", char: "xiazhi", speaker: "", text: "全国赛前一周，她在雨里独自加练。我没去。听说她摔了一跤，膝盖磕在跑道沿上。", next: "xz_12_bad" },
  xz_12_bad: { day: 7, time: "morning", bg: "winter", char: null, speaker: "", text: "韧带拉伤。医生说至少半年不能跑。全国赛的名额转给了别人。", next: "xz_13_bad" },
  xz_13_bad: { day: 7, time: "morning", bg: "winter", char: null, speaker: "", text: "她在医院给我发了一条消息：「你说得对，我自己就够了。可惜我自己不够。」", next: "xz_ending_bad" },
  xz_ending_bad: {
    day: 7, time: "morning", bg: "ending_bad", char: null, speaker: "",
    text: "她休学了。听说是回了她爸那边。再后来，田径社的招新传单上，王牌那一栏空着。",
    ending: { id: "xiazhi_bad", type: "BAD ENDING", title: "一 个 人", text: "她终于一个人了。可一个人，从来不是她想要的。" }
  },

  /* ============ 苏念线 · 4 章 × 3 结局 ============ */
  route_sunian_1: { day: 5, time: "morning", bg: "art_room", char: "sunian", speaker: "", text: "周末的美术室，窗帘半拉着。苏念坐在地上，周围是揉成团的草稿。", next: "sn_2" },
  sn_2: { day: 5, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "你又来了。", next: "sn_3" },
  sn_3: { day: 5, time: "morning", bg: "art_room", speaker: "沈屿", text: "你说画不完。我来看看，是不是真的画不完。", next: "sn_4" },
  sn_4: { day: 5, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "省展邀请函上个月寄来。让我交一幅新作。我答应了，然后撕了四十七张草稿。每一张都差一点。差那一点，就不是我。", next: "sn_5" },
  sn_5: { day: 5, time: "morning", bg: "art_room", speaker: "沈屿", text: "什么是「你」？", next: "sn_6" },
  sn_6: { day: 5, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "我不知道。这就是问题。我画了三年，画到忘了自己本来想画什么。紫色是我哥哥最喜欢的颜色。我画它，是想留住他。", next: "sn_7" },
  sn_7: { day: 5, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "你看这幅——", next: "sn_8" },
  sn_8: { day: 5, time: "morning", bg: "art_room", speaker: "", text: "她把那张未完成的紫推到我面前。我第一次看清：那片紫里，藏着一只翅膀，半张脸，一只手。", next: "sn_9" },
  sn_9: { day: 5, time: "morning", bg: "art_room", speaker: "沈屿", text: "这不是一片紫。这是一个人想从紫里挣出来，但被你按住了。", next: "sn_minigame" },
  sn_minigame: {
    day: 5, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念",
    text: "……你既然看见了，那你帮我调一次色。紫色不止一种，找到对的那一种，她才肯出来。",
    minigame: "painting",
    scoreBonus: { affection: { sunian: 3 } },
    next: "sn_10"
  },
  sn_10: { day: 5, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……你看见了？", next: "sn_choice_1" },
  sn_choice_1: {
    day: 5, time: "morning", bg: "art_room",
    choice: {
      prompt: "怎么对她说？",
      options: [
        { text: "松手。让她出来。",             next: "sn_10_good",   add: { affection: { sunian: 3 }, flag_sn_route: "good" } },
        { text: "先在网络开个小展试试。",       next: "sn_10_normal", add: { affection: { sunian: 2 }, flag_sn_route: "normal" } },
        { text: "也许她本来就不该出来。",       next: "sn_10_bad",   add: { flag_sn_route: "bad" } }
      ]
    }
  },

  /* —— GOOD —— */
  sn_10_good: { day: 6, time: "evening", bg: "art_room", char: "sunian", speaker: "苏念", text: "松手……好。我试试。", next: "sn_11_good" },
  sn_11_good: { day: 7, time: "evening", bg: "autumn", char: "sunian", speaker: "", text: "接下来一个月，她每天画到深夜。我不打扰她，只在她画画时坐在角落看书。", next: "sn_12_good" },
  sn_12_good: { day: 8, time: "morning", bg: "autumn", char: "sunian", speaker: "苏念", text: "画完了。", next: "sn_13_good" },
  sn_13_good: { day: 8, time: "morning", bg: "autumn", char: "sunian", speaker: "", text: "画布上，一个人正从一片紫里挣出来，半身，眼神是亮的。她给它取名《挣》。", next: "sn_14_good", cg_unlock: "cg_sunian_good" },
  sn_14_good: { day: 8, time: "morning", bg: "ending_good", char: "sunian", speaker: "苏念", text: "省展那天，它被放在入口第一幅。沈屿——是你让它出来的。", next: "sn_ending_good" },
  sn_ending_good: {
    day: 8, time: "morning", bg: "ending_good", char: "sunian", speaker: "",
    text: "她在画旁站了很久，第一次没有撕掉自己的作品。她说：「原来被看见，是这种感觉。」",
    ending: { id: "sunian_good", type: "GOOD ENDING", title: "挣", text: "她终于松开了按住自己的那只手。" }
  },

  /* —— NORMAL —— */
  sn_10_normal: { day: 6, time: "evening", bg: "art_room", char: "sunian", speaker: "苏念", text: "……网展？小范围？", next: "sn_11_normal" },
  sn_11_normal: { day: 7, time: "evening", bg: "home_room", char: "sunian", speaker: "", text: "她没去省展。退回了邀请函。她在网上开了个小站，把卡了三年的草稿一张张放上去。", next: "sn_12_normal" },
  sn_12_normal: { day: 8, time: "morning", bg: "home_room", char: "sunian", speaker: "苏念", text: "今天有第一个人留言：「我也卡在草稿里三年。」", next: "sn_13_normal" },
  sn_13_normal: { day: 8, time: "morning", bg: "home_room", char: "sunian", speaker: "苏念", text: "……沈屿，原来不是我一个人。", next: "sn_ending_normal" },
  sn_ending_normal: {
    day: 8, time: "morning", bg: "ending_normal", char: "sunian", speaker: "",
    text: "她在自己的网展开了个展。没人说她是天才，但留言区每天都有人留言说：我也是这样。",
    ending: { id: "sunian_normal", type: "NORMAL ENDING", title: "网 展", text: "她在自己的网展开了个展。" }
  },

  /* —— BAD —— */
  sn_10_bad: { day: 6, time: "evening", bg: "art_room", char: "sunian", speaker: "苏念", text: "……不该出来。对。也许她本来就不该出来。", next: "sn_11_bad" },
  sn_11_bad: { day: 7, time: "morning", bg: "winter", char: null, speaker: "", text: "她把那张画布翻了过来，背面朝外。从此再没打开过那间美术室的门。", next: "sn_12_bad" },
  sn_12_bad: { day: 7, time: "morning", bg: "winter", char: null, speaker: "", text: "省展那天，她的位置是空的。主办方说，她打电话退出了。", next: "sn_13_bad" },
  sn_13_bad: { day: 7, time: "morning", bg: "ending_bad", char: null, speaker: "", text: "她休学了。美术室的钥匙交给了门卫。临走前她发了一条朋友圈：「天才卡在草稿里，原来是真的。」", next: "sn_ending_bad" },
  sn_ending_bad: {
    day: 7, time: "morning", bg: "ending_bad", char: null, speaker: "",
    text: "再没有人见过那张紫。它和它的主人，一起被按进了海里。",
    ending: { id: "sunian_bad", type: "BAD ENDING", title: "按 住", text: "她松不开自己的手，于是连自己也一起按了下去。" }
  },

  /* ============ 真结局入口（需合成"樱花信"才能打破循环） ============ */
  true_end_entry: {
    // 仅在三女主 GOOD 全通后触发
    bg: "cherry_full", char: null, speaker: "",
    text: "（三段回望结束。窗台上的最后一封信，今天还没拆。）",
    next: "true_2"
  },
  true_2: { bg: "home_room", char: null, speaker: "", text: "我打开最后一封匿名信。这一次，署名了。", next: "true_3", keyword: "学姐" },
  true_3: { bg: "home_room", char: "senior", speaker: "学姐", text: "——三年前，我也是转学生。我三条路都走了一半，最后休了学。我以为我会回来，结果没回。", next: "true_4" },
  true_4: { bg: "home_room", char: "senior", speaker: "学姐", text: "我留信给你，是想看看，有没有人能走得比我远。你做到了。三个人，你都让他们敢了。", next: "true_5" },
  true_5: { bg: "home_room", char: "senior", speaker: "学姐", text: "今晚是樱花祭。请你替我回最后一封信。也写给自己——你想成为什么样的人。", next: "true_choice" },
  true_choice: {
    bg: "cherry_full",
    choice: {
      prompt: "你的回信——你想成为什么样的人？",
      options: [
        { text: "一个敢走进别人人生的人。",   next: "true_6" },
        { text: "一个敢写下自己的人。",       next: "true_6" },
        { text: "一个敢回头看的人。",         next: "true_6" },
      ],
      // 循环解锁的隐藏选项：必须合成"樱花信"才能打破循环
      loopChoice: [
        {
          minLoop: 1,
          text: "★ 「樱花信」—— 把祭信与未寄信合在一起 ★",
          next: "true_break_loop",
          requires_compose: "樱花信",
          composed: true,
        }
      ]
    }
  },
  // 普通选项路径：循环未打破
  true_6: { bg: "festival", char: "shen", speaker: "", text: "樱花祭之夜。我在樱花树下，写下回信。然后，我写下自己人生的第一行字。", next: "true_7", cg_unlock: "cg_true", keyword: "回信" },
  true_7: { bg: "festival", chars: [{id:"shiyu", pos:"left"}, {id:"xiazhi", pos:"center"}, {id:"sunian", pos:"right"}], speaker: "林诗雨", text: "沈屿——你的信，我们替你转交了。", next: "true_8" },
  true_8: { bg: "festival", char: "xiazhi", speaker: "夏织", text: "学姐说她收到了。她说她终于能往前走了。", next: "true_9" },
  true_9: { bg: "festival", char: "sunian", speaker: "苏念", text: "……你也终于写下自己了。", next: "true_ending" },
  true_ending: {
    bg: "ending_true", char: null, speaker: "",
    text: "那年樱花祭之夜，我替学姐回了一封信，也写下自己人生的第一行字。三条路从来不是三条。它们是同一条——只要你敢走完它。",
    ending: { id: "true_end", type: "TRUE ENDING", title: "樱 花 信", text: "你替她回了一封信，也写下自己。" }
  },

  /* ============ 打破循环路径（合成"樱花信"后解锁） ============ */
  true_break_loop: {
    bg: "cherry_full", char: "senior", speaker: "学姐",
    text: "——你做到了。你把祭信与未寄信合在了一起。这封信，我等了三年。",
    next: "true_break_2",
    memory: { id: "打破循环", title: "樱花信", text: "把祭信与未寄信合在一起，就是打破循环的钥匙。" }
  },
  true_break_2: { bg: "cherry_full", char: "senior", speaker: "学姐", text: "三年前我也想合成这封信，可我那时候还不知道「未寄信」也是写给自己。你比我有勇气。", next: "true_break_3" },
  true_break_3: { bg: "cherry_full", char: "senior", speaker: "学姐", text: "去吧。今晚樱花祭，你替我回信，也替自己写下第一行。这一次——不会再回来了。", next: "true_break_4" },
  // 真实书写信件：玩家自己打字写信
  true_break_4: {
    bg: "festival", char: "shen", speaker: "",
    text: "樱花树下，我把纸铺开。这一次，不是抄，不是选。是我自己写。",
    letter: {
      id: "true_letter_free",
      type: "free",
      prompt: "✦ 替学姐回信，也写给自己",
      hint: "写下你想对三年前的学姐，或者三年后的自己说的话…",
      matchings: [
        { id: "勇敢", keywords: ["敢", "勇气", "走", "回头", "写下"], next: "true_break_5a", memory: "写信-勇敢" },
        { id: "放手", keywords: ["放", "松", "不用", "算了", "没关系"], next: "true_break_5b", memory: "写信-放手" },
        { id: "想念", keywords: ["想", "念", "记得", "樱花", "春"], next: "true_break_5c", memory: "写信-想念" },
      ],
      defaultReply: { next: "true_break_5d", memory: "写信-默认" }
    },
    next: "true_break_5d"
  },
  true_break_5a: { bg: "festival", char: "senior", speaker: "学姐", text: "「敢」——你写的第一个字是敢。我也想敢一次。今天起，我替自己敢。", next: "true_break_6" },
  true_break_5b: { bg: "festival", char: "senior", speaker: "学姐", text: "「放」——你说得对。我也可以放下。放下这三年，放下那个没敢回信的自己。", next: "true_break_6" },
  true_break_5c: { bg: "festival", char: "senior", speaker: "学姐", text: "「想念」——你说你想念。我也想念。可想念不该是停下的理由。", next: "true_break_6" },
  true_break_5d: { bg: "festival", char: "senior", speaker: "学姐", text: "——你的信，我读完了。每个字都不一样，可每个字都通向同一个地方。", next: "true_break_6" },
  true_break_6: { bg: "festival", chars: [{id:"shiyu", pos:"left"}, {id:"xiazhi", pos:"center"}, {id:"sunian", pos:"right"}], speaker: "林诗雨", text: "沈屿——你的信，我们替你转交了。", next: "true_break_7", cg_unlock: "cg_true" },
  true_break_7: { bg: "festival", char: "xiazhi", speaker: "夏织", text: "学姐说她收到了。她说她终于能往前走了。", next: "true_break_8" },
  true_break_8: { bg: "festival", char: "sunian", speaker: "苏念", text: "……你也终于写下自己了。这一次，是真的写下了。", next: "true_break_ending" },
  true_break_ending: {
    bg: "ending_true", char: null, speaker: "",
    text: "那年樱花祭之夜，我替学姐回了一封信，也写下自己人生的第一行字。三条路从来不是三条。它们是同一条——只要你敢走完它。这一次，樱花不会再倒着飘了。",
    ending: { id: "true_end", type: "TRUE ENDING", title: "樱 花 信 · 破 环", text: "你合成了樱花信，打破了时间的循环。" }
  },
};

/* ============ 入口节点 ============ */
const START_NODE = "prologue_1";

/* ============ 真结局解锁判定 ============ */
function isTrueEndUnlocked() {
  return Saves.isEndingUnlocked("shiyu_good")
      && Saves.isEndingUnlocked("xiazhi_good")
      && Saves.isEndingUnlocked("sunian_good");
}
