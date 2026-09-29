# 剧情合理性梳理（glm.md）

> 版本：v2.7.7
> 范围：序章 → 共通线（第 1–5 日）→ 第 4–15 日长玩法链 → 三条个人线 → 真结局 → 后日谈
> 结论：核心人物动机成立，但在**时间线、学姐身份、循环机制、学园祭缺失、角色行为合理性**等方面存在多处需要修复的不合理点。

---

## 一、时间线问题（最严重）

### 1.1 学园祭被铺垫但从未发生 ★★★★★

- [js/script.js:938](file:///Users/x/code/gayme/js/script.js#L938) `common_day4_morning`：班主任说「学园祭还有一周。各班今天定主题」——即学园祭应在第 11 日左右发生。
- [js/script.js:1047](file:///Users/x/code/gayme/js/script.js#L1047) `d4_noon_2`：夏织提议「学园祭那天，我们三个一起出节目。诗雨写本子，我跑展，苏念画海报」——三人郑重约定。
- KEYWORDS 中「樱花祭」=「学园最后的春夜」，与学园祭应为同一活动的夜晚部分。
- **但遍查整部剧本，学园祭/樱花祭在共通线和三条个人线里完全没有实际场景**。只在真结局 [true_6](file:///Users/x/code/gayme/js/script.js#L3795)「樱花祭之夜。我在樱花树下，写下回信」被一句话带过。
- 三女主「学园祭一起出节目」的约定从此再没被提及，**被遗忘**。
- 这是共通线最大的剧情漏洞：铺垫了一整天的承诺，却从未兑现。

### 1.2 第 4 日晚 → 第 5 日 → 长玩法链 → 第 15 日 → 第 5 日 的时间混乱 ★★★★

- [d5_rewind](file:///Users/x/code/gayme/js/script.js#L1544)：第 5 日琴声触发，「日期从第 5 日退回第 4 日」。
- 随后 [d4_dice](file:///Users/x/code/gayme/js/script.js#L1553) → d4_wind → … → d5_foggy → d5_sugar → d5_chime → [d5_hourglass](file:///Users/x/code/gayme/js/script.js#L1971)（学姐送沙漏）→ d6_kite → … → d15_rewind → [d5_loop_arrival](file:///Users/x/code/gayme/js/script.js#L3329)（回到第 5 日清晨）。
- 这条长玩法链**横跨第 4 日到第 15 日共 11 天**，期间主角不用上学、不和三女主互动、不参加学园祭，仅和「她」（多为学姐）反复玩占卜/骰子/风筝/罗盘/星图等。
- d15_rewind 文本说「第 15 日没有消失，只是把我送回第 5 日清晨」——但这 11 天的现实生活去哪了？学园祭（第 11 日）本应在这段期间发生，却被完全吞没。
- 玩家极易误读为「剧情断链」或「跳过了学园祭」。

### 1.3 BAD 结局的 day 字段与文本自相矛盾 ★★★★

- [sy_11_bad](file:///Users/x/code/gayme/js/script.js#L3581)：标记 `day: 7`，但文本说「**一周后**的雨天，林诗雨没有来上学」。从第 6 日晚（sy_10_bad）到「一周后」应该是第 13 日左右，不是第 7 日。
- [xz_11_bad](file:///Users/x/code/gayme/js/script.js#L3666)：标记 `day: 7`，但文本说「**全国赛前一周**，她在雨里独自加练」。全国赛是第 35 日（[xz_12_good](file:///Users/x/code/gayme/js/script.js#L3642)），「全国赛前一周」应该是第 28 日左右，不是第 7 日。
- 这两处 day 字段会让流程图和存档时间线记录错误。

### 1.4 d3_stethoscope 时段标记错误 ★

- [d3_stethoscope](file:///Users/x/code/gayme/js/script.js#L676) 标记 `time: "noon"`（中午），但前文 [common_day3_morning](file:///Users/x/code/gayme/js/script.js#L626) 说「运动会预选今天**下午**开始」，[d3_noon_6](file:///Users/x/code/gayme/js/script.js#L829) 也明确是中午操场场景，预选刚结束。夏织跑完坐下喘气应是**午后（afternoon）**，不是 noon。

### 1.5 d4_noon_5 同时推送第 3 日和第 4 日的朋友圈 ★

- [d4_noon_5](file:///Users/x/code/gayme/js/script.js#L1055)：`moment: ["m_d4_shiyu", "m_d3_group"]`
- [m_d3_group](file:///Users/x/code/gayme/js/script.js#L235) 文本为「**今天**林诗雨和苏念跑来接我」——这是第 3 日运动会后夏织的动态。
- 在第 4 日中午同时显示「今天……」的第 3 日动态，「今天」语义错位。

---

## 二、学姐身份的根本矛盾

### 2.1 学姐到底还在不在樱海？★★★★★

学姐是全剧最关键的角色（留信人、循环引路人、真结局委托人），但她的存在状态前后矛盾：

- [true_3](file:///Users/x/code/gayme/js/script.js#L3770)：学姐亲口说「三年前，我也是转学生。我三条路都走了一半，**最后休了学**。我以为我会回来，结果没回」——明确**已休学离开樱海**。
- [afterword_reply_arrival](file:///Users/x/code/gayme/js/script.js#L3918)：学姐从「新城市」寄回明信片——也支持「已离开」。
- **但在共通线和长玩法链里，学姐反复以实体身份出现在樱海**：
  - [d2_senior_easter](file:///Users/x/code/gayme/js/script.js#L400)：第 2 日，学姐在旧校舍后面和主角对话。
  - [d2_loop_senior](file:///Users/x/code/gayme/js/script.js#L393)：第 2 日，学姐在走廊和主角对话。
  - [d3_tarot](file:///Users/x/code/gayme/js/script.js#L526)：第 3 日早上，学姐在走廊给主角占卜。
  - [d5_hourglass](file:///Users/x/code/gayme/js/script.js#L1971)：第 5 日，学姐把沙漏放到桌上。
  - d6_lock/d6_origami/d8_telegraph 等长玩法链节点里「她」多次出现，部分明确是学姐。
- **核心矛盾**：如果学姐三年前休学离开，她为什么能在樱海反复出现？如果她是鬼魂/超自然存在，后日谈的明信片是怎么寄的？如果她其实没离开，「休了学」又是什么意思？
- 这是剧情的**地基性矛盾**，会让玩家对整个故事的真实性产生怀疑。

### 2.2 学姐为什么不自己回信？★★★★

- [true_5](file:///Users/x/code/gayme/js/script.js#L3772)：学姐说「请你替我回最后一封信」。
- 但学姐在 d2_senior_easter、d3_tarot、d5_hourglass 等节点都能和主角面对面交流——她明明可以自己回信，为什么要主角「替」她回？
- 如果答案是「学姐已经不在了，那些互动是记忆/超自然投影」，剧情里没有任何明确提示。

---

## 三、时间循环机制不清晰

### 3.1 循环触发条件从未说明 ★★★★

- [prologue_1](file:///Users/x/code/gayme/js/script.js#L268) 的 `loopText` 列出了第 2、3、4、5 次循环的开场白，暗示循环会多次发生。
- 但**整部剧本从未说明循环何时触发、何时重置**。玩家通关一次后 `playCount >= 1`，d2_choice 解锁二周目选项——但这是**游戏外**的机制，不是**剧情内**的循环。
- `loopCount` 和 `playCount` 的关系也没有在剧情里交代。

### 3.2 「樱花信」合成的鸡蛋悖论 ★★★★

- [true_break_loop](file:///Users/x/code/gayme/js/script.js#L3806) 需要 `requires_compose: "樱花信"` 才能解锁打破循环的选项。
- 「樱花信」=「祭信」+「未寄信」（[COMPOSE_RECIPES](file:///Users/x/code/gayme/js/script.js#L169)）。
- 「祭信」=「樱花祭」+「回信」——这两个关键词。
- 「未寄信」=「匿名信」+「学姐」——这两个关键词。
- **问题**：「樱花祭」和「回信」这两个关键词，[true_end_entry](file:///Users/x/code/gayme/js/script.js#L3762) 才以 `keyword: ["学姐", "樱花祭", "回信"]` 一次性发放。
- 也就是说，**要进入真结局入口才能拿到合成原料，但要打破循环又必须先合成「樱花信」**——这是先有鸡还是先有蛋的悖论。
- 除非玩家在**前几周目**就拿到了这些关键词（但代码里没看到其他发放点），否则真结局的破环路径根本走不通。

### 3.3 真结局要求三女主 GOOD 全通，但主角为什么能同时帮三人？★★★

- [hasAllGoodEndings](file:///Users/x/code/gayme/js/script.js#L4203)：要求三女主 GOOD 全通才能进真结局。
- 但每次游戏第 5 日只能选一条路线（[d5_route_check](file:///Users/x/code/gayme/js/script.js#L3494)），三线互斥。
- [true_4](file:///Users/x/code/gayme/js/script.js#L3771)：学姐说「三个人，你都让他们敢了」——暗示主角在一次循环里同时帮了三人。
- **矛盾**：个人线互斥，主角不可能在一次循环里同时走三条线。除非循环允许主角综合多次记忆，但这个机制在剧情里没有任何说明。

---

## 四、角色行为不合理

### 4.1 林诗雨半夜进男生宿舍 ★★★★

- [d4_touch](file:///Users/x/code/gayme/js/script.js#L1127)：第 4 日晚，「门被轻轻推开。林诗雨站在门口，抱着稿纸……她看上去眼睛红红的」。
- [d4_temperature](file:///Users/x/code/gayme/js/script.js#L1154)：林诗雨坐到窗边和主角聊温度。
- **问题**：这是高中住校设定，女生半夜进男生宿舍极不合理，也违反一般校规。即便樱海学园管理宽松，这一幕也缺乏任何前置铺垫（如「舍管睡了」「她有特殊理由」）。

### 4.2 第 1 日夜就和林诗雨在天台看星星 ★★★

- [d1_night_stars](file:///Users/x/code/gayme/js/script.js#L629)：第 1 日夜，林诗雨指星星。
- 但序章里主角刚转学第一天，和林诗雨只在走廊和教室有过简短交流。
- **问题**：第一天晚上就和班长单独在天台看星星，情感推进过快，缺乏铺垫。

### 4.3 夏织「自己报名」全国赛 ★★★

- [xz_4](file:///Users/x/code/gayme/js/script.js#L3593)：「教练上周辞退我了」。
- [xz_9](file:///Users/x/code/gayme/js/script.js#L3619)：「全国赛下个月。**我自己报名的**，没教练」。
- **问题**：全国赛一般由学校或体育局组织，需要教练和学校名额。教练以「发挥不稳定」辞退她后，她怎么能以个人身份报名参加**全国赛**？这个设定不符合现实赛事规则。

### 4.4 沈屿父母冷战三个月，第 1 日夜就和好 ★★

- [prologue_2](file:///Users/x/code/gayme/js/script.js#L281)：「父亲说工作调动，母亲说随你便。两个人已经冷战三个月」。
- [d1_night_home](file:///Users/x/code/gayme/js/script.js#L668)：第 1 日夜，父亲发「住得还习惯吗」，母亲问「晚上吃了吗」，「冷战没有立刻结束，但我们终于重新说上了话」。
- **问题**：冷战三个月，孩子住校第一天就互相发消息破冰，节奏过快。虽然文本承认「没有立刻结束」，但「终于重新说上了话」仍显得太顺利。

### 4.5 林诗雨「压了我十七年」★★

- [sy_7](file:///Users/x/code/gayme/js/script.js#L3532)：「那方式压了我十七年」。
- **问题**：林诗雨 17 岁（高二），「压了十七年」意味着从出生就被压——婴儿不会被「方式」压。应改为「压了我整个成长过程」或「压了我十几年」。

---

## 五、苏念设定的内部矛盾

### 5.1 「卡在草稿里三年」与「去年省展拿金奖」★★★

- [d2_art_5](file:///Users/x/code/gayme/js/script.js#L449)：「从**去年**省展拿了金奖之后，我就再没完成过一幅。他们说我是天才。可天才不该卡在草稿里**三年**」。
- [sn_4](file:///Users/x/code/gayme/js/script.js#L3679)：「省展邀请函上个月寄来……我答应了，然后撕了四十七张草稿」。
- **矛盾**：如果「去年」还拿了金奖，那她至少去年是能完成作品的。卡住的时间应该是「一年」左右，不是「三年」。
- 除非理解为「哥哥三年前去世 → 开始画紫色 → 去年凭紫色作品拿金奖 → 之后卡住」——但即便如此，「卡在草稿里三年」的表述也是错误的，应为「卡了一年」或「卡在草稿里」。

### 5.2 省展邀请 vs 学园祭展出 ★★

- [d4_sunian_3](file:///Users/x/code/gayme/js/script.js#L1012)：苏念说「学园祭的展出作品得先交。**省展邀请要的是另一幅新作**，不能拿这幅顶上」。
- [sn_13_good](file:///Users/x/code/gayme/js/script.js#L3731)：「这是省展的新作，**和学园祭已经完成的那幅不是同一张**」。
- **问题**：剧情明确区分了两幅画，但**学园祭从未实际发生**（见 1.1），所以「学园祭已完成的那幅」在剧情里根本不存在——玩家从未见过苏念完成学园祭的作品。

---

## 六、长玩法链的「她」指代模糊

### 6.1 第 4–15 日长玩法链里「她」是谁？★★★

- d4_breath / d4_fold / d4_reflection / d4_lightdraw / d4_tea / d4_astronomy / d4_dice / d4_wind / d4_decode / d4_rain / d4_tealeaf / d4_shadow / d4_candle / d4_dial 等节点，文本里反复出现「她说」「她递来」「她拉你」。
- [d4_temperature](file:///Users/x/code/gayme/js/script.js#L1154) 明确「她」是林诗雨。
- [d5_hourglass](file:///Users/x/code/gayme/js/script.js#L1971) 明确「她」是学姐。
- [d5_palette](file:///Users/x/code/gayme/js/script.js#L1482) 明确「她」是苏念。
- **问题**：同一条玩法链里，「她」在不同节点指代不同的人，但没有任何过渡或说明，玩家极易混淆。尤其学姐在长玩法链里反复出现，与「三年前已休学」的设定冲突（见 2.1）。

### 6.2 主角在长玩法链里不用上学 ★★

- 这 11 天（第 4–15 日）主角每天和「她」玩占卜/骰子/风筝/罗盘/星图/万花筒/算盘/齿轮/等高线/日晷/染缸/风车/编织/镜面/灯笼/波纹/马赛克/碑帖/星轨/鼓点/风向标/漏刻/拼图/棋局/旗阵……
- **问题**：主角是高二转学生，这 11 天他不用上课、不用见三女主、不用参加学园祭。这段长玩法链在现实层面完全缺乏交代。

---

## 七、真结局与后日谈的其他问题

### 7.1 「替学姐回信」的对象不明 ★★

- [true_break_4](file:///Users/x/code/gayme/js/script.js#L3815)：主角在樱花树下写信，「替学姐回信，也写给自己」。
- **问题**：学姐一直能和主角面对面交流（见 2.1），为什么需要主角「替」她回信？这封信是写给谁的？如果是写给学姐自己，学姐为什么不能自己写？

### 7.2 后日谈时间跨度里三女主状态交代不足 ★

- [afterword_three](file:///Users/x/code/gayme/js/script.js#L3851)：樱花祭后第三天，三人开始做具体的事。
- [afterword_autumn](file:///Users/x/code/gayme/js/script.js#L3989)：半年后（秋天），回信角。
- [afterword_wall](file:///Users/x/code/gayme/js/script.js#L4103)：又过半年（毕业前），留言墙。
- **问题**：从春天到毕业约一年，三女主的个人成长（林诗雨是否继续写小说、夏织是否还在跑、苏念是否完成省展）只在 [afterword_three](file:///Users/x/code/gayme/js/script.js#L3851) 一句话带过，缺乏与各人 GOOD 结局后续的呼应。

---

## 八、其他细节

### 8.1 循环专属剧情的解锁门槛过高 ★

- [d2_choice](file:///Users/x/code/gayme/js/script.js#L353) 的 `loopChoice` 要求 `minLoop: 1` 或 `minLoop: 2`，且 `requires_memory` 还要特定记忆。
- [d2_senior_easter](file:///Users/x/code/gayme/js/script.js#L400) 要求 `playCount >= 1`。
- **问题**：这些二周目+内容需要玩家多次通关才能看到，但循环机制本身没有剧情说明（见 3.1），玩家可能根本不知道有这些内容。

### 8.2 d5_route_check 的选项缺乏前置引导 ★

- [d5_route_check](file:///Users/x/code/gayme/js/script.js#L3494)：「这个周末，去见谁？」三选一。
- **问题**：这是决定整条个人线的重大选择，但前置只有 [common_day5_morning](file:///Users/x/code/gayme/js/script.js#L3493) 一句「我爬上天台透气」。玩家没有任何心理铺垫就要做决定。

### 8.3 「樱花祭」关键词的发放时机 ★

- KEYWORDS 里「樱花祭」=「学园最后的春夜」。
- 但 [true_end_entry](file:///Users/x/code/gayme/js/script.js#L3762) 才发放「樱花祭」关键词。
- **问题**：樱花祭作为「学园最后的春夜」，本应在共通线学园祭场景里就让玩家获得这个关键词，而不是拖到真结局入口。

---

## 修复优先级建议

| 优先级 | 问题 | 建议 |
|--------|------|------|
| P0 | 1.1 学园祭从未发生 | 补一场学园祭实际场景（共通线第 11 日左右），让三女主的约定兑现，并发放「樱花祭」「回信」关键词 |
| P0 | 2.1 学姐身份矛盾 | 明确学姐是「已离开但通过信件投影」还是「仍在樱海」，统一所有互动节点的设定 |
| P0 | 3.2 樱花信合成悖论 | 在共通线学园祭场景发放「樱花祭」「回信」关键词，让玩家能在真结局前合成「祭信」 |
| P1 | 1.2 长玩法链时间混乱 | 在 d5_rewind 和 d15_rewind 增加文本说明这 11 天是「循环内的超自然体验」而非现实日程 |
| P1 | 1.3 BAD 结局 day 字段错误 | 修正 sy_11_bad 为 day:13 左右、xz_11_bad 为 day:28 左右 |
| P1 | 4.1 林诗雨半夜进男生宿舍 | 改为「林诗雨在图书馆留到很晚，主角去找她」或增加舍管/女宿铺垫 |
| P2 | 5.1 苏念「卡三年」与「去年金奖」 | 统一为「卡了一年」或「卡在草稿里」 |
| P2 | 3.3 真结局三线全通的剧情解释 | 在 true_end_entry 增加旁白说明「主角在多次循环里分别帮了三人，这次是最终循环」 |
| P2 | 6.1 长玩法链「她」指代模糊 | 在每个节点明确 char 字段或文本中点名 |
| P3 | 1.4 d3_stethoscope 时段 | noon → afternoon |
| P3 | 1.5 d4_noon_5 朋友圈时序 | 移除 m_d3_group 或改其文本去掉「今天」 |
| P3 | 4.5 林诗雨「压了十七年」 | 改为「压了我整个成长过程」 |
| P3 | 4.4 父母冷战破冰太快 | 在 d1_night_home 增加主角主动联系的动机 |
| P3 | 8.2 d5_route_check 缺乏前置 | 在 common_day5_morning 增加三女主各自的邀约铺垫 |

---

## 已被 docs 确认修复但仍需复核的点

- [v2.7.7-story-consistency.md](file:///Users/x/code/gayme/docs/v2.7.7-story-consistency.md) 已确认：第 5 日路线由玩家明确选择、时光胶囊在第 5 日起雾场景交付、苏念学园祭作品与省展新作明确为两幅画、三条个人线「一个月后」统一落在第 35 日。
- 但该文档**未提及学园祭缺失、学姐身份矛盾、樱花信合成悖论**——这三项是本轮梳理新发现的最严重问题。
