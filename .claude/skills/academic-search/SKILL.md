---
name: academic-search
description: |
  学术论文搜索、引用分析、开放获取 PDF 判定与结构化元数据提取专用 Skill。Use when the user asks to search/find papers, do literature review/survey/systematic review/PRISMA work, get citation counts, export BibTeX/RIS-style references, find papers by author, inspect PDF/open-access availability, or work with arXiv, Semantic Scholar, OpenAlex, Crossref, Unpaywall, PubMed, Google Scholar, ACM DL, IEEE Xplore, Papers with Code, CNKI, ScienceDirect, Wiley, Springer, ACS, MeSH, JEL, MSC, or ACM CCS.
  特别适合生物学、园艺学、植物科学、农学、生态学等生命科学领域的文献检索与综述撰写。
  触发词：文献检索、论文搜索、搜索论文、查找文献、引文搜索、引用分析、影响因子、文献综述、系统综述、meta分析、paper search、find papers、search literature、literature review、systematic review、citation analysis、impact factor、BibTeX导出、参考文献管理。
metadata:
  version: "2.0.0"
---

# academic-search Skill

> 面向生物学/植物科学优化的全学科学术搜索引擎。纯 curl API 驱动，无需浏览器、无需 API Key 即可使用。

## 前置检查

```bash
bash ~/.claude/skills/academic-search/scripts/check-deps.sh
```

仅需两个工具：
- **curl**（必需）：所有 API 调用的基础
- **Node.js**（可选）：仅用于 OA PDF 批量下载脚本；纯搜索不需要

**API Key（可选，非必需）**：
- 所有平台 API 均可无 Key 使用，但部分平台有速率限制
- **Semantic Scholar**：无 Key 约 100 req/5min；有 Key 1 req/s。免费注册获取：https://www.semanticscholar.org/product/api#api-key-form，请求头加 `x-api-key: {your_key}`
- **NCBI/PubMed**：无 Key 可用，有 `api_key` 参数可提升速率（https://www.ncbi.nlm.nih.gov/account/settings/）
- **OpenAlex**：无需 Key，建议设 `User-Agent` 含 email 以获 polite pool（更高速率）

## 搜索哲学

**明确目标 → 选对平台 → 提取结构化数据 → 完成即止。**

学术搜索的目标是获取**准确、结构化**的论文元数据，而非浏览网页。

**① 明确检索目标，定义成功标准**：

- 检索类型：关键词搜索？精确论文？某作者全部论文？某 venue 论文列表？
- 学科判断：是否需要 MeSH（医学）、JEL（经济）、MSC（数学）、ACM CCS（计算机）等受控词表？
- 文献类型：期刊论文、会议论文、预印本、系统综述、临床试验、工作论文、专著/章节？
- 所需字段：仅标题和引用数 / 完整元数据 / PDF / BibTeX / 代码链接？
- 约束条件：年份范围？领域限定？返回数量？
- **成功标准**：用户要的是摘要表还是完整元数据？数量够了吗？字段齐全吗？

**② 选对平台**：不同需求对应不同平台（见下方矩阵）。优先使用 curl 调 API。

**③ 先筛后深**（两遍策略）：

- **第一遍（轻量扫描）**：拉 20-30 条结果，输出轻量摘要表（标题、作者、年份、venue、引用数、是否有 OA PDF/代码），不拉完整摘要
- **第二遍（深度获取）**：确认核心论文后，再拉摘要、PDF、BibTeX 等完整信息

所有结果按 `references/metadata-schema.md` 定义的标准 schema 输出。多平台结果用 DOI/arXiv ID/PMID 去重合并。

**④ 过程校验**：

