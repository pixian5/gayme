/* ========================================
   樱时信笺 · 剧本数据 (script.js)
   结构：序章 → 共通线 → 3女主个人线 × 2结局
   ======================================== */

/* ---- 角色定义 ---- */
const CHARACTERS = {
  shiyu:  { name: "林诗雨", color: "#a8c5e8", accent: "#6a8ec0" },
  xiazhi: { name: "夏织",   color: "#f0b878", accent: "#d89048" },
  sunian: { name: "苏念",   color: "#c8a8e0", accent: "#9070c0" },
  shen:   { name: "沈屿",   color: "#b8c8d0", accent: "#88a0b0" },
  teacher:{ name: "班主任",  color: "#c0c0a8", accent: "#909078" },
  mystery:{ name: "???",    color: "#d8d8d8", accent: "#a0a0a0" },
};

/* ---- 立绘 SVG（手绘风简约半身像） ---- */
const PORTRAITS = {
  shiyu: `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="syh" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2438"/><stop offset="1" stop-color="#161020"/>
    </linearGradient><linearGradient id="syu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a7aaa"/><stop offset="1" stop-color="#3a5a8a"/>
    </linearGradient></defs>
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
    <defs><linearGradient id="xzh" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a5a30"/><stop offset="1" stop-color="#5a3818"/>
    </linearGradient><linearGradient id="xzu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0a868"/><stop offset="1" stop-color="#d88848"/>
    </linearGradient></defs>
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
    <defs><linearGradient id="snh" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0e8ff"/><stop offset="0.5" stop-color="#b8a8e0"/><stop offset="1" stop-color="#7a68a8"/>
    </linearGradient><linearGradient id="snu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9a8ac8"/><stop offset="1" stop-color="#6a5a98"/>
    </linearGradient></defs>
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
    <defs><linearGradient id="shh" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3428"/><stop offset="1" stop-color="#1a1610"/>
    </linearGradient><linearGradient id="shu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7a8898"/><stop offset="1" stop-color="#4a5868"/>
    </linearGradient></defs>
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
};

/* ---- 场景标签（用于存档预览/显示） ---- */
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
  ending_good: "结局",
  ending_bad: "结局",
};

/* ============ 剧本节点 ============ */
const SCRIPT = {
  /* ===== 序章 ===== */
  prologue_1: {
    bg: "cherry_full",
    char: null,
    speaker: "",
    text: "四月的樱海学园，连风都染着粉白。",
    next: "prologue_2"
  },
  prologue_2: {
    bg: "cherry_full",
    speaker: "",
    text: "樱花从校门口一路铺到教学楼，像是有人提前替我铺好了红毯。",
    next: "prologue_3"
  },
  prologue_3: {
    bg: "school_gate",
    speaker: "",
    text: "我，沈屿，今天起是这里的转学生。手里攥着皱巴巴的入学通知书，胸口闷得发紧。",
    next: "prologue_4"
  },
  prologue_4: {
    bg: "school_gate",
    speaker: "",
    text: "教学楼的钟声响起来的时候，我还没找到教务处。",
    next: "prologue_5"
  },
  prologue_5: {
    bg: "hallway",
    chars: [{id:"shiyu", pos:"center"}],
    speaker: "???",
    text: "——同学，你挡在路中间了。",
    next: "prologue_6"
  },
  prologue_6: {
    bg: "hallway",
    speaker: "",
    text: "回过头，是个戴眼镜的女生，黑长直，臂弯里抱着一摞作业本。",
    next: "prologue_7"
  },
  prologue_7: {
    bg: "hallway",
    speaker: "林诗雨",
    text: "我是高二(3)班班长，林诗雨。你就是今天转来的沈屿吧？班主任让我来接你。",
    next: "prologue_8"
  },
  prologue_8: {
    bg: "hallway",
    char: "shiyu",
    speaker: "沈屿",
    text: "……麻烦你了。",
    next: "prologue_9"
  },
  prologue_9: {
    bg: "hallway",
    char: "shiyu",
    speaker: "林诗雨",
    text: "跟我来。座位我安排在你前面，看不清黑板就说一声。",
    next: "prologue_10",
    add: { affection: { shiyu: 1 } }
  },
  prologue_10: {
    bg: "classroom",
    char: null,
    speaker: "",
    text: "推开门的瞬间，整间教室的目光都甩了过来。",
    next: "prologue_11"
  },
  prologue_11: {
    bg: "classroom",
    speaker: "班主任",
    text: "都安静。这位是新转来的沈屿同学，希望大家多照顾。诗雨，带他到座位。",
    next: "prologue_12"
  },
  prologue_12: {
    bg: "classroom",
    speaker: "",
    text: "我坐下的那一刻，前面的林诗雨回过头，把一张校园地图推到我桌上。",
    next: "prologue_13"
  },
  prologue_13: {
    bg: "classroom",
    char: "shiyu",
    speaker: "林诗雨",
    text: "食堂、图书馆、医务室都标了。找不到就回来问我，别乱跑。",
    next: "prologue_14"
  },
  prologue_14: {
    bg: "classroom",
    speaker: "沈屿",
    text: "……谢谢。地图画得很清楚。",
    next: "prologue_15"
  },
  prologue_15: {
    bg: "classroom",
    char: "shiyu",
    speaker: "林诗雨",
    text: "嗯。",
    next: "prologue_16"
  },
  prologue_16: {
    bg: "classroom",
    speaker: "",
    text: "她转回去的瞬间，地图边角露出极小的一行字，像是被反复涂改过：「角色 A 推开门——」",
    next: "prologue_17"
  },
  prologue_17: {
    bg: "classroom",
    speaker: "沈屿",
    text: "（……角色 A？她在写什么？）",
    next: "prologue_18"
  },
  prologue_18: {
    bg: "classroom",
    char: "shiyu",
    speaker: "林诗雨",
    text: "看什么？上课了。",
    next: "prologue_19"
  },
  prologue_19: {
    bg: "classroom",
    speaker: "",
    text: "上午的课结束得很慢。下课铃一响，教室瞬间炸开。",
    next: "prologue_20"
  },
  prologue_20: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "转学生！正好——你是新来的对吧？田径社缺人，下午来试一下！",
    next: "prologue_21"
  },
  prologue_21: {
    bg: "field",
    speaker: "沈屿",
    text: "你是……？",
    next: "prologue_22"
  },
  prologue_22: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "夏织，田径社王牌兼招新委员！哇你腿挺长的，天生练短跑的料。",
    next: "prologue_23",
    add: { affection: { xiazhi: 1 } }
  },
  prologue_23: {
    bg: "field",
    speaker: "沈屿",
    text: "我没怎么跑过……",
    next: "prologue_24"
  },
  prologue_24: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "没事，下午放学来操场就行。不来我就去班里堵你！",
    next: "prologue_25"
  },
  prologue_25: {
    bg: "hallway",
    char: null,
    speaker: "",
    text: "她风一样地走了。我盯着那张被她塞进手里的传单，苦笑。",
    next: "prologue_26"
  },
  prologue_26: {
    bg: "hallway",
    speaker: "",
    text: "下午放学，我故意绕了远路，结果还是迷了路。",
    next: "prologue_27"
  },
  prologue_27: {
    bg: "art_room",
    char: "sunian",
    speaker: "???",
    text: "……别动。",
    next: "prologue_28"
  },
  prologue_28: {
    bg: "art_room",
    speaker: "",
    text: "推开半掩的门，画室里只有一个女生，对着画布发呆。她的头发是淡紫渐变，像被人泼了一桶月光。",
    next: "prologue_29"
  },
  prologue_29: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "门。你挡到光了。",
    next: "prologue_30"
  },
  prologue_30: {
    bg: "art_room",
    speaker: "沈屿",
    text: "抱歉，我迷路了……",
    next: "prologue_31"
  },
  prologue_31: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "美术室在东侧尽头。你走反了。出去时把门带上。",
    next: "prologue_32"
  },
  prologue_32: {
    bg: "art_room",
    speaker: "",
    text: "她连头都没回。画布上是一片未干的紫，像是把整个黄昏都压了进去。",
    next: "prologue_33"
  },
  prologue_33: {
    bg: "school_gate",
    char: null,
    speaker: "",
    text: "走出校门的时候，太阳已经压到海面上。樱花大道尽头是橘色的海。",
    next: "prologue_34"
  },
  prologue_34: {
    bg: "school_gate",
    speaker: "",
    text: "书包侧袋里多了一样东西——一张折成樱花瓣形状的信纸，没有署名。",
    next: "prologue_35"
  },
  prologue_35: {
    bg: "home_room",
    speaker: "",
    text: "「致转学生：第一个周末，请你做一个选择。樱海有三条未走完的路，你会走哪一条？」",
    next: "prologue_36"
  },
  prologue_36: {
    bg: "home_room",
    speaker: "沈屿",
    text: "……谁放的？",
    next: "common_1"
  },

  /* ===== 共通线 ===== */
  common_1: {
    bg: "classroom",
    speaker: "",
    text: "第二天，早自习。林诗雨的笔在纸上沙沙作响，写一会儿又涂掉。",
    next: "common_2"
  },
  common_2: {
    bg: "classroom",
    speaker: "",
    text: "夏织从前门探了个头进来，被她躲开了。苏念的座位是空的——听说美术社的人常翘早自习。",
    next: "common_3"
  },
  common_3: {
    bg: "classroom",
    speaker: "",
    text: "午休铃响。三张传单/便条几乎同时落到我桌上：图书馆、操场、美术室。",
    next: "common_choice"
  },
  common_choice: {
    bg: "classroom",
    char: null,
    choice: {
      prompt: "午休去哪里？",
      options: [
        { text: "去图书馆还书（林诗雨）", next: "c_library_1", add: { affection: { shiyu: 2 } } },
        { text: "去操场看看（夏织）",     next: "c_field_1",   add: { affection: { xiazhi: 2 } } },
        { text: "去美术室（苏念）",       next: "c_art_1",    add: { affection: { sunian: 2 } } },
      ]
    }
  },

  /* —— 图书馆分支 —— */
  c_library_1: {
    bg: "library",
    char: "shiyu",
    speaker: "",
    text: "图书馆二楼靠窗的位置，林诗雨正埋头抄写着什么。听到脚步声，她飞快把本子塞进抽屉。",
    next: "c_library_2"
  },
  c_library_2: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "……你来干嘛？",
    next: "c_library_3"
  },
  c_library_3: {
    bg: "library",
    speaker: "沈屿",
    text: "还书。顺便——你藏的那个本子，是在写小说？",
    next: "c_library_4"
  },
  c_library_4: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "……你看到了？",
    next: "c_library_5"
  },
  c_library_5: {
    bg: "library",
    speaker: "沈屿",
    text: "只看到「角色 A 推开门」。继续写下去吧，我不打扰你。",
    next: "c_library_6"
  },
  c_library_6: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "……没人知道我在写。家里希望我考法律系。如果让他们知道……",
    next: "c_library_7"
  },
  c_library_7: {
    bg: "library",
    speaker: "沈屿",
    text: "那你为什么还在写？",
    next: "c_library_8"
  },
  c_library_8: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "因为……不写的话，我会忘掉自己是谁。",
    next: "c_library_9",
    set: { flag_shiyu_secret: true }
  },
  c_library_9: {
    bg: "library",
    speaker: "",
    text: "窗外的樱花被风吹进图书馆，落在她摊开的稿纸上。她没去拂，只是看着它。",
    next: "common_after"
  },

  /* —— 操场分支 —— */
  c_field_1: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "来了来了！热身先跑两圈——欸你怎么脸那么白，没吃午饭？",
    next: "c_field_2"
  },
  c_field_2: {
    bg: "field",
    speaker: "沈屿",
    text: "吃了。你不用训练吗？",
    next: "c_field_3"
  },
  c_field_3: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "我？我现在是备战全国赛。教练说再不拿名次，特招名额就没了。",
    next: "c_field_4"
  },
  c_field_4: {
    bg: "field",
    speaker: "沈屿",
    text: "特招？",
    next: "c_field_5"
  },
  c_field_5: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "……嗯。家里那边，挺复杂的。只有跑出去，我才能——算了，不说了。陪我跑一组？",
    next: "c_field_6",
    set: { flag_xiazhi_family: true }
  },
  c_field_6: {
    bg: "field",
    speaker: "",
    text: "她的笑容在阳光底下很亮，可我总觉得那下面压着什么。",
    next: "c_field_7"
  },
  c_field_7: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "放心，我不会让你太惨的。来！",
    next: "common_after"
  },

  /* —— 美术室分支 —— */
  c_art_1: {
    bg: "art_room",
    char: "sunian",
    speaker: "",
    text: "美术室里只有苏念一人。画布上还是那片紫，但角落多了几道焦黑的划痕。",
    next: "c_art_2"
  },
  c_art_2: {
    bg: "art_room",
    speaker: "沈屿",
    text: "昨天那幅……还没画完？",
    next: "c_art_3"
  },
  c_art_3: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "画不完。它不让我画完。",
    next: "c_art_4"
  },
  c_art_4: {
    bg: "art_room",
    speaker: "沈屿",
    text: "什么叫——它不让你画完？",
    next: "c_art_5"
  },
  c_art_5: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "从去年省展拿了金奖之后，我就再没完成过一幅。他们说我是天才。可天才不该卡在草稿里三年。",
    next: "c_art_6",
    set: { flag_sunian_block: true }
  },
  c_art_6: {
    bg: "art_room",
    speaker: "沈屿",
    text: "也许你不是画不完，是不敢画完。画完了，就得证明下一幅还能更好。",
    next: "c_art_7"
  },
  c_art_7: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "……",
    next: "c_art_8"
  },
  c_art_8: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "你这种话，别人没说过。出去吧，让我一个人待一会儿。",
    next: "common_after"
  },

  /* —— 共通收束 —— */
  common_after: {
    bg: "home_room",
    char: null,
    speaker: "",
    text: "周末到了。匿名信还在抽屉里，那个问题像一根刺：「三条未走完的路，你会走哪一条？」",
    next: "common_route_check"
  },
  common_route_check: {
    // 根据好感度决定路线
    if: { var: "affection.shiyu", gte: 2, then: "route_shiyu_1" },
    else: "common_check_xiazhi"
  },
  common_check_xiazhi: {
    if: { var: "affection.xiazhi", gte: 2, then: "route_xiazhi_1" },
    else: "common_check_sunian"
  },
  common_check_sunian: {
    if: { var: "affection.sunian", gte: 2, then: "route_sunian_1" },
    else: "common_default"
  },
  common_default: {
    // 兜底：谁都没选，让玩家选
    bg: "home_room",
    choice: {
      prompt: "这个周末，去见谁？",
      options: [
        { text: "图书馆找林诗雨", next: "route_shiyu_1" },
        { text: "操场找夏织",     next: "route_xiazhi_1" },
        { text: "美术室找苏念",   next: "route_sunian_1" },
      ]
    }
  },

  /* ============ 林诗雨线 ============ */
  route_shiyu_1: {
    bg: "library",
    char: "shiyu",
    speaker: "",
    text: "周六的图书馆几乎没人。林诗雨坐在老位置，面前的稿纸已经积了厚厚一叠。",
    next: "shiyu_2"
  },
  shiyu_2: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "你来了。我以为你不会来。",
    next: "shiyu_3"
  },
  shiyu_3: {
    bg: "library",
    speaker: "沈屿",
    text: "你说不写会忘掉自己。我来看看，你还记不记得自己。",
    next: "shiyu_4"
  },
  shiyu_4: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "……你知道吗，我妈昨天翻了我的书包。",
    next: "shiyu_5"
  },
  shiyu_5: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "她没说什么。只是把那一叠稿纸原样放回去，然后做了一桌我最爱吃的菜。比骂我还可怕。",
    next: "shiyu_6"
  },
  shiyu_6: {
    bg: "library",
    speaker: "沈屿",
    text: "她爱你，只是用错了方式。",
    next: "shiyu_7"
  },
  shiyu_7: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "我知道。可那方式压了我十七年。",
    next: "shiyu_8"
  },
  shiyu_8: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "我这本小说，写的是一个优等生在毕业前消失了。所有人都觉得她去了好大学，只有她自己知道，她去了很远的地方。",
    next: "shiyu_9"
  },
  shiyu_9: {
    bg: "library",
    speaker: "沈屿",
    text: "你想给她一个结局吗？",
    next: "shiyu_10"
  },
  shiyu_10: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "我想。但我写不出。每次写到她消失那一刻，我的手就停了。",
    next: "shiyu_11"
  },
  shiyu_11: {
    bg: "library",
    speaker: "",
    text: "她把稿纸推到我面前。最末一行：「她回过头，看见了自己从未活过的人生。」",
    next: "shiyu_choice_1"
  },
  shiyu_choice_1: {
    bg: "library",
    choice: {
      prompt: "怎么回应她？",
      options: [
        { text: "那就让她回头之后，开始活下去。", next: "shiyu_12_good", add: { affection: { shiyu: 3 } } },
        { text: "也许她真的该消失一次。",         next: "shiyu_12_bad",  add: { flag_shiyu_quit: true } }
      ]
    }
  },
  shiyu_12_good: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "……活下去？",
    next: "shiyu_13_good"
  },
  shiyu_13_good: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "原来可以这么写啊。让她回头，然后活下去。",
    next: "shiyu_14_good"
  },
  shiyu_14_good: {
    bg: "cherry_full",
    char: "shiyu",
    speaker: "",
    text: "一个月后，林诗雨把稿子投给了学校的文学杂志。封面上印着她的笔名。",
    next: "shiyu_15_good"
  },
  shiyu_15_good: {
    bg: "cherry_full",
    char: "shiyu",
    speaker: "林诗雨",
    text: "我妈昨天看了。她哭了很久，然后说——再写一本。",
    next: "shiyu_ending_good"
  },
  shiyu_ending_good: {
    bg: "ending_good",
    char: "shiyu",
    speaker: "",
    text: "那年樱花开尽之前，她把那本小说的样书塞进我手里。扉页上写着：「献给那个让我回头的人」。",
    ending: {
      id: "shiyu_good",
      type: "GOOD ENDING",
      title: "回 头",
      text: "她终于敢回头，看见自己开始活下去。"
    }
  },
  shiyu_12_bad: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "……消失一次。",
    next: "shiyu_13_bad"
  },
  shiyu_13_bad: {
    bg: "library",
    char: "shiyu",
    speaker: "林诗雨",
    text: "也对。也许她真的该消失一次。",
    next: "shiyu_14_bad"
  },
  shiyu_14_bad: {
    bg: "rain",
    char: null,
    speaker: "",
    text: "一周后的雨天，林诗雨没有来上学。课桌上只留了一张便条：「转学了。谢谢你来图书馆。」",
    next: "shiyu_15_bad"
  },
  shiyu_15_bad: {
    bg: "library",
    char: null,
    speaker: "",
    text: "抽屉里那一叠稿纸，最末一行永远停在那里：「她回过头，看见了自己从未活过的人生。」",
    next: "shiyu_ending_bad"
  },
  shiyu_ending_bad: {
    bg: "ending_bad",
    char: null,
    speaker: "",
    text: "我再也没有见过她。听说她去了北方一座很远的城市，读了她不喜欢的法律系。",
    ending: {
      id: "shiyu_bad",
      type: "BAD ENDING",
      title: "未 活 过",
      text: "她回过头，看见的依然是没走过的人生。"
    }
  },

  /* ============ 夏织线 ============ */
  route_xiazhi_1: {
    bg: "field",
    char: "xiazhi",
    speaker: "",
    text: "周末的操场空旷。夏织一个人在跑道上，影子被太阳拉得很长。",
    next: "xz_2"
  },
  xz_2: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "你来啦？正好，帮我计个时。",
    next: "xz_3"
  },
  xz_3: {
    bg: "field",
    speaker: "沈屿",
    text: "你一个人练？教练呢？",
    next: "xz_4"
  },
  xz_4: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "教练上周辞退我了。他说我发挥不稳定，浪费特招名额。",
    next: "xz_5"
  },
  xz_5: {
    bg: "field",
    speaker: "沈屿",
    text: "那你还跑？",
    next: "xz_6"
  },
  xz_6: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "不跑我去哪？回那个家？我妈再婚之后，那已经不是我的家了。",
    next: "xz_7"
  },
  xz_7: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "我爸每个月打一次钱过来，附带一句「最近怎么样」。我每次都回「挺好的」。这是我俩的默契。",
    next: "xz_8"
  },
  xz_8: {
    bg: "field",
    speaker: "",
    text: "她说着笑起来，眼睛却红了一圈。",
    next: "xz_9"
  },
  xz_9: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "全国赛下个月。我自己报名的，没教练。你愿意——陪我练到那天吗？",
    next: "xz_choice_1"
  },
  xz_choice_1: {
    bg: "field",
    choice: {
      prompt: "怎么回答？",
      options: [
        { text: "我陪你。一直陪你到终点线。", next: "xz_10_good", add: { affection: { xiazhi: 3 } } },
        { text: "你不需要别人陪，你自己就够了。", next: "xz_10_bad", add: { flag_xiazhi_alone: true } }
      ]
    }
  },
  xz_10_good: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "……终点线啊。好。",
    next: "xz_11_good"
  },
  xz_11_good: {
    bg: "summer",
    char: "xiazhi",
    speaker: "",
    text: "整整一个月，我们清晨练起跑，黄昏练冲刺。她的成绩一点点回来，比之前更快。",
    next: "xz_12_good"
  },
  xz_12_good: {
    bg: "summer",
    char: "xiazhi",
    speaker: "夏织",
    text: "今天跑进了 11.8。沈屿——我没跑过这么快。",
    next: "xz_13_good"
  },
  xz_13_good: {
    bg: "summer",
    char: "xiazhi",
    speaker: "夏织",
    text: "全国赛那天，你来当我的场外。我不需要教练，我需要你站在终点等我。",
    next: "xz_14_good"
  },
  xz_14_good: {
    bg: "summer",
    char: "xiazhi",
    speaker: "",
    text: "发令枪响那一刻，她第一个冲出去。一百米，十一个对手，最后她以第二名撞线。",
    next: "xz_15_good"
  },
  xz_15_good: {
    bg: "ending_good",
    char: "xiazhi",
    speaker: "夏织",
    text: "——第二名。沈屿，第二名！",
    next: "xz_ending_good"
  },
  xz_ending_good: {
    bg: "ending_good",
    char: "xiazhi",
    speaker: "",
    text: "她扑进我怀里，笑着哭。她说：「原来被人等在终点，是这种感觉。」",
    ending: {
      id: "xiazhi_good",
      type: "GOOD ENDING",
      title: "终 点 线",
      text: "她第一次相信，跑出去和有人等着，可以同时发生。"
    }
  },
  xz_10_bad: {
    bg: "field",
    char: "xiazhi",
    speaker: "夏织",
    text: "……对。我自己就够了。",
    next: "xz_11_bad"
  },
  xz_11_bad: {
    bg: "rain",
    char: "xiazhi",
    speaker: "",
    text: "全国赛前一周，她在雨里独自加练。我没去。听说她摔了一跤，膝盖磕在跑道沿上。",
    next: "xz_12_bad"
  },
  xz_12_bad: {
    bg: "winter",
    char: null,
    speaker: "",
    text: "韧带拉伤。医生说至少半年不能跑。全国赛的名额转给了别人。",
    next: "xz_13_bad"
  },
  xz_13_bad: {
    bg: "winter",
    char: null,
    speaker: "",
    text: "她在医院给我发了一条消息：「你说得对，我自己就够了。可惜我自己不够。」",
    next: "xz_ending_bad"
  },
  xz_ending_bad: {
    bg: "ending_bad",
    char: null,
    speaker: "",
    text: "她休学了。听说是回了她爸那边。再后来，田径社的招新传单上，王牌那一栏空着。",
    ending: {
      id: "xiazhi_bad",
      type: "BAD ENDING",
      title: "一 个 人",
      text: "她终于一个人了。可一个人，从来不是她想要的。"
    }
  },

  /* ============ 苏念线 ============ */
  route_sunian_1: {
    bg: "art_room",
    char: "sunian",
    speaker: "",
    text: "周末的美术室，窗帘半拉着。苏念坐在地上， surrounded by 揉成团的草稿。",
    next: "sn_2"
  },
  sn_2: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "你又来了。",
    next: "sn_3"
  },
  sn_3: {
    bg: "art_room",
    speaker: "沈屿",
    text: "你说画不完。我来看看，是不是真的画不完。",
    next: "sn_4"
  },
  sn_4: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "省展邀请函上个月寄来的。让我交一幅新作。我答应了，然后——",
    next: "sn_5"
  },
  sn_5: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "然后我撕了四十七张草稿。每一张都差一点。差那一点，就不是我。",
    next: "sn_6"
  },
  sn_6: {
    bg: "art_room",
    speaker: "沈屿",
    text: "什么是「你」？",
    next: "sn_7"
  },
  sn_7: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "我不知道。这就是问题。我画了三年，画到忘了自己本来想画什么。",
    next: "sn_8"
  },
  sn_8: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "你看这幅——",
    next: "sn_9"
  },
  sn_9: {
    bg: "art_room",
    speaker: "",
    text: "她把那张未完成的紫推到我面前。我第一次看清：那片紫里，藏着一只翅膀，半张脸，一只手。",
    next: "sn_10"
  },
  sn_10: {
    bg: "art_room",
    speaker: "沈屿",
    text: "这不是一片紫。这是一个人想从紫里挣出来，但被你按住了。",
    next: "sn_11"
  },
  sn_11: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "……你看见了？",
    next: "sn_choice_1"
  },
  sn_choice_1: {
    bg: "art_room",
    choice: {
      prompt: "怎么对她说？",
      options: [
        { text: "松手。让她出来。", next: "sn_12_good", add: { affection: { sunian: 3 } } },
        { text: "也许她本来就不该出来。", next: "sn_12_bad", add: { flag_sunian_quit: true } }
      ]
    }
  },
  sn_12_good: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "松手……",
    next: "sn_13_good"
  },
  sn_13_good: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "好。我试试。",
    next: "sn_14_good"
  },
  sn_14_good: {
    bg: "autumn",
    char: "sunian",
    speaker: "",
    text: "接下来一个月，她每天画到深夜。我不打扰她，只在她画画时坐在角落看书。",
    next: "sn_15_good"
  },
  sn_15_good: {
    bg: "autumn",
    char: "sunian",
    speaker: "苏念",
    text: "画完了。",
    next: "sn_16_good"
  },
  sn_16_good: {
    bg: "autumn",
    char: "sunian",
    speaker: "",
    text: "画布上，一个人正从一片紫里挣出来，半身，眼神是亮的。她给它取名《挣》。",
    next: "sn_17_good"
  },
  sn_17_good: {
    bg: "ending_good",
    char: "sunian",
    speaker: "苏念",
    text: "省展那天，它被放在入口第一幅。沈屿——是你让它出来的。",
    next: "sn_ending_good"
  },
  sn_ending_good: {
    bg: "ending_good",
    char: "sunian",
    speaker: "",
    text: "她在画旁站了很久，第一次没有撕掉自己的作品。她说：「原来被看见，是这种感觉。」",
    ending: {
      id: "sunian_good",
      type: "GOOD ENDING",
      title: "挣",
      text: "她终于松开了按住自己的那只手。"
    }
  },
  sn_12_bad: {
    bg: "art_room",
    char: "sunian",
    speaker: "苏念",
    text: "……不该出来。对。也许她本来就不该出来。",
    next: "sn_13_bad"
  },
  sn_13_bad: {
    bg: "winter",
    char: null,
    speaker: "",
    text: "她把那张画布翻了过来，背面朝外。从此再没打开过那间美术室的门。",
    next: "sn_14_bad"
  },
  sn_14_bad: {
    bg: "winter",
    char: null,
    speaker: "",
    text: "省展那天，她的位置是空的。主办方说，她打电话退出了。",
    next: "sn_15_bad"
  },
  sn_15_bad: {
    bg: "ending_bad",
    char: null,
    speaker: "",
    text: "她休学了。美术室的钥匙交给了门卫。临走前她发了一条朋友圈：「天才卡在草稿里，原来是真的。」",
    next: "sn_ending_bad"
  },
  sn_ending_bad: {
    bg: "ending_bad",
    char: null,
    speaker: "",
    text: "再没有人见过那张紫。它和它的主人，一起被按进了海里。",
    ending: {
      id: "sunian_bad",
      type: "BAD ENDING",
      title: "按 住",
      text: "她松不开自己的手，于是连自己也一起按了下去。"
    }
  },
};

/* ---- 全部结局定义（供图鉴使用） ---- */
const ENDINGS = [
  { id: "shiyu_good",   heroine: "林诗雨", title: "回 头",   type: "GOOD", desc: "她终于敢回头。" },
  { id: "shiyu_bad",    heroine: "林诗雨", title: "未 活 过", type: "BAD",  desc: "她回过头，看见的依然没走过。" },
  { id: "xiazhi_good",  heroine: "夏织",   title: "终 点 线", type: "GOOD", desc: "有人等在终点。" },
  { id: "xiazhi_bad",   heroine: "夏织",   title: "一 个 人", type: "BAD",  desc: "她终于一个人了。" },
  { id: "sunian_good",  heroine: "苏念",   title: "挣",     type: "GOOD", desc: "她松开了手。" },
  { id: "sunian_bad",   heroine: "苏念",   title: "按 住",   type: "BAD",  desc: "她按住了自己。" },
];

/* ---- 入口节点 ---- */
const START_NODE = "prologue_1";
