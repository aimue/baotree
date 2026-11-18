# 功能覆盖与可测量边界清单

## 范围与证据口径

本产品是情感氛围体验小程序。本清单只记录现有标题页，不定义商业 KPI，不建议分析 SDK 或埋点。
本次仅修改文档，不添加采集、网络、持久化或新功能。

源码基线：[140aa275b3c5f8c0142e295c718d7ed6a0e7f24f](https://github.com/aimue/baotree/tree/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f)。以下源码链接固定到该提交。
本次文档提交不修改产品脚本、模板、样式、配置、测试或检查脚本。

证据分为三类：

- **本地状态**：页面内的 `title` 与 `focused`，不是分析事件、用户记录或使用统计。
- **自动化证据**：Node 模拟页面状态与静态约定检查。通过不代表微信运行通过。
- **未验证边界**：微信编译、真实渲染、交互、生命周期及情感效果，不以源码推断代替实测。

## 功能覆盖清单

| 行为 | 现有实现与本地状态 | 现有测试证据 | 证据边界 |
| --- | --- | --- | --- |
| 初始状态 | `title: ''`、`focused: false`；模板显示独立空态。见 [页面脚本 L1–5](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/miniprogram/pages/title/index.js#L1-L5) 与 [模板 L19–20](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/miniprogram/pages/title/index.wxml#L19-L20)。 | [测试 L16–20](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/tests/title.test.cjs#L16-L20) 断言初始字段。 | 不证明微信首屏显示或自动聚焦行为。 |
| 标题输入 | 输入处理器将 `event.detail.value` 原样写入 `title`，不返回替代字符串。见 [脚本 L7–9](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/miniprogram/pages/title/index.js#L7-L9)。 | [测试 L22–39](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/tests/title.test.cjs#L22-L39) 包含七组输入：中文、普通文字、前后及重复空格、纯空格、emoji 与组合字符、超过 140 字符、类似标签与实体。 | 只证明传给处理器的字符串保持相等；不证明输入法组合过程或控件能接收任意长度。 |
| 原文预览 | 输入值与预览绑定同一个 `title`；只有空字符串触发空态，纯空格不是空态。模板使用普通 `text`，`maxlength="-1"` 不设业务长度上限。见 [模板 L3–20](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/miniprogram/pages/title/index.wxml#L3-L20)。 | 状态相等由上述七组测试验证；[检查 L49–67](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/scripts/check-project.cjs#L49-L67) 检查模板片段、换行和最小高度约定。 | 未渲染 WXML/WXSS；不证明实体显示、空白呈现、换行、溢出、性能或完整安全性。 |
| 清空与重新输入 | 现有清空是输入内容变为 `''`，不是独立清空按钮。处理器更新同一 `title`，模板选择空态。 | [测试 L41–47](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/tests/title.test.cjs#L41-L47) 验证连续输入、清空、重新输入五步状态序列。 | 不证明真机删除操作、键盘行为或空态实际渲染。不得将其描述为已实现按钮。 |
| 标签聚焦、聚焦与失焦 | 标签点击及聚焦设 `focused: true`；失焦设 `false`。模板绑定 `focus` 与焦点样式。见 [脚本 L11–21](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/miniprogram/pages/title/index.js#L11-L21)、[模板 L2–12](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/miniprogram/pages/title/index.wxml#L2-L12) 与 [样式 L24–26](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/miniprogram/pages/title/index.wxss#L24-L26)。 | [测试 L57–67](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/tests/title.test.cjs#L57-L67) 验证三个处理器的状态变化，且最终标题不变。 | `focused` 是界面请求/状态，不是键盘可见性或真实控件获焦的证明。 |
| 页面重建 | 页面定义初始标题为空；模板提示“仅当前页面预览，不会保存。”。 | [测试 L49–55](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/tests/title.test.cjs#L49-L55) 验证多个模拟实例不共享标题，新建实例标题为空。 | 模拟实例不等同微信生命周期。未验证退出、返回、后台恢复、进程重启或页面缓存；不能把暂时离开页面等同页面销毁。 |

## 自动化证据如何产生

现有测试直接载入实际页面脚本，用 `runInNewContext` 捕获 `Page`，再用 `Object.assign` 模拟 `setData`。
见 [测试装置 L7–14](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/tests/title.test.cjs#L7-L14)。
它不模拟微信桥接、异步渲染或原生控件。

现有静态检查共六组：项目入口与类型、唯一页面四件套、脚本语法、模板约定、样式约定、当前入口能力限制。
见 [检查脚本](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/scripts/check-project.cjs#L17-L79)。
最后一组使用正则检查产品 JavaScript，并断言无权限声明、插件及依赖；它不是完整解析器或安全审计。
不得从该检查推导微信平台自身没有任何数据处理。

## 本次执行记录

此前仅源码审阅，不计作测试通过。本次实际执行结果如下：

环境：Node.js `v24.22.2`，npm `11.19.1`；测试时文档提交为 `525be02`，产品源码仍为上述固定基线。

| 命令 | 执行时间（Asia/Shanghai，CST / UTC+08:00） | 次数 | 退出码 | 实际结果 |
| --- | --- | --- | --- | --- |
| `npm test` | 2026-11-18 15:40:36 | 1 | 0 | 11 项通过；0 失败、0 跳过、0 取消。 |
| `npm run check` | 2026-11-18 15:40:36–15:40:37 | 1 | 0 | 6 项静态检查通过；未执行微信编译、渲染或真机验证。 |

本次两条计划内命令均通过。11 项测试由初始状态、七组输入、连续输入/清空/重新输入、实例隔离、焦点状态组成。
这不是整体代码覆盖率或微信验收通过率。

本次只复用以上命令，每条执行一次，不新增或重复实现测试、静态检查。
仓库没有第三方依赖，未安装依赖。
测试后只补充文档中的执行记录，未改变可执行文件，也未重跑命令。

## 可测量与不可测量边界

| 对象 | 当前能证实什么 | 当前不能得出什么 |
| --- | --- | --- |
| 本地 UI 状态 | 在测试输入下，`title` 与 `focused` 的具体值及转换。 | 真实用户数量、使用次数、停留时长、使用率或跨页面历史。 |
| 测试结果 | 本次命令通过数、失败数及所执行断言的范围。 | 产品使用率、真实用户体验通过率或整体代码覆盖百分比。未运行覆盖率工具。 |
| 转化 | 当前源码仅有本页输入与预览；没有活动创建或提交链路。 | 转化率、漏斗分母与分子、留存或收入。未定义这些指标，也无对应观测数据。 |
| 情感氛围效果 | 产品定位是体验目标；本次自动化检查功能状态。 | 愉悦、共鸣、情绪改善、满意度或因果效果。通过测试不代表情感效果成立。 |

这些不可测量项是本次交付边界，不是待补埋点需求。
本清单不要求公司 KPI、分析平台、用户身份或额外采集；也不建立生产数据基线。

## 微信运行验证边界：尚未验证

本次不运行微信开发者工具或真机验证。仓库配置没有 AppID，不能凭空填写身份。
Node 检查不能替代微信编译。见 [项目配置](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/project.config.json) 与 [现有运行验收说明](https://github.com/aimue/baotree/blob/140aa275b3c5f8c0142e295c718d7ed6a0e7f24f/README.md#L19-L44)。

以下项目全部保留“未验证”，不计入 Node 通过结果：

- 微信开发者工具导入、WXML/WXSS 编译及基础库兼容。
- 浅色界面空态、普通标题、纯空白、特殊字符、长标题的真实显示与换行。
- 中文输入法、连续输入、删除清空及重新输入。
- 标签点击后的真实聚焦、失焦、焦点边框与键盘显示。
- 键盘遮挡、滚动、安全区、性能及运行日志。
- 微信页面销毁后重建，以及返回、后台恢复等实际生命周期差异。

后续如执行微信验收，应记录工具版本、基础库、手机型号、微信版本及真实截图。
本次没有微信运行截图，不以静态 HTML、浏览器页面或 Node 输出冒充运行证据。
