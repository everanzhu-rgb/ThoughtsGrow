CREATE TABLE IF NOT EXISTS `base_node_questions` (
  `id` text PRIMARY KEY NOT NULL,
  `node_id` text NOT NULL,
  `question` text NOT NULL,
  `rationale` text DEFAULT '' NOT NULL,
  `trigger` text DEFAULT '' NOT NULL,
  `completion` text DEFAULT '' NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS `base_node_questions_node_idx` ON `base_node_questions` (`node_id`);

CREATE TABLE IF NOT EXISTS `record_folders` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `parent_id` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS `record_folder_links` (
  `id` text PRIMARY KEY NOT NULL,
  `folder_id` text NOT NULL,
  `record_id` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS `record_folder_links_folder_idx` ON `record_folder_links` (`folder_id`);
CREATE INDEX IF NOT EXISTS `record_folder_links_record_idx` ON `record_folder_links` (`record_id`);

INSERT OR IGNORE INTO `base_nodes` (`id`,`space_id`,`parent_id`,`node_type`,`title`,`content`,`operational_json`,`sort_order`) VALUES
  ('meta-clarify','meta-core',NULL,'method','标准化定位','先界定任务、概念和表达，使问题进入可讨论、可检验的状态。','{}',70),
  ('meta-clarity','meta-core','meta-clarify','method','清晰性','用定义、复述和例子消除含混；能说清自己究竟在谈什么。','{}',71),
  ('meta-precision','meta-core','meta-clarify','method','精确性','从笼统判断继续追问范围、程度、时间、对象和可观察细节。','{}',72),
  ('meta-essence','meta-core',NULL,'method','本质洞察','穿过表面表述，识别现象背后的核心概念、机制与第一性约束。','{}',80),
  ('meta-depth','meta-core','meta-essence','method','深度','追问原因、机制、困难与隐含前提，避免停留在第一层解释。','{}',81),
  ('meta-pattern','meta-core',NULL,'method','模式识别','寻找分类、相似案例、差异和跨情境可复用的结构。','{}',90),
  ('meta-relevance','meta-core','meta-pattern','method','相关性','检查信息是否真正帮助回答核心问题，区分关键线索与噪音。','{}',91),
  ('meta-breadth','meta-core','meta-pattern','method','广度','主动寻找其他立场、学科视角、尺度和替代解释。','{}',92),
  ('meta-reasoning','meta-core',NULL,'method','分析推理','把证据、前提与结论连接成可复查的推理链，并说明每一步怎样移动。','{}',100),
  ('meta-accuracy','meta-core','meta-reasoning','method','准确性','核验事实、来源与推断边界，让关键判断能够被复查。','{}',101),
  ('meta-logic','meta-core','meta-reasoning','method','逻辑性','检查结论是否由前提支持、各部分是否一致以及是否存在跳步。','{}',102),
  ('meta-value','meta-core',NULL,'method','价值评估','比较重要性、公正性和后果，说明判断服务于谁、牺牲什么。','{}',110),
  ('meta-importance','meta-core','meta-value','method','重要性','从众多事实中识别真正改变判断或行动的关键变量。','{}',111),
  ('meta-fairness','meta-core','meta-value','method','公正性','检查利益、立场和双重标准，公平呈现强有力的反方观点。','{}',112);

INSERT OR IGNORE INTO `base_node_questions` (`id`,`node_id`,`question`,`rationale`,`trigger`,`completion`,`sort_order`) VALUES
  ('q-clarity-1','meta-clarity','如果要让一个完全不了解背景的人听懂，我需要定义什么、举什么例子？','用费曼式复述暴露概念中的模糊地带。','概念或判断含混时','给出定义、自己的复述和至少一个例子',60),
  ('q-precision-1','meta-precision','这里的对象、范围、程度和时间具体是什么？','把宽泛表达拆成可观察的限定条件。','出现笼统词时','关键限定词已经补齐',70),
  ('q-depth-1','meta-depth','这个现象背后的机制是什么，结论依赖哪些更深层条件？','从现象向机制和条件继续下钻。','解释停留在表面相关性时','至少形成一条可检验的机制链',80),
  ('q-relevance-1','meta-relevance','这条信息究竟帮助回答核心问题的哪一部分？','迫使每条证据与问题建立明确连接。','材料很多但主线模糊时','能说明保留或删除每条信息的理由',90),
  ('q-breadth-1','meta-breadth','换一个立场、学科或时间尺度，会得到什么不同解释？','系统性打开视角。','解释过早收敛时','至少形成一个有依据的替代解释',100),
  ('q-accuracy-1','meta-accuracy','我怎样验证这条信息，它是事实、解释还是推测？','把准确性变成来源核验和类型标注两个动作。','关键判断依赖外部信息时','来源可复查且事实与推断已分开',110),
  ('q-logic-1','meta-logic','从这些前提到这个结论，中间是否缺少一步？','把直觉跳跃改写成显式推理连接。','出现结论词时','每个结论都能指出其前提和推理规则',120),
  ('q-importance-1','meta-importance','如果只能保留三个变量，哪些最可能改变最终判断？','通过反事实删减识别真正关键的信息。','信息很多且权重不明时','关键变量及其影响方向清楚',130),
  ('q-fairness-1','meta-fairness','我是否能用对方会认可的方式陈述最强反方观点？','用钢人化检验立场偏差和双重标准。','涉及利益或价值冲突时','反方观点被准确呈现且标准一致',140);
