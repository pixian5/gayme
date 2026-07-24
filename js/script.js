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

/* ============ v0.5.0 朋友圈动态池 ============ */
const MOMENTS = [
  {
    id: "m_d1_shiyu", char: "shiyu", likes: 3,
    text: "今天的樱花，从教室看出去像一片云。\n我想我应该再多走一段路。",
    likeAffection: { affection: { shiyu: 1 } },
    comments: [
      { text: "加油。", value: "c1", add: { affection: { shiyu: 1 } }, personality: { brave: 1 } },
      { text: "你不写也没关系。", value: "c2", add: { affection: { shiyu: 2 } }, personality: { kind: 1 } },
      { text: "（只看不评）", value: "c3" },
    ],
  },
  {
    id: "m_d2_xiazhi", char: "xiazhi", likes: 7,
    text: "今天又被训了。\n但我知道自己在跑什么。这就够了。",
    likeAffection: { affection: { xiazhi: 1 } },
    comments: [
      { text: "别太拼。", value: "c1", add: { affection: { xiazhi: 1 } }, personality: { kind: 1 } },
      { text: "跑下去。", value: "c2", add: { affection: { xiazhi: 1 } }, personality: { brave: 1, active: 1 } },
    ],
  },
  {
    id: "m_d2_sunian", char: "sunian", likes: 1,
    text: "紫色。\n又是紫色。\n我什么都没画出来。",
    likeAffection: { affection: { sunian: 1 } },
    comments: [
      { text: "那就歇会儿。", value: "c1", add: { affection: { sunian: 1 } }, personality: { kind: 1 } },
      { text: "再画一笔试试。", value: "c2", add: { affection: { sunian: 1 } }, personality: { active: 1 } },
      { text: "紫色也是颜色。", value: "c3", add: { affection: { sunian: 2 } }, personality: { honest: 1 } },
    ],
  },
  {
    id: "m_d3_group", char: "xiazhi", likes: 12,
    text: "今天林诗雨和苏念跑来接我。\n我笑了一下，没让人看出来眼睛红了。\n谢谢你们。",
    likeAffection: { affection: { xiazhi: 1, shiyu: 1, sunian: 1 } },
    comments: [
      { text: "我们都在。", value: "c1", add: { affection: { xiazhi: 1 } }, personality: { kind: 2, honest: 1 } },
      { text: "你才是。", value: "c2", add: { affection: { xiazhi: 1 } }, personality: { honest: 1 } },
    ],
  },
  {
    id: "m_d4_shiyu", char: "shiyu", likes: 5,
    text: "今天他来帮我排剧本。\n他不知道，那一页的开场白我写了三遍。\n他没看见，我也没让他看见。",
    likeAffection: { affection: { shiyu: 1 } },
    comments: [
      { text: "我看见了。", value: "c1", add: { affection: { shiyu: 2 } }, personality: { honest: 2 } },
      { text: "写得真好。", value: "c2", add: { affection: { shiyu: 1 } }, personality: { kind: 1 } },
    ],
  },
  {
    id: "m_d5_sunian", char: "sunian", likes: 2,
    text: "画坏了。\n但好像，画坏的那一刻我才知道我想画什么。",
    likeAffection: { affection: { sunian: 1 } },
    comments: [
      { text: "那就重画。", value: "c1", add: { affection: { sunian: 1 } }, personality: { brave: 1, active: 1 } },
      { text: "坏也是好。", value: "c2", add: { affection: { sunian: 2 } }, personality: { honest: 1 } },
    ],
  },
];
window.MOMENTS = MOMENTS;

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
    },
    // v0.5.0 环境线索：走廊里有可探索的细节
    clues: [
      {
        id: "clue_map", x: 62, y: 38, w: 12, h: 22,
        title: "地图边角",
        text: "她递的校园地图边角有被反复涂改的痕迹。「角色 A 推开门——」这行字被划掉了三次，又写了回来。",
        keyword: "角色A",
        memory: { id: "诗雨·地图", title: "涂改的地图", text: "她在地图上写了又划，划了又写。原来她和我一样，也在犹豫。" },
        personality: { honest: 1 }
      },
      {
        id: "clue_window", x: 18, y: 55, w: 10, h: 18,
        title: "窗外樱花",
        text: "走廊窗户开着，樱花瓣落在地上。一片粉瓣贴在她鞋尖，她没察觉。",
        personality: { kind: 1 }
      }
    ]
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
  d2_library_8: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "因为……不写的话，我会忘掉自己是谁。这本小说，是写给我外婆的。她去年走了，是个作家。", next: "d2_library_doodle", set: { flag_shiyu_secret: true, flag_shiyu_grandma: true } },
  d2_library_doodle: {
    day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨",
    text: "……你既然看到了，能不能帮我画一句开场？我画不出角色 A 推开门的样子。你随便涂一下，让我看见她。",
    next: "d2_library_9",
    // v0.5.0 涂鸦系统
    doodle: {
      prompt: "帮林诗雨画一句开场（涂鸦一笔，让她看见角色 A）",
      moodBonus: {
        "激动": { affection: { shiyu: 2 } },
        "平静": { affection: { shiyu: 1 } },
        "紧张": { affection: { shiyu: 1 } },
        "用力": { affection: { shiyu: 1 } },
        "克制": { affection: { shiyu: 0 } }
      },
      moodJump: {
        "激动": "d2_library_encourage",
        "平静": "d2_library_calm"
      }
    }
  },
  // 涂鸦后的两个分支汇合回主线
  d2_library_encourage: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……这一笔这么用力。原来推开门也可以是这种姿势。", next: "d2_library_9", memory: { id: "诗雨·开场", title: "推门一笔", text: "你画的那一笔，她照着写下了开场。" }, echoSave: { id: "echo_brave", text: "敢", ctx: "图书馆·帮林诗雨画开场" } },
  d2_library_calm: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……很安静的一笔。原来她推开门时也可以不害怕。", next: "d2_library_9", memory: { id: "诗雨·开场", title: "推门一笔", text: "你画的那一笔很安静，她跟着写下了开场。" } },
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

  d2_noon: {
    day: 2, time: "noon", bg: "cafeteria", char: null, speaker: "",
    text: "中午。食堂人多得像沙丁鱼罐头。我端着托盘找不到位置——",
    next: "d2_noon_2",
    // v0.5.0 收件箱：林诗雨的私信
    inbox: {
      id: "msg_shiyu_d2",
      char: "shiyu",
      from: "林诗雨",
      title: "关于小说",
      body: "你说「角色 A 推开门」——如果她推开门后什么都没有呢？我卡在这里了。给我一点建议，30秒内回我。",
      deadline: 30000,
      type: "free",
      hint: "写下你的建议…",
      matchings: [
        { id: "brave", keywords: ["敢", "勇气", "试试", "走", "推"], add: { affection: { shiyu: 2 } }, personality: { brave: 2 }, memory: { id: "诗雨·敢", text: "你说：敢。她记下了。" } },
        { id: "calm",  keywords: ["停", "等", "慢慢", "别急"], add: { affection: { shiyu: 1 } }, personality: { kind: 2 }, memory: { id: "诗雨·停", text: "你说：停一停。她沉默了。" } },
      ]
    },
    // v0.5.0 朋友圈：夏织发布动态
    moment: "m_d2_xiazhi"
  },
  d2_noon_2: { day: 2, time: "noon", bg: "cafeteria", chars: [{id:"xiazhi", pos:"left"}, {id:"shiyu", pos:"right"}], speaker: "夏织", text: "这儿这儿！转学生，坐我跟班长中间！", next: "d2_noon_3" },
  d2_noon_3: { day: 2, time: "noon", bg: "cafeteria", char: null, speaker: "", text: "夏织和林诗雨居然坐在一起。一个像太阳，一个像月亮，气场却并不冲突。", next: "d2_noon_4" },
  d2_noon_4: { day: 2, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "夏织，运动会报名表你交了没？", next: "d2_noon_5" },
  d2_noon_5: { day: 2, time: "noon", bg: "cafeteria", char: "xiazhi", speaker: "夏织", text: "交了交了。女子 100 米、4×100 接力。诗雨你呢？", next: "d2_noon_6" },
  d2_noon_6: { day: 2, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "我只报了 1500 米。走个过场。", next: "d2_noon_7" },
  d2_noon_7: { day: 2, time: "noon", bg: "cafeteria", speaker: "沈屿", text: "苏念呢？", next: "d2_noon_8" },
  d2_noon_8: { day: 2, time: "noon", bg: "cafeteria", char: "xiazhi", speaker: "夏织", text: "苏念？她运动会从来都请假。美术社那帮人跟我们不是一个次元。", next: "d2_noon_9" },
  d2_noon_9: { day: 2, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "……她其实来过。去年看了一会儿就走了，没报名。", next: "d2_noon_10" },
  d2_noon_10: { day: 2, time: "noon", bg: "cafeteria", speaker: "", text: "我注意到她们说苏念时，眼神都温和了一些。原来三个人之间，是有故事的。", next: "d2_evening" },
  d2_evening: { day: 2, time: "evening", bg: "home_room", char: null, speaker: "", text: "晚上回宿舍。匿名信的事还压在心里。我决定先把信收好，明天再想。临睡前做了个奇怪的梦——", next: "d2_dreamweave" },

  /* ============ v0.8.0 梦境编织 ============ */
  d2_dreamweave: {
    day: 2, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "——梦里出现了几个碎片，按某种顺序拼起来，会变成一个完整的故事。",
    next: "d3_tarot",
    dreamweave: {
      prompt: "把梦境碎片按你的直觉拼接——",
      min: 2,
      fragments: [
        { id: "corridor", label: "走廊",     desc: "一条很长的走廊，尽头有人在回头。", color: "#a8c5e8" },
        { id: "letter",   label: "信",       desc: "一封信飘在风里，写不下收信人。",     color: "#d87090" },
        { id: "cherry",   label: "樱花",     desc: "花瓣落下来，盖住了字迹。",         color: "#ffb8c8" },
        { id: "voice",    label: "声音",     desc: "有人在喊一个名字，听不清是谁。",     color: "#c8a8e0" }
      ],
      interpretations: [
        { seq: ["corridor","letter","cherry","voice"], tag: "full_recall",
          label: "——完整的梦",
          text: "走廊尽头那人回头，是学姐。她手里那封信被风吹起，樱花盖住字迹，她在喊——你的名字。",
          add: { affection: { shiyu: 1 } }, personality: { honest: 1, brave: 1 },
          memory: { id: "梦境·完整", title: "夜里的完整梦", text: "你拼出了完整的梦：学姐、信、樱花、名字。" },
          next: "d3_tarot" },
        { seq: ["letter","cherry"], tag: "partial_letter",
          label: "——半截的梦",
          text: "信和樱花叠在一起。其他碎片散开，没有拼上。梦不完整，但有一些画面留了下来。",
          add: { affection: { shiyu: 0 } },
          memory: { id: "梦境·半截", title: "夜里的半截梦", text: "你只拼出了半截梦。其他部分散开了。" },
          next: "d3_tarot" }
      ],
      fallback: { tag: "scattered", label: "——散碎的梦",
        text: "碎片散开，没有拼成完整的形状。但你记住了其中一两个画面。",
        next: "d3_tarot" }
    }
  },

  /* ============ v0.8.0 占卜抽牌 ============ */
  d3_tarot: {
    day: 3, time: "morning", bg: "hallway", char: "senior", speaker: "学姐",
    text: "——早上走廊没人，学姐突然出现，手里捧着一副牌。「同学，要不要试试？今天的运势很特别。」她笑得眼睛弯弯的。",
    next: "d3_spectrum",
    tarot: {
      prompt: "学姐翻开牌阵——抽三张：过去 / 现在 / 未来",
      positions: ["过去", "现在", "未来"],
      deck: [
        { id: "cherry_bloom", name: "樱花·盛",  upright: "新生与相遇",     reversed: "将散而未散" },
        { id: "letter_blank", name: "空白信",   upright: "未说出口的话",   reversed: "已经迟了" },
        { id: "field_run",    name: "跑道",     upright: "向前奔跑",       reversed: "原地打转" },
        { id: "purple_paint", name: "紫色画",   upright: "挣出自我",       reversed: "被困住" },
        { id: "moon_hidden",  name: "隐月",     upright: "沉默的真相",     reversed: "被遮蔽的光" }
      ],
      combos: [
        { ids: ["cherry_bloom","letter_blank","moon_hidden"], tag: "trio_truth",
          label: "——真相之牌",
          text: "过去盛开，现在空白，未来被遮蔽。学姐看了很久，说：「你最近在追一封信。追到了，反而最难回。」",
          add: { affection: { shiyu: 1 } }, personality: { honest: 2 },
          memory: { id: "占卜·真相", title: "三张真相", text: "学姐翻出三张牌，说追到了反而最难回。" },
          next: "d3_spectrum" },
        { ids: ["field_run","purple_paint"], tag: "duo_break",
          label: "——挣脱之牌",
          text: "跑道与紫画一起出现——两个都想挣出去的人。学姐说：「你身边有人正在挣。你看见了她吗？」",
          add: { affection: { xiazhi: 1, sunian: 1 } }, personality: { brave: 1 },
          memory: { id: "占卜·挣", title: "两个挣的人", text: "学姐翻出跑道与紫画，说身边有人正在挣。" },
          next: "d3_spectrum" },
        { ids: ["cherry_bloom"], tag: "solo_bloom",
          label: "——只一张盛开",
          text: "只有樱花一张清晰。学姐说：「现在是开的时候。别的，先不管。」",
          add: { affection: { shiyu: 1 } },
          next: "d3_spectrum" }
      ],
      fallback: { tag: "default", label: "——牌阵无言",
        text: "三张牌没有特别的组合。学姐笑笑：「牌不肯说话，今天就这样吧。」",
        next: "d3_spectrum" }
    }
  },

  /* ============ v0.8.0 情绪光谱 ============ */
  d3_spectrum: {
    day: 3, time: "morning", bg: "classroom", char: null, speaker: "",
    text: "——走进教室。班主任还没到。同学们在闹。我坐下，发现自己还没从梦和占卜里走出来。此刻——心在哪里？",
    next: "common_day3_morning",
    spectrum: {
      prompt: "此刻你的心，在哪？点击/拖动平面选择位置。",
      quadrants: {
        q_tr: { tag: "joy_active", label: "愉悦·激昂",
          add: { affection: { xiazhi: 1 } }, personality: { kind: 1, active: 2 },
          memory: { id: "光谱·愉激", title: "早上的愉激", text: "早上你的心在愉激象限。同学看你眼睛亮了一下。" },
          next: "common_day3_morning" },
        q_br: { tag: "joy_calm", label: "愉悦·平静",
          add: { affection: { shiyu: 1 } }, personality: { kind: 1 },
          memory: { id: "光谱·愉静", title: "早上的愉静", text: "早上你的心在愉静象限。林诗雨说，你看上去很稳。" },
          next: "common_day3_morning" },
        q_tl: { tag: "sad_active", label: "不悦·激昂",
          add: { affection: { sunian: 1 } }, personality: { brave: 1, honest: -1 },
          memory: { id: "光谱·不激", title: "早上的不激", text: "早上你的心在不悦激昂象限。你差点和同学吵起来。" },
          next: "common_day3_morning" },
        q_bl: { tag: "sad_calm", label: "不悦·平静",
          add: { affection: { shiyu: 0 } }, personality: { honest: 1 },
          memory: { id: "光谱·不静", title: "早上的不静", text: "早上你的心在不悦平静象限。你谁也不想理。" },
          next: "common_day3_morning" }
      },
      fallback: { tag: "center", next: "common_day3_morning" }
    }
  },

  /* 在 letter_2 之前插入笔迹选择，让写信时选笔迹 */
  letter_2_pre: {
    day: 4, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "——回信前，我拿起笔。笔尖悬在纸上。该怎么写？",
    next: "letter_2",
    handwriting: {
      prompt: "选一种笔迹——这会影响她读信时的感觉。",
      next: "letter_2",
      styles: [
        { id: "neat", label: "工整",
          desc: "一笔一划，端正清楚。",
          preview: "「我 想 了 很 久。」",
          add: { affection: { shiyu: 1 } }, personality: { honest: 2 },
          memory: { id: "笔迹·工整", title: "工整的回信", text: "你用工整的笔迹写了回信。她读得出你的认真。" },
          next: "letter_2" },
        { id: "hurried", label: "潦草",
          desc: "急促、连笔，像怕被自己看见。",
          preview: "「我想了很久——」",
          add: { affection: { shiyu: 0 } }, personality: { brave: 1 },
          memory: { id: "笔迹·潦草", title: "潦草的回信", text: "你用潦草的笔迹写了回信。她读得出你的急。" },
          next: "letter_2" },
        { id: "hesitant", label: "迟疑",
          desc: "笔尖反复停顿，墨点洇开。",
          preview: "「我……想了……很久。」",
          add: { affection: { shiyu: 0 } }, personality: { kind: 1 },
          memory: { id: "笔迹·迟疑", title: "迟疑的回信", text: "你用迟疑的笔迹写了回信。她读得出你的犹豫。" },
          next: "letter_2" }
      ]
    }
  },

  /* ============ 第 3 日 · 运动会预选 ============ */
  common_day3_morning: { day: 3, time: "morning", bg: "classroom", speaker: "班主任", text: "运动会预选今天下午开始。各项目负责人课间到体育组抽签。", next: "d3_choice" },

  /* ============ v0.9.0 星座连线 ============ */
  d1_night_stars: {
    day: 1, time: "night", bg: "rooftop", char: "shiyu", speaker: "林诗雨",
    text: "——晚上天台。风很轻。林诗雨指着头顶：「你看，那几颗连起来，像不像一封信？」",
    next: "common_day2_morning",
    constellation: {
      prompt: "夜空散布星点——按你的直觉连成一个图案",
      min: 3,
      stars: [
        { id: "north_star", x: 50, y: 12, name: "北辰" },
        { id: "letter_a",   x: 28, y: 30, name: "信·起笔" },
        { id: "letter_b",  x: 72, y: 32, name: "信·落笔" },
        { id: "cherry_a",  x: 20, y: 60, name: "樱·左瓣" },
        { id: "cherry_b",  x: 80, y: 62, name: "樱·右瓣" },
        { id: "heart",     x: 50, y: 78, name: "心" }
      ],
      constellations: [
        { stars: ["letter_a","north_star","letter_b","cherry_b","heart","cherry_a"], tag: "full_letter",
          label: "——一封寄给夜空的信",
          text: "星点连成信的形状，从起笔到落笔，最后收在心。林诗雨看了很久，说：「原来连星星都会写信。」",
          add: { affection: { shiyu: 2 } }, personality: { honest: 2, kind: 1 },
          memory: { id: "星座·信", title: "夜空里的信", text: "你连出寄给夜空的信。林诗雨说连星星都会写信。" },
          next: "common_day2_morning" },
        { stars: ["cherry_a","heart","cherry_b"], tag: "cherry_heart",
          label: "——樱花落在心上",
          text: "三颗星连成樱花包着一颗心。林诗雨轻声说：「樱花和心——你把它们连在一起了。」",
          add: { affection: { shiyu: 1 } }, personality: { kind: 2 },
          memory: { id: "星座·樱心", title: "樱花与心", text: "你连出樱花包着心。林诗雨轻声说，你把它们连在一起了。" },
          next: "common_day2_morning" },
        { stars: ["letter_a","north_star","letter_b"], tag: "letter_only",
          label: "——只有信的形状",
          text: "三颗星连成信的轮廓，没有收信人。林诗雨说：「写了，但没寄出去——也行。」",
          add: { affection: { shiyu: 0 } }, personality: { honest: 1 },
          next: "common_day2_morning" }
      ],
      fallback: { tag: "scattered_stars", label: "——散落的星",
        text: "星点连不成特别的形状。林诗雨抬头看了很久，说：「没关系，今晚的星，本来就乱。」",
        next: "common_day2_morning" }
    }
  },

  /* ============ v0.9.0 心声听诊 ============ */
  d3_stethoscope: {
    day: 3, time: "noon", bg: "field", char: "xiazhi", speaker: "夏织",
    text: "——运动会预选后，夏织跑完最后一圈，坐在草地上喘气。她忽然把你的手按在自己胸口：「你听——它还在跳。」",
    next: "common_day3_afternoon",
    stethoscope: {
      prompt: "把心跳贴在掌心——跟随她的节拍点击同步",
      bpm: 90, beats: 10, window: 0.35,
      thresholds: [
        { min: 0.8, tag: "sync", label: "——同频的心跳",
          text: "你跟上了她几乎每一拍。夏织抬头，眼睛亮亮的：「你居然——跟得上我跑完之后的心跳。」",
          add: { affection: { xiazhi: 2 } }, personality: { active: 2, kind: 1 },
          memory: { id: "心跳·同频", title: "跑完之后的心跳", text: "你跟上了夏织跑完之后的心跳。她说你居然跟得上。" },
          next: "common_day3_afternoon" },
        { min: 0.5, tag: "half", label: "——半同步",
          text: "你跟上了一半。夏织笑笑：「差不多——能跟上一半就够啦。」",
          add: { affection: { xiazhi: 1 } }, personality: { active: 1 },
          next: "common_day3_afternoon" }
      ],
      fallback: { tag: "miss", label: "——错拍",
        text: "你没能跟上她的心跳。夏织没说什么，只是把你的手松开：「算了，下次再试。」",
        next: "common_day3_afternoon" }
    }
  },

  /* ============ v0.9.0 信物拼图 ============ */
  d4_puzzle: {
    day: 4, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "——夜里整理书包，那张被撕碎的匿名信散了一桌。我想把它拼回来——但它怎么拼，好像都不止一种答案。",
    next: "d4_evening_scent",
    puzzle: {
      prompt: "把碎片按你的记忆拼起来——",
      min: 4,
      pieces: [
        { id: "shred_1", label: "碎片·樱", desc: "写着半个「樱」字。" },
        { id: "shred_2", label: "碎片·信", desc: "写着半个「信」字。" },
        { id: "shred_3", label: "碎片·名", desc: "写着半个「名」字，看不清是谁。" },
        { id: "shred_4", label: "碎片·夜", desc: "写着半个「夜」字。" },
        { id: "shred_5", label: "碎片·空", desc: "一片空白，被撕得很碎。" }
      ],
      interpretations: [
        { order: ["shred_1","shred_2","shred_3","shred_4"], tag: "letter_named",
          label: "——樱信·夜名",
          text: "拼起来是「樱信·夜名」。一封夜里写的、署名樱的信。我盯着那个「名」——那不是我的名字，是学姐的。",
          add: { affection: { shiyu: 0 } }, personality: { honest: 2, brave: 1 },
          memory: { id: "拼图·樱信", title: "署名樱的信", text: "你拼出「樱信·夜名」——一封夜里写的、署名樱的信。" },
          next: "d4_evening_scent" },
        { order: ["shred_1","shred_2","shred_5","shred_3"], tag: "letter_blank",
          label: "——樱信·无名",
          text: "拼起来是「樱信·无名」。一封樱的信，但没有署名。也许——她本来就没打算让人知道是她。",
          add: { affection: { shiyu: 0 } }, personality: { kind: 1, honest: 1 },
          memory: { id: "拼图·无名", title: "没有署名的樱信", text: "你拼出「樱信·无名」——一封没有署名的樱信。" },
          next: "d4_evening_scent" },
        { order: ["shred_4","shred_1","shred_2","shred_3"], tag: "night_letter",
          label: "——夜樱信名",
          text: "换个顺序读，是「夜樱·信名」。夜里的樱，信的名字。我忽然想——也许名字不是署名，是收信人。",
          add: { affection: { shiyu: 0 } }, personality: { honest: 1 },
          next: "d4_evening_scent" }
      ],
      fallback: { tag: "scattered", label: "——拼不成形",
        text: "碎片拼不起来。我叹了口气，把那张空白碎片收好——也许有些信，本来就不该被拼回来。",
        next: "d4_evening_scent" }
    }
  },

  /* ============ v0.9.0 气味调香 ============ */
  d5_perfume: {
    day: 5, time: "noon", bg: "art_room", char: "sunian", speaker: "苏念",
    text: "——苏念在美术室调一瓶香水。她说是给画用的——让画有气味。「你来调，我手抖。」她把瓶子推过来。",
    next: "common_day5_afternoon",
    perfume: {
      prompt: "用前调/中调/后调调一瓶香水——",
      notes: ["前调", "中调", "后调"],
      ingredients: [
        { id: "cherry_blossom", label: "樱花",   note: "前调", desc: "甜而轻，最先散去。" },
        { id: "lemon_zest",     label: "柠檬皮", note: "前调", desc: "酸而亮，刺一下。" },
        { id: "old_paper",      label: "旧纸",   note: "中调", desc: "泛黄稿纸的味道。" },
        { id: "ink",            label: "墨水",   note: "中调", desc: "蓝黑色的金属气。" },
        { id: "dusk_wood",      label: "暮木",   note: "后调", desc: "沉，像旧校舍的楼梯。" },
        { id: "rain_warm",      label: "暖雨",   note: "后调", desc: "夏日雨后的潮热。" }
      ],
      recipes: [
        { ids: ["cherry_blossom","old_paper","dusk_wood"], tag: "sakura_letter",
          label: "——樱时信笺",
          text: "樱花、旧纸、暮木。一瓶樱时信笺。苏念闻了闻：「……像一封写给黄昏的信。」她说这就是她要的。",
          add: { affection: { sunian: 2 } }, personality: { kind: 2, honest: 1 },
          memory: { id: "调香·樱时", title: "樱时信笺", text: "你调出樱时信笺。苏念说像一封写给黄昏的信。" },
          next: "common_day5_afternoon" },
        { ids: ["lemon_zest","ink","rain_warm"], tag: "summer_ink",
          label: "——夏墨暖雨",
          text: "柠檬、墨水、暖雨。一瓶夏天的墨水。苏念皱眉：「太冲——但也对。」她说这就是夏织的味道。",
          add: { affection: { xiazhi: 1, sunian: 1 } }, personality: { active: 2 },
          memory: { id: "调香·夏墨", title: "夏墨暖雨", text: "你调出夏墨暖雨。苏念说这就是夏织的味道。" },
          next: "common_day5_afternoon" },
        { ids: ["cherry_blossom","ink","dusk_wood"], tag: "quiet_dusk",
          label: "——静暮",
          text: "樱花、墨水、暮木。一瓶很静的香水。苏念没说话，把瓶盖拧紧：「这瓶先收着。」",
          add: { affection: { shiyu: 1, sunian: 1 } }, personality: { kind: 1, honest: 1 },
          memory: { id: "调香·静暮", title: "静暮", text: "你调出很静的香水。苏念说先收着。" },
          next: "common_day5_afternoon" }
      ],
      fallback: { tag: "default_scent", label: "——不成香",
        text: "三种气味凑在一起，没成什么特别的香。苏念笑笑：「也行——一瓶普通的香水。」",
        next: "common_day5_afternoon" }
    }
  },
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
  d3_evening: {
    day: 3, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "回宿舍。我打开抽屉，匿名信旁边又多了一封。我忽然想起白天画在林诗雨稿纸上的那一笔——一个字，从指尖跑了出去。",
    next: "letter_1",
    // v0.6.0 回声：玩家画过的"敢"在夜里复现
    echo: {
      id: "echo_brave",
      text: "敢",
      ctx: "图书馆·帮林诗雨画开场",
      choices: [
        { text: "承认：是我说的。", value: "admit",
          add: { affection: { shiyu: 2 } }, personality: { brave: 2, honest: 2 },
          memory: { id: "回声·敢", title: "夜里承认", text: "夜里我承认了——是我写的「敢」。她没说，但她听见了。" },
          next: "letter_1" },
        { text: "否认：那不是我说的。", value: "deny",
          add: { affection: { shiyu: -1 } }, personality: { honest: -2 },
          memory: { id: "回声·敢", title: "夜里否认", text: "夜里我否认了。但那个字，确实是我写的。" },
          next: "letter_1" },
        { text: "沉默：不回答。", value: "silent",
          add: { affection: { shiyu: 0 } }, personality: { kind: 1 },
          memory: { id: "回声·敢", title: "夜里沉默", text: "夜里我沉默了。沉默也是一种回答。" },
          next: "letter_1" },
      ]
    }
  },

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
  letter_1_after: { day: 3, time: "evening", bg: "home_room", speaker: "沈屿", text: "我把信封好，放在窗台上。明天它就会不见。", next: "d3_season" },

  /* v1.1.0 季节切换 */
  d3_season: {
    day: 3, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "睡前我看着窗外的樱花树发呆——它一年四季都不一样。哪个季节里，藏着你想说的那句话？",
    next: "dream_night_1",
    season: {
      prompt: "滑动切换四季——找出那个藏着话的季节",
      seasons: ["spring", "summer", "autumn", "winter"],
      target: "autumn",
      clue: "落叶里夹着一张字条：「等你来捡。」",
      thresholds: [
        { isTarget: true, tag: "found",
          label: "——找到了",
          text: "秋天的落叶里，你捡起那张字条。上面只有一行字：「等你来捡。」——你不知道是谁写的，但你笑了一下：原来一句话可以藏一整个季节。",
          add: { affection: { shiyu: 1, sunian: 1, shen: 1 } },
          personality: { kind: 2, honest: 1 },
          memory: { id: "季节·秋", title: "藏在秋天的字条", text: "你在秋天的落叶里捡到一张字条，写着「等你来捡」。" },
          next: "dream_night_1" },
        { isTarget: false, tag: "miss",
          label: "——选错了",
          text: "你选了别的季节——什么也没找到。也许那张字条是写给别人的。也行——不是所有的字条都该你捡。",
          next: "dream_night_1" }
      ],
      fallback: { tag: "miss", next: "dream_night_1" }
    }
  },

  /* —— v0.5.0 梦境碎片：第3日夜晚 —— */
  dream_night_1: {
    day: 3, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "夜里，我做了一个梦。梦里樱花倒着飘。",
    next: "d3_rubbing",
    dream: {
      title: "❉ 樱花倒着飘的夜晚 ❉",
      hint: "点击场景探索 · 收集梦境碎片",
      scenes: [
        {
          icon: "📚", label: "图书馆",
          text: "梦见林诗雨的稿纸翻回第一页。她写过的字一行行消失，最后只剩「角色 A 推开门」。",
          shard: { id: "dream_shard_shiyu", text: "她写过的字会消失，但她写过的那句话不会。" },
          personality: { honest: 1 }
        },
        {
          icon: "🏃", label: "操场",
          text: "梦见夏织在跑道上往回跑——发令枪响，她退回起点。她笑着说：「这次我重新跑一次。」",
          shard: { id: "dream_shard_xiazhi", text: "如果可以重来，她依然会选择起跑。" },
          personality: { brave: 1 }
        },
        {
          icon: "🎨", label: "美术室",
          text: "梦见苏念把紫色的画翻过来。背面是空的。她说：「背面也是画。」",
          shard: { id: "dream_shard_sunian", text: "背面也是画。空白也是答案。" },
          personality: { honest: 1, kind: 1 }
        },
        {
          icon: "✉", label: "窗台",
          text: "窗台上那封信自己翻开了。它没有署名。但梦里我知道——是我写给自己的。",
          shard: { id: "dream_shard_self", text: "那封没署名的信，最后是写给我的。" },
          personality: { honest: 2 }
        }
      ]
    }
  },

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
    next: "d4_shiyu_collage"
  },
  /* v0.6.0 拼贴诗：写完开场后，林诗雨让玩家用已解锁的词拼一首小诗 */
  d4_shiyu_collage: {
    day: 4, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨",
    text: "……开场写完了。再来——你帮我把这几个词拼成一首小诗？我想用它做章末的题记。",
    next: "d4_noon",
    collage: {
      prompt: "拖动词语拼成一首小诗",
      tag: { good: 5, bad: 2 },
      scoreBonus: {
        good: { affection: { shiyu: 2 } },
        normal: { affection: { shiyu: 1 } },
        bad: { affection: { shiyu: 0 } }
      },
      scoreJump: {
        good: "d4_shiyu_poem_good",
        normal: "d4_noon",
        bad: "d4_shiyu_poem_spare"
      }
    }
  },
  d4_shiyu_poem_good: { day: 4, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……意象这么多。你写的不是诗，是一整片春天。", next: "d4_noon", memory: { id: "诗雨·题记", title: "丰沛的诗", text: "你拼的诗意象丰沛。她把它写进了章末。" } },
  d4_shiyu_poem_spare: { day: 4, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……这么少。可诗里最美的就是省略号。", next: "d4_noon", memory: { id: "诗雨·题记", title: "省略的诗", text: "你拼的诗只有寥寥几个字。她说，省略也是诗。" } },
  d4_xiazhi_1: { day: 4, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "田径社要办一个「奔跑接力」展，让来宾体验短跑。你帮我搭跑道。", next: "d4_xiazhi_2" },
  d4_xiazhi_2: { day: 4, time: "morning", bg: "field", speaker: "", text: "我们搬了一上午的桩和彩带。她左脚踝贴着膏药，但没说。", next: "d4_xiazhi_3" },
  d4_xiazhi_3: { day: 4, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……沈屿，你说跑下去，真的能跑出去吗？", next: "d4_xiazhi_rhythm" },
  /* v0.6.0 节奏敲击：和夏织一起热身，按节奏同步呼吸 */
  d4_xiazhi_rhythm: {
    day: 4, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织",
    text: "——来，跟我一起热身。你说跑得出去跑不出去，先把呼吸跟上我。",
    next: "d4_noon",
    rhythm: {
      prompt: "跟着夏织的节奏，按下空格 / 点击",
      bpm: 90,
      beats: 16,
      scoreBonus: {
        high: { affection: { xiazhi: 3 } },
        mid:  { affection: { xiazhi: 1 } },
        low:  { affection: { xiazhi: 0 } }
      },
      scoreJump: {
        high: "d4_xiazhi_sync",
        mid: "d4_noon",
        low: "d4_xiazhi_lost"
      }
    }
  },
  d4_xiazhi_sync: { day: 4, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……你跟上了。很少人跟得上我。她说这话时没看我，看的是跑道尽头。", next: "d4_noon", memory: { id: "夏织·同步", title: "跟上她的呼吸", text: "你跟上了夏织的节奏。她没说，但她记住了。" } },
  d4_xiazhi_lost: { day: 4, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……乱了？没关系。节奏这东西，乱了再找回来就行。", next: "d4_noon", memory: { id: "夏织·同步", title: "乱了的呼吸", text: "你没跟上夏织的节奏。她说，乱了再找回来就行。" } },
  d4_sunian_1: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……美术社要办画展。我得交一幅。", next: "d4_sunian_2" },
  d4_sunian_2: { day: 4, time: "morning", bg: "art_room", speaker: "沈屿", text: "你不是卡了三年吗？", next: "d4_sunian_3" },
  d4_sunian_3: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……但我必须交。否则省展邀请会作废。帮我搬旧画，看看有没有能改的。", next: "d4_sunian_4" },
  d4_sunian_4: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "搬完了。这一堆你看着乱，可每一张都是我卡住的那一年。来，帮我调一组色，看看哪一组能配出我要的那种紫。", next: "d4_sunian_minigame" },
  d4_sunian_minigame: {
    day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "",
    text: "——把颜色匹配到对应的目标框。",
    minigame: "painting",
    scoreBonus: { affection: { sunian: 1 } },
    next: "d4_sunian_photo"
  },
  /* v0.6.0 摄影构图：苏念要给完成的画拍一张海报照片 */
  d4_sunian_photo: {
    day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念",
    text: "……画完了。沈屿，帮我拍一张海报——把那束紫光取进去，别的不重要。",
    next: "d4_noon",
    photo: {
      prompt: "拖动取景框，把紫色光斑取进去，按下快门",
      targets: [
        { x: 60, y: 35, w: 14, h: 22, label: "紫光斑" },
        { x: 20, y: 60, w: 10, h: 16, label: "画角" }
      ],
      scoreBonus: {
        high: { affection: { sunian: 3 } },
        mid:  { affection: { sunian: 1 } },
        low:  { affection: { sunian: 0 } }
      },
      scoreJump: {
        high: "d4_sunian_shot_good",
        mid: "d4_noon",
        low: "d4_sunian_shot_bad"
      }
    }
  },
  d4_sunian_shot_good: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……这张。你看，紫在里面活着。", next: "d4_noon", memory: { id: "苏念·海报", title: "取景里的紫", text: "你取的景把紫光斑拍了进去。她说，紫在里面活着。" } },
  d4_sunian_shot_bad: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……没取到。但没关系，画本身就在。", next: "d4_noon", memory: { id: "苏念·海报", title: "没取到的紫", text: "你没把紫光斑取进去。她说，画本身就在。" } },
  d4_noon: { day: 4, time: "noon", bg: "cafeteria", char: null, speaker: "", text: "中午吃饭时，三女主破天荒坐到了一桌。我端着托盘远远看着。", next: "d4_noon_2" },
  d4_noon_2: { day: 4, time: "noon", bg: "cafeteria", chars: [{id:"shiyu", pos:"left"}, {id:"xiazhi", pos:"center"}, {id:"sunian", pos:"right"}], speaker: "夏织", text: "我提议——学园祭那天，我们三个一起出节目。诗雨写本子，我跑展，苏念画海报。", next: "d4_noon_3" },
  d4_noon_3: { day: 4, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "……可以。", next: "d4_noon_4" },
  d4_noon_4: { day: 4, time: "noon", bg: "cafeteria", char: "sunian", speaker: "苏念", text: "海报……我画。", next: "d4_noon_5" },
  d4_noon_5: {
    day: 4, time: "noon", bg: "cafeteria", speaker: "",
    text: "三个互不相让的人，难得地达成了默契。我忽然意识到，她们才是彼此的「三条路」。",
    next: "d4_evening",
    // v0.5.0 朋友圈：三女主同时发动态
    moment: ["m_d4_shiyu", "m_d3_group"]
  },
  d4_evening: { day: 4, time: "evening", bg: "home_room", char: null, speaker: "", text: "晚上。第三封信到了。「问题：如果三条路其实通向同一个地方，你还要走吗？」我没急着回信，先坐在窗边——窗外的味道忽然很熟。", next: "d4_evening_scent" },

  /* ============ v0.7.0 气味收集 ============ */
  d4_evening_scent: {
    day: 4, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "——窗台上有几种气味，慢慢散开。我凑近闻——",
    next: "d4_scent_recall",
    scent: {
      prompt: "细闻——窗台上有什么？",
      min: 1,
      items: [
        { id: "old_letter",   icon: "✉", name: "匿名信的纸味", desc: "纸张被夜风吹得发干，混着一点墨。像被人翻过很多次。", scene: "home_room" },
        { id: "cherry_night", icon: "🌸", name: "夜里的樱花",   desc: "几乎闻不到。只有一种很淡的甜，像被月光稀释过。", scene: "home_room" },
        { id: "rain_dust",    icon: "💧", name: "雨后的尘土",   desc: "泥土翻起来的腥气，是即将下雨的前奏。", scene: "home_room" }
      ],
      next: "d4_scent_recall"
    }
  },

  /* ============ v0.7.0 气味闪回 ============ */
  d4_scent_recall: {
    day: 4, time: "evening", bg: "home_room", char: null, speaker: "沈屿",
    text: "——匿名信的纸味，让我想起前几天在图书馆翻过的那本旧书。",
    next: "d4_silence",
    scentRecall: {
      scentId: "old_letter",
      recallId: "recall_d4_old_letter",
      text: "——纸的味道会变。我刚来这座城市的时候，所有的纸都闻起来像新印的。",
      flashback: "「纸的味道会变。三个月前的纸和今天的纸，闻起来不一样。」——她那时候在图书馆里这么说。",
      acknowledgedNext: "d4_silence",
      skipNext: "d4_silence",
      choices: [
        { text: "她说过这句话——是林诗雨。", value: "remember_shiyu",
          add: { affection: { shiyu: 1 } }, personality: { honest: 1 },
          memory: { id: "回声·纸味", title: "夜里想起的诗雨", text: "夜里我闻到旧纸味，想起林诗雨说：纸会变。" },
          next: "d4_silence" },
        { text: "不去想，把信推开。", value: "ignore",
          personality: { kind: -1 },
          next: "d4_silence" }
      ]
    }
  },

  /* ============ v0.7.0 沉默选择 ============ */
  d4_silence: {
    day: 4, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "——窗外的风停了。一个问题忽然浮上来：「如果我现在不回答，是不是也是一种回答？」",
    next: "d4_touch",
    silenceChoice: {
      prompt: "——你为什么不回信？",
      duration: 8,
      options: [
        { text: "我不知道怎么回。", value: "dont_know",
          add: { affection: { shiyu: 0 } }, personality: { honest: 1 },
          memory: { id: "沉默·回信", title: "夜里承认不知道", text: "夜里我承认我不知道怎么回。她没说话，但她听见了。" },
          next: "d4_touch" },
        { text: "我不想回。", value: "refuse",
          add: { affection: { shiyu: -1 } }, personality: { brave: 1 },
          next: "d4_touch" }
      ],
      silent: {
        text: "（你保持沉默。窗外的樱花落了一片，盖在信纸上。）",
        add: { affection: { shiyu: 0 } }, personality: { kind: 1 },
        memory: { id: "沉默·回信", title: "夜里的沉默", text: "夜里我什么也没说。沉默也是一种回答。" },
        next: "d4_touch"
      }
    }
  },

  /* ============ v0.7.0 触觉关怀 ============ */
  d4_touch: {
    day: 4, time: "evening", bg: "home_room", char: "shiyu", speaker: "林诗雨",
    text: "——门被轻轻推开。林诗雨站在门口，抱着稿纸。「我听见你屋里有动静……我可以进来吗？」她看上去眼睛红红的。",
    next: "d4_temperature",
    touch: {
      prompt: "她抱着一摞稿纸站在门口——你想怎么安慰她？点击立绘不同部位。",
      char: "shiyu",
      min: 1,
      parts: [
        { id: "head",     label: "头", x: 38, y: 22, w: 24, h: 18,
          dialogue: "「……你摸我的头。」她没躲，眼睛更红了。稿纸哗啦响了一下。",
          add: { affection: { shiyu: 2 } }, personality: { kind: 1 },
          memory: { id: "触觉·头", title: "夜里的安抚", text: "夜里你摸了她的头。她没躲。" } },
        { id: "shoulder", label: "肩", x: 30, y: 50, w: 40, h: 16,
          dialogue: "「——肩也酸。写了一下午，肩比心更累。」她终于笑了一下。",
          add: { affection: { shiyu: 1 } } },
        { id: "hand",     label: "手", x: 36, y: 75, w: 28, h: 14,
          dialogue: "「……手这么凉。」她没缩回去，稿纸从臂弯里掉了一张。",
          add: { affection: { shiyu: 2 } }, personality: { honest: 1 },
          memory: { id: "触觉·手", title: "夜里凉的手", text: "夜里你握了她的手。她说，凉。" } }
      ],
      exitText: "（你收回手。）",
      next: "d4_temperature"
    }
  },

  /* ============ v0.7.0 温度感知 ============ */
  d4_temperature: {
    day: 4, time: "evening", bg: "home_room", char: "shiyu", speaker: "林诗雨",
    text: "——她坐到窗边，看着外面的夜。「沈屿，你觉得现在——是冷，还是暖？」",
    next: "letter_2",
    temperature: {
      prompt: "她说：现在是什么感觉？滑动温度条，把心里的温度调给她看。",
      previewWarm:   "——把心调暖一点。她想被允许向前一步。",
      previewCool:   "——退一步，凉一点。她想被允许停在原地。",
      previewNeutral:"——就在此刻，不偏不倚。",
      scoreBonus: {
        warm:    { affection: { shiyu: 2 }, personality: { kind: 2, brave: 1 } },
        neutral: { affection: { shiyu: 1 } },
        cool:    { affection: { shiyu: 0 }, personality: { honest: 1 } }
      },
      scoreJump: {
        warm: "d4_temp_warm",
        neutral: "letter_2",
        cool: "d4_temp_cool"
      }
    }
  },
  d4_temp_warm: { day: 4, time: "evening", bg: "home_room", char: "shiyu", speaker: "林诗雨", text: "——暖。她笑了一下。「那就好。我也觉得……是暖的。」", next: "letter_2_pre", memory: { id: "温度·暖", title: "夜里的暖", text: "夜里你说现在是暖。她笑了一下。" } },
  d4_temp_cool: { day: 4, time: "evening", bg: "home_room", char: "shiyu", speaker: "林诗雨", text: "——凉。她点点头。「嗯。凉就凉一点吧。也挺好。」", next: "letter_2_pre", memory: { id: "温度·凉", title: "夜里的凉", text: "夜里你说现在是凉。她没说什么。" } },
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
  letter_2_after: { day: 4, time: "evening", bg: "home_room", speaker: "沈屿", text: "信封好，放在窗台。窗外起了风。我坐到窗前——心有点乱。先静一静再睡。", next: "d4_breath" },

  /* ============ v1.0.0 新玩法触发节点 ============ */
  // 呼吸引导
  d4_breath: {
    day: 4, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "窗外的樱花在风里起伏。我试着跟上它的节奏——一吸，一呼。",
    next: "d4_fold",
    breath: {
      prompt: "跟着窗外的樱花——长按吸气，松开呼气",
      cycles: 3,
      inhaleMs: 4000,
      holdMs: 1000,
      exhaleMs: 6000,
      thresholds: [
        { min: 0.7, tag: "calm",
          label: "——静了下来",
          text: "三次呼吸后，心跳慢下来了。樱花还在飘，可你不再急着追它。窗台上的信封静静躺着——你第一次觉得自己能写下它。",
          add: { affection: { shiyu: 1, xiazhi: 1, sunian: 1 } },
          personality: { kind: 1, honest: 1 },
          memory: { id: "呼吸·静", title: "窗前的三次呼吸", text: "你在窗前跟樱花一起呼吸了三次。心静下来了。" },
          next: "d4_fold" },
        { min: 0.3, tag: "ok",
          label: "——半静半乱",
          text: "心跳只慢了一点。还是有点乱，但你不再抗拒这份乱——乱也是真的。",
          personality: { honest: 1 },
          next: "d4_fold" }
      ],
      fallback: { tag: "miss",
        label: "——没静下来",
        text: "你越想跟上樱花，越跟不上。算了——心乱就乱吧。明天的路总要走的。",
        next: "d4_fold" }
    }
  },

  // 信纸折痕
  d4_fold: {
    day: 4, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "信封还在窗台。你伸手拿起它——该怎么折，才能让读到的人知道你认真想过？",
    next: "d4_reflection",
    fold: {
      prompt: "按顺序折这封信——每一种折法都在说不同的话",
      folds: [
        { id: "a", label: "对折",   desc: "最简单——把信一分为二" },
        { id: "b", label: "三角折", desc: "折成樱花瓣的形状" },
        { id: "c", label: "卷起",   desc: "像卷起一缕头发" },
        { id: "d", label: "折角",   desc: "只折一个角——像留了个出口" }
      ],
      interpretations: [
        { order: ["a", "b"], tag: "sakura_fold",
          label: "——樱花瓣的折法",
          text: "先对折，再折成三角——像一片樱花瓣。读到的人会知道：你想把春天一起寄给她。",
          add: { affection: { shiyu: 1 } },
          personality: { kind: 2, brave: 1 },
          memory: { id: "折信·樱花瓣", title: "樱花瓣的折法", text: "你把信折成樱花瓣的形状。" },
          next: "d4_reflection" },
        { order: ["b", "c"], tag: "soft_fold",
          label: "——柔软的折法",
          text: "三角再卷起——信变得很软。苏念说，柔软不是没力气，是肯放下劲。",
          add: { affection: { sunian: 1 } },
          personality: { kind: 1, honest: 1 },
          next: "d4_reflection" },
        { order: ["d"], tag: "open_fold",
          label: "——留了个出口",
          text: "只折一个角。信没合上——像你还没说完。学姐看见会笑吧：你也学会留出口了。",
          add: { affection: { shen: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "折信·留出口", title: "留了个出口", text: "你只折了一个角。信没合上。" },
          next: "d4_reflection" }
      ],
      min: 1,
      fallback: { tag: "default_fold",
        label: "——折得普通",
        text: "你折了几下，没成什么特别的形状。也行——一封普通的信，也是一封诚实的信。",
        next: "d4_reflection" }
    }
  },

  // 倒影对齐
  d4_reflection: {
    day: 4, time: "evening", bg: "rain", char: null, speaker: "",
    text: "下楼透口气。檐下有一滩积水——樱花飘进去，倒影在水里晃。你蹲下来——把倒影拨正。",
    next: "d4_timecapsule",
    reflection: {
      prompt: "拖动下半，让倒影和上面的樱花对齐——",
      upper: "樱花飘落",
      lower: "倒影模糊",
      thresholds: [
        { min: 0.85, tag: "aligned",
          label: "——对上了",
          text: "倒影一寸寸挪回来，和水面的樱花对齐了。你看见自己的脸——比白天平静。林诗雨说过，能在水面上看见自己的人，走得远。",
          add: { affection: { shiyu: 1, xiazhi: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "倒影·对齐", title: "檐下的对齐", text: "你在檐下把樱花倒影拨正了。第一次看清了自己。" },
          next: "d4_timecapsule" },
        { min: 0.5, tag: "close",
          label: "——差一点",
          text: "差一点就对上了。倒影还在晃——也许有些事本来就不能完全对齐。",
          add: { affection: { shiyu: 0 } },
          personality: { honest: 1 },
          next: "d4_timecapsule" }
      ],
      fallback: { tag: "miss",
        label: "——没对上",
        text: "你怎么拨，倒影都晃。算了——明天的路本来也看不清。先回去吧。",
        next: "d4_timecapsule" }
    }
  },

  // 时光胶囊
  d4_timecapsule: {
    day: 4, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "回到房间。窗台上有一张空白的纸——给未来的自己写一句话吧。明天醒来之前，它会到。",
    next: "d4_lightdraw",
    timecapsule: {
      prompt: "给明天的自己写一句话——",
      placeholder: "（最多 60 字）",
      maxLength: 60,
      deliverAt: "common_day5_morning",
      onSubmit: { tag: "written",
        label: "——封存",
        text: "你把纸折好，塞进信封。明早起来之前，它会到——这是你给未来自己的一份承诺。",
        add: { affection: { shen: 1 } },
        personality: { brave: 2, honest: 1 },
        memory: { id: "时光·胶囊", title: "给明天的自己", text: "你给明天的自己写了一句话，封进了信封。" },
        next: "d4_lightdraw" }
    }
  },

  /* ============ v1.1.0 新玩法触发节点 ============ */
  // 光影描绘
  d4_lightdraw: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
    text: "夜里停电了。窗台上一片漆黑。你拿出一根没点燃的蜡烛——用手指在桌上拖一拖，假装是光。",
    next: "d4_tea",
    lightdraw: {
      prompt: "用手指在黑暗里拖出光路——照亮窗台上的东西",
      targets: [
        { id: "letter",  x: 20, y: 50, r: 5, label: "信封",
          memory: { id: "光·信封", title: "夜里照亮的信", text: "你在黑暗里照亮了那封信。它静静躺在窗台上。" } },
        { id: "cherry",  x: 50, y: 30, r: 4, label: "窗外的樱花" },
        { id: "photo",   x: 75, y: 60, r: 5, label: "旧照片" },
        { id: "phone",   x: 35, y: 75, r: 4, label: "手机",
          memory: { id: "光·手机", title: "夜里照亮的手机", text: "你在黑暗里照亮了手机。屏幕上有三条未读消息。" } }
      ],
      min: 2,
      thresholds: [
        { min: 0.75, tag: "lit_all",
          label: "——照亮了一切",
          text: "你拖出的光把整个窗台都照亮了。信、樱花、照片、手机——它们都在那里，等你明天去回应。你第一次觉得：黑暗不可怕，可怕的是不肯把光照过去。",
          add: { affection: { shiyu: 1, xiazhi: 1, sunian: 1, shen: 1 } },
          personality: { brave: 2, honest: 2 },
          memory: { id: "光影·全亮", title: "照亮一切", text: "你在黑暗里拖出光，把窗台照亮了。" },
          next: "d4_tea" },
        { min: 0.4, tag: "lit_some",
          label: "——只照亮了一半",
          text: "你只照亮了窗台的一半。另一半还埋在黑里——也行，有些事可以留到明天再看。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d4_tea" }
      ],
      fallback: { tag: "lit_none",
        label: "——没拖出光",
        text: "你拖了几下，光没成形状。算了——黑暗就黑暗吧。明天的太阳总会出来的。",
        next: "d4_tea" }
    }
  },

  // 声音模仿
  d5_mimic: {
    day: 5, time: "morning", bg: "rooftop", char: "shiyu", speaker: "林诗雨",
    text: "她从背后叫住你。「喂——」尾音往上扬了一下。学她这一声？",
    next: "d5_pulse",
    mimic: {
      prompt: "学她叫你那声「喂」——",
      target: { pitch: 0.7, tempo: 0.4 },
      tolerance: 0.15,
      thresholds: [
        { min: 0.85, tag: "alike",
          label: "——学得像",
          text: "你学得几乎一模一样。林诗雨愣了一下，然后笑出声：「……你这样学我，我会以为你也想被人这样叫。」",
          add: { affection: { shiyu: 2 } },
          personality: { kind: 2, honest: 1 },
          memory: { id: "模仿·像", title: "学她那声喂", text: "你学林诗雨叫你的语气，她笑出声。" },
          next: "d5_pulse" },
        { min: 0.55, tag: "ok",
          label: "——差一点",
          text: "你学得不太像，但她听见了。「……声音可以骗人，但你不是。我认得你的声音。」",
          add: { affection: { shiyu: 1 } },
          personality: { honest: 1 },
          next: "d5_pulse" }
      ],
      fallback: { tag: "miss",
        label: "——不像",
        text: "你学得完全不像。林诗雨摇摇头：「算了——你学不来。每个人有每个人的声音。」",
        next: "d5_pulse" }
    }
  },

  // 脉搏同步
  d5_pulse: {
    day: 5, time: "morning", bg: "rooftop", char: "shiyu", speaker: "林诗雨",
    text: "她把手腕伸过来——你也伸过去。「……试试看，能不能跟上我的脉搏。」她的心跳不快。",
    next: "common_day5_morning",
    pulse: {
      prompt: "点击让心跳跟上她——",
      bpm: 68,
      beats: 8,
      tolerance: 0.18,
      thresholds: [
        { min: 0.7, tag: "synced",
          label: "——对上了",
          text: "你的心跳一拍一拍跟上她。她轻声说：「……跟上了。沈屿——你也能听见我，是不是。」你没有回答。但她的脉搏告诉你，她已经知道答案。",
          add: { affection: { shiyu: 2 } },
          personality: { kind: 2, honest: 2 },
          memory: { id: "脉搏·对上", title: "天台上的脉搏", text: "你在天台上让心跳跟上林诗雨。" },
          next: "common_day5_morning" },
        { min: 0.4, tag: "ok",
          label: "——半对上",
          text: "你的心跳只对上了几拍。她笑了一下：「……没关系。听不见也是真的——你不必每次都跟得上。」",
          add: { affection: { shiyu: 1 } },
          personality: { honest: 1 },
          next: "common_day5_morning" }
      ],
      fallback: { tag: "miss",
        label: "——没对上",
        text: "你的心跳完全跟不上。她抽回手，没生气：「你的心跳是你的。别为了跟谁，把它丢掉。」",
        next: "common_day5_morning" }
    }
  },

  /* ============ v1.2.0 新玩法触发节点 ============ */
  // 茶席品茗
  d4_tea: {
    day: 4, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "回到房间，桌上有一套茶具。泡一壶茶吧——给明天的自己留一杯。",
    next: "d4_astronomy",
    tea: {
      prompt: "泡一壶茶——调整水温、茶量、浸泡时间",
      target: { temp: 0.7, amount: 0.4, time: 0.5 },
      tolerance: 0.15,
      thresholds: [
        { min: 0.85, tag: "perfect",
          label: "——恰到好处",
          text: "茶汤色泽温润，香气恰到好处。你抿一口——苦里有回甘，像这一天的尾巴。明天会好的。",
          add: { affection: { shen: 2, shiyu: 1 } },
          personality: { kind: 2, honest: 1 },
          memory: { id: "茶·恰到好处", title: "夜里泡的茶", text: "你在夜里泡了一壶恰到好处的茶，苦里有回甘。" },
          next: "d4_astronomy" },
        { min: 0.55, tag: "ok",
          label: "——还行",
          text: "茶泡得还行——不坏，也不好。有些夜晚就是这样，不浓不淡，过了就过了。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d4_astronomy" }
      ],
      fallback: { tag: "miss",
        label: "——泡坏了",
        text: "茶泡得太苦或者太淡。你倒掉，重新烧水——有些事可以重来，有些不行。明天再说吧。",
        next: "d4_astronomy" }
    }
  },

  // 星象观测
  d4_astronomy: {
    day: 4, time: "night", bg: "rooftop", char: null, speaker: "",
    text: "天台上夜风很凉。抬头看星空——旋转星图盘，对齐今夜的星座。",
    next: "d5_palette",
    astronomy: {
      prompt: "旋转星图盘——对齐今夜最亮的星座",
      constellations: ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio"],
      target: "libra",
      clue: "天秤座的星辰今夜最亮——它总在权衡，却从不偏倚。",
      thresholds: [
        { isTarget: true, tag: "aligned",
          label: "——对齐了",
          text: "天秤座挂在夜空正中。你想起她说过的：秤平的时候，不是没重量，是两边的重量一样。你和她，也许就是这样。",
          add: { affection: { shiyu: 1, sunian: 1, shen: 1 } },
          personality: { honest: 2, kind: 1 },
          memory: { id: "星象·天秤", title: "天秤座的夜", text: "你在天台上对齐了天秤座的星辰。" },
          next: "d5_palette" },
        { isTarget: false, tag: "miss",
          label: "——对错了",
          text: "你选了别的星座——今夜它不亮。也许她说的那个秤，今夜不在天上。",
          next: "d5_palette" }
      ],
      fallback: { tag: "miss", next: "d5_palette" }
    }
  },

  // 颜料调配
  d5_palette: {
    day: 5, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念",
    text: "苏念把调色盘推过来。「调出这个颜色——」她指着画上裙摆的一角。「调对，我就告诉你画的是谁。」",
    next: "d5_piano",
    palette: {
      prompt: "调出她裙摆的颜色——",
      target: { r: 200, g: 140, b: 180 },
      tolerance: 30,
      thresholds: [
        { min: 0.85, tag: "matched",
          label: "——调对了",
          text: "你调出的颜色几乎一模一样。苏念看了一眼：「……是林诗雨。我画的是她那天在校门口的样子。」她顿了顿：「你怎么知道她裙子的颜色？」",
          add: { affection: { sunian: 2, shiyu: 1 } },
          personality: { honest: 2, kind: 1 },
          memory: { id: "颜料·裙摆", title: "裙摆的颜色", text: "你调出了林诗雨裙摆的颜色，苏念说画的是她。" },
          next: "d5_piano" },
        { min: 0.55, tag: "ok",
          label: "——差一点",
          text: "你调出的颜色差一点。苏念看了看：「……不是她。但你调的这个颜色，像另一个人。」她没说是谁。",
          add: { affection: { sunian: 1 } },
          personality: { honest: 1 },
          next: "d5_piano" }
      ],
      fallback: { tag: "miss",
        label: "——不像",
        text: "你调出的颜色完全不对。苏念笑了一下：「……算了。有些颜色，调不出来就是调不出来。」",
        next: "d5_piano" }
    }
  },

  // 琴键演奏
  d5_piano: {
    day: 5, time: "morning", bg: "home_room", char: null, speaker: "",
    text: "窗台上有一架旧口风琴。她昨天哼过一段旋律——你试着弹出来。",
    next: "d4_dice",
    piano: {
      prompt: "弹奏她哼过的旋律——",
      keys: 8,
      sequence: [0, 2, 4, 2, 0],
      showSequence: true,
      thresholds: [
        { min: 0.85, tag: "perfect",
          label: "——弹对了",
          text: "你一个音不差地弹了出来。旋律在房间里回响——你想起来了：这是她外婆教她的那首歌。你没见过她外婆，但这一刻，你好像听见了。",
          add: { affection: { shiyu: 2, shen: 1 } },
          personality: { kind: 2, honest: 1 },
          memory: { id: "琴键·旋律", title: "她外婆的歌", text: "你弹出了她哼过的旋律——是她外婆教她的那首歌。" },
          next: "d4_dice" },
        { min: 0.55, tag: "ok",
          label: "——弹得还行",
          text: "你弹得磕磕绊绊，但旋律出来了。她说过：错音也是旋律的一部分。你想她是对的。",
          add: { affection: { shiyu: 1 } },
          personality: { honest: 1 },
          next: "d4_dice" }
      ],
      fallback: { tag: "miss",
        label: "——弹错了",
        text: "你完全弹错了。旋律碎了。但没关系——有些歌，本来就不是弹给人听的。",
        next: "d4_dice" }
    }
  },

  /* ============ v1.3.0 新玩法触发节点 ============ */
  // 占星骰子
  d4_dice: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
    text: "桌上有一副旧骰子——她说过，三个骰子的总和，能掷出今夜的命运。你摇一摇，掷下去。",
    next: "d4_wind",
    dice: {
      prompt: "掷三个骰子——解读命运",
      thresholds: [
        { min: 15, tag: "blessed",
          label: "——大吉",
          text: "三颗骰子高高低低加起来是个大数。你想起她说的：命好的人不是不摔跤，是摔跤的时候手还能握住东西。今夜，你握住了。",
          add: { affection: { shiyu: 2, xiazhi: 1, sunian: 1, shen: 1 } },
          personality: { brave: 2, honest: 1 },
          memory: { id: "骰子·大吉", title: "夜里掷出大吉", text: "你在夜里掷出一副大吉的骰子。" },
          next: "d4_wind" },
        { min: 8, tag: "ok",
          label: "——平平",
          text: "骰子加起来是个平平的数。不坏，也不好。她说：命就是这样，一半归你，一半归天。今夜归天的那一半，安安静静。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d4_wind" }
      ],
      fallback: { tag: "miss",
        label: "——小凶",
        text: "骰子加起来是个小数。她说：凶的时候不要怕——怕的不是命，是自己把自己吓住。今夜，你被吓住了一点点。",
        next: "d4_wind" }
    }
  },

  // 风向感知
  d4_wind: {
    day: 4, time: "night", bg: "rooftop", char: null, speaker: "",
    text: "天台上风很大。她说过——风是给愿意借的人的。你拿起一只小纸船，调整它帆的角度，看它能走多远。",
    next: "d4_decode",
    wind: {
      prompt: "调整帆角度——借风让纸船前进",
      target: 80,
      maxAttempts: 6,
      thresholds: [
        { min: 0.85, tag: "arrived",
          label: "——到了",
          text: "纸船借着风，一寸一寸到了对岸。你想起她说过的：到不了的人，不是没风，是没把自己的帆摆对方向。今夜，你摆对了。",
          add: { affection: { shiyu: 2, shen: 1 } },
          personality: { brave: 2, kind: 1 },
          memory: { id: "风向·到岸", title: "夜里纸船到岸", text: "你在天台上让纸船借着风到了对岸。" },
          next: "d4_decode" },
        { min: 0.5, tag: "halfway",
          label: "——走了一半",
          text: "纸船走了一半就停了。风没给够，或者帆没摆对——一半一半。她说：走一半也是走。明天再走一半。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d4_decode" }
      ],
      fallback: { tag: "miss",
        label: "——没动",
        text: "纸船几乎没动。风从一边吹来，帆却朝着另一边。她说：人和命，常常是这样错过的。今夜错过了——明天再调。",
        next: "d4_decode" }
    }
  },

  // 梦境解码
  d4_decode: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
    text: "睡前，梦里飘来几个字——乱七八糟的，像撕碎的信。你试着把它们排成一句话。",
    next: "d4_rain",
    decode: {
      prompt: "把梦境碎片重排成一句完整的话——",
      scrambled: ["雨","在","窗","外","停","了"],
      answer: "雨在窗外停了",
      thresholds: [
        { min: 1.0, tag: "decoded",
          label: "——解开了",
          text: "你把碎片排成一句完整的话：「雨在窗外停了」。你想起来了——她说过的：梦是夜里写的诗，醒来读得懂，就懂了一半的自己。今夜，你懂了。",
          add: { affection: { shiyu: 2, shen: 1 } },
          personality: { honest: 2, kind: 1 },
          memory: { id: "梦境·解码", title: "雨在窗外停了", text: "你在梦里把碎片排成「雨在窗外停了」。" },
          next: "d4_rain" },
        { min: 0.5, tag: "half",
          label: "——排了一半",
          text: "你只排出了一半的字。另一半还在梦里飘着——也许明天醒来，它们自己会找到位置。她说：不必一次排完。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d4_rain" }
      ],
      fallback: { tag: "miss",
        label: "——没排出",
        text: "你排不出完整的句子。碎片在你手里转了又转，最后还是散了。她说：有些梦，本来就是读不懂的。读不懂就让它待着。",
        next: "d4_rain" }
    }
  },

  // 雨滴节奏
  d4_rain: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
    text: "窗外开始下雨。雨滴打在窗台上，有它自己的节奏。她说：雨是天上敲的鼓——你跟着敲，就接住了它的意思。",
    next: "d4_tealeaf",
    rain: {
      prompt: "听雨滴落地的节奏——按节奏点击窗台",
      drops: 8,
      interval: 1200,
      tolerance: 0.3,
      thresholds: [
        { min: 0.7, tag: "synced",
          label: "——接住了",
          text: "你的点击一拍一拍接住了雨。她说：接住雨的人，也接住了夜。今夜，你接住了——也终于能睡了。",
          add: { affection: { shiyu: 2, shen: 1 } },
          personality: { kind: 2, honest: 1 },
          memory: { id: "雨滴·接住", title: "夜里接住的雨", text: "你在夜里跟着雨的节奏点击，接住了它的拍子。" },
          next: "d4_tealeaf" },
        { min: 0.4, tag: "ok",
          label: "——接了几拍",
          text: "你只接住了几拍。她说：接不住也是真的——雨是天上敲的，地上的人跟不上是常事。你已经尽力了。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d4_tealeaf" }
      ],
      fallback: { tag: "miss",
        label: "——没接住",
        text: "你完全没接住雨的节奏。雨自己敲它的，你敲你的——两个节奏错开了。她说：错开也是好的——证明你和雨不一样。",
        next: "d4_tealeaf" }
    }
  },

  /* ============ v1.5.0 新玩法触发节点 ============ */
  // 茶渍占卜
  d4_tealeaf: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
    text: "雨停了。你泡了一杯茶。她说——杯底的茶渍，藏着今晚的答案。你试着转一转杯，让茶渍说话。",
    next: "d4_shadow",
    tealeaf: {
      prompt: "拖动茶杯——让茶渍在杯底流转",
      min: 0.3,
      shapes: [
        { id: "heart", name: "心形", areas: [0, 1, 5] },
        { id: "moon",  name: "月牙", areas: [3, 4] },
        { id: "tree",  name: "树影", areas: [2] },
        { id: "river", name: "水形", areas: [0, 1, 2, 3, 4, 5] }
      ],
      thresholds: [
        { min: 0.6, tag: "clear",
          label: "——看清了",
          text: "茶渍在杯底结成一个形状。她说：那是你今晚的样子——比你自己想的，要清楚一些。",
          add: { affection: { shiyu: 2, shen: 1 } },
          personality: { honest: 2, kind: 1 },
          memory: { id: "茶渍·看清", title: "雨夜的茶渍", text: "你在雨后的夜里泡茶，从杯底的茶渍里看出一个形状。" },
          next: "d4_shadow" },
        { min: 0.35, tag: "ok",
          label: "——看出一半",
          text: "茶渍半散半聚。她说：一半也是答案——剩下的一半，留给明天。你想她说的是对的。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d4_shadow" }
      ],
      fallback: { tag: "miss",
        label: "——没看出",
        text: "茶渍散了，没成形。她说：散也是好的——证明今晚没有非要回答的事。你把茶喝了。",
        next: "d4_shadow" }
    }
  },

  // 影子对齐
  d4_shadow: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
    text: "窗外路灯把光投进来。桌上一个小木块，投出长长的影子。她说——把影子挪到那个轮廓上，就能听见一段旧话。",
    next: "d4_candle",
    shadow: {
      prompt: "拖动木块——让影子与虚线轮廓重合",
      lightAngle: 30,
      target: [
        { x: 0.55, y: 0.50 },
        { x: 0.85, y: 0.50 },
        { x: 0.85, y: 0.62 },
        { x: 0.55, y: 0.62 }
      ],
      min: 0.5,
      thresholds: [
        { min: 0.7, tag: "aligned",
          label: "——对上了",
          text: "影子严丝合缝地盖在轮廓上。她说：影子不会说谎——它永远跟着光走。你也一样。今晚，你跟着光，找到了一段旧话。",
          add: { affection: { shiyu: 2, xiazhi: 1 } },
          personality: { brave: 2, honest: 1 },
          memory: { id: "影子·对齐", title: "路灯下的影子", text: "你把木块的影子对齐到桌上的轮廓。" },
          next: "d4_candle" },
        { min: 0.4, tag: "ok",
          label: "——偏了一些",
          text: "影子偏了一点。她说：偏一点也是对——世界上没有完全重合的两件事。你想她说的是对的。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d4_candle" }
      ],
      fallback: { tag: "miss",
        label: "——没对上",
        text: "影子完全没对上。她说：没对上也是答案——证明光不在你想的方向上。你换一盏灯再试。",
        next: "d4_candle" }
    }
  },

  // 烛火守护
  d4_candle: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
    text: "桌上点起一支蜡烛。她说——风吹六阵，守住它。守得住火，就守得住今晚要说的那句话。",
    next: "d4_dial",
    candle: {
      prompt: "旋转挡风板——守护烛火不被风吹灭",
      winds: 6,
      duration: 2200,
      gap: 700,
      thresholds: [
        { min: 0.7, tag: "guarded",
          label: "——守住了",
          text: "六阵风过去，火还在。她说：守住火的人，也守住了话。今晚她要说的那句——你听见了。",
          add: { affection: { shiyu: 2, sunian: 1 } },
          personality: { brave: 2, kind: 1 },
          memory: { id: "烛火·守住", title: "夜里守住的火", text: "你在雨夜的房间里守住了烛火，撑过六阵风。" },
          next: "d4_dial" },
        { min: 0.4, tag: "ok",
          label: "——守了一半",
          text: "你只守住了一半。她说：一半也是好的——剩下的火，明天再点。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d4_dial" }
      ],
      fallback: { tag: "miss",
        label: "——灭了",
        text: "火灭了。她说：灭了也没关系——黑暗里说的话，比光里更真。你坐在黑里，听她说完。",
        next: "d4_dial" }
    }
  },

  // 电话拨号
  d4_dial: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
    text: "床头有一台旧电话。她说——拨一个号码，是 7 位数。她说完只重复了一遍。你试着拨出去。",
    next: "d5_foggy",
    dial: {
      prompt: "拨出你记得的号码——",
      target: "1206437",
      preview: 4000,
      thresholds: [
        { min: 0.99, tag: "dialed",
          label: "——拨对了",
          text: "拨号声嘟嘟响过，对面接了。是个熟悉的声音——你说不出是谁，但她喊了你的名字。你想：原来她也记得。",
          add: { affection: { shiyu: 2, xiazhi: 1, sunian: 1, shen: 1 } },
          personality: { honest: 2, brave: 2 },
          memory: { id: "电话·拨通", title: "雨夜的电话", text: "你在雨夜拨通了一个 7 位的号码，对面接了。" },
          next: "d5_foggy" },
        { min: 0.5, tag: "ok",
          label: "——拨了一半",
          text: "拨号声断断续续，对面没接。你想：号码记不全也是好的——有些事，记一半就够。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d5_foggy" }
      ],
      fallback: { tag: "miss",
        label: "——拨错了",
        text: "拨号声嘟嘟响，没有人接。她说：拨错的号码，也是号码——它属于某个你不知道的人。你挂了电话。",
        next: "d5_foggy" }
    }
  },


  /* ============ v1.6.0 新玩法触发节点 ============ */
  // 雾窗描绘
  d5_foggy: {
    day: 5, time: "morning", bg: "home_room", char: null, speaker: "",
    text: "醒来时窗户起雾了。她说——用手指在雾上画一个形状，雾散了，形状还在。你想画一颗星。",
    next: "d5_sugar",
    foggy: {
      prompt: "在起雾的玻璃上拖动手指——描出一颗星",
      shape: "star",
      hintPath: [
        { x: 0.50, y: 0.20 },
        { x: 0.62, y: 0.45 },
        { x: 0.85, y: 0.45 },
        { x: 0.66, y: 0.60 },
        { x: 0.74, y: 0.85 },
        { x: 0.50, y: 0.68 },
        { x: 0.26, y: 0.85 },
        { x: 0.34, y: 0.60 },
        { x: 0.15, y: 0.45 },
        { x: 0.38, y: 0.45 },
        { x: 0.50, y: 0.20 }
      ],
      min: 0.35,
      thresholds: [
        { min: 0.6, tag: "clear",
          label: "——画清了",
          text: "雾散开，星形留在玻璃上。她说：画出来就不算忘了。你想：原来有些事，画一下就能留住。",
          add: { affection: { shiyu: 2, shen: 1 } },
          personality: { honest: 2, kind: 1 },
          memory: { id: "雾窗·星", title: "晨起的星", text: "你在起雾的窗上用手指画了一颗星。" },
          next: "d5_sugar" },
        { min: 0.35, tag: "ok",
          label: "——画了一半",
          text: "雾只散了一半，星形不全。她说：一半也是星——剩下的一半，留给下一次起雾。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d5_sugar" }
      ],
      fallback: { tag: "miss",
        label: "——没画成",
        text: "雾没散开，星也没成。她说：没画出来也是真的——证明有些事，手指记不住。你想她说的是对的。",
        next: "d5_sugar" }
    }
  },

  // 糖块拼图
  d5_sugar: {
    day: 5, time: "morning", bg: "home_room", char: null, speaker: "",
    text: "桌上摆着四颗糖。她说——把它们摆到该摆的地方，就能拼出一句话。你看着糖，开始摆。",
    next: "d5_chime",
    sugar: {
      prompt: "把糖块拖到对应格——拼出「记得回来」",
      pieces: [
        { id: "j", label: "记", color: "#d87090", x: 0.05, y: 0.10, target: { gx: 0, gy: 0 } },
        { id: "d", label: "得", color: "#a8c8e8", x: 0.85, y: 0.10, target: { gx: 1, gy: 0 } },
        { id: "h", label: "回", color: "#c8a8e8", x: 0.05, y: 0.80, target: { gx: 0, gy: 1 } },
        { id: "l", label: "来", color: "#a8e8c8", x: 0.85, y: 0.80, target: { gx: 1, gy: 1 } }
      ],
      grid: { cols: 2, rows: 2, cell: 90 },
      min: 0.75,
      thresholds: [
        { min: 1.0, tag: "all",
          label: "——拼完了",
          text: "四颗糖就位，桌上一行字：「记得回来」。她说：记得回来就好。你想：原来糖也会说话。",
          add: { affection: { shiyu: 2, xiazhi: 1, sunian: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "糖块·记得", title: "桌上的糖字", text: "你把四颗糖拼成「记得回来」。" },
          next: "d5_chime" },
        { min: 0.75, tag: "ok",
          label: "——拼了大半",
          text: "你只拼对了三颗。她说：三颗也是好的——剩下那一颗，留给自己。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d5_chime" }
      ],
      fallback: { tag: "miss",
        label: "——没拼成",
        text: "糖散在桌上，没拼成字。她说：散也是好的——糖本来就该散着吃。你拿了一颗剥开。",
        next: "d5_chime" }
    }
  },

  // 钟调共振
  d5_chime: {
    day: 5, time: "noon", bg: "home_room", char: null, speaker: "",
    text: "墙上一只旧钟停了。她说——把钟摆调到对的角度，敲一下，它就接着走。你试一试。",
    next: "d5_hourglass",
    chime: {
      prompt: "拖动钟摆——调到目标角度后敲一下",
      target: 35,
      tolerance: 5,
      thresholds: [
        { max: 5, tag: "resonant",
          label: "——共振了",
          text: "钟摆停在 35 度。你一敲，钟响了——它的音稳稳地接住了空气。她说：听见了吗？这就是「对」的声音。",
          add: { affection: { shiyu: 2, sunian: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "钟调·共振", title: "墙上的旧钟", text: "你把钟摆调到 35 度，钟响了，重新走起来。" },
          next: "d5_hourglass" },
        { max: 15, tag: "ok",
          label: "——偏了一些",
          text: "钟摆偏了一点。你敲下去，钟响了，但音不稳。她说：偏一点也是音——只是没那么准。你想她说的是对的。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d5_hourglass" }
      ],
      fallback: { tag: "miss",
        label: "——没对上",
        text: "钟摆完全没对上。你敲下去，钟没响——只发出一声闷响。她说：闷响也是响——证明它在听。",
        next: "d5_hourglass" }
    }
  },

  // 沙漏计时
  d5_hourglass: {
    day: 5, time: "afternoon", bg: "home_room", char: null, speaker: "",
    text: "她拿出一只沙漏。她说——在 5 秒的时候翻一次，让沙在 5 秒后落完。她说完就走了。你拿着沙漏。",
    next: "d5_mimic",
    hourglass: {
      prompt: "点「开始」计时，到 5 秒时点「翻转」",
      target: 5000,
      duration: 8000,
      tolerance: 600,
      thresholds: [
        { max: 400, tag: "perfect",
          label: "——卡上了",
          text: "你在 5 秒的那一刻翻转。沙顺着颈口倒流回去——5 秒后，沙又落完一次。她说：你卡住了时间。你想：原来时间也能留住。",
          add: { affection: { shiyu: 2, xiazhi: 1, sunian: 1, shen: 1 } },
          personality: { brave: 2, honest: 2 },
          memory: { id: "沙漏·5秒", title: "卡住的时间", text: "你在 5 秒的时候翻转了沙漏，让沙再落一次。" },
          next: "d5_mimic" },
        { max: 1000, tag: "ok",
          label: "——差一点",
          text: "你差了一点。沙没在 5 秒落完。她说：差一点也是好的——证明你想过它。你想她说的是对的。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d5_mimic" }
      ],
      fallback: { tag: "miss",
        label: "——没卡上",
        text: "你完全没卡上。沙落完了，没翻转。她说：没卡上也是真的——有些事错过了，就是错过了。你看着空了的沙漏。",
        next: "d5_mimic" }
    }
  },

  /* ============ v1.4.0 新玩法触发节点 ============ */
  // 拓印
  d3_rubbing: {
    day: 3, time: "afternoon", bg: "library", char: null, speaker: "",
    text: "图书馆的旧书页里夹着一片枯叶。她说过——把纸盖在上面，用铅笔轻轻拓，纹理就会出来。你试一试。",
    next: "d3_collect",
    rubbing: {
      prompt: "用铅笔在纸上拖动——拓出叶脉的纹理",
      pattern: "leaf",
      min: 0.5,
      thresholds: [
        { min: 0.8, tag: "clear",
          label: "——拓清了",
          text: "叶脉一条一条在你笔下显出来。她说：拓印是慢的事——急不来。你拓的这片叶子，是一年前她夹进去的。你想起来了。",
          add: { affection: { shiyu: 2, shen: 1 } },
          personality: { kind: 2, honest: 1 },
          memory: { id: "拓印·叶脉", title: "图书馆里的拓印", text: "你在图书馆用铅笔拓出一片枯叶的纹理。" },
          next: "d3_collect" },
        { min: 0.5, tag: "ok",
          label: "——拓了一半",
          text: "你只拓出了一半的叶脉。她说：一半也够。看得见的部分，已经够你想起来了。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d3_collect" }
      ],
      fallback: { tag: "miss",
        label: "——没拓出",
        text: "你拓了几下，纹理没出来。她说：有时候纸太厚——有些东西，隔着纸是拓不出的。要直接看。",
        next: "d3_collect" }
    }
  },

  // 集字
  d3_collect: {
    day: 3, time: "afternoon", bg: "field", char: null, speaker: "",
    text: "操场上飘起樱花。她说——你看，每一片花瓣里都藏着一个字。你试着在飘落的花瓣里，抓住那个「雨」字。",
    next: "d3_focus",
    collect: {
      prompt: "在飘落的花瓣中点击收集「雨」字",
      target: "雨",
      total: 5,
      duration: 12000,
      distractors: ["风","云","月","花","叶","雪","霜","露"],
      thresholds: [
        { min: 0.8, tag: "collected",
          label: "——抓到了",
          text: "你抓住了一捧「雨」字。她说：雨是抓不住的——但你今天抓住了。她说：有些东西，你抓得住，是因为它愿意让你抓。",
          add: { affection: { shiyu: 2, xiazhi: 1 } },
          personality: { brave: 2, kind: 1 },
          memory: { id: "集字·雨", title: "操场上的雨字", text: "你在飘落的樱花里抓住了五个「雨」字。" },
          next: "d3_focus" },
        { min: 0.4, tag: "ok",
          label: "——抓了几个",
          text: "你只抓住了几个「雨」字。她说：抓不全也是真的——樱花开得快，落得也快。你已经尽力了。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d3_focus" }
      ],
      fallback: { tag: "miss",
        label: "——没抓住",
        text: "你一个「雨」字都没抓住。她说：抓不住也是好的——证明雨不是你的，是它自己的。",
        next: "d3_focus" }
    }
  },

  // 光影对焦
  d3_focus: {
    day: 3, time: "evening", bg: "rooftop", char: null, speaker: "",
    text: "黄昏的天台上，远方樱花树下有一个人影。你眯起眼——画面是糊的。调整焦距，看清那人是谁。",
    next: "d3_scentmem",
    focus: {
      prompt: "调整焦距——让远方的画面变清晰",
      target: 0.5,
      thresholds: [
        { min: 0.85, tag: "clear",
          label: "——看清了",
          text: "画面慢慢清晰起来——樱花树下站着的是林诗雨。她没看你，看着远方。你想过去，但脚没动。她说：看清一个人，有时候比看不见更难。",
          add: { affection: { shiyu: 2, shen: 1 } },
          personality: { honest: 2, kind: 1 },
          memory: { id: "对焦·看清", title: "樱花树下的人", text: "你对焦看清了樱花树下站着的是林诗雨。" },
          next: "d3_scentmem" },
        { min: 0.5, tag: "ok",
          label: "——看了一半",
          text: "画面只清楚了一半——你看不清那人是谁。也许是她，也许不是。她说：模糊也好——不清不楚，反而能多看一会儿。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d3_scentmem" }
      ],
      fallback: { tag: "miss",
        label: "——没对上",
        text: "你完全没对上焦。人影还是一团模糊。她说：看不清也好——有些人，看清了反而难过。",
        next: "d3_scentmem" }
    }
  },

  // 气味记忆
  d3_scentmem: {
    day: 3, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "睡前，桌上摆着几个小瓶。她说过——闻一闻，记一记，明天让你辨认哪些是你今天闻过的。你打开每一个，记下气味。",
    next: "common_day4_morning",
    scentmem: {
      prompt: "辨认之前闻过的气味——选中你今天闻过的",
      samples: [
        { id: "s1", name: "樱花的气息", desc: "淡淡的，甜里有涩", icon: "🌸", isTarget: true },
        { id: "s2", name: "旧书的味道", desc: "纸的霉，带着岁月", icon: "📖", isTarget: true },
        { id: "s3", name: "海风的咸", desc: "咸湿，带着远处", icon: "🌊", isTarget: true },
        { id: "s4", name: "燃烧的香", desc: "焦糖似的，发苦", icon: "🔥", isTarget: false },
        { id: "s5", name: "铁锈的腥", desc: "尖锐，发凉", icon: "⚙️", isTarget: false },
        { id: "s6", name: "薄荷的凉", desc: "清凉，发麻", icon: "🍃", isTarget: false }
      ],
      thresholds: [
        { min: 0.85, tag: "remembered",
          label: "——记住了",
          text: "你把今天闻过的气味都认出来了。她说：嗅觉是最不会骗人的记忆——眼睛会忘，鼻子不会。你今天闻过的，明天还会记得。",
          add: { affection: { shiyu: 2, sunian: 1, shen: 1 } },
          personality: { honest: 2, kind: 1 },
          memory: { id: "气味·记忆", title: "夜里辨认的气味", text: "你在睡前辨认出了今天闻过的所有气味。" },
          next: "common_day4_morning" },
        { min: 0.5, tag: "ok",
          label: "——记了一半",
          text: "你只认出了一半的气味。她说：记一半也好——忘掉的那一半，也许是该忘的。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "common_day4_morning" }
      ],
      fallback: { tag: "miss",
        label: "——记错了",
        text: "你认错了大半。她说：记错也是真的——有些气味，闻过就忘。忘了的，本来就不重要。",
        next: "common_day4_morning" }
    }
  },

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
  sy_5: {
    day: 5, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨",
    text: "她没说什么。只是把稿纸原样放回去，做了一桌我最爱吃的菜。比骂我还可怕。",
    next: "sy_6",
    // v0.5.0 收件箱：诗雨半夜的私信
    inbox: {
      id: "msg_shiyu_night",
      char: "shiyu",
      from: "林诗雨",
      title: "凌晨三点的信",
      body: "我妈睡了我才能发。我没问她为什么没骂我。我怕一问，她就要哭了。我不知道该写下去还是停下来。",
      deadline: 45000,
      type: "free",
      hint: "回她一句…",
      matchings: [
        { id: "write_on",  keywords: ["写", "继续", "下去", "别停"], add: { affection: { shiyu: 2 } }, personality: { brave: 2, honest: 1 }, memory: { id: "诗雨·凌晨", text: "你说：写下去。她在屏幕那头点了头。" } },
        { id: "take_break", keywords: ["停", "歇", "陪", "睡", "休息"], add: { affection: { shiyu: 1 } }, personality: { kind: 2 }, memory: { id: "诗雨·凌晨", text: "你说：先睡吧。她合上了本子。" } },
      ]
    }
  },
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
  xz_6: {
    day: 5, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织",
    text: "不跑我去哪？回那个家？我爸小时候带我练跑，摔过一次膝盖，旧伤。我妈再婚之后，那已经不是我的家了。",
    next: "xz_7", set: { flag_xiazhi_injury: true },
    // v0.5.0 收件箱：夏织的私信（关于教练辞退）
    inbox: {
      id: "msg_xiazhi_coach",
      char: "xiazhi",
      from: "夏织",
      title: "教练的事",
      body: "教练上周把我辞了。他说我发挥不稳定。我不怪他。可我不知道——还能不能跑下去。你老实告诉我：我还有戏吗？30秒内回我。",
      deadline: 30000,
      type: "free",
      hint: "老实告诉她…",
      matchings: [
        { id: "yes_run",  keywords: ["能", "跑", "练", "可以", "有"], add: { affection: { xiazhi: 2 } }, personality: { brave: 2, honest: 1 }, memory: { id: "夏织·教练", text: "你说：你能跑。她笑了。" } },
        { id: "rest_first", keywords: ["停", "歇", "伤", "治", "休息"], add: { affection: { xiazhi: 1 } }, personality: { kind: 2 }, memory: { id: "夏织·教练", text: "你说：先治伤。她沉默了。" } },
      ]
    },
    // v0.5.0 朋友圈：夏织深夜动态
    moment: "m_d2_xiazhi"
  },
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
  sn_5: { day: 5, time: "morning", bg: "art_room", speaker: "沈屿", text: "什么是「你」？", next: "sn_5b" },
  // v0.5.0 涂鸦：让苏念画一笔自己
  sn_5b: {
    day: 5, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念",
    text: "……「我」？我不知道。我画了三年紫色，画到忘了自己本来想画什么。你能不能——帮我画一笔，让我看见「我」是谁？",
    next: "sn_6",
    doodle: {
      prompt: "帮苏念画一笔「她是谁」（涂鸦一笔，让她看见自己）",
      moodBonus: {
        "激动": { affection: { sunian: 2 } },
        "平静": { affection: { sunian: 2 } },
        "用力": { affection: { sunian: 1 } },
        "紧张": { affection: { sunian: 1 } },
        "克制": { affection: { sunian: 1 } }
      },
      moodJump: {
        "激动": "sn_5b_release",
        "平静": "sn_5b_calm"
      }
    }
  },
  sn_5b_release: { day: 5, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……这么用力的一笔。原来「我」可以是这种颜色。", next: "sn_6", memory: { id: "苏念·一笔", title: "她是谁", text: "你画的那一笔很用力。她第一次看见自己可以是这种颜色。" } },
  sn_5b_calm: { day: 5, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……这么安静的一笔。原来「我」也可以是这种姿势。", next: "sn_6", memory: { id: "苏念·一笔", title: "她是谁", text: "你画的那一笔很安静。她第一次看见自己也可以是这种姿势。" } },
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
