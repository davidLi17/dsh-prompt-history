/**
 * Locale dictionaries for dsh-prompt-history (zh/en). The active language
 * follows the DSH app locale; `en` is the key-parity mirror of `zh`.
 */
/** The plugin's locale namespace. */
export declare const NS = "dsh-prompt-history";
/** zh dictionary — the authoritative key set. */
declare const zh: {
    readonly 'settings.title': ">_ 终端式输入";
    /** Settings-nav label (the `>_` glyph lives in the nav icon slot instead). */
    readonly 'settings.nav': "终端式输入";
    readonly 'settings.groupInput': "输入补全";
    readonly 'settings.groupClipboard': "剪贴板";
    readonly 'settings.groupNav': "会话导航";
    readonly 'sideChat.group': "侧聊（实验）";
    readonly 'sideChat.toggle': "启用侧聊：在右栏 / 分屏 / 浮窗里再开一条线程，与主会话并行干活（共享同一工作区，可写文件）";
    readonly 'sideChat.open': "打开侧聊";
    readonly 'sideChat.guideDesc': "与主会话并行干活的第二条线程（同工作区）";
    readonly 'sideChat.disabledHint': "侧聊未启用：设置 → 终端式输入 → 侧聊（实验）";
    readonly 'sideChat.title': "侧聊";
    readonly 'sideChat.thread1': "线程 1";
    readonly 'sideChat.newFork': "带上下文本线程";
    readonly 'sideChat.newBlank': "空白线程";
    readonly 'sideChat.empty': "还没有侧聊线程：新建一条即可与主会话并行干活（同工作区，可写文件）";
    readonly 'sideChat.input': "给这条线程发指令…（Enter 发送，Shift+Enter 换行）";
    readonly 'sideChat.send': "发送";
    readonly 'sideChat.stop': "停止";
    readonly 'sideChat.close': "关闭线程";
    readonly 'sideChat.float': "浮动为独立小窗";
    readonly 'sideChat.dock': "停靠回右栏";
    readonly 'sideChat.split': "分屏（右栏再开一栏）";
    readonly 'sideChat.closeTab': "关闭此标签页";
    readonly 'sideChat.unread': "未读完成";
    readonly 'sideChat.running': "运行中";
    readonly 'sideChat.origin.fork': "侧聊";
    readonly 'panel.hint': "Tab 补全";
    readonly 'sideChat.origin.blank': "侧聊";
    readonly 'sideChat.placeholder': "侧聊面板已接入（消息流与输入框正在实现中）";
    readonly 'sideChat.note': "注意：侧聊与主会话共享工作区，请避免两侧同时修改同一个文件。";
    readonly 'sideChat.guardToggle': "并行写冲突提醒（只提醒，不阻止）";
    readonly 'sideChat.guardParallel': "主会话与侧聊正在同时执行：避免两侧修改同一文件。";
    readonly 'sideChat.guardClash': "两侧都动过这些文件，注意覆盖：";
    readonly 'bridge.label': "预测桥接";
    readonly 'bridge.on': "已连接";
    readonly 'bridge.off': "不可用（宿主未提供 remote 服务）";
    readonly 'settings.copyGroup': "复制方式（选中文字时）";
    readonly 'copyMode.toolbar': "工具栏复制（推荐）";
    readonly 'copyMode.auto': "选中即自动复制";
    readonly 'copyMode.off': "关闭选区复制";
    readonly 'paste.toggle': "右键直接粘贴：输入框上右键即粘贴剪贴板内容（终端风格，不弹菜单）";
    readonly 'history.global': "跨会话历史记忆：↑/↓ 历史在会话间保持（存于浏览器本地，上限 200 条）";
    readonly 'toc.toggle': "会话目录（Chat TOC）：对话左侧显示可拖动的目录把手";
    readonly 'completion.toggle': "历史补全：打字时淡色补全历史里匹配的提示词，Tab 或 → 接受";
    readonly 'completion.hint': "提示词补全（Tab 接受）";
    readonly 'suggest.toggle': "上下文预测：空输入框时用当前会话模型预测你下一句，浅色显示，Tab 或 → 接受（每轮最多一次，消耗少量模型额度）";
    readonly 'suggest.pending': "正在预测下一条…";
    readonly 'suggest.keys': "键位：Tab 或 → 接受补全/预测 · Ctrl+R 反向搜索 · Ctrl+Shift+Space 立即预测一条";
    readonly 'suggest.accept': "按 Tab 键接受";
    readonly 'settings.note': "历史（↑/↓、前缀搜索、Ctrl+R）始终开启。设置存于浏览器本地，修改立即生效。";
    readonly 'toolbar.copy': "复制";
    readonly 'toolbar.quote': "引用";
    readonly 'toolbar.sideChat': "侧聊追问";
    readonly 'sideChat.sendToMain': "发回主会话";
    readonly 'sideChat.sentToMain': "已发回主会话草稿";
    readonly 'sideChat.askHint': "已把引用送入侧聊，输入你的问题即可";
    readonly 'pill.copied': "已复制";
    readonly 'pill.quoted': "已引用";
    readonly 'toc.title': "会话目录";
    readonly 'toc.aria': "会话目录（可拖动）";
    readonly 'toc.resize': "拖动右下角调整面板大小";
    readonly 'search.noMatch': "无匹配";
};
/** en dictionary (key parity enforced). */
declare const en: Record<keyof typeof zh, string>;
/** Key union of the plugin's copy. */
export type PromptHistoryKey = keyof typeof zh;
/** Merge the namespace into the slot locale table (typed `t` seat + typed `bind`). */
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'dsh-prompt-history': PromptHistoryKey;
    }
}
export { zh, en };
//# sourceMappingURL=locales.d.ts.map