| 失败信号 | 含义 | 方向调整 |
|---------|------|---------|
| API 429 / Rate exceeded | 速率超限 | 等待 15s+ 或换平台；不重复同一请求 |
| S2 返回空结果 | query 措辞或平台无收录 | 换关键词组合，或换 arXiv/PubMed |
| 平台返回"不存在" | 可能是访问方式问题 | 检查 URL 参数，换平台验证 |
| 同一方式重试 3 次无改善 | 路径错了 | 重新评估目标，换平台/关键词 |
| 出版商 403/Cloudflare | bot 防护 | 不重试，改用 OpenAlex/Unpaywall 查 OA 版本 |

**⑤ 完成判断**：对照成功标准确认后停止。

**⑥ Web Search 兜底**：当所有 API 都无法找到目标论文时，使用 web_search 工具作为最后手段——搜索论文标题 + 作者名，从搜索结果中提取 DOI 或平台链接，再回到 API 获取结构化数据。

## 平台选择矩阵

| 需求 | 首选平台 | 访问方式 | 备注 |
|------|---------|---------|------|
| **生物学/植物科学/园艺学/农学** | **PubMed + OpenAlex** | curl API | PubMed 覆盖生命科学最全；OpenAlex 补充农学/生态学期刊 |
| 生物医学、生命科学 | **PubMed** | NCBI E-utilities | 完全开放，支持 MeSH 受控词表 |
| 生物预印本 | **bioRxiv / medRxiv** | curl API | Europe PMC 统一入口 |
| CS/Math/Physics/统计 | **arXiv** | REST API | 完全开放，PDF 直链 |
| 引用数、引用/被引关系 | **Semantic Scholar** | REST API | 可选 Key 提升速率 |
| 作者主页、全部论文 | **Semantic Scholar** | REST API | /author/{id}/papers |
| 跨学科 DOI / 元数据核对 | **Crossref** | REST API | DOI、期刊、出版商、ISSN |
| 跨学科作者/机构/概念/引用 | **OpenAlex** | REST API | S2 的跨学科补充，覆盖面极广 |
| 开放获取状态 / OA PDF | **Unpaywall** | REST API | 判断 gold/green/hybrid/closed OA |
| ML 论文 + 代码仓库 | **Papers with Code** | REST API | 无需鉴权 |
| ACM 顶会论文 | **ACM DL** | WebFetch + Jina | BibTeX 端点可直接访问 |
| IEEE 期刊/会议论文 | **IEEE Xplore** | WebFetch / Jina | 有机构 Key 时用官方 API |
| 广泛引用数 / 全平台覆盖 | **Google Scholar** | web_search 兜底 | 无 API，用 web_search 间接获取 |
| **中文文献** | **OpenAlex + web_search** | curl + web_search | OpenAlex 收录部分中文期刊；CNKI/万方需手动 |

详细 API 调用模板见 `references/api-cookbook.md`。

## 学科路由

先按用户问题判断学科，再读取对应 `references/disciplines/*.md`。跨学科时优先读最核心学科的 profile，再用 OpenAlex / Crossref 做补全。

| 学科 | 读取文件 | 首选方向 |
|------|----------|----------|
| **生物学 / 植物科学 / 园艺 / 农学 / 生态学** | `references/disciplines/biomedicine.md` | PubMed、OpenAlex、Europe PMC、bioRxiv、Crossref |
| 计算机 / AI | `references/disciplines/computer-science.md` | arXiv、Semantic Scholar、ACM DL、Papers with Code |
| 医学 / 临床 | `references/disciplines/biomedicine.md` | PubMed、PMC、ClinicalTrials、medRxiv |
| 物理 / 数学 | `references/disciplines/physics-math.md` | arXiv、NASA ADS、INSPIRE HEP |
| 化学 / 材料 | `references/disciplines/chemistry-materials.md` | Crossref、OpenAlex、ChemRxiv、ACS |
| 经济 / 社科 | `references/disciplines/economics-social-science.md` | RePEc、NBER、SSRN、JEL |
| 人文 / 法律 | `references/disciplines/humanities-law.md` | web_search、Crossref |

学科 profile 决定 query expansion、排序标准、输出字段和全文访问边界。不要把 CCF 或 CS 顶会规则套到非 CS 学科。

