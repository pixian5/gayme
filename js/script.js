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
  shiyu: `<svg viewBox="0 0 240 360" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sy_hair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a3452"/><stop offset="0.55" stop-color="#262138"/><stop offset="1" stop-color="#151022"/>
      </linearGradient>
      <linearGradient id="sy_hair2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#5a5478" stop-opacity="0.55"/><stop offset="1" stop-color="#262138" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="sy_face" cx="0.5" cy="0.42" r="0.75">
        <stop offset="0" stop-color="#fdeade"/><stop offset="0.8" stop-color="#f6dccb"/><stop offset="1" stop-color="#eec9b4"/>
      </radialGradient>
      <linearGradient id="sy_iris" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7fa8d8"/><stop offset="0.6" stop-color="#4a6ea8"/><stop offset="1" stop-color="#2a3f68"/>
      </linearGradient>
      <linearGradient id="sy_uniform" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#33415e"/><stop offset="1" stop-color="#1f2940"/>
      </linearGradient>
    </defs>
    <!-- 后发 -->
    <path d="M56,110 C50,52 88,26 120,26 C152,26 190,52 184,110 C182,150 188,196 194,246 L178,246 C176,206 172,170 170,150 L70,150 C68,170 64,206 62,246 L46,246 C52,196 58,150 56,110 Z" fill="url(#sy_hair)"/>
    <path d="M56,110 C52,60 88,28 120,28 C152,28 188,60 184,110 L184,140 L56,140 Z" fill="url(#sy_hair2)"/>
    <!-- 颈 -->
    <path d="M106,140 L134,140 L134,168 C134,178 106,178 106,168 Z" fill="#eec9b4"/>
    <path d="M106,146 C114,152 126,152 134,146 L134,158 C126,164 114,164 106,158 Z" fill="#dfb49c" opacity="0.7"/>
    <!-- 身体：校服 -->
    <path d="M120,160 C158,160 196,190 202,250 L206,360 L34,360 L38,250 C44,190 82,160 120,160 Z" fill="url(#sy_uniform)"/>
    <!-- 白衬衫领 -->
    <path d="M100,158 L120,186 L140,158 C134,150 106,150 100,158 Z" fill="#f4f6f8"/>
    <path d="M100,158 L120,186 L108,192 L92,166 Z" fill="#e2e6ea"/>
    <path d="M140,158 L120,186 L132,192 L148,166 Z" fill="#e2e6ea"/>
    <!-- 水色领结 -->
    <path d="M120,190 L104,182 L104,202 Z" fill="#a8c5e8"/>
    <path d="M120,190 L136,182 L136,202 Z" fill="#a8c5e8"/>
    <circle cx="120" cy="192" r="5" fill="#6a8ec0"/>
    <!-- 外套衣襟与褶皱 -->
    <path d="M96,176 C86,196 80,232 78,262 L64,262 C66,224 76,192 88,172 Z" fill="#1a2236" opacity="0.8"/>
    <path d="M144,176 C154,196 160,232 162,262 L176,262 C174,224 164,192 152,172 Z" fill="#1a2236" opacity="0.8"/>
    <path d="M60,290 L180,290" stroke="#16203a" stroke-width="2" opacity="0.5"/>
    <path d="M52,318 L188,318" stroke="#16203a" stroke-width="2" opacity="0.4"/>
    <!-- 脸 -->
    <path d="M120,44 C150,44 166,66 166,94 C166,120 152,146 120,150 C88,146 74,120 74,94 C74,66 90,44 120,44 Z" fill="url(#sy_face)"/>
    <!-- 耳 -->
    <ellipse cx="75" cy="104" rx="7" ry="10" fill="#f0d2bc"/>
    <ellipse cx="165" cy="104" rx="7" ry="10" fill="#f0d2bc"/>
    <!-- 刘海 -->
    <path d="M120,28 C86,28 68,54 70,88 C70,96 72,102 74,108 C78,92 84,80 92,74 C88,88 88,98 90,106 C96,90 104,78 114,72 C110,84 110,94 112,102 C120,86 130,76 142,70 C140,82 142,92 146,100 C152,86 158,78 166,76 C170,88 170,100 168,110 C172,100 174,92 172,84 C170,52 152,28 120,28 Z" fill="url(#sy_hair)"/>
    <!-- 发丝高光 -->
    <path d="M92,38 C80,48 74,64 74,80" stroke="#8a84b0" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
    <path d="M148,36 C162,46 168,62 168,78" stroke="#8a84b0" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
    <path d="M104,34 C98,40 94,50 92,60" stroke="#6a6490" stroke-width="1.6" fill="none" opacity="0.45" stroke-linecap="round"/>
    <path d="M136,34 C142,40 146,50 148,60" stroke="#6a6490" stroke-width="1.6" fill="none" opacity="0.45" stroke-linecap="round"/>
    <!-- 眉 -->
    <path d="M86,96 C92,92 100,92 106,95" stroke="#3a3450" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M134,95 C140,92 148,92 154,96" stroke="#3a3450" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <!-- 眼 -->
    <path d="M84,104 C88,98 100,98 105,104" stroke="#241f38" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M135,104 C140,98 152,98 156,104" stroke="#241f38" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="94" cy="112" rx="9" ry="10.5" fill="url(#sy_iris)"/>
    <ellipse cx="145" cy="112" rx="9" ry="10.5" fill="url(#sy_iris)"/>
    <circle cx="94" cy="113" r="4" fill="#1a2438"/>
    <circle cx="145" cy="113" r="4" fill="#1a2438"/>
    <circle cx="91" cy="108" r="2.6" fill="#ffffff"/>
    <circle cx="142" cy="108" r="2.6" fill="#ffffff"/>
    <circle cx="97" cy="116" r="1.4" fill="#ffffff" opacity="0.8"/>
    <circle cx="148" cy="116" r="1.4" fill="#ffffff" opacity="0.8"/>
    <path d="M85,118 C89,121 100,121 104,118" stroke="#c8a090" stroke-width="1.4" fill="none" opacity="0.7"/>
    <path d="M136,118 C140,121 151,121 155,118" stroke="#c8a090" stroke-width="1.4" fill="none" opacity="0.7"/>
    <!-- 眼镜 -->
    <rect x="82" y="100" width="25" height="21" rx="10" fill="none" stroke="#8a94a8" stroke-width="2"/>
    <rect x="133" y="100" width="25" height="21" rx="10" fill="none" stroke="#8a94a8" stroke-width="2"/>
    <path d="M107,108 L133,108" stroke="#8a94a8" stroke-width="2"/>
    <path d="M82,106 L76,104 M158,106 L164,104" stroke="#8a94a8" stroke-width="2"/>
    <path d="M85,103 L98,118" stroke="#ffffff" stroke-width="1.6" opacity="0.35"/>
    <path d="M136,103 L149,118" stroke="#ffffff" stroke-width="1.6" opacity="0.35"/>
    <!-- 鼻与嘴 -->
    <path d="M119,124 L121,130 L118,131" stroke="#dfb49c" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M112,138 C116,141 124,141 128,138" stroke="#c87878" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <!-- 腮红 -->
    <ellipse cx="86" cy="126" rx="8" ry="4" fill="#f0a8a0" opacity="0.35"/>
    <ellipse cx="154" cy="126" rx="8" ry="4" fill="#f0a8a0" opacity="0.35"/>
    <!-- 前发侧束（盖在眼镜腿上） -->
    <path d="M70,86 C66,110 68,140 62,168 C72,150 76,120 76,100 Z" fill="url(#sy_hair)"/>
    <path d="M170,86 C174,110 172,140 178,168 C168,150 164,120 164,100 Z" fill="url(#sy_hair)"/>
    <!-- 轮廓光 -->
    <path d="M74,92 C74,66 92,46 118,42" stroke="#c8c4e0" stroke-width="2" fill="none" opacity="0.35" stroke-linecap="round"/>
    <path d="M46,246 C44,220 48,180 56,150" stroke="#9a94c0" stroke-width="1.6" fill="none" opacity="0.3"/>
  </svg>`,

  xiazhi: `<svg viewBox="0 0 240 360" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="xz_hair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a06a38"/><stop offset="0.55" stop-color="#8a5a30"/><stop offset="1" stop-color="#5a3818"/>
      </linearGradient>
      <linearGradient id="xz_hair2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d88848" stop-opacity="0.5"/><stop offset="1" stop-color="#8a5a30" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="xz_face" cx="0.5" cy="0.42" r="0.75">
        <stop offset="0" stop-color="#ffe8d4"/><stop offset="0.8" stop-color="#f8d4b8"/><stop offset="1" stop-color="#eec2a4"/>
      </radialGradient>
      <linearGradient id="xz_iris" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e8a058"/><stop offset="0.6" stop-color="#c87838"/><stop offset="1" stop-color="#8a4f20"/>
      </linearGradient>
      <linearGradient id="xz_uniform" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a4560"/><stop offset="1" stop-color="#232c44"/>
      </linearGradient>
    </defs>
    <!-- 高马尾（左后甩） -->
    <path d="M64,96 C40,110 30,150 36,196 C40,226 52,252 70,266 C60,240 58,208 62,180 C64,160 70,130 78,116 Z" fill="url(#xz_hair)"/>
    <path d="M64,96 C46,112 38,152 44,192" stroke="#d88848" stroke-width="2.4" fill="none" opacity="0.5" stroke-linecap="round"/>
    <!-- 后发 -->
    <path d="M60,104 C56,58 88,28 120,28 C152,28 184,58 180,104 L180,148 C176,158 164,164 156,166 L84,166 C76,164 64,158 60,148 Z" fill="url(#xz_hair)"/>
    <path d="M60,104 C58,64 88,32 120,32 C152,32 182,64 180,104 L180,130 L60,130 Z" fill="url(#xz_hair2)"/>
    <!-- 颈 -->
    <path d="M106,140 L134,140 L134,168 C134,178 106,178 106,168 Z" fill="#eec2a4"/>
    <path d="M106,146 C114,152 126,152 134,146 L134,158 C126,164 114,164 106,158 Z" fill="#dfae92" opacity="0.7"/>
    <!-- 身体：校服外套敞开 + 橙色运动衫 -->
    <path d="M120,160 C158,160 196,190 202,250 L206,360 L34,360 L38,250 C44,190 82,160 120,160 Z" fill="url(#xz_uniform)"/>
    <path d="M120,168 C136,168 152,176 158,190 L142,238 C132,232 108,232 98,238 L82,190 C88,176 104,168 120,168 Z" fill="#f0a858"/>
    <path d="M120,168 L120,232" stroke="#d88848" stroke-width="2"/>
    <!-- 白衬衫领 -->
    <path d="M100,158 L120,186 L140,158 C134,150 106,150 100,158 Z" fill="#f4f6f8"/>
    <path d="M100,158 L120,186 L108,192 L92,166 Z" fill="#e2e6ea"/>
    <path d="M140,158 L120,186 L132,192 L148,166 Z" fill="#e2e6ea"/>
    <!-- 领结 -->
    <path d="M120,190 L106,183 L106,201 Z" fill="#d87050"/>
    <path d="M120,190 L134,183 L134,201 Z" fill="#d87050"/>
    <circle cx="120" cy="192" r="4.5" fill="#a85038"/>
    <!-- 外套衣襟 -->
    <path d="M94,178 C84,198 78,232 76,262 L62,262 C64,224 74,192 86,172 Z" fill="#1a2236" opacity="0.8"/>
    <path d="M146,178 C156,198 162,232 164,262 L178,262 C176,224 166,192 154,172 Z" fill="#1a2236" opacity="0.8"/>
    <path d="M58,292 L182,292" stroke="#182035" stroke-width="2" opacity="0.5"/>
    <!-- 脸 -->
    <path d="M120,44 C150,44 166,66 166,94 C166,120 152,146 120,150 C88,146 74,120 74,94 C74,66 90,44 120,44 Z" fill="url(#xz_face)"/>
    <!-- 耳 -->
    <ellipse cx="75" cy="104" rx="7" ry="10" fill="#f2c8a8"/>
    <ellipse cx="165" cy="104" rx="7" ry="10" fill="#f2c8a8"/>
    <!-- 刘海（斜扫，动感） -->
    <path d="M120,28 C86,28 68,54 70,88 C70,98 73,106 76,112 C80,94 88,80 98,72 C96,86 98,96 102,104 C110,88 120,76 132,70 C130,84 132,94 136,102 C144,88 152,80 160,78 C166,88 168,100 166,110 C172,96 172,84 170,80 C166,50 150,28 120,28 Z" fill="url(#xz_hair)"/>
    <path d="M98,72 C92,82 88,94 87,104" stroke="#e8a868" stroke-width="2" fill="none" opacity="0.55" stroke-linecap="round"/>
    <path d="M132,70 C130,82 131,92 134,100" stroke="#e8a868" stroke-width="2" fill="none" opacity="0.55" stroke-linecap="round"/>
    <!-- 呆毛 -->
    <path d="M118,30 C122,20 132,16 140,20 C132,20 126,24 124,32 Z" fill="url(#xz_hair)"/>
    <!-- 眉（有精神的上挑） -->
    <path d="M86,93 C92,88 100,88 106,92" stroke="#6a4320" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M134,92 C140,88 148,88 154,93" stroke="#6a4320" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <!-- 眼（亮） -->
    <path d="M84,103 C88,96 100,96 105,103" stroke="#3a2412" stroke-width="4.2" fill="none" stroke-linecap="round"/>
    <path d="M135,103 C140,96 152,96 156,103" stroke="#3a2412" stroke-width="4.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="94" cy="112" rx="9.5" ry="11" fill="url(#xz_iris)"/>
    <ellipse cx="145" cy="112" rx="9.5" ry="11" fill="url(#xz_iris)"/>
    <circle cx="94" cy="113" r="4.2" fill="#2a1808"/>
    <circle cx="145" cy="113" r="4.2" fill="#2a1808"/>
    <circle cx="91" cy="107" r="2.8" fill="#ffffff"/>
    <circle cx="142" cy="107" r="2.8" fill="#ffffff"/>
    <circle cx="98" cy="117" r="1.5" fill="#ffffff" opacity="0.85"/>
    <circle cx="149" cy="117" r="1.5" fill="#ffffff" opacity="0.85"/>
    <path d="M85,119 C89,122 100,122 104,119" stroke="#d89878" stroke-width="1.4" fill="none" opacity="0.7"/>
    <path d="M136,119 C140,122 151,122 155,119" stroke="#d89878" stroke-width="1.4" fill="none" opacity="0.7"/>
    <!-- 鼻与嘴（开朗张笑） -->
    <path d="M119,124 L121,130 L118,131" stroke="#dfae92" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M111,136 C114,144 126,144 129,136 C126,139 114,139 111,136 Z" fill="#b85840"/>
    <path d="M111,136 C114,138 126,138 129,136" stroke="#8a4030" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <!-- 腮红（运动红晕，明显） -->
    <ellipse cx="84" cy="125" rx="9" ry="4.5" fill="#f09070" opacity="0.45"/>
    <ellipse cx="156" cy="125" rx="9" ry="4.5" fill="#f09070" opacity="0.45"/>
    <!-- 前发侧束 -->
    <path d="M70,86 C66,110 68,138 62,164 C72,146 76,118 76,98 Z" fill="url(#xz_hair)"/>
    <path d="M170,86 C174,110 172,138 178,164 C168,146 164,118 164,98 Z" fill="url(#xz_hair)"/>
    <!-- 轮廓光 -->
    <path d="M74,92 C74,66 92,46 118,42" stroke="#f8d8b0" stroke-width="2" fill="none" opacity="0.4" stroke-linecap="round"/>
    <path d="M46,246 C44,220 48,180 56,150" stroke="#d88848" stroke-width="1.6" fill="none" opacity="0.35"/>
  </svg>`,

  sunian: `<svg viewBox="0 0 240 360" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sn_hair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c8b8ec"/><stop offset="0.5" stop-color="#a898d8"/><stop offset="1" stop-color="#7a68b0"/>
      </linearGradient>
      <linearGradient id="sn_hair2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#e8e0f8" stop-opacity="0.6"/><stop offset="1" stop-color="#a898d8" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="sn_face" cx="0.5" cy="0.42" r="0.75">
        <stop offset="0" stop-color="#fdeee2"/><stop offset="0.8" stop-color="#f6dccd"/><stop offset="1" stop-color="#ecc8b8"/>
      </radialGradient>
      <linearGradient id="sn_iris" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#b09ae0"/><stop offset="0.6" stop-color="#8a72c8"/><stop offset="1" stop-color="#5a4898"/>
      </linearGradient>
      <linearGradient id="sn_uniform" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#443c60"/><stop offset="1" stop-color="#2c2545"/>
      </linearGradient>
    </defs>
    <!-- 后发（长直发，垂到画面底部） -->
    <path d="M58,104 C52,50 88,26 120,26 C152,26 188,50 182,104 C184,160 190,240 196,360 L164,360 C168,280 170,200 168,152 L72,152 C70,200 72,280 76,360 L44,360 C50,240 56,160 58,104 Z" fill="url(#sn_hair)"/>
    <path d="M58,104 C54,56 88,28 120,28 C152,28 186,56 182,104 L182,136 L58,136 Z" fill="url(#sn_hair2)"/>
    <!-- 发丝 -->
    <path d="M62,120 C60,180 58,260 60,340" stroke="#d8ccf0" stroke-width="1.8" fill="none" opacity="0.4"/>
    <path d="M178,120 C180,180 182,260 180,340" stroke="#d8ccf0" stroke-width="1.8" fill="none" opacity="0.4"/>
    <path d="M70,110 C66,170 66,250 70,330" stroke="#9a8ac8" stroke-width="1.5" fill="none" opacity="0.35"/>
    <!-- 颈 -->
    <path d="M106,140 L134,140 L134,168 C134,178 106,178 106,168 Z" fill="#ecc8b8"/>
    <path d="M106,146 C114,152 126,152 134,146 L134,158 C126,164 114,164 106,158 Z" fill="#dfb4a0" opacity="0.7"/>
    <!-- 身体：校服 + 淡紫开衫 -->
    <path d="M120,160 C158,160 196,190 202,250 L206,360 L34,360 L38,250 C44,190 82,160 120,160 Z" fill="url(#sn_uniform)"/>
    <path d="M88,166 C76,192 68,232 66,268 L76,268 C80,236 88,204 98,182 Z" fill="#8a7ac0" opacity="0.9"/>
    <path d="M152,166 C164,192 172,232 174,268 L164,268 C160,236 152,204 142,182 Z" fill="#8a7ac0" opacity="0.9"/>
    <!-- 白衬衫领 -->
    <path d="M100,158 L120,186 L140,158 C134,150 106,150 100,158 Z" fill="#f4f4f8"/>
    <path d="M100,158 L120,186 L108,192 L92,166 Z" fill="#e4e4ec"/>
    <path d="M140,158 L120,186 L132,192 L148,166 Z" fill="#e4e4ec"/>
    <!-- 紫色细领结 -->
    <path d="M120,190 L107,183 L107,200 Z" fill="#a898d8"/>
    <path d="M120,190 L133,183 L133,200 Z" fill="#a898d8"/>
    <circle cx="120" cy="191" r="4" fill="#7a68b0"/>
    <!-- 衣褶 -->
    <path d="M60,295 L180,295" stroke="#241d3a" stroke-width="2" opacity="0.5"/>
    <!-- 脸 -->
    <path d="M120,44 C150,44 166,66 166,94 C166,120 152,146 120,150 C88,146 74,120 74,94 C74,66 90,44 120,44 Z" fill="url(#sn_face)"/>
    <!-- 耳（右耳后别画笔） -->
    <ellipse cx="75" cy="104" rx="7" ry="10" fill="#f0d2be"/>
    <ellipse cx="165" cy="104" rx="7" ry="10" fill="#f0d2be"/>
    <path d="M168,100 L182,64 L186,66 L172,102 Z" fill="#c8a060"/>
    <path d="M181,62 L186,64 L184,70 Z" fill="#7a68a8"/>
    <!-- 刘海（中分微垂） -->
    <path d="M120,28 C86,28 68,54 70,88 C70,98 72,106 75,112 C78,94 84,82 92,76 C90,88 91,98 94,106 C100,92 108,80 118,74 C116,86 117,96 120,104 C126,88 134,78 146,72 C145,84 147,94 150,102 C156,90 162,82 168,78 C172,90 172,100 169,110 C173,100 174,92 172,84 C170,52 152,28 120,28 Z" fill="url(#sn_hair)"/>
    <path d="M92,76 C86,86 82,98 81,108" stroke="#e0d4f5" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
    <path d="M146,72 C144,84 145,94 148,102" stroke="#e0d4f5" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
    <!-- 眉（细，微蹙） -->
    <path d="M86,95 C92,91 100,91 106,94" stroke="#6a5a90" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M134,94 C140,91 148,91 154,95" stroke="#6a5a90" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <!-- 眼（安静，上睑平直） -->
    <path d="M84,106 C89,101 100,101 105,106" stroke="#2c2444" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M135,106 C140,101 151,101 156,106" stroke="#2c2444" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="94" cy="113" rx="9" ry="10.5" fill="url(#sn_iris)"/>
    <ellipse cx="145" cy="113" rx="9" ry="10.5" fill="url(#sn_iris)"/>
    <circle cx="94" cy="114" r="4" fill="#241c40"/>
    <circle cx="145" cy="114" r="4" fill="#241c40"/>
    <circle cx="91" cy="109" r="2.5" fill="#ffffff" opacity="0.9"/>
    <circle cx="142" cy="109" r="2.5" fill="#ffffff" opacity="0.9"/>
    <circle cx="97" cy="117" r="1.3" fill="#ffffff" opacity="0.7"/>
    <circle cx="148" cy="117" r="1.3" fill="#ffffff" opacity="0.7"/>
    <!-- 上睑影（安静感） -->
    <path d="M85,104 C90,100 100,100 104,104" stroke="#c8b8e0" stroke-width="2" fill="none" opacity="0.5"/>
    <path d="M136,104 C141,100 151,100 155,104" stroke="#c8b8e0" stroke-width="2" fill="none" opacity="0.5"/>
    <path d="M85,119 C89,122 100,122 104,119" stroke="#c8a094" stroke-width="1.4" fill="none" opacity="0.7"/>
    <path d="M136,119 C140,122 151,122 155,119" stroke="#c8a094" stroke-width="1.4" fill="none" opacity="0.7"/>
    <!-- 鼻与嘴（抿嘴，安静） -->
    <path d="M119,124 L121,130 L118,131" stroke="#dfb4a0" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M113,139 C117,141 123,141 127,139" stroke="#b87878" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <!-- 腮红（淡） -->
    <ellipse cx="86" cy="126" rx="8" ry="4" fill="#e8a0a8" opacity="0.3"/>
    <ellipse cx="154" cy="126" rx="8" ry="4" fill="#e8a0a8" opacity="0.3"/>
    <!-- 前发侧束（垂到胸前） -->
    <path d="M70,86 C66,116 68,150 60,182 C72,160 76,124 76,98 Z" fill="url(#sn_hair)"/>
    <path d="M170,86 C174,116 172,150 180,182 C168,160 164,124 164,98 Z" fill="url(#sn_hair)"/>
    <!-- 轮廓光 -->
    <path d="M74,92 C74,66 92,46 118,42" stroke="#efeaff" stroke-width="2" fill="none" opacity="0.4" stroke-linecap="round"/>
    <path d="M44,360 C46,300 52,240 56,200" stroke="#c8b8e8" stroke-width="1.6" fill="none" opacity="0.35"/>
  </svg>`,

  shen: `<svg viewBox="0 0 240 360" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sh_hair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4a4038"/><stop offset="0.55" stop-color="#38302a"/><stop offset="1" stop-color="#241e1a"/>
      </linearGradient>
      <linearGradient id="sh_hair2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7a6c5c" stop-opacity="0.45"/><stop offset="1" stop-color="#38302a" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="sh_face" cx="0.5" cy="0.42" r="0.75">
        <stop offset="0" stop-color="#fce8d8"/><stop offset="0.8" stop-color="#f4d8c2"/><stop offset="1" stop-color="#e8c4ac"/>
      </radialGradient>
      <linearGradient id="sh_iris" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8a9ab0"/><stop offset="0.6" stop-color="#5a6a88"/><stop offset="1" stop-color="#38445e"/>
      </linearGradient>
      <linearGradient id="sh_cardigan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4a5060"/><stop offset="1" stop-color="#2e3442"/>
      </linearGradient>
    </defs>
    <!-- 后发（短发） -->
    <path d="M62,100 C58,56 88,30 120,30 C152,30 182,56 178,100 C177,116 174,128 170,136 L70,136 C66,128 63,116 62,100 Z" fill="url(#sh_hair)"/>
    <path d="M62,100 C60,62 88,34 120,34 C152,34 180,62 178,100 L178,120 L62,120 Z" fill="url(#sh_hair2)"/>
    <!-- 颈 -->
    <path d="M106,142 L134,142 L134,170 C134,180 106,180 106,170 Z" fill="#e8c4ac"/>
    <path d="M106,148 C114,154 126,154 134,148 L134,160 C126,166 114,166 106,160 Z" fill="#d8ac94" opacity="0.7"/>
    <!-- 身体：深色开衫为底 -->
    <path d="M120,162 C158,162 196,192 202,252 L206,360 L34,360 L38,252 C44,192 82,162 120,162 Z" fill="url(#sh_cardigan)"/>
    <!-- 白衬衫中襟（V 领下露出的前襟） -->
    <path d="M100,162 L120,190 L140,162 C146,200 148,290 146,360 L94,360 C92,290 94,200 100,162 Z" fill="#f0eee8"/>
    <path d="M112,206 L112,356 M128,206 L128,356" stroke="#d8d4c8" stroke-width="1.6"/>
    <!-- 开衫翻边（沿中襟两侧） -->
    <path d="M100,162 C92,210 90,290 92,360 L104,360 C102,290 104,210 110,176 Z" fill="#3c4250"/>
    <path d="M140,162 C148,210 150,290 148,360 L136,360 C138,290 136,210 130,176 Z" fill="#3c4250"/>
    <!-- 衬衫领 -->
    <path d="M100,160 L120,188 L140,160 C134,152 106,152 100,160 Z" fill="#ffffff"/>
    <path d="M100,160 L120,188 L108,194 L92,168 Z" fill="#e4e2da"/>
    <path d="M140,160 L120,188 L132,194 L148,168 Z" fill="#e4e2da"/>
    <!-- 开衫肩线 -->
    <path d="M84,176 C96,166 144,166 156,176" stroke="#3c4250" stroke-width="3" fill="none"/>
    <!-- 脸（下颌稍宽） -->
    <path d="M120,44 C151,44 167,66 167,94 C167,122 152,148 120,152 C88,148 73,122 73,94 C73,66 89,44 120,44 Z" fill="url(#sh_face)"/>
    <!-- 耳 -->
    <ellipse cx="74" cy="104" rx="7" ry="10" fill="#f0d0b8"/>
    <ellipse cx="166" cy="104" rx="7" ry="10" fill="#f0d0b8"/>
    <!-- 碎刘海 -->
    <path d="M120,30 C86,30 68,56 70,90 C70,98 72,104 75,110 C80,94 86,82 94,76 C92,88 93,98 96,106 C102,90 110,78 120,72 C118,84 119,94 122,102 C128,88 136,78 148,72 C147,84 149,94 153,102 C158,90 163,82 167,80 C171,90 171,100 168,110 C173,100 174,92 172,84 C170,54 152,30 120,30 Z" fill="url(#sh_hair)"/>
    <path d="M94,76 C88,86 85,96 84,106" stroke="#8a7a68" stroke-width="2" fill="none" opacity="0.45" stroke-linecap="round"/>
    <path d="M148,72 C146,84 147,94 150,102" stroke="#8a7a68" stroke-width="2" fill="none" opacity="0.45" stroke-linecap="round"/>
    <!-- 眉（平直，平静） -->
    <path d="M85,94 C92,91 100,91 106,93" stroke="#3a322a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M134,93 C140,91 148,91 155,94" stroke="#3a322a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <!-- 眼 -->
    <path d="M84,103 C89,97 100,97 105,103" stroke="#2a241e" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M135,103 C140,97 151,97 156,103" stroke="#2a241e" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="94" cy="111" rx="8.5" ry="10" fill="url(#sh_iris)"/>
    <ellipse cx="145" cy="111" rx="8.5" ry="10" fill="url(#sh_iris)"/>
    <circle cx="94" cy="112" r="3.8" fill="#1c222e"/>
    <circle cx="145" cy="112" r="3.8" fill="#1c222e"/>
    <circle cx="91" cy="107" r="2.4" fill="#ffffff"/>
    <circle cx="142" cy="107" r="2.4" fill="#ffffff"/>
    <circle cx="97" cy="115" r="1.3" fill="#ffffff" opacity="0.8"/>
    <circle cx="148" cy="115" r="1.3" fill="#ffffff" opacity="0.8"/>
    <path d="M85,118 C89,121 100,121 104,118" stroke="#c8a094" stroke-width="1.4" fill="none" opacity="0.65"/>
    <path d="M136,118 C140,121 151,121 155,118" stroke="#c8a094" stroke-width="1.4" fill="none" opacity="0.65"/>
    <!-- 鼻与嘴（平缓微抿） -->
    <path d="M119,124 L121,130 L118,131" stroke="#d8ac94" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M113,138 C117,140 123,140 127,138" stroke="#b07868" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <!-- 腮红（极淡） -->
    <ellipse cx="85" cy="126" rx="7" ry="3.5" fill="#e8a090" opacity="0.22"/>
    <ellipse cx="155" cy="126" rx="7" ry="3.5" fill="#e8a090" opacity="0.22"/>
    <!-- 前发侧束 -->
    <path d="M70,84 C66,108 68,136 62,162 C72,144 76,116 76,96 Z" fill="url(#sh_hair)"/>
    <path d="M170,84 C174,108 172,136 178,162 C168,144 164,116 164,96 Z" fill="url(#sh_hair)"/>
    <!-- 轮廓光 -->
    <path d="M74,92 C74,66 92,46 118,42" stroke="#c8bca8" stroke-width="2" fill="none" opacity="0.35" stroke-linecap="round"/>
    <path d="M46,252 C44,226 48,188 56,158" stroke="#6a7488" stroke-width="1.6" fill="none" opacity="0.3"/>
  </svg>`,

  senior: `<svg viewBox="0 0 240 360" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sr_hair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c8c8a0"/><stop offset="0.5" stop-color="#a8a880"/><stop offset="1" stop-color="#787858"/>
      </linearGradient>
      <linearGradient id="sr_hair2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#eaeac8" stop-opacity="0.55"/><stop offset="1" stop-color="#a8a880" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="sr_face" cx="0.5" cy="0.42" r="0.75">
        <stop offset="0" stop-color="#fdece0"/><stop offset="0.8" stop-color="#f5dccb"/><stop offset="1" stop-color="#eac8b4"/>
      </radialGradient>
      <linearGradient id="sr_cardigan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d8c8a8"/><stop offset="1" stop-color="#b8a480"/>
      </linearGradient>
    </defs>
    <!-- 后发（长发+低马尾） -->
    <path d="M58,104 C52,50 88,26 120,26 C152,26 188,50 182,104 C184,150 188,200 194,252 L166,252 L164,150 L76,150 C74,200 72,220 70,252 L46,252 C52,200 56,150 58,104 Z" fill="url(#sr_hair)"/>
    <path d="M58,104 C54,56 88,28 120,28 C152,28 186,56 182,104 L182,136 L58,136 Z" fill="url(#sr_hair2)"/>
    <!-- 低马尾（垂在右后） -->
    <path d="M178,130 C196,150 202,196 196,246 C194,268 188,288 180,300 C184,270 184,240 178,214 C174,190 170,160 166,142 Z" fill="url(#sr_hair)"/>
    <path d="M182,140 C194,164 198,204 192,244" stroke="#eaeac8" stroke-width="2" fill="none" opacity="0.45" stroke-linecap="round"/>
    <!-- 发绳 -->
    <path d="M170,138 C178,134 186,136 190,142 C184,146 176,146 170,144 Z" fill="#b8788a"/>
    <!-- 颈 -->
    <path d="M106,140 L134,140 L134,168 C134,178 106,178 106,168 Z" fill="#ecc8b4"/>
    <path d="M106,146 C114,152 126,152 134,146 L134,158 C126,164 114,164 106,158 Z" fill="#dfb4a0" opacity="0.7"/>
    <!-- 身体：米色开衫 + 白衬衫 -->
    <path d="M120,160 C158,160 196,190 202,250 L206,360 L34,360 L38,250 C44,190 82,160 120,160 Z" fill="url(#sr_cardigan)"/>
    <path d="M120,164 L120,240" stroke="#a08c68" stroke-width="2"/>
    <!-- 白衬衫领 -->
    <path d="M100,158 L120,186 L140,158 C134,150 106,150 100,158 Z" fill="#f8f6f0"/>
    <path d="M100,158 L120,186 L108,192 L92,166 Z" fill="#eae6dc"/>
    <path d="M140,158 L120,186 L132,192 L148,166 Z" fill="#eae6dc"/>
    <!-- 开衫衣襟 -->
    <path d="M92,176 C84,200 80,238 78,272 L64,272 C66,232 74,196 84,174 Z" fill="#c8b490" opacity="0.85"/>
    <path d="M148,176 C156,200 160,238 162,272 L176,272 C174,232 166,196 156,174 Z" fill="#c8b490" opacity="0.85"/>
    <!-- 细腰带 -->
    <path d="M58,296 L182,296" stroke="#a08c68" stroke-width="3" opacity="0.7"/>
    <!-- 脸（略微修长） -->
    <path d="M120,44 C149,44 165,66 165,94 C165,120 151,147 120,151 C89,147 75,120 75,94 C75,66 91,44 120,44 Z" fill="url(#sr_face)"/>
    <!-- 耳 -->
    <ellipse cx="75" cy="104" rx="7" ry="10" fill="#f0d2be"/>
    <ellipse cx="165" cy="104" rx="7" ry="10" fill="#f0d2be"/>
    <circle cx="165" cy="110" r="2" fill="#d8b0a0"/>
    <!-- 刘海（柔和斜分） -->
    <path d="M120,28 C86,28 68,54 70,88 C70,98 73,106 76,112 C80,94 86,82 94,76 C92,88 93,98 96,106 C102,92 110,80 122,74 C120,86 121,96 124,104 C130,90 138,80 150,74 C149,86 151,96 154,104 C160,92 164,84 168,80 C172,92 172,100 169,110 C173,100 174,92 172,84 C170,52 152,28 120,28 Z" fill="url(#sr_hair)"/>
    <path d="M94,76 C88,86 84,96 83,106" stroke="#eaeade" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
    <path d="M150,74 C148,86 150,96 153,104" stroke="#eaeade" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
    <!-- 眉（柔和弯） -->
    <path d="M86,95 C92,90 100,90 106,93" stroke="#7a7050" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M134,93 C140,90 148,90 154,95" stroke="#7a7050" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <!-- 眼（温柔闭眼笑 ^^） -->
    <path d="M85,110 C90,104 101,104 106,110" stroke="#4a4232" stroke-width="3.6" fill="none" stroke-linecap="round"/>
    <path d="M134,110 C139,104 150,104 155,110" stroke="#4a4232" stroke-width="3.6" fill="none" stroke-linecap="round"/>
    <path d="M86,111 C91,106 100,106 105,111" stroke="#8a8060" stroke-width="1.4" fill="none" opacity="0.5"/>
    <path d="M135,111 C140,106 149,106 154,111" stroke="#8a8060" stroke-width="1.4" fill="none" opacity="0.5"/>
    <!-- 睫毛 -->
    <path d="M84,110 L80,113 M156,110 L160,113" stroke="#4a4232" stroke-width="2" stroke-linecap="round"/>
    <!-- 鼻与嘴（温和浅笑） -->
    <path d="M119,124 L121,130 L118,131" stroke="#dfb4a0" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M112,136 C116,140 124,140 128,136" stroke="#c07868" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <!-- 腮红 -->
    <ellipse cx="85" cy="125" rx="8" ry="4" fill="#f0a0a0" opacity="0.35"/>
    <ellipse cx="155" cy="125" rx="8" ry="4" fill="#f0a0a0" opacity="0.35"/>
    <!-- 前发侧束 -->
    <path d="M70,86 C66,112 68,140 60,168 C72,148 76,120 76,98 Z" fill="url(#sr_hair)"/>
    <path d="M170,86 C174,112 172,140 180,168 C168,148 164,120 164,98 Z" fill="url(#sr_hair)"/>
    <!-- 轮廓光 -->
    <path d="M74,92 C74,66 92,46 118,42" stroke="#f2f2dc" stroke-width="2" fill="none" opacity="0.45" stroke-linecap="round"/>
    <path d="M48,252 C46,226 50,190 56,160" stroke="#c8c8a0" stroke-width="1.6" fill="none" opacity="0.35"/>
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
  sea: "海边",
  festival: "学园祭",
  sportsmeet: "运动会",
  attic: "旧阁楼",
  clock_room: "钟楼计时室",
  club_room: "社团活动室",
  courtyard: "校园庭院",
  forest: "林间小路",
  lab: "实验室",
  music_room: "音乐教室",
  observatory: "天文台",
  pond: "校园池塘",
  river: "河岸",
  tunnel: "旧隧道",
  workshop: "手作工坊",
  ending_good: "结局",
  ending_normal: "结局",
  ending_bad: "结局",
  ending_true: "真结局",
};

/* ============ 关键词定义 ============ */
const KEYWORDS = {
  "林诗雨": { desc: "第一次在走廊叫住你的班长", rarity: "normal" },
  "小说": { desc: "林诗雨偷偷在写的东西", rarity: "rare" },
  "角色A": { desc: "她稿纸上反复出现的角色", rarity: "normal" },
  "全国赛": { desc: "夏织备战的赛事", rarity: "normal" },
  "特招": { desc: "夏织家庭的隐痛", rarity: "rare" },
  "紫": { desc: "苏念画里反复出现的颜色", rarity: "normal" },
  "挣": { desc: "苏念画作的主题", rarity: "rare" },
  "匿名信": { desc: "塞进你书包的神秘信", rarity: "rare" },
  "学姐": { desc: "信的真正主人", rarity: "rare" },
  "樱花祭": { desc: "学园最后的春夜", rarity: "hidden" },
  "回信": { desc: "你需要给出的答案", rarity: "hidden" },
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
  // v3.3.0 合成扩展：更多关键词组合
  { a: "小说",   b: "紫",     result: "彼此书页", resultName: "彼此的书页", desc: "她的稿纸和他的画布，在同一张桌上摊开。" },
  { a: "全国赛", b: "角色A",  result: "起跑底稿", resultName: "起跑线的底稿", desc: "她起跑前，也在纸上写过一个名字。" },
  { a: "樱花祭", b: "学姐",   result: "樱花的旧约", resultName: "樱花的旧约", desc: "很多年前，她也曾在樱花祭做过同样的选择。" },
  { a: "匿名信", b: "回信",   result: "纸的来处", resultName: "纸的来处",   desc: "信是写给谁的，其实从来都不难猜。" },
];
window.COMPOSE_RECIPES = COMPOSE_RECIPES;

/* 合成回忆（v2.9.6）：合成产物解锁时写入记忆图鉴——让合成不只是真结局门票 */
const COMPOSED_MEMORIES = {
  "祭信":   { id: "合成·祭信",   title: "樱花祭的回信",
              text: "那一晚的信，写完就封上了口。樱花落在信封上，像谁盖下的邮戳。" },
  "未寄信": { id: "合成·未寄信", title: "没贴邮票的信",
              text: "抽屉最深处有一封没贴邮票的信。收信人那一栏，她始终没敢写。" },
  "挣紫":   { id: "合成·挣紫",   title: "挣出来的紫",
              text: "画布上涂了又涂的紫。她说：紫是憋在胸口的那口气——画出来，才能喘上来。" },
  "她就是我": { id: "合成·她就是我", title: "角色A的底稿",
              text: "稿纸上角色A说过的话，她本人一句都没说过。可你知道——那就是她。" },
  "她的选择": { id: "合成·她的选择", title: "并排的两张纸",
              text: "报名表和特招协议并排放在桌上。她最后选的，不是那条更稳的路。" },
  "替她回": { id: "合成·替她回", title: "代笔的勇气",
              text: "有些信不是写给收信人的，是写给不敢回信的自己。你替她落笔的那一刻，她终于敢看了。" },
  // v3.3.0 合成回忆扩展
  "樱花信": { id: "合成·樱花信", title: "寄往循环之外",
              text: "祭信与未寄信叠在一起，折痕刚好吻合。原来她写给我的每一句，都是写给她自己的下一句。" },
  "彼此书页": { id: "合成·彼此书页", title: "摊开的纸页",
              text: "她的稿纸和她的画布摊在同一张桌上。紫渗进字缝，字落进紫里——她们的故事，一直在互相补全。" },
  "起跑底稿": { id: "合成·起跑底稿", title: "起跑前的名字",
              text: "秒表按下之前，她在掌心写了一个名字，又擦掉。那场比赛她跑得飞快——像在追赶纸上的那个角色。" },
  "樱花的旧约": { id: "合成·樱花的旧约", title: "更早的春天",
              text: "校刊旧页里夹着一张照片：很多年前的樱花祭，一个女生站在同样的位置，面前也放着一封没寄出的信。她不是第一个走这条路的人。" },
  "纸的来处": { id: "合成·纸的来处", title: "信纸背面",
              text: "信纸背面有一行极淡的字，是写给自己看的：「如果你收到这封信，说明我终于寄出去了。」" },
};
window.COMPOSED_MEMORIES = COMPOSED_MEMORIES;

/* ============ CG 定义（SVG 字符画） ============ */
const CGS = [
  { id: "cg_meet_shiyu", title: "走廊的初次相遇", heroine: "林诗雨", img: "assets/cg/cg_meet_shiyu.webp", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg1_wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4a72"/><stop offset="0.7" stop-color="#3f3354"/><stop offset="1" stop-color="#2c2340"/></linearGradient><linearGradient id="cg1_win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe8c8"/><stop offset="1" stop-color="#f0b890"/></linearGradient></defs><rect width="400" height="240" fill="url(#cg1_wall)"/><rect x="30" y="24" width="70" height="96" rx="4" fill="url(#cg1_win)" opacity="0.9"/><rect x="150" y="24" width="70" height="96" rx="4" fill="url(#cg1_win)" opacity="0.75"/><rect x="270" y="24" width="70" height="96" rx="4" fill="url(#cg1_win)" opacity="0.6"/><rect x="0" y="140" width="400" height="6" fill="#241c34"/><rect x="0" y="146" width="400" height="94" fill="#4a3c5e"/><rect x="0" y="146" width="400" height="4" fill="#6a5a80" opacity="0.6"/><path d="M0,180 L400,160" stroke="#2c2340" stroke-width="3" opacity="0.5"/><path d="M60,150 L72,240 M140,146 L146,240 M220,143 L222,240 M300,140 L300,240" stroke="#241c34" stroke-width="4" opacity="0.7"/><g><circle cx="188" cy="102" r="17" fill="#fde2cc"/><path d="M172,96 C172,78 204,78 204,96 L206,88 C206,66 170,66 170,88 Z" fill="#2a2438"/><path d="M170,92 C166,120 168,140 164,156 L212,156 C208,140 210,120 206,92 Z" fill="#3a4a6e"/><path d="M182,158 L186,188 L176,188 Z" fill="#f4f6f8"/><path d="M196,120 C200,130 202,140 200,150" stroke="#2c3854" stroke-width="3" fill="none"/><ellipse cx="188" cy="188" rx="30" ry="5" fill="#1a1428" opacity="0.5"/></g><g opacity="0.9"><circle cx="330" cy="112" r="15" fill="#fde2cc"/><path d="M316,106 C316,90 344,90 344,106 L346,98 C346,78 314,78 314,98 Z" fill="#262138"/><path d="M314,100 C310,126 312,142 308,156 L352,156 C348,142 350,126 346,100 Z" fill="#33415e"/><path d="M324,158 L328,186 L318,186 Z" fill="#f4f6f8"/></g><g fill="#f0b8c8"><ellipse cx="90" cy="60" rx="5" ry="2.4" transform="rotate(24 90 60)"/><ellipse cx="260" cy="40" rx="5" ry="2.4" transform="rotate(-18 260 40)"/><ellipse cx="360" cy="70" rx="5" ry="2.4" transform="rotate(40 360 70)"/><ellipse cx="120" cy="130" rx="5" ry="2.4" transform="rotate(-30 120 130)"/></g><text x="200" y="222" text-anchor="middle" fill="#ffd8e4" font-size="14" font-family="serif">— 走廊的初次相遇 —</text></svg>` },
  { id: "cg_meet_xiazhi", title: "操场上的阳光", heroine: "夏织", img: "assets/cg/cg_meet_xiazhi.webp", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg2_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ec0e8"/><stop offset="0.65" stop-color="#a8d4ec"/><stop offset="1" stop-color="#d4ecf4"/></linearGradient><linearGradient id="cg2_track" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c89058"/><stop offset="1" stop-color="#a87038"/></linearGradient></defs><rect width="400" height="240" fill="url(#cg2_sky)"/><ellipse cx="90" cy="46" rx="46" ry="13" fill="#ffffff" opacity="0.85"/><ellipse cx="300" cy="30" rx="56" ry="15" fill="#ffffff" opacity="0.7"/><circle cx="352" cy="42" r="20" fill="#ffe890" opacity="0.95"/><circle cx="352" cy="42" r="30" fill="#ffe890" opacity="0.25"/><rect y="140" width="400" height="100" fill="#9bc97a"/><rect y="140" width="400" height="10" fill="#b8dc8e"/><rect y="150" width="400" height="90" fill="url(#cg2_track)"/><g stroke="#f4e8d0" stroke-width="3" opacity="0.85"><line x1="0" y1="168" x2="400" y2="162"/><line x1="0" y1="186" x2="400" y2="176"/><line x1="0" y1="208" x2="400" y2="194"/></g><g><circle cx="200" cy="96" r="15" fill="#f8d4b8"/><path d="M186,90 C186,76 214,76 214,90 L216,82 C216,64 184,64 184,82 Z" fill="#8a5a30"/><path d="M186,86 C176,96 172,116 170,134 L178,134 C176,116 180,100 188,92 Z" fill="#8a5a30"/><path d="M190,108 L210,108 L214,152 L186,152 Z" fill="#33415e"/><path d="M190,110 C182,118 176,128 172,136" stroke="#f8d4b8" stroke-width="6" stroke-linecap="round"/><path d="M210,110 C218,118 224,128 228,136" stroke="#f8d4b8" stroke-width="6" stroke-linecap="round"/><path d="M188,152 L182,186 L190,188 L199,154 L208,186 L216,184 L210,152 Z" fill="#f8d4b8"/><path d="M180,182 L191,184 M209,184 L219,182" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/><path d="M200,168 L206,150 L210,152 Z" fill="#f0a858" opacity="0.9"/><ellipse cx="199" cy="190" rx="26" ry="5" fill="#6a4820" opacity="0.4"/></g><g stroke="#ffffff" stroke-width="1.4" opacity="0.5"><line x1="150" y1="90" x2="118" y2="72"/><line x1="146" y1="104" x2="108" y2="96"/><line x1="250" y1="92" x2="282" y2="74"/></g><text x="200" y="225" text-anchor="middle" fill="#5a3818" font-size="14" font-family="serif">— 操场上的阳光 —</text></svg>` },
  { id: "cg_meet_sunian", title: "画室里的紫", heroine: "苏念", img: "assets/cg/cg_meet_sunian.webp", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg3_room" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3c66"/><stop offset="1" stop-color="#2c2344"/></linearGradient><linearGradient id="cg3_canvas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a8ac8"/><stop offset="0.6" stop-color="#7a68a8"/><stop offset="1" stop-color="#5a4890"/></linearGradient><radialGradient id="cg3_glow" cx="0.32" cy="0.42" r="0.6"><stop offset="0" stop-color="#ffe8c8" stop-opacity="0.5"/><stop offset="1" stop-color="#ffe8c8" stop-opacity="0"/></radialGradient></defs><rect width="400" height="240" fill="url(#cg3_room)"/><rect x="40" y="30" width="60" height="88" fill="#6a5a8a" opacity="0.7"/><rect x="44" y="34" width="52" height="70" fill="#ffd8a0" opacity="0.75"/><rect width="400" height="240" fill="url(#cg3_glow)"/><rect y="170" width="400" height="70" fill="#241c38"/><g><rect x="96" y="58" width="10" height="130" fill="#5a4a3a"/><rect x="96" y="58" width="150" height="6" fill="#5a4a3a"/><rect x="96" y="182" width="150" height="6" fill="#4a3c2e"/><rect x="108" y="66" width="126" height="112" fill="#f4f0e4"/><rect x="112" y="70" width="118" height="104" fill="url(#cg3_canvas)"/><path d="M126,140 C140,110 150,96 166,88 C160,108 162,124 158,140 C148,146 134,146 126,140 Z" fill="#b8a8e0" opacity="0.8"/><path d="M180,96 C196,88 210,92 218,104 C210,100 196,102 188,110 C186,104 182,100 180,96 Z" fill="#d4c8f0" opacity="0.6"/></g><g><circle cx="290" cy="98" r="16" fill="#f8dcc8"/><path d="M275,92 C275,76 305,76 305,92 L307,84 C307,64 273,64 273,84 Z" fill="#b8a8e0"/><path d="M275,90 L268,66 L273,64 L279,90 Z" fill="#c8a060"/><path d="M278,158 L272,196 L282,196 L288,158 Z" fill="#8a7ac0"/><path d="M276,158 L292,158 L296,220 L268,220 Z" fill="#4a3c66"/><ellipse cx="284" cy="222" rx="26" ry="4" fill="#1a1428" opacity="0.5"/></g><g fill="#8a7ac8"><ellipse cx="200" cy="196" rx="10" ry="3"/><circle cx="224" cy="200" r="5" fill="#b8a8e0"/><rect x="150" y="192" width="8" height="10" fill="#c8a060"/></g><text x="200" y="232" text-anchor="middle" fill="#c8b8e8" font-size="14" font-family="serif">— 画室里的紫 —</text></svg>` },
  { id: "cg_letter", title: "樱花瓣的信", heroine: "共通", img: "assets/cg/cg_letter.webp", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg4_bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3448"/><stop offset="1" stop-color="#2c1e30"/></linearGradient><radialGradient id="cg4_lamp" cx="0.5" cy="0.18" r="0.7"><stop offset="0" stop-color="#ffdf9e" stop-opacity="0.55"/><stop offset="1" stop-color="#ffdf9e" stop-opacity="0"/></radialGradient><linearGradient id="cg4_paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f4e8d8"/></linearGradient></defs><rect width="400" height="240" fill="url(#cg4_bg)"/><rect width="400" height="240" fill="url(#cg4_lamp)"/><rect y="150" width="400" height="90" fill="#5a4438"/><path d="M0,150 L400,150 L400,154 L0,154 Z" fill="#6a5244"/><path d="M0,182 L400,178" stroke="#4a3830" stroke-width="2"/><rect x="120" y="64" width="160" height="110" rx="3" fill="url(#cg4_paper)" transform="rotate(-2 200 119)"/><rect x="126" y="70" width="148" height="98" fill="none" stroke="#e8d8c0" stroke-width="1" transform="rotate(-2 200 119)"/><g stroke="#c8b8a0" stroke-width="1.4" opacity="0.8" transform="rotate(-2 200 119)"><line x1="140" y1="92" x2="258" y2="90"/><line x1="140" y1="106" x2="250" y2="104"/><line x1="140" y1="120" x2="256" y2="118"/><line x1="140" y1="134" x2="228" y2="133"/></g><path d="M196,58 C192,50 196,44 200,42 C204,44 208,50 204,58 C202,61 198,61 196,58 Z" fill="#f0a8b8" transform="rotate(-14 200 50)"/><path d="M198,52 C198,48 202,46 203,49" stroke="#e08898" stroke-width="1" fill="none"/><g fill="#f0a8b8"><ellipse cx="90" cy="90" rx="6" ry="2.8" transform="rotate(28 90 90)"/><ellipse cx="320" cy="70" rx="6" ry="2.8" transform="rotate(-24 320 70)"/><ellipse cx="310" cy="170" rx="6" ry="2.8" transform="rotate(18 310 170)"/><ellipse cx="70" cy="180" rx="6" ry="2.8" transform="rotate(-40 70 180)"/><ellipse cx="240" cy="200" rx="6" ry="2.8" transform="rotate(12 240 200)"/></g><text x="200" y="228" text-anchor="middle" fill="#ffd8e4" font-size="14" font-family="serif">— 樱花瓣的信 —</text></svg>` },
  { id: "cg_sportsmeet", title: "运动会终点", heroine: "共通", img: "assets/cg/cg_sportsmeet.webp", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg5_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ec0e8"/><stop offset="1" stop-color="#c8e4f0"/></linearGradient><linearGradient id="cg5_track" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c89058"/><stop offset="1" stop-color="#9a6430"/></linearGradient></defs><rect width="400" height="240" fill="url(#cg5_sky)"/><rect y="88" width="400" height="30" fill="#8a9ab0"/><g fill="#e8e8f0"><rect x="18" y="92" width="12" height="22" rx="2"/><rect x="48" y="92" width="12" height="22" rx="2"/><rect x="78" y="92" width="12" height="22" rx="2"/><rect x="108" y="92" width="12" height="22" rx="2"/><rect x="138" y="92" width="12" height="22" rx="2"/><rect x="250" y="92" width="12" height="22" rx="2"/><rect x="280" y="92" width="12" height="22" rx="2"/><rect x="310" y="92" width="12" height="22" rx="2"/><rect x="340" y="92" width="12" height="22" rx="2"/></g><g><path d="M170,88 L186,60 L202,88 Z" fill="#e87070"/><path d="M186,60 L186,88" stroke="#c85858" stroke-width="2"/><path d="M236,84 L252,58 L268,84 Z" fill="#6890c8"/><path d="M252,58 L252,84" stroke="#5070a8" stroke-width="2"/></g><rect y="118" width="400" height="122" fill="url(#cg5_track)"/><g stroke="#f4e8d0" stroke-width="3" opacity="0.85"><line x1="0" y1="146" x2="400" y2="140"/><line x1="0" y1="170" x2="400" y2="158"/><line x1="0" y1="196" x2="400" y2="180"/><line x1="0" y1="222" x2="400" y2="204"/></g><rect x="352" y="96" width="8" height="70" fill="#ffffff"/><path d="M352,96 L384,104 L352,112 Z" fill="#ff6060"/><g><ellipse cx="230" cy="182" rx="30" ry="6" fill="#6a4820" opacity="0.5"/><circle cx="230" cy="108" r="14" fill="#f8d4b8"/><path d="M217,102 C217,88 243,88 243,102 L245,96 C245,78 215,78 215,96 Z" fill="#8a5a30"/><path d="M221,122 L239,122 L242,160 L218,160 Z" fill="#33415e"/><path d="M222,124 C214,130 206,134 198,136" stroke="#f8d4b8" stroke-width="6" stroke-linecap="round"/><path d="M238,124 C248,128 258,128 268,124" stroke="#f8d4b8" stroke-width="6" stroke-linecap="round"/><path d="M220,160 L210,190 L218,192 L229,162 L240,190 L248,188 L240,160 Z" fill="#f8d4b8"/><path d="M208,188 L219,190 M240,188 L250,186" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/><rect x="226" y="130" width="10" height="8" fill="#ffffff" opacity="0.9"/></g><g stroke="#ffffff" stroke-width="1.6" opacity="0.55"><line x1="180" y1="120" x2="146" y2="102"/><line x1="276" y1="126" x2="312" y2="110"/></g><text x="200" y="230" text-anchor="middle" fill="#5a3818" font-size="14" font-family="serif">— 运动会终点 —</text></svg>` },
  { id: "cg_festival", title: "学园祭之夜", heroine: "共通", img: "assets/cg/cg_festival.webp", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="cg6_sky" cx="0.5" cy="0.32" r="0.9"><stop offset="0" stop-color="#ffb8c8"/><stop offset="0.5" stop-color="#8a5a80"/><stop offset="1" stop-color="#2c1a44"/></radialGradient><linearGradient id="cg6_ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241838"/><stop offset="1" stop-color="#160e26"/></linearGradient></defs><rect width="400" height="240" fill="url(#cg6_sky)"/><g fill="#fff8ee"><circle cx="60" cy="36" r="2.4" opacity="0.9"/><circle cx="130" cy="22" r="1.8" opacity="0.7"/><circle cx="210" cy="30" r="2" opacity="0.8"/><circle cx="300" cy="24" r="1.6" opacity="0.6"/><circle cx="352" cy="48" r="2.2" opacity="0.85"/><circle cx="36" cy="70" r="1.5" opacity="0.6"/></g><circle cx="336" cy="60" r="18" fill="#fff4d8" opacity="0.95"/><circle cx="336" cy="60" r="26" fill="#fff4d8" opacity="0.2"/><path d="M60,120 C40,110 36,84 52,68 C48,92 56,108 74,118 Z" fill="#2c1a44"/><path d="M92,96 C110,74 138,72 156,90" stroke="#1c122e" stroke-width="14" fill="none" stroke-linecap="round"/><rect y="168" width="400" height="72" fill="url(#cg6_ground)"/><g><path d="M70,120 L82,120 L80,178 L72,178 Z" fill="#5a4a3a"/><ellipse cx="76" cy="116" rx="20" ry="12" fill="#ffb060"/><ellipse cx="76" cy="116" rx="20" ry="12" fill="none" stroke="#ff8848" stroke-width="1.5"/><line x1="68" y1="110" x2="68" y2="122" stroke="#e08838" stroke-width="1.4"/><line x1="76" y1="106" x2="76" y2="126" stroke="#e08838" stroke-width="1.4"/><line x1="84" y1="110" x2="84" y2="122" stroke="#e08838" stroke-width="1.4"/><rect x="69" y="101" width="14" height="4" rx="1.5" fill="#8a5a28"/><line x1="76" y1="128" x2="76" y2="136" stroke="#d86838" stroke-width="2"/></g><g><path d="M180,112 L192,112 L190,174 L182,174 Z" fill="#5a4a3a"/><ellipse cx="186" cy="108" rx="22" ry="13" fill="#ffb868"/><ellipse cx="186" cy="108" rx="22" ry="13" fill="none" stroke="#ff8848" stroke-width="1.5"/><line x1="177" y1="102" x2="177" y2="115" stroke="#e08838" stroke-width="1.4"/><line x1="186" y1="97" x2="186" y2="119" stroke="#e08838" stroke-width="1.4"/><line x1="195" y1="102" x2="195" y2="115" stroke="#e08838" stroke-width="1.4"/><rect x="178" y="93" width="15" height="4" rx="1.5" fill="#8a5a28"/><line x1="186" y1="120" x2="186" y2="129" stroke="#d86838" stroke-width="2"/></g><g><path d="M290,118 L302,118 L300,176 L292,176 Z" fill="#5a4a3a"/><ellipse cx="296" cy="114" rx="20" ry="12" fill="#ffc078"/><ellipse cx="296" cy="114" rx="20" ry="12" fill="none" stroke="#ff8848" stroke-width="1.5"/><line x1="288" y1="108" x2="288" y2="120" stroke="#e08838" stroke-width="1.4"/><line x1="296" y1="104" x2="296" y2="124" stroke="#e08838" stroke-width="1.4"/><line x1="304" y1="108" x2="304" y2="120" stroke="#e08838" stroke-width="1.4"/><rect x="289" y="99" width="14" height="4" rx="1.5" fill="#8a5a28"/><line x1="296" y1="126" x2="296" y2="134" stroke="#d86838" stroke-width="2"/></g><g><rect x="120" y="150" width="130" height="24" fill="#3a2450"/><path d="M120,150 L250,150 L244,138 L126,138 Z" fill="#c85a68"/><path d="M132,144 L238,144" stroke="#e87878" stroke-width="2" opacity="0.7"/><g fill="#ffd890"><rect x="140" y="155" width="16" height="12" rx="2"/><rect x="168" y="155" width="16" height="12" rx="2"/><rect x="196" y="155" width="16" height="12" rx="2"/><rect x="224" y="155" width="16" height="12" rx="2"/></g></g><g fill="#ffb8c8"><ellipse cx="100" cy="196" rx="5" ry="2.4" transform="rotate(20 100 196)"/><ellipse cx="330" cy="204" rx="5" ry="2.4" transform="rotate(-16 330 204)"/><ellipse cx="52" cy="212" rx="5" ry="2.4" transform="rotate(34 52 212)"/></g><text x="200" y="230" text-anchor="middle" fill="#ffd8e4" font-size="14" font-family="serif">— 学园祭之夜 —</text></svg>` },
  { id: "cg_shiyu_good", title: "回 头", heroine: "林诗雨", img: "assets/cg/cg_shiyu_good.webp", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg7_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdf9e"/><stop offset="0.6" stop-color="#f0a878"/><stop offset="1" stop-color="#d88060"/></linearGradient><radialGradient id="cg7_sun" cx="0.72" cy="0.4" r="0.5"><stop offset="0" stop-color="#fff4d8" stop-opacity="0.9"/><stop offset="1" stop-color="#fff4d8" stop-opacity="0"/></radialGradient></defs><rect width="400" height="240" fill="url(#cg7_sky)"/><rect width="400" height="240" fill="url(#cg7_sun)"/><circle cx="288" cy="96" r="26" fill="#fff8e0"/><circle cx="288" cy="96" r="40" fill="#fff8e0" opacity="0.3"/><path d="M0,160 L400,152 L400,240 L0,240 Z" fill="#8a6850"/><path d="M0,160 L400,152" stroke="#a08260" stroke-width="3"/><g fill="#5a4a68" opacity="0.85"><rect x="20" y="90" width="46" height="70"/><rect x="330" y="84" width="50" height="72"/></g><g fill="#3a2c4a"><rect x="26" y="98" width="10" height="12"/><rect x="42" y="98" width="10" height="12"/><rect x="338" y="92" width="10" height="12"/><rect x="354" y="92" width="10" height="12"/></g><g><ellipse cx="176" cy="196" rx="40" ry="7" fill="#4a3020" opacity="0.5"/><circle cx="176" cy="106" r="18" fill="#f8dcc4"/><path d="M156,100 C156,74 196,74 196,100 L198,90 C198,66 154,66 154,90 Z" fill="#2a2438"/><path d="M158,96 C150,120 152,146 148,166 L162,166 C164,146 166,120 166,102 Z" fill="#2a2438"/><path d="M194,98 C202,120 204,146 208,166 L194,166 C192,146 190,120 190,102 Z" fill="#2a2438"/><path d="M160,126 C152,138 148,150 146,160 M192,126 C200,138 204,150 206,160" stroke="#2a2438" stroke-width="9" stroke-linecap="round"/><path d="M162,118 L190,118 L196,168 L156,168 Z" fill="#3a4a6e"/><path d="M176,124 L176,164" stroke="#2c3854" stroke-width="2"/><path d="M168,122 L176,132 L184,122" fill="none" stroke="#a8c5e8" stroke-width="2.4"/><circle cx="176" cy="106" r="2" fill="#e8a0a0" opacity="0.4"/></g><path d="M282,84 C296,74 312,74 322,82" stroke="#fff4d8" stroke-width="2" fill="none" opacity="0.6"/><g fill="#ffd8a0"><ellipse cx="80" cy="70" rx="5" ry="2.4" transform="rotate(22 80 70)"/><ellipse cx="140" cy="52" rx="5" ry="2.4" transform="rotate(-18 140 52)"/><ellipse cx="240" cy="60" rx="5" ry="2.4" transform="rotate(30 240 60)"/></g><text x="200" y="228" text-anchor="middle" fill="#5a3818" font-size="14" font-family="serif">— 回 头 —</text></svg>` },
  { id: "cg_xiazhi_good", title: "终 点 线", heroine: "夏织", img: "assets/cg/cg_xiazhi_good.webp", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg8_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#68b8e8"/><stop offset="1" stop-color="#c0e2f2"/></linearGradient><linearGradient id="cg8_track" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d09858"/><stop offset="1" stop-color="#a06830"/></linearGradient></defs><rect width="400" height="240" fill="url(#cg8_sky)"/><ellipse cx="80" cy="40" rx="44" ry="12" fill="#ffffff" opacity="0.8"/><ellipse cx="300" cy="28" rx="52" ry="14" fill="#ffffff" opacity="0.65"/><rect y="120" width="400" height="120" fill="url(#cg8_track)"/><rect x="0" y="112" width="400" height="8" fill="#ffffff"/><rect x="352" y="112" width="6" height="8" fill="#1a1a1a"/><g stroke="#f4e8d0" stroke-width="3.4" opacity="0.9"><line x1="0" y1="150" x2="400" y2="140"/><line x1="0" y1="180" x2="400" y2="164"/><line x1="0" y1="212" x2="400" y2="190"/></g><g><path d="M356,120 L356,196" stroke="#ffffff" stroke-width="5"/><g fill="#ff8080"><path d="M357,124 L378,130 L357,136 Z"/><path d="M357,138 L378,144 L357,150 Z"/></g></g><g><ellipse cx="300" cy="182" rx="34" ry="6" fill="#6a4820" opacity="0.5"/><circle cx="288" cy="98" r="14.5" fill="#f8d4b8"/><path d="M275,92 C275,78 301,78 301,92 L303,84 C303,66 273,66 273,84 Z" fill="#8a5a30"/><path d="M275,88 C266,98 260,112 256,124 L264,126 C268,112 272,102 280,94 Z" fill="#8a5a30"/><path d="M280,110 L298,112 L306,152 L282,154 Z" fill="#33415e"/><path d="M282,114 C272,116 262,116 252,114" stroke="#f8d4b8" stroke-width="7" stroke-linecap="round"/><path d="M296,114 C306,118 316,120 328,120" stroke="#f8d4b8" stroke-width="7" stroke-linecap="round"/><path d="M284,152 L278,188 L286,190 L294,156 L304,188 L312,186 L306,152 Z" fill="#f8d4b8"/><path d="M276,186 L287,188 M304,186 L313,184" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/><rect x="284" y="122" width="11" height="8" fill="#ffffff" opacity="0.9"/><path d="M296,112 C312,106 330,102 344,102" stroke="#f8d4b8" stroke-width="7" stroke-linecap="round" opacity="0.95"/></g><g stroke="#ffffff" stroke-width="2" opacity="0.6"><line x1="230" y1="100" x2="186" y2="82"/><line x1="236" y1="116" x2="182" y2="106"/><line x1="246" y1="132" x2="192" y2="130"/></g><text x="200" y="230" text-anchor="middle" fill="#5a3818" font-size="14" font-family="serif">— 终 点 线 —</text></svg>` },
  { id: "cg_sunian_good", title: "挣", heroine: "苏念", img: "assets/cg/cg_sunian_good.webp", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg9_bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2440"/><stop offset="1" stop-color="#1a142e"/></linearGradient><radialGradient id="cg9_spot" cx="0.5" cy="0.42" r="0.55"><stop offset="0" stop-color="#fff8e8" stop-opacity="0.5"/><stop offset="0.7" stop-color="#fff8e8" stop-opacity="0.12"/><stop offset="1" stop-color="#fff8e8" stop-opacity="0"/></radialGradient><linearGradient id="cg9_purple" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a78c8"/><stop offset="0.55" stop-color="#6a58a8"/><stop offset="1" stop-color="#4a3a88"/></linearGradient></defs><rect width="400" height="240" fill="url(#cg9_bg)"/><rect width="400" height="240" fill="url(#cg9_spot)"/><rect x="88" y="40" width="224" height="150" rx="4" fill="#3a3050"/><rect x="96" y="48" width="208" height="134" fill="#f4f0e4"/><rect x="100" y="52" width="200" height="126" fill="url(#cg9_purple)"/><g><path d="M158,178 C150,150 152,116 166,92 C172,80 184,72 196,72 C186,84 182,98 184,112 C190,100 198,94 208,92 C200,102 196,116 198,130 C206,120 216,116 226,118 C216,124 208,136 206,148 C204,160 196,172 184,178 C176,181 166,181 158,178 Z" fill="#e8d8f8"/><path d="M170,140 C176,126 186,116 198,112 C192,122 188,134 188,146 C182,144 176,142 170,140 Z" fill="#c8b8e8" opacity="0.7"/><circle cx="194" cy="98" r="7" fill="#f8f0ff"/><path d="M191,96 C192,93 196,92 198,94" stroke="#8a72c8" stroke-width="1.4" fill="none"/><path d="M190,104 C193,106 197,106 200,104" stroke="#8a72c8" stroke-width="1.4" fill="none" stroke-linecap="round"/></g><path d="M100,52 L100,178" stroke="#fff8e8" stroke-width="1.6" opacity="0.25"/><rect x="60" y="190" width="280" height="10" rx="3" fill="#3a3050"/><g fill="#8a7ac8"><ellipse cx="84" cy="206" rx="12" ry="3.4"/><rect x="300" y="198" width="24" height="9" rx="2" fill="#c8a060"/></g><g stroke="#c8b8e8" stroke-width="1.6" opacity="0.5"><line x1="120" y1="30" x2="150" y2="16"/><line x1="260" y1="28" x2="290" y2="14"/></g><text x="200" y="226" text-anchor="middle" fill="#c8b8e8" font-size="15" font-family="serif">— 挣 —</text></svg>` },
  { id: "cg_senior_shadow", title: "看 见", heroine: "学姐", img: "assets/cg/cg_senior_shadow.webp", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg11_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241e38"/><stop offset="0.6" stop-color="#4a3458"/><stop offset="1" stop-color="#8a5a78"/></linearGradient><radialGradient id="cg11_glow" cx="0.62" cy="0.35" r="0.5"><stop offset="0" stop-color="#ffd8a8" stop-opacity="0.45"/><stop offset="1" stop-color="#ffd8a8" stop-opacity="0"/></radialGradient><linearGradient id="cg11_ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2038"/><stop offset="1" stop-color="#160e22"/></linearGradient></defs><rect width="400" height="240" fill="url(#cg11_sky)"/><rect width="400" height="240" fill="url(#cg11_glow)"/><circle cx="322" cy="52" r="16" fill="#fff4d8" opacity="0.9"/><circle cx="322" cy="52" r="26" fill="#fff4d8" opacity="0.15"/><rect x="34" y="78" width="210" height="98" rx="2" fill="#241a34"/><rect x="44" y="88" width="26" height="22" fill="#ffcf8a" opacity="0.75"/><rect x="84" y="88" width="26" height="22" fill="#ffcf8a" opacity="0.25"/><rect x="124" y="88" width="26" height="22" fill="#ffcf8a" opacity="0.15"/><rect x="164" y="88" width="26" height="22" fill="#ffcf8a" opacity="0.25"/><rect x="204" y="88" width="26" height="22" fill="#ffcf8a" opacity="0.6"/><path d="M28,78 L244,78 L236,70 L36,70 Z" fill="#1a1228"/><rect y="176" width="400" height="64" fill="url(#cg11_ground)"/><rect y="176" width="400" height="4" fill="#4a3858"/><rect y="196" width="400" height="3" fill="#3a2a48" opacity="0.8"/><g fill="#1a1226"><circle cx="178" cy="146" r="11"/><path d="M166,158 C166,170 168,180 170,190 L188,190 C190,178 190,168 188,158 Z"/><circle cx="222" cy="150" r="10"/><path d="M211,161 C211,172 213,181 215,190 L231,190 C233,180 233,170 231,161 Z"/></g><rect x="192" y="176" width="22" height="14" rx="1.5" fill="#fff6e6" transform="rotate(-6 203 183)"/><path d="M193,177 L203,184 L213,177" stroke="#d8b8a0" stroke-width="1" fill="none" transform="rotate(-6 203 183)"/><g fill="#f0a8b8" opacity="0.85"><ellipse cx="70" cy="120" rx="5" ry="2.4" transform="rotate(24 70 120)"/><ellipse cx="130" cy="60" rx="5" ry="2.4" transform="rotate(-20 130 60)"/><ellipse cx="280" cy="92" rx="5" ry="2.4" transform="rotate(32 280 92)"/><ellipse cx="356" cy="140" rx="5" ry="2.4" transform="rotate(-26 356 140)"/><ellipse cx="250" cy="204" rx="5" ry="2.4" transform="rotate(16 250 204)"/><ellipse cx="58" cy="206" rx="5" ry="2.4" transform="rotate(-34 58 206)"/></g><text x="200" y="228" text-anchor="middle" fill="#ffd8e4" font-size="14" font-family="serif">— 看 见 —</text></svg>` },
  { id: "cg_true", title: "樱 花 信", heroine: "真结局", img: "assets/cg/cg_true.webp", svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="cg10_sky" cx="0.5" cy="0.38" r="0.85"><stop offset="0" stop-color="#fff4e0"/><stop offset="0.45" stop-color="#f0b0b8"/><stop offset="1" stop-color="#7a4a6e"/></radialGradient><linearGradient id="cg10_ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2848"/><stop offset="1" stop-color="#241634"/></linearGradient><linearGradient id="cg10_paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f8ecd8"/></linearGradient><radialGradient id="cg10_glow" cx="0.5" cy="0.52" r="0.4"><stop offset="0" stop-color="#fff8e0" stop-opacity="0.75"/><stop offset="1" stop-color="#fff8e0" stop-opacity="0"/></radialGradient></defs><rect width="400" height="240" fill="url(#cg10_sky)"/><g fill="#fff8ee" opacity="0.9"><circle cx="50" cy="30" r="2"/><circle cx="120" cy="20" r="1.6"/><circle cx="260" cy="24" r="1.8"/><circle cx="340" cy="34" r="2.2"/><circle cx="30" cy="66" r="1.5"/></g><g fill="#3a2848"><circle cx="128" cy="80" r="30"/><circle cx="164" cy="62" r="34"/><circle cx="200" cy="52" r="38"/><circle cx="236" cy="62" r="34"/><circle cx="272" cy="80" r="30"/><circle cx="146" cy="96" r="24"/><circle cx="254" cy="96" r="24"/></g><path d="M200,86 L200,168" stroke="#2c1e3a" stroke-width="9"/><path d="M200,110 C186,104 174,96 168,88 M200,118 C214,112 226,104 232,96" stroke="#2c1e3a" stroke-width="5" fill="none"/><g fill="#f0a8b8"><ellipse cx="80" cy="120" rx="6" ry="2.8" transform="rotate(26 80 120)"/><ellipse cx="330" cy="110" rx="6" ry="2.8" transform="rotate(-22 330 110)"/><ellipse cx="46" cy="160" rx="6" ry="2.8" transform="rotate(-38 46 160)"/><ellipse cx="356" cy="166" rx="6" ry="2.8" transform="rotate(30 356 166)"/><ellipse cx="120" cy="200" rx="6" ry="2.8" transform="rotate(14 120 200)"/><ellipse cx="284" cy="204" rx="6" ry="2.8" transform="rotate(-28 284 204)"/></g><rect y="168" width="400" height="72" fill="url(#cg10_ground)"/><rect width="400" height="240" fill="url(#cg10_glow)"/><g transform="rotate(-2 200 148)"><rect x="152" y="112" width="96" height="72" rx="3" fill="url(#cg10_paper)"/><path d="M200,118 C195,110 184,108 178,114 C172,120 174,130 180,134 L200,148 L220,134 C226,130 228,120 222,114 C216,108 205,110 200,118 Z" fill="#e87888"/><g stroke="#c8b8a0" stroke-width="1.2" opacity="0.8"><line x1="164" y1="158" x2="236" y2="156"/><line x1="164" y1="168" x2="228" y2="167"/></g></g><g fill="#ffdf9e"><path d="M150,180 L158,180 L156,192 L152,192 Z"/><path d="M244,178 L252,178 L250,190 L246,190 Z"/></g><text x="200" y="228" text-anchor="middle" fill="#fff8ee" font-size="16" font-family="serif">— 樱 花 信 —</text></svg>` },
];

/* ============ 全结局定义 ============ */
const ENDINGS = [
  { id: "shiyu_good",   heroine: "林诗雨", title: "回 头",   type: "GOOD", note: "分支点：替她写出「活下去」的开场。她会继续写——外婆的那本，也会有下一本。", desc: "她终于敢回头。" },
  { id: "shiyu_normal", heroine: "林诗雨", title: "半 章",   type: "NORMAL", note: "分支点：建议她先写半章。法律系与小说并行，压的方式变成了托举。", desc: "她留下了半章，也留下了自己。" },
  { id: "shiyu_bad",    heroine: "林诗雨", title: "未 活 过", type: "BAD", note: "分支点：说出「也许她该消失一次」。一周后课桌空了——有些话第一次说就该想清楚。", desc: "她回过头，看见的依然没走过。" },
  { id: "xiazhi_good",  heroine: "夏织",   title: "终 点 线", type: "GOOD", note: "分支点：承诺陪她跑到终点线。11.8 秒——第二名，和有人等在终点。", desc: "有人等在终点。" },
  { id: "xiazhi_normal",heroine: "夏织",   title: "第三名", type: "NORMAL", note: "分支点：先劝她治脚。留校复读一年，明年再战，这次有人等。", desc: "她拿了第三，留了下来。" },
  { id: "xiazhi_bad",   heroine: "夏织",   title: "一 个 人", type: "BAD", note: "分支点：说出「你自己就够了」。雨里那一跤，本可以有人在场。", desc: "她终于一个人了。" },
  { id: "sunian_good",  heroine: "苏念",   title: "挣",     type: "GOOD", note: "分支点：看见紫里的人，说出「松手」。省展入口第一幅——《挣》。", desc: "她松开了手。" },
  { id: "sunian_normal",heroine: "苏念",   title: "网 展", type: "NORMAL", note: "分支点：建议小范围网展。退了省展，但留言区每天都有「我也是」。", desc: "她在自己的网展开了个展。" },
  { id: "sunian_bad",   heroine: "苏念",   title: "按 住",   type: "BAD", note: "分支点：说出「也许她不该出来」。画布翻了面，门关了三年。", desc: "她按住了自己。" },
  { id: "senior_shadow", heroine: "学姐",  title: "看 见",   type: "SIDE", note: "达成条件：学姐线全程。她仍是影子，但第一次被看见——看见本身就是解。", desc: "循环没有破，她也没有走；但这一次，她不再是没人看见的影子。" },
  { id: "true_unbroken", heroine: "真结局前章", title: "未 破 环", type: "LOOP ENDING", note: "达成条件：三线 GOOD 后进入真结局。差最后一步：合成「樱花信」。", desc: "你写下了回信，但循环仍在等待最后一步。" },
  { id: "true_end",     heroine: "真结局", title: "樱 花 信", type: "TRUE", note: "达成条件：三线 GOOD + 合成樱花信。祭信 + 未寄信 = 打破循环的钥匙。", desc: "你替她回了一封信，也写下自己。" },
  { id: "afterword",    heroine: "三人",   title: "樱海以后", type: "AFTERWORD", note: "达成条件：真结局破环。信寄出以后——回信角、校刊、第二年春天。", desc: "信寄出以后，三个人各自继续往前走。" },
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
    text: "林诗雨和苏念跑到场边来接我。\n我笑了一下，没让人看出来眼睛红了。\n谢谢你们。",
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
  prologue_2: { day: 1, time: "morning", bg: "cherry_full", speaker: "", text: "我，沈屿。两周前父亲说工作调动，母亲说随你便。两个人已经冷战三个月。我选了住校。",
    loopText: ["我，沈屿。两周前父亲说工作调动，母亲说随你便。两个人已经冷战三个月。我选了住校。",
"我，沈屿。两周前父亲说工作调动，母亲说随你便——等等。这句话我说过。连『随你便』三个字的停顿，都和记忆里一模一样。",
"沈屿。这一次我没有等那句『随你便』落地。我比它更早知道，母亲下一句不会来了。"], next: "prologue_3" },
  prologue_3: { day: 1, time: "morning", bg: "school_gate", speaker: "", text: "手里攥着皱巴巴的入学通知书，胸口闷得发紧。教学楼的钟响起来时，我还没找到教务处。",
    loopText: ["手里攥着皱巴巴的入学通知书，胸口闷得发紧。教学楼的钟响起来时，我还没找到教务处。",
"手里攥着皱巴巴的入学通知书。钟响的节奏我也记得——上一次，是它把我推到了那个戴眼镜的女生面前。",
"入学通知书被我攥得比上次还皱。我甚至记得钟会响几声。可我还是让它响完——有些路，第二次走才看得清岔口。"], next: "prologue_4" },
  prologue_4: { day: 1, time: "morning", bg: "hallway", chars: [{id:"shiyu", pos:"center"}], speaker: "???", text: "——同学，你挡在路中间了。",
    loopText: ["——同学，你挡在路中间了。",
"——同学，你挡在路中间了。……这句台词，和记忆里一字不差。连她抱作业本的姿势都是。",
"——同学，你挡在路中间了。她没有变。变的只是我——这一次，我没有急着让开。我想看看她接下来说什么，哪怕我已经知道了。"], next: "prologue_5", keyword: "林诗雨" },
  prologue_5: { day: 1, time: "morning", bg: "hallway", char: "shiyu", speaker: "", text: "回过头，是个戴眼镜的女生。黑长直，臂弯里抱着一摞作业本，神情是优等生特有的那种礼貌。",
    loopText: ["回过头，是个戴眼镜的女生。黑长直，臂弯里抱着一摞作业本，神情是优等生特有的那种礼貌。",
    "回过头，是个戴眼镜的女生。黑长直，臂弯里抱着一摞作业本，神情是优等生特有的那种礼貌。",
    "回过头——还是那个戴眼镜的女生。第二次，我先看清了她抱作业本的手势：紧，但不乱。紧张的人都有自己的秩序。",
    "又回过头。这一次我在她开口前说了「同学，你挡在路中间了」。她愣住的那半秒，是我赢回来的第一个变化。"], next: "prologue_6" },
  prologue_6: { day: 1, time: "morning", bg: "hallway", char: "shiyu", speaker: "林诗雨", text: "我是高二(3)班班长，林诗雨。你就是今天转来的沈屿吧？班主任让我来接你。",
    loopText: ["我是高二(3)班班长，林诗雨。你就是今天转来的沈屿吧？班主任让我来接你。",
"我是高二(3)班班长，林诗雨。——她说到『林诗雨』三个字时，会下意识扶一下眼镜。我记得。",
"我是高二(3)班班长，林诗雨。她把自我介绍又说了一遍，好像我们是第一次见面。可我知道，她稿纸上那句『角色 A 推开门』，午休前会被划掉第三次。"], next: "prologue_7" },
  prologue_7: { day: 1, time: "morning", bg: "hallway", char: "shiyu", speaker: "沈屿", text: "……麻烦你了。", next: "prologue_8" },
  prologue_8: {
    day: 1, time: "morning", bg: "hallway", char: "shiyu", speaker: "林诗雨",
    text: "跟我来。座位在你前面，看不清黑板就说一声。",
    loopText: ["跟我来。座位在你前面，看不清黑板就说一声。",
"跟我来。座位在你前面，看不清黑板就说一声。——这句话，她上一轮也说过。那时我没听出她声音里藏着的紧张。",
"跟我来。她转身时衣摆带起的风，和记忆里是同一种。这一次我跟得慢了些——我在数，她递地图时手指会抖几下。三次，和上次一样。"],
    next: "prologue_9",
    add: { affection: { shiyu: 1 } },
    cg_unlock: "cg_meet_shiyu",
    memory: { id: "序章·诗雨", title: "走廊相遇", text: "她回头的时候，我以为她在看墙，其实她在看我。" },
    // 视角切换：解锁记忆后可看诗雨内心
    perspective: {
      who: "林诗雨",
      text: "——又是一个不敢抬头的转学生。我递出地图的时候手指在抖，他没看见。我也不想让他看见。其实那张地图我画了三遍。第一遍太潦草，第二遍太用力，第三遍——刚刚好。可我画了三遍这件事，谁也不知道。",
      memory: "诗雨·走廊",
      memoryTitle: "走廊的另一面",
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
  prologue_11: { day: 1, time: "morning", bg: "classroom", char: "shiyu", speaker: "", text: "我坐下的瞬间，前面的林诗雨回过头，把一张校园地图推到我桌上。地图画得极细致。",
    loopText: ["我坐下的瞬间，前面的林诗雨回过头，把一张校园地图推到我桌上。地图画得极细致。",
"我坐下的瞬间，她回过头，把地图推过来。还是那张画了三遍才敢递出的地图——这一次，我多看了它两秒。",
"地图落在桌角的声音，我都能背出来了。可我还是把它摊开——画得很细致，像她每次把真心藏进纸里的样子。"], next: "prologue_12" },
  prologue_12: { day: 1, time: "morning", bg: "classroom", char: "shiyu", speaker: "林诗雨", text: "食堂、图书馆、医务室都标了。找不到就回来问我，别乱跑。",
    loopText: ["食堂、图书馆、医务室都标了。找不到就回来问我，别乱跑。",
    "食堂、图书馆、医务室都标了。找不到就回来问我，别乱跑。",
    "地图上食堂、图书馆、医务室都标了。第二次拿到它，我注意到边角的折痕——她练习过怎么递给我，不止一遍。",
    "第三次，我没等地图递来就说：「图书馆我认识路了。」她「嗯」了一声，把地图收回去了——收得很快，耳根有点红。"], next: "prologue_13" },
  prologue_13: { day: 1, time: "morning", bg: "classroom", speaker: "沈屿", text: "……谢谢。地图画得很清楚。", next: "prologue_14" },
  prologue_14: { day: 1, time: "morning", bg: "classroom", char: "shiyu", speaker: "林诗雨", text: "嗯。", next: "prologue_15" },
  prologue_15: { day: 1, time: "morning", bg: "classroom", speaker: "", text: "她转回去的瞬间，地图边角露出极小一行字，像是被反复涂改过：「角色 A 推开门——」",
    loopText: ["她转回去的瞬间，地图边角露出极小一行字，像是被反复涂改过：「角色 A 推开门——」",
"地图边角那行字还在：「角色 A 推开门——」。上一轮，我把它当成一个谜。这一轮我知道，那是她写给自己的门。",
"『角色 A 推开门——』。这行字被划掉三次又写回来，和记忆里分毫不差。我忽然想告诉她：门不用推开，敲一敲就有人应。"], next: "prologue_16", keyword: "角色A" },
  prologue_16: { day: 1, time: "morning", bg: "classroom", speaker: "沈屿", text: "（……角色 A？她在写什么？）",
    loopText: ["（……角色 A？她在写什么？）",
"（角色 A。上一次我在意的是她在写什么；这一次我在想，她什么时候才肯让角色 A 走出来。）",
"（角色 A 就是她自己——这个答案，上上轮我就知道了。可知道答案和走到她面前，隔着一整个春天。）"], next: "prologue_17" },
  prologue_17: { day: 1, time: "morning", bg: "classroom", char: "shiyu", speaker: "林诗雨", text: "看什么？上课了。", next: "prologue_18" },
  prologue_18: { day: 1, time: "morning", bg: "classroom", speaker: "", text: "上午的课结束得很慢。下课铃一响，教室瞬间炸开。我正想躲出去透气——", next: "prologue_19" },
  prologue_19: { day: 1, time: "noon", bg: "field", char: "xiazhi", speaker: "夏织", text: "转学生！正好——你是新来的对吧？田径社缺人，下午来试一下！",
    loopText: ["转学生！正好——你是新来的对吧？田径社缺人，下午来试一下！",
"转学生！——她每次喊『转学生』，都是这个调子，上扬，像起跑的枪声。",
"她还是风风火火地扑过来，像一枚停不下来的发令枪。我知道她左脚踝那道旧伤会在哪一步发疼——这一轮，我打算早一点看见。"], next: "prologue_20", cg_unlock: "cg_meet_xiazhi" },
  prologue_20: { day: 1, time: "noon", bg: "field", speaker: "沈屿", text: "你是……？", next: "prologue_21" },
  prologue_21: { day: 1, time: "noon", bg: "field", char: "xiazhi", speaker: "夏织", text: "夏织，田径社王牌兼招新委员！哇你腿挺长的，天生练短跑的料。",
    loopText: ["夏织，田径社王牌兼招新委员！哇你腿挺长的，天生练短跑的料。",
"夏织。她的自我介绍和我记的一字不差——连『哇你腿挺长的』那句都在。她笑的时候，眼睛是弯的。",
"夏织，田径社王牌。这句话她说了三次，一次比一次更怕被听见。我在想，她什么时候才能不靠『跑』来证明自己值得被留下。"], next: "prologue_22", add: { affection: { xiazhi: 1 } } },
  prologue_22: { day: 1, time: "noon", bg: "field", speaker: "沈屿", text: "我没怎么跑过……", next: "prologue_23" },
  prologue_23: { day: 1, time: "noon", bg: "field", char: "xiazhi", speaker: "夏织", text: "没事，下午放学来操场就行。不来我就去班里堵你！", next: "prologue_24" },
  prologue_24: { day: 1, time: "noon", bg: "hallway", char: null, speaker: "", text: "她风一样走了。我盯着手里被塞进的传单，苦笑。下午放学，我故意绕了远路，结果还是迷了路。",
    loopText: ["她风一样走了。我盯着手里被塞进的传单，苦笑。下午放学，我故意绕了远路，结果还是迷了路。",
"她风一样走了，传单塞进我手里的角度都没变。下午放学我故意绕远路——结果还是迷了路。可这一次，我是故意迷的。",
"传单上『田径社招新』四个字，我都能默写了。我还是绕了远路。有些迷路是注定的——它把你送到该去的人面前。"], next: "prologue_25" },
  prologue_25: { day: 1, time: "evening", bg: "art_room", char: "sunian", speaker: "???", text: "……别动。",
    loopText: ["……别动。",
    "……别动。",
    "……别动。第二次听到这两个字，我没有退出去，而是顺着画布的边缘看进去——紫的深处，真的有人在动。",
    "「别动。」这次是我先说的——在她抬头之前。她看了我一眼，那是第一次，她的眼神里有「你居然懂」。"], next: "prologue_26", cg_unlock: "cg_meet_sunian" },
  prologue_26: { day: 1, time: "evening", bg: "art_room", speaker: "", text: "推开半掩的门，画室里只有一个女生，对着画布发呆。她的头发是淡紫渐变，像被人泼了一桶月光。",
    loopText: ["推开半掩的门，画室里只有一个女生，对着画布发呆。她的头发是淡紫渐变，像被人泼了一桶月光。",
"推开半掩的门。还是那个对着画布发呆的女生，头发淡紫，像月光泼上去的。画布上的紫，也和上次一样，没有干透。",
"画室的门没有锁，她也没有抬头。我知道她卡在那片紫里三年了——这一次，我不打算只说『抱歉，我迷路了』。"], next: "prologue_27", keyword: "紫" },
  prologue_27: { day: 1, time: "evening", bg: "art_room", char: "sunian", speaker: "苏念", text: "门。你挡到光了。",
    loopText: ["门。你挡到光了。",
"门。你挡到光了。——她说话还是这么短。短到像她画布上那片不肯干的紫，什么都不肯多说。",
"『门。你挡到光了。』这句话她说过三遍，一遍比一遍轻。我知道那不是赶我走——是她太久没被谁挡住过光。"], next: "prologue_28" },
  prologue_28: { day: 1, time: "evening", bg: "art_room", speaker: "沈屿", text: "抱歉，我迷路了……", next: "prologue_29" },
  prologue_29: { day: 1, time: "evening", bg: "art_room", char: "sunian", speaker: "苏念", text: "美术室在东侧尽头。你走反了。出去时把门带上。",
    loopText: ["美术室在东侧尽头。你走反了。出去时把门带上。",
    "美术室在东侧尽头。你走反了。出去时把门带上。",
    "美术室在东侧尽头——你走反了。第二年的我听出了这句话的另一层：她在赶的不是我，是她自己画不下去的那口气。",
    "「你走反了。」第三次，我笑着回她：「我是故意的。」她转回去的背影顿了一下——门，我没有带上。"], next: "prologue_30" },
  prologue_30: { day: 1, time: "evening", bg: "art_room", speaker: "", text: "她连头都没回。画布上是一片未干的紫，像是把整个黄昏都压了进去。",
    loopText: ["她连头都没回。画布上是一片未干的紫，像是把整个黄昏都压了进去。",
"她连头都没回。紫还是那片紫——可我忽然懂了，那不是颜色，是一个人憋了三年的那口气。",
"那片紫里，我看见了上一轮没看见的东西：她在画里留了一道缝。她一直在等一个人，把那道缝指给她看。"], next: "prologue_31" },
  prologue_31: { day: 1, time: "evening", bg: "school_gate", char: null, speaker: "", text: "走出校门时，太阳已经压到海面上。樱花大道尽头是橘色的海。", next: "prologue_32" },
  prologue_32: { day: 1, time: "evening", bg: "school_gate", speaker: "", text: "书包侧袋里多了一样东西——一张折成樱花瓣形状的信纸，没有署名。",
    loopText: ["书包侧袋里多了一样东西——一张折成樱花瓣形状的信纸，没有署名。",
"书包侧袋里，那张折成樱花瓣的信纸准时出现。上一轮我吓了一跳；这一轮，我伸手接住了它。",
"信纸落在侧袋里的声音很轻，可我已经在等它了。折痕和上一次一模一样——写信的人，大概不知道我已经认得她的字。"], next: "prologue_33", keyword: "匿名信", cg_unlock: "cg_letter" },
  prologue_33: { day: 1, time: "evening", bg: "home_room", speaker: "", text: "「致转学生：第一个周末，请你做一个选择。樱海有三条未走完的路，你会走哪一条？」",
    loopText: ["「致转学生：第一个周末，请你做一个选择。樱海有三条未走完的路，你会走哪一条？」",
"「致转学生：第一个周末，请你做一个选择……」上一轮，我把它当成恐吓。这一轮，我把它读成一句请求——有人希望我替她走完。",
"『樱海有三条未走完的路』。我知道写信的人，三条路都没走完。这一次我对着信纸轻声说：我会的，一条一条来。"], next: "prologue_34" },
  prologue_34: { day: 1, time: "evening", bg: "home_room", speaker: "沈屿", text: "……谁放的？",
    loopText: ["……谁放的？",
    "……谁放的？",
    "……谁放的？第二次捏起这封信，我先看了折痕——樱花瓣的形状折得很熟练。写它的人，折过很多次信。",
    "第三次拿起信。我已经知道是谁放的——但我装作不知道。有些谜，留着她亲口说，才算回信。"], next: "prologue_35" },
  prologue_35: { day: 1, time: "evening", bg: "home_room", speaker: "", text: "没有人回答。窗外樱花簌簌。我决定先睡，第二天再看。",
    loopText: ["没有人回答。窗外樱花簌簌。我决定先睡，第二天再看。",
"没有人回答。樱花还是那样簌簌地落。我没有睡——我知道明早醒来，一切都会重来，而我要带着记得的东西出发。",
"我关灯躺下，数着窗外的樱花瓣。它们落下的节奏我能背出来。可这一轮，我不打算睡了——我想在循环开始前，先想清楚要写下什么。"], next: "d1_night_stars" },

  /* ============ 共通线 · 第 2 日 ============ */
  common_day2_morning: {
    day: 2, time: "morning", bg: "classroom", char: "shiyu", speaker: "",
    text: "第二天早自习。林诗雨的笔在纸上沙沙作响，写一会儿又涂掉。夏织从前门探了个头进来，被她躲开了。苏念的座位是空的——美术社的人常翘早自习。",
    loopText: ["第二天早自习。林诗雨的笔在纸上沙沙作响，写一会儿又涂掉。夏织从前门探了个头进来，被她躲开了。苏念的座位是空的——美术社的人常翘早自习。",
"第二天早自习。诗雨的笔在纸上沙沙作响，涂改的节奏我都记得。夏织探进来的头、苏念空着的座位——一切按部就班，像一场排好的戏。而我，是唯一记得剧本的人。",
"早自习的沙沙声、夏织的头、苏念的缺席——我闭上眼都能数出来。可这次我不急着改变谁。我在等她们自己先开口。"],
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
  d2_senior_easter_3: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "诗雨的小说，写下去比写完重要。夏织的脚，停下来比跑出去重要。苏念的紫，松手比画完重要。", loopText: ["诗雨的小说，写下去比写完重要。夏织的脚，停下来比跑出去重要。苏念的紫，松手比画完重要。",
"三句话，上一轮我当成攻略；这一轮我听出它们是同一句——「写下去 / 停下来 / 松手」，才是她们各自缺的那一下。",
"「写下去、停下来、松手。」这一轮我记住的不再是答案，而是她说话时看着远处的样子：这三句，也是她三年前没能对自己说的。"], next: "d2_senior_easter_4" },
  d2_senior_easter_4: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "你不必替她们走完。你只要在她们卡住的时候，递一句话。这封信——也替我递给自己。", loopText: ["你不必替她们走完。你只要在她们卡住的时候，递一句话。这封信——也替我递给自己。",
"「不必替她们走完，只要在卡住时递一句话。」上一轮我急着替她们做决定；这一轮我才听懂——递，不是替。",
"「这封信，也替我递给自己。」这一轮我在心里应了一声：原来她要的从不是解谜，是有人肯把话原样交还。"], next: "d2_senior_easter_5", cg_unlock: "cg_letter" },
  d2_senior_easter_5: { day: 2, time: "morning", bg: "hallway", char: "senior", speaker: "学姐", text: "去吧。下午食堂见。", next: "d2_noon" },
  d2_library_1: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "", text: "图书馆二楼靠窗的位置，林诗雨正埋头抄写着什么。听到脚步声，她飞快把本子塞进抽屉。", next: "d2_library_2" },
  d2_library_2: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……你来干嘛？", next: "d2_library_3" },
  d2_library_3: { day: 2, time: "morning", bg: "library", speaker: "沈屿", text: "还书。顺便——你藏的那个本子，是在写小说？", next: "d2_library_4" },
  d2_library_4: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……你看到了？", next: "d2_library_5" },
  d2_library_5: { day: 2, time: "morning", bg: "library", speaker: "沈屿", text: "只看到「角色 A 推开门」。继续写下去吧，我不打扰你。", next: "d2_library_6" },
  d2_library_6: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……没人知道我在写。家里希望我考法律系。如果让他们知道——", next: "d2_library_7" },
  d2_library_7: { day: 2, time: "morning", bg: "library", speaker: "沈屿", text: "那你为什么还在写？", next: "d2_library_8" },
  d2_library_8: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "因为……不写的话，我会忘掉自己是谁。这本小说，是写给我外婆的。她去年走了，是个作家。", loopText: ["因为……不写的话，我会忘掉自己是谁。这本小说，是写给我外婆的。她去年走了，是个作家。",
"「不写的话，我会忘掉自己是谁。」上一轮我听见的是害怕；这一轮我听见她在说——她已经在忘，所以更要写。",
"这本小说是写给外婆的。这一轮我才懂：她写的不是外婆，是外婆留给她、她又要留给自己的那支笔。"], next: "d2_library_doodle", set: { flag_shiyu_secret: true, flag_shiyu_grandma: true } },
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
  d2_library_encourage: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……这一笔这么用力。原来推开门也可以是这种姿势。", next: "d2_library_9", memory: { id: "诗雨·开场·鼓励", title: "推门一笔", text: "你画的那一笔，她照着写下了开场。" }, echoSave: { id: "echo_brave", text: "敢", ctx: "图书馆·帮林诗雨画开场" } },
  d2_library_calm: { day: 2, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……很安静的一笔。原来她推开门时也可以不害怕。", next: "d2_library_9", memory: { id: "诗雨·开场·安静", title: "推门一笔", text: "你画的那一笔很安静，她跟着写下了开场。" } },
  d2_library_9: { day: 2, time: "morning", bg: "library", speaker: "", text: "窗外的樱花被风吹进图书馆，落在她摊开的稿纸上。她没去拂，只是看着它。", next: "d2_noon" },

  d2_field_1: { day: 2, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "来了来了！热身先跑两圈——欸你怎么脸那么白，没吃早饭？", next: "d2_field_2" },
  d2_field_2: { day: 2, time: "morning", bg: "field", speaker: "沈屿", text: "吃了。你不用训练吗？", next: "d2_field_3" },
  d2_field_3: { day: 2, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "我？我备战全国赛。教练说再不拿名次，特招名额就没了。", next: "d2_field_4" },
  d2_field_4: { day: 2, time: "morning", bg: "field", speaker: "沈屿", text: "特招？", next: "d2_field_5" },
  d2_field_5: { day: 2, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……嗯。家里那边，挺复杂的。我妈再婚了。只有跑出去，我才能——算了，不说了。陪我跑一组？", loopText: ["……嗯。家里那边，挺复杂的。我妈再婚了。只有跑出去，我才能——算了，不说了。陪我跑一组？",
"她说「只有跑出去，我才能——」然后停住了。上一轮我以为是跑成绩；这一轮我想，她要跑出的也许是那个家。",
"「算了，不说了。」这一轮我记住：她每次把话咽回去，都会多跑一组——把没说完的，跑成一圈圈的喘。"], next: "d2_field_6", set: { flag_xiazhi_family: true } },
  d2_field_6: { day: 2, time: "morning", bg: "field", speaker: "", text: "她的笑容在阳光底下很亮，可我总觉得那下面压着什么。跑完后她塞给我一瓶水。", next: "d2_noon" },

  d2_art_1: { day: 2, time: "morning", bg: "art_room", char: "sunian", speaker: "", text: "美术室里只有苏念一人。画布上还是那片紫，但角落多了几道焦黑的划痕。", next: "d2_art_2" },
  d2_art_2: { day: 2, time: "morning", bg: "art_room", speaker: "沈屿", text: "昨天那幅……还没画完？", next: "d2_art_3" },
  d2_art_3: { day: 2, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "画不完。它不让我画完。紫色是我哥哥最喜欢的颜色。他三年前走了。", loopText: ["画不完。它不让我画完。紫色是我哥哥最喜欢的颜色。他三年前走了。",
"「画不完。它不让我画完。」上一轮我听成托词；这一轮我懂了——不是画布不让，是她不肯让紫色的那一笔结束。",
"紫色、哥哥、三年前。这一轮我明白：她守着的不是一幅画，是一个再也不会回来的人留下的唯一颜色。"], next: "d2_art_4", set: { flag_sunian_block: true, flag_sunian_brother: true } },
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
        { id: "brave", keywords: ["敢", "勇气", "试试", "走", "推"], add: { affection: { shiyu: 2 } }, personality: { brave: 2 }, memory: "诗雨·敢", memoryTitle: "回信·推开门" },
        { id: "calm",  keywords: ["停", "等", "慢慢", "别急"], add: { affection: { shiyu: 1 } }, personality: { kind: 2 }, memory: "诗雨·停", memoryTitle: "回信·等一等" },
      ]
    },
    // v0.5.0 朋友圈：夏织发布动态
    moment: "m_d2_xiazhi"
  },
  d2_noon_2: { day: 2, time: "noon", bg: "cafeteria", chars: [{id:"xiazhi", pos:"left"}, {id:"shiyu", pos:"right"}], speaker: "夏织", text: "这儿这儿！转学生，坐我跟班长中间！",
    loopText: ["这儿这儿！转学生，坐我跟班长中间！",
"这儿这儿！转学生！——她招手的样子和上次一样，好像我们是多年没见的老朋友。我走过去，坐在她指的位置。",
"她拍着身边的空位喊我。那个位置我坐过一遍了——但这一轮，我想换个角度，看看她说完那句话之后，低着头的样子。"], next: "d2_noon_3" },
  d2_noon_3: { day: 2, time: "noon", bg: "cafeteria", char: null, speaker: "", text: "夏织和林诗雨居然坐在一起。一个像太阳，一个像月亮，气场却并不冲突。", next: "d2_noon_4" },
  d2_noon_4: { day: 2, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "夏织，运动会报名表你交了没？",
    loopText: ["夏织，运动会报名表你交了没？",
    "夏织，运动会报名表你交了没？第二次听到这句开场白——上次我以为是闲聊，这次我听出来了：她在替夏织紧张。",
    "报名表。第三次了。我现在知道这场对话会通向哪里——也终于看清，诗雨的每一句「闲聊」，都是她的关心练习。"], next: "d2_noon_5" },
  d2_noon_5: { day: 2, time: "noon", bg: "cafeteria", char: "xiazhi", speaker: "夏织", text: "交了交了。女子 100 米、4×100 接力。诗雨你呢？", next: "d2_noon_6" },
  d2_noon_6: { day: 2, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "我只报了 1500 米。走个过场。", next: "d2_noon_7" },
  d2_noon_7: { day: 2, time: "noon", bg: "cafeteria", speaker: "沈屿", text: "苏念呢？", next: "d2_noon_8" },
  d2_noon_8: { day: 2, time: "noon", bg: "cafeteria", char: "xiazhi", speaker: "夏织", text: "苏念？她运动会从来都请假。美术社那帮人跟我们不是一个次元。", next: "d2_noon_9" },
  d2_noon_9: { day: 2, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "……她其实来过。去年看了一会儿就走了，没报名。",
    loopText: ["……她其实来过。去年看了一会儿就走了，没报名。",
    "……她其实来过。去年看了一会儿就走了。第二次听这句，我多懂了一层——苏念不是不想来，是不敢让别人看见她想。",
    "去年来看一眼就走的苏念。第三次听这段，我转头去找她的眼神——这一次，她没有躲。"], next: "d2_noon_10" },
  d2_noon_10: { day: 2, time: "noon", bg: "cafeteria", speaker: "", text: "我注意到她们说苏念时，眼神都温和了一些。原来三个人之间，是有故事的。", next: "d2_evening" },
  d2_evening: { day: 2, time: "evening", bg: "home_room", char: null, speaker: "", text: "晚上回宿舍。匿名信的事还压在心里。我决定先把信收好，明天再想。临睡前做了个奇怪的梦——",
    loopText: ["晚上回宿舍。匿名信的事还压在心里。我决定先把信收好，明天再想。临睡前做了个奇怪的梦——",
"晚上回宿舍。匿名信还压在原处，折痕却像被人多看了一眼。我没有像上次那样把它放回抽屉深处——我把它放在枕边，让明天的我第一眼就能看见。",
"我躺在黑暗里，等那个梦准时来找我。它总会来的，像信一样准时。这一轮我打算记住梦的每一帧——循环里，记得住的人才有资格改写。"], next: "d2_dreamweave" },

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
  common_day3_morning: { day: 3, time: "morning", bg: "classroom", speaker: "班主任", text: "运动会预选今天下午开始。各项目负责人课间到体育组抽签。",
    loopText: ["运动会预选今天下午开始。各项目负责人课间到体育组抽签。",
"运动会预选今天下午开始。——连班主任这句通知的尾音，我都记得。下午会发生什么，我也记得：夏织会崴脚，诗雨会攥着冰袋站在场边。",
"『预选今天下午开始』。我抬头看了夏织一眼，她正趴在桌上补觉，不知道几小时后她的左脚会背叛她。这一轮，我要赶在那之前出现。"], next: "d3_choice" },

  /* ============ v0.9.0 星座连线 ============ */
  d1_night_stars: {
    day: 1, time: "night", bg: "rooftop", char: "shiyu", speaker: "林诗雨",
    text: "——晚自习后。林诗雨在楼梯口等我：「天台今晚有星，值得迟到一次。」风很轻。她指着头顶：「你看，那几颗连起来，像不像一封信？」",
    next: "d1_night_home",
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
          next: "d1_night_home" },
        { stars: ["cherry_a","heart","cherry_b"], tag: "cherry_heart",
          label: "——樱花落在心上",
          text: "三颗星连成樱花包着一颗心。林诗雨轻声说：「樱花和心——你把它们连在一起了。」",
          add: { affection: { shiyu: 1 } }, personality: { kind: 2 },
          memory: { id: "星座·樱心", title: "樱花与心", text: "你连出樱花包着心。林诗雨轻声说，你把它们连在一起了。" },
          next: "d1_night_home" },
        { stars: ["letter_a","north_star","letter_b"], tag: "letter_only",
          label: "——只有信的形状",
          text: "三颗星连成信的轮廓，没有收信人。林诗雨说：「写了，但没寄出去——也行。」",
          add: { affection: { shiyu: 0 } }, personality: { honest: 1 },
          next: "d1_night_home" }
      ],
      fallback: { tag: "scattered_stars", label: "——散落的星",
        text: "星点连不成特别的形状。林诗雨抬头看了很久，说：「没关系，今晚的星，本来就乱。」",
        next: "d1_night_home" }
    }
  },
  d1_night_home: {
    day: 1, time: "night", bg: "home_room", char: null, speaker: "沈屿",
    text: "回到宿舍，父亲发来一句：「住得还习惯吗？」母亲紧跟着问：「晚上吃了吗？」他们没有再把话题丢回「随你便」。我分别回了消息，告诉他们我会照顾好自己，也会在周末打电话。冷战没有立刻结束，但我们终于重新说上了话。",
    next: "common_day2_morning",
    set: { flag_parents_reopened: true }
  },

  /* ============ v0.9.0 心声听诊 ============ */
  d3_stethoscope: {
    day: 3, time: "afternoon", bg: "field", char: "xiazhi", speaker: "夏织",
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
  common_day3_afternoon: {
    day: 3, time: "afternoon", bg: "sportsmeet", char: null, speaker: "",
    text: "预选赛的人群渐渐散去。掌心里那阵急促的心跳还没平复，我陪她们走到医务室门口，才独自回宿舍。",
    next: "d3_evening"
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
          next: "d4_puzzle_named" },
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
  d4_puzzle_named: {
    day: 4, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "「樱信·夜名」。我把那个「名」字在指尖描了一遍又一遍。署名是樱——可夜里写信的人，为什么不敢写下自己的名字？我把碎片按原样收好，把那个字抄在手心。等哪一天能对上号，我再当面问她。",
    next: "d4_evening_scent"
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
          next: "d5_perfume_sakura" },
        { ids: ["lemon_zest","ink","rain_warm"], tag: "summer_ink",
          label: "——夏墨暖雨",
          text: "柠檬、墨水、暖雨。一瓶夏天的墨水。苏念皱眉：「太冲——但也对。」她说这就是夏织的味道。",
          add: { affection: { xiazhi: 1, sunian: 1 } }, personality: { active: 2 },
          memory: { id: "调香·夏墨", title: "夏墨暖雨", text: "你调出夏墨暖雨。苏念说这就是夏织的味道。" },
          next: "d5_perfume_other" },
        { ids: ["cherry_blossom","ink","dusk_wood"], tag: "quiet_dusk",
          label: "——静暮",
          text: "樱花、墨水、暮木。一瓶很静的香水。苏念没说话，把瓶盖拧紧：「这瓶先收着。」",
          add: { affection: { shiyu: 1, sunian: 1 } }, personality: { kind: 1, honest: 1 },
          memory: { id: "调香·静暮", title: "静暮", text: "你调出很静的香水。苏念说先收着。" },
          next: "d5_perfume_other" }
      ],
      fallback: { tag: "default_scent", label: "——不成香",
        text: "三种气味凑在一起，没成什么特别的香。苏念笑笑：「也行——一瓶普通的香水。」",
        next: "d5_perfume_other" }
    }
  },
  d5_perfume_sakura: {
    day: 5, time: "noon", bg: "art_room", char: "sunian", speaker: "苏念",
    text: "她把「樱时信笺」举到窗光下看了很久，忽然塞回我手里：「这瓶送你——第一瓶，要留证据。」瓶签的空白处，她一笔一画写下调香的日期。「等樱花祭那天再开封。正好。」",
    next: "common_day5_afternoon"
  },
  d5_perfume_other: {
    day: 5, time: "noon", bg: "art_room", char: "sunian", speaker: "苏念",
    text: "无论哪一瓶，苏念都收进了她的木匣，贴上手写标签——日期、天气、还有一起调香的人。「气味是会跑的记忆，」她说，「标签是拴住它的绳子。」",
    next: "common_day5_afternoon"
  },
  common_day5_afternoon: {
    day: 5, time: "afternoon", bg: "art_room", char: null, speaker: "",
    text: "香水在窗边慢慢沉下来。离开美术室时，我终于决定，接下来的路要认真走完。",
    loopText: ["香水在窗边慢慢沉下来。离开美术室时，我终于决定，接下来的路要认真走完。",
"香水在窗边慢慢沉下来。上一轮我也在这里下了决心，可决心没有带进循环。这一轮我把它写在信纸背面——我要带着它去见该见的人。",
"最后一缕香散尽时，我对着空气说：这一次，我不会再让决定烂在肚子里。窗外樱花正落，我知道它们还会再开。"],
    next: "common_day5_morning"
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
  d3_noon: { day: 3, time: "noon", bg: "sportsmeet", char: null, speaker: "", text: "下午，运动会预选。操场被各色运动服染成流动的色块。",
    loopText: ["下午，运动会预选。操场被各色运动服染成流动的色块。",
"下午，运动会预选。各色运动服汇成的色块和记忆里一样，可我的视线只跟着一个人移动——我知道她会在 60 米处踉跄。",
"枪响之前，操场上的喧闹我能听出每一个层次。人群会为夏织欢呼，也会在她摔倒时安静下来——那几秒的安静，我上一轮就记住了。"], next: "d3_noon_2" },
  d3_noon_2: { day: 3, time: "noon", bg: "sportsmeet", char: "xiazhi", speaker: "", text: "女子 100 米预选。夏织在第三道。发令枪响，她第一个冲出去。", next: "d3_noon_3", cg_unlock: "cg_sportsmeet" },
  d3_noon_3: { day: 3, time: "noon", bg: "sportsmeet", char: "xiazhi", speaker: "", text: "——但 60 米处，她左脚一软。她踉跄了一下，咬着牙没倒，最后第二名冲线。", next: "d3_noon_4" },
  d3_noon_4: { day: 3, time: "noon", bg: "sportsmeet", char: "xiazhi", speaker: "夏织", text: "……没事。没事！只是崴了一下。",
    loopText: ["……没事。没事！只是崴了一下。",
    "……没事。没事！只是崴了一下。她的「没事」我听过太多次——每一次的语速都比上一次快一点。",
    "没事、没事！这次我没有信，也没有拆穿——我只是把冰袋提前准备好了。"], next: "d3_noon_5" },
  d3_noon_5: { day: 3, time: "noon", bg: "sportsmeet", chars: [{id:"shiyu", pos:"left"}, {id:"sunian", pos:"right"}], speaker: "", text: "我看到林诗雨和苏念都站在场边。林诗雨手里攥着冰袋，苏念抱着画本，谁都没说话。",
    loopText: ["我看到林诗雨和苏念都站在场边。林诗雨手里攥着冰袋，苏念抱着画本，谁都没说话。",
"我看到诗雨攥着冰袋、苏念抱着画本站在场边，谁都没说话——上一轮我以为是她们怯场。这一轮我才看懂：她们不是不敢上前，是在等一个比自己更合适的时机。",
"她们还是站在那里，安静得像一幅画。我知道几分钟后，画里会多一个冲出去的影子。这一轮，那个影子是我。"], next: "d3_noon_6" },
  d3_noon_6: { day: 3, time: "noon", bg: "sportsmeet", speaker: "", text: "夏织抬头看到她们，愣了一下，然后笑得眼睛弯成月亮：「都来啦？」", next: "d3_stethoscope" },
  d3_evening: {
    day: 3, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "回宿舍。我打开抽屉，匿名信旁边又多了一封。我忽然想起白天画在林诗雨稿纸上的那一笔——一个字，从指尖跑了出去。",
    loopText: ["回宿舍。我打开抽屉，匿名信旁边又多了一封。我忽然想起白天画在林诗雨稿纸上的那一笔——一个字，从指尖跑了出去。",
"回宿舍。抽屉里又多了一封信，像有人掐着表放的。我盯着白天在诗雨稿纸上落下的那个字——它跑出去了，这次我不打算把它追回来。",
"第二封信躺在匿名信旁边，连角度都和上次一样。我拿起它时没有拆——我知道里面问的，是上一轮我没答完的问题。"],
    next: "letter_1",
    // v0.6.0 回声：玩家画过的"敢"在夜里复现
    echo: {
      id: "echo_brave",
      text: "敢",
      ctx: "图书馆·帮林诗雨画开场",
      choices: [
        { text: "承认：是我说的。", value: "admit",
          add: { affection: { shiyu: 2 } }, personality: { brave: 2, honest: 2 },
          memory: { id: "回声·敢·承认", title: "夜里承认", text: "夜里我承认了——是我写的「敢」。她没说，但她听见了。" },
          next: "letter_1" },
        { text: "否认：那不是我说的。", value: "deny",
          add: { affection: { shiyu: -1 } }, personality: { honest: -2 },
          memory: { id: "回声·敢·否认", title: "夜里否认", text: "夜里我否认了。但那个字，确实是我写的。" },
          next: "letter_1" },
        { text: "沉默：不回答。", value: "silent",
          add: { affection: { shiyu: 0 } }, personality: { kind: 1 },
          memory: { id: "回声·敢·沉默", title: "夜里沉默", text: "夜里我沉默了。沉默也是一种回答。" },
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
  common_day4_morning: { day: 4, time: "morning", bg: "classroom", speaker: "班主任", text: "学园祭还有一周。各班今天定主题。文艺社、田径社、美术社都要出节目。",
    loopText: ["学园祭还有一周。各班今天定主题。文艺社、田径社、美术社都要出节目。",
"学园祭还有一周。三个社要出节目——上一轮我以为这是巧合，这一轮我知道，有人在背后把她们推到了同一个舞台。",
"『学园祭还有一周』。公告栏的纸还是白的，可我已经能看见一周后它贴满海报的样子。这一轮，我想让那三张海报，署上同一个名字。"], next: "d4_choice" },
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
  d4_shiyu_poem_good: { day: 4, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……意象这么多。你写的不是诗，是一整片春天。", next: "d4_noon", memory: { id: "诗雨·题记·丰沛", title: "丰沛的诗", text: "你拼的诗意象丰沛。她把它写进了章末。" } },
  d4_shiyu_poem_spare: { day: 4, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……这么少。可诗里最美的就是省略号。", next: "d4_noon", memory: { id: "诗雨·题记·省略", title: "省略的诗", text: "你拼的诗只有寥寥几个字。她说，省略也是诗。" } },
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
  d4_xiazhi_sync: { day: 4, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……你跟上了。很少人跟得上我。她说这话时没看我，看的是跑道尽头。", next: "d4_noon", memory: { id: "夏织·同步·跟上", title: "跟上她的呼吸", text: "你跟上了夏织的节奏。她没说，但她记住了。" } },
  d4_xiazhi_lost: { day: 4, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……乱了？没关系。节奏这东西，乱了再找回来就行。", next: "d4_noon", memory: { id: "夏织·同步·乱了", title: "乱了的呼吸", text: "你没跟上夏织的节奏。她说，乱了再找回来就行。" } },
  d4_sunian_1: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……美术社要办画展。我得交一幅。", next: "d4_sunian_2" },
  d4_sunian_2: { day: 4, time: "morning", bg: "art_room", speaker: "沈屿", text: "你不是卡了三年吗？", next: "d4_sunian_3" },
  d4_sunian_3: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……学园祭的展出作品得先交。省展邀请要的是另一幅新作，不能拿这幅顶上。帮我搬旧画，看看有没有能改的。", next: "d4_sunian_4" },
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
    text: "……学园祭的展出作品整理好了。省展那幅新作还没动笔。沈屿，帮我拍一张海报——把那束紫光取进去，别的不重要。",
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
  d4_sunian_shot_good: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……这张。你看，紫在里面活着。", next: "d4_noon", memory: { id: "苏念·海报·取景", title: "取景里的紫", text: "你取的景把紫光斑拍了进去。她说，紫在里面活着。" } },
  d4_sunian_shot_bad: { day: 4, time: "morning", bg: "art_room", char: "sunian", speaker: "苏念", text: "……没取到。但没关系，画本身就在。", next: "d4_noon", memory: { id: "苏念·海报·未取", title: "没取到的紫", text: "你没把紫光斑取进去。她说，画本身就在。" } },
  d4_noon: { day: 4, time: "noon", bg: "cafeteria", char: null, speaker: "", text: "中午吃饭时，三女主破天荒坐到了一桌。我端着托盘远远看着。",
    loopText: ["中午吃饭时，三女主破天荒坐到了一桌。我端着托盘远远看着。",
"中午，她们三个又坐到了一桌——上一轮我以为这是破天荒。这一轮我端着托盘走过去，才发现那张桌子，本来就是给四个人留的。",
"她们三个坐在同一张桌前，中间空着一个位子。我走过去坐下时，没有人抬头，但夏织往旁边挪了挪——她们早就习惯了我存在，只是嘴上不说。"], next: "d4_noon_2" },
  d4_noon_2: { day: 4, time: "noon", bg: "cafeteria", chars: [{id:"shiyu", pos:"left"}, {id:"xiazhi", pos:"center"}, {id:"sunian", pos:"right"}], speaker: "夏织", text: "我提议——学园祭那天，我们三个一起出节目。诗雨写本子，我跑展，苏念画海报。", next: "d4_noon_3" },
  d4_noon_3: { day: 4, time: "noon", bg: "cafeteria", char: "shiyu", speaker: "林诗雨", text: "……可以。",
    loopText: ["……可以。",
    "……可以。她的「可以」只用了 0.5 秒——上一次我没注意这个速度。答应自己想做的事时，人是不会犹豫的。",
    "……可以。三个人的「可以」叠在一起——这是我听过最整齐的一次和声。"], next: "d4_noon_4" },
  d4_noon_4: { day: 4, time: "noon", bg: "cafeteria", char: "sunian", speaker: "苏念", text: "海报……我画。",
    loopText: ["海报……我画。",
    "海报……我画。苏念的句子里没有主语——她把自己藏在动词后面。这一次我开始学会替她把主语找回来。",
    "海报我画。三个字，一年比一年完整。最后那一年，她说的是「我画，也想署名」。"], next: "d4_noon_5" },
  d4_noon_5: {
    day: 4, time: "noon", bg: "cafeteria", speaker: "",
    text: "三个互不相让的人，难得地达成了默契。我忽然意识到，她们才是彼此的「三条路」。",
    next: "d4_evening",
    // v0.5.0 朋友圈：三女主同时发动态
    moment: ["m_d4_shiyu", "m_d3_group"]
  },
  d4_evening: { day: 4, time: "evening", bg: "home_room", char: null, speaker: "", text: "晚上。第三封信到了。「问题：如果三条路其实通向同一个地方，你还要走吗？」我没急着回信，先坐在窗边——窗外的味道忽然很熟。",
    loopText: ["晚上。第三封信到了。「问题：如果三条路其实通向同一个地方，你还要走吗？」我没急着回信，先坐在窗边——窗外的味道忽然很熟。",
"晚上。第三封信准时落在窗台。「如果三条路其实通向同一个地方」——上一轮我被这个问题绊住了。这一轮我知道答案：要。因为路不是用来选的，是用来走的。",
"信纸展开的沙沙声，我已经很熟悉了。窗外的味道也熟——是颜料、是汗水、是书页。我忽然明白，那个写信的人，正把三条路的味道一起寄给我。"], next: "d4_puzzle" },

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
          memory: { id: "沉默·回信·承认", title: "夜里承认不知道", text: "夜里我承认我不知道怎么回。她没说话，但她听见了。" },
          next: "d4_touch" },
        { text: "我不想回。", value: "refuse",
          add: { affection: { shiyu: -1 } }, personality: { brave: 1 },
          next: "d4_touch" }
      ],
      silent: {
        text: "（你保持沉默。窗外的樱花落了一片，盖在信纸上。）",
        add: { affection: { shiyu: 0 } }, personality: { kind: 1 },
        memory: { id: "沉默·回信·沉默", title: "夜里的沉默", text: "夜里我什么也没说。沉默也是一种回答。" },
        next: "d4_touch"
      }
    }
  },

  /* ============ v0.7.0 触觉关怀 ============ */
  d4_touch: {
    day: 4, time: "evening", bg: "home_room", char: "shiyu", speaker: "林诗雨",
    text: "——门被轻轻推开。林诗雨站在门口，扬了扬手里的查寝登记表：「班长特权，顺便收作业。」她抱着稿纸，「我听见你屋里有动静……我可以进来吗？」她看上去眼睛红红的。",
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
  letter_2_after: { day: 4, time: "evening", bg: "home_room", speaker: "沈屿", text: "信封好，放在窗台。窗外起了风。我坐到窗前——心有点乱。先静一静再睡。", next: "d4_night_family" },

  /* ============ v2.8.1 沈屿家庭线铺垫（为后日谈的「第一道缝」蓄势） ============ */
  d4_night_family: {
    day: 4, time: "evening", bg: "home_room", speaker: "沈屿",
    text: "睡前，我点开和父母的对话框。上一次说话是住校第一晚，之后它就安静到了现在。我打了一段话——想说这里的樱花开了，想说食堂的糖醋排骨不如家里做的好吃，想说其实我有一点想家——写到一半，又全部删掉。",
    loopText: ["睡前，我点开和父母的对话框。上一次说话是住校第一晚，之后它就安静到了现在。我打了一段话——想说这里的樱花开了，想说食堂的糖醋排骨不如家里做的好吃，想说其实我有一点想家——写到一半，又全部删掉。",
"睡前，对话框又亮了。上一轮我把那些话删得干干净净；这一轮，我写到「想家」两个字时停了一下——原来这两个字每写一次，都比上一次轻一点，也真一点。",
"睡前，我几乎是下意识点开了对话框。那些删过的话像旧识一样回来。这一轮我明白：删掉不是忘记，是还没准备好让它们被听见。"],
    next: "d4_night_family_2"
  },
  d4_night_family_2: {
    day: 4, time: "evening", bg: "home_room", speaker: "沈屿",
    text: "最后输入框里只剩下三个字：「都挺好」。我盯着它看了很久，没有按发送。有些话要等到更会说话的时候——也可能，要等一个他们真正需要听见的时候。",
    loopText: ["最后输入框里只剩下三个字：「都挺好」。我盯着它看了很久，没有按发送。有些话要等到更会说话的时候——也可能，要等一个他们真正需要听见的时候。",
"输入框里又只剩下「都挺好」。上一轮我没按发送；这一轮我多看了那三个字一眼——它们不是谎话，是还没长熟的真心。",
"「都挺好」——我甚至能背出自己打这三个字时的犹豫。这一轮我终于懂了：留着不发的，不是话，是一个还没敢回家的我。"],
    next: "d4_breath",
    memory: { id: "沈屿·未寄的话", title: "未寄的话", text: "有一句「都挺好」，你写好了，却留在了输入框里。" }
  },

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
    text: "回到房间。窗台上有一张空白的纸——给未来的自己写一句话吧。明早醒来，它会在起雾的窗边等你。",
    next: "d4_lightdraw",
    timecapsule: {
      prompt: "给明天的自己写一句话——",
      placeholder: "（最多 60 字）",
      maxLength: 60,
      deliverAt: "d5_foggy",
      onSubmit: { tag: "written",
        label: "——封存",
        text: "你把纸折好，塞进信封。明早醒来，它会在窗边等你——这是你给未来自己的一份承诺。",
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
    next: "d5_perfume",
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
          next: "d5_perfume" },
        { min: 0.4, tag: "ok",
          label: "——半对上",
          text: "你的心跳只对上了几拍。她笑了一下：「……没关系。听不见也是真的——你不必每次都跟得上。」",
          add: { affection: { shiyu: 1 } },
          personality: { honest: 1 },
          next: "d5_perfume" }
      ],
      fallback: { tag: "miss",
        label: "——没对上",
        text: "你的心跳完全跟不上。她抽回手，没生气：「你的心跳是你的。别为了跟谁，把它丢掉。」",
        next: "d5_perfume" }
    }
  },

  /* ============ v1.2.0 新玩法触发节点 ============ */
  // 茶席品茗
  d4_tea: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
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
    next: "d5_rewind",
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
          next: "d5_rewind" },
        { min: 0.55, tag: "ok",
          label: "——弹得还行",
          text: "你弹得磕磕绊绊，但旋律出来了。她说过：错音也是旋律的一部分。你想她是对的。",
          add: { affection: { shiyu: 1 } },
          personality: { honest: 1 },
          next: "d5_rewind" }
      ],
      fallback: { tag: "miss",
        label: "——弹错了",
        text: "你完全弹错了。旋律碎了。但没关系——有些歌，本来就不是弹给人听的。",
        next: "d5_rewind" }
    }
  },

  // 明确标记长玩法链的时间回溯，避免玩家把日期倒退误读成剧情断链。
  d5_rewind: {
    bg: "home_room", char: null, speaker: "",
    text: "琴声落下，匿名信的纸页忽然自己翻动。日期从「第 5 日」退回「第 4 日」——这不是忘记，而是信在把我送回还没走完的那段路。",
    loopText: ["琴声落下，匿名信的纸页忽然自己翻动。日期从「第 5 日」退回「第 4 日」——这不是忘记，而是信在把我送回还没走完的那段路。", "琴声落下，匿名信的纸页忽然自己翻动。日期又从「第 5 日」退了回去——这一次我没有慌。回去不是惩罚，是把漏掉的答案补上。"],
    timeLoop: true,
    next: "d4_dice"
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
          text: "茶渍半散半聚。「一半也是答案——剩下的一半，留给明天。」你想她说的是对的。",
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
        // 与 30 度光源下木块的实际投影轮廓一致，目标可通过拖动达到。
        { x: 0.624, y: 0.503 },
        { x: 0.664, y: 0.503 },
        { x: 0.751, y: 0.638 },
        { x: 0.751, y: 0.668 },
        { x: 0.711, y: 0.638 },
        { x: 0.624, y: 0.563 }
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
          text: "影子偏了一点。「偏一点也是对——世界上没有完全重合的两件事。」你想她说的是对的。",
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
        text: "火灭了。「灭了也没关系——黑暗里说的话，比光里更真。」你坐在黑里，听她说完。",
        next: "d4_dial" }
    }
  },

  // 电话拨号
  d4_dial: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
    text: "床头有一台旧电话。她只说了一句——拨一个号码，是 7 位数——然后不管我再问，她都只把那串数字重复一遍。你试着拨出去。",
    next: "d4_voice_note",
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
          next: "d4_voice_note" },
        { min: 0.5, tag: "ok",
          label: "——拨了一半",
          text: "拨号声断断续续，对面没接。你想：号码记不全也是好的——有些事，记一半就够。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d4_voice_note" }
      ],
      fallback: { tag: "miss",
        label: "——拨错了",
        text: "拨号声嘟嘟响，没有人接。她说：拨错的号码，也是号码——它属于某个你不知道的人。你挂了电话。",
        next: "d4_voice_note" }
    }
  },

  // 雨后留言
  d4_voice_note: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
    text: "电话那头的嘟声消失后，录音键还亮着。你忽然想把没说出口的话留在这里，至少让它有地方可回去。",
    next: "d4_voice_choice"
  },
  d4_voice_choice: {
    day: 4, time: "night", bg: "home_room", char: null, speaker: "",
    choice: {
      prompt: "这段话留给谁？",
      options: [
        { text: "留给明天的自己", next: "d4_voice_self" },
        { text: "留给电话那头的人", next: "d4_voice_them" },
        { text: "不录了，写在纸上", next: "d4_voice_paper" }
      ]
    }
  },
  d4_voice_self: {
    day: 4, time: "night", bg: "home_room", speaker: "沈屿",
    text: "「明天也要回来。」你按下停止。录音里只有自己的声音，却没有刚才那么空。",
    next: "d4_voice_end",
    memory: { id: "留言·明天", title: "留给明天的声音", text: "你给明天的自己留了一句：明天也要回来。" }
  },
  d4_voice_them: {
    day: 4, time: "night", bg: "home_room", speaker: "沈屿",
    text: "「如果你还记得这串号码，就知道我没有真的走远。」你没有说名字，怕名字一出口，故事就只能有一个答案。",
    next: "d4_voice_end",
    memory: { id: "留言·号码", title: "没有说出的名字", text: "你把一句话留给电话那头的人，却没有说出名字。" }
  },
  d4_voice_paper: {
    day: 4, time: "night", bg: "home_room", speaker: "沈屿",
    text: "你关掉录音，改在纸上写下一句：「今晚先到这里。」纸比录音安静，安静到你终于听见自己的呼吸。",
    next: "d4_voice_end",
    memory: { id: "留言·纸面", title: "纸上的停顿", text: "你没有录音，而是在纸上写下：今晚先到这里。" }
  },
  d4_voice_end: {
    day: 4, time: "night", bg: "home_room", speaker: "",
    text: "你把手机扣在桌上。窗外的雨已经停了，明早还会有新的声音。",
    next: "d5_foggy"
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
        text: "雾没散开，星也没成。「没画出来也是真的——证明有些事，手指记不住。」你想她说的是对的。",
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
          text: "钟摆偏了一点。你敲下去，钟响了，但音不稳。「偏一点也是音——只是没那么准。」你想她说的是对的。",
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
    day: 5, time: "afternoon", bg: "home_room", char: "senior", speaker: "学姐",
    text: "学姐把一只沙漏放到桌上，指着它比划：在 5 秒的时候翻一次，让沙在 5 秒后落完。交代完人就走了。你拿着沙漏，第一次确定长玩法里那个反复出现的「她」就是她。",
    next: "d6_chapter_open",
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
          next: "d6_chapter_open" },
        { max: 1000, tag: "ok",
          label: "——差一点",
          text: "你差了一点。沙没在 5 秒落完。「差一点也是好的——证明你想过它。」你想她说的是对的。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d6_chapter_open" }
      ],
      fallback: { tag: "miss",
        label: "——没卡上",
        text: "你完全没卡上。沙落完了，没翻转。她说：没卡上也是真的——有些事错过了，就是错过了。你看着空了的沙漏。",
        next: "d6_chapter_open" }
    }
  },

  /* ============ v2.8.2 长链分章呼吸点与学姐中段线索 ============ */
  // 第一章「旧物」开场（第 6 日）
  d6_chapter_open: {
    day: 6, time: "morning", bg: "hallway", speaker: "沈屿",
    text: "第 6 日。学姐说，接下来这些天，她想带我做一些「她当年没做完的事」。我不知道那是什么。只知道从今天起，日子像在整理一间旧屋子——一件一件，把蒙尘的东西拿起来，擦干净，再放回去。",
    loopText: ["第 6 日。学姐说，接下来这些天，她想带我做一些「她当年没做完的事」。我不知道那是什么。只知道从今天起，日子像在整理一间旧屋子——一件一件，把蒙尘的东西拿起来，擦干净，再放回去。",
"第 6 日。学姐又提起那些「她当年没做完的事」。上一轮我只觉得她在追忆；这一轮我听出了别的东西——她不是在整理旧屋子，是在找一把能打开某扇门的钥匙。",
"她说要带我做完那些事时，声音比记忆里更轻。我忽然懂了：她不是在教我怎么整理旧物，是在把她的遗憾，一件件交到我手里。"],
    next: "d6_kite"
  },
  // 第二章「节奏」开场（第 9 日）
  d9_chapter_open: {
    day: 9, time: "morning", bg: "hallway", speaker: "沈屿",
    text: "第 9 日。旧物整理到了一半。我发现她挑的东西都有节奏——风铃、瓶中信、回声、罗盘，一样比一样安静。像是在教我：听见世界的方式，不止「看见」一种。",
    loopText: ["第 9 日。旧物整理到了一半。我发现她挑的东西都有节奏——风铃、瓶中信、回声、罗盘，一样比一样安静。像是在教我：听见世界的方式，不止「看见」一种。",
"第 9 日。她挑的东西还是那些——风铃、瓶中信、回声、罗盘。上一轮我学的是「听见」，这一轮我才发现，她挑每一样东西时，都先自己听过一遍。",
"她递来的每一样旧物，我都认得它们的下一个去处。这一轮我开始留意另一件事：她说『教』这个字的时候，从来不说『教会了我』。"],
    next: "d9_metronome"
  },
  // 学姐中段线索（第 10 日）
  d10_senior_slip: {
    day: 10, time: "morning", bg: "rooftop", char: "senior", speaker: "学姐",
    text: "第 10 日早上，她在天台看云。她说：「这些天带你做的事，三年前我都做过一遍。只是那时候——」她停住了。后半句在风里打了个转，被她自己咽了回去，改口说：「算了。今天的云挺好。」",
    loopText: ["第 10 日早上，她在天台看云。她说：「这些天带你做的事，三年前我都做过一遍。只是那时候——」她停住了。后半句在风里打了个转，被她自己咽了回去，改口说：「算了。今天的云挺好。」",
"第 10 日早上，天台，云。她又说到「三年前我都做过一遍」。上一轮我没听出那半句的重量；这一轮，那个破折号像一扇没推开的门，在风里轻轻晃。",
"同样的天台，同样咽回去的半句。这一轮我留意到另一件事：她说「那时候」三个字时，手一直扶着栏杆——像怕一松手，就掉回三年前。"],
    next: "d10_senior_slip_2"
  },
  d10_senior_slip_2: {
    day: 10, time: "morning", bg: "rooftop", speaker: "沈屿",
    text: "我没有追问。她说的「那时候」，大概就是三条路只走到一半的时候。风把云推得很快，像有什么事正在赶时间。",
    loopText: ["我没有追问。她说的「那时候」，大概就是三条路只走到一半的时候。风把云推得很快，像有什么事正在赶时间。",
"我依然没有追问。上一轮我以为「那时候」是遗憾；这一轮我读出另一层——她不是走不完，是舍不得走完。风还在推云。",
"云被推得很快。这一轮，那半句的轮廓在我心里比记忆里更清楚：她说「三条路只走到一半」时，用的是「我」，不是「我们」。"],
    next: "d10_eclipse",
    memory: { id: "学姐·咽回去的半句", title: "咽回去的半句", text: "她说「三年前我都做过一遍，只是那时候——」，然后改口去说云。" }
  },
  // 第三章「归位」开场（第 12 日）
  d12_chapter_open: {
    day: 12, time: "morning", bg: "hallway", speaker: "沈屿",
    text: "第 12 日。「最后一段路叫『归位』——把借来的东西还给原处，把散开的自己收回来。」走廊尽头的公告栏贴着学园祭的回顾海报：诗雨的本子、夏织的展、苏念的画——我们约好的那个节目，她们三个人一起完成了，署名里没有我。她说这话时在走神。我知道她在想什么：等这一切结束，她就要离开了。",
    loopText: ["第 12 日。她说最后一段路叫「归位」——把借来的东西还给原处，把散开的自己收回来。走廊尽头的公告栏贴着学园祭的回顾海报：诗雨的本子、夏织的展、苏念的画——我们约好的那个节目，她们三个人一起完成了，署名里没有我。她说这话时在走神。我知道她在想什么：等这一切结束，她就要离开了。",
"第 12 日。「归位」。海报上还是那三张作品，署名里没有我——上一轮我心口发酸，这一轮我读懂了：她们不是把我忘了，是把我写进了没有署名的部分里。而学姐，她又在想离开了。",
"『归位』——把借来的东西还给原处。我盯着海报看了很久，忽然明白学姐为什么总在走神：她把自己也借出去了，还没想好要怎么还。这一轮，我打算替她记住这一点。"],
    next: "d12_sundial"
  },

  /* ============ v1.7.0 新玩法触发节点 ============ */
  // 风筝引线
  d6_kite: {
    day: 6, time: "afternoon", bg: "field", char: null, speaker: "",
    text: "她带来一只风筝，把线塞进你手里：牵引它穿过云阵，到 80% 的高度——交代完就跑到远处去看。风起来了。",
    loopText: ["她带来一只风筝，把线塞进你手里：牵引它穿过云阵，到 80% 的高度——交代完就跑到远处去看。风起来了。", "她带来一只风筝，把线塞进你手里。风起来了——线上的拉力我记得，像一只手在轻轻拽。"],
    next: "d6_lock",
    kite: {
      prompt: "按住风筝拖动——穿过云阵到达目标高度",
      target: 80,
      duration: 12000,
      obstacles: 6,
      thresholds: [
        { max: 2, tag: "perfect",
          label: "——飞得很稳",
          text: "风筝穿过云阵，停在 80% 的高度。她说：你手很稳——稳的人，才能把线交出去又收回来。她想说的不是风筝。",
          add: { affection: { shiyu: 2, xiazhi: 1 } },
          personality: { brave: 2, active: 1 },
          memory: { id: "风筝·80%", title: "操场上的风筝", text: "你牵引风筝穿过云阵，停在 80% 的高度。" },
          next: "d6_lock" },
        { max: 6, tag: "ok",
          label: "——飞起来了",
          text: "风筝磕磕碰碰地到了目标高度。「磕碰也是飞——飞过的事，都算数。」你把线还给她。她接线时补了一句：下次再放。",
          add: { affection: { shen: 1 } },
          personality: { active: 1 },
          next: "d6_lock" }
      ],
      fallback: { tag: "miss",
        label: "——线断了",
        text: "风筝磕到了太多次云——线断了。她跑过来捡风筝，说：断了也没关系——至少你知道了风往哪边吹。",
        next: "d6_lock" }
    }
  },

  // 密码锁
  d6_lock: {
    day: 6, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "她递来一只旧木盒，上面挂着四位密码锁。「密码藏在我们说过的话里。三月、七月、二日、九时。」丢下这串提示，她就真的一个字也不肯再说了。",
    loopText: ["她递来一只旧木盒，上面挂着四位密码锁。「密码藏在我们说过的话里。三月、七月、二日、九时。」丢下这串提示，她就真的一个字也不肯再说了。", "旧木盒上的四位密码锁。「三月、七月、二日、九时。」——这串数字我背下来了，这一次没有等她重复第二遍。"],
    next: "d6_origami",
    lock: {
      prompt: "根据线索拨出四位密码",
      target: "3729",
      preview: 4000,
      hints: ["三月", "七月", "二日", "九时"],
      thresholds: [
        { min: 4, tag: "perfect",
          label: "——锁开了",
          text: "锁咔哒一声开了。盒子里是她留的一张纸条——「你记住了。记住的人，才能再来。」你想：原来密码不是防人的，是等人的。",
          add: { affection: { shiyu: 2, sunian: 1, shen: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "密码·3729", title: "木盒里的纸条", text: "你拨出 3-7-2-9，打开了她的木盒。" },
          next: "d6_origami" },
        { min: 2, tag: "ok",
          label: "——开了两三个",
          text: "你拨对了两位。她说：差两位——但你已经在想我了。这就够了。她把锁重新锁上。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d6_origami" }
      ],
      fallback: { tag: "miss",
        label: "——锁没开",
        text: "你完全拨错了。她说：没关系——下次再说。她把木盒收回去，没有给你看里面的东西。",
        next: "d6_origami" }
    }
  },

  // 折纸造型
  d6_origami: {
    day: 6, time: "night", bg: "home_room", char: null, speaker: "",
    text: "她递来一张方纸，比了个「折」的手势：按顺序折四步，会折出一样东西。是什么，她不肯讲——「你折出来，再解读它。」",
    loopText: ["她递来一张方纸，比了个「折」的手势：按顺序折四步，会折出一样东西。是什么，她不肯讲——「你折出来，再解读它。」", "她递来一张方纸，比了个「折」的手势。折到第三步我就知道会折出什么——但我假装不知道，看她会不会这次多说一句。"],
    next: "d6_orbit",
    origami: {
      prompt: "按顺序点击折叠步骤——折出造型",
      min: 3,
      steps: [
        { id: "a", label: "对折", desc: "上下对折" },
        { id: "b", label: "三角", desc: "对角折一次" },
        { id: "c", label: "翻面", desc: "翻到背面" },
        { id: "d", label: "内压", desc: "把两侧往内压" }
      ],
      targets: [
        { steps: ["a", "b", "c", "d"], tag: "crane",
          label: "——折出了鹤",
          text: "你折出了一只纸鹤。她说：鹤是会飞的——会飞的东西，都先被人折过。她把鹤接过去，放在窗台上。",
          add: { affection: { shiyu: 2, xiazhi: 1 } },
          personality: { kind: 2, active: 1 },
          memory: { id: "折纸·鹤", title: "窗台上的纸鹤", text: "你按 a-b-c-d 顺序折出了一只纸鹤。" },
          next: "d6_orbit" },
        { steps: ["a", "c", "b", "d"], tag: "boat",
          label: "——折出了船",
          text: "你折出了一只小船。她说：船是会漂的——漂的东西，都不肯沉。她把船放在桌上。",
          add: { affection: { shen: 1, sunian: 1 } },
          personality: { honest: 1 },
          next: "d6_orbit" }
      ],
      fallback: { tag: "default",
        label: "——一张纸",
        text: "你折了几下，没折出什么。她说：不是每一次折叠都能折成东西——有时候只是把纸弄皱了。她把纸展开，抚平。",
        next: "d6_orbit" }
    }
  },

  // 星轨追踪
  d6_orbit: {
    day: 6, time: "night", bg: "rooftop", char: null, speaker: "",
    text: "她拉你到天台，指着那颗正在移动的星：跟着它的轨迹点过去。点得准的人，能记住它走过的路——这句话她说得很慢，像在替星星稳住节奏。",
    next: "d7_firefly",
    orbit: {
      prompt: "按住光标跟随星点轨迹——依次点亮采样点",
      duration: 10000,
      tolerance: 30,
      samples: 6,
      thresholds: [
        { max: 20, tag: "perfect",
          label: "——跟得很准",
          text: "你一个不漏地点亮了六个采样点。她说：你眼睛很准——准的人，能记住回家的路。她想说的是另一件事。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "星轨·六点", title: "天台上的星轨", text: "你跟着那颗星，点亮了六个采样点。" },
          next: "d7_firefly" },
        { max: 60, tag: "ok",
          label: "——跟了大半",
          text: "你点亮了大部分采样点。她说：跟丢了也是真的——星走得快，眼睛跟不上。你已经尽力了。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d7_firefly" }
      ],
      fallback: { tag: "miss",
        label: "——星辰失散",
        text: "你跟丢了大多数采样点。她说：没关系——星轨还在那里，只是你没看见。看不见的东西，也在走。",
        next: "d7_firefly" }
    }
  },

  /* ============ v1.8.0 新玩法触发节点 ============ */
  // 萤火引路
  d7_firefly: {
    day: 7, time: "night", bg: "forest", char: null, speaker: "",
    text: "树林里，萤火虫散了。她把一盏小灯放进你手里，只说：把它们引回来。回到哪里，她不说——但你看向她指的方向。",
    loopText: ["树林里，萤火虫散了。她把一盏小灯放进你手里，只说：把它们引回来。回到哪里，她不说——但你看向她指的方向。", "树林里，萤火虫散了。她把小灯放进你手里。灯的重量我也记得——轻得像一句没说完的话。"],
    next: "d7_windchime",
    firefly: {
      prompt: "按住光点拖动——引导萤火虫归队",
      total: 8,
      duration: 15000,
      tolerance: 40,
      thresholds: [
        { max: 30, tag: "perfect",
          label: "——都回来了",
          text: "八只萤火虫都回到了你画的光圈里。她说：你引得动它们——你引得动的，都不肯走远。她想说的不是萤火虫。",
          add: { affection: { shiyu: 2, sunian: 1 } },
          personality: { kind: 2, honest: 1 },
          memory: { id: "萤火·八只", title: "树林里的萤火", text: "你用一盏小灯引回了八只萤火虫。" },
          next: "d7_windchime" },
        { max: 90, tag: "ok",
          label: "——回来大半",
          text: "大部分萤火虫回到了光圈里。「散了几只也没关系——散了的，也算见过光。」你想她说的是对的。",
          add: { affection: { shen: 1 } },
          personality: { kind: 1 },
          next: "d7_windchime" }
      ],
      fallback: { tag: "miss",
        label: "——萤火散了",
        text: "萤火虫都散了，没几只回来。她说：散了就散了——光引不动的时候，硬引也没用。她把灯收起来。",
        next: "d7_windchime" }
    }
  },

  // 风铃调音
  d7_windchime: {
    day: 7, time: "night", bg: "home_room", char: null, speaker: "",
    text: "窗台的旧风铃，四个铃片错位了。她让你把它们拖回各自的高度，敲出来才合拍——哪个是哪个，她不说。",
    next: "d7_bottle",
    windchime: {
      prompt: "拖动四个铃片——对齐虚线目标高度",
      target: [0.2, 0.4, 0.55, 0.7],
      tolerance: 0.05,
      thresholds: [
        { max: 0.1, tag: "perfect",
          label: "——音对了",
          text: "四个铃片都回到了自己的位置。她敲了一下——风铃响了，音是对的。她说：你听出来了——听得出的人，才肯把铃给你。",
          add: { affection: { shiyu: 2, xiazhi: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "风铃·四音", title: "窗台上的风铃", text: "你把四个铃片拖回原位，风铃重新响了。" },
          next: "d7_bottle" },
        { max: 0.3, tag: "ok",
          label: "——音差不多",
          text: "铃片大致对齐了。她敲了一下——音差不多，但偏一点。她说：偏一点也是音——只是没那么准。你已经尽力了。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d7_bottle" }
      ],
      fallback: { tag: "miss",
        label: "——音散了",
        text: "铃片完全没对上。她敲了一下——音散了。她说：散了也是真的——有些音，对不上就是对不上。她把风铃挂回去。",
        next: "d7_bottle" }
    }
  },

  // 瓶中信
  d7_bottle: {
    day: 7, time: "night", bg: "river", char: null, speaker: "",
    text: "河边。她从口袋里摸出一只瓶子，里面卷着一张纸条——投到对岸去。该用多大力气，她让你自己掂量。",
    loopText: ["河边。她从口袋里摸出一只瓶子，里面卷着一张纸条——投到对岸去。该用多大力气，她让你自己掂量。", "河边。瓶子里卷着纸条。上一次它落在了对岸的石头缝里——这一次我瞄高了一点。"],
    next: "d7_echoloc",
    bottle: {
      prompt: "拖动滑块调整力度——把瓶子投到对岸目标线",
      target: 0.7,
      tolerance: 0.08,
      thresholds: [
        { max: 0.08, tag: "perfect",
          label: "——投到了",
          text: "瓶子落在了目标线上。她说：你力气用得正好——刚好到对岸的力气，是最难的那种。你想：原来她让你练的是这个。",
          add: { affection: { shiyu: 2, shen: 1, xiazhi: 1 } },
          personality: { brave: 2, active: 1 },
          memory: { id: "瓶中信·对岸", title: "河边的瓶子", text: "你把瓶子投到了对岸的目标线。" },
          next: "d7_echoloc" },
        { max: 0.2, tag: "ok",
          label: "——差一点",
          text: "瓶子差一点到目标线。她说：差一点也是好的——你想过头了，但你想过。她把瓶子捡回来，递给你。",
          add: { affection: { shen: 1 } },
          personality: { active: 1 },
          next: "d7_echoloc" }
      ],
      fallback: { tag: "miss",
        label: "——瓶沉了",
        text: "瓶子没到对岸，沉了下去。她说：沉了就沉了——沉下去的东西，也会被冲到别处。她没让你再投一次。",
        next: "d7_echoloc" }
    }
  },

  // 回声定位
  d7_echoloc: {
    day: 7, time: "night", bg: "tunnel", char: null, speaker: "",
    text: "她带你去一条隧道。前面有东西，但你看不见——她让你发出声音，听回声，再点出估算的位置。「听得出的人，能看不见也能知道。」这句她说了两遍，第二遍轻得像给隧道听的。",
    next: "d8_compass",
    echoloc: {
      prompt: "点「发出」听回声——再点画面估算障碍位置",
      actual: 0.6,
      tolerance: 0.08,
      duration: 8000,
      thresholds: [
        { max: 0.08, tag: "perfect",
          label: "——听准了",
          text: "你估算的位置就是它的位置。她说：你听得很准——听得准的人，闭着眼也能找到路。她想说的是另一件事。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "回声·60%", title: "隧道里的回声", text: "你在隧道里靠回声估算出了障碍的位置。" },
          next: "d8_old_photo" },
        { max: 0.2, tag: "ok",
          label: "——差一点",
          text: "你估算的位置差了一点。她说：差一点也行——你听出了大概。大概也是真的。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d8_old_photo" }
      ],
      fallback: { tag: "miss",
        label: "——听偏了",
        text: "你估算的位置完全偏了。她说：听偏了也没关系——回声有时候会骗人。她不让你再试一次。",
        next: "d8_old_photo" }
    }
  },

  /* ============ v2.8.1 三人旧交回忆（回收 d2_noon_9 / d3_sunian_5 伏笔） ============ */
  d8_old_photo: {
    day: 8, time: "morning", bg: "classroom", speaker: "沈屿",
    text: "上午课间，我在活动室整理旧物箱，翻到一张去年的照片：夏织在跑道上摔倒，看台边站着两个人——林诗雨手里攥着冰袋，苏念抱着画本。两个人都没有上前。",
    loopText: ["上午课间，我在活动室整理旧物箱，翻到一张去年的照片：夏织在跑道上摔倒，看台边站着两个人——林诗雨手里攥着冰袋，苏念抱着画本。两个人都没有上前。",
"上午课间，那张照片还是躺在旧物箱里。上一轮我看见的是『两个人都没有上前』；这一轮我看见了更多——冰袋和画本，是早就准备好的。她们不是没上前，是还没学会怎么上前。",
"照片翻过来，背面有一行小字，上一轮我漏掉了：「明年，要有人先跑过去。」字迹是三个人的。这一轮，我把它放回了原处——等她们自己记得。"],
    next: "d8_old_photo_2"
  },
  d8_old_photo_2: {
    day: 8, time: "morning", bg: "classroom", char: "shiyu", speaker: "林诗雨",
    text: "「那天我们第一次说话。」她把照片翻过来，「她说『她摔了』，我说『我带了冰袋』。然后我们就那么站着，谁都没敢走进去。」",
    next: "d8_old_photo_3"
  },
  d8_old_photo_3: {
    day: 8, time: "morning", bg: "classroom", char: "sunian", speaker: "苏念",
    text: "「那天我本来在画她起跑。」苏念说，「画到一半她摔了，我就把本子合上了。后来补过一次——补的不是摔倒，是她爬起来的样子。那张画，我一直没给人看过。」",
    next: "d8_compass",
    memory: { id: "三人·一张旧照片", title: "一张旧照片", text: "去年运动会她们都在场：谁都没上前，但谁都没有走远。" }
  },

  /* ============ v1.9.0 新玩法触发节点 ============ */
  // 罗盘导航
  d8_compass: {
    day: 8, time: "afternoon", bg: "sea", char: null, speaker: "",
    text: "她带你到海边。她说——风从那个方向来。她递给你一只旧罗盘：把它对准风的方向。她不告诉你风从哪个方向来。",
    loopText: ["她带你到海边。她说——风从那个方向来。她递给你一只旧罗盘：把它对准风的方向。她不告诉你风从哪个方向来。", "海边的旧罗盘。风从哪边来，我比她先转过去了指针。"],
    next: "d8_telegraph",
    compass: {
      prompt: "拖动罗盘外圈——让指针对准风来的方向",
      target: 135,             // 东南
      tolerance: 10,
      thresholds: [
        { max: 10, tag: "perfect",
          label: "——对了",
          text: "指针稳稳停在风的方向上。「你对得很准——风往哪里来，你就往哪里去。」你想：她说的不是罗盘。",
          add: { affection: { shiyu: 2, shen: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "罗盘·东南", title: "海边的罗盘", text: "你把罗盘指针对准了风来的方向。" },
          next: "d8_telegraph" },
        { max: 30, tag: "ok",
          label: "——差一点",
          text: "指针差了一点。她说：差不多——风是会变的，你跟着它走，跟着跟着就对了。她接过罗盘。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d8_telegraph" }
      ],
      fallback: { tag: "miss",
        label: "——方向偏了",
        text: "指针完全偏了。她说：方向感不好的不只是你——但有些路，得靠别的去找。她把罗盘收回口袋。",
        next: "d8_telegraph" }
    }
  },

  // 密码电报
  d8_telegraph: {
    day: 8, time: "afternoon", bg: "attic", char: null, speaker: "",
    text: "她带你去阁楼。一只旧电报机摆在桌上。她说——它收了一段电报，你听完——告诉我它说的是什么。她不告诉你答案。",
    next: "d8_balance",
    telegraph: {
      prompt: "点「播放」听电报节奏——选出对应字母",
      code: "HI",
      options: ["HI", "OK", "NO", "GO"],
      thresholds: [
        { max: 0, tag: "perfect",
          label: "——译对了",
          text: "你选了 HI。她说：你听得懂——听得懂的人，能收到别人收不到的话。她像是在说自己。",
          add: { affection: { shiyu: 2, xiazhi: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "电报·HI", title: "阁楼上的电报", text: "你在电报节奏里译出了 HI 两个字。" },
          next: "d8_balance" }
      ],
      fallback: { tag: "miss",
        label: "——译错了",
        text: "你选错了。她说：听不懂也没关系——有些话，本来就不是给所有人听的。她把电报机关掉。",
        next: "d8_balance" }
    }
  },

  // 天平称重
  d8_balance: {
    day: 8, time: "afternoon", bg: "home_room", char: null, speaker: "",
    text: "窗台上有只小天平，五块东西重量都不一样。她朝它们抬了抬下巴：放到两端，让天平平。——平衡是最难的，这句是她转身前补的。",
    next: "d8_pendulum",
    balance: {
      prompt: "点物品，再点左/右盘放入——让天平平衡",
      items: [3, 5, 7, 2, 4],
      tolerance: 0.5,
      thresholds: [
        { max: 0.5, tag: "perfect",
          label: "——平衡了",
          text: "天平平了。她说：你找到了——把不一样的东西放到一样重。她想说的是另一件事，但你没问。",
          add: { affection: { shiyu: 2, shen: 1, xiazhi: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "天平·五块", title: "窗台上的天平", text: "你把五块不同重量的物品放到天平两端，让它平衡。" },
          next: "d8_pendulum" },
        { max: 2, tag: "ok",
          label: "——差不多",
          text: "天平差一点。她说：差一点也算平——世上没有真的平，只有差不多。她把一块换了个位置。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d8_pendulum" }
      ],
      fallback: { tag: "miss",
        label: "——没平衡",
        text: "天平完全没平。她说：平衡不是谁都找得到的——你急了，急的时候最容易偏。她把天平收起来。",
        next: "d8_pendulum" }
    }
  },

  // 钟摆节奏
  d8_pendulum: {
    day: 8, time: "night", bg: "clock_room", char: null, speaker: "",
    text: "她带你去钟楼。一只老钟摆在摆动。「它在找一个位置。」她的意思是：在它到那个位置的时候点「停」。时机不对，就什么都不是。",
    next: "d9_chapter_open",
    pendulum: {
      prompt: "钟摆摆到目标位置时——点「停」",
      target: 0.85,
      tolerance: 0.06,
      duration: 12000,
      thresholds: [
        { max: 0.06, tag: "perfect",
          label: "——停对了",
          text: "钟摆稳稳停在了目标位置。她说：你的时机很准——准的人，知道什么时候该停。她想说的是另一件事。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { honest: 2, brave: 1 },
          memory: { id: "钟摆·85%", title: "钟楼里的钟摆", text: "你在钟摆到目标位置时点停，时机很准。" },
          next: "d9_chapter_open" },
        { max: 0.15, tag: "ok",
          label: "——差一点",
          text: "钟摆差一点。她说：差一点也是停——只是没那么对。她不让你再试一次。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d9_chapter_open" }
      ],
      fallback: { tag: "miss",
        label: "——停早了",
        text: "钟摆完全没停对位置。她说：时机不对——不对就是不对。她把钟摆按住，让它停下。",
        next: "d9_chapter_open" }
    }
  },

  /* ============ v2.0.0 新玩法触发节点 ============ */
  // 节拍器同步
  d9_metronome: {
    day: 9, time: "morning", bg: "music_room", char: null, speaker: "",
    text: "她带你去音乐教室。一台老节拍器在桌上——它会响十二下，你跟着响声点「同步」。人跟不跟得上节奏，听一耳朵就明白，她说这话时根本没看你，听的是节拍器。",
    loopText: ["她带你去音乐教室。一台老节拍器在桌上——它会响十二下，你跟着响声点「同步」。人跟不跟得上节奏，听一耳朵就明白，她说这话时根本没看你，听的是节拍器。", "音乐教室的老节拍器。它响十二下——第十二下的间隙我掐得准了，手指比脑子先动。"],
    next: "d9_starchart",
    metronome: {
      prompt: "跟着节拍器响声点「同步」——共 12 拍",
      bpm: 80,
      total: 12,
      tolerance: 0.12,
      thresholds: [
        { min: 0.85, tag: "perfect",
          label: "——节奏稳",
          text: "你几乎每一拍都踩在节拍器响的那一瞬。她说：你的节奏稳——稳的人，能等，也能抓住。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { active: 2, honest: 1 },
          memory: { id: "节拍·同步", title: "音乐教室的节拍器", text: "你跟着节拍器同步了十二拍，节奏稳。" },
          next: "d9_starchart" },
        { min: 0.6, tag: "ok",
          label: "——还跟得上",
          text: "你跟得上，但不算稳。她说：人不必每一拍都准——但你这种节奏，能走，跑不行。",
          add: { affection: { shen: 1 } },
          personality: { active: 1 },
          next: "d9_starchart" }
      ],
      fallback: { tag: "miss",
        label: "——节奏乱了",
        text: "你完全跟不上。她说：节奏乱了——乱也没关系，但你不是会等节拍的人。她把节拍器关掉。",
        next: "d9_starchart" }
    }
  },

  // 星图连线
  d9_starchart: {
    day: 9, time: "night", bg: "rooftop", char: null, speaker: "",
    text: "她拉你去天台看星星，递来一颗一颗的指令：按亮度，从最亮到最暗，把这五颗连起来。星图不是随便画的——顺序错了，整个星座就不再是星座。",
    next: "d9_lens",
    starchart: {
      prompt: "按亮度从亮到暗连接五颗星",
      stars: [
        { id: "s1", x: 0.20, y: 0.30, brightness: 0.95, label: "α" },
        { id: "s2", x: 0.45, y: 0.20, brightness: 0.70, label: "β" },
        { id: "s3", x: 0.65, y: 0.50, brightness: 0.50, label: "γ" },
        { id: "s4", x: 0.80, y: 0.30, brightness: 0.30, label: "δ" },
        { id: "s5", x: 0.55, y: 0.75, brightness: 0.15, label: "ε" }
      ],
      expectedOrder: ["s1", "s2", "s3", "s4", "s5"],
      tolerance: 1,
      thresholds: [
        { max: 0, tag: "perfect",
          label: "——星图画对了",
          text: "你按亮度从亮到暗，一笔连完。她说：你看，星图就得这样画——先最亮的，再最暗的。她也想说的是另一件事。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { honest: 2, kind: 1 },
          memory: { id: "星图·亮度序", title: "天台上的星图", text: "你按亮度顺序连出五颗星，画出了她想要的星图。" },
          next: "d9_lens" },
        { max: 2, tag: "ok",
          label: "——画得差不多",
          text: "你把一组星的先后连反了。她说：顺序一变，整个星座就不一样——但你说它是什么，它就是什么。她笑了一下。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d9_lens" }
      ],
      fallback: { tag: "miss",
        label: "——画错了星图",
        text: "你画的星图她没认出来。她说：这不对——但没关系，你画的，也可以是你的星座。她没说更多。",
        next: "d9_lens" }
    }
  },

  // 透镜聚焦
  d9_lens: {
    day: 9, time: "night", bg: "lab", char: null, speaker: "",
    text: "她带你去实验室。一束光，一个透镜，一块屏。把焦距调到光刚好落在屏上那条线——对焦是耐心活，急不得。这句她说完就去摆弄别的器材了，留你和光较劲。",
    next: "d9_tuning",
    lens: {
      prompt: "拖动滑块调节透镜焦距——让焦点对准目标红线",
      target: 0.62,
      tolerance: 0.04,
      thresholds: [
        { max: 0.04, tag: "perfect",
          label: "——对准了",
          text: "光点稳稳落在红线上。她说：你看，光不会自己找路——是你让它过去的。她想说的是另一件事。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { brave: 2, honest: 1 },
          memory: { id: "透镜·62%", title: "实验室的对焦", text: "你把透镜焦距调到 0.62，光点落在红线上。" },
          next: "d9_tuning" },
        { max: 0.10, tag: "ok",
          label: "——差不多",
          text: "光点差一点。她说：差一点也能看见——只是没那么亮。她不再说。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d9_tuning" }
      ],
      fallback: { tag: "miss",
        label: "——没对焦",
        text: "光点散在屏上，没落在线上。她说：没对焦——但你试过了。她把透镜收起来。",
        next: "d9_tuning" }
    }
  },

  // 弦音调音
  d9_tuning: {
    day: 9, time: "night", bg: "music_room", char: null, speaker: "",
    text: "她递给你一把旧琴：三根弦，张力都不对，调到目标张力去。调音是慢活——弦绷太紧会断，太松不响。这句她写在了琴身的灰上。",
    loopText: ["她递给你一把旧琴：三根弦，张力都不对，调到目标张力去。调音是慢活——弦绷太紧会断，太松不响。这句她写在了琴身的灰上。", "旧琴的三根弦。上一轮我把第二根调断过——这一次我先松了半格再拧。"],
    next: "d10_senior_slip",
    tuning: {
      prompt: "依次调三根琴弦——让张力接近目标值",
      strings: [
        { id: "str1", target: 0.35, label: "宫" },
        { id: "str2", target: 0.55, label: "商" },
        { id: "str3", target: 0.78, label: "角" }
      ],
      tolerance: 0.06,
      thresholds: [
        { max: 0.06, tag: "perfect",
          label: "——调准了",
          text: "三根弦都调到了目标张力。她拨了一下，弦响了干净的一声。她说：你听——这才是它该有的声音。她想说的是另一件事。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { kind: 2, honest: 1 },
          memory: { id: "弦音·三弦齐", title: "音乐教室的旧琴", text: "你把三根琴弦调到目标张力，弦音干净。" },
          next: "d10_senior_slip" },
        { max: 0.12, tag: "ok",
          label: "——差不多准",
          text: "弦音差不多准。她说：差不多——也是一种准。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d10_senior_slip" }
      ],
      fallback: { tag: "miss",
        label: "——音不准",
        text: "弦音不准。她说：弦没调好——也没关系，你可以慢慢调。她把琴收回琴盒。",
        next: "d10_senior_slip" }
    }
  },

  /* ============ v2.1.0 新玩法触发节点 ============ */
  // 日蚀对位
  d10_eclipse: {
    day: 10, time: "night", bg: "rooftop", char: null, speaker: "",
    text: "她拉你去天台。一轮月亮，一颗星。把月亮拖到那颗星上，让影子把它遮住——遮住不是消失，遮住是另一种看见。这句话她在黑暗里说，看不清表情。",
    loopText: ["她拉你去天台。一轮月亮，一颗星。把月亮拖到那颗星上，让影子把它遮住——遮住不是消失，遮住是另一种看见。这句话她在黑暗里说，看不清表情。", "月亮和星。「遮住是另一种看见」——这句话我替她先说了。她愣了一下，笑了。"],
    next: "d10_stamp",
    eclipse: {
      prompt: "拖动月亮，让影子遮住目标星",
      target: 0.65,
      tolerance: 0.05,
      thresholds: [
        { max: 0.05, tag: "perfect",
          label: "——遮住了",
          text: "月亮稳稳遮住星。她说：你看——遮住也是一种对齐。她想说的不只是星。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { honest: 2, calm: 1 },
          memory: { id: "日蚀·遮星", title: "天台的月亮", text: "你把月亮拖到星上，让影子遮住光。" },
          next: "d10_stamp" },
        { max: 0.12, tag: "ok",
          label: "——差一点",
          text: "影子差一点。她说：差一点也是遮——只是没那么干净。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d10_stamp" }
      ],
      fallback: { tag: "miss",
        label: "——没遮住",
        text: "影子完全没遮住星。她说：你没遮住——也没关系，星还在。她把月亮推回去。",
        next: "d10_stamp" }
    }
  },

  // 印章对齐
  d10_stamp: {
    day: 10, time: "night", bg: "library", char: null, speaker: "",
    text: "她递给你一枚旧印章：转到正确的角度，盖下去，樱字才会正。盖歪了，字就不再是字——说这句时她已经把印泥按好了。",
    next: "d10_astrolabe",
    stamp: {
      prompt: "旋转印章，让图案对齐目标角度",
      target: 135,
      tolerance: 5,
      thresholds: [
        { max: 5, tag: "perfect",
          label: "——盖正了",
          text: "印章稳稳落在 135°，樱字端端正正。她说：你看——正了，就是正了。她想说的不只是印章。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { honest: 2, careful: 1 },
          memory: { id: "印章·135°", title: "图书馆的旧印章", text: "你把印章转到 135°，樱字盖得端端正正。" },
          next: "d10_astrolabe" },
        { max: 12, tag: "ok",
          label: "——差不多正",
          text: "印章差不多正。她说：差不多——也是一种正。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { honest: 1 },
          next: "d10_astrolabe" }
      ],
      fallback: { tag: "miss",
        label: "——盖歪了",
        text: "印章盖歪了。她说：歪了——歪了也不是错，只是这一次没对上。她把印章收回盒里。",
        next: "d10_astrolabe" }
    }
  },

  // 星盘仪
  d10_astrolabe: {
    day: 10, time: "night", bg: "rooftop", char: null, speaker: "",
    text: "她拿出一台旧星盘。三层环，三层刻度，都要对到目标刻度，星盘才会开口。星盘不会乱指——乱的是拿它的人。这句她指了指你，又指了指自己。",
    next: "d10_sandpaint",
    astrolabe: {
      prompt: "调整三层星盘，对齐目标刻度",
      targets: [45, 120, 210],
      tolerance: 6,
      thresholds: [
        { max: 6, tag: "perfect",
          label: "——三层齐",
          text: "三层环都对上了。她说：你看——三层齐了，星盘才开口。她想说的不只是星盘。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, honest: 1 },
          memory: { id: "星盘·三层齐", title: "天台的星盘仪", text: "你把三层星盘都对到目标刻度，星盘开口了。" },
          next: "d10_sandpaint" },
        { max: 15, tag: "ok",
          label: "——差不多齐",
          text: "三层环差不多齐。她说：差不多——也是一种齐。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d10_sandpaint" }
      ],
      fallback: { tag: "miss",
        label: "——没对齐",
        text: "三层环都没对上。她说：没对齐——也没关系，星盘不会怪你。她把星盘合上。",
        next: "d10_sandpaint" }
    }
  },

  // 沙画凝形
  d10_sandpaint: {
    day: 10, time: "night", bg: "home_room", char: null, speaker: "",
    text: "一盘沙，一个漏斗，一张暗格纸。铺沙的时候她没说话，只在我手抖的时候按了按我的手腕。沙落满暗格的那一刻，图浮现出来——原来手稳不稳，沙都知道。",
    next: "d11_kaleido",
    sandpaint: {
      prompt: "在沙盘上点选格子，还原星图",
      pattern: [
        [0, 0, 1, 0, 0],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1],
        [0, 1, 0, 1, 0],
        [0, 0, 1, 0, 0]
      ],
      tolerance: 4,
      thresholds: [
        { max: 1, tag: "perfect",
          label: "——画对了",
          text: "沙稳稳落在每一格该在的位置。她说：你看——沙不会撒谎，撒谎的是手。你的手这次没撒谎。她想说的话压在沙下。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, kind: 1 },
          memory: { id: "沙画·星图", title: "沙盘里的星图", text: "你把沙铺回它该在的地方，星图出现了。" },
          next: "d11_kaleido" },
        { max: 4, tag: "ok",
          label: "——差不多对",
          text: "沙差不多对。她说：差不多——也是一种对。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d11_kaleido" }
      ],
      fallback: { tag: "miss",
        label: "——画错了",
        text: "沙完全没铺对位置。她说：画错了——错了也不是结束，你可以再铺一次。她把沙推平。",
        next: "d11_kaleido" }
    }
  },

  /* ============ v2.2.0 新玩法触发节点 ============ */
  // 万花筒
  d11_kaleido: {
    day: 11, time: "morning", bg: "home_room", char: null, speaker: "",
    text: "今天本该是学园祭。教学楼前的喧闹隔着窗传进来，我们没有过去——她递来一只旧万花筒，说：转到最后一片彩玻璃归位，图案才会齐。看见了吗？对称从来不是玻璃给的，是你转出来的。",
    next: "d11_abacus",
    kaleido: {
      prompt: "旋转万花筒，让彩色玻璃归位拼出对称图案",
      target: 240,
      tolerance: 8,
      thresholds: [
        { max: 8, tag: "perfect",
          label: "——齐了",
          text: "彩色玻璃一片片归位，对称图案浮现。她说：你看——你转对了，它就齐了。她想说的不只是玻璃。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, honest: 1 },
          memory: { id: "万花筒·240°", title: "晨光里的万花筒", text: "你把万花筒转到 240°，对称图案浮现。" },
          next: "d11_abacus" },
        { max: 18, tag: "ok",
          label: "——差不多齐",
          text: "玻璃差不多归位。她说：差不多——也是一种齐。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d11_abacus" }
      ],
      fallback: { tag: "miss",
        label: "——没齐",
        text: "玻璃没归位，图案散着。她说：散着——也不是散，只是没转够。她把万花筒轻轻转回去。",
        next: "d11_abacus" }
    }
  },

  // 算盘珠
  d11_abacus: {
    day: 11, time: "noon", bg: "library", char: null, speaker: "",
    text: "祭典的音乐声里，她推来一把旧算盘，念数让我拨珠。噼啪响了一整页，她忽然说：慢一点。珠子不会算账——算账的是心，手只是替心跟上。",
    next: "d11_gear",
    abacus: {
      prompt: "按目标数拨动算珠",
      targets: [3, 7, 2],
      tolerance: 1,
      thresholds: [
        { max: 1, tag: "perfect",
          label: "——拨对了",
          text: "算珠稳稳停在目标位。她说：你看——拨对了，数就对了。她想说的不只是数。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, honest: 1 },
          memory: { id: "算盘·3-7-2", title: "图书馆里的算盘", text: "你把算珠拨到 3-7-2 三个目标位。" },
          next: "d11_gear" },
        { max: 3, tag: "ok",
          label: "——差不多对",
          text: "算珠差不多到位。她说：差不多——也是一种对。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d11_gear" }
      ],
      fallback: { tag: "miss",
        label: "——拨错了",
        text: "算珠完全没到位。她说：拨错了——也不是错，只是这次没数清。她把算珠拨回原位。",
        next: "d11_gear" }
    }
  },

  // 齿轮咬合
  d11_gear: {
    day: 11, time: "afternoon", bg: "workshop", char: null, speaker: "",
    text: "学园祭的人潮在墙外来来去去。她拿出一组旧齿轮，让我把每个标记齿都转到顶部。最后一枚咬合时，整组齿轮忽然一起转动。她说：记住这个手感——一件事成了，是因为每个都到了位。",
    next: "d11_topo",
    gear: {
      prompt: "旋转每个齿轮，让标记齿对齐顶部",
      teeth: [10, 8, 6],
      tolerance: 8,
      thresholds: [
        { max: 8, tag: "perfect",
          label: "——咬上了",
          text: "齿轮一个接一个咬合。她说：你看——咬上了，整组就活了。她想说的不只是齿轮。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, honest: 1 },
          memory: { id: "齿轮·三咬合", title: "工坊里的齿轮组", text: "你把三个齿轮的标记齿都转到顶部，整组咬合。" },
          next: "d11_topo" },
        { max: 20, tag: "ok",
          label: "——差不多咬",
          text: "齿轮差不多咬上。她说：差不多——也是一种咬。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d11_topo" }
      ],
      fallback: { tag: "miss",
        label: "——没咬上",
        text: "齿轮完全没咬住。她说：没咬上——也不是错，只是这次没对齐。她把齿轮复位。",
        next: "d11_topo" }
    }
  },

  // 等高线
  d11_topo: {
    day: 11, time: "evening", bg: "rooftop", char: null, speaker: "",
    text: "她铺开一张旧地图：在海拔接近目标值的点上做记号，地形才会显出来。等高线不会自己说话——说话的是你做的记号。说完她把笔横着递过来，像递话筒。",
    loopText: ["她铺开一张旧地图：在海拔接近目标值的点上做记号，地形才会显出来。等高线不会自己说话——说话的是你做的记号。说完她把笔横着递过来，像递话筒。", "旧地图上的等高线。上一轮我标错了两个点——这一轮笔落下去之前，指尖已经记得那两个位置。"],
    next: "d12_chapter_open",
    topo: {
      prompt: "点击海拔接近目标值的点做记号",
      targetH: 0.6,
      tolerance: 0.05,
      points: [
        { x: 0.20, y: 0.30, h: 0.40 },
        { x: 0.40, y: 0.25, h: 0.58 },
        { x: 0.60, y: 0.35, h: 0.62 },
        { x: 0.80, y: 0.30, h: 0.45 },
        { x: 0.25, y: 0.55, h: 0.60 },
        { x: 0.50, y: 0.50, h: 0.55 },
        { x: 0.75, y: 0.55, h: 0.62 },
        { x: 0.30, y: 0.75, h: 0.35 },
        { x: 0.55, y: 0.70, h: 0.58 },
        { x: 0.75, y: 0.75, h: 0.60 },
        { x: 0.15, y: 0.50, h: 0.50 },
        { x: 0.85, y: 0.50, h: 0.55 }
      ],
      thresholds: [
        { max: 0, tag: "perfect",
          label: "——标对了",
          text: "记号稳稳落在每一个目标海拔点。她说：你看——你标对了，地形就显出来了。她想说的不只是地形。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, kind: 1 },
          memory: { id: "等高线·目标海拔", title: "天台上的旧地图", text: "你在海拔 0.6 的目标点上做了记号。" },
          next: "d12_chapter_open" },
        { max: 2, tag: "ok",
          label: "——差不多对",
          text: "记号差不多到位。她说：差不多——也是一种对。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d12_chapter_open" }
      ],
      fallback: { tag: "miss",
        label: "——标错了",
        text: "记号完全没落在目标海拔点。她说：标错了——也不是错，只是这次没看清。她把地图折起。",
        next: "d12_chapter_open" }
    }
  },

  /* ============ v2.3.0 新玩法触发节点 ============ */
  // 日晷对时
  d12_sundial: {
    day: 12, time: "morning", bg: "rooftop", char: null, speaker: "",
    text: "她搬来一座旧日晷。把晷针转到目标刻度，时间才会回到该回的位置——时间不会自己走，走它的是拿晷针的人。这句她说得很平，平得像晷针的影子。",
    loopText: ["她搬来一座旧日晷。把晷针转到目标刻度，时间才会回到该回的位置——时间不会自己走，走它的是拿晷针的人。这句她说得很平，平得像晷针的影子。", "旧日晷的影子爬过刻度。第几次把它转回原位了——影子停住的那一刻，我竟然有点想念上一轮的偏差。"],
    next: "d12_dye",
    sundial: {
      prompt: "旋转日晷指针，对齐目标时间刻度",
      target: 135,
      tolerance: 8,
      thresholds: [
        { max: 8, tag: "perfect",
          label: "——对上了",
          text: "晷针稳稳落在 135°，影子指向正确的时间。她说：你看——对上了，时间就回来了。她想说的不只是时间。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, honest: 1 },
          memory: { id: "日晷·135°", title: "天台上的日晷", text: "你把晷针转到 135°，影子指向正确的时间。" },
          next: "d12_dye" },
        { max: 18, tag: "ok",
          label: "——差不多对",
          text: "晷针差不多对上。她说：差不多——也是一种对。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d12_dye" }
      ],
      fallback: { tag: "miss",
        label: "——没对上",
        text: "晷针完全没对上目标。她说：没对上——也不是错，只是这次没看清时辰。她把日晷转回去。",
        next: "d12_dye" }
    }
  },

  // 染缸调色
  d12_dye: {
    day: 12, time: "noon", bg: "art_room", char: null, speaker: "",
    text: "她推来一口染缸。三种染料按对的比例倒进去，布才会染出该有的颜色。颜色不会自己出来——出来的是调它的人。这句话的下半句，她是看着你说的。",
    next: "d12_windmill",
    dye: {
      prompt: "调节三色染料，染出目标颜色",
      target: { r: 180, g: 80, b: 140 },
      tolerance: 25,
      thresholds: [
        { max: 75, tag: "perfect",
          label: "——染对了",
          text: "染料在缸中融成目标色，布浸下去浮上来一片正色。她说：你看——染对了，色就对了。她想说的不只是颜色。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, kind: 1 },
          memory: { id: "染缸·玫红", title: "美术室的染缸", text: "你把染料调到目标色，染出一块玫红的布。" },
          next: "d12_windmill" },
        { max: 150, tag: "ok",
          label: "——差不多对",
          text: "染料差不多到位。她说：差不多——也是一种对。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d12_windmill" }
      ],
      fallback: { tag: "miss",
        label: "——染错了",
        text: "颜色完全不对。她说：染错了——也不是错，只是这次没调准。她把布拧干。",
        next: "d12_windmill" }
    }
  },

  // 风车叶片
  d12_windmill: {
    day: 12, time: "afternoon", bg: "field", char: null, speaker: "",
    text: "她带你到操场边的小风车前。把每个叶片都转到正对风向，风车才会真正转起来。风不会自己找叶片——找叶片的是手。说完她蹲下来，看你转第一片。",
    next: "d12_weave",
    windmill: {
      prompt: "旋转每个叶片，让风车正对风向",
      blades: 4,
      target: 90,
      tolerance: 8,
      thresholds: [
        { max: 8, tag: "perfect",
          label: "——正了",
          text: "四片叶片一齐正对风向，风车开始稳稳转动。她说：你看——正了，风就愿意来了。她想说的不只是风车。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, honest: 1 },
          memory: { id: "风车·四叶正", title: "操场边的风车", text: "你把四片叶片都正对风向，风车开始转动。" },
          next: "d12_weave" },
        { max: 20, tag: "ok",
          label: "——差不多正",
          text: "叶片差不多正。她说：差不多——也是一种正。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d12_weave" }
      ],
      fallback: { tag: "miss",
        label: "——没正",
        text: "叶片完全没对上风向。她说：没正——也不是错，只是这次没找到风。她把风车停下。",
        next: "d12_weave" }
    }
  },

  // 经纬编织
  d12_weave: {
    day: 12, time: "evening", bg: "home_room", char: null, speaker: "",
    text: "她拿出一只旧织布框。按图上的经纬交替点选，布才会织出该有的纹。经纬不会自己成纹——成纹的是手。这句她是一根线一根线比给你的。",
    next: "d13_mirror",
    weave: {
      prompt: "交替点选经纬线，编织目标图案",
      pattern: [
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [0, 1, 0, 1],
        [1, 0, 1, 0]
      ],
      tolerance: 2,
      thresholds: [
        { max: 1, tag: "perfect",
          label: "——织对了",
          text: "经纬稳稳按图交替，布纹浮现出来。她说：你看——织对了，纹就出来了。她想说的不只是布。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, kind: 1 },
          memory: { id: "编织·棋盘纹", title: "宿舍里的织框", text: "你按图交替点选经纬，织出一片棋盘纹的布。" },
          next: "d13_mirror" },
        { max: 4, tag: "ok",
          label: "——差不多对",
          text: "经纬差不多到位。她说：差不多——也是一种对。她不再多说。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d13_mirror" }
      ],
      fallback: { tag: "miss",
        label: "——织错了",
        text: "经纬完全没按图。她说：织错了——也不是错，只是这次没数清。她把布拆掉。",
        next: "d13_mirror" }
    }
  },

  /* ============ v2.4.0 新玩法触发节点 ============ */
  // 镜面对称
  d13_mirror: {
    day: 13, time: "morning", bg: "art_room", char: null, speaker: "",
    text: "她拿出一面旧铜镜。点选格子让左半镜像右半，图案才会完整。镜子不会自己对称——对称的是手。这句她说完就去擦镜面的灰，留你和格子对峙。",
    next: "d13_lantern",
    mirror: {
      prompt: "点选格子让左半镜像右半",
      pattern: [
        [1, 0, 0, 1],
        [0, 1, 1, 0],
        [1, 0, 0, 1],
        [0, 1, 1, 0]
      ],
      tolerance: 1,
      thresholds: [
        { max: 1, tag: "perfect",
          label: "——对称了",
          text: "格子左右完全对称。她说：你看——对称了，镜子就完整了。她想说的不只是镜子。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, honest: 1 },
          memory: { id: "镜面·对称", title: "美术室的铜镜", text: "你点选格子让左半镜像右半，图案完整了。" },
          next: "d13_lantern" },
        { max: 4, tag: "ok",
          label: "——差不多对称",
          text: "格子左右差不多对称。她说：差不多——也算对称。她没再说什么。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d13_lantern" }
      ],
      fallback: { tag: "miss",
        label: "——没对称",
        text: "格子左右完全不对称。她说：没对称——也不是错，只是这次没看清楚。她把镜子放下。",
        next: "d13_lantern" }
    }
  },

  // 灯笼排列
  d13_lantern: {
    day: 13, time: "noon", bg: "festival", char: null, speaker: "",
    text: "她指向檐下四盏熄着的灯笼：按我念的顺序点亮它们，光才会一路走到尾。顺序错了，灯也会熄——这句她念指令前先说了，像提前交代纪律。",
    loopText: ["她指向檐下四盏熄着的灯笼：按我念的顺序点亮它们，光才会一路走到尾。顺序错了，灯也会熄——这句她念指令前先说了，像提前交代纪律。", "檐下四盏灯笼。点灯的顺序她念到第二个，我的手已经搭在了第三盏上。"],
    next: "d13_ripple",
    lantern: {
      prompt: "按顺序点亮灯笼，还原目标序列",
      target: [2, 0, 3, 1],
      count: 4,
      tolerance: 0,
      thresholds: [
        { max: 0, tag: "perfect",
          label: "——点亮了",
          text: "灯笼按顺序一一点亮，光从檐头走到檐尾。她说：你看——顺序对了，光就通了。她想说的不只是灯。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, kind: 1 },
          memory: { id: "灯笼·顺序", title: "祭典的檐下", text: "你按她念的顺序点亮四盏灯笼，光一路走到尾。" },
          next: "d13_ripple" },
        { max: 1, tag: "ok",
          label: "——差不多对",
          text: "灯笼顺序差不多对。她说：差不多——也算记住了。她没再说什么。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d13_ripple" }
      ],
      fallback: { tag: "miss",
        label: "——排错了",
        text: "灯笼顺序完全错了。她说：排错了——也不是错，只是这次没记清。她把灯笼一盏盏熄掉。",
        next: "d13_ripple" }
    }
  },

  // 水波纹
  d13_ripple: {
    day: 13, time: "afternoon", bg: "pond", char: null, speaker: "",
    text: "她蹲在池边。点击水面，让波纹一圈圈扩散出去，盖住所有浮着的莲瓣。波纹不会自己走——走的是手。这句她说给水面听，也算说给你。",
    next: "d13_mosaic",
    ripple: {
      prompt: "点击水面，让波纹覆盖所有目标点",
      targets: [
        { x: 0.25, y: 0.35 },
        { x: 0.65, y: 0.30 },
        { x: 0.45, y: 0.60 },
        { x: 0.80, y: 0.70 }
      ],
      tolerance: 0.08,
      duration: 8000,
      thresholds: [
        { max: 0, tag: "perfect",
          label: "——盖住了",
          text: "波纹一圈圈扩散，每一瓣莲瓣都被轻轻盖住。她说：你看——盖住了，水就完整了。她想说的不只是水。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, calm: 1 },
          memory: { id: "波纹·覆盖", title: "校园后的池边", text: "你点击水面，波纹一圈圈扩散，盖住所有莲瓣。" },
          next: "d13_mosaic" },
        { max: 1, tag: "ok",
          label: "——差不多盖住",
          text: "波纹差不多盖住了莲瓣。她说：差不多——也算盖住了。她没再说什么。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d13_mosaic" }
      ],
      fallback: { tag: "miss",
        label: "——没盖住",
        text: "波纹完全没盖住莲瓣。她说：没盖住——也不是错，只是这次没算准。她把水搅浑。",
        next: "d13_mosaic" }
    }
  },

  // 马赛克拼图
  d13_mosaic: {
    day: 13, time: "evening", bg: "art_room", char: null, speaker: "",
    text: "她推过来一盒彩色小方块。按图填出形状，马赛克才会成画。方块不会自己成画——成画的是手。说完她把图压在盒底，只留一眼的时间。",
    next: "d14_stele",
    mosaic: {
      prompt: "点选小方块，拼出目标图案",
      pattern: [
        [0, 1, 1, 0],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [0, 1, 1, 0]
      ],
      tolerance: 2,
      thresholds: [
        { max: 1, tag: "perfect",
          label: "——拼出来了",
          text: "方块按图一一落下，马赛克成了一朵花。她说：你看——拼出来了，画就出来了。她想说的不只是画。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, creative: 1 },
          memory: { id: "马赛克·花", title: "美术室的碎片", text: "你点选彩色方块拼出一朵花的马赛克。" },
          next: "d14_stele" },
        { max: 4, tag: "ok",
          label: "——差不多拼出",
          text: "方块差不多拼出形状。她说：差不多——也算拼了。她没再说什么。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d14_stele" }
      ],
      fallback: { tag: "miss",
        label: "——拼错了",
        text: "方块完全没按图。她说：拼错了——也不是错，只是这次没看清。她把方块推散。",
        next: "d14_stele" }
    }
  },

  /* ============ v2.5.0 新玩法触发节点 ============ */
  // 碑帖拼合
  d14_stele: {
    day: 14, time: "morning", bg: "library", char: null, speaker: "",
    text: "图书馆后院立着一块断碑。碎片散了，点两个交换位置，碑文才会重新连上。字不会自己归位——归位的是手。这句她念给碑听，像替碑道歉。",
    next: "d14_celestial",
    stele: {
      prompt: "点击两个碎片交换位置，拼合碑文",
      target: [2, 0, 3, 1],
      tolerance: 0,
      thresholds: [
        { max: 0, tag: "perfect",
          label: "——拼上了",
          text: "碎片一一归位，碑文重新连成一行。她说：你看——拼上了，字就连起来了。她想说的不只是字。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, honest: 1 },
          memory: { id: "碑帖·归位", title: "图书馆后院", text: "你交换碎片让碑文重新连成一行。" },
          next: "d14_celestial" },
        { max: 2, tag: "ok",
          label: "——差不多对",
          text: "碎片差不多归位。她说：差不多——也算拼了。她没再说什么。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d14_celestial" }
      ],
      fallback: { tag: "miss",
        label: "——没拼上",
        text: "碎片完全没归位。她说：没拼上——也不是错，只是这次没看清。她把碎片推散。",
        next: "d14_celestial" }
    }
  },

  // 星轨推演
  d14_celestial: {
    day: 14, time: "noon", bg: "observatory", char: null, speaker: "",
    text: "天文社的旧仪还亮着。拖动行星到目标角度，星轨才会对上。行星不会自己走——走的是手。这句她说的时候，仪器的光正好打在她半边脸上。",
    next: "d14_drum",
    celestial: {
      prompt: "拖动行星到目标角度",
      planets: [
        { target: 90,  color: "#ff8060" },
        { target: 200, color: "#80a0ff" },
        { target: 320, color: "#c0e080" }
      ],
      tolerance: 12,
      thresholds: [
        { max: 0, tag: "perfect",
          label: "——对上了",
          text: "行星一一滑到目标角度，星轨连成一线。她说：你看——对上了，星就连起来了。她想说的不只是星。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, calm: 1 },
          memory: { id: "星轨·对位", title: "天文社的旧仪", text: "你拖动行星到目标角度，星轨连成一线。" },
          next: "d14_drum" },
        { max: 1, tag: "ok",
          label: "——差不多对",
          text: "行星差不多到位。她说：差不多——也算对上了。她没再说什么。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d14_drum" }
      ],
      fallback: { tag: "miss",
        label: "——没对上",
        text: "行星完全没到位。她说：没对上——也不是错，只是这次没算准。她把仪盘擦了擦。",
        next: "d14_drum" }
    }
  },

  // 节拍鼓点
  d14_drum: {
    day: 14, time: "afternoon", bg: "music_room", char: null, speaker: "",
    text: "音乐教室角落有面旧鼓。听完一遍节奏，再敲出来，鼓才会跟上你。节拍不会自己出来——出来的是手。这句她是敲着桌子腿说的。",
    next: "d14_vane",
    drum: {
      prompt: "按节拍敲击鼓面，复现目标节奏",
      sequence: [600, 400, 600, 400, 800],
      tolerance: 160,
      thresholds: [
        { max: 0, tag: "perfect",
          label: "——跟上了",
          text: "鼓点一拍拍落下，节奏稳稳跟上。她说：你看——跟上了，鼓就活了。她想说的不只是鼓。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, calm: 1 },
          memory: { id: "鼓点·节拍", title: "音乐教室的旧鼓", text: "你按节拍敲击鼓面，节奏稳稳跟上。" },
          next: "d14_vane" },
        { max: 1, tag: "ok",
          label: "——差不多跟上",
          text: "鼓点差不多跟上节奏。她说：差不多——也算跟上了。她没再说什么。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d14_vane" }
      ],
      fallback: { tag: "miss",
        label: "——没跟上",
        text: "鼓点完全没跟上节奏。她说：没跟上——也不是错，只是这次没数清。她把鼓收起来。",
        next: "d14_vane" }
    }
  },

  // 风向标
  d14_vane: {
    day: 14, time: "evening", bg: "rooftop", char: null, speaker: "",
    text: "天台上的旧风向标还在转。拖动指针对齐目标方位，风才会找到该去的方向。指针不会自己对上——对上的是手。这句她迎着风喊的，尾音被吹散了一半。",
    next: "d15_clepsydra",
    vane: {
      prompt: "旋转风向标对齐目标方位",
      target: 135,
      tolerance: 10,
      thresholds: [
        { max: 8, tag: "perfect",
          label: "——对准了",
          text: "指针稳稳停在目标方位，风顺着方向吹过来。她说：你看——对准了，风就来了。她想说的不只是风。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, calm: 1 },
          memory: { id: "风向·对位", title: "天台的旧风向标", text: "你旋转指针对齐目标方位，风顺着方向吹过来。" },
          next: "d15_clepsydra" },
        { max: 20, tag: "ok",
          label: "——差不多对",
          text: "指针差不多对准方位。她说：差不多——也算对上了。她没再说什么。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d15_clepsydra" }
      ],
      fallback: { tag: "miss",
        label: "——没对上",
        text: "指针完全没对上方位。她说：没对上——也不是错，只是这次没看清。她把风向标松开。",
        next: "d15_clepsydra" }
    }
  },

  /* ============ v2.6.0 新玩法触发节点 ============ */
  // 漏刻计时
  d15_clepsydra: {
    day: 15, time: "morning", bg: "courtyard", char: null, speaker: "",
    text: "庭角立着一只旧漏刻。放水，在目标时刻停住，时辰才会准。水不会自己停——停的是手。这句她说完就退开一步，把整个清晨留给你。",
    next: "d15_jigsaw",
    clepsydra: {
      prompt: "放水，在目标时刻停止水流",
      target: 5000,
      tolerance: 250,
      duration: 10000,
      thresholds: [
        { max: 250, tag: "perfect",
          label: "——停准了",
          text: "水流在目标时刻稳稳停住。她说：你看——停准了，时辰就对了。她想说的不只是时辰。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, calm: 1 },
          memory: { id: "漏刻·停时", title: "庭角的旧漏刻", text: "你放水在目标时刻停住，时辰对了。" },
          next: "d15_jigsaw" },
        { max: 600, tag: "ok",
          label: "——差不多对",
          text: "水流差不多在目标时刻停住。她说：差不多——也算停准了。她没再说什么。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d15_jigsaw" }
      ],
      fallback: { tag: "miss",
        label: "——没停准",
        text: "水流完全没在目标时刻停住。她说：没停准——也不是错，只是这次没数清。她把漏刻倒空。",
        next: "d15_jigsaw" }
    }
  },

  // 拼图归位
  d15_jigsaw: {
    day: 15, time: "noon", bg: "art_room", char: null, speaker: "",
    text: "美术室桌上一盒碎片。点两个交换位置，图案才会完整。碎片不会自己归位——归位的是手。这句她写在了盒盖内侧，你拼到一半才发现。",
    next: "d15_chess",
    jigsaw: {
      prompt: "点击两个碎片交换位置，拼出完整图案",
      target: [1, 2, 3, 0],
      tolerance: 0,
      thresholds: [
        { max: 0, tag: "perfect",
          label: "——拼好了",
          text: "碎片一一归位，图案完整地浮出来。她说：你看——拼好了，画就完整了。她想说的不只是画。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, patient: 1 },
          memory: { id: "拼图·归位", title: "美术室的碎片", text: "你交换碎片让图案完整归位。" },
          next: "d15_chess" },
        { max: 2, tag: "ok",
          label: "——差不多对",
          text: "碎片差不多归位。她说：差不多——也算拼了。她没再说什么。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d15_chess" }
      ],
      fallback: { tag: "miss",
        label: "——没拼好",
        text: "碎片完全没归位。她说：没拼好——也不是错，只是这次没看清。她把碎片推散。",
        next: "d15_chess" }
    }
  },

  // 棋局推演
  d15_chess: {
    day: 15, time: "afternoon", bg: "club_room", char: null, speaker: "",
    text: "棋社桌上摆着一盘残局。移动棋子到目标格，每步一格，不能越障。棋子不会自己走——走的是手。这句她坐到对面说的，像宣读规则，也像对手戏。",
    next: "d15_flag",
    chess: {
      prompt: "移动棋子到目标格（每步一格，不能越障）",
      size: 4,
      start: { x: 0, y: 0 },
      target: { x: 3, y: 3 },
      obstacles: [ { x: 1, y: 1 }, { x: 2, y: 2 } ],
      maxMoves: 8,
      tolerance: 0,
      thresholds: [
        { max: 0, tag: "perfect",
          label: "——走到了",
          text: "棋子稳稳落在目标格。她说：你看——走到了，局就破了。她想说的不只是棋。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, calm: 1 },
          memory: { id: "棋局·破残", title: "棋社的残局", text: "你移动棋子到目标格，破了残局。" },
          next: "d15_flag" },
        { max: 1, tag: "ok",
          label: "——差不多到",
          text: "棋子差不多到目标格。她说：差不多——也算到了。她没再说什么。",
          add: { affection: { shen: 1 } },
          personality: { careful: 1 },
          next: "d15_flag" }
      ],
      fallback: { tag: "miss",
        label: "——没走到",
        text: "棋子完全没到目标格。她说：没走到——也不是错，只是这次没算准。她把棋子归位。",
        next: "d15_flag" }
    }
  },

  // 旗阵辨识
  d15_flag: {
    day: 15, time: "evening", bg: "courtyard", char: null, speaker: "",
    text: "庭院旗杆上挂着四面旗。按我说的图案选对那一面，旗才会认你。旗不会自己认人，认人的是眼。这句她抬手挡着阳光说的，说完就看着你的眼睛。",
    loopText: ["庭院旗杆上挂着四面旗。按我说的图案选对那一面，旗才会认你。旗不会自己认人，认人的是眼。这句她抬手挡着阳光说的，说完就看着你的眼睛。", "庭院的四面旗。风把旗面吹得猎猎作响——她说「旗不会自己认人」，可我认得旗，像认得回家的路。"],
    next: "d15_rewind",
    flag: {
      prompt: "按描述选择正确的旗帜",
      description: "红底白圆居中",
      target: 0,
      options: [
        { id: 0, label: "红底白圆居中", pattern: 0 },
        { id: 1, label: "上蓝下白", pattern: 1 },
        { id: 2, label: "红白条纹", pattern: 2 },
        { id: 3, label: "蓝底金星", pattern: 3 }
      ],
      thresholds: [
        { max: 0, tag: "perfect",
          label: "——选对了",
          text: "你选对了那一面。她说：你看——选对了，旗就认你了。她想说的不只是旗。",
          add: { affection: { shiyu: 2, shen: 1, sunian: 1 } },
          personality: { careful: 2, honest: 1 },
          memory: { id: "旗阵·辨识", title: "庭院的旗杆", text: "你按描述选对了一面红底白圆的旗。" },
          next: "d15_flag_hit" }
      ],
      fallback: { tag: "miss",
        label: "——选错了",
        text: "你选错了那一面。她说：选错了——也不是错，只是这次没看清。她把旗降下来。",
        next: "d15_flag_miss" }
    }
  },
  d15_flag_hit: {
    day: 15, time: "evening", bg: "courtyard", char: null, speaker: "",
    text: "她看着那面选对的旗，看了很久。风把旗面吹得猎猎作响，她忽然笑了——「你的眼睛，比我想象的可靠。」这句话说得很轻，轻得像在说给风听。可我记住了。",
    next: "d15_rewind"
  },
  d15_flag_miss: {
    day: 15, time: "evening", bg: "courtyard", char: null, speaker: "",
    text: "旗面在风里翻了个面——选错了。她没有怪我，只是把旗重新升上去：「没关系。循环这么多次，总有一次会选对的。」说这句话的时候，她没有看我。",
    next: "d15_rewind"
  },

  d15_rewind: {
    bg: "courtyard", char: null, speaker: "",
    text: "旗落下的声音像一页合上。第 15 日没有消失，只是把我送回第 5 日清晨——这一次，我知道回去不是重来，而是把漏掉的答案补上。",
    loopText: ["旗落下的声音像一页合上。第 15 日没有消失，只是把我送回第 5 日清晨——这一次，我知道回去不是重来，而是把漏掉的答案补上。", "旗落下的声音像一页合上。第 15 日把我送回第 5 日清晨——我数过了，这是第几次回去。这一次，我知道回去要捡什么。"],
    timeLoop: true,
    next: "d5_loop_arrival"
  },

  // 第 15 日回溯后的新线索：先处理记忆，再回到第 5 日的原有事件。
  d5_loop_arrival: {
    day: 5, time: "morning", bg: "rooftop", char: null, speaker: "",
    text: "第 5 日的风还没有变。口袋里的匿名信却比记忆里多了一道折痕，像有人在我回去之前，替我把答案藏进了纸里。",
    loopText: ["第 5 日的风还没有变。口袋里的匿名信却比记忆里多了一道折痕，像有人在我回去之前，替我把答案藏进了纸里。",
"第 5 日的风还是没有变。我摸了摸口袋里的信——折痕还在，说明我带着上一轮的答案回来了。这一次，风没变，变的是我。",
"我又回到了这个早晨。风、信、折痕，一样不少。我站在天台上把信展开又折好，像在给某个还没出发的自己留一张地图。"],
    next: "d5_loop_choice"
  },
  d5_loop_choice: {
    day: 5, time: "morning", bg: "rooftop",
    choice: {
      prompt: "带着第 15 日的记忆醒来，你先做什么？",
      options: [
        { text: "把记得的事写在信封背面", next: "d5_loop_letter" },
        { text: "先上天台，等她叫我", next: "d5_mimic" },
        { text: "重新读一遍匿名信的落款", next: "d5_loop_signature" }
      ]
    }
  },
  d5_loop_letter: {
    day: 5, time: "morning", bg: "rooftop", speaker: "沈屿",
    text: "我在信封背面写下：「如果今天重复，别把重复当成惩罚。」墨迹落下去时，我不确定这是给未来的自己，还是给那个还没认识我的人。",
    next: "d5_mimic",
    set: { flag_loop_note: true },
    memory: { id: "循环·背面", title: "信封背面的提醒", text: "回到第 5 日后，你在匿名信封背面写下：别把重复当成惩罚。" }
  },
  d5_loop_signature: {
    day: 5, time: "morning", bg: "rooftop", speaker: "沈屿",
    text: "落款仍只有一个「樱」字。它可能是名字，也可能只是写信的人不敢留下名字时，给自己画的一道影子。你把信折好，决定先听今天会发生什么。",
    next: "d5_mimic",
    set: { flag_loop_signature: true },
    memory: { id: "循环·落款", title: "只有一个樱字", text: "回到第 5 日后，你重新读匿名信，只看见一个无法确认含义的「樱」字。" }
  },

  /* ============ v1.4.0 新玩法触发节点 ============ */
  // 拓印
  d3_rubbing: {
    day: 3, time: "night", bg: "library", char: null, speaker: "",
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
    day: 3, time: "night", bg: "field", char: null, speaker: "",
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
          text: "你抓住了一捧「雨」字。「雨是抓不住的——但你今天抓住了。」顿了顿，她又补上后半句：有些东西你抓得住，是因为它愿意让你抓。",
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
    day: 3, time: "night", bg: "rooftop", char: null, speaker: "",
    text: "夜色里的天台上，远方樱花树下有一个人影。你眯起眼——画面是糊的。调整焦距，看清那人是谁。",
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
    day: 3, time: "night", bg: "home_room", char: null, speaker: "",
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
  common_day5_morning: { day: 5, time: "afternoon", bg: "rooftop", char: null, speaker: "", text: "第 5 日午后。我爬上天台透气。海风把樱花吹成一场粉色的雨。", next: "d5_route_check" },
  d5_route_check: {
    day: 5, time: "afternoon", bg: "rooftop",
    choice: {
      prompt: "这个周末，去见谁？",
      options: [
        { text: "图书馆找林诗雨", next: "route_shiyu_1" },
        { text: "操场找夏织",     next: "route_xiazhi_1" },
        { text: "美术室找苏念",   next: "route_sunian_1" },
      ],
      // 学姐线（v3.3.0 形态 A）：听完真相且仍在循环中，才会看见旧校舍的灯
      loopChoice: [
        {
          minLoop: 1,
          text: "⟲ 去旧校舍找学姐",
          next: "route_senior_1",
          requires_ending: "true_unbroken",
        }
      ]
    }
  },

  /* ============ 林诗雨线 · 4 章 × 3 结局 ============ */
  route_shiyu_1: { day: 5, time: "afternoon", bg: "library", char: "shiyu", speaker: "", text: "周六图书馆。林诗雨一个人坐在老位置，稿纸叠得更高了。",
    loopText: ["周六图书馆。林诗雨一个人坐在老位置，稿纸叠得更高了。",
    "周六图书馆。林诗雨一个人坐在老位置，稿纸叠得更高了。",
    "又是周六的图书馆。稿纸的高度我见过——这次我没有犹豫，直接在她对面坐下。她抬头，愣了半秒，然后把另一半桌面让给了我。",
    "第三次推开图书馆的门，我先去拿了两杯水。她看见水，笑了：「你记得我坐哪。」——记得。每一条路我都记得怎么走回起点。"], next: "sy_2" },
  sy_2: { day: 5, time: "afternoon", bg: "library", char: "shiyu", speaker: "林诗雨", text: "你来了。我以为你不会来。",
    loopText: ["你来了。我以为你不会来。",
"你来了。我以为你不会来。——她连这句都说得和上次一样。可我知道她稿纸上的角色 A，这一次会走得更远一点。",
"『我以为你不会来』。我来了，上一轮也来了。这一轮我坐下时没有说话，只是把她上一轮没写完的那句开场，在心里默背了一遍。"], next: "sy_3" },
  sy_3: { day: 5, time: "afternoon", bg: "library", speaker: "沈屿", text: "你说不写会忘掉自己。我来看看，你还记不记得自己。", next: "sy_4" },
  sy_4: { day: 5, time: "afternoon", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……我妈昨天翻了我的书包。",
    loopText: ["……我妈昨天翻了我的书包。",
"……我妈昨天翻了我的书包。——上一轮我急着安慰她。这一轮我听完才开口：她需要的不是安慰，是有人替她把那句『我想写下去』说出来。",
"她低着头说完那句话，和上一轮一模一样。我忽然想：循环给了我很多次『重来』，可她只有一次『被听懂』的机会。"], next: "sy_5" },
  sy_5: {
    day: 5, time: "afternoon", bg: "library", char: "shiyu", speaker: "林诗雨",
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
        { id: "write_on",  keywords: ["写", "继续", "下去", "别停"], add: { affection: { shiyu: 2 } }, personality: { brave: 2, honest: 1 }, memory: "诗雨·凌晨·写下去", memoryTitle: "回信·写下去" },
        { id: "take_break", keywords: ["停", "歇", "陪", "睡", "休息"], add: { affection: { shiyu: 1 } }, personality: { kind: 2 }, memory: "诗雨·凌晨·歇一歇", memoryTitle: "回信·歇一歇" },
      ]
    }
  },
  sy_6: { day: 5, time: "afternoon", bg: "library", speaker: "沈屿", text: "她爱你，只是用错了方式。", next: "sy_7" },
  sy_7: { day: 5, time: "afternoon", bg: "library", char: "shiyu", speaker: "林诗雨", text: "我知道。可那方式压了我十七年。小说写的是个优等生毕业前消失了。所有人都觉得她去了好大学，只有她自己知道，她去了很远的地方。", next: "sy_8", keyword: "小说" },
  sy_8: { day: 5, time: "afternoon", bg: "library", speaker: "沈屿", text: "你想给她一个结局吗？", next: "sy_9" },
  sy_9: { day: 5, time: "afternoon", bg: "library", char: "shiyu", speaker: "林诗雨", text: "我想。但我写不出。每次写到她消失那一刻，我的手就停了。最末一行：「她回过头，看见了自己从未活过的人生。」", loopText: ["我想。但我写不出。每次写到她消失那一刻，我的手就停了。最末一行：「她回过头，看见了自己从未活过的人生。」",
"我想。可我还是写不出。这一轮我听见了另一层意思：她不是在写一个消失的人，是在写一个不敢活的人——所以才一次次停笔。",
"「我想。但我写不出。」这一轮我才发现，她说这句话时，手一直按在那行字上——那行「从未活过的人生」，是她替自己写的判词。"], next: "sy_minigame" },
  sy_minigame: {
    day: 5, time: "afternoon", bg: "library", char: "shiyu", speaker: "林诗雨",
    text: "……你愿不愿意替我写一句试试？就一句。写到这句之后，我就接着写。",
    minigame: "writing",
    scoreBonus: { affection: { shiyu: 3 } },
    next: "sy_choice_1"
  },
  sy_choice_1: {
    day: 5, time: "afternoon", bg: "library",
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
  sy_11_good: { day: 7, time: "evening", bg: "library", char: "shiyu", speaker: "", text: "她连夜写完了。第二天清晨把稿子推给我，眼睛红着。",
    loopText: ["她连夜写完了。第二天清晨把稿子推给我，眼睛红着。",
    "她连夜写完了。第二天清晨把稿子推给我，眼睛红着——这次我知道，那是写完之后的红，不是熬不住的红。",
    "连夜写完，清晨推给我。第二年的同一个清晨，她的第二本也写完了。红着眼睛交稿这件事，成了她的仪式。"], next: "sy_12_good" },
  sy_12_good: { day: 8, time: "morning", bg: "library", char: "shiyu", speaker: "林诗雨", text: "我投了校刊。用笔名。",
    loopText: ["我投了校刊。用笔名。",
    "我投了校刊。用笔名。笔名的读音，和她的名字只差一个字——我假装没听出来。",
    "校刊、笔名。第二次她投得毫不犹豫。有些名字，就是为了有一天能被喊出来。"], next: "sy_13_good" },
  sy_13_good: { day: 35, time: "evening", bg: "cherry_full", char: "shiyu", speaker: "", text: "一个月后，校刊印出来了。封面上印着她的笔名。她把样书塞进我手里。", loopText: ["一个月后，校刊印出来了。封面上印着她的笔名。她把样书塞进我手里。",
"一个月后，校刊印出来了。上一轮我只看见她终于被印在封面上；这一轮我看见她递书时指尖在发抖——像把自己交出去一样。",
"校刊、封面、她的笔名。这一轮我读懂了：这不是一本杂志，是她第一次允许自己被看见。"], next: "sy_14_good", cg_unlock: "cg_shiyu_good" },
  sy_14_good: { day: 35, time: "evening", bg: "cherry_full", char: "shiyu", speaker: "林诗雨", text: "我妈看了。她哭了很久，然后说——再写一本。",
    loopText: ["我妈看了。她哭了很久，然后说——再写一本。",
    "她妈看了，哭了很久，然后说——再写一本。上一次听到这句话时，我还不知道「方式」这个词会这么快变暖。",
    "再写一本。母女之间的和解没有宣言——只有一本写完的书，和一句再写一本。"], next: "sy_15_good" },
  sy_15_good: { day: 35, time: "evening", bg: "cherry_full", char: "shiyu", speaker: "林诗雨", text: "扉页我写了：「献给外婆，也献给那个让我回头的人。」", next: "sy_ending_good" },
  sy_ending_good: {
    day: 35, time: "evening", bg: "ending_good", char: "shiyu", speaker: "",
    text: "那年樱花开尽之前，她把那本小说的样书塞进我手里。她终于敢回头，看见自己开始活下去。",
    ending: { id: "shiyu_good", type: "GOOD ENDING", title: "回 头", text: "她终于敢回头，看见自己开始活下去。" }
  },

  /* —— NORMAL —— */
  sy_10_normal: { day: 6, time: "evening", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……半章。",
    loopText: ["……半章。",
    "……半章。她说过要留给外婆的话，这次说得比上次笃定。",
    "……半章。每一年她都会重新决定一次——决定本身，就是她的写法。"], next: "sy_11_normal" },
  sy_11_normal: { day: 7, time: "morning", bg: "library", char: "shiyu", speaker: "", text: "她写了半章就停了。她说剩下的半章要留给外婆，也留给自己。",
    loopText: ["她写了半章就停了。她说剩下的半章要留给外婆，也留给自己。",
    "她写了半章就停了。留给外婆的那一半，这次她写得很慢——像在陪一个人说话。",
    "半章停在那里，一年比一年稳。停笔不是卡住——是她终于学会了在哪里放手。"], next: "sy_12_normal" },
  sy_12_normal: { day: 8, time: "evening", bg: "home_room", char: "shiyu", speaker: "林诗雨", text: "我没投校刊。我把稿子放进了外婆的旧书箱。我跟她说，等我考完法律系，再写下一章。",
    loopText: ["我没投校刊。我把稿子放进了外婆的旧书箱。我跟她说，等我考完法律系，再写下一章。",
    "稿子进了旧书箱。每年整理书箱，她都会多放一页进去——法律系的作业越来越厚，那一页也越来越像她自己。",
    "旧书箱里那一页，去年变成了两页。没有截止日期的写作，走得最远。"], next: "sy_13_normal" },
  sy_13_normal: { day: 9, time: "evening", bg: "home_room", char: "shiyu", speaker: "林诗雨", text: "我妈昨天看了我抽屉里的半章稿。她什么都没说，只把稿纸抚平了。",
    loopText: ["我妈昨天看了我抽屉里的半章稿。她什么都没说，只把稿纸抚平了。",
    "稿纸被抚平的那一下，她今年又看见了——第二次。有些回答不用语言，重复就是。",
    "抽屉里的稿纸每年都会被抚平一次。抚平的褶皱一年比一年少——因为写下它的人，一年比一年不纠结。"], next: "sy_14_normal" },
  sy_14_normal: { day: 9, time: "evening", bg: "home_room", char: "shiyu", speaker: "林诗雨", text: "沈屿，谢谢你让我写完半章。剩下的，我自己慢慢写。", next: "sy_ending_normal" },
  sy_ending_normal: {
    day: 9, time: "evening", bg: "ending_normal", char: "shiyu", speaker: "",
    text: "她留下了半章，也留下了自己。法律系她会去读，但她答应自己——业余继续写。",
    ending: { id: "shiyu_normal", type: "NORMAL ENDING", title: "半 章", text: "她留下了半章，也留下了自己。" }
  },

  /* —— BAD —— */
  sy_10_bad: { day: 6, time: "evening", bg: "library", char: "shiyu", speaker: "林诗雨", text: "……消失一次。也对。也许她真的该消失一次。",
    loopText: ["……消失一次。也对。也许她真的该消失一次。",
    "……消失一次。这句话我说出口的瞬间就后悔了——可她听见了。有些话，第一次说就该想清楚。",
    "消失一次。这一次我把这句话咽了回去半秒——但半秒不够。话一旦出口，就只属于听的人。"], next: "sy_11_bad" },
  sy_11_bad: { day: 13, time: "morning", bg: "rain", char: null, speaker: "", text: "一周后的雨天，林诗雨没有来上学。课桌上只留了一张便条：「转学了。谢谢你来图书馆。」", loopText: ["一周后的雨天，林诗雨没有来上学。课桌上只留了一张便条：「转学了。谢谢你来图书馆。」",
"一周后的雨天，她没来。上一轮我盯着那张便条发愣；这一轮我在想：写下「谢谢你来图书馆」时，她是不是也盼着有人来追。",
"同样的雨天，同样的便条。这一轮我明白——这不是告别，是一扇虚掩的门，等我推开却没来得及。"], next: "sy_12_bad" },
  sy_12_bad: { day: 13, time: "morning", bg: "library", char: null, speaker: "", text: "抽屉里那一叠稿纸，最末一行永远停在那里：「她回过头，看见了自己从未活过的人生。」",
    loopText: ["抽屉里那一叠稿纸，最末一行永远停在那里：「她回过头，看见了自己从未活过的人生。」",
    "最末一行停在那里。第二年再看，多懂了一层——「从未活过」说的不只是她，也是没敢递出冰袋的我们。",
    "那一行字我抄在了手心。下次再遇到一句「也许我该消失」，我知道该接住哪半句。"], next: "sy_ending_bad" },
  sy_ending_bad: {
    day: 13, time: "morning", bg: "ending_bad", char: null, speaker: "",
    text: "我再也没有见过她。听说她去了北方一座很远的城市，读了她不喜欢的法律系。",
    ending: { id: "shiyu_bad", type: "BAD ENDING", title: "未 活 过", text: "她回过头，看见的依然是没走过的人生。" }
  },

  /* ============ 夏织线 · 4 章 × 3 结局 ============ */
  route_xiazhi_1: { day: 5, time: "afternoon", bg: "field", char: "xiazhi", speaker: "", text: "周末的操场空旷。夏织一个人在跑道上，影子被太阳拉得很长。",
    loopText: ["周末的操场空旷。夏织一个人在跑道上，影子被太阳拉得很长。",
    "周末的操场空旷。夏织一个人在跑道上，影子被太阳拉得很长。",
    "又是周末的操场。她的影子旁边，这次多了我的——没等她开口，我已经举起了秒表。",
    "第三次站上这条跑道，影子并排成习惯。她递来发令的哨子：「今天你喊。」——我吹响的那声，是我们俩的起跑。"], next: "xz_2" },
  xz_2: { day: 5, time: "afternoon", bg: "field", char: "xiazhi", speaker: "夏织", text: "你来啦？正好，帮我计个时。",
    loopText: ["你来啦？正好，帮我计个时。",
"你来啦？正好，帮我计个时。——她的计时表还是那块。上一轮我只顾着看时间，这一轮我看见她按表时，指尖在发抖。",
"她把秒表塞给我时，笑还是那么亮。我知道她今天会跑出什么成绩——可这一轮，我想在她跑之前，先跟她说一句上一轮没说出口的话。"], next: "xz_3" },
  xz_3: { day: 5, time: "afternoon", bg: "field", speaker: "沈屿", text: "你一个人练？教练呢？", next: "xz_4" },
  xz_4: { day: 5, time: "afternoon", bg: "field", char: "xiazhi", speaker: "夏织", text: "教练上周辞退我了。他说我发挥不稳定，浪费特招名额。",
    loopText: ["教练上周辞退我了。他说我发挥不稳定，浪费特招名额。",
"教练上周辞退我了。——这句话她上一轮也说过，说完还笑。这一轮我数了数：她笑的时候，声音比上次低了半个调。",
"她说『浪费特招名额』时，把『浪费』两个字咬得很轻。我忽然明白，她怕的不是没名额，是怕自己真的只是『不稳定』。"], next: "xz_5", keyword: ["全国赛", "特招"] },
  xz_5: { day: 5, time: "afternoon", bg: "field", speaker: "沈屿", text: "那你还跑？", next: "xz_6" },
  xz_6: {
    day: 5, time: "afternoon", bg: "field", char: "xiazhi", speaker: "夏织",
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
        { id: "yes_run",  keywords: ["能", "跑", "练", "可以", "有"], add: { affection: { xiazhi: 2 } }, personality: { brave: 2, honest: 1 }, memory: "夏织·教练·陪练", memoryTitle: "回信·陪她跑" },
        { id: "rest_first", keywords: ["停", "歇", "伤", "治", "休息"], add: { affection: { xiazhi: 1 } }, personality: { kind: 2 }, memory: "夏织·教练·歇养", memoryTitle: "回信·先歇伤" },
      ]
    },
    // v0.5.0 朋友圈：夏织深夜动态
    moment: "m_d2_xiazhi"
  },
  xz_7: { day: 5, time: "afternoon", bg: "field", char: "xiazhi", speaker: "夏织", text: "我爸每月打钱过来，附带一句「最近怎么样」。我每次都回「挺好的」。", loopText: ["我爸每月打钱过来，附带一句「最近怎么样」。我每次都回「挺好的」。",
"我爸每月打钱，附一句「最近怎么样」。上一轮我觉得她答得敷衍；这一轮我听出——「挺好的」三个字，也是他打钱时想要的答案。",
"「最近怎么样」「挺好的」。这一轮我记住了：她每次打完这三个字，都会在跑道上多跑一圈，把回复时咽下的东西跑掉。"], next: "xz_8" },
  xz_8: { day: 5, time: "afternoon", bg: "field", speaker: "", text: "她说着笑起来，眼睛却红了一圈。", next: "xz_9" },
  xz_9: { day: 5, time: "afternoon", bg: "field", char: "xiazhi", speaker: "夏织", text: "全国赛下个月。我自己报名的，没教练。你愿意——陪我练到那天吗？", loopText: ["全国赛下个月。我自己报名的，没教练。你愿意——陪我练到那天吗？",
"全国赛下个月，她自己报的名。上一轮我当它是邀请；这一轮我才懂，那是她第一次向人伸手——伸手对她，比起跑还要难。",
"「你愿意陪我练到那天吗？」这一轮我听清了她为什么停顿：她怕的不是我不答应，是又要一个人跑完。"], next: "xz_minigame" },
  xz_minigame: {
    day: 5, time: "afternoon", bg: "field", char: "xiazhi", speaker: "夏织",
    text: "先陪我冲一组，看看我的节奏还在不在。",
    minigame: "running",
    scoreBonus: { affection: { xiazhi: 3 } },
    next: "xz_choice_1"
  },
  xz_choice_1: {
    day: 5, time: "afternoon", bg: "field",
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
  xz_11_good: { day: 6, time: "evening", bg: "summer", char: "xiazhi", speaker: "", text: "接下来整整一个月，我们清晨练起跑，黄昏练冲刺。她左脚的旧伤我每天帮她敷冰。成绩一点点回来。", next: "xz_12_good" },
  xz_12_good: { day: 35, time: "morning", bg: "summer", char: "xiazhi", speaker: "夏织", text: "一个月后，今天跑进了 11.8。沈屿——我没跑过这么快。",
    loopText: ["一个月后，今天跑进了 11.8。沈屿——我没跑过这么快。",
    "一个月后，跑进 11.8。我陪练的每一个清晨都在这个数字里——第二名之前，先赢回了旧伤。",
    "11.8。第二年她跑进了 11.5。数字会一直变——不变的是终点有人等。"], next: "xz_13_good" },
  xz_13_good: { day: 35, time: "morning", bg: "summer", char: "xiazhi", speaker: "夏织", text: "全国赛那天，你来当我的场外。我不需要教练，我需要你站在终点等我。",
    loopText: ["全国赛那天，你来当我的场外。我不需要教练，我需要你站在终点等我。",
    "全国赛那天，我来当场外。这一次我记得带冰袋——去年学会的，今年用上了。",
    "场外、终点、冰袋。她说不需要教练——因为教练教跑，我教的是回来。"], next: "xz_14_good" },
  xz_14_good: { day: 35, time: "morning", bg: "summer", char: "xiazhi", speaker: "", text: "发令枪响那一刻，她第一个冲出去。一百米，十一个对手，最后她以第二名撞线。", loopText: ["发令枪响那一刻，她第一个冲出去。一百米，十一个对手，最后她以第二名撞线。",
"发令枪响，她第一个冲出去。上一轮我替她数着名次；这一轮我只看见她撞线时回头找我的那一眼——先找的不是成绩。",
"一百米，十一个对手，第二名。这一轮我明白：她赢的不是名次，是终于有人站在终点等她。"], next: "xz_15_good", cg_unlock: "cg_xiazhi_good" },
  xz_15_good: { day: 35, time: "morning", bg: "ending_good", char: "xiazhi", speaker: "夏织", text: "——第二名。沈屿，第二名！", next: "xz_ending_good" },
  xz_ending_good: {
    day: 35, time: "morning", bg: "ending_good", char: "xiazhi", speaker: "",
    text: "她扑进我怀里，笑着哭。她说：「原来被人等在终点，是这种感觉。」",
    ending: { id: "xiazhi_good", type: "GOOD ENDING", title: "终 点 线", text: "她第一次相信，跑出去和有人等着，可以同时发生。" }
  },

  /* —— NORMAL —— */
  xz_10_normal: { day: 6, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……治脚？我懂。可我现在停不下来。",
    loopText: ["……治脚？我懂。可我现在停不下来。",
    "……治脚？停不下来这件事，去年我也是这么劝她的。今年我学乖了：先陪她停，再谈跑。",
    "停不下来。我把「治脚」两个字说得比上次重——重到她没法当耳旁风。有些关心要说三遍。"], next: "xz_11_normal" },
  xz_11_normal: { day: 6, time: "evening", bg: "summer", char: "xiazhi", speaker: "", text: "她答应我去看医生。医生说旧伤需要静养一个月，她也答应这段时间不再偷偷加练。",
    loopText: ["她答应我去看医生。医生说旧伤需要静养一个月，她也答应这段时间不再偷偷加练。",
    "静养一个月的承诺她守住了——我每天查岗。信任是查出来的？不，是她每天发来的康复打卡照。",
    "一个月静养她真的守住了。第二次守同一个承诺，比第一次容易——人就是这样学会对自己的脚好的。"], next: "xz_12_normal" },
  xz_12_normal: { day: 35, time: "morning", bg: "summer", char: "xiazhi", speaker: "夏织", text: "一个月后，我回到全国赛，跑了第三。第三名。", next: "xz_13_normal" },
  xz_13_normal: { day: 35, time: "morning", bg: "summer", char: "xiazhi", speaker: "夏织", text: "没拿到特招名额。但教练说我可以明年再战，留校复读一年。", next: "xz_14_normal" },
  xz_14_normal: { day: 35, time: "morning", bg: "summer", char: "xiazhi", speaker: "夏织", text: "……沈屿，第三名也挺好的，对吧？明年我再跑一次。这次有人等我。", next: "xz_ending_normal" },
  xz_ending_normal: {
    day: 35, time: "morning", bg: "ending_normal", char: "xiazhi", speaker: "",
    text: "她拿了第三名，留校复读一年。脚伤好了。她说，明年再跑，有人等就够。",
    ending: { id: "xiazhi_normal", type: "NORMAL ENDING", title: "第三名", text: "她拿了第三，留了下来。" }
  },

  /* —— BAD —— */
  xz_10_bad: { day: 6, time: "morning", bg: "field", char: "xiazhi", speaker: "夏织", text: "……对。我自己就够了。",
    loopText: ["……对。我自己就够了。",
    "……对。我自己就够了。这句话从她嘴里说出来，比从任何人嘴里都刺耳——它的下场我见过一次。",
    "我自己就够了。这次我没让她把话说完——我抢在她转身之前说了一句：够了不够，跑完才知道。"], next: "xz_11_bad" },
  xz_11_bad: { day: 28, time: "morning", bg: "rain", char: "xiazhi", speaker: "", text: "全国赛前一周，她在雨里独自加练。我没去。听说她摔了一跤，膝盖磕在跑道沿上。",
    loopText: ["全国赛前一周，她在雨里独自加练。我没去。听说她摔了一跤，膝盖磕在跑道沿上。",
    "雨里独自加练。我「没去」两个字说得轻松——今年我知道，那两个字值一次摔跤。",
    "雨里加练摔的那一跤，成了我每年都要复习的教训：她要的从来不是空间，是有人在场。"], next: "xz_12_bad" },
  xz_12_bad: { day: 28, time: "morning", bg: "winter", char: null, speaker: "", text: "韧带拉伤。医生说至少半年不能跑。全国赛的名额转给了别人。",
    loopText: ["韧带拉伤。医生说至少半年不能跑。全国赛的名额转给了别人。",
    "半年不能跑。名额转给了别人——这句去年听过的话，今年听来多了一层：转走的不是名额，是她给自己的机会。",
    "韧带、半年、名额——三个词我抄给了田径社的学妹们。教训不用亲历也能学，前提是有人肯把伤口摊开讲。"], next: "xz_13_bad" },
  xz_13_bad: { day: 28, time: "morning", bg: "winter", char: null, speaker: "", text: "她在医院给我发了一条消息：「你说得对，我自己就够了。可惜我自己不够。」",
    loopText: ["她在医院给我发了一条消息：「你说得对，我自己就够了。可惜我自己不够。」",
    "「我自己不够。」这句话我在医院走廊读了很多遍。第二年我学会的回答是：不够，就让我补上。",
    "可惜我自己不够——这句话我再也没有让它成为最后一句话。后来的每一年，我都先回一条：我在。"], next: "xz_ending_bad" },
  xz_ending_bad: {
    day: 28, time: "morning", bg: "ending_bad", char: null, speaker: "",
    text: "她休学了。听说是回了她爸那边。再后来，田径社的招新传单上，王牌那一栏空着。",
    ending: { id: "xiazhi_bad", type: "BAD ENDING", title: "一 个 人", text: "她终于一个人了。可一个人，从来不是她想要的。" }
  },

  /* ============ 苏念线 · 4 章 × 3 结局 ============ */
  route_sunian_1: { day: 5, time: "afternoon", bg: "art_room", char: "sunian", speaker: "", text: "周末的美术室，窗帘半拉着。苏念坐在地上，周围是揉成团的草稿。",
    loopText: ["周末的美术室，窗帘半拉着。苏念坐在地上，周围是揉成团的草稿。",
    "周末的美术室，窗帘半拉着。苏念坐在地上，周围是揉成团的草稿。",
    "又是半拉的窗帘和满地纸团。这次我弯腰先捡纸团——不扔，一张张抚平，摞在她手边。她瞥了一眼，没说话，但纸团变小了。",
    "第三次进这间美术室，我直接去拉窗帘。光落进来的一瞬她皱眉，又松开：「……也行。」——有些门，第三次才敢真的推开。"], next: "sn_2" },
  sn_2: { day: 5, time: "afternoon", bg: "art_room", char: "sunian", speaker: "苏念", text: "你又来了。",
    loopText: ["你又来了。",
"你又来了。——她每次都是这三个字，不多不少。上一轮我以为她在赶我；这一轮我听出来了：她说『又』的时候，眼睛会往画布上躲。",
"『你又来了。』三个字，她说得比上一轮轻。我坐下来，没有解释为什么来——她也不需要解释。她需要有人坐在她旁边，看着她把紫调出来。"], next: "sn_3" },
  sn_3: { day: 5, time: "afternoon", bg: "art_room", speaker: "沈屿", text: "你说画不完。我来看看，是不是真的画不完。", next: "sn_4" },
  sn_4: { day: 5, time: "afternoon", bg: "art_room", char: "sunian", speaker: "苏念", text: "省展邀请函上个月寄来。让我交一幅新作。我答应了，然后撕了四十七张草稿。每一张都差一点。差那一点，就不是我。",
    loopText: ["省展邀请函上个月寄来。让我交一幅新作。我答应了，然后撕了四十七张草稿。每一张都差一点。差那一点，就不是我。",
"省展邀请函，四十七张草稿。上一轮我记住的是数字；这一轮我记住的是她说『差那一点，就不是我』时，画布上那一片被压平的紫。",
"她说她撕了四十七张草稿。我知道还有第四十八张，正藏在画板后面——上一轮她没给我看。这一轮，我想先给她看一句她可以落笔的开场。"], next: "sn_5" },
  sn_5: { day: 5, time: "afternoon", bg: "art_room", speaker: "沈屿", text: "什么是「你」？", next: "sn_5b" },
  // v0.5.0 涂鸦：让苏念画一笔自己
  sn_5b: {
    day: 5, time: "afternoon", bg: "art_room", char: "sunian", speaker: "苏念",
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
  sn_5b_release: { day: 5, time: "afternoon", bg: "art_room", char: "sunian", speaker: "苏念", text: "……这么用力的一笔。原来「我」可以是这种颜色。", next: "sn_6", memory: { id: "苏念·一笔·用力", title: "她是谁", text: "你画的那一笔很用力。她第一次看见自己可以是这种颜色。" } },
  sn_5b_calm: { day: 5, time: "afternoon", bg: "art_room", char: "sunian", speaker: "苏念", text: "……这么安静的一笔。原来「我」也可以是这种姿势。", next: "sn_6", memory: { id: "苏念·一笔·安静", title: "她是谁", text: "你画的那一笔很安静。她第一次看见自己也可以是这种姿势。" } },
  sn_6: { day: 5, time: "afternoon", bg: "art_room", char: "sunian", speaker: "苏念", text: "这就是问题。紫色是我哥哥最喜欢的颜色。我画它，是想留住他。画了三年，我把自己也画了进去。", loopText: ["这就是问题。紫色是我哥哥最喜欢的颜色。我画它，是想留住他。画了三年，我把自己也画了进去。",
"紫色是我哥最喜欢的颜色。上一轮我听见的是「留住他」；这一轮我听见后半句——「把自己也画了进去」，原来她也被留在了里面。",
"画了三年，她把自己也画了进去。这一轮我看清了：她不是画不出新作，是一松手，怕连哥哥的颜色也一起弄丢。"], next: "sn_7" },
  sn_7: { day: 5, time: "afternoon", bg: "art_room", char: "sunian", speaker: "苏念", text: "你看这幅——", next: "sn_8" },
  sn_8: { day: 5, time: "afternoon", bg: "art_room", speaker: "", text: "她把那张未完成的紫推到我面前。我第一次看清：那片紫里，藏着一只翅膀，半张脸，一只手。", next: "sn_9" },
  sn_9: { day: 5, time: "afternoon", bg: "art_room", speaker: "沈屿", text: "这不是一片紫。这是一个人想从紫里挣出来，但被你按住了。", loopText: ["这不是一片紫。这是一个人想从紫里挣出来，但被你按住了。",
"「一个人想从紫里挣出来，却被她自己按住了。」上一轮我说出口；这一轮我迟疑了——那句话，说的是画里的她，还是画外的她？",
"这一轮我盯着那片紫看了很久：挣出来的人，差一点就是她自己。我说的每一句，其实也在说给她听。"], next: "sn_minigame", keyword: "挣" },
  sn_minigame: {
    day: 5, time: "afternoon", bg: "art_room", char: "sunian", speaker: "苏念",
    text: "……你既然看见了，那你帮我调一次色。紫色不止一种，找到对的那一种，她才肯出来。",
    minigame: "painting",
    scoreBonus: { affection: { sunian: 3 } },
    next: "sn_10"
  },
  sn_10: { day: 5, time: "afternoon", bg: "art_room", char: "sunian", speaker: "苏念", text: "……你看见了？", next: "sn_choice_1" },
  sn_choice_1: {
    day: 5, time: "afternoon", bg: "art_room",
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
  sn_11_good: { day: 6, time: "evening", bg: "autumn", char: "sunian", speaker: "", text: "接下来一个月，她每天画到深夜。我不打扰她，只在她画画时坐在角落看书。", next: "sn_12_good" },
  sn_12_good: { day: 35, time: "morning", bg: "autumn", char: "sunian", speaker: "苏念", text: "一个月后，省展要交的那幅新作画完了。",
    loopText: ["一个月后，省展要交的那幅新作画完了。",
    "一个月后，新作画完了。画室没关过门的那个月里，我只做了一件事：坐在角落，不催。",
    "新作画完了。第二年她开始教别人怎么「不催自己」——被按住过的人，最会松手。"], next: "sn_13_good" },
  sn_13_good: { day: 35, time: "morning", bg: "autumn", char: "sunian", speaker: "", text: "画布上，一个人正从一片紫里挣出来，半身，眼神是亮的。她给它取名《挣》。这是省展的新作，和学园祭已经完成的那幅不是同一张。", loopText: ["画布上，一个人正从一片紫里挣出来，半身，眼神是亮的。她给它取名《挣》。这是省展的新作，和学园祭已经完成的那幅不是同一张。",
"画布上的人挣出来了，眼神是亮的。上一轮我只看结果；这一轮我看见画名旁落款的位置空着——她还在犹豫要不要署名。",
"《挣》——同一个题目，这一轮我看见的却是一个人从紫里稳稳站起，脚踩着边。她终于肯把自己签在旁边了。"], next: "sn_14_good", cg_unlock: "cg_sunian_good" },
  sn_14_good: { day: 35, time: "morning", bg: "ending_good", char: "sunian", speaker: "苏念", text: "省展那天，它被放在入口第一幅。沈屿——是你让它出来的。",
    loopText: ["省展那天，它被放在入口第一幅。沈屿——是你让它出来的。",
    "省展入口第一幅。她在画旁站了很久，这次没有背对我——被看见之后，她也学会了看。",
    "入口第一幅。第二年的省展她坐进了评审席——挣出来的人，回身拉了别人一把。"], next: "sn_ending_good" },
  sn_ending_good: {
    day: 35, time: "morning", bg: "ending_good", char: "sunian", speaker: "",
    text: "她在画旁站了很久，第一次没有撕掉自己的作品。她说：「原来被看见，是这种感觉。」",
    ending: { id: "sunian_good", type: "GOOD ENDING", title: "挣", text: "她终于松开了按住自己的那只手。" }
  },

  /* —— NORMAL —— */
  sn_10_normal: { day: 6, time: "evening", bg: "art_room", char: "sunian", speaker: "苏念", text: "……网展？小范围？",
    loopText: ["……网展？小范围？",
    "……网展？她上次问这句话的时候，手指还捏着退展函。这次她问的时候，手里拿的是手机——勇气和工具一起往前走。",
    "小范围。她已经能自己说出这三个字了——我只需要点头。"], next: "sn_11_normal" },
  sn_11_normal: { day: 7, time: "evening", bg: "home_room", char: "sunian", speaker: "", text: "她没去省展。退回了邀请函。她在网上开了个小站，把卡了三年的草稿一张张放上去。",
    loopText: ["她没去省展。退回了邀请函。她在网上开了个小站，把卡了三年的草稿一张张放上去。",
    "退展函寄出的第二天，小站就开了。卡了三年的草稿放上去那天，她给每张都写了日期——像给伤口记病历，也像记功劳簿。",
    "小站经营到第二年，草稿区终于空了——都挪进了成品区。卡住过的人，最懂怎么松开自己。"], next: "sn_12_normal" },
  sn_12_normal: { day: 8, time: "morning", bg: "home_room", char: "sunian", speaker: "苏念", text: "今天有第一个人留言：「我也卡在草稿里三年。」",
    loopText: ["今天有第一个人留言：「我也卡在草稿里三年。」",
    "「我也卡在草稿里三年。」——这条留言下面，今年排到了第七十条。她一个人卡过的三年，现在由很多陌生人分摊。",
    "留言区每年都会出现同款第一句：我也卡了三年。而她的回帖已经从「我也是」变成了「我教你怎么贴出来」。"], next: "sn_13_normal" },
  sn_13_normal: { day: 8, time: "morning", bg: "home_room", char: "sunian", speaker: "苏念", text: "……沈屿，原来不是我一个人。", next: "sn_ending_normal" },
  sn_ending_normal: {
    day: 8, time: "morning", bg: "ending_normal", char: "sunian", speaker: "",
    text: "她在自己的网展开了个展。没人说她是天才，但留言区每天都有人留言说：我也是这样。",
    ending: { id: "sunian_normal", type: "NORMAL ENDING", title: "网 展", text: "她在自己的网展开了个展。" }
  },

  /* —— BAD —— */
  sn_10_bad: { day: 6, time: "evening", bg: "art_room", char: "sunian", speaker: "苏念", text: "……不该出来。对。也许她本来就不该出来。",
    loopText: ["……不该出来。对。也许她本来就不该出来。",
    "……不该出来。这句话的重量我第二次掂——第一次它压垮了一个人。话不是不能说，是要想清楚递出去的手稳不稳。",
    "也许她本来就不该出来——这句话我永远不会再说了。有些「也许」，说出口就是判决。"], next: "sn_11_bad" },
  sn_11_bad: { day: 7, time: "morning", bg: "winter", char: null, speaker: "", text: "她把那张画布翻了过来，背面朝外。从此再没打开过那间美术室的门。",
    loopText: ["她把那张画布翻了过来，背面朝外。从此再没打开过那间美术室的门。",
    "画布背面朝外。第二年路过美术室，门缝里透出的还是那面白的背板——翻过去容易，翻回来需要一只手。当时我的手在口袋里。",
    "美术室的门再没开过。可我每年都在门口放一支新画笔——不是打扰，是留一句：门后的你，随时可以出来。"], next: "sn_12_bad" },
  sn_12_bad: { day: 7, time: "morning", bg: "winter", char: null, speaker: "", text: "省展那天，她的位置是空的。主办方说，她打电话退出了。",
    loopText: ["省展那天，她的位置是空的。主办方说，她打电话退出了。",
    "省展那天她的位置是空的。空位这件事，第二次见到时我提前一天就知道——还是没能拦。知道和做到之间，隔着一通没打出去的电话。",
    "那个空位后来被主办方留了一年。他们也在等——等一个打电话说「我想再试一次」的人。"], next: "sn_13_bad" },
  sn_13_bad: { day: 7, time: "morning", bg: "ending_bad", char: null, speaker: "", text: "她休学了。美术室的钥匙交给了门卫。临走前她发了一条朋友圈：「天才卡在草稿里，原来是真的。」", next: "sn_ending_bad" },
  sn_ending_bad: {
    day: 7, time: "morning", bg: "ending_bad", char: null, speaker: "",
    text: "再没有人见过那张紫。它和它的主人，一起被按进了海里。",
    ending: { id: "sunian_bad", type: "BAD ENDING", title: "按 住", text: "她松不开自己的手，于是连自己也一起按了下去。" }
  },

  /* ============ 真结局入口（需合成"樱花信"才能打破循环） ============ */
  true_end_entry: { day: 11, time: "night",
    // 仅在三女主 GOOD 全通后触发
    bg: "cherry_full", char: null, speaker: "",
    text: "（三段回望结束。这一次，日子终于走到了它一直绕开的那一天——学姐留在窗台上的最后一封信，今天还没拆。今晚就是樱花祭，你要替她回信。）",
    loopText: ["（三段回望结束。这一次，日子终于走到了它一直绕开的那一天——学姐留在窗台上的最后一封信，今天还没拆。今晚就是樱花祭，你要替她回信。）", "（三段回望结束。这一轮，日子没有再绕开——它一直走到了这里。学姐留在窗台上的最后一封信，我拆过三次，每次拆开都是同一句话。今晚就是樱花祭。这一次，换我来写结尾。）"],
    keyword: ["学姐", "樱花祭", "回信"],
    next: "true_2"
  },
  true_2: { day: 11, time: "night", bg: "home_room", char: null, speaker: "", text: "我打开最后一封匿名信。这一次，署名了。",
    loopText: ["我打开最后一封匿名信。这一次，署名了。", "我打开最后一封匿名信。这一次，署名了。上一次拆信时我的手在抖——这一次没有。因为我知道信背后站着谁，也知道她等这一笔等了多久的三个春天。"], next: "true_3", keyword: "学姐" },
  true_3: { day: 11, time: "night", bg: "home_room", char: "senior", speaker: "学姐", text: "——三年前，我也是转学生。我三条路都走了一半，最后休了学。我以为我会回来，结果没回。——你早就该问：休了学的人，为什么还在这里。因为我回来的从来不是人。这所学校的时间在我停下的那一年就不走了，你们看见的我，是信替我留下的影子。信在，影子就在；等有人把信写完，我才能真的走。",
    loopText: ["——三年前，我也是转学生。我三条路都走了一半，最后休了学。我以为我会回来，结果没回。——你早就该问：休了学的人，为什么还在这里。因为我回来的从来不是人。这所学校的时间在我停下的那一年就不走了，你们看见的我，是信替我留下的影子。信在，影子就在；等有人把信写完，我才能真的走。", "——三年前的真相我已在旧校舍听过一遍。可听懂它，是在走完三条路之后。她说她是影子。我说：影子能有温度，就不是影子。——她沉默了很久。这一次，轮到我等她。"], next: "true_4" },
  true_4: { day: 11, time: "night", bg: "home_room", char: "senior", speaker: "学姐", text: "我留信给你，是想看看，有没有人能走得比我远。你做到了。三个人，你都让他们敢了。",
    loopText: ["我留信给你，是想看看，有没有人能走得比我远。你做到了。三个人，你都让他们敢了。", "「你做到了。」这句话她在信里写过、在走廊里说过、在占卜牌背后藏过。我全都记得。我记得所有版本的她说——所以我知道，这一次她说的是真的。"], next: "true_5" },
  true_5: { day: 11, time: "night", bg: "home_room", char: "senior", speaker: "学姐", text: "今晚是樱花祭。请你替我回最后一封信。也写给自己——你想成为什么样的人。去合成台看看吧——把「祭信」和「未寄信」放在一起，合成那封只有你合得成的信。把它带来，我就收下这三年。",
    loopText: ["今晚是樱花祭。请你替我回最后一封信。也写给自己——你想成为什么样的人。去合成台看看吧——把「祭信」和「未寄信」放在一起，合成那封只有你合得成的信。把它带来，我就收下这三年。", "今晚是樱花祭。合成台我已备好，最后一封信就在手里。她教我的每一步，都是为了让我能走到这一步而不必再问怎么办。写吧——我为这一晚，走了不止三条路。"], next: "true_choice" },
  true_choice: { day: 11, time: "night",
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
  true_6: { day: 11, time: "night", bg: "festival", char: "shen", speaker: "", text: "樱花祭之夜。我在樱花树下，写下回信。然后，我写下自己人生的第一行字。",
    loopText: ["樱花祭之夜。我在樱花树下，写下回信。然后，我写下自己人生的第一行字。", "樱花祭之夜。樱花树下，我写下回信。笔尖落纸的瞬间我想起——三个春天的每一封信，原来都是这一封的草稿。然后，我写下自己人生的第一行字。"], next: "true_7", cg_unlock: "cg_true", keyword: "回信" },
  true_7: { day: 11, time: "night", bg: "festival", chars: [{id:"shiyu", pos:"left"}, {id:"xiazhi", pos:"center"}, {id:"sunian", pos:"right"}], speaker: "林诗雨", text: "沈屿——你的信，我们替你转交了。",
    loopText: ["沈屿——你的信，我们替你转交了。", "沈屿——你的信，我们替你转交了。诗雨说这句话时，我看见她的稿纸边角写着新的章节名。三个春天里的三次目送，这一次终于有了回音。"], next: "true_8" },
  true_8: { day: 11, time: "night", bg: "festival", char: "xiazhi", speaker: "夏织", text: "学姐说她收到了。她说她终于能往前走了。",
    loopText: ["学姐说她收到了。她说她终于能往前走了。", "学姐说她收到了。她说她终于能往前走了。夏织说这话时站在终点线旁——她比谁都懂「往前走」三个字要跑多远。"], next: "true_9" },
  true_9: { day: 11, time: "night", bg: "festival", char: "sunian", speaker: "苏念", text: "……你也终于写下自己了。",
    loopText: ["……你也终于写下自己了。", "……你也终于写下自己了。苏念把这句说完，转身回了画室。门开着——比上一次开得更大。"], next: "true_ending" },
  true_ending: { day: 11, time: "night",
    bg: "ending_true", char: null, speaker: "",
    text: "那年樱花祭之夜，我替学姐回了一封信，也写下自己人生的第一行字。三条路从来不是三条。它们是同一条——只要你敢走完它。",
    loopText: ["那年樱花祭之夜，我替学姐回了一封信，也写下自己人生的第一行字。三条路从来不是三条。它们是同一条——只要你敢走完它。", "那年樱花祭之夜，我替学姐回了一封信，也写下自己人生的第一行字。三条路从来不是三条。它们是同一条——只要你敢走完它。我走完了。不是这一次走完的，是每一个春天，各走了一段。"],
    ending: { id: "true_unbroken", type: "LOOP ENDING", title: "未 破 环", text: "你替她回了一封信，也写下自己；但真正的樱花信还没有合成。" }
  },

  /* ============ 打破循环路径（合成"樱花信"后解锁） ============ */
  true_break_loop: { day: 11, time: "night",
    bg: "cherry_full", char: "senior", speaker: "学姐",
    text: "——你做到了。你把祭信与未寄信合在了一起。这封信，我等了三年。",
    loopText: ["——你做到了。你把祭信与未寄信合在了一起。这封信，我等了三年。", "——你做到了。你把祭信与未寄信合在了一起。这封信，我等了三年。她的声音很轻，轻得像终于放下。我记得她说「影子」时的语气——那不是告别，是托付。"],
    next: "true_break_2",
    memory: { id: "打破循环", title: "樱花信", text: "把祭信与未寄信合在一起，就是打破循环的钥匙。" }
  },
  true_break_2: { day: 11, time: "night", bg: "cherry_full", char: "senior", speaker: "学姐", text: "三年前我也想合成这封信，可我那时候还不知道「未寄信」也是写给自己。你比我有勇气。",
    loopText: ["三年前我也想合成这封信，可我那时候还不知道「未寄信」也是写给自己。你比我有勇气。", "三年前她也想合成这封信，可她那时候还不知道「未寄信」也是写给自己。这句话她只在旧校舍说过一次。我替她记住了——现在，由我说给她听：你比当年的自己，有勇气。"], next: "true_break_3" },
  true_break_3: { day: 11, time: "night", bg: "cherry_full", char: "senior", speaker: "学姐", text: "去吧。今晚樱花祭，你替我回信，也替自己写下第一行。这一次——不会再回来了。",
    loopText: ["去吧。今晚樱花祭，你替我回信，也替自己写下第一行。这一次——不会再回来了。", "去吧。今晚樱花祭，你替我回信，也替自己写下第一行。这一次——不会再回来了。「不会再回来」这句话，我听过很多次她说。只有这一次，她笑得像真的。"], next: "true_break_4" },
  // 真实书写信件：玩家自己打字写信
  true_break_4: { day: 11, time: "night",
    bg: "festival", char: "shen", speaker: "",
    text: "樱花树下，我把纸铺开。这一次，不是抄，不是选。是我自己写。",
    letter: {
      id: "true_letter_free",
      type: "free",
      prompt: "✦ 替学姐回信，也写给自己",
      hint: "写下你想对三年前的学姐，或者三年后的自己说的话…",
      matchings: [
        { id: "勇敢", keywords: ["敢", "勇气", "走", "回头", "写下"], next: "true_break_5a", memory: "写信-勇敢", memoryTitle: "写给学姐·勇敢" },
        { id: "放手", keywords: ["放", "松", "不用", "算了", "没关系"], next: "true_break_5b", memory: "写信-放手", memoryTitle: "写给学姐·放手" },
        { id: "想念", keywords: ["想", "念", "记得", "樱花", "春"], next: "true_break_5c", memory: "写信-想念", memoryTitle: "写给学姐·想念" },
      ],
      defaultReply: { next: "true_break_5d", memory: "写信-默认", memoryTitle: "写给学姐·留白" }
    },
    next: "true_break_5d"
  },
  true_break_5a: { day: 11, time: "night", bg: "festival", char: "senior", speaker: "学姐", text: "「敢」——你写的第一个字是敢。我也想敢一次。今天起，我替自己敢。", next: "true_break_6" },
  true_break_5b: { day: 11, time: "night", bg: "festival", char: "senior", speaker: "学姐", text: "「放」——你说得对。我也可以放下。放下这三年，放下那个没敢回信的自己。", next: "true_break_6" },
  true_break_5c: { day: 11, time: "night", bg: "festival", char: "senior", speaker: "学姐", text: "「想念」——你说你想念。我也想念。可想念不该是停下的理由。", next: "true_break_6" },
  true_break_5d: { day: 11, time: "night", bg: "festival", char: "senior", speaker: "学姐", text: "——你的信，我读完了。每个字都不一样，可每个字都通向同一个地方。",
    loopText: ["——你的信，我读完了。每个字都不一样，可每个字都通向同一个地方。", "——你的信，我读完了。每个字都不一样，可每个字都通向同一个地方。这一次我写信时没有打草稿。因为所有草稿，都写在这三年里了。"], next: "true_break_6" },
  true_break_6: { day: 11, time: "night", bg: "festival", chars: [{id:"shiyu", pos:"left"}, {id:"xiazhi", pos:"center"}, {id:"sunian", pos:"right"}], speaker: "林诗雨", text: "沈屿——你的信，我们替你转交了。", next: "true_break_7", cg_unlock: "cg_true" },
  true_break_7: { day: 11, time: "night", bg: "festival", char: "xiazhi", speaker: "夏织", text: "学姐说她收到了。她说她终于能往前走了。", next: "true_break_8" },
  true_break_8: { day: 11, time: "night", bg: "festival", char: "sunian", speaker: "苏念", text: "……你也终于写下自己了。这一次，是真的写下了。", next: "true_break_ending" },
  true_break_ending: { day: 11, time: "night",
    bg: "ending_true", char: null, speaker: "",
    text: "那年樱花祭之夜，我替学姐回了一封信，也写下自己人生的第一行字。三条路从来不是三条。它们是同一条——只要你敢走完它。这一次，樱花不会再倒着飘了。",
    loopText: ["那年樱花祭之夜，我替学姐回了一封信，也写下自己人生的第一行字。三条路从来不是三条。它们是同一条——只要你敢走完它。这一次，樱花不会再倒着飘了。", "那年樱花祭之夜，我替学姐回了一封信，也写下自己人生的第一行字。三条路从来不是三条。它们是同一条——只要你敢走完它。走完的人都知道：所谓打破循环，不是让时间停下——是让每一个春天，都和上一次不一样。这一次，樱花不会再倒着飘了。"],
    ending: { id: "true_end", type: "TRUE ENDING", title: "樱 花 信 · 破 环", text: "你合成了樱花信，打破了时间的循环。" }
  },

  /* ============ 学姐线（v3.3.0 形态 A）：留在循环里，但被看见 ============ */
  route_senior_1: {
    day: 5, time: "afternoon", bg: "hallway", char: "senior", speaker: "学姐",
    text: "旧校舍的走廊比记忆里更安静。学姐站在尽头，像一直站在那里，从来没离开过。她看见我，没有惊讶，只说了一句：「这次，你没有去她们那边。」",
    loopText: ["旧校舍的走廊比记忆里更安静。学姐站在尽头，像一直站在那里，从来没离开过。她看见我，没有惊讶，只说了一句：「这次，你没有去她们那边。」",
    "旧校舍的走廊比记忆里更安静。学姐站在尽头，像一直站在那里，从来没离开过。她看见我，没有惊讶，只说了一句：「这次，你没有去",
    "旧校舍的走廊尽头，她还在。这一次我先开了口：「你等了多久？」她笑了：「等一个肯走完三条路的人。」——我走完了，所以我来了。",
    "第三次来到走廊尽头。她不再站在暗处，而是迎着光。她说：「你每回来一次，我就更像一个人一点。」——我知道结束的方向了。"],
    keyword: "学姐",
    next: "senior_2"
  },
  senior_2: {
    day: 5, time: "afternoon", bg: "hallway", char: "senior", speaker: "沈屿",
    text: "「我想看看，你一直站着的这个地方。」",
    loopText: ["「我想看看，你一直站着的这个地方。」",
"「我想看看，你一直站着的这个地方。」——上一轮我也这么说过；这一轮我留意到，她听完，指尖在栏杆上敲了一下，像在数我到底站了多久。",
"「你一直站着的这个地方。」这一轮我说出口时忽然明白：我不是来看她站着，是来确认——一个人可以在这里站多久，而不被忘记。"],
    next: "senior_3"
  },
  senior_3: {
    day: 5, time: "afternoon", bg: "hallway", char: "senior", speaker: "学姐",
    text: "她侧过身，让出半条走廊。「三年前，我停在这里。你是来替我走完，还是来陪我停一会儿？」",
    loopText: ["她侧过身，让出半条走廊。「三年前，我停在这里。你是来替我走完，还是来陪我停一会儿？」",
"她侧身让出半条走廊。上一轮我只听见「替我走完」；这一轮我听出她真正在问的是后半句——「陪我停一会儿」里，藏着她三年前的孤单。",
"「三年前，我停在这里。」这一轮我数了数：从走廊尽头到我站的地方，只有七步。她却走了三年没走完——不是走不动，是没人陪她停过。"],
    choice: {
      prompt: "你为什么来旧校舍？",
      options: [
        { text: "我替你走完。",     next: "senior_4a" },
        { text: "我陪你停一会儿。", next: "senior_4b" },
        { text: "我来看看你。",     next: "senior_4c" },
      ]
    }
  },
  senior_4a: {
    day: 5, time: "evening", bg: "hallway", char: "senior", speaker: "学姐",
    text: "「替不了。」她摇头，声音很轻，「三年前我也以为，只要有人替我走完，我就能走。后来才明白，路要自己走，信要自己回。」",
    loopText: ["「替不了。」她摇头，声音很轻，「三年前我也以为，只要有人替我走完，我就能走。后来才明白，路要自己走，信要自己回。」",
"「替不了。」上一轮我当它是拒绝；这一轮我懂了——她不是不领情，是太清楚：被人替着走的每一步，日后都要还回去。",
"「路要自己走，信要自己回。」这一轮我记住她说完低头看鞋尖的样子：她不是不肯让人帮，是怕帮完，只剩她一个人站在原地。"],
    next: "senior_5"
  },
  senior_4b: {
    day: 5, time: "evening", bg: "hallway", char: "senior", speaker: "学姐",
    text: "「……那就坐一会儿。」她在窗台上坐下，拍了拍旁边的位置，「这里很久没有人坐过了。」",
    loopText: ["「……那就坐一会儿。」她在窗台上坐下，拍了拍旁边的位置，「这里很久没有人坐过了。」",
"「那就坐一会儿。」上一轮我坐下了；这一轮我听见后半句——「很久没有人坐过」不是陈述，是她轻轻递出来的一句邀请。",
"她拍窗台的动作，这一轮我看得很清楚：拍了两下，又收回一点，像怕位置不够，又怕我嫌窄。她把「想留人」写成了「这里很久没人坐过」。"],
    next: "senior_5"
  },
  senior_4c: {
    day: 5, time: "evening", bg: "hallway", char: "senior", speaker: "学姐",
    text: "「看我？」她笑了一下，「一个停在半路的人，有什么好看的。」我说：「半路也是路。」她没再说话。",
    loopText: ["「看我？」她笑了一下，「一个停在半路的人，有什么好看的。」我说：「半路也是路。」她没再说话。",
"「半路也是路。」上一轮我说得理直气壮；这一轮我说完才明白，她不需要被说服，只需要有人肯把「半路」也当成一条正经的路。",
"她笑了一下，这一轮我听出那笑里的自嘲比上一轮薄了半分——像是试着相信「半路也是路」，又不敢全信。"],
    next: "senior_5"
  },
  senior_5: {
    day: 5, time: "evening", bg: "hallway", char: "senior", speaker: "学姐",
    text: "「三年前，我也收到过一封写给自己的信。我没回。不是不会写，是不敢写。你有没有过这种时候——明明知道该回，却把信压在抽屉最底下？」",
    loopText: ["「三年前，我也收到过一封写给自己的信。我没回。不是不会写，是不敢写。你有没有过这种时候——明明知道该回，却把信压在抽屉最底下？」",
"「不是不会写，是不敢写。」上一轮我把它当成她的往事；这一轮我听见她其实在问我——你有没有过，把该回的话压在抽屉最底下。",
"「压在抽屉最底下。」这一轮我留意到她说完这句，看了一眼自己的口袋：那封信大概不在抽屉里，她一直带在身上，只是从没打开。"],
    memory: { id: "学姐·抽屉里的信", title: "抽屉最底下", text: "三年前她收到一封写给自己的信，没敢回，压在抽屉最底下。" },
    next: "senior_6"
  },
  senior_6: {
    day: 6, time: "morning", bg: "library", char: "senior", speaker: "学姐",
    text: "「今天陪我做三件没做完的事。」她把一本借了三年的书放在桌上，「第一件，把它还回去。」",
    loopText: ["「今天陪我做三件没做完的事。」她把一本借了三年的书放在桌上，「第一件，把它还回去。」",
"「三件没做完的事。」上一轮我只是跟着做；这一轮我问自己：她为什么挑这三件？——因为它们都停在「还差最后一步」。",
"借了三年的书放在桌上，这一轮我看见书脊上有一道磨白的印子：她不是忘还，是每次走到门口，都没舍得把这一步走完。"],
    next: "senior_7"
  },
  senior_7: {
    day: 7, time: "morning", bg: "rooftop", char: "senior", speaker: "学姐",
    text: "「第二件，把这圈跑完。」她站在天台边，风把校服吹得很响，「三年前我跑到这里，就停了。」",
    loopText: ["「第二件，把这圈跑完。」她站在天台边，风把校服吹得很响，「三年前我跑到这里，就停了。」",
"「三年前我跑到这里，就停了。」上一轮我当它是讲述；这一轮我听见后半句没说出口的——「这次，有人陪我跑完吗」。",
"风把校服吹得很响，这一轮我听出她在借风声盖住一句话：她说「就停了」时，脚尖还朝着跑道的方向，像随时准备再迈一步。"],
    next: "senior_8"
  },
  senior_8: {
    day: 8, time: "afternoon", bg: "art_room", char: "senior", speaker: "学姐",
    text: "「第三件，把这张画补完。」画架上只有一片没有边界的蓝，「可我忘了，当年想画什么。」",
    loopText: ["「第三件，把这张画补完。」画架上只有一片没有边界的蓝，「可我忘了，当年想画什么。」",
"「可我忘了，当年想画什么。」上一轮我急着替她想；这一轮我懂了——她不是忘，是不敢承认当年想画的，就是她自己。",
"那片没有边界的蓝，这一轮我看得更久：它是她三年前停笔的地方，也是她没敢给自己收边的证据。她要的不是补完，是有人肯站在画前不催。"],
    choice: {
      prompt: "在这张画上补什么？",
      options: [
        { text: "画一扇开着的窗。",       next: "senior_9a" },
        { text: "画一条没有终点的路。",   next: "senior_9b" },
        { text: "什么都不画，留白。",     next: "senior_9c" },
      ]
    }
  },
  senior_9a: {
    day: 8, time: "afternoon", bg: "art_room", char: "senior", speaker: "学姐",
    text: "她看了很久，说：「窗。原来我当年想画的是窗，不是门。门要有人开，窗只要自己推开。」",
    next: "senior_10"
  },
  senior_9b: {
    day: 8, time: "afternoon", bg: "art_room", char: "senior", speaker: "学姐",
    text: "「路。」她把笔放下，「可路不一定非要有人等在终点。走下去本身，也算数。」",
    next: "senior_10"
  },
  senior_9c: {
    day: 8, time: "afternoon", bg: "art_room", char: "senior", speaker: "学姐",
    text: "「留白。」她笑了，「也好。没画完的地方，不一定都要补上。」",
    next: "senior_10"
  },
  senior_10: {
    day: 9, time: "night", bg: "hallway", char: "senior", speaker: "学姐",
    text: "「三天。你把我想做又没做的事，陪我做完了。」她看着窗外，「可你还是没问我，为什么我走不了。」我说：「你不想说，我就不问。」她低声说：「……你这个人，真让人没办法。」",
    loopText: ["「三天。你把我想做又没做的事，陪我做完了。」她看着窗外，「可你还是没问我，为什么我走不了。」我说：「你不想说，我就不问。」她低声说：「……你这个人，真让人没办法。」",
"「你还是没问我，为什么我走不了。」上一轮我以为她在抱怨；这一轮我听见她其实是在试探——不追问，是不是也算一种认真的在意。",
"「真让人没办法。」这一轮我读懂了这句话的重量：她习惯被追问、被要求，唯独没被人这样安静地放过一次。"],
    memory: { id: "学姐·没问出口", title: "没问出口", text: "她没有说她为什么走不了；我也没有问。有些答案，不该由追问换来。" },
    next: "senior_11"
  },
  senior_11: {
    day: 10, time: "night", bg: "hallway", char: "senior", speaker: "学姐",
    text: "樱花祭前夜。她把一叠信纸放在窗台上。「明天就是樱花祭。三年前，我就是在这一夜停下的。你可以现在回头，去合成那封信。那才是能让我走的东西。」",
    loopText: ["樱花祭前夜。她把一叠信纸放在窗台上。「明天就是樱花祭。三年前，我就是在这一夜停下的。你可以现在回头，去合成那封信。那才是能让我走的东西。」",
"「那才是能让我走的东西。」上一轮我只听见指引；这一轮我听见她把它说成了邀请——而且是那种「你可以走」的、放我自由的邀请。",
"樱花祭前夜，信纸放在窗台。这一轮我注意到她把信纸摆得很整齐，像是早就准备好：无论我选哪一条，她都能立刻陪我接着往下写。"],
    choice: {
      prompt: "最后一夜，你怎么选？",
      options: [
        { text: "留下，先给你写一封。",         next: "senior_12" },
        { text: "去合成那封信。",               next: "senior_11b" },
        { text: "什么都不做，陪你坐到天亮。",   next: "senior_11c" },
      ]
    }
  },
  senior_11b: {
    day: 10, time: "night", bg: "hallway", char: "senior", speaker: "学姐",
    text: "我走到门口，又停下。「我想先问你一件事——你想让我去吗？」她沉默了很久，说：「我想让你自己选。」于是我走回来，拿起笔。",
    next: "senior_12"
  },
  senior_11c: {
    day: 10, time: "night", bg: "hallway", char: "senior", speaker: "学姐",
    text: "我没有拿笔，也没有去合成台。我只是在她旁边坐下。她问：「你不写吗？」我说：「今晚不写。今晚我在这儿。」",
    next: "senior_14"
  },
  senior_12: {
    day: 10, time: "night", bg: "hallway", char: "senior", speaker: "学姐",
    text: "她把信纸推到我面前。这一次，不是抄，不是选。是我自己写。",
    letter: {
      id: "senior_letter_free",
      type: "free",
      prompt: "✦ 给学姐写一封信",
      hint: "她不缺一封能让她离开的信。她缺一封写给她的信。",
      matchings: [
        { id: "留下", keywords: ["留", "陪", "一起", "不走", "停"], next: "senior_13_stay", memory: "学姐·留下", memoryTitle: "回信·留下" },
        { id: "自由", keywords: ["走", "自由", "离开", "飞", "春天"], next: "senior_13_go", memory: "学姐·自由", memoryTitle: "回信·自由" },
        { id: "看见", keywords: ["看见", "名字", "记得", "影子", "你"], next: "senior_13_see", memory: "学姐·看见", memoryTitle: "回信·看见" },
      ],
      defaultReply: { next: "senior_13_default", memory: "学姐·回信", memoryTitle: "回信·致学姐" }
    },
    next: "senior_13_default"
  },
  senior_13_stay: {
    day: 10, time: "night", bg: "hallway", char: "senior", speaker: "学姐",
    text: "她读得很慢。读到「留下」两个字时，她抬起头：「留下不是陪我停在原地。你想清楚了吗？」我说：「想清楚了。留下是陪你把日子过下去。」",
    next: "senior_14"
  },
  senior_13_go: {
    day: 10, time: "night", bg: "hallway", char: "senior", speaker: "学姐",
    text: "她读到「走」的时候笑了。「你让我走。可我走不了。」我说：「那就先不走。自由又不是只有离开一种写法。」她把信按在胸口，很久没说话。",
    next: "senior_14"
  },
  senior_13_see: {
    day: 10, time: "night", bg: "hallway", char: "senior", speaker: "学姐",
    text: "她读到「看见」两个字，手指停住了。「你写的不是信。」她说，「你写的是我。」",
    next: "senior_14"
  },
  senior_13_default: {
    day: 10, time: "night", bg: "hallway", char: "senior", speaker: "学姐",
    text: "她把信读完，折好，放进校服口袋。「原来被人回信，是这样的感觉。」",
    next: "senior_14"
  },
  senior_14: {
    day: 11, time: "night", bg: "festival", char: "senior", speaker: "学姐",
    text: "樱花祭开始了。主会场的灯一盏盏亮起来，旧校舍这边只听得见风。她问：「你不去吗？」我说：「我在这儿。」她看着樱花，第一次没有说「回去吧」。",
    loopText: ["樱花祭开始了。主会场的灯一盏盏亮起来，旧校舍这边只听得见风。她问：「你不去吗？」我说：「我在这儿。」她看着樱花，第一次没有说「回去吧」。",
"「你不去吗？」上一轮我犹豫要不要答；这一轮我懂：她其实在给我退路，而我说「我在这儿」时，她是先松了一口气，才去看樱花的。",
"主会场的灯一盏盏亮起来，这一轮我听见她沉默里另有一种声音——不是挽留，是终于有人替她把这晚的灯，留在了旧校舍这一边。"],
    cg_unlock: "cg_senior_shadow",
    next: "senior_ending"
  },
  senior_ending: {
    day: 11, time: "night", bg: "ending_true", char: null, speaker: "",
    text: "那年樱花祭，我没有合成那封信。循环没有破，学姐也没有离开。但从那天起，旧校舍的灯会在每晚亮一会儿——不是等谁来救她，只是有人会来，陪她把没写完的那一页写完。她说，她第一次觉得，自己不是一个被留在信里的影子。",
    loopText: ["那年樱花祭，我没有合成那封信。循环没有破，学姐也没有离开。但从那天起，旧校舍的灯会在每晚亮一会儿——不是等谁来救她，只是有人会来，陪她把没写完的那一页写完。她说，她第一次觉得，自己不是一个被留在信里的影子。",
"那年樱花祭，我没有合成那封信。上一轮我以为这是「没走成的结局」；这一轮我懂了——有些人不必被救走，只需要有人肯一遍遍地来，把没写完的那一页写完。",
"旧校舍的灯每晚亮一会儿。这一轮我明白：那不是等谁，是一句没有署名的「我还在」。她终于不再是被留在信里的影子，而是自己按亮灯的那个人。"],
    ending: { id: "senior_shadow", type: "SIDE ENDING", title: "看 见", text: "循环没有破，她也没有走；但这一次，她不再是没人看见的影子。" }
  },

  /* ============ 真结局后日谈：樱海以后 ============ */
  afterword_entry: { day: 14, time: "night",
    bg: "festival", char: null, speaker: "",
    text: "樱花祭后的第三天，学园把彩灯和摊位都收起来了。信寄出以后，日子没有立刻变得圆满——只是每个人都开始做一件具体的事。我也给父母各发了一条近况：父亲回了工作安排，母亲问我什么时候回家。家没有立刻恢复原样，但冷战终于有了第一道缝。",
    loopText: ["樱花祭后的第三天，学园把彩灯和摊位都收起来了。信寄出以后，日子没有立刻变得圆满——只是每个人都开始做一件具体的事。我也给父母各发了一条近况：父亲回了工作安排，母亲问我什么时候回家。家没有立刻恢复原样，但冷战终于有了第一道缝。",
"樱花祭后的第三天，摊子收起来了，日子没有立刻圆满。上一轮我发那条近况时手还有些抖；这一轮我懂了——缝是慢慢开的，不是一夜缝上的。",
"又是樱花祭后的第三天。这一轮我记得：母亲问「什么时候回家」，不是催，是等。我给父亲的「工作安排」回了两个字——「收到」，比上一轮多了一个字。"],
    next: "afterword_three",
    cg_unlock: "cg_festival" /* v3.3.3：学园祭之夜 CG 此前无任何解锁点（内容缺口），接入后日谈开篇 */
  },
  afterword_three: { day: 14, time: "night",
    bg: "cafeteria", chars: [{ id: "shiyu", pos: "left" }, { id: "xiazhi", pos: "center" }, { id: "sunian", pos: "right" }],
    speaker: "林诗雨",
    text: "我把下一章交给校刊了。夏织开始做康复训练，苏念把画室的门打开了一半。我们没有替谁走完路，只是约好每周见一次。",
    loopText: ["我把下一章交给校刊了。夏织开始做康复训练，苏念把画室的门打开了一半。我们没有替谁走完路，只是约好每周见一次。",
"「我们没有替谁走完路。」上一轮我听着像总结；这一轮我听见里面的分寸——她们各自还在走，只是约好别走散。",
"下一章、康复、半开的门。这一轮我明白：这不是大团圆，是三个人都开始做「一件具体的事」——比什么都实在。"],
    next: "afterword_postcard"
  },
  afterword_postcard: { day: 14, time: "night",
    bg: "school_gate", char: null, speaker: "",
    text: "学姐寄来一张明信片。她在卡片边角留下了新城市的收件地址，却没有写回寄件地址。我们决定替她补上两枚印记，再按这个地址寄回去——不问她什么时候回来，只告诉她：这里有人记得。",
    loopText: ["学姐寄来一张明信片。她在卡片边角留下了新城市的收件地址，却没有写回寄件地址。我们决定替她补上两枚印记，再按这个地址寄回去——不问她什么时候回来，只告诉她：这里有人记得。", "又一年明信片如期而至。地址换了城市，边角那句「这里有人记得」换成了「我记得这里」。我们补印记的手已经很熟了——熟到像每年春天给樱树浇水。", "学姐寄来一张明信片。她在卡片边角留下了新城市的收件地址，却没有写回寄件地址。我们决定替她补上两枚印记，再按这个地址寄回去——不问她什么时候回来，只告诉她：这里有人记得。"],
    next: "afterword_stamp",
    postcard: {
      prompt: "为明信片选两枚印记",
      hint: "每枚印记只代表一个今天，不代表永远。",
      max: 2,
      stamps: [
        { id: "write", label: "写下", desc: "给还没完成的故事留一页。" },
        { id: "run", label: "起跑", desc: "为明天的训练系好鞋带。" },
        { id: "open", label: "开门", desc: "把画室的门再推开一点。" },
        { id: "wait", label: "等候", desc: "允许想念存在，但不把脚停在原地。" }
      ],
      interpretations: [
        { stamps: ["write", "open"], label: "——把门写成一条路", text: "林诗雨在背面写下下一章的开头，苏念添了一小块紫。明信片没有催学姐回来，只把门和路都留着。", add: { affection: { shiyu: 1, sunian: 1 } }, personality: { honest: 1, creative: 1 }, next: "afterword_stamp" },
        { stamps: ["run", "wait"], label: "——等候不是停下", text: "夏织画了一条短短的跑道，旁边写着「等你看见终点」。这一次，等候不是把谁留下，而是让每个人都能继续跑。", add: { affection: { xiazhi: 1, shen: 1 } }, personality: { kind: 1, brave: 1 }, next: "afterword_stamp" },
        { stamps: ["write", "wait"], label: "——给未来留位置", text: "你们把明信片寄出去，没有写回信期限。未来不是一张必须填满的表格，它可以先留一个位置。", add: { affection: { shiyu: 1, shen: 1 } }, personality: { honest: 2 }, next: "afterword_stamp" },
        { stamps: ["run", "open"], label: "——从今天开始", text: "跑道和画室被印在同一张卡片上。她们说，开始并不需要等到一切准备好。", add: { affection: { xiazhi: 1, sunian: 1 } }, personality: { brave: 1, creative: 1 }, next: "afterword_stamp" }
      ],
      fallback: { label: "——还没决定", text: "你们选了两枚还说不清的印记。也没关系，明信片先寄出去，答案可以在路上慢慢长出来。", add: { affection: { shen: 1 } }, personality: { patient: 1 }, next: "afterword_stamp" }
    }
  },
  afterword_stamp: { day: 14, time: "night",
    bg: "school_gate", char: "shiyu", speaker: "林诗雨",
    text: "邮筒吞下明信片时，林诗雨问：「这次不会再回来了吗？」我说：「会回来，但不是回到原点。」她把这句话写进了下一章。",
    loopText: ["邮筒吞下明信片时，林诗雨问：「这次不会再回来了吗？」我说：「会回来，但不是回到原点。」她把这句话写进了下一章。",
"「会回来，但不是回到原点。」上一轮我说这句话时心里没底；这一轮我知道它是真的——她们回来的是往前走过的路。",
"邮筒、下一章。这一轮我记住：她把我的答案写进了小说，而小说这一次终于有了往回走的尽头。"],
    next: "afterword_4"
  },
  afterword_4: { day: 14, time: "night",
    bg: "cherry_full", chars: [{ id: "shiyu", pos: "left" }, { id: "xiazhi", pos: "center" }, { id: "sunian", pos: "right" }],
    speaker: "沈屿",
    text: "风从海那边吹过来。夏织先迈开步子，诗雨把稿纸夹好，苏念把门再推开一点。她们都没有回头叫我。因为这一次，我已经在她们身边。",
    loopText: ["风从海那边吹过来。夏织先迈开步子，诗雨把稿纸夹好，苏念把门再推开一点。她们都没有回头叫我。因为这一次，我已经在她们身边。",
"风、步子、稿纸、门。上一轮我数着她们各自的动作；这一轮我留意到「没有回头叫我」——不是不要我，是不用再找我了。",
"「因为这一次，我已经在她们身边。」这一轮我读懂了这句话的重量：身边不是位置，是终于不必证明自己在场。"],
    next: "afterword_signature"
  },
  afterword_signature: { day: 14, time: "night",
    bg: "cherry_full", chars: [{ id: "shiyu", pos: "left" }, { id: "xiazhi", pos: "center" }, { id: "sunian", pos: "right" }],
    choice: {
      prompt: "替明信片补上一句落款",
      options: [
        { text: "写下「下次见」",
    loopText: ["写下「下次见」",
    "写下「下次见」——第二年的同一支笔、同一块地方。字没有变，写字的人更笃定了。"], next: "afterword_signature_meet", add: { affection: { shiyu: 1, xiazhi: 1, sunian: 1 } } },
        { text: "写下「照顾好自己」", next: "afterword_signature_care", add: { affection: { shiyu: 1, shen: 1 } } },
        { text: "留一行空白", next: "afterword_signature_blank", add: { affection: { sunian: 1, shen: 1 } } }
      ]
    }
  },
  afterword_signature_meet: { day: 14, time: "night",
    bg: "cherry_full", char: "shiyu", speaker: "林诗雨",
    text: "我们写下「下次见」，却没有写日期。不是催学姐回来，只是承认未来仍然有相遇的可能。",
    loopText: ["我们写下「下次见」，却没有写日期。不是催学姐回来，只是承认未来仍然有相遇的可能。",
    "「下次见」没有写日期。第二年也没有写——我们开始喜欢这种不设限的期待：它允许一切按各自的速度到来。"],
    next: "afterword_reply_arrival"
  },
  afterword_signature_care: { day: 14, time: "night",
    bg: "cherry_full", char: "xiazhi", speaker: "夏织",
    text: "夏织把「照顾好自己」写得很重。这句话不需要回信，也不需要证明；只要学姐收到，就够了。",
    loopText: ["夏织把「照顾好自己」写得很重。这句话不需要回信，也不需要证明；只要学姐收到，就够了。",
    "夏织把「照顾好自己」写得很重。第二年她写得轻了些——因为那边传来的消息，一年比一年让人放心。"],
    next: "afterword_reply_arrival"
  },
  afterword_signature_blank: { day: 14, time: "night",
    bg: "cherry_full", char: "sunian", speaker: "苏念",
    text: "我们留了一行空白。不是因为无话可说，而是把下一个字交给学姐自己。",
    loopText: ["我们留了一行空白。不是因为无话可说，而是把下一个字交给学姐自己。",
    "留一行空白。第二年空白还在——但我们发现学姐会在别的句子边上，悄悄回过几个字。"],
    next: "afterword_reply_arrival"
  },
  /* ============ 后日谈追加：循环结束后的现实回信 ============ */
  afterword_reply_arrival: { day: 21, time: "night",
    bg: "school_gate", char: null, speaker: "",
    text: "一周后，按新城市地址寄出的明信片又从邮筒里折返回来。学姐没有在回信上写回寄件地址，只在空白处写了一句：「我没有回樱海，但我在新城市打开了一扇窗。」",
    loopText: ["一周后，按新城市地址寄出的明信片又从邮筒里折返回来。学姐没有在回信上写回寄件地址，只在空白处写了一句：「我没有回樱海，但我在新城市打开了一扇窗。」", "折返回来的明信片一年比一年轻——字越来越少，生活越来越多。今年的空白处只画了一扇窗，窗外的部分她留给我们想象。我们各自想象了不一样的风景，都对。", "一周后，按新城市地址寄出的明信片又从邮筒里折返回来。学姐没有在回信上写回寄件地址，只在空白处写了一句：「我没有回樱海，但我在新城市打开了一扇窗。」"],
    next: "afterword_senior_window"
  },
  /* ============ v3.3.0 后日谈追加：学姐视角（形态 B，不动结局结构） ============ */
  afterword_senior_window: { day: 21, time: "night",
    bg: "school_gate", char: null, speaker: "",
    text: "（镜头切到新城市。）学姐租的公寓窗外也有一棵樱树，比樱海的矮，开得却一样用力。她把明信片放在窗台上，没有立刻回信——她只是看着那棵樱树，像在看一封写了很久的信。",
    loopText: ["（镜头切到新城市。）学姐租的公寓窗外也有一棵樱树，比樱海的矮，开得却一样用力。她把明信片放在窗台上，没有立刻回信——她只是看着那棵樱树，像在看一封写了很久的信。",
    "新城市的樱树又开了一年。她把回信收进抽屉最上层——不再是锁，只是收好。窗台上的明信片换了一张朝向：字朝外，给路过的风看。"],
    next: "afterword_senior_flashback"
  },
  afterword_senior_flashback: { day: 21, time: "night",
    bg: "art_room", char: null, speaker: "",
    text: "（回忆）三年前的樱花祭，她也站在同一棵树下，手里攥着一封没寄出的信。她以为错过就是终点，于是把信锁进抽屉，也把自己锁进「不被需要」的念头里。现在她看着窗外的矮樱树，才明白那封信没有白写——它只是在等一个替她寄出去的人。",
    loopText: ["（回忆）三年前的樱花祭，她也站在同一棵树下，手里攥着一封没寄出的信。她以为错过就是终点，于是把信锁进抽屉，也把自己锁进「不被需要」的念头里。现在她看着窗外的矮樱树，才明白那封信没有白写——它只是在等一个替她寄出去的人。",
    "三年前的樱花祭，她以为错过就是终点。第二年再想起那个抽屉，她已经能把「没寄出的信」讲成故事的开头，而不是结尾。"],
    next: "afterword_senior_letter"
  },
  afterword_senior_letter: { day: 21, time: "night",
    bg: "home_room", char: null, speaker: "学姐",
    text: "她桌上摊着三样东西：校刊寄来的回信、贴着两枚印记的明信片背面、一张画了一半的门。她看了很久，最后没有把它们收进抽屉。她坐下写回信，第一句是：「我没有回去，是因为我终于知道自己正在往哪里走了。」",
    loopText: ["她桌上摊着三样东西：校刊寄来的回信、贴着两枚印记的明信片背面、一张画了一半的门。她看了很久，最后没有把它们收进抽屉。她坐下写回信，第一句是：「我没有回去，是因为我终于知道自己正在往哪里走了。」",
    "桌上三样东西又多了一样：一张车票的收据。她没有订日期——但她把「回去看看」从假设句改成了进行时。"],
    next: "afterword_reply"
  },
  afterword_reply: { day: 21, time: "night",
    bg: "school_gate", char: null, speaker: "",
    text: "三个人把明信片传了一圈。没有人再问她什么时候回来——这一次，我们只想认真回一句现在的话。",
    loopText: ["三个人把明信片传了一圈。没有人再问她什么时候回来——这一次，我们只想认真回一句现在的话。", "明信片传了一圈又回到我手里。上面多了三种笔迹的批注——都不同意彼此，又都不反对彼此。这就是回信角教会我们的事：认真回一句现在的话，比统一答案难得多。", "三个人把明信片传了一圈。没有人再问她什么时候回来——这一次，我们只想认真回一句现在的话。"],
    letter: {
      id: "afterword_reply",
      type: "free",
      prompt: "✦ 回一封给现在的学姐",
      hint: "写下你想让她带走的一句话…",
      matchings: [
        { id: "reply_meet", keywords: ["见", "下次", "回来"], next: "afterword_reply_meet" },
        { id: "reply_release", keywords: ["继续", "不用", "远方", "走"], next: "afterword_reply_release" },
        { id: "reply_write", keywords: ["写", "下一章", "今天", "开始"], next: "afterword_reply_write" }
      ],
      defaultReply: { next: "afterword_reply_default" }
    }
  },
  afterword_reply_meet: { day: 21, time: "night",
    bg: "cherry_full", char: "shiyu", speaker: "林诗雨",
    text: "诗雨把回信折好：「我们可以期待见面，但不用把期待变成她必须完成的作业。」她在落款旁边添了一朵很小的樱花。",
    loopText: ["诗雨把回信折好：「我们可以期待见面，但不用把期待变成她必须完成的作业。」她在落款旁边添了一朵很小的樱花。",
    "诗雨把回信折好，落款旁那朵小樱花第二年多了一瓣——她说这是「期待在长大，但没有变成催促」。"],
    next: "afterword_timeline"
  },
  afterword_reply_release: { day: 21, time: "night",
    bg: "school_gate", char: "xiazhi", speaker: "夏织",
    text: "夏织把信投进邮筒：「那就继续跑吧。不是离开樱海才算赢，跑到自己想去的地方就算。」",
    loopText: ["夏织把信投进邮筒：「那就继续跑吧。不是离开樱海才算赢，跑到自己想去的地方就算。」",
    "夏织把信投进邮筒的动作和去年一样，台词换了一句：「跑到想去的地方」里，今年多了一个她也想去的地方——樱海。"],
    next: "afterword_timeline"
  },
  afterword_reply_write: { day: 21, time: "night",
    bg: "cafeteria", char: "sunian", speaker: "苏念",
    text: "苏念在回信末尾画了一扇半开的门：「下一章不用等我批准。你先写今天的这一页。」",
    loopText: ["苏念在回信末尾画了一扇半开的门：「下一章不用等我批准。你先写今天的这一页。」",
    "苏念画的门每年多半格。第二年她题了一行小字：「门不用全开，够走过去就行。」"],
    next: "afterword_timeline"
  },
  afterword_reply_default: { day: 21, time: "night",
    bg: "cherry_full", char: null, speaker: "",
    text: "我们没有替学姐解释这句话，只把自己的近况写进去。回信不必漂亮，能抵达就已经足够。",
    loopText: ["我们没有替学姐解释这句话，只把自己的近况写进去。回信不必漂亮，能抵达就已经足够。",
    "我们把自己的近况写进去。第二年的近况写满了正反面——能抵达就已足够，抵达之后，人们总想多说一点。"],
    next: "afterword_timeline"
  },
  afterword_timeline: { day: 21, time: "night",
    bg: "school_gate", chars: [{ id: "shiyu", pos: "left" }, { id: "xiazhi", pos: "center" }, { id: "sunian", pos: "right" }],
    speaker: "沈屿",
    text: "我们把明信片摊在桌上，按日期核对这段没有倒流的日子。不是寻找下一封匿名信，只是确认：发生过的事，已经有了先后。",
    loopText: ["我们把明信片摊在桌上，按日期核对这段没有倒流的日子。不是寻找下一封匿名信，只是确认：发生过的事，已经有了先后。", "按日期核对的日子已经排到第二年。有些日期重复出现——每周见一次的那天，樱花祭的那天。循环这个词，现在只属于日历，不属于我们。", "我们把明信片摊在桌上，按日期核对这段没有倒流的日子。不是寻找下一封匿名信，只是确认：发生过的事，已经有了先后。"],
    next: "afterword_autumn",
    timeline: {
      prompt: "把四件事按发生先后排好",
      hint: "从樱花祭那晚开始，排到今天收到回信以后。",
      events: [
        { id: "festival_letter", date: "樱花祭之夜", label: "寄出樱花信", desc: "你在樱花树下替学姐写下回信。" },
        { id: "school_cleanup", date: "三天后", label: "学园收摊", desc: "彩灯和摊位收起，三个人约好每周见面。" },
        { id: "postcard_reply", date: "一周后", label: "收到学姐回信", desc: "明信片从新城市折返回来，写着一扇打开的窗。" },
        { id: "today_reply", date: "今天", label: "写下现在的话", desc: "你们把近况写回去，不再追问她何时回来。" }
      ],
      correctOrder: ["festival_letter", "school_cleanup", "postcard_reply", "today_reply"],
      success: {
        label: "——日子往前了",
        text: "四件事一件接着一件，没有哪一件需要回到原点重来。你们把明信片收好：记住顺序，也允许明天继续发生。",
        add: { affection: { shiyu: 1, xiazhi: 1, sunian: 1 } },
        personality: { honest: 1, patient: 1 }
      },
      retry: {
        label: "——再核对一次",
        text: "顺序有一处对不上。你们重新看了一遍日期，发现不是记忆出了错，而是大家都太急着把未来提前。",
        add: { affection: { shen: 1 } },
        personality: { patient: 1 }
      }
    }
  },
  /* ============ 后日谈追加：半年后的回信角 ============ */
  afterword_autumn: { day: 180, time: "night",
    bg: "school_gate", chars: [{ id: "shiyu", pos: "left" }, { id: "xiazhi", pos: "center" }, { id: "sunian", pos: "right" }],
    speaker: "沈屿",
    text: "半年后，樱海学园换上了薄薄的秋色。我们把旧公告栏改成了「回信角」，并把规则写在旁边：愿意公开的纸条写上署名和日期；不愿署名的，也可以明确选择匿名。我们不再把任何人的困惑交给一封没有来处的信。",
    loopText: ["半年后，樱海学园换上了薄薄的秋色。我们把旧公告栏改成了「回信角」，并把规则写在旁边：愿意公开的纸条写上署名和日期；不愿署名的，也可以明确选择匿名。我们不再把任何人的困惑交给一封没有来处的信。",
"「回信角」、规则、署名。上一轮我把它当成一个场景；这一轮我听见了它的来处——我们做过一次「没有来处的信」的受害者，才学会要先问清楚。",
"半年、秋色、写在旁边的规则。这一轮我明白：把规则写出来，不是不信任，是替每一个可能被看见的人，先把选择权留下。"],
    next: "afterword_mailbox"
  },
  afterword_mailbox: { day: 181, time: "night",
    bg: "classroom", char: null, speaker: "",
    text: "第一张纸条没有写名字：「如果我暂时不知道要去哪里，还能先留在这里吗？」三个人看了很久，谁也不想替她决定答案。我们把笔递给了你。",
    loopText: ["第一张纸条没有写名字：「如果我暂时不知道要去哪里，还能先留在这里吗？」三个人看了很久，谁也不想替她决定答案。我们把笔递给了你。", "没写名字的纸条每年都有。我们递笔的手势越来越自然——不急着替谁决定答案，是我们花了整整一年才学会的姿势。", "第一张纸条没有写名字：「如果我暂时不知道要去哪里，还能先留在这里吗？」三个人看了很久，谁也不想替她决定答案。我们把笔递给了你。"],
    next: "afterword_mailbox_reply",
  },
  afterword_mailbox_reply: { day: 181, time: "night",
    bg: "classroom", chars: [{ id: "shiyu", pos: "left" }, { id: "xiazhi", pos: "center" }, { id: "sunian", pos: "right" }],
    speaker: "沈屿",
    text: "回信角的第一封公开回信——不需要漂亮，只要让对方知道，犹豫也可以被认真对待。",
    loopText: ["回信角的第一封公开回信——不需要漂亮，只要让对方知道，犹豫也可以被认真对待。", "第一封公开回信已经被换到「留底」那一栏。新的回信贴在它旁边——写得都比我们当年好。犹豫可以被认真对待这件事，现在轮到更多人接住了。", "回信角的第一封公开回信——不需要漂亮，只要让对方知道，犹豫也可以被认真对待。"],
    letter: {
      id: "afterword_mailbox_reply",
      type: "free",
      prompt: "✦ 写给回信角的第一位来信者",
      hint: "不要替对方选终点，只写一句能落到今天的话…",
      matchings: [
        { id: "mailbox_stay", keywords: ["可以", "留下", "留在", "慢一点", "现在"], next: "afterword_mailbox_stay" },
        { id: "mailbox_step", keywords: ["一步", "试试", "开始", "走走", "先做"], next: "afterword_mailbox_step" },
        { id: "mailbox_listen", keywords: ["听", "陪", "等", "问问", "说说"], next: "afterword_mailbox_listen" }
      ],
      defaultReply: { next: "afterword_mailbox_default" }
    }
  },
  afterword_mailbox_stay: { day: 181, time: "night",
    bg: "classroom", char: "shiyu", speaker: "林诗雨",
    text: "诗雨把「可以先留在这里」圈了出来，又补了一句：「留下不是放弃寻找，只是今天不用急着证明自己。」她第一次写建议时，没有把它写成答案。",
    loopText: ["诗雨把「可以先留在这里」圈了出来，又补了一句：「留下不是放弃寻找，只是今天不用急着证明自己。」她第一次写建议时，没有把它写成答案。",
    "「可以先留在这里」被圈出来的那句话，第二年贴在了回信角最上方——它从一条回复，变成了一句常设的欢迎。"],
    personality: { kind: 1, patient: 1 },
    next: "afterword_mailbox_rules"
  },
  afterword_mailbox_step: { day: 181, time: "night",
    bg: "school_gate", char: "xiazhi", speaker: "夏织",
    text: "夏织本来想写「那就跑起来」，最后改成：「先试一小步，明天再看。」她说，真正的起跑不是把人推向终点，而是把脚下这一格照亮。",
    loopText: ["夏织本来想写「那就跑起来」，最后改成：「先试一小步，明天再看。」她说，真正的起跑不是把人推向终点，而是把脚下这一格照亮。",
    "夏织的「先试一小步」第二年有了姊妹句，是她自己补的：「一小步也算数，不走也算数。」她说这叫真正的终点线。"],
    personality: { brave: 1, kind: 1 },
    next: "afterword_mailbox_rules"
  },
  afterword_mailbox_listen: { day: 181, time: "night",
    bg: "art_room", char: "sunian", speaker: "苏念",
    text: "苏念没有填满纸条，只在下面写：「如果你愿意，可以把下一句也留在这里。」空白没有替对方沉默，它只是先把位置留出来。",
    loopText: ["苏念没有填满纸条，只在下面写：「如果你愿意，可以把下一句也留在这里。」空白没有替对方沉默，它只是先把位置留出来。",
    "苏念留出的位置第二年有人坐了——那张纸条的下半句，被一个低年级的字迹轻轻接上。空白完成了它的工作。"],
    personality: { kind: 1, honest: 1 },
    next: "afterword_mailbox_rules"
  },
  afterword_mailbox_default: { day: 181, time: "night",
    bg: "classroom", char: null, speaker: "",
    text: "你写下了一句暂时无法归类的话。三个人没有把它改成更像答案的样子，只把日期和你们的名字写在下面：有人会读到，也有人愿意继续听。",
    loopText: ["你写下了一句暂时无法归类的话。三个人没有把它改成更像答案的样子，只把日期和你们的名字写在下面：有人会读到，也有人愿意继续听。",
    "那句无法归类的话还贴在墙上，旁边多了三种颜色的心意标记。有些话不需要归类，需要的是被看见很多次。"],
    personality: { honest: 1, patient: 1 },
    next: "afterword_mailbox_rules"
  },
  afterword_mailbox_rules: { day: 181, time: "night",
    bg: "classroom", chars: [{ id: "shiyu", pos: "left" }, { id: "xiazhi", pos: "center" }, { id: "sunian", pos: "right" }],
    speaker: "林诗雨",
    text: "第一封回信贴上墙后，我们又写下回信角的第一条规则。它不能保证每个人马上找到方向，但至少不能让好意变成新的压力。",
    loopText: ["第一封回信贴上墙后，我们又写下回信角的第一条规则。它不能保证每个人马上找到方向，但至少不能让好意变成新的压力。", "回信角的规则写到了第四条。前三条都活着，第四条是今年新加的：「规则本身，也接受回信。」", "第一封回信贴上墙后，我们又写下回信角的第一条规则。它不能保证每个人马上找到方向，但至少不能让好意变成新的压力。"],
    choice: {
      prompt: "回信角的第一条规则——",
      options: [
        { text: "每一封回信都写上名字和日期。", next: "afterword_mailbox_rule_sign", add: { personality: { honest: 1 } } },
        { text: "先问对方需要什么，再给建议。", next: "afterword_mailbox_rule_ask", add: { personality: { kind: 1 } } },
        { text: "允许只留下空白，不催任何人回答。", next: "afterword_mailbox_rule_space", add: { personality: { patient: 1 } } }
      ]
    }
  },
  afterword_mailbox_rule_sign: { day: 181, time: "night",
    bg: "school_gate", char: "shiyu", speaker: "林诗雨",
    text: "诗雨把姓名栏和日期栏画得很直：「署名不是为了追责，是为了让关心有一个真实的落点。」回信角终于和那封匿名信不一样了。",
    loopText: ["诗雨把姓名栏和日期栏画得很直：「署名不是为了追责，是为了让关心有一个真实的落点。」回信角终于和那封匿名信不一样了。",
    "诗雨画的姓名栏第二年加了虚线版——想署名的写实名，不想的画一朵小花。「落点」从此有了两种真实。"],
    next: "afterword_mailbox_triage"
  },
  afterword_mailbox_rule_ask: { day: 181, time: "night",
    bg: "cafeteria", char: "xiazhi", speaker: "夏织",
    text: "夏织点头：「先问一句，至少不会把自己的经验塞给别人。」她把「你现在需要什么？」写在公告栏最上面。",
    loopText: ["夏织点头：「先问一句，至少不会把自己的经验塞给别人。」她把「你现在需要什么？」写在公告栏最上面。",
    "「你现在需要什么？」升格成了回信角的镇角之问。第二年夏织给它配了下半句：「需要什么都行，包括需要安静。」"],
    next: "afterword_mailbox_triage"
  },
  afterword_mailbox_rule_space: { day: 181, time: "night",
    bg: "art_room", char: "sunian", speaker: "苏念",
    text: "苏念在角落画了一个半开的方框：「空白也算回信。」它不是把人晾在那里，而是承认有些话要等准备好才说。",
    loopText: ["苏念在角落画了一个半开的方框：「空白也算回信。」它不是把人晾在那里，而是承认有些话要等准备好才说。",
    "苏念的半开方框第二年开了口：有人真的往里放了一张纸条，只写了日期。空白会说话——它说的是「这里等你」。"],
    next: "afterword_mailbox_triage"
  },
  afterword_mailbox_triage: { day: 181, time: "night",
    bg: "classroom", chars: [{ id: "shiyu", pos: "left" }, { id: "xiazhi", pos: "center" }, { id: "sunian", pos: "right" }],
    speaker: "沈屿",
    text: "规则写好后，公告栏旁又出现了三张纸条。我们先把它们读完，再决定回什么——不是给人贴标签，而是确认眼前这句话真正需要什么。",
    loopText: ["规则写好后，公告栏旁又出现了三张纸条。我们先把它们读完，再决定回什么——不是给人贴标签，而是确认眼前这句话真正需要什么。",
    "分拣三张纸条的流程，第二年新社员已经会背了：先读完，再决定。传下去的不是规则，是不着急。"],
    next: "afterword_wall",
    triage: {
      prompt: "把每张纸条匹配到它需要的回应",
      hint: "先读完左边的来信，再从右边选择最不替对方做决定的一句。",
      notes: [
        { id: "room", label: "想留在美术室", text: "我想继续画，但请别每天问我什么时候完成。" },
        { id: "step", label: "想先试一小步", text: "我想参加训练，可一想到全程就想逃。能先陪我走到操场吗？" },
        { id: "listen", label: "想有人听完", text: "我不知道怎么跟班里说。你们能先听我说完吗？" }
      ],
      replies: [
        { id: "space", label: "给她一点空间", text: "先把今天画完，不需要现在证明下一幅。" },
        { id: "step", label: "把路缩成一步", text: "先走到操场，下一步等你准备好。" },
        { id: "listen", label: "先问她愿不愿意被听", text: "先听完她想说的，不急着给建议。" }
      ],
      correctMapping: { room: "space", step: "step", listen: "listen" },
      success: {
        label: "——先听见，再回应",
        text: "三张纸条没有被归进谁的性格或结局。你们只是把每句话需要的空间、一步和倾听放到了它面前，然后把名字和日期留在墙角。",
        add: { affection: { shiyu: 1, xiazhi: 1, sunian: 1 } },
        personality: { kind: 1, honest: 1 }
      },
      retry: {
        label: "——再读一遍",
        text: "有一张回应太快替对方安排了下一站。你们把纸条重新摊开，发现关心不是猜中一个标签，而是愿意把话听完整。",
        add: { affection: { shen: 1 } },
        personality: { patient: 1 }
      }
    }
  },
  /* ============ 后日谈追加：毕业前的留言墙 ============ */
  afterword_wall: { day: 370, time: "night",
    bg: "classroom", chars: [{ id: "shiyu", pos: "left" }, { id: "xiazhi", pos: "center" }, { id: "sunian", pos: "right" }],
    speaker: "沈屿",
    text: "又过半年，春末的开放日快结束了。回信角前留下四张纸条：有人明确说可以公开，有人只想把话交还自己，还有人替朋友写了一半。我们先确认每句话能不能被看见，再决定它该去哪里。",
    loopText: ["又过半年，春末的开放日快结束了。回信角前留下四张纸条：有人明确说可以公开，有人只想把话交还自己，还有人替朋友写了一半。我们先确认每句话能不能被看见，再决定它该去哪里。",
"四张纸条，三种意愿。上一轮我按着规则分；这一轮我先问自己：分之前，我有没有真的听清每一句想被怎么对待。",
"公开、交还、写了一半。这一轮我记住：这一步不是整理，是练习——练习尊重一个人还没说完的部分。"],
    next: "afterword_wall_reflection",
    wall: {
      prompt: "把每张留言放到合适的位置",
      hint: "明确同意才能公开；不确定的内容先留给本人或暂缓，不替别人做决定。",
      bins: [
        { id: "public", label: "公开回应", text: "作者明确允许，才贴到墙上。" },
        { id: "private", label: "交还本人", text: "只让写下它的人看见，不扩大范围。" },
        { id: "hold", label: "暂不张贴", text: "同意还不清楚，先保留原纸条。" }
      ],
      notes: [
        { id: "poster", label: "愿意署名的海报", text: "我画的海报可以贴到墙上，署名就写在右下角。", target: "public" },
        { id: "private", label: "只想自己确认", text: "我还没准备好让班里看见，能把这张交还给我吗？", target: "private" },
        { id: "unfinished", label: "写到一半", text: "我不知道要不要把后半句写完。今天先别替我补上。", target: "hold" },
        { id: "friend", label: "替朋友写的留言", text: "这是我替朋友写的，可我不知道她是否同意公开。", target: "hold" }
      ],
      success: {
        label: "——先确认谁有决定权",
        text: "明确同意的留言才走上公开墙；只想收回的交还本人；还没准备好的话先保留。你们没有替任何人补完那句没写完的话。",
        add: { affection: { shiyu: 1, xiazhi: 1, sunian: 1 } },
        personality: { honest: 1, kind: 1 },
        next: "afterword_wall_reflection"
      },
      retry: {
        label: "——先把纸条收回来",
        text: "有一张纸条被放得太快。你们把它从墙上取下：关心不能代替当事人的同意，尤其不能替朋友发言。",
        add: { affection: { shen: 1 } },
        personality: { patient: 1 },
        next: "afterword_wall_reflection"
      }
    }
  },
  afterword_wall_reflection: { day: 370, time: "night",
    bg: "cherry_full", chars: [{ id: "shiyu", pos: "left" }, { id: "xiazhi", pos: "center" }, { id: "sunian", pos: "right" }],
    speaker: "林诗雨",
    text: "墙上最后只留下那张明确允许署名的海报。诗雨把其余三张分别交还，夏织在规则下面补了一行：「公开之前，先问写下它的人。」苏念没有把空白填满。",
    loopText: ["墙上最后只留下那张明确允许署名的海报。诗雨把其余三张分别交还，夏织在规则下面补了一行：「公开之前，先问写下它的人。」苏念没有把空白填满。", "墙上海报换了一幅，交还纸条的手没换。苏念的空白依然空着——她说过，空白是她留给自己下一幅画的位置。", "墙上最后只留下那张明确允许署名的海报。诗雨把其余三张分别交还，夏织在规则下面补了一行：「公开之前，先问写下它的人。」苏念没有把空白填满。"],
    next: "afterword_proofread"
  },
  /* ============ 后日谈追加：校刊校对 ============ */
  afterword_proofread: { day: 372, time: "night",
    bg: "classroom", chars: [{ id: "shiyu", pos: "left" }, { id: "xiazhi", pos: "center" }, { id: "sunian", pos: "right" }],
    speaker: "沈屿",
    text: "毕业前，校刊编辑部想记录回信角。摊开的稿件里，有些话可以作为事实写入，有些只是我们当时的猜测，还有一句涉及苏念要不要公开下一幅画。我们决定先校对，再把故事交给读者。",
    loopText: ["毕业前，校刊编辑部想记录回信角。摊开的稿件里，有些话可以作为事实写入，有些只是我们当时的猜测，还有一句涉及苏念要不要公开下一幅画。我们决定先校对，再把故事交给读者。", "校刊记录回信角已经是第二年。这一年的稿件里，猜测比去年少——不是因为我们知道得更多，是因为我们更早去问了。", "毕业前，校刊编辑部想记录回信角。摊开的稿件里，有些话可以作为事实写入，有些只是我们当时的猜测，还有一句涉及苏念要不要公开下一幅画。我们决定先校对，再把故事交给读者。"],
    next: "afterword_ending",
    proofread: {
      prompt: "把校刊稿件里的句子放到合适的校对标记",
      hint: "原话能证实的才写事实；推测不能伪装成结论；涉及本人选择的先交还本人。",
      bins: [
        { id: "fact", label: "已有依据", text: "信件或已经发生的行动可以直接证实。" },
        { id: "inference", label: "只能推测", text: "可以讨论，但不能写成已经发生的事实。" },
        { id: "private", label: "交还本人", text: "涉及当事人的决定，不能由旁人替她公开。" }
      ],
      cards: [
        { id: "senior_school", label: "学姐的旧经历", text: "学姐三年前曾在樱海读书。", target: "fact" },
        { id: "senior_return", label: "学姐的未来", text: "学姐一定会在毕业前回到樱海。", target: "inference" },
        { id: "senior_leave", label: "学姐的选择", text: "学姐曾经休学，后来没有回到樱海。", target: "fact" },
        { id: "anonymous_watch", label: "匿名信的含义", text: "每一封匿名信都证明学姐一直在监视我们。", target: "inference" },
        { id: "sunian_gallery", label: "苏念的画", text: "苏念已经决定公开她的下一幅画。", target: "private" },
        { id: "mailbox_answer", label: "回信角的作用", text: "回信角可以替每个人解决迷茫。", target: "inference" }
      ],
      success: {
        label: "——把知道的和不知道的分开",
        text: "六句话逐一核对后，校刊只把信里明确写过的事情称为事实，把未知留在推测栏，也把苏念的决定交还给她。记录不是替别人补完人生。",
        add: { affection: { shiyu: 1, xiazhi: 1, sunian: 1 } },
        personality: { honest: 2, patient: 1 },
        next: "afterword_proofread_clean"
      },
      retry: {
        label: "——把结论改回问题",
        text: "有一句把猜测写成了结论。你们把「一定」「证明」和「可以替」划掉，改成「目前没有依据」「也许」和「先问本人」。好意不能让未知变成事实。",
        add: { affection: { shen: 1 } },
        personality: { patient: 2 },
        next: "afterword_proofread_recheck"
      }
    }
  },
  afterword_proofread_clean: { day: 372, time: "night",
    bg: "classroom", char: "shiyu", speaker: "林诗雨",
    text: "诗雨把校刊最后一行改成：「我们记得发生过什么，也承认还有什么不知道。」她说，留白不是文章没写完，而是把别人的下一句还给别人。",
    loopText: ["诗雨把校刊最后一行改成：「我们记得发生过什么，也承认还有什么不知道。」她说，留白不是文章没写完，而是把别人的下一句还给别人。",
    "校刊最后一行第二年原样保留——「记得发生过什么，也承认还有什么不知道」成了回信角的题词。有些句子第一次就写对了。"],
    next: "afterword_ending"
  },
  afterword_proofread_recheck: { day: 372, time: "night",
    bg: "art_room", char: "sunian", speaker: "苏念",
    text: "苏念看完修改稿，只圈出一句：「下一幅画要不要公开，等我自己说。」你们把这句话留在原稿旁边，没有替她删掉，也没有替她答应。",
    loopText: ["苏念看完修改稿，只圈出一句：「下一幅画要不要公开，等我自己说。」你们把这句话留在原稿旁边，没有替她删掉，也没有替她答应。",
    "苏念圈的那句旁，第二年多了一行编者按：「等她自己说——她说了。」新画展的名字，是她自己起的。"],
    next: "afterword_ending"
  },
  afterword_ending: { day: 373, time: "night",
    bg: "ending_true", char: null, speaker: "",
    text: "樱海以后没有新的谜题，只有一群人把昨天写过的字带进今天。校刊留下了事实，也留下了没有答案的地方。故事没有被封存——它只是终于交还给了每一个正在生活的人。",
    loopText: ["樱海以后没有新的谜题，只有一群人把昨天写过的字带进今天。校刊留下了事实，也留下了没有答案的地方。故事没有被封存——它只是终于交还给了每一个正在生活的人。", "樱海以后还是没有新的谜题。谜题都去了回信角，变成了别人眼前具体的一周又一周。故事交还给每一个正在生活的人——而正在生活的人，一年比一年多。", "樱海以后没有新的谜题，只有一群人把昨天写过的字带进今天。校刊留下了事实，也留下了没有答案的地方。故事没有被封存——它只是终于交还给了每一个正在生活的人。"],
    ending: { id: "afterword", type: "AFTERWORD", title: "樱海以后", text: "信寄出以后，三个人各自继续往前走。" }
  },
};

/* ============ 入口节点 ============ */
const START_NODE = "prologue_1";

/* ============ 真结局解锁判定 ============ */
function hasAllGoodEndings() {
  return Saves.isEndingUnlocked("shiyu_good")
      && Saves.isEndingUnlocked("xiazhi_good")
      && Saves.isEndingUnlocked("sunian_good");
}

function isTrueEndUnlocked() {
  return Saves.isEndingUnlocked("true_end");
}
