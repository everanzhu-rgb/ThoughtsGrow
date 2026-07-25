CREATE TABLE `base_spaces` (`id` text PRIMARY KEY NOT NULL,`name` text NOT NULL,`kind` text DEFAULT 'domain' NOT NULL,`description` text DEFAULT '' NOT NULL,`scope` text DEFAULT '' NOT NULL,`status` text DEFAULT 'active' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE TABLE `base_nodes` (`id` text PRIMARY KEY NOT NULL,`space_id` text NOT NULL,`parent_id` text,`node_type` text DEFAULT 'method' NOT NULL,`title` text NOT NULL,`content` text DEFAULT '' NOT NULL,`operational_json` text DEFAULT '{}' NOT NULL,`sort_order` integer DEFAULT 0 NOT NULL,`status` text DEFAULT 'active' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE TABLE `base_node_links` (`id` text PRIMARY KEY NOT NULL,`from_node_id` text NOT NULL,`to_node_id` text NOT NULL,`relation` text DEFAULT 'related' NOT NULL,`label` text DEFAULT '' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE TABLE `record_node_links` (`id` text PRIMARY KEY NOT NULL,`record_id` text NOT NULL,`node_id` text NOT NULL,`relation` text DEFAULT 'source' NOT NULL,`note` text DEFAULT '' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE TABLE `integration_proposals` (`id` text PRIMARY KEY NOT NULL,`record_id` text NOT NULL,`status` text DEFAULT 'draft' NOT NULL,`proposal_json` text DEFAULT '{}' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE TABLE `base_versions` (`id` text PRIMARY KEY NOT NULL,`space_id` text NOT NULL,`version_number` integer DEFAULT 1 NOT NULL,`title` text NOT NULL,`summary` text DEFAULT '' NOT NULL,`snapshot_json` text DEFAULT '{}' NOT NULL,`source_record_ids_json` text DEFAULT '[]' NOT NULL,`status` text DEFAULT 'published' NOT NULL,`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
--> statement-breakpoint
CREATE INDEX `base_nodes_space_idx` ON `base_nodes` (`space_id`);
--> statement-breakpoint
CREATE INDEX `record_node_links_record_idx` ON `record_node_links` (`record_id`);
--> statement-breakpoint
CREATE INDEX `integration_record_idx` ON `integration_proposals` (`record_id`);
--> statement-breakpoint
CREATE INDEX `base_versions_space_idx` ON `base_versions` (`space_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `base_spaces` (`id`,`name`,`kind`,`description`,`scope`) VALUES ('meta-core','万象思维基座','meta','负责跨领域的问题界定、证据判断、推理、反思与修正。','所有需要理解、判断、决策与创造的情境'),('domain-research','科研与学术','domain','以研究问题、证据链、方法边界和学术交流为核心的领域基座。','研究设计、论文阅读、学术写作与科研决策'),('domain-humanities','人文与历史','domain','理解文本、历史语境、价值冲突与多重解释。','历史、人文、文化与社会思想');
--> statement-breakpoint
INSERT OR IGNORE INTO `base_nodes` (`id`,`space_id`,`node_type`,`title`,`content`,`operational_json`,`sort_order`) VALUES
('meta-purpose','meta-core','principle','先明确目的与问题','在搜集信息和评价观点之前，先说明自己究竟想理解、判断或解决什么。','{}',10),
('meta-evidence','meta-core','method','区分事实、观点与推断','把文本中的可核验事实、价值判断和由事实推出的解释分开，避免把推测当成事实。','{}',20),
('meta-assumption','meta-core','method','找出结论依赖的假设','追问结论要成立，哪些没有明说的条件必须同时为真。','{}',30),
('meta-perspective','meta-core','principle','寻找其他解释与立场','主动构建能够解释同一事实的替代观点，并检查自己的利益与立场。','{}',40),
('meta-consequence','meta-core','method','比较结果与意义','同时检查短期与长期、直接与间接、预期与非预期后果。','{}',50),
('meta-playbook','meta-core','playbook','从问题到暂定结论','一套面向初学者的通用思考流程。','{"steps":[{"title":"明确任务","question":"我现在究竟要理解、判断还是决定什么？","why":"不同任务需要不同证据。","done":"能用一句话说清核心问题"},{"title":"整理已知","question":"哪些是文本直接提供的事实，哪些只是观点或推断？","why":"先分层，才能避免用推测支撑推测。","done":"事实与推断已经分开"},{"title":"补出前提","question":"这个结论成立还依赖哪些没有说出的条件？","why":"隐含假设是推理最常断裂的地方。","done":"至少找到一个可验证前提"},{"title":"打开视角","question":"还有什么不同解释？谁会不同意，理由是什么？","why":"替代解释可以检验当前解释是否过早。","done":"形成一个有根据的替代观点"},{"title":"形成暂定判断","question":"在现有证据下，最稳妥的结论和保留条件是什么？","why":"好的判断允许未来证据继续修正。","done":"结论同时包含证据、信心与修正条件"}]}',60);