### 🌿 生物学/植物科学专用搜索策略

本 Skill 为 bioweb 项目优化，以下为植物科学/园艺学/农学领域的检索建议：

**常用 MeSH 词表与关键词扩展**：

| 研究方向 | 推荐关键词组合 | 推荐 MeSH 术语 |
|---------|---------------|----------------|
| 果树育种 | fruit breeding, pomology, cultivar selection | Plants, Genetically Modified; Hybridization, Genetic; Fruit |
| 植物基因组学 | plant genomics, genome-wide association, QTL mapping | Genome, Plant; Quantitative Trait Loci; Gene Expression Regulation, Plant |
| 园艺栽培 | horticultural crops, cultivation, postharvest | Horticulture; Crops, Agricultural; Food Handling |
| 植物逆境 | abiotic stress, drought tolerance, salt stress | Stress, Physiological; Droughts; Plant Diseases |
| 分子标记 | molecular marker, SSR, SNP, AFLP | Microsatellite Repeats; Polymorphism, Single Nucleotide; Genetic Markers |
| 植物病理 | plant pathology, disease resistance, phytopathogen | Plant Diseases; Disease Resistance; Phytoplasma |
| 转录组/代谢组 | transcriptomics, metabolomics, RNA-seq | Transcriptome; Metabolomics; Gene Expression Profiling |

**推荐期刊（植物科学 Top Venues）**：

| 期刊 | JCR 分区 | 侧重 |
|------|---------|------|
| Nature Plants | Q1 | 植物科学综合顶刊 |
| The Plant Cell | Q1 | 植物细胞与分子生物学 |
| Plant Physiology | Q1 | 植物生理学 |
| New Phytologist | Q1 | 植物生态与进化 |
| Horticulture Research | Q1 | 园艺学 |
| Molecular Plant | Q1 | 植物分子生物学 |
| Plant Biotechnology Journal | Q1 | 植物生物技术 |
| Frontiers in Plant Science | Q1 | 植物科学开放获取 |
| Journal of Experimental Botany | Q1 | 实验植物学 |
| Tree Genetics & Genomes | Q2 | 林木遗传 |
| Scientia Horticulturae | Q1/Q2 | 园艺科学 |
| Postharvest Biology and Technology | Q1 | 采后生物学 |

**中文查询翻译策略**：用户输入中文关键词时，自动翻译为英文学术术语再检索 PubMed/OpenAlex：
- "苹果抗病育种" → `apple disease resistance breeding`
- "桃基因组" → `peach genome Prunus persica`
- "柑橘黄龙病" → `citrus Huanglongbing HLB Candidatus Liberibacter`
- "葡萄花色苷" → `grape anthocyanin Vitis vinifera`
- "番茄转录组" → `tomato transcriptome Solanum lycopersicum`

**物种名注意**：植物学文献通常同时包含普通名和拉丁学名，检索时两者并用效果最佳。

## 核心能力

### 关键词搜索

1. 按"学科路由"读取 discipline profile
2. **扩展 query**：主动展开 2-3 个互补 query：
   - 同义词替换：`agent` → `agentic` / `multi-agent`
   - 子概念拆分：`plant stress` → `abiotic stress tolerance` + `drought resistance` + `salt stress response`
   - 缩写与全称并用：`QTL` / `quantitative trait loci`；`GWAS` / `genome-wide association study`
   - 学科受控词表：医学用 MeSH，植物学加拉丁学名
   - 合并去重后覆盖率比单 query 提升 30-50%
3. 构造查询：arXiv 用 `search_query` 字段前缀；S2 用 `query`；PubMed 用 `term` 布尔表达式
4. **多次 S2 调用时优先用 batch API**（`/paper/batch`），节省速率配额
5. **第一遍输出轻量摘要表**，不默认拉完整摘要
6. 用户明确说"只要前 N 篇"时，直接输出第一遍结果
7. 需要第二遍时，再拉完整元数据

多平台并行查询时，用子 Agent 分治（见"并行分治策略"一节）。

### 默认输出格式

#### 表格格式（多篇，默认）

| # | 文献标题 / Title | 作者 / Authors | 年份 | 期刊/会议 / Venue | 引用数 | DOI | PDF | 影响因子 |
|---|-----------------|---------------|------|-------------------|--------|-----|-----|---------|
| 1 | Attention Is All You Need | Vaswani et al. | 2017 | NeurIPS [CCF-A] | 120,000+ | [DOI](https://doi.org/10.5555/3295222.3295349) | [✓ arXiv](https://arxiv.org/pdf/1706.03762) | — |
| 2 | The Plant Cell Atlas | Smith et al. | 2023 | Nature Plants [Q1] | 45 | [DOI](...) | ✓ OA | IF 15.8 |

**字段说明**：
- **影响因子 (IF)**：从 OpenAlex / Crossref 期刊元数据获取（若 API 返回中有 `cited_by_count` 等可推算的指标则标注来源）；无法获取时标 `—`
- **PDF**：✓ arXiv / ✓ OA / ✓ PMC / ✗ 付费 / — 未知
- **引用数**：来源标注为 S2 / OpenAlex / Crossref

#### 列表格式（详细展示单篇或少量论文）

**📄 论文 1**
- **标题 / Title**：Genome-wide association study of fruit quality in peach
- **作者 / Authors**：Zhang Y, Li X, Wang J, et al.
- **年份**：2023
- **期刊 / Venue**：Horticulture Research [Q1, IF 7.6]
- **摘要 / Abstract**：A genome-wide association study was conducted...
- **DOI**：https://doi.org/10.1093/hr/uhad123
- **PDF 链接**：https://academic.oup.com/hr/article-pdf/...
- **引用数**：28 (Semantic Scholar)
- **开放获取**：✓ Gold OA
- **关键词**：peach, GWAS, fruit quality, Prunus persica

#### 筛选后结论格式

> 共找到 28 篇，按引用数 + 期刊等级筛选后，推荐优先阅读以下 6 篇：[列表]
> 其余 22 篇可按需查阅。

Venue 等级标注规则：CS 参考 `references/venue-rankings.md`（CCF 分级）；生物/医学标注 JCR 分区和 IF；其他学科按 `references/disciplines/*.md` 和 `references/rankings/*.md` 排序。

### 结果筛选

**优先帮用户筛出值得读的论文**：

| 筛选维度 | 数据来源 | 说明 |
|---------|---------|------|
| 引用数阈值 | S2 `citationCount` | 经典论文引用高；新方向适当放低阈值 |
| 发表年份 | 所有平台 | 综述覆盖历史；最新进展限近 2-3 年 |
| Venue 等级 | S2 / OpenAlex + rankings | CS 用 CCF；生物/医学用 JCR 分区 |
| 开放 PDF | ArXiv ID / PMC / OA 状态 | 有 ArXiv ID 就标 ✓ |
| 代码可用性 | Papers with Code | ML 论文自动补代码列 |

**排序建议**：
1. **时效性（最高）**：近 6 个月标 `[新]` 并置顶
2. **引用数（次要）**：同时间段内按引用数降序
3. **学科评价规则（参考项）**：CS 用 CCF；医学用证据等级；植物科学用 JCR 分区 + IF

### 精确论文查找

已知 DOI 或 arXiv ID 时，直接用 Semantic Scholar 精确查询：
```bash
# DOI 查询
curl -s "https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}?fields=title,authors,year,abstract,citationCount,openAccessPdf,externalIds"

# arXiv ID 查询
curl -s "https://api.semanticscholar.org/graph/v1/paper/ARXIV:{arxiv_id}?fields=title,authors,year,abstract,citationCount,openAccessPdf,externalIds"

# PMID 查询（生物医学常用）
curl -s "https://api.semanticscholar.org/graph/v1/paper/PMID:{pmid}?fields=title,authors,year,abstract,citationCount,openAccessPdf,externalIds"
```

### 元数据提取

所有结果转换为 `references/metadata-schema.md` 标准 JSON schema。输出方式：

- **单篇**：列表格式（见上方详细展示）
- **多篇**：表格格式（见上方默认输出）
- **批量导出**：JSON 数组

### BibTeX 导出

根据用户需求生成 BibTeX 引用：

**获取优先级**：
1. **arXiv**：`curl -s "https://arxiv.org/bibtex/{arxiv_id}"` 直接获取
2. **Crossref**：`curl -s "https://api.crossref.org/works/{doi}/transform/application/x-bibtex"` 获取标准 BibTeX
3. **Semantic Scholar**：根据 metadata-schema 模板拼装

**BibTeX 拼装模板**（当 API 无直接端点时）：

```bibtex
@article{citekey,
  title     = {论文标题},
  author    = {Author1, First1 and Author2, First2},
  journal   = {期刊名},
  year      = {2023},
  volume    = {10},
  number    = {3},
  pages     = {123--456},
  doi       = {10.xxxx/xxxxx},
  url       = {https://doi.org/10.xxxx/xxxxx},
  abstract  = {摘要文本}
}
```

**批量 BibTeX 导出**：当用户要求导出多篇论文的 BibTeX 时，逐一获取并合并为一个 `.bib` 文件。citekey 格式：`{第一作者姓}{年份}{标题首词}`，如 `vaswani2017attention`。

### PDF / 全文获取

只获取合法公开全文。按优先级逐步尝试，记录 `full_text_status`：

1. **arXiv PDF 直链**：`externalIds.ArXiv` 存在时 → `https://arxiv.org/pdf/{arxiv_id}`
2. **PubMed Central**：`externalIds.PubMedCentral` 存在时 → `https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/pdf/`
3. **Semantic Scholar openAccessPdf**：读取 `openAccessPdf.url`
4. **OpenAlex OA 检查**（有 DOI 时）：
   ```bash
   curl -s "https://api.openalex.org/works?filter=doi:{doi}&select=id,open_access,best_oa_location" \
     -H "User-Agent: academic-search-skill/2.x (mailto:your@email.com)"
   ```
5. **Unpaywall**（有 DOI 时）：
   ```bash
   curl -s "https://api.unpaywall.org/v2/{doi}?email=your@email.com"
   ```
6. **领域预印本库**：bioRxiv / medRxiv / Europe PMC / EarthArXiv 等
7. **web_search 兜底**：搜索论文标题 + `filetype:pdf` 或 `site:researchgate.net`
8. **告知用户**：无公开 OA → 建议机构图书馆/作者邮件/馆际互借

`full_text_status` 枚举：`open_pdf` | `needs_institution` | `no_open_pdf` | `anti_bot_blocked` | `html_not_pdf` | `unknown`

**学术诚信边界**：不得使用 Sci-Hub、LibGen 等。遇付费墙时报告 `needs_institution`。

### 开放 PDF 下载与 manifest 导出

- 只下载 `full_text_status="open_pdf"` 且存在 `pdf_url` 的论文
- 批量任务先生成 manifest，再确认下载

```bash
node scripts/oa-pdf-download.mjs \
  --input results.json --manifest manifest.json

node scripts/oa-pdf-download.mjs \
  --input results.json --manifest manifest.json \
  --download --out-dir ./pdfs
```

### 作者主页解析

```bash
# Semantic Scholar 作者搜索
curl -s "https://api.semanticscholar.org/graph/v1/author/search?query={author_name}&fields=name,affiliations,paperCount,citationCount"

# 获取作者全部论文（分页）
curl -s "https://api.semanticscholar.org/graph/v1/author/{author_id}/papers?fields=title,year,citationCount,externalIds&limit=100&offset=0"

# OpenAlex 作者搜索（跨学科更全）
curl -s "https://api.openalex.org/authors?search={author_name}&select=id,display_name,works_count,cited_by_count,last_known_institutions"
```

## 系统综述工作流（Systematic Review / PRISMA）

执行系统综述时，遵循 `references/workflows/systematic-review.md` 的完整流程。简要步骤：

### 1. 定义研究问题与纳入标准
- 生物/医学用 **PICO** 框架：Population, Intervention, Comparator, Outcome
- 植物科学示例：P=苹果品种, I=矮化砧木, C=标准砧木, O=产量与果实品质

### 2. 构建检索策略
- 确定 2+ 数据库（PubMed + OpenAlex + Semantic Scholar 等）
- 记录完整检索式（可复现）
- 使用 MeSH 与自由词结合

### 3. 执行检索与筛选
```
检索 → 去重(DOI/PMID/标题) → 标题/摘要初筛 → 全文复筛 → 最终纳入
```

### 4. 输出 PRISMA 流程图数据

```
识别(Identification):  数据库检索 N 篇 + 其他来源 M 篇
去重后:               X 篇
初筛(Screening):       标题/摘要筛选排除 Y 篇（附排除原因）
复筛(Eligibility):     全文评估排除 Z 篇（附排除原因）
最终纳入(Included):    K 篇
```

### 5. 数据提取与质量评估
- 输出结构化数据提取表
- 标注每篇论文的 `full_text_status`
- 提示用户进行风险偏倚评估

**⚠️ 系统综述完整性提示**：仅搜索 1 个数据库、未记录检索式、或存在大量付费全文无法获取时，主动告知用户综述完整性限制。

## 并行分治策略

任务包含多个**独立**目标时，分发子 Agent 并行执行。

**子 Agent Prompt 写法**：
- 必须写：`必须加载 academic-search skill 并遵循指引`
- 描述**目标**（获取/提取/查找），不指定具体步骤
- 说明需要哪些字段

**适合分治**：多平台并发查同一论文、批量查 N 篇不相关论文、多作者主页并行抓取
**不适合分治**：有依赖关系的查询、简单单次 API 调用

去重规则：DOI 为主键 → arXiv ID / PMID 次之 → 标题+年份模糊匹配。

## 信息核实

| 核实目标 | 一手来源 |
|---------|---------|
| 论文元数据 | Crossref、OpenAlex、发表平台官方页 |
| 引用数 | Semantic Scholar > OpenAlex > Crossref |
| 开放获取状态 | Unpaywall > OpenAlex > 出版商页面 |
| 代码实现 | Papers with Code / 论文官方 GitHub |
| 会议/期刊信息 | 主办方官网 |

多平台引用数不一致属正常——收录范围不同。

## 站点经验

按域名存储在 `references/site-patterns/` 下。确定目标平台后，**必须**读取对应文件。经验内容标注发现日期，按经验操作失败时回退通用模式并更新经验文件。

## 输出语言

- **默认中英双语**：字段名用 `中文 / English` 格式
- 用户用中文提问 → 结论和摘要用中文，论文标题保留原文
- 用户用英文提问 → 全英文输出
- 论文原文标题始终保留原文（不翻译）

## References 索引

| 文件 | 何时加载 |
|------|---------|
| `references/api-cookbook.md` | 需要 API 调用示例、参数说明、响应字段映射时 |
| `references/metadata-schema.md` | 整理提取结果、多平台去重合并、生成 BibTeX 时 |
| `references/disciplines/*.md` | 需要按学科选择平台、扩展 query、排序和输出字段时 |
| `references/rankings/*.md` | 需要非 CS 学科证据等级或来源评价规则时 |
| `references/workflows/*.md` | 执行系统综述、核心论文清单、快速综述等研究工作流时 |
| `references/venue-rankings.md` | 标注 CS 会议/期刊等级（CCF 分级）时 |
| `references/site-patterns/{domain}.md` | 确定目标平台后，读取对应站点经验 |
