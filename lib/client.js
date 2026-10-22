window.__ModuleLoader__.load({
	id: "dsh-prompt-history",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		//#region src/client/prefs.ts
		const STORAGE_KEY = "dsh-prompt-history.prefs";
		/** Stored shape version; bump when the migration rules change. */
		const STORE_VERSION = 3;
		const DEFAULTS = {
			copyMode: "toolbar",
			rightClickPaste: true,
			globalHistory: false,
			tocVisible: true,
			promptCompletion: true,
			contextSuggest: true,
			sideChat: true,
			writeGuard: true
		};
		/** Current prefs; replaced on every setPref (stable snapshot identity). */
		let prefs = load();
		const listeners = /* @__PURE__ */ new Set();
		/** Normalize one stored boolean. */
		function bool(value, fallback) {
			return typeof value === "boolean" ? value : fallback;
		}
		/**
		* Migrate any stored shape into the current prefs.
		*
		* v3 stores `{ version, data }` and made the side chat default-on: v2 payloads
		* (written while it shipped as off-by-default) adopt the new default instead of
		* keeping the value nobody chose deliberately — the feature had no UI surface at
		* the time, so a stored `false` there is a default, not a decision.
		* Older builds stored the flat object, and the oldest one used a `copyOnSelect`
		* boolean instead of `copyMode`. Every rule lives here so a new field never adds
		* another branch to the loader.
		* @param parsed - the parsed localStorage payload.
		* @returns the normalized prefs.
		*/
		function migrate(parsed) {
			if (parsed === null || typeof parsed !== "object") return { ...DEFAULTS };
			const record = parsed;
			const wrapped = typeof record.version === "number" && record.data !== null && typeof record.data === "object";
			const source = wrapped ? record.data : record;
			const storedVersion = wrapped ? record.version : 1;
			const sideChatDefault = storedVersion >= 3 ? DEFAULTS.sideChat : true;
			const rawMode = source.copyMode;
			return {
				copyMode: rawMode === "auto" || rawMode === "toolbar" || rawMode === "off" ? rawMode : typeof source.copyOnSelect === "boolean" ? source.copyOnSelect ? "auto" : "toolbar" : DEFAULTS.copyMode,
				rightClickPaste: bool(source.rightClickPaste, DEFAULTS.rightClickPaste),
				globalHistory: bool(source.globalHistory, DEFAULTS.globalHistory),
				tocVisible: bool(source.tocVisible, DEFAULTS.tocVisible),
				promptCompletion: bool(source.promptCompletion, DEFAULTS.promptCompletion),
				contextSuggest: bool(source.contextSuggest, DEFAULTS.contextSuggest),
				sideChat: storedVersion >= 3 ? bool(source.sideChat, sideChatDefault) : true,
				writeGuard: bool(source.writeGuard, DEFAULTS.writeGuard)
			};
		}
		/** Read the persisted prefs (any stored shape), upgrading the payload in place. */
		function load() {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw === null) return { ...DEFAULTS };
				const parsed = JSON.parse(raw);
				const next = migrate(parsed);
				if ((parsed !== null && typeof parsed === "object" && typeof parsed.version === "number" ? parsed.version : 1) !== STORE_VERSION) localStorage.setItem(STORAGE_KEY, JSON.stringify({
					version: STORE_VERSION,
					data: next
				}));
				return next;
			} catch {
				return { ...DEFAULTS };
			}
		}
		/** Current prefs snapshot (stable until the next setPref). */
		function getPrefs() {
			return prefs;
		}
		/** Apply one setting and persist it. */
		function setPref(key, value) {
			prefs = {
				...prefs,
				[key]: value
			};
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify({
					version: STORE_VERSION,
					data: prefs
				}));
			} catch {}
			for (const fn of [...listeners]) try {
				fn();
			} catch {}
		}
		/** Subscribe to pref changes; returns the unsubscribe disposer. */
		function subscribePrefs(fn) {
			listeners.add(fn);
			return () => {
				listeners.delete(fn);
			};
		}
		//#endregion
		//#region src/client/i18n.ts
		const PLUGIN_VERSION = "1.4.3";
		let translator;
		/** Install the locale-bound translate (called once from apply). */
		function setTranslator(fn) {
			translator = fn;
		}
		/** Translate one plugin key using the active locale. */
		function T(key) {
			if (translator !== void 0) {
				const text = translator(key);
				if (text !== key) return text;
			}
			return key;
		}
		//#endregion
		//#region src/client/feedback.ts
		/**
		* Transient DOM feedback for dsh-prompt-history: the copied pill and the
		* floating copy toolbar shown above a selection in 'toolbar' copy mode.
		* Vanilla DOM (no React) so both can be driven from event handlers.
		*/
		/** Copy the current document selection via execCommand, clipboard API fallback. */
		function copyDocumentSelection() {
			let ok = false;
			try {
				ok = document.execCommand("copy");
			} catch {
				ok = false;
			}
			if (ok) return true;
			const sel = document.getSelection();
			const text = sel !== null && !sel.isCollapsed ? sel.toString() : "";
			if (text === "") return false;
			navigator.clipboard.writeText(text).catch((error) => {
				console.warn("[dsh-prompt-history] clipboard copy failed:", error);
			});
			return true;
		}
		/** A brief feedback pill (已复制 / 已引用 …) above the given rect. */
		function flashCopied(rect, text) {
			const label = text ?? T("pill.copied");
			let x = 8;
			let y = 8;
			if (rect !== void 0 && rect !== null && (rect.width > 0 || rect.height > 0)) {
				x = Math.max(4, Math.min(rect.left, window.innerWidth - 90));
				y = Math.max(4, rect.top - 26);
			}
			const pill = document.createElement("div");
			pill.textContent = label;
			pill.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:2147483000;padding:3px 8px;border-radius:6px;pointer-events:none;background:var(--dsw-specific-tip);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);font:12px system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.2);`;
			document.body.appendChild(pill);
			window.setTimeout(() => {
				pill.remove();
			}, 800);
		}
		const BAR_CLASS = "dsh-ph-toolbar";
		let bar = null;
		function ensureToolbarStyle() {
			if (document.querySelector("style[data-plugin-css=\"dsh-ph-toolbar\"]") !== null) return;
			const tag = document.createElement("style");
			tag.dataset.pluginCss = "dsh-ph-toolbar";
			tag.textContent = [
				`.${BAR_CLASS}{position:fixed;z-index:2147483000;display:flex;align-items:center;padding:4px;`,
				"border-radius:8px;background:var(--dsw-specific-menu);",
				"border:1px solid var(--dsw-alias-border-l1);box-shadow:0 4px 16px rgba(0,0,0,.25);}",
				`.${BAR_CLASS} button{border:0;border-radius:6px;padding:4px 12px;font-size:12px;line-height:1.4;cursor:pointer;`,
				"background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}",
				`.${BAR_CLASS} button:hover{background:var(--dsw-alias-bg-layer-3);}`
			].join("");
			document.head.appendChild(tag);
		}
		/** Hide the copy toolbar (idempotent). */
		function hideSelectionToolbar() {
			if (bar !== null) {
				bar.remove();
				bar = null;
			}
		}
		/**
		* Show the floating selection toolbar above the selection rect: 复制 copies
		* the current document selection; 引用 hands the selection to the caller for
		* insertion into the composer as a quote; 侧聊 sends it to the side chat.
		* Mousedown is suppressed so the selection survives the click.
		* @param rect - the selection's bounding rect (toolbar sits above it).
		* @param onQuote - quote handler; renders the 引用 button only when provided.
		* @param onSideChat - side-chat handler; renders the 侧聊 button only when provided.
		*/
		function showSelectionToolbar(rect, onQuote, onSideChat) {
			ensureToolbarStyle();
			hideSelectionToolbar();
			const copyButton = document.createElement("button");
			copyButton.type = "button";
			copyButton.textContent = T("toolbar.copy");
			copyButton.addEventListener("mousedown", (e) => {
				e.preventDefault();
			});
			copyButton.addEventListener("click", () => {
				const copied = copyDocumentSelection();
				hideSelectionToolbar();
				if (copied) flashCopied(rect);
			});
			const el = document.createElement("div");
			el.className = BAR_CLASS;
			el.appendChild(copyButton);
			if (onQuote !== void 0) {
				const quoteButton = document.createElement("button");
				quoteButton.type = "button";
				quoteButton.textContent = T("toolbar.quote");
				quoteButton.addEventListener("mousedown", (e) => {
					e.preventDefault();
				});
				quoteButton.addEventListener("click", () => {
					hideSelectionToolbar();
					onQuote();
				});
				el.appendChild(quoteButton);
			}
			if (onSideChat !== void 0) {
				const sideButton = document.createElement("button");
				sideButton.type = "button";
				sideButton.textContent = T("toolbar.sideChat");
				sideButton.addEventListener("mousedown", (e) => {
					e.preventDefault();
				});
				sideButton.addEventListener("click", () => {
					hideSelectionToolbar();
					onSideChat();
				});
				el.appendChild(sideButton);
			}
			const W = 56 + (onQuote !== void 0 ? 52 : 0) + (onSideChat !== void 0 ? 52 : 0);
			const H = 30;
			const x = Math.max(4, Math.min(rect.left + rect.width / 2 - W / 2, window.innerWidth - W - 4));
			const y = Math.max(4, rect.top - H - 4);
			el.style.left = `${x}px`;
			el.style.top = `${y}px`;
			document.body.appendChild(el);
			bar = el;
		}
		const SEARCH_CLASS = "dsh-ph-search";
		let searchBar = null;
		/** Hide the reverse-search prompt bar (idempotent). */
		function hideSearchOverlay() {
			if (searchBar !== null) {
				searchBar.remove();
				searchBar = null;
			}
		}
		/**
		* Show the bash-style reverse-search prompt above the composer card:
		* `(reverse-i-search)`query': match-preview`. Display-only (pointer-events
		* none), so it never interferes with the input underneath.
		*/
		function showSearchOverlay(query, match) {
			hideSearchOverlay();
			const card = document.querySelector("[data-composer-card]");
			const cardRect = card instanceof HTMLElement ? card.getBoundingClientRect() : null;
			const el = document.createElement("div");
			el.className = SEARCH_CLASS;
			const q = document.createElement("span");
			q.className = "dsh-ph-search-q";
			q.textContent = query;
			const m = document.createElement("span");
			m.className = "dsh-ph-search-m";
			m.textContent = match.length > 64 ? `${match.slice(0, 64)}…` : match;
			el.append("(reverse-i-search)`");
			el.append(q);
			el.append("': ");
			el.append(m);
			el.style.cssText = `position:fixed;z-index:2147483000;pointer-events:none;left:50%;transform:translateX(-50%);top:${cardRect !== null ? Math.max(4, cardRect.top - 34) : 8}px;max-width:min(640px, calc(100vw - 24px));padding:5px 12px;border-radius:8px;background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);font:12px ui-monospace,SFMono-Regular,Consolas,monospace;box-shadow:0 4px 16px rgba(0,0,0,.25);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
			q.style.cssText = "color:var(--dsw-static-blue-900);";
			document.body.appendChild(el);
			searchBar = el;
		}
		//#endregion
		//#region src/client/sessionCtx.ts
		let rootContext;
		/** Keep the root context (called once from apply). */
		function bindRootContext(ctx) {
			rootContext = ctx;
		}
		/** The captured root context, or undefined before apply ran. */
		function rootContextOrNull() {
			return rootContext;
		}
		/** Pull one older history page for `sessionId`; true when a page was pulled. */
		async function pullOlderPage(sessionId) {
			const sessions = rootContext?.get("sessions");
			if (sessions === void 0) return false;
			const binding = sessions.binding(sessionId);
			if (binding === void 0) return false;
			try {
				await binding.session.loadOlder();
				return true;
			} catch {
				return false;
			}
		}
		//#endregion
		//#region src/client/nodes.ts
		/** The node's ordering identity: anchorSeq (new), then seq (old), then data.seq. */
		function nodeSeq(node) {
			for (const key of ["anchorSeq", "seq"]) {
				const value = node[key];
				if (typeof value === "number" && Number.isFinite(value)) return value;
			}
			const data = node.data;
			return typeof data?.seq === "number" && Number.isFinite(data.seq) ? data.seq : 0;
		}
		/** The node's text content blocks (old `content` or new `data.content`). */
		function textBlocks(node) {
			const content = node.content;
			if (Array.isArray(content)) return content;
			const data = node.data;
			if (data !== void 0 && Array.isArray(data.content)) return data.content;
			return [];
		}
		/** Normalize one node into {kind, seq, text}; null for non-text/unsupported. */
		function promptMessage(node) {
			const n = node;
			if (n === null || n === void 0) return null;
			if (n.kind !== "user" && n.kind !== "steering") return null;
			let text = "";
			for (const block of textBlocks(n)) if (block !== null && typeof block === "object" && block.type === "text" && typeof block.text === "string") text += block.text;
			const trimmed = text.trim();
			if (trimmed === "") return null;
			return {
				kind: n.kind,
				seq: nodeSeq(n),
				text: trimmed
			};
		}
		/** The ordered node array out of whichever chat snapshot shape is present. */
		function snapshotNodes(snapshot) {
			const snap = snapshot;
			if (snap === null || snap === void 0) return [];
			const legacy = snap.legacy?.nodes;
			if (Array.isArray(legacy)) return legacy;
			const store = snap.nodes;
			if (Array.isArray(snap.order) && store !== void 0 && typeof store.get === "function") return snap.order.map((key) => store.get?.(key)).filter((node) => node !== null && node !== void 0);
			return Array.isArray(snap.nodes) ? snap.nodes : [];
		}
		/** Map one node kind onto the row role the side-chat log draws. */
		function rowRole(kind) {
			if (kind === "user" || kind === "steering") return "user";
			if (kind === "assistant") return "assistant";
			if (typeof kind === "string" && (kind.startsWith("tool") || kind.includes("call") || kind.includes("result"))) return "tool";
			return "other";
		}
		/**
		* Flatten assembled conversation nodes into the rows a compact log renders.
		*
		* Works for every generation because the text extraction above already handles
		* `content` and `data.content`; empty rows (pure containers) are skipped.
		* @param nodes - the ordered node array from a chat snapshot.
		* @returns the rows, oldest first.
		*/
		function chatRows(nodes) {
			const rows = [];
			for (const node of nodes) {
				const n = node;
				if (n === null || n === void 0) continue;
				let text = "";
				for (const block of textBlocks(n)) if (block !== null && typeof block === "object" && block.type === "text" && typeof block.text === "string") text += block.text;
				const trimmed = text.trim();
				if (trimmed === "") continue;
				rows.push({
					role: rowRole(n.kind),
					key: nodeSeq(n),
					text: trimmed
				});
			}
			return rows;
		}
		//#endregion
		//#region src/client/editor.ts
		/**
		* Composer editor abstraction for dsh-prompt-history.
		*
		* DSH ≤ 0.1.1: the composer input is a <textarea> inside
		* `[data-composer-card]` — selections/carets read off selectionStart/End.
		* DSH ≥ 0.1.2: the composer input is a Lexical contenteditable host
		* (`[data-composer-input]`); draft writes still flow through
		* `inputActions.setDraft`, and caret/selection read off the DOM Selection.
		* Everything editor-shaped goes through this module so both hosts behave the
		* same from the plugin's point of view.
		*/
		const COMPOSER_CARD = "[data-composer-card]";
		/** The rc.1 Lexical contenteditable host attribute. */
		const EDITOR_HOST = "[data-composer-input]";
		/** The composer editor host (textarea on old DSH, contenteditable on new), if any. */
		function editorHost() {
			const card = document.querySelector(COMPOSER_CARD);
			if (card === null) return null;
			const textarea = card.querySelector("textarea");
			if (textarea !== null) return textarea;
			return card.querySelector(EDITOR_HOST);
		}
		/** Is the event target the composer editor (the host or a node inside it)? */
		function isEditorTarget(target) {
			if (!(target instanceof Element)) return false;
			if (target.closest("[data-composer-card]") === null) return false;
			if (target instanceof HTMLTextAreaElement) return true;
			return target.closest(EDITOR_HOST) !== null;
		}
		/** The editor host's current plain text (its own content, not the draft mirror). */
		function editorText(host) {
			if (host instanceof HTMLTextAreaElement) return host.value;
			return host.textContent ?? "";
		}
		/**
		* Text offset of a DOM Selection endpoint within a contenteditable host's
		* textContent (document-order text-node walk). Lexical decorations (chips)
		* are stripped by using the node's text; plain drafts map 1:1 to draft text.
		*/
		function hostOffsetOf(host, node, offset) {
			if (node === host) return offset;
			const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
			let acc = 0;
			let current = walker.nextNode();
			while (current !== null) {
				if (current === node) return acc + Math.min(offset, (current.textContent ?? "").length);
				acc += (current.textContent ?? "").length;
				current = walker.nextNode();
			}
			return acc;
		}
		/** Focus the editor host without scrolling (textarea or contenteditable). */
		function focusEditor(host) {
			host.focus({ preventScroll: true });
		}
		/**
		* The editor's selection as draft-text offsets [start, end), or null when the
		* editor is not the active selection owner. Exact on a textarea; best-effort
		* on the contenteditable (maps the DOM Selection through its text content).
		*/
		function editorSelectionOffsets(host) {
			if (host instanceof HTMLTextAreaElement) {
				if (document.activeElement !== host) return null;
				const start = host.selectionStart ?? 0;
				return {
					start,
					end: host.selectionEnd ?? start
				};
			}
			if (document.activeElement !== host) {
				if ((host.contains(document.activeElement) ? document.activeElement : null) === null) return null;
			}
			const sel = document.getSelection();
			if (sel === null || sel.rangeCount === 0) return null;
			const { anchorNode, anchorOffset, focusNode, focusOffset } = sel;
			if (anchorNode === null || focusNode === null) return null;
			const inHost = (n) => n === host || host.contains(n);
			if (!inHost(anchorNode) || !inHost(focusNode)) return null;
			const start = hostOffsetOf(host, anchorNode, anchorOffset);
			const end = hostOffsetOf(host, focusNode, focusOffset);
			return {
				start: Math.min(start, end),
				end: Math.max(start, end)
			};
		}
		/** The editor's selected text ('' when there is no selection inside it). */
		function editorSelectedText(host) {
			if (host instanceof HTMLTextAreaElement) {
				if (document.activeElement !== host) return "";
				const start = host.selectionStart ?? 0;
				const end = host.selectionEnd ?? start;
				return end > start ? host.value.slice(start, end) : "";
			}
			const sel = document.getSelection();
			if (sel === null || sel.isCollapsed || sel.rangeCount === 0) return "";
			const anchorNode = sel.anchorNode;
			if (anchorNode === null || !host.contains(anchorNode)) return "";
			return sel.toString();
		}
		/**
		* Move the editor caret to a draft-text offset (used to park the caret after
		* an insertion). Exact on a textarea; best-effort collapse on the
		* contenteditable (falls back to leaving the caret wherever the editor put it).
		*/
		function setEditorCaret(host, offset) {
			if (host instanceof HTMLTextAreaElement) {
				const clamp = Math.max(0, Math.min(offset, host.value.length));
				host.setSelectionRange(clamp, clamp);
				return;
			}
			const target = Math.max(0, Math.min(offset, (host.textContent ?? "").length));
			const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
			let acc = 0;
			let node = walker.nextNode();
			while (node !== null) {
				const len = (node.textContent ?? "").length;
				if (acc + len >= target) {
					try {
						const range = document.createRange();
						range.setStart(node, Math.min(target - acc, len));
						range.collapse(true);
						const sel = document.getSelection();
						sel?.removeAllRanges();
						sel?.addRange(range);
					} catch {}
					return;
				}
				acc += len;
				node = walker.nextNode();
			}
		}
		//#endregion
		//#region src/client/completion.ts
		/**
		* Prompt-history completion (Codex/fish-style type-ahead).
		*
		* Pure matching: given the live draft and the prompt history (oldest → newest)
		* return the remaining suffix of the newest entry the draft is a prefix of.
		* Rendering lives in ghost.ts; acceptance is wired up by InputHistory so the
		* feature can be toggled from Settings.
		*/
		/** Hide absurdly long tails (a 3 KB suffix is never a useful ghost). */
		const MAX_SUFFIX = 400;
		/**
		* Whether a draft can be completed at all.
		*
		* Only single-line plain prompts: a ghost suffix cannot be laid out across
		* lines, and `/` / `@` drafts belong to the built-in command/reference menus —
		* the plugin must not compete with them.
		* @param draft - the live composer draft.
		* @returns true when the draft may be completed.
		*/
		function completionEligible(draft) {
			if (draft === "") return false;
			if (draft.includes("\n")) return false;
			const head = draft.trimStart();
			if (head.startsWith("/") || head.startsWith("@")) return false;
			return true;
		}
		/** The tail of `entry` after `cut` characters, or null when it is not useful. */
		function suffixOf(entry, cut) {
			const suffix = entry.slice(cut);
			if (suffix === "") return null;
			return suffix.length > MAX_SUFFIX ? null : suffix;
		}
		/**
		* The completion suffix for `draft`, or null when nothing matches.
		*
		* A case-sensitive pass runs first so the user's own casing preference wins;
		* a case-insensitive pass then handles e.g. `git st` → `Git status` (the ghost
		* always renders the history entry's original casing).
		* @param draft - the live composer draft.
		* @param history - prompt history, oldest → newest.
		* @returns the ghost suffix, or null.
		*/
		function matchCompletion(draft, history) {
			if (!completionEligible(draft)) return null;
			for (let i = history.length - 1; i >= 0; i -= 1) {
				const entry = history[i];
				if (entry === void 0 || entry.length <= draft.length) continue;
				if (entry.includes("\n")) continue;
				if (entry.startsWith(draft)) return suffixOf(entry, draft.length);
			}
			const lowered = draft.toLowerCase();
			for (let i = history.length - 1; i >= 0; i -= 1) {
				const entry = history[i];
				if (entry === void 0 || entry.length <= draft.length) continue;
				if (entry.includes("\n")) continue;
				if (entry.toLowerCase().startsWith(lowered)) return suffixOf(entry, draft.length);
			}
			return null;
		}
		//#endregion
		//#region src/client/ghost.ts
		/**
		* The inline completion ghost: the matched suffix rendered in dim text right
		* after the caret. Vanilla DOM (like the plugin's other overlays) so it can be
		* driven from event handlers without re-rendering the composer.
		*
		* Placement is measured from the live caret: on the Lexical contenteditable the
		* collapsed Range gives the caret box; on the legacy <textarea> a hidden mirror
		* of the text before the caret yields the same thing. When the box cannot be
		* measured the ghost simply stays hidden — a misplaced hint is worse than none.
		*/
		const GHOST_CLASS = "dsh-ph-ghost";
		let node$1 = null;
		/** Create the overlay style tag once. */
		function ensureStyle$1() {
			if (document.querySelector("style[data-plugin-css=\"dsh-ph-ghost\"]") !== null) return;
			const tag = document.createElement("style");
			tag.dataset.pluginCss = "dsh-ph-ghost";
			tag.textContent = [
				`.${GHOST_CLASS}{position:fixed;z-index:2147482000;pointer-events:none;`,
				"white-space:pre;overflow:hidden;font:inherit;opacity:.45;",
				"color:var(--dsw-alias-label-primary);}"
			].join("");
			document.head.appendChild(tag);
			window.addEventListener("resize", onViewportChange$1, { passive: true });
			window.addEventListener("scroll", onViewportChange$1, {
				passive: true,
				capture: true
			});
		}
		/** Is the ghost currently on screen? */
		function ghostVisible() {
			return node$1 !== null;
		}
		/** Remove the ghost (idempotent). */
		function hideGhost() {
			stopTick$1();
			current$1 = null;
			if (node$1 !== null) {
				node$1.remove();
				node$1 = null;
			}
		}
		/** A caret box with a usable height, or null. */
		function usable(rect) {
			if (rect === void 0 || rect === null) return null;
			if (rect.height <= 0 && rect.width <= 0) return null;
			return rect;
		}
		/** Caret box inside a contenteditable host (collapsed selection, then fallback). */
		function editableCaretRect(host) {
			const sel = document.getSelection();
			if (sel === null || sel.rangeCount === 0) return null;
			const range = sel.getRangeAt(0);
			const anchor = sel.anchorNode;
			if (anchor === null || !(anchor === host || host.contains(anchor))) return null;
			const direct = usable(range.getBoundingClientRect());
			if (direct !== null && direct.height > 0) return direct;
			const rects = range.getClientRects();
			for (const rect of rects) {
				const hit = usable(rect);
				if (hit !== null && hit.height > 0) return hit;
			}
			const before = range.cloneRange();
			try {
				before.setStart(range.startContainer, Math.max(0, range.startOffset - 1));
				before.setEnd(range.startContainer, range.startOffset);
				const prev = usable(before.getBoundingClientRect());
				if (prev !== null && prev.height > 0) return prev;
			} catch {}
			return null;
		}
		/** Caret box inside a legacy textarea, via a hidden mirror of the text before it. */
		function textareaCaretRect(host) {
			const box = host.getBoundingClientRect();
			if (box.height <= 0) return null;
			const style = window.getComputedStyle(host);
			const mirror = document.createElement("div");
			const caret = document.createElement("span");
			mirror.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;white-space:pre-wrap;left:${box.left}px;top:${box.top}px;width:${box.width}px;font:${style.font};letter-spacing:${style.letterSpacing};padding:${style.padding};border:${style.borderWidth} solid transparent;box-sizing:${style.boxSizing};`;
			mirror.textContent = host.value.slice(0, host.selectionStart ?? 0);
			caret.textContent = "​";
			mirror.appendChild(caret);
			document.body.appendChild(mirror);
			const rect = usable(caret.getBoundingClientRect());
			mirror.remove();
			if (rect === null) return null;
			return rect;
		}
		/** What the ghost currently shows: the suffix and the host holding the caret. */
		let current$1 = null;
		/** Self-healing tick: the composer moves whenever a sidebar opens or closes. */
		let tickTimer$1 = null;
		/** Start following the caret while the ghost is on screen. */
		function startTick$1() {
			if (tickTimer$1 !== null) return;
			tickTimer$1 = window.setInterval(() => {
				if (node$1 === null || current$1 === null) {
					stopTick$1();
					return;
				}
				if (!current$1.host.isConnected) {
					hideGhost();
					return;
				}
				paint$1();
			}, 250);
		}
		/** Stop following the caret. */
		function stopTick$1() {
			if (tickTimer$1 !== null) {
				window.clearInterval(tickTimer$1);
				tickTimer$1 = null;
			}
		}
		/** Repaint on viewport changes without waiting for the next tick. */
		function onViewportChange$1() {
			if (node$1 !== null && current$1 !== null) paint$1();
		}
		/**
		* Re-measure the caret and move the ghost onto it.
		*
		* The position is derived here and nowhere else, so a sidebar toggle or a window
		* resize puts the ghost back beside the caret instead of leaving it where the
		* composer used to be.
		* @returns whether the ghost was painted.
		*/
		function paint$1() {
			const shown = current$1;
			const el = node$1;
			if (shown === null || el === null) return false;
			const rect = caretRect(shown.host);
			if (rect === null) return false;
			const card = document.querySelector(COMPOSER_CARD);
			const font = card !== null ? window.getComputedStyle(card).font : "";
			el.textContent = shown.text;
			el.style.font = font === "" ? "inherit" : font;
			el.style.left = `${rect.right}px`;
			el.style.top = `${rect.top}px`;
			el.style.height = `${rect.height}px`;
			el.style.lineHeight = `${rect.height}px`;
			return true;
		}
		/** The caret box for the composer host, or null when it cannot be measured. */
		function caretRect(host) {
			if (host instanceof HTMLTextAreaElement) return textareaCaretRect(host);
			return editableCaretRect(host);
		}
		/**
		* Render `text` as a dim ghost right after the caret inside the composer.
		* @param text - the suffix to ghost.
		* @param host - the composer editor host holding the caret.
		* @returns whether the ghost is on screen.
		*/
		function showGhost(text, host) {
			if (text === "") {
				hideGhost();
				return false;
			}
			if (caretRect(host) === null) {
				hideGhost();
				return false;
			}
			ensureStyle$1();
			if (node$1 === null) {
				node$1 = document.createElement("div");
				node$1.className = GHOST_CLASS;
				node$1.setAttribute("aria-hidden", "true");
				document.body.appendChild(node$1);
			}
			current$1 = {
				text,
				host
			};
			if (!paint$1()) {
				hideGhost();
				return false;
			}
			startTick$1();
			return true;
		}
		//#endregion
		//#region src/client/suggest.ts
		/**
		* Hand-written consumer descriptors for this package's host face. The official
		* packages generate these; the shape is public
		* (`InvocationDescriptor` in @deepseek-ai/dsh-typert-protocol) and the
		* `src-json` codec needs no schema.
		*/
		/**
		* A minimal strict codec. The consumer side only validates `mode === 'strict'`
		* (schema materialization happens on the host), so a pass-through schema keeps
		* this plugin free of a schema dependency.
		* @param typeSymbol - stable host-face symbol for diagnostics.
		* @returns one strict codec descriptor.
		*/
		function strictCodec(typeSymbol) {
			return {
				mode: "strict",
				typeSymbol,
				create: () => ({ safeParse: (value) => ({
					success: true,
					data: value
				}) })
			};
		}
		const CONTRIBUTION = {
			package: "dsh-prompt-history",
			descriptors: [{
				id: "dsh-prompt-history#promptSuggest/suggest",
				service: "promptSuggest",
				namespace: "promptSuggest",
				method: "suggest",
				invocation: { kind: "direct" },
				parameters: [{
					name: "request",
					wire: "request",
					source: "json",
					codec: strictCodec("dsh-prompt-history#promptSuggest/suggest:request")
				}],
				result: strictCodec("dsh-prompt-history#promptSuggest/suggest:result")
			}]
		};
		/**
		* Mount this package's host face on the client Remote service.
		*
		* Must run inside a context that injects `remote`; the namespace service it
		* installs is `remote.<namespace>` (see the gateway's `remoteServiceKey`), so
		* binding happens from a second injected context that waits for that service.
		* @param ctx - a context with `remote` injected.
		* @returns true when the contribution mounted.
		*/
		async function mountContribution(ctx) {
			const remote = ctx.remote;
			if (remote === void 0 || typeof remote.$mount !== "function") return false;
			try {
				await remote.$mount(CONTRIBUTION);
				return true;
			} catch (error) {
				console.warn("[dsh-prompt-history] prompt-suggestion bridge unavailable:", error);
				return false;
			}
		}
		/**
		* Bind the mounted namespace service into a bridge.
		* @param ctx - a context with `remote.promptSuggest` injected.
		* @returns the bridge, or null when the namespace is not callable.
		*/
		function createBridge(ctx) {
			const getService = ctx.get;
			const api = typeof getService === "function" ? getService.call(ctx, "remote.promptSuggest") : void 0;
			const call = api?.suggest;
			if (typeof call !== "function" || api === void 0) return null;
			return { async fetch(context, signal) {
				try {
					const raw = await call.call(api, { context });
					const value = raw !== void 0 && typeof raw === "object" && "ok" in raw ? raw.ok ? raw.value : void 0 : raw;
					return (typeof value?.text === "string" ? value.text.trim() : "").replace(/[\s，,。.；;：:]*按?\s*(?:Tab|tab)\s*(?:键)?\s*(?:接受|确认|补全|采纳)[。.!！]?\s*$/u, "").trim();
				} catch (error) {
					return "";
				}
			} };
		}
		/** The mounted bridge for this page (set by the plugin apply, read by the composer entry). */
		let activeBridge = null;
		/** Bridge-status subscribers (the settings section renders it). */
		const bridgeListeners = /* @__PURE__ */ new Set();
		/**
		* Publish the mounted bridge to the composer entry.
		* @param bridge - the mounted bridge, or null when unavailable.
		*/
		function setActiveBridge(bridge) {
			activeBridge = bridge;
			for (const fn of [...bridgeListeners]) try {
				fn();
			} catch {}
		}
		/**
		* Subscribe to bridge availability.
		* @param fn - listener invoked whenever the bridge changes.
		* @returns the unsubscribe disposer.
		*/
		function subscribeBridge(fn) {
			bridgeListeners.add(fn);
			return () => {
				bridgeListeners.delete(fn);
			};
		}
		/** The mounted bridge, or null when the host face is unavailable. */
		function getActiveBridge() {
			return activeBridge;
		}
		/** Longest conversation tail handed to the model. */
		const MAX_CONTEXT = 6e3;
		/** Longest text kept per row. */
		const MAX_ROW = 1200;
		/**
		* Flatten the visible conversation into role-tagged text for the predictor.
		*
		* Reads the rendered rows (they carry both sides of the conversation, which the
		* node projection does not) and normalizes whitespace so the prompt stays
		* compact.
		* @returns the context tail, or '' when the conversation is not readable.
		*/
		function buildContext() {
			const rows = [...document.querySelectorAll("[data-chat-anchor-key]")].slice(-8);
			const parts = [];
			for (const row of rows) {
				const kind = row.getAttribute("data-chat-flow-kind");
				const role = kind === "user" || kind === "steering" ? "user" : "assistant";
				const text = (row.textContent ?? "").replace(/\s+/g, " ").replace(/(刚刚|\d+\s*(?:秒|分钟|小时|天|周|个月|年)前?)/g, " ").replace(/\b\d{1,2}:\d{2}\b/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_ROW);
				if (text !== "") parts.push(`${role}: ${text}`);
			}
			const joined = parts.join("\n");
			return joined.length > MAX_CONTEXT ? joined.slice(-6e3) : joined;
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Locale dictionaries for dsh-prompt-history (zh/en). The active language
		* follows the DSH app locale; `en` is the key-parity mirror of `zh`.
		*/
		/** The plugin's locale namespace. */
		const NS = "dsh-prompt-history";
		/** zh dictionary — the authoritative key set. */
		const zh = {
			"settings.title": ">_ 终端式输入",
			/** Settings-nav label (the `>_` glyph lives in the nav icon slot instead). */
			"settings.nav": "终端式输入",
			"settings.groupInput": "输入补全",
			"settings.groupClipboard": "剪贴板",
			"settings.groupNav": "会话导航",
			"sideChat.group": "侧聊（实验）",
			"sideChat.toggle": "启用侧聊：在右栏 / 分屏 / 浮窗里再开一条线程，与主会话并行干活（共享同一工作区，可写文件）",
			"sideChat.open": "打开侧聊",
			"sideChat.guideDesc": "与主会话并行干活的第二条线程（同工作区）",
			"sideChat.disabledHint": "侧聊未启用：设置 → 终端式输入 → 侧聊（实验）",
			"sideChat.title": "侧聊",
			"sideChat.thread1": "线程 1",
			"sideChat.newFork": "带上下文本线程",
			"sideChat.newBlank": "空白线程",
			"sideChat.empty": "还没有侧聊线程：新建一条即可与主会话并行干活（同工作区，可写文件）",
			"sideChat.input": "给这条线程发指令…（Enter 发送，Shift+Enter 换行）",
			"sideChat.send": "发送",
			"sideChat.stop": "停止",
			"sideChat.close": "关闭线程",
			"sideChat.float": "浮动为独立小窗",
			"sideChat.dock": "停靠回右栏",
			"sideChat.split": "分屏（右栏再开一栏）",
			"sideChat.closeTab": "关闭此标签页",
			"sideChat.unread": "未读完成",
			"sideChat.running": "运行中",
			"sideChat.origin.fork": "侧聊",
			"panel.hint": "Tab 补全",
			"sideChat.origin.blank": "侧聊",
			"sideChat.placeholder": "侧聊面板已接入（消息流与输入框正在实现中）",
			"sideChat.note": "注意：侧聊与主会话共享工作区，请避免两侧同时修改同一个文件。",
			"sideChat.guardToggle": "并行写冲突提醒（只提醒，不阻止）",
			"sideChat.guardParallel": "主会话与侧聊正在同时执行：避免两侧修改同一文件。",
			"sideChat.guardClash": "两侧都动过这些文件，注意覆盖：",
			"bridge.label": "预测桥接",
			"bridge.on": "已连接",
			"bridge.off": "不可用（宿主未提供 remote 服务）",
			"settings.copyGroup": "复制方式（选中文字时）",
			"copyMode.toolbar": "工具栏复制（推荐）",
			"copyMode.auto": "选中即自动复制",
			"copyMode.off": "关闭选区复制",
			"paste.toggle": "右键直接粘贴：输入框上右键即粘贴剪贴板内容（终端风格，不弹菜单）",
			"history.global": "跨会话历史记忆：↑/↓ 历史在会话间保持（存于浏览器本地，上限 200 条）",
			"toc.toggle": "会话目录（Chat TOC）：对话左侧显示可拖动的目录把手",
			"completion.toggle": "历史补全：打字时淡色补全历史里匹配的提示词，Tab 或 → 接受",
			"completion.hint": "提示词补全（Tab 接受）",
			"suggest.toggle": "上下文预测：空输入框时用当前会话模型预测你下一句，浅色显示，Tab 或 → 接受（每轮最多一次，消耗少量模型额度）",
			"suggest.pending": "正在预测下一条…",
			"suggest.keys": "键位：Tab 或 → 接受补全/预测 · Ctrl+R 反向搜索 · Ctrl+Shift+Space 立即预测一条",
			"suggest.accept": "按 Tab 键接受",
			"settings.note": "历史（↑/↓、前缀搜索、Ctrl+R）始终开启。设置存于浏览器本地，修改立即生效。",
			"toolbar.copy": "复制",
			"toolbar.quote": "引用",
			"toolbar.sideChat": "侧聊追问",
			"sideChat.sendToMain": "发回主会话",
			"sideChat.sentToMain": "已发回主会话草稿",
			"sideChat.askHint": "已把引用送入侧聊，输入你的问题即可",
			"pill.copied": "已复制",
			"pill.quoted": "已引用",
			"toc.title": "会话目录",
			"toc.aria": "会话目录（可拖动）",
			"toc.resize": "拖动右下角调整面板大小",
			"search.noMatch": "无匹配"
		};
		/** en dictionary (key parity enforced). */
		const en = {
			"settings.title": ">_ Terminal Input",
			"settings.nav": "Terminal Input",
			"settings.groupInput": "Input completion",
			"settings.groupClipboard": "Clipboard",
			"settings.groupNav": "Session navigation",
			"sideChat.group": "Side chat (experimental)",
			"sideChat.toggle": "Enable side chat: run a second thread in the right sidebar / split / floating panel, in parallel with the main conversation (same workspace, file writes allowed)",
			"sideChat.open": "Open side chat",
			"sideChat.guideDesc": "A second thread working in parallel with the main chat (same workspace)",
			"sideChat.disabledHint": "Side chat is off: Settings → Terminal input → Side chat (experimental)",
			"sideChat.title": "Side chat",
			"sideChat.thread1": "Thread 1",
			"sideChat.newFork": "New thread with context",
			"sideChat.newBlank": "Blank thread",
			"sideChat.empty": "No side threads yet: create one to work in parallel with the main conversation (same workspace, file writes allowed)",
			"sideChat.input": "Send an instruction to this thread… (Enter sends, Shift+Enter breaks)",
			"sideChat.send": "Send",
			"sideChat.stop": "Stop",
			"sideChat.close": "Close thread",
			"sideChat.float": "Float as a separate panel",
			"sideChat.dock": "Dock back into the sidebar",
			"sideChat.split": "Split (open another sidebar column)",
			"sideChat.closeTab": "Close this tab",
			"sideChat.unread": "unread completions",
			"sideChat.running": "running",
			"sideChat.origin.fork": "Side",
			"panel.hint": "Tab completes",
			"sideChat.origin.blank": "Side",
			"sideChat.placeholder": "Side-chat panel is wired up (message stream and composer are being implemented)",
			"sideChat.note": "Note: the side chat shares this workspace — avoid editing the same file from both sides at once.",
			"sideChat.guardToggle": "Warn about parallel writes (reminder only, never blocks)",
			"sideChat.guardParallel": "The main chat and a side thread are running at once: avoid editing the same file from both.",
			"sideChat.guardClash": "Both sides touched these files — mind the overwrite:",
			"bridge.label": "Prediction bridge",
			"bridge.on": "connected",
			"bridge.off": "unavailable (host exposes no remote service)",
			"settings.copyGroup": "Copy mode (on selection)",
			"copyMode.toolbar": "Toolbar copy (recommended)",
			"copyMode.auto": "Auto-copy on select",
			"copyMode.off": "Disable selection copy",
			"paste.toggle": "Right-click pastes directly: right-click the input box to paste (terminal style, no context menu)",
			"history.global": "Cross-session history: Up/Down history persists across sessions (browser-local, capped at 200)",
			"toc.toggle": "Chat TOC: show the draggable grip on the chat left edge",
			"completion.toggle": "History completion: ghost the rest of the matching history prompt while typing; accept with Tab or →",
			"completion.hint": "Prompt completion (Tab accepts)",
			"suggest.toggle": "Context prediction: with an empty composer, predict your next prompt with the current session model; accept with Tab or → (once per turn, small quota use)",
			"suggest.pending": "Predicting the next prompt…",
			"suggest.keys": "Keys: Tab or → accepts a completion/prediction · Ctrl+R reverse search · Ctrl+Shift+Space predicts now",
			"suggest.accept": "Press Tab to accept",
			"settings.note": "History (Up/Down, prefix search, Ctrl+R) is always on. Settings are browser-local and take effect immediately.",
			"toolbar.copy": "Copy",
			"toolbar.quote": "Quote",
			"toolbar.sideChat": "Ask in side chat",
			"sideChat.sendToMain": "Send to main chat",
			"sideChat.sentToMain": "Sent to the main draft",
			"sideChat.askHint": "Quote moved into the side chat — type your question",
			"pill.copied": "Copied",
			"pill.quoted": "Quoted",
			"toc.title": "Conversation TOC",
			"toc.aria": "Conversation TOC (draggable)",
			"toc.resize": "Drag the corner to resize",
			"search.noMatch": "no match"
		};
		//#endregion
		//#region src/client/threads.ts
		/**
		* Side-chat threads: each thread is backed by a real session on the host, so the
		* main conversation and the side chat run their own turns in parallel over the
		* same workspace.
		*
		* Everything here goes through services the shell exposes on the client root
		* context: `sessions` (create / fork / retain) and `uiConversation` (the
		* per-session assembled chat target). Both are resolved lazily on every call —
		* they appear only after the host connection is up — and every face is typed
		* structurally so nothing is imported at runtime.
		*
		* @module dsh-prompt-history/client/threads
		*/
		/** Constant empty rows snapshot (stable identity). */
		const NO_ROWS$1 = [];
		/** Threads and their session references, shared by every panel of this page. */
		var ThreadStore = class {
			threads = [];
			refs = /* @__PURE__ */ new Map();
			rows = /* @__PURE__ */ new Map();
			turn = /* @__PURE__ */ new Map();
			listeners = /* @__PURE__ */ new Set();
			states = /* @__PURE__ */ new Map();
			watchers = /* @__PURE__ */ new Map();
			viewed = null;
			sequence = 0;
			cache = {
				threads: [],
				states: /* @__PURE__ */ new Map()
			};
			/** The lazy `sessions` service, or undefined before the host connection. */
			sessions() {
				return rootContextOrNull()?.get("sessions");
			}
			/** The lazy `uiConversation` service, or undefined before it is provided. */
			conversation() {
				return rootContextOrNull()?.get("uiConversation");
			}
			/** Current threads (stable array identity between changes). */
			list() {
				return this.threads;
			}
			/** Stable snapshot of threads and their live state. */
			snapshot() {
				return this.cache;
			}
			/** State of one thread (never undefined for a known id). */
			stateOf(threadId) {
				return this.states.get(threadId) ?? {
					running: false,
					unread: 0,
					baseline: 0
				};
			}
			/** Total unread completions, for the sidebar tab chip. */
			unreadTotal() {
				let total = 0;
				for (const state of this.states.values()) total += state.unread;
				return total;
			}
			/** Whether any thread is producing right now. */
			anyRunning() {
				for (const state of this.states.values()) if (state.running) return true;
				return false;
			}
			/**
			* Mark the thread the user is looking at: it stops being unread.
			* @param threadId - the on-screen thread, or null when the panel shows none.
			*/
			setViewed(threadId) {
				this.viewed = threadId;
				if (threadId === null) return;
				const state = this.states.get(threadId);
				if (state === void 0 || state.unread === 0) return;
				this.states.set(threadId, {
					...state,
					unread: 0
				});
				this.notify();
			}
			/** Subscribe to the thread list. */
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			/** Notify the panel that the thread list changed. */
			notify() {
				this.cache = {
					threads: [...this.threads],
					states: new Map(this.states)
				};
				for (const listener of [...this.listeners]) try {
					listener();
				} catch {}
			}
			/**
			* Start a thread: fork the source session (full context) or create a blank one.
			* @param origin - fork inherits the whole conversation; blank starts empty.
			* @param sourceSessionId - the conversation to fork from (required for 'fork').
			* @param label - the panel label the thread is numbered under.
			* @returns the created thread, or null when the services are unavailable.
			*/
			async start(origin, sourceSessionId, label) {
				const sessions = this.sessions();
				if (sessions === void 0) return null;
				try {
					const sessionId = origin === "fork" && sourceSessionId !== "" ? await sessions.fork({ sessionId: sourceSessionId }) : await sessions.create({});
					const reference = sessions.retain(sessionId, { source: "dsh-prompt-history.side-chat" });
					this.sequence += 1;
					const thread = {
						id: `t${this.sequence}`,
						sessionId,
						origin,
						title: `${label} ${this.sequence}`
					};
					this.refs.set(thread.id, reference);
					this.states.set(thread.id, {
						running: false,
						unread: 0,
						baseline: this.rowsOf(sessionId).getSnapshot().length
					});
					this.threads.push(thread);
					this.watchTurn(thread.id, thread.sessionId);
					this.notify();
					return thread;
				} catch (error) {
					console.warn("[dsh-prompt-history] side-chat session start failed:", error);
					return null;
				}
			}
			/** Send one prompt to a thread. */
			async send(thread, text) {
				const reference = this.refs.get(thread.id);
				if (reference === void 0 || text.trim() === "") return false;
				try {
					await reference.binding.session.prompt([{
						type: "text",
						text
					}], "queue");
					return true;
				} catch (error) {
					console.warn("[dsh-prompt-history] side-chat prompt failed:", error);
					return false;
				}
			}
			/** Cancel the thread's running turn. */
			async cancel(thread) {
				const reference = this.refs.get(thread.id);
				if (reference === void 0) return;
				try {
					await reference.binding.session.cancel();
				} catch {}
			}
			/** Close a thread and release its session reference. */
			close(threadId) {
				const reference = this.refs.get(threadId);
				if (reference !== void 0) {
					try {
						reference.release();
					} catch {}
					this.refs.delete(threadId);
				}
				const stopWatching = this.watchers.get(threadId);
				if (stopWatching !== void 0) {
					stopWatching();
					this.watchers.delete(threadId);
				}
				this.states.delete(threadId);
				if (this.viewed === threadId) this.viewed = null;
				const index = this.threads.findIndex((thread) => thread.id === threadId);
				if (index >= 0) this.threads.splice(index, 1);
				this.notify();
			}
			/**
			* Follow a thread's turn so a completion can be badged even while the user is
			* looking at another thread (or the panel is collapsed).
			* @param threadId - local thread identity.
			* @param sessionId - the thread's session.
			*/
			watchTurn(threadId, sessionId) {
				const observable = this.runningOf(sessionId);
				let wasRunning = observable.getSnapshot();
				const stop = observable.subscribe(() => {
					const running = observable.getSnapshot();
					const state = this.states.get(threadId) ?? {
						running: false,
						unread: 0,
						baseline: 0
					};
					const finished = wasRunning && !running;
					wasRunning = running;
					this.states.set(threadId, {
						running,
						unread: finished && this.viewed !== threadId ? state.unread + 1 : state.unread,
						baseline: state.baseline
					});
					this.notify();
				});
				this.watchers.set(threadId, stop);
			}
			/**
			* The thread's rendered rows, assembled by the shell's own conversation
			* pipeline (the same snapshot the official view draws).
			* @param sessionId - the thread's session.
			* @returns an observable of rows, stable per session.
			*/
			rowsOf(sessionId) {
				const existing = this.rows.get(sessionId);
				if (existing !== void 0) return existing;
				const conversation = this.conversation();
				if (conversation === void 0) return {
					getSnapshot: () => NO_ROWS$1,
					subscribe: () => () => {}
				};
				const target = conversation.binding(sessionId).target("chat");
				const listeners = /* @__PURE__ */ new Set();
				let cache = chatRows(snapshotNodes(target.getSnapshot()));
				const unsubscribe = target.subscribe(() => {
					cache = chatRows(snapshotNodes(target.getSnapshot()));
					for (const listener of [...listeners]) try {
						listener();
					} catch {}
				});
				const observable = {
					getSnapshot: () => cache,
					subscribe: (listener) => {
						listeners.add(listener);
						return () => {
							listeners.delete(listener);
							if (listeners.size === 0) {
								unsubscribe();
								this.rows.delete(sessionId);
							}
						};
					}
				};
				this.rows.set(sessionId, observable);
				return observable;
			}
			/**
			* Whether the thread is producing a turn.
			* @param sessionId - the thread's session.
			* @returns an observable boolean, stable per session.
			*/
			runningOf(sessionId) {
				const existing = this.turn.get(sessionId);
				if (existing !== void 0) return existing;
				const conversation = this.conversation();
				if (conversation === void 0) return {
					getSnapshot: () => false,
					subscribe: () => () => {}
				};
				const openTurn = conversation.binding(sessionId).openTurn;
				const listeners = /* @__PURE__ */ new Set();
				let cache = openTurn.getSnapshot() !== void 0;
				const unsubscribe = openTurn.subscribe(() => {
					cache = openTurn.getSnapshot() !== void 0;
					for (const listener of [...listeners]) try {
						listener();
					} catch {}
				});
				const observable = {
					getSnapshot: () => cache,
					subscribe: (listener) => {
						listeners.add(listener);
						return () => {
							listeners.delete(listener);
							if (listeners.size === 0) {
								unsubscribe();
								this.turn.delete(sessionId);
							}
						};
					}
				};
				this.turn.set(sessionId, observable);
				return observable;
			}
		};
		/** The page-wide thread store. */
		const threads = new ThreadStore();
		//#endregion
		//#region src/client/browse.ts
		/**
		* Prompt-history browsing, shared by the main composer and the side-chat
		* composer: bash-style prefix matching for ↑/↓, and substring matching for the
		* Ctrl+R reverse search. Pure functions so both composers keep the same feel.
		*
		* @module dsh-prompt-history/client/browse
		*/
		/** Indices of history entries that start with `prefix`, newest last. */
		function prefixMatches(history, prefix) {
			const out = [];
			if (prefix === "") {
				for (let i = 0; i < history.length; i += 1) out.push(i);
				return out;
			}
			history.forEach((entry, index) => {
				if (entry.startsWith(prefix)) out.push(index);
			});
			return out;
		}
		/** Not browsing. */
		const RESET_BROWSE$1 = {
			index: -1,
			saved: "",
			lastSet: ""
		};
		/**
		* Step one position through the matches of a prefix search.
		* @param history - prompt history, oldest → newest.
		* @param state - the current browse session (must carry a prefix).
		* @param delta - -1 for older, +1 for newer.
		* @returns the next state and line, or null when the walk leaves the matches.
		*/
		function stepPrefix(history, state, delta) {
			const matches = prefixMatches(history, state.prefix ?? "");
			const position = matches.indexOf(state.index);
			const next = position < 0 ? -1 : position + delta;
			if (next < 0 || next >= matches.length) return null;
			const index = matches[next] ?? 0;
			return {
				state: {
					...state,
					index,
					lastSet: history[index] ?? ""
				},
				text: history[index] ?? ""
			};
		}
		//#endregion
		//#region src/client/suggestOverlay.ts
		/**
		* The context-suggestion overlay: the predicted next prompt, ghosted in the
		* empty composer with a "press Tab" hint, matching the Codex composer look.
		*
		* Vanilla DOM (like the plugin's other overlays) so it can be driven from event
		* handlers without re-rendering the composer. It sits inside the editor's
		* content box with the same font, and never receives pointer events.
		*
		* @module dsh-prompt-history/client/suggestOverlay
		*/
		const CLASS = "dsh-ph-suggest";
		/** Toggled on the composer card while a prediction is on screen. */
		const CARD_CLASS = "dsh-ph-suggesting";
		/** The composer's own placeholder ("描述你想要构建的内容…"). */
		const PLACEHOLDER = "[data-composer-placeholder], [class*=\"placeholder\"]";
		let node = null;
		/** Placeholders hidden for the current overlay, with their previous inline value. */
		let hiddenPlaceholders = [];
		/** Self-healing tick: re-hides a remounted placeholder and re-measures the box. */
		let tickTimer = null;
		/** What is on screen right now, so a layout change can repaint it. */
		let current = null;
		/**
		* Keep the overlay correct while it is on screen.
		*
		* Two things move under it without any event of their own: the composer is
		* mounted in stages (its card and placeholder can be replaced right after the
		* first prediction), and the column it lives in resizes or shifts whenever a
		* sidebar opens or closes. A light poll re-hides the placeholder and re-measures
		* the box, which also catches pure moves that a resize observer never reports.
		*/
		function startTick() {
			if (tickTimer !== null) return;
			tickTimer = window.setInterval(tick, 250);
		}
		/** Stop the self-healing poll. */
		function stopTick() {
			if (tickTimer !== null) {
				window.clearInterval(tickTimer);
				tickTimer = null;
			}
		}
		/** One self-healing pass: drop a dead host, re-hide, re-measure, repaint. */
		function tick() {
			if (node === null || current === null) {
				stopTick();
				return;
			}
			if (!current.host.isConnected) {
				hideSuggestion();
				return;
			}
			if (current.hidePlaceholder) hidePlaceholders();
			paint();
		}
		/** Repaint on viewport changes, immediately rather than on the next tick. */
		function onViewportChange() {
			if (node !== null && current !== null) paint();
		}
		/** Hide the composer placeholder (inline + via the card class for re-renders). */
		function hidePlaceholders() {
			document.querySelector(COMPOSER_CARD)?.classList.add(CARD_CLASS);
			for (const el of document.querySelectorAll(PLACEHOLDER)) {
				if (el.style.visibility === "hidden") continue;
				hiddenPlaceholders.push({
					el,
					prev: el.style.visibility
				});
				el.style.visibility = "hidden";
			}
		}
		/** Restore every placeholder this overlay hid. */
		function restorePlaceholders() {
			document.querySelector(COMPOSER_CARD)?.classList.remove(CARD_CLASS);
			for (const { el, prev } of hiddenPlaceholders) el.style.visibility = prev;
			hiddenPlaceholders = [];
		}
		/** Create the overlay style tag once. */
		function ensureStyle() {
			if (document.querySelector("style[data-plugin-css=\"dsh-ph-suggest\"]") !== null) return;
			const tag = document.createElement("style");
			tag.dataset.pluginCss = "dsh-ph-suggest";
			tag.textContent = [
				`.${CLASS}{position:fixed;z-index:2147482000;pointer-events:none;overflow:hidden;`,
				"white-space:pre-wrap;word-break:break-word;}",
				`.${CLASS} .dsh-ph-suggest-text{color:var(--dsw-alias-label-primary);opacity:.42;}`,
				`.${CLASS}--pending .dsh-ph-suggest-text{opacity:.26;font-style:italic;}`,
				`.${CLASS} .dsh-ph-suggest-hint{color:var(--dsw-alias-label-primary);opacity:.3;}`,
				`.${CLASS} .dsh-ph-suggest-hint--block{display:block;}`,
				`[data-composer-card].${CARD_CLASS} [data-composer-placeholder],`,
				`[data-composer-card].${CARD_CLASS} [class*="placeholder"]{visibility:hidden !important;}`
			].join("");
			document.head.appendChild(tag);
		}
		/**
		* Install the overlay stylesheet. Called once from the plugin body so the
		* placeholder-hiding rule exists even before the first prediction.
		*/
		function installSuggestStyle() {
			ensureStyle();
			window.addEventListener("resize", onViewportChange, { passive: true });
			window.addEventListener("scroll", onViewportChange, {
				passive: true,
				capture: true
			});
		}
		/** Is a suggestion currently on screen? */
		function suggestionVisible() {
			return node !== null;
		}
		/** Remove the suggestion overlay (idempotent). */
		function hideSuggestion() {
			stopTick();
			current = null;
			restorePlaceholders();
			if (node !== null) {
				node.remove();
				node = null;
			}
		}
		/** The editor's content box plus its line height, or null when unmeasurable. */
		function editorBox(host) {
			const rect = host.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return null;
			const style = window.getComputedStyle(host);
			const pad = (side) => Number.parseFloat(style.getPropertyValue(side)) || 0;
			const fontSize = Number.parseFloat(style.fontSize) || 14;
			const rawLine = Number.parseFloat(style.lineHeight);
			const line = Number.isFinite(rawLine) && rawLine > 0 ? rawLine : fontSize * 1.5;
			return {
				left: rect.left + pad("padding-left"),
				top: rect.top + pad("padding-top"),
				width: Math.max(40, rect.width - pad("padding-left") - pad("padding-right")),
				height: Math.max(line, rect.height - pad("padding-top") - pad("padding-bottom")),
				line
			};
		}
		/**
		* Re-measure the host and rewrite the overlay's geometry and content.
		*
		* Everything positional is derived here and nowhere else, so a repaint after a
		* sidebar toggle, a window resize or a composer remount puts the ghost back
		* exactly on the editor's content box.
		* @returns whether the overlay was painted.
		*/
		function paint() {
			const painted = current;
			const el = node;
			if (painted === null || el === null) return false;
			const box = editorBox(painted.host);
			if (box === null) return false;
			const card = document.querySelector(COMPOSER_CARD);
			const style = window.getComputedStyle(card ?? painted.host);
			el.classList.toggle(`${CLASS}--pending`, painted.pending === true);
			const textEl = document.createElement("span");
			textEl.className = "dsh-ph-suggest-text";
			textEl.textContent = painted.text;
			const hintEl = document.createElement("span");
			hintEl.className = "dsh-ph-suggest-hint";
			const showHint = painted.pending !== true && painted.hint !== "" && !/tab/i.test(painted.text);
			const block = box.height >= box.line * 2.1;
			if (!showHint) hintEl.textContent = "";
			else if (block) {
				hintEl.classList.add("dsh-ph-suggest-hint--block");
				hintEl.textContent = painted.hint;
			} else hintEl.textContent = ` ${painted.hint}`;
			el.textContent = "";
			el.append(textEl, hintEl);
			el.style.font = style.font === "" ? "inherit" : style.font;
			el.style.letterSpacing = style.letterSpacing;
			el.style.left = `${box.left}px`;
			el.style.top = `${box.top}px`;
			el.style.width = `${box.width}px`;
			el.style.height = `${box.height}px`;
			el.style.lineHeight = `${box.line}px`;
			hintEl.style.fontSize = `${Math.max(10, (Number.parseFloat(style.fontSize) || 14) - 2)}px`;
			return true;
		}
		/**
		* Show progress in the composer while a request is in flight.
		*
		* Waiting in silence is what makes a probabilistic feature feel broken: the
		* prediction can take a few seconds, and an empty composer shows nothing at all
		* until it lands. The pending line uses the same overlay (and the same
		* self-correcting geometry), so the real prediction simply replaces it.
		* @param host - the composer editor host to align against.
		* @param host2 - unused placeholder kept for symmetry with showSuggestion.
		* @returns whether the pending line is on screen.
		*/
		function showPending(text, host, options = {}) {
			if (text === "") return false;
			if (editorText(host).trim() !== "") return false;
			if (editorBox(host) === null) return false;
			ensureStyle();
			const hidePlaceholder = options.hidePlaceholder !== false;
			if (hidePlaceholder) hidePlaceholders();
			if (node === null) {
				node = document.createElement("div");
				node.className = CLASS;
				node.setAttribute("aria-hidden", "true");
				document.body.appendChild(node);
			}
			current = {
				text,
				hint: "",
				host,
				hidePlaceholder,
				pending: true
			};
			if (!paint()) {
				hideSuggestion();
				return false;
			}
			startTick();
			return true;
		}
		function showSuggestion(text, hint, host, options = {}) {
			if (text === "") {
				hideSuggestion();
				return false;
			}
			if (editorText(host).trim() !== "") {
				hideSuggestion();
				return false;
			}
			if (editorBox(host) === null) {
				hideSuggestion();
				return false;
			}
			ensureStyle();
			const hidePlaceholder = options.hidePlaceholder !== false;
			if (hidePlaceholder) hidePlaceholders();
			if (node === null) {
				node = document.createElement("div");
				node.className = CLASS;
				node.setAttribute("aria-hidden", "true");
				document.body.appendChild(node);
			}
			current = {
				text,
				hint,
				host,
				hidePlaceholder
			};
			if (!paint()) {
				hideSuggestion();
				return false;
			}
			startTick();
			return true;
		}
		//#endregion
		//#region src/client/panelComposer.tsx
		/**
		* The side-chat composer: the same prompt affordances as the main composer,
		* but on a panel-owned <textarea> instead of the shell's editor.
		*
		* Reused as-is: the history matcher (`browse.ts`), the completion matcher
		* (`completion.ts`), the host prediction bridge (`suggest.ts`) and the ghost
		* overlay (`suggestOverlay.ts`). Only the editor wiring differs — the shell
		* composer reads its caret through the DOM selection, this one owns its value.
		*
		* Keys: ↑/↓ browse (prefix search when the line is non-empty), Tab or → accept
		* (history suffix, or the predicted prompt while empty), Esc dismiss, Enter
		* send, Shift+Enter newline.
		*
		* @module dsh-prompt-history/client/panelComposer
		*/
		/** Debounce before asking the host to predict. */
		const PREDICT_DELAY = 450;
		/** The side-chat composer entry. */
		function PromptComposer(props) {
			const { value, onChange, onSubmit, running, history, predictContext, placeholder } = props;
			const areaRef = (0, react.useRef)(null);
			const browseRef = (0, react.useRef)(RESET_BROWSE$1);
			const predictionRef = (0, react.useRef)(null);
			const dismissedRef = (0, react.useRef)(null);
			const timerRef = (0, react.useRef)(null);
			const abortRef = (0, react.useRef)(null);
			const [bridged, setBridged] = (0, react.useState)(() => getActiveBridge() !== null);
			(0, react.useEffect)(() => subscribeBridge(() => {
				setBridged(getActiveBridge() !== null);
			}), []);
			/** The history suffix that would complete the current draft. */
			const suffix = (0, react.useMemo)(() => matchCompletion(value, history), [value, history]);
			const clearPrediction = (0, react.useCallback)(() => {
				if (timerRef.current !== null) {
					window.clearTimeout(timerRef.current);
					timerRef.current = null;
				}
				abortRef.current?.abort();
				abortRef.current = null;
				predictionRef.current = null;
				hideSuggestion();
			}, []);
			/** Ask the host for the next prompt and ghost it inside the empty field. */
			const requestPrediction = (0, react.useCallback)(() => {
				const area = areaRef.current;
				if (area === null) return;
				if (!getPrefs().contextSuggest || !getPrefs().sideChat) {
					clearPrediction();
					return;
				}
				if (value !== "" || running) {
					clearPrediction();
					return;
				}
				const bridge = getActiveBridge();
				if (bridge === null) return;
				const context = predictContext();
				if (context.trim() === "" || dismissedRef.current === context) {
					clearPrediction();
					return;
				}
				clearPrediction();
				const controller = new AbortController();
				abortRef.current = controller;
				timerRef.current = window.setTimeout(() => {
					timerRef.current = null;
					showPending(T("suggest.pending"), area, { hidePlaceholder: false });
					bridge.fetch(context, controller.signal).then((text) => {
						if (controller.signal.aborted) return;
						if (text === "") {
							hideSuggestion();
							return;
						}
						predictionRef.current = text;
						showSuggestion(text, T("suggest.accept"), area, { hidePlaceholder: false });
					});
				}, PREDICT_DELAY);
			}, [
				clearPrediction,
				predictContext,
				running,
				value
			]);
			(0, react.useEffect)(() => {
				if (value !== "" || running) clearPrediction();
			}, [
				value,
				running,
				clearPrediction
			]);
			(0, react.useEffect)(() => {
				if (value === "" && !running) requestPrediction();
				return () => {};
			}, [
				predictContext,
				running,
				bridged
			]);
			(0, react.useEffect)(() => () => {
				clearPrediction();
			}, [clearPrediction]);
			(0, react.useEffect)(() => subscribePrefs(() => {
				if (value === "" && !running) requestPrediction();
			}), [
				requestPrediction,
				value,
				running
			]);
			/** Accept whatever hint is on screen. @returns whether something was accepted. */
			const accept = () => {
				const predicted = predictionRef.current;
				if (predicted !== null && suggestionVisible()) {
					clearPrediction();
					onChange(predicted);
					return true;
				}
				if (suffix !== null) {
					onChange(value + suffix);
					return true;
				}
				return false;
			};
			const onKeyDown = (event) => {
				if (event.key === "ArrowUp" || event.key === "ArrowDown") {
					if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
					event.preventDefault();
					const delta = event.key === "ArrowUp" ? -1 : 1;
					const browse = browseRef.current;
					if (browse.index === -1) {
						if (delta === 1) return;
						const matches = prefixMatches(history, value);
						if (matches.length === 0) return;
						const index = matches[matches.length - 1] ?? 0;
						browseRef.current = {
							index,
							saved: value,
							lastSet: history[index] ?? "",
							prefix: value
						};
						onChange(history[index] ?? "");
						return;
					}
					const stepped = stepPrefix(history, browse, delta);
					if (stepped === null) {
						browseRef.current = RESET_BROWSE$1;
						onChange(browse.saved);
						return;
					}
					browseRef.current = stepped.state;
					onChange(stepped.text);
					return;
				}
				if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === "Space" || event.key === " ")) {
					event.preventDefault();
					dismissedRef.current = null;
					requestPrediction();
					return;
				}
				if (event.key === "Escape") {
					if (suggestionVisible()) {
						dismissedRef.current = predictContext();
						clearPrediction();
						return;
					}
					if (suffix !== null) return;
					return;
				}
				if ((event.key === "Tab" || event.key === "ArrowRight") && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
					if (accept()) event.preventDefault();
					return;
				}
				if (event.key === "Enter" && !event.shiftKey) {
					event.preventDefault();
					clearPrediction();
					onSubmit();
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-ph-panelComposer",
				children: [suffix !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ph-panelHint",
					children: [
						T("panel.hint"),
						"：",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-ph-panelHintText",
							children: suffix
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					ref: areaRef,
					className: "dsh-ph-sidechat-input",
					rows: 2,
					value,
					placeholder,
					onChange: (event) => {
						onChange(event.target.value);
					},
					onKeyDown,
					onFocus: () => {
						if (value === "" && !running) requestPrediction();
					}
				})]
			});
		}
		//#endregion
		//#region src/client/guard.ts
		/**
		* File-looking tokens inside tool output: an absolute, home-relative or
		* dot-relative path ending in a short extension. Deliberately conservative —
		* a false positive here would nag the user about a file nobody touched.
		*/
		const PATH_PATTERN = /(?:^|[\s"'`(（[<=])((?:~|\.{1,2}|\/)[\w./@+-]*\.[A-Za-z0-9]{1,8})(?=[\s"'`),，。:：;\]}>]|$)/g;
		/** Extract the files a set of rows mentions. */
		function extractPaths(rows) {
			const found = /* @__PURE__ */ new Set();
			for (const row of rows) {
				PATH_PATTERN.lastIndex = 0;
				let match = PATH_PATTERN.exec(row.text);
				while (match !== null) {
					const path = match[1];
					if (path !== void 0 && path.length > 2) found.add(normalize(path));
					match = PATH_PATTERN.exec(row.text);
				}
			}
			return found;
		}
		/**
		* Normalize one path so the two sides compare equal: trailing sentence
		* punctuation is not part of the path.
		* @param path - raw token.
		* @returns the comparison form.
		*/
		function normalize(path) {
			return path.replace(/[.,;:]+$/, "");
		}
		/**
		* Files both sides touched.
		* @param left - one side's paths.
		* @param right - the other side's paths.
		* @returns the shared paths, sorted, capped by the caller when rendering.
		*/
		function overlaps(left, right) {
			const shared = [];
			const [small, large] = left.size <= right.size ? [left, right] : [right, left];
			for (const path of small) if (large.has(path)) shared.push(path);
			return shared.sort();
		}
		//#endregion
		//#region src/client/sideChat.tsx
		/**
		* Side chat (experimental): a second work thread inside the same workspace,
		* hosted as a right-sidebar tab so the main conversation keeps running.
		*
		* The shell owns the sidebar mechanics (docked pane, split, floating panel), so
		* this module only contributes a tab type and its body:
		*
		* 1. stage one registers the type through `ctx.sidebarRightTabs`;
		* 2. stage two registers the body under `sidebar.right.pane.tab`, keyed by the
		*    definition id;
		* 3. `openSideChat` opens (or reveals) a tab through `ctx.sidebarRight`.
		*
		* @module dsh-prompt-history/client/sideChat
		*/
		/** Tab type identity (the body slot and the title seat are keyed by it). */
		const SIDE_CHAT_ID = "dsh-prompt-history.side-chat";
		/** Kind discriminator passed to `openTab`. */
		const SIDE_CHAT_KIND = "side-chat";
		/** Root client context, captured once the sidebar services are available. */
		let serviceCtx = null;
		/** Read the thread snapshot (the list plus each thread's badges). */
		function useThreadSnapshot() {
			return (0, react.useSyncExternalStore)(threads.subscribe.bind(threads), threads.snapshot.bind(threads));
		}
		/** The sidebar tab chip: the title plus the aggregate badges. */
		function SideChatTitle() {
			useThreadSnapshot();
			const unread = threads.unreadTotal();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dsh-ph-sidechat-title",
				children: [
					T("sideChat.title"),
					unread > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ph-sidechat-badge",
						"aria-label": `${T("sideChat.unread")} ${unread}`,
						children: unread
					}),
					unread === 0 && threads.anyRunning() && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ph-sidechat-running",
						"aria-label": T("sideChat.running"),
						children: "⟳"
					})
				]
			});
		}
		/** Stable fallbacks so the body's hooks are unconditional. */
		const NO_ROWS = [];
		const EMPTY_ROWS = {
			getSnapshot: () => NO_ROWS,
			subscribe: () => () => {}
		};
		const EMPTY_RUNNING = {
			getSnapshot: () => false,
			subscribe: () => () => {}
		};
		/** One conversation row. */
		function Row({ row }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dsh-ph-sidechat-row dsh-ph-sidechat-row--${row.role}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-ph-sidechat-role",
					children: row.role
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-ph-sidechat-text",
					children: row.text
				})]
			});
		}
		/** The tab body: thread strip, conversation area and composer. */
		function SideChatBody(props) {
			const snapshot = useThreadSnapshot();
			const list = snapshot.threads;
			const [activeId, setActiveId] = (0, react.useState)(null);
			const [draft, setDraft] = (0, react.useState)("");
			const active = list.find((thread) => thread.id === activeId) ?? list[list.length - 1] ?? null;
			const rowsObs = active === null ? EMPTY_ROWS : threads.rowsOf(active.sessionId);
			const runObs = active === null ? EMPTY_RUNNING : threads.runningOf(active.sessionId);
			const rows = (0, react.useSyncExternalStore)(rowsObs.subscribe.bind(rowsObs), rowsObs.getSnapshot.bind(rowsObs));
			const running = (0, react.useSyncExternalStore)(runObs.subscribe.bind(runObs), runObs.getSnapshot.bind(runObs));
			const logRef = (0, react.useRef)(null);
			const mainSessionId = props.sessionId ?? "";
			const mainRowsObs = mainSessionId === "" ? EMPTY_ROWS : threads.rowsOf(mainSessionId);
			const mainRunObs = mainSessionId === "" ? EMPTY_RUNNING : threads.runningOf(mainSessionId);
			const mainRows = (0, react.useSyncExternalStore)(mainRowsObs.subscribe.bind(mainRowsObs), mainRowsObs.getSnapshot.bind(mainRowsObs));
			const mainRunning = (0, react.useSyncExternalStore)(mainRunObs.subscribe.bind(mainRunObs), mainRunObs.getSnapshot.bind(mainRunObs));
			const anyThreadRunning = list.some((thread) => threads.stateOf(thread.id).running);
			const guardOn = getPrefs().writeGuard && getPrefs().sideChat;
			const history = (0, react.useMemo)(() => {
				const out = [];
				for (const row of rows) {
					if (row.role !== "user") continue;
					if (out[out.length - 1] !== row.text) out.push(row.text);
				}
				return out;
			}, [rows]);
			const predictContext = (0, react.useCallback)(() => rows.slice(-8).map((row) => `${row.role}: ${row.text}`).join("\n").slice(-6e3), [rows]);
			const startRef = (0, react.useRef)(() => {});
			(0, react.useEffect)(() => {
				return subscribeSideChatInsert((text) => {
					setDraft((previous) => previous === "" ? text : `${previous}\n\n${text}`);
					if (threads.list().length === 0) startRef.current("fork");
				});
			}, []);
			(0, react.useEffect)(() => {
				threads.setViewed(active?.id ?? null);
			}, [active?.id, snapshot]);
			(0, react.useEffect)(() => {
				const log = logRef.current;
				if (log !== null) log.scrollTop = log.scrollHeight;
			}, [rows.length, active?.id]);
			const sourceId = props.sessionId ?? "";
			const start = (origin) => {
				const label = origin === "fork" ? T("sideChat.origin.fork") : T("sideChat.origin.blank");
				threads.start(origin, sourceId, label).then((thread) => {
					if (thread !== null) setActiveId(thread.id);
				});
			};
			const baseline = active === null ? 0 : threads.stateOf(active.id).baseline;
			const ownRows = rows.slice(baseline);
			const guard = (0, react.useMemo)(() => {
				if (!guardOn || ownRows.length === 0 || mainRows.length === 0) return {
					parallel: false,
					clash: []
				};
				const clash = overlaps(extractPaths(ownRows.slice(-80)), extractPaths(mainRows.slice(-80)));
				return {
					parallel: mainRunning && anyThreadRunning,
					clash
				};
			}, [
				guardOn,
				ownRows,
				mainRows,
				mainRunning,
				anyThreadRunning
			]);
			startRef.current = start;
			/**
			* Hand this thread's conclusion back to the main composer: the last assistant
			* answer when there is one, otherwise the tail of the transcript (a thread can
			* still be mid-turn, and its tool output is often the useful part).
			*/
			const sendToMain = () => {
				const text = [...rows].reverse().find((row) => row.role === "assistant")?.text ?? rows.slice(-6).map((row) => `${row.role}: ${row.text}`).join("\n");
				if (text.trim() === "") return;
				if (insertIntoMain(quoteBlock(text))) flashCopied(null, T("sideChat.sentToMain"));
			};
			const submit = () => {
				if (draft.trim() === "") return;
				const text = draft;
				const target = active;
				setDraft("");
				if (target !== null) {
					threads.send(target, text);
					return;
				}
				threads.start("fork", sourceId, T("sideChat.origin.fork")).then((thread) => {
					if (thread !== null) {
						setActiveId(thread.id);
						threads.send(thread, text);
					}
				});
			};
			let info;
			try {
				info = props.useTabInfo?.();
			} catch {
				info = void 0;
			}
			const tabId = info?.tab?.id;
			const paneId = info?.panel?.id;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-ph-sidechat",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ph-sidechat-head",
						children: [
							tabId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ph-iconButton",
								title: T("sideChat.float"),
								onClick: () => {
									floatSideChatTab(tabId);
								},
								children: "⧉"
							}),
							paneId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ph-iconButton",
								title: T("sideChat.split"),
								onClick: () => {
									splitSideChatTab(paneId);
								},
								children: "◫"
							}),
							paneId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ph-iconButton",
								title: T("sideChat.dock"),
								onClick: () => {
									dockSideChatTab(paneId);
								},
								children: "⤓"
							}),
							rows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ph-iconButton",
								title: T("sideChat.sendToMain"),
								onClick: sendToMain,
								children: "⇧"
							}),
							info?.tab?.actions?.close !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ph-iconButton",
								title: T("sideChat.closeTab"),
								onClick: () => {
									info?.tab?.actions?.close?.();
								},
								children: "✕"
							})
						]
					}),
					guardOn && (guard.clash.length > 0 || guard.parallel) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: guard.clash.length > 0 ? "dsh-ph-guard dsh-ph-guard--clash" : "dsh-ph-guard",
						children: guard.clash.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: T("sideChat.guardClash") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: "dsh-ph-guardList",
							children: guard.clash.slice(0, 4).map((path) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: path }, path))
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: T("sideChat.guardParallel") })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ph-sidechat-strip",
						children: [
							list.map((thread) => {
								const state = snapshot.states.get(thread.id);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: thread.id === active?.id ? "dsh-ph-sidechat-chip dsh-ph-sidechat-chip--on" : "dsh-ph-sidechat-chip",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dsh-ph-sidechat-chipLabel",
										onClick: () => {
											setActiveId(thread.id);
										},
										children: [
											state?.running === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsh-ph-sidechat-running",
												"aria-label": T("sideChat.running"),
												children: "⟳ "
											}),
											thread.title,
											state !== void 0 && state.unread > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dsh-ph-sidechat-badge",
												children: state.unread
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ph-sidechat-chipClose",
										"aria-label": T("sideChat.close"),
										onClick: () => {
											threads.close(thread.id);
										},
										children: "×"
									})]
								}, thread.id);
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-ph-sidechat-chip",
								onClick: () => {
									start("fork");
								},
								children: ["＋", T("sideChat.newFork")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-ph-sidechat-chip",
								onClick: () => {
									start("blank");
								},
								children: ["＋", T("sideChat.newBlank")]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ph-sidechat-log",
						ref: logRef,
						children: active === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-ph-sidechat-empty",
							children: T("sideChat.empty")
						}) : rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-ph-sidechat-empty",
							children: T("sideChat.placeholder")
						}) : rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, { row }, `${row.key}:${row.text.length}`))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ph-sidechat-compose",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PromptComposer, {
							value: draft,
							onChange: setDraft,
							onSubmit: submit,
							running,
							history,
							predictContext,
							placeholder: T("sideChat.input")
						}), running ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-ph-button",
							onClick: () => {
								if (active !== null) threads.cancel(active);
							},
							children: T("sideChat.stop")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-ph-button",
							onClick: submit,
							children: T("sideChat.send")
						})]
					})
				]
			});
		}
		/**
		* Register the side-chat tab type and body while the feature is enabled, and
		* withdraw both when it is switched off (no reload required).
		* @param ctx - client context with `sidebarRightTabs` and `slots` injected.
		* @returns disposer that withdraws the registration.
		*/
		function installSideChat(ctx) {
			const disposeType = ctx.effect(() => ctx.sidebarRightTabs.register({
				id: SIDE_CHAT_ID,
				kind: SIDE_CHAT_KIND,
				multiple: true,
				keepMounted: true,
				priority: "extension",
				title: () => T("sideChat.title"),
				guide: [{
					id: "open",
					order: 30,
					title: () => T("sideChat.title"),
					description: () => T("sideChat.guideDesc")
				}]
			}), "dsh-prompt-history: side-chat type");
			const disposeBody = ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
				name: "sidebar.right.pane.tab",
				key: SIDE_CHAT_ID,
				locale: NS
			}, SideChatBody)), "dsh-prompt-history: side-chat body");
			const disposeTitle = ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
				name: "sidebar.right.pane.tab.title",
				key: SIDE_CHAT_ID,
				locale: NS
			}, SideChatTitle)), "dsh-prompt-history: side-chat title");
			return () => {
				disposeTitle();
				disposeBody();
				disposeType();
			};
		}
		/**
		* Bind the side chat to the sidebar services and follow the settings toggle.
		* @param ctx - a context that injects `sidebarRightTabs`, `sidebarRight` and `slots`.
		*/
		function bindSideChat(ctx) {
			serviceCtx = ctx;
			let dispose = null;
			const sync = () => {
				if (getPrefs().sideChat) {
					if (dispose === null) dispose = installSideChat(ctx);
				} else if (dispose !== null) {
					dispose();
					dispose = null;
				}
			};
			sync();
			ctx.effect(() => subscribePrefs(sync), "dsh-prompt-history: side-chat toggle");
		}
		/**
		* Open (or reveal) a side-chat tab.
		* @param thread - thread identity passed to the body as navigation params.
		*/
		function openSideChat(thread = "t1") {
			if (serviceCtx === null || !getPrefs().sideChat) return false;
			serviceCtx.sidebarRight.openTab(SIDE_CHAT_KIND, {
				params: { thread },
				preferNewPane: true,
				revealIfOpened: true
			});
			return true;
		}
		/**
		* Float the tab into its own panel (the shell owns the mechanics).
		* @param tabId - this tab's id from `useTabInfo`.
		*/
		function floatSideChatTab(tabId) {
			try {
				serviceCtx?.sidebarRight.float(tabId);
			} catch {}
		}
		/** Return a floating panel to the docked column. */
		function dockSideChatTab(paneId) {
			try {
				serviceCtx?.sidebarRight.dock(paneId);
			} catch {}
		}
		/**
		* Split the pane holding this tab and seed the new pane.
		* @param paneId - the containing pane from `useTabInfo`.
		*/
		function splitSideChatTab(paneId) {
			try {
				serviceCtx?.sidebarRight.split(paneId);
			} catch {}
		}
		//#endregion
		//#region src/client/bridge.ts
		/**
		* The bridge between the main conversation and the side chat.
		*
		* Two directions, one small registry each:
		*
		* - main → side: the selection toolbar (or any caller) hands text to the panel
		*   composer; the panel registers a listener when it is mounted, and anything
		*   sent while it is closed waits in a queue.
		* - side → main: the panel appends its conclusion to the main composer's draft
		*   through the inserter the composer entry registers for its session.
		*
		* @module dsh-prompt-history/client/bridge
		*/
		/** Format selection text as a plain markdown blockquote (the plugin's quote style). */
		function quoteBlock(text) {
			return `> ${text.replace(/\n/g, "\n> ")}`;
		}
		/** Registered by the main composer entry for its session. */
		let mainInserter = null;
		/**
		* Register the main composer's "append to draft" behaviour.
		* @param insert - receives the text; returns whether it landed.
		* @returns disposer that clears the registration when the same handler is current.
		*/
		function registerMainInserter(insert) {
			mainInserter = insert;
			return () => {
				if (mainInserter === insert) mainInserter = null;
			};
		}
		/**
		* Append text to the main composer draft.
		* @param text - already-formatted text (quote or plain).
		* @returns whether a main composer accepted it.
		*/
		function insertIntoMain(text) {
			return mainInserter === null ? false : mainInserter(text);
		}
		/** Side-chat composer listeners (the panel registers while mounted). */
		const panelListeners = /* @__PURE__ */ new Set();
		/** Text sent while the panel was closed. */
		const pending = [];
		/**
		* Send text to the side-chat composer, opening the panel first.
		*
		* Text is delivered to a mounted panel immediately, or queued until one mounts
		* (the panel drains the queue when it subscribes).
		* @param text - already-formatted text (typically a quote block).
		*/
		function sendToSideChat(text) {
			if (text.trim() === "") return;
			if (!openSideChat()) {
				flashCopied(null, T("sideChat.disabledHint"));
				return;
			}
			if (panelListeners.size === 0) {
				pending.push(text);
				return;
			}
			for (const listener of [...panelListeners]) try {
				listener(text);
			} catch {}
		}
		/**
		* Subscribe the panel composer to incoming text.
		* @param listener - receives text (queued text is flushed immediately).
		* @returns disposer removing the listener.
		*/
		function subscribeSideChatInsert(listener) {
			panelListeners.add(listener);
			for (const text of pending.splice(0)) try {
				listener(text);
			} catch {}
			return () => {
				panelListeners.delete(listener);
			};
		}
		//#endregion
		//#region src/client/ChatToc.tsx
		/**
		* ChatToc: a subtle Codex-style conversation directory. A low-opacity grip on
		* the chat's left edge expands a panel listing every user-submitted message
		* (oldest → newest); clicking an entry scrolls the conversation to that
		* message. Rendered via a portal to document.body so the fixed positioning is
		* viewport-relative, and lives off the conversation snapshot's user nodes.
		*/
		/** The TOC grip + panel entry. */
		function ChatToc({ texts, onWiden }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [origin, setOrigin] = (0, react.useState)({
				left: 0,
				top: 0,
				bottom: 0
			});
			const panelRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (open && onWiden !== void 0) onWiden();
			}, [open]);
			const USER_ROW = "[data-chat-anchor-key][data-chat-flow-kind=\"user\"], [data-chat-anchor-key][data-chat-flow-kind=\"steering\"]";
			const [rowMap, setRowMap] = (0, react.useState)([]);
			(0, react.useLayoutEffect)(() => {
				if (!open || texts.length === 0) {
					setRowMap([]);
					return;
				}
				const norm = (t) => (t ?? "").replace(/\s+/g, " ").trim();
				let rows = [...document.querySelectorAll(USER_ROW)];
				if (rows.length === 0) rows = [...document.querySelectorAll("[data-chat-anchor-key]")];
				const rowTexts = rows.map((row) => norm(row.textContent ?? ""));
				const map = [];
				let cursor = 0;
				for (const text of texts) {
					const target = norm(text);
					while (cursor < rowTexts.length && !(rowTexts[cursor]?.includes(target) ?? false)) cursor++;
					map.push(cursor < rowTexts.length ? cursor : -1);
				}
				setRowMap(map);
			}, [open, texts]);
			const tipSetterRef = (0, react.useRef)(null);
			const jumpTo = (index) => {
				const mapped = rowMap[index];
				let hit;
				if (mapped !== void 0 && mapped >= 0) {
					const rows = [...document.querySelectorAll(USER_ROW)];
					hit = (rows.length > 0 ? rows : [...document.querySelectorAll("[data-chat-anchor-key]")])[mapped];
				}
				if (hit === void 0) {
					const norm = (t) => (t ?? "").replace(/\s+/g, " ").trim();
					const target = norm(texts[index] ?? "");
					hit = [...document.querySelectorAll("[data-chat-anchor-key]")].find((row) => norm(row.textContent ?? "").includes(target));
				}
				if (hit === void 0) return;
				hit.scrollIntoView({ block: "start" });
				tipSetterRef.current?.(null);
				setOpen(false);
			};
			const measure = (0, react.useCallback)(() => {
				const scrollport = document.querySelector("[data-conversation-scroll]");
				if (scrollport === null) return;
				const rect = scrollport.getBoundingClientRect();
				setOrigin({
					left: rect.left,
					top: rect.top,
					bottom: rect.bottom
				});
			}, []);
			(0, react.useEffect)(() => {
				measure();
				window.addEventListener("resize", measure);
				return () => {
					window.removeEventListener("resize", measure);
				};
			}, [measure]);
			const POS_KEY = "dsh-prompt-history.tocPos";
			const [pos, setPos] = (0, react.useState)(null);
			const dragRef = (0, react.useRef)(null);
			const movedRef = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				try {
					const raw = localStorage.getItem(POS_KEY);
					if (raw !== null) setPos(JSON.parse(raw));
				} catch {}
			}, []);
			(0, react.useEffect)(() => {
				const scrollport = document.querySelector("[data-conversation-scroll]");
				if (scrollport === null) return;
				const observer = new ResizeObserver(() => {
					measure();
					setPos((current) => {
						if (current === null) return current;
						const left = Math.min(Math.max(4, current.left), Math.max(4, window.innerWidth - 24));
						const top = Math.min(Math.max(4, current.top), Math.max(4, window.innerHeight - 56));
						return left === current.left && top === current.top ? current : {
							left,
							top
						};
					});
				});
				observer.observe(scrollport);
				return () => {
					observer.disconnect();
				};
			}, [measure]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onPointerDown = (e) => {
					if (e.target instanceof Node && panelRef.current?.contains(e.target)) return;
					setTip(null);
					setOpen(false);
				};
				const onKeyDown = (e) => {
					if (e.key === "Escape") {
						setTip(null);
						setOpen(false);
					}
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("keydown", onKeyDown, true);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("keydown", onKeyDown, true);
				};
			}, [open]);
			const startDrag = (e) => {
				e.preventDefault();
				dragRef.current = {
					startX: e.clientX,
					startY: e.clientY,
					baseLeft: pos?.left ?? origin.left + 6,
					baseTop: pos?.top ?? gripY() - 26
				};
				movedRef.current = false;
			};
			const gripY = () => Math.round((origin.top + origin.bottom) / 2);
			const onDragMove = (0, react.useCallback)((e) => {
				const drag = dragRef.current;
				if (drag === null) return;
				if (Math.abs(e.clientX - drag.startX) > 4 || Math.abs(e.clientY - drag.startY) > 4) movedRef.current = true;
				const left = Math.min(Math.max(4, drag.baseLeft + e.clientX - drag.startX), window.innerWidth - 24);
				const top = Math.min(Math.max(4, drag.baseTop + e.clientY - drag.startY), window.innerHeight - 56);
				setPos({
					left,
					top
				});
			}, []);
			const endDrag = (0, react.useCallback)(() => {
				if (dragRef.current === null) return;
				dragRef.current = null;
				try {
					const current = pos;
					if (current !== null) localStorage.setItem(POS_KEY, JSON.stringify(current));
				} catch {}
			}, [pos]);
			const SIZE_KEY = "dsh-prompt-history.tocSize";
			const [size, setSize] = (0, react.useState)(null);
			const resizeRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				try {
					const raw = localStorage.getItem(SIZE_KEY);
					if (raw !== null) setSize(JSON.parse(raw));
				} catch {}
			}, []);
			const startResize = (e) => {
				e.preventDefault();
				e.stopPropagation();
				const panel = panelRef.current;
				if (panel === null) return;
				const rect = panel.getBoundingClientRect();
				resizeRef.current = {
					startX: e.clientX,
					startY: e.clientY,
					baseW: rect.width,
					baseH: rect.height
				};
			};
			const onResizeMove = (0, react.useCallback)((e) => {
				const resize = resizeRef.current;
				if (resize === null) return;
				const width = Math.min(Math.max(260, resize.baseW + e.clientX - resize.startX), Math.min(560, window.innerWidth - 16));
				const height = Math.min(Math.max(160, resize.baseH + e.clientY - resize.startY), window.innerHeight - 8);
				setSize({
					width,
					height
				});
			}, []);
			const endResize = (0, react.useCallback)(() => {
				if (resizeRef.current === null) return;
				resizeRef.current = null;
				try {
					const current = size;
					if (current !== null) localStorage.setItem(SIZE_KEY, JSON.stringify(current));
				} catch {}
			}, [size]);
			(0, react.useEffect)(() => {
				window.addEventListener("mousemove", onDragMove);
				window.addEventListener("mousemove", onResizeMove);
				window.addEventListener("mouseup", endDrag);
				window.addEventListener("mouseup", endResize);
				return () => {
					window.removeEventListener("mousemove", onDragMove);
					window.removeEventListener("mousemove", onResizeMove);
					window.removeEventListener("mouseup", endDrag);
					window.removeEventListener("mouseup", endResize);
				};
			}, [
				onDragMove,
				onResizeMove,
				endDrag,
				endResize
			]);
			const gripLeft = pos?.left ?? origin.left + 6;
			const gripTop = pos?.top ?? gripY() - 26;
			const [panelStyle, setPanelStyle] = (0, react.useState)(null);
			(0, react.useLayoutEffect)(() => {
				if (!open || texts.length === 0) return;
				const panel = panelRef.current;
				if (panel === null) return;
				const gap = 8;
				const gripRight = gripLeft + 20;
				const gripCenterY = gripTop + 26;
				const width = size?.width ?? 300;
				const maxHeight = size?.height !== void 0 ? Math.min(size.height, window.innerHeight - 8) : Math.min(Math.min(panel.getBoundingClientRect().height, 480), window.innerHeight - 8);
				const left = Math.max(4, Math.min(gripRight + gap, window.innerWidth - width - 8));
				const top = Math.max(4, Math.min(gripCenterY - maxHeight / 2, window.innerHeight - maxHeight - 4));
				const next = size?.height !== void 0 ? {
					top,
					left,
					width,
					height: maxHeight
				} : {
					top,
					left,
					width,
					maxHeight
				};
				setPanelStyle((prev) => prev !== null && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.maxHeight === next.maxHeight && prev.height === next.height ? prev : next);
			}, [
				open,
				texts.length,
				gripLeft,
				gripTop,
				size
			]);
			const [tip, setTip] = (0, react.useState)(null);
			tipSetterRef.current = setTip;
			const showTip = (0, react.useCallback)((text, rect) => {
				const width = Math.min(420, window.innerWidth - 24);
				const x = Math.max(4, Math.min(rect.left, window.innerWidth - width - 8));
				const y = rect.bottom + 6 < window.innerHeight - 8 ? rect.bottom + 6 : Math.max(4, rect.top - 308);
				setTip({
					text,
					x,
					y
				});
			}, []);
			const hideTip = (0, react.useCallback)(() => {
				setTip(null);
			}, []);
			const enterRow = (0, react.useCallback)((e, text) => {
				const label = e.currentTarget.querySelector(".dsh-ph-toc-label");
				if (label !== null && label.scrollWidth > label.clientWidth + 1) showTip(text, e.currentTarget.getBoundingClientRect());
				else setTip(null);
			}, [showTip]);
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-ph-toc-grip",
					"aria-label": T("toc.aria"),
					title: T("toc.aria"),
					onClick: () => {
						if (movedRef.current) {
							movedRef.current = false;
							return;
						}
						measure();
						setOpen((v) => !v);
					},
					onMouseDown: startDrag,
					style: {
						top: gripTop,
						left: gripLeft,
						cursor: dragRef.current !== null ? "grabbing" : "grab"
					},
					children: "☰"
				}),
				open && texts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: panelRef,
					className: "dsh-ph-toc",
					style: panelStyle ?? {
						top: Math.max(4, gripTop - 8),
						left: Math.min(gripLeft + 30, window.innerWidth - 230),
						width: 300
					},
					onMouseLeave: hideTip,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ph-toc-title",
							children: T("toc.title")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ph-toc-list",
							onScroll: hideTip,
							children: texts.map((text, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-ph-toc-item",
								onClick: () => {
									jumpTo(i);
								},
								onMouseEnter: (e) => {
									enterRow(e, text);
								},
								onMouseLeave: hideTip,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ph-toc-idx",
									children: i + 1
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ph-toc-label",
									children: text
								})]
							}, `${i}:${text}`))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ph-toc-resize",
							title: T("toc.resize"),
							onMouseDown: startResize
						})
					]
				}),
				tip !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-ph-toc-tip",
					style: {
						left: tip.x,
						top: tip.y
					},
					children: tip.text
				})
			] }), document.body);
		}
		//#endregion
		//#region src/client/InputHistory.tsx
		/**
		* InputHistory: bash-like prompt history + right-click paste for the composer
		* (dsh-prompt-history). Renders nothing — it mounts capture-phase listeners on
		* the document while the session's composer card is live.
		*
		* Prompt history: Up recalls previously submitted prompts (newest first), Down
		* walks forward and restores the line that was being typed before browsing
		* began; editing the draft while browsing drops back to the live line. The '/'
		* and '@' suggestion menus keep their own arrow-key navigation: while the menu
		* (role=listbox inside the composer card) is open, the history listener
		* declines and the input trigger pipeline owns the keys.
		*
		* Right-click paste (terminal-style, like Linux): a right-click on the composer
		* textarea pastes the clipboard directly — no context menu. Paste runs the
		* SAME pipeline as Ctrl+V (execCommand('paste') fires the composer's own paste
		* handler, so images and reference chips behave identically), with a
		* navigator.clipboard fallback that splices text at the caret.
		*
		* Copy on select: any selection in the composer textarea (left-drag,
		* double-click, keyboard Shift+arrows, Ctrl+A) auto-copies once it stabilizes
		* — so select → right-click paste works end to end. Copy prefers the
		* composer's own handler (execCommand), with a navigator.clipboard fallback.
		*
		* History is fed from the conversation snapshot's user nodes (kind 'user' and
		* 'steering'), appended as they land — so everything submitted while the page
		* is open is recallable even after the session event window slides. Consecutive
		* duplicates collapse; on a session switch the window's in-window user messages
		* seed the list. Unlike a parallel storage ring, the history IS the session's
		* own message log: it stays consistent with the transcript, survives reloads
		* through the session itself, and needs no configuration or extra storage.
		*
		* Interception guards: composer textarea target only, no modifier keys
		* (Shift+Up still extends selection), no IME composition, machine not
		* adjudicating/submitting, session not removed.
		*/
		/** Not-browsing state; also the reset target after edits and session switches. */
		const RESET_BROWSE = {
			index: -1,
			saved: "",
			lastSet: null
		};
		/** The suggestion menu (slash/at) renders a listbox inside the card while open. */
		const OPEN_MENU = "[role=\"listbox\"]";
		/** Pull the ordered node array out of whichever snapshot shape is present. */
		function rawNodesOf(snapshot) {
			const legacy = snapshot.legacy?.nodes;
			if (Array.isArray(legacy)) return legacy;
			const order = snapshot.order;
			const store = snapshot.nodes;
			if (Array.isArray(order) && store !== void 0 && typeof store.get === "function") return order.map((key) => store.get?.(key)).filter((n) => n !== null && n !== void 0);
			if (Array.isArray(snapshot.nodes)) return snapshot.nodes;
			return [];
		}
		/**
		* The composer history + right-click-paste entry.
		* @param props - framework standard kit (useInput/useSession/inputActions/sessionId).
		* @returns null (the entry is invisible chrome).
		*/
		function InputHistory(props) {
			const { useInput, useSession, inputActions, sessionId } = props;
			const useChat = props.useChat;
			const nodesHook = typeof useChat === "function" ? useChat : useSession;
			const sessionHook = useSession;
			const draft = useInput((s) => s.draft);
			const phase = useInput((s) => s.phase);
			const rawNodes = nodesHook?.((s) => rawNodesOf(s)) ?? [];
			const messages = (0, react.useMemo)(() => rawNodes.map(promptMessage).filter((m) => m !== null), [rawNodes]);
			const tocTexts = (0, react.useMemo)(() => {
				const out = [];
				for (const message of messages) if (message.text !== null && out[out.length - 1] !== message.text) out.push(message.text);
				return out;
			}, [messages]);
			const removed = sessionHook?.((s) => s.removed) ?? false;
			const hasMore = sessionHook?.((s) => s.hasMore) ?? false;
			const loadingOlder = sessionHook?.((s) => s.loadingOlder) ?? false;
			const openState = sessionHook?.((s) => s.openState) ?? "";
			const [widen, setWiden] = (0, react.useState)(false);
			const widenBusyRef = (0, react.useRef)(false);
			const widenPagesRef = (0, react.useRef)(0);
			const requestWiden = (0, react.useCallback)(() => {
				setWiden(true);
			}, []);
			(0, react.useEffect)(() => {
				if (!widen) return;
				if (removed || openState !== "open") {
					setWiden(false);
					return;
				}
				if (!hasMore) {
					setWiden(false);
					return;
				}
				if (loadingOlder || widenBusyRef.current) return;
				if (widenPagesRef.current >= 60) {
					setWiden(false);
					return;
				}
				widenBusyRef.current = true;
				widenPagesRef.current += 1;
				pullOlderPage(sessionId).finally(() => {
					widenBusyRef.current = false;
				});
			}, [
				widen,
				hasMore,
				loadingOlder,
				openState,
				sessionId,
				removed
			]);
			/** Submitted prompt texts, oldest → newest (per session; append-only). */
			const historyRef = (0, react.useRef)([]);
			/** User-node seqs already folded into historyRef (append-once dedup). */
			const seenRef = (0, react.useRef)(/* @__PURE__ */ new Set());
			const browseRef = (0, react.useRef)(RESET_BROWSE);
			const searchRef = (0, react.useRef)(null);
			const liveRef = (0, react.useRef)({
				draft,
				phase,
				removed,
				inputActions
			});
			liveRef.current = {
				draft,
				phase,
				removed,
				inputActions
			};
			/** Draft the user dismissed the ghost on (Esc); cleared whenever it changes. */
			const dismissedRef = (0, react.useRef)(null);
			const prefs = (0, react.useSyncExternalStore)(subscribePrefs, getPrefs);
			/**
			* Recompute the ghost from the live draft + caret. Cheap (a backward scan
			* over the history ring) and idempotent, so it can be driven from any event
			* that may have moved the caret or changed the draft.
			*/
			const syncCompletion = (0, react.useCallback)(() => {
				if (!getPrefs().promptCompletion) {
					hideGhost();
					return;
				}
				const host = editorHost();
				if (host === null) {
					hideGhost();
					return;
				}
				const card = document.querySelector(COMPOSER_CARD);
				if (card !== null && card.querySelector(OPEN_MENU) !== null) {
					hideGhost();
					return;
				}
				const live = liveRef.current;
				if (live.phase === "adjudicating" || live.phase === "submitting" || live.removed) {
					hideGhost();
					return;
				}
				const current = live.draft;
				if (!completionEligible(current)) {
					hideGhost();
					return;
				}
				if (dismissedRef.current === current) {
					hideGhost();
					return;
				}
				const offsets = editorSelectionOffsets(host);
				if (offsets === null || offsets.start !== current.length || offsets.end !== current.length) {
					hideGhost();
					return;
				}
				const suffix = matchCompletion(current, historyRef.current);
				if (suffix === null) {
					hideGhost();
					return;
				}
				showGhost(suffix, host);
			}, []);
			(0, react.useEffect)(() => registerMainInserter((text) => {
				const host = editorHost();
				if (host === null) return false;
				const live = liveRef.current;
				const next = live.draft === "" ? text : `${live.draft}\n\n${text}`;
				const actions = live.inputActions;
				if (typeof actions.captureInsertion === "function" && typeof actions.insertText === "function") try {
					if (actions.insertText(`${live.draft === "" ? "" : "\n\n"}${text}`, actions.captureInsertion()) === true) return true;
				} catch {}
				actions.setDraft?.(next);
				setEditorCaret(host, next.length);
				return true;
			}), []);
			(0, react.useEffect)(() => {
				dismissedRef.current = null;
			}, [draft]);
			/** Last prediction, keyed by session + context so it never crosses sessions. */
			const suggestRef = (0, react.useRef)(null);
			/** Context the user dismissed with Escape (suppressed until it changes). */
			const suggestDismissedRef = (0, react.useRef)(null);
			const suggestAbortRef = (0, react.useRef)(null);
			const suggestTimerRef = (0, react.useRef)(null);
			/** One attempt chain at a time: overlapping triggers would cancel each other. */
			const suggestPendingRef = (0, react.useRef)(false);
			/** Empty model answers already retried for the current context. */
			const emptyTriesRef = (0, react.useRef)(0);
			/** Stop any scheduled or in-flight prediction and drop the overlay. */
			const clearSuggestion = (0, react.useCallback)(() => {
				if (suggestTimerRef.current !== null) {
					window.clearTimeout(suggestTimerRef.current);
					suggestTimerRef.current = null;
				}
				suggestAbortRef.current?.abort();
				suggestAbortRef.current = null;
				suggestPendingRef.current = false;
				hideSuggestion();
			}, []);
			/**
			* Predict the next prompt from the conversation and ghost it in the
			* (empty) composer. Cached per context, debounced, and cancelled by any
			* draft change or submit.
			*/
			const requestSuggestion = (0, react.useCallback)(() => {
				liveRef.current;
				if (!getPrefs().contextSuggest) {
					clearSuggestion();
					return;
				}
				const live = liveRef.current;
				if (live.draft !== "" || live.phase !== "plain" || live.removed) {
					clearSuggestion();
					return;
				}
				if (suggestPendingRef.current || suggestionVisible()) return;
				const bridge = getActiveBridge();
				if (bridge === null) return;
				const host = editorHost();
				if (host === null) return;
				suggestPendingRef.current = true;
				const controller = new AbortController();
				suggestAbortRef.current = controller;
				let attempts = 0;
				const attempt = () => {
					suggestTimerRef.current = null;
					const now = liveRef.current;
					if (controller.signal.aborted || now.draft !== "" || now.phase !== "plain" || now.removed) {
						suggestPendingRef.current = false;
						return;
					}
					let context = "";
					try {
						context = buildContext();
					} catch (error) {
						suggestPendingRef.current = false;
						return;
					}
					if (context.trim() === "") {
						hideSuggestion();
						attempts += 1;
						if (attempts < 20) suggestTimerRef.current = window.setTimeout(attempt, 1200);
						else suggestPendingRef.current = false;
						return;
					}
					if (suggestDismissedRef.current === context) {
						suggestPendingRef.current = false;
						return;
					}
					const key = `${sessionId}:${context.slice(-600)}`;
					if (suggestRef.current?.key !== key) emptyTriesRef.current = 0;
					const cached = suggestRef.current;
					if (cached !== null && cached.key === key) {
						suggestPendingRef.current = false;
						if (cached.text !== "") showSuggestion(cached.text, T("suggest.accept"), host);
						return;
					}
					showPending(T("suggest.pending"), host);
					bridge.fetch(context, controller.signal).then((text) => {
						suggestPendingRef.current = false;
						if (controller.signal.aborted) return;
						const latest = liveRef.current;
						if (latest.draft !== "" || latest.phase !== "plain" || latest.removed) return;
						if (text === "") {
							hideSuggestion();
							if (emptyTriesRef.current < 2) {
								emptyTriesRef.current += 1;
								attempt();
							}
							return;
						}
						emptyTriesRef.current = 0;
						suggestRef.current = {
							key,
							text
						};
						showSuggestion(text, T("suggest.accept"), host);
					});
				};
				suggestTimerRef.current = window.setTimeout(attempt, 300);
			}, [clearSuggestion]);
			(0, react.useEffect)(() => {
				suggestRef.current = null;
				suggestDismissedRef.current = null;
				emptyTriesRef.current = 0;
				clearSuggestion();
			}, [sessionId, clearSuggestion]);
			(0, react.useEffect)(() => {
				const card = document.querySelector(COMPOSER_CARD);
				if (card === null) return;
				const onFocusIn = (event) => {
					if (!isEditorTarget(event.target)) return;
					requestSuggestion();
				};
				card.addEventListener("focusin", onFocusIn);
				const onEdit = () => {
					clearSuggestion();
				};
				card.addEventListener("beforeinput", onEdit, true);
				card.addEventListener("input", onEdit, true);
				card.addEventListener("paste", onEdit, true);
				const scrollport = document.querySelector("[data-conversation-scroll]") ?? document.body;
				const observer = new MutationObserver(() => {
					requestSuggestion();
				});
				observer.observe(scrollport, {
					childList: true,
					subtree: true,
					characterData: true
				});
				return () => {
					card.removeEventListener("focusin", onFocusIn);
					card.removeEventListener("beforeinput", onEdit, true);
					card.removeEventListener("input", onEdit, true);
					card.removeEventListener("paste", onEdit, true);
					observer.disconnect();
				};
			}, [requestSuggestion, clearSuggestion]);
			(0, react.useEffect)(() => {
				if (draft !== "") {
					clearSuggestion();
					return;
				}
				if (phase === "plain") requestSuggestion();
				else clearSuggestion();
			}, [
				draft,
				phase,
				messages.length,
				clearSuggestion,
				requestSuggestion
			]);
			(0, react.useEffect)(() => {
				syncCompletion();
				document.addEventListener("selectionchange", syncCompletion);
				window.addEventListener("resize", syncCompletion);
				window.addEventListener("scroll", syncCompletion, true);
				return () => {
					document.removeEventListener("selectionchange", syncCompletion);
					window.removeEventListener("resize", syncCompletion);
					window.removeEventListener("scroll", syncCompletion, true);
					hideGhost();
				};
			}, [
				syncCompletion,
				draft,
				messages,
				prefs.promptCompletion
			]);
			const RING_KEY = "dsh-prompt-history.global";
			const loadRing = () => {
				try {
					const raw = localStorage.getItem(RING_KEY);
					if (raw === null) return [];
					const parsed = JSON.parse(raw);
					return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
				} catch {
					return [];
				}
			};
			const saveRing = (history) => {
				try {
					localStorage.setItem(RING_KEY, JSON.stringify(history.slice(-200)));
				} catch {}
			};
			(0, react.useEffect)(() => {
				if (getPrefs().globalHistory && historyRef.current.length === 0) historyRef.current = loadRing();
			}, []);
			(0, react.useEffect)(() => {
				if (!getPrefs().globalHistory) historyRef.current = [];
				seenRef.current = /* @__PURE__ */ new Set();
				browseRef.current = RESET_BROWSE;
				searchRef.current = null;
				hideSearchOverlay();
			}, [sessionId]);
			(0, react.useEffect)(() => {
				const seen = seenRef.current;
				const history = historyRef.current;
				const globalOn = getPrefs().globalHistory;
				for (const message of messages) {
					if (seen.has(message.seq)) continue;
					seen.add(message.seq);
					if (message.text === null) continue;
					if (globalOn ? !history.includes(message.text) : history[history.length - 1] !== message.text) history.push(message.text);
				}
				if (globalOn) saveRing(historyRef.current);
			}, [messages]);
			(0, react.useEffect)(() => {
				const browse = browseRef.current;
				if (browse.index !== -1 && draft !== browse.lastSet) browseRef.current = RESET_BROWSE;
			}, [draft]);
			/**
			* Accept the visible prediction: focus the composer, insert the text through
			* the official insertion pair (falling back to a draft write), and drop the
			* overlay. Safe to call from anywhere — a missing editor simply does nothing.
			* @returns whether something was accepted.
			*/
			const acceptSuggestion = (0, react.useCallback)(() => {
				const predicted = suggestRef.current;
				if (predicted === null || predicted.text === "") return false;
				const host = editorHost();
				if (host === null) return false;
				const actions = liveRef.current.inputActions;
				focusEditor(host);
				let inserted = false;
				if (typeof actions.captureInsertion === "function" && typeof actions.insertText === "function") try {
					inserted = actions.insertText(predicted.text, actions.captureInsertion()) === true;
				} catch {
					inserted = false;
				}
				if (!inserted) {
					actions.setDraft?.(predicted.text);
					setEditorCaret(host, predicted.text.length);
				}
				clearSuggestion();
				dismissedRef.current = null;
				return true;
			}, [clearSuggestion]);
			(0, react.useEffect)(() => {
				const onKeyDown = (e) => {
					const target = e.target;
					if ((e.key === "Tab" || e.key === "ArrowRight") && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && suggestionVisible() && liveRef.current.draft === "" && suggestRef.current !== null) {
						const active = document.activeElement;
						if (!(active instanceof HTMLElement && active !== document.body && active.closest("[data-composer-card]") === null && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable))) {
							e.preventDefault();
							e.stopPropagation();
							acceptSuggestion();
							return;
						}
					}
					if (!isEditorTarget(target)) return;
					const card = target.closest(COMPOSER_CARD);
					if (card === null) return;
					if (e.isComposing || e.keyCode === 229) return;
					if (card.querySelector(OPEN_MENU) !== null) return;
					const live = liveRef.current;
					if (live.phase === "adjudicating" || live.phase === "submitting" || live.removed) return;
					const history = historyRef.current;
					const recall = (index) => history[index] ?? "";
					const searchMatches = (query) => {
						const out = [];
						history.forEach((entry, i) => {
							if (entry.includes(query)) out.push(i);
						});
						return out;
					};
					const prefixMatches = (prefix) => {
						const out = [];
						history.forEach((entry, i) => {
							if (entry.startsWith(prefix)) out.push(i);
						});
						return out;
					};
					if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === "Space" || e.key === " ")) {
						if (live.draft !== "" || live.phase !== "plain" || live.removed) return;
						e.preventDefault();
						e.stopPropagation();
						suggestDismissedRef.current = null;
						suggestPendingRef.current = false;
						hideSuggestion();
						requestSuggestion();
						return;
					}
					if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "r") {
						const active = searchRef.current;
						if (active !== null) {
							e.preventDefault();
							e.stopPropagation();
							const matches = searchMatches(active.query);
							const pos = matches.indexOf(active.matchIndex);
							if (pos > 0) {
								const matchIndex = matches[pos - 1] ?? 0;
								searchRef.current = {
									...active,
									matchIndex
								};
								live.inputActions.setDraft(recall(matchIndex));
								showSearchOverlay(active.query, recall(matchIndex));
							}
							return;
						}
						if (history.length === 0) return;
						e.preventDefault();
						e.stopPropagation();
						hideSelectionToolbar();
						const matchIndex = history.length - 1;
						searchRef.current = {
							preSearch: live.draft,
							query: "",
							matchIndex
						};
						live.inputActions.setDraft(recall(matchIndex));
						showSearchOverlay("", recall(matchIndex));
						return;
					}
					const active = searchRef.current;
					if (active !== null) {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							e.stopPropagation();
							searchRef.current = null;
							hideSearchOverlay();
							return;
						}
						if (e.key === "Escape") {
							e.preventDefault();
							e.stopPropagation();
							searchRef.current = null;
							hideSearchOverlay();
							live.inputActions.setDraft(active.preSearch);
							return;
						}
						if (e.key === "Backspace") {
							e.preventDefault();
							e.stopPropagation();
							const query = active.query.slice(0, -1);
							const matches = searchMatches(query);
							if (query === "") {
								const matchIndex = history.length - 1;
								searchRef.current = {
									...active,
									query,
									matchIndex
								};
								live.inputActions.setDraft(recall(matchIndex));
								showSearchOverlay("", recall(matchIndex));
							} else if (matches.length > 0) {
								const matchIndex = matches[matches.length - 1] ?? 0;
								searchRef.current = {
									...active,
									query,
									matchIndex
								};
								live.inputActions.setDraft(recall(matchIndex));
								showSearchOverlay(query, recall(matchIndex));
							} else {
								searchRef.current = {
									...active,
									query,
									matchIndex: -1
								};
								showSearchOverlay(query, "(无匹配)");
							}
							return;
						}
						if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
							e.preventDefault();
							e.stopPropagation();
							const query = active.query + e.key;
							const matches = searchMatches(query);
							const matchIndex = matches.length > 0 ? matches[matches.length - 1] ?? 0 : -1;
							searchRef.current = {
								...active,
								query,
								matchIndex
							};
							if (matchIndex >= 0) {
								live.inputActions.setDraft(recall(matchIndex));
								showSearchOverlay(query, recall(matchIndex));
							} else {
								live.inputActions.setDraft(active.preSearch);
								showSearchOverlay(query, "(无匹配)");
							}
							return;
						}
						searchRef.current = null;
						hideSearchOverlay();
						return;
					}
					if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
						if (e.key === "Escape" && suggestionVisible()) {
							suggestDismissedRef.current = buildContext();
							clearSuggestion();
							return;
						}
						if ((e.key === "Tab" || e.key === "ArrowRight") && live.draft === "" && suggestionVisible() && acceptSuggestion()) {
							e.preventDefault();
							e.stopPropagation();
							return;
						}
					}
					if (getPrefs().promptCompletion && !e.ctrlKey && !e.metaKey && !e.altKey) {
						if (e.key === "Escape" && ghostVisible()) {
							dismissedRef.current = live.draft;
							hideGhost();
							return;
						}
						if ((e.key === "Tab" || e.key === "ArrowRight" && !e.shiftKey) && !e.shiftKey) {
							const host = editorHost();
							if (host !== null) {
								const offsets = editorSelectionOffsets(host);
								if (offsets !== null && offsets.start === live.draft.length && offsets.end === live.draft.length) {
									const suffix = matchCompletion(live.draft, history);
									if (suffix !== null) {
										e.preventDefault();
										e.stopPropagation();
										const actions = live.inputActions;
										let inserted = false;
										if (typeof actions.captureInsertion === "function" && typeof actions.insertText === "function") try {
											inserted = actions.insertText(suffix, actions.captureInsertion()) === true;
										} catch {
											inserted = false;
										}
										if (!inserted) {
											const full = live.draft + suffix;
											actions.setDraft?.(full);
											setEditorCaret(host, full.length);
										}
										dismissedRef.current = null;
										hideGhost();
										return;
									}
								}
							}
						}
					}
					if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
					if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
					if (history.length === 0) return;
					const browse = browseRef.current;
					if (e.key === "ArrowDown" && browse.index === -1) return;
					e.preventDefault();
					e.stopPropagation();
					if (e.key === "ArrowUp") {
						if (browse.index === -1) {
							const draft = live.draft;
							if (draft !== "") {
								const matches = prefixMatches(draft);
								if (matches.length === 0) return;
								const index = matches[matches.length - 1] ?? 0;
								browseRef.current = {
									index,
									saved: draft,
									lastSet: recall(index),
									prefix: draft
								};
								live.inputActions.setDraft(recall(index));
							} else {
								const index = history.length - 1;
								browseRef.current = {
									index,
									saved: "",
									lastSet: recall(index)
								};
								live.inputActions.setDraft(recall(index));
							}
						} else if (browse.prefix !== void 0) {
							const matches = prefixMatches(browse.prefix);
							const pos = matches.indexOf(browse.index);
							if (pos > 0) {
								const index = matches[pos - 1] ?? 0;
								browseRef.current = {
									...browse,
									index,
									lastSet: recall(index)
								};
								live.inputActions.setDraft(recall(index));
							}
						} else {
							const index = Math.max(0, browse.index - 1);
							browseRef.current = {
								...browse,
								index,
								lastSet: recall(index)
							};
							live.inputActions.setDraft(recall(index));
						}
						return;
					}
					if (browse.prefix !== void 0) {
						const matches = prefixMatches(browse.prefix);
						const pos = matches.indexOf(browse.index);
						if (pos < matches.length - 1) {
							const index = matches[pos + 1] ?? 0;
							browseRef.current = {
								...browse,
								index,
								lastSet: recall(index)
							};
							live.inputActions.setDraft(recall(index));
						} else {
							browseRef.current = RESET_BROWSE;
							live.inputActions.setDraft(browse.saved);
						}
					} else if (browse.index + 1 >= history.length) {
						browseRef.current = RESET_BROWSE;
						live.inputActions.setDraft(browse.saved);
					} else {
						const index = browse.index + 1;
						browseRef.current = {
							...browse,
							index,
							lastSet: recall(index)
						};
						live.inputActions.setDraft(recall(index));
					}
				};
				document.addEventListener("keydown", onKeyDown, true);
				return () => {
					document.removeEventListener("keydown", onKeyDown, true);
				};
			}, []);
			(0, react.useEffect)(() => {
				const pasteInto = (host) => {
					focusEditor(host);
					if (document.execCommand("paste")) return;
					navigator.clipboard.readText().then((text) => {
						if (text === "") return;
						const sel = editorSelectionOffsets(host);
						const start = sel?.start ?? liveRef.current.draft.length;
						const end = sel?.end ?? start;
						const draft = liveRef.current.draft;
						const next = draft.slice(0, start) + text + draft.slice(end);
						liveRef.current.inputActions.setDraft(next);
						const caret = start + text.length;
						requestAnimationFrame(() => {
							setEditorCaret(host, caret);
						});
					}, () => {});
				};
				const onContextMenu = (e) => {
					const target = e.target;
					if (!isEditorTarget(target)) return;
					const live = liveRef.current;
					if (live.phase === "adjudicating" || live.phase === "submitting" || live.removed) return;
					if (!getPrefs().rightClickPaste) return;
					e.preventDefault();
					e.stopPropagation();
					const host = editorHost();
					if (host === null) return;
					focusEditor(host);
					pasteInto(host);
				};
				document.addEventListener("contextmenu", onContextMenu, true);
				return () => {
					document.removeEventListener("contextmenu", onContextMenu, true);
				};
			}, []);
			(0, react.useEffect)(() => {
				if (prefs.copyMode === "off") return;
				let timer;
				let lastKey = "";
				let dragStartedInEditor = false;
				const selectionRect = () => {
					try {
						const sel = document.getSelection();
						if (sel !== null && !sel.isCollapsed && sel.rangeCount > 0) {
							const rect = sel.getRangeAt(0).getBoundingClientRect();
							if (rect.width > 0 || rect.height > 0) return rect;
						}
					} catch {}
					const host = editorHost();
					if (host !== null && document.activeElement === host) {
						const rect = host.getBoundingClientRect();
						if (rect.width > 0 || rect.height > 0) return rect;
					}
					return null;
				};
				const copyText = (text, key, focusHost) => {
					if (key === lastKey) return;
					lastKey = key;
					if (focusHost !== void 0 && document.activeElement !== focusHost) focusEditor(focusHost);
					let ok = false;
					try {
						ok = document.execCommand("copy");
					} catch {
						ok = false;
					}
					if (ok) {
						flashCopied(selectionRect());
						return;
					}
					if (text === "") return;
					navigator.clipboard.writeText(text).then(() => {
						flashCopied(selectionRect());
					}, (error) => {
						console.warn("[dsh-prompt-history] clipboard copy failed:", error);
					});
				};
				const copySelection = () => {
					const live = liveRef.current;
					if (live.phase === "adjudicating" || live.phase === "submitting" || live.removed) return;
					const host = editorHost();
					if (host !== null && (document.activeElement === host || dragStartedInEditor)) {
						const text = editorSelectedText(host);
						if (text !== "") {
							copyText(text, `ed:${text}`, host);
							return;
						}
					}
					const sel = document.getSelection();
					if (sel === null || sel.isCollapsed || sel.rangeCount === 0) return;
					const text = sel.toString();
					if (text === "") return;
					copyText(text, `doc:${text}`);
				};
				const onMouseDown = (e) => {
					if (e.button !== 0) return;
					dragStartedInEditor = isEditorTarget(e.target);
				};
				const quoteSelection = () => {
					const live = liveRef.current;
					if (live.phase === "adjudicating" || live.phase === "submitting" || live.removed) return;
					const host = editorHost();
					if (host === null) return;
					const sel = document.getSelection();
					const selectionInHost = sel !== null && sel.rangeCount > 0 && sel.anchorNode !== null && host.contains(sel.anchorNode);
					const hostFocused = selectionInHost;
					let text = "";
					if (selectionInHost) text = editorSelectedText(host);
					else if (sel !== null && !sel.isCollapsed) text = sel.toString();
					if (text.trim() === "") return;
					const quoted = "> " + text.replace(/\n/g, "\n> ");
					const draft = live.draft;
					const caret = hostFocused ? editorSelectionOffsets(host)?.start ?? draft.length : draft.length;
					const lead = caret > 0 && draft[caret - 1] !== "\n" ? "\n\n" : caret > 0 ? "\n" : "";
					const next = draft.slice(0, caret) + lead + quoted + "\n" + draft.slice(caret);
					live.inputActions.setDraft(next);
					const pos = caret + lead.length + quoted.length + 1;
					requestAnimationFrame(() => {
						focusEditor(host);
						setEditorCaret(host, pos);
					});
					flashCopied(null, T("pill.quoted"));
				};
				const onSelectionChange = () => {
					const live = liveRef.current;
					if (live.phase === "adjudicating" || live.phase === "submitting" || live.removed) {
						hideSelectionToolbar();
						return;
					}
					const mode = getPrefs().copyMode;
					if (mode === "off") return;
					const host = editorHost();
					const editorActive = host !== null && (document.activeElement === host || dragStartedInEditor) && editorSelectedText(host) !== "";
					const sel = document.getSelection();
					const domActive = sel !== null && !sel.isCollapsed;
					if (!editorActive && !domActive) {
						window.clearTimeout(timer);
						hideSelectionToolbar();
						return;
					}
					window.clearTimeout(timer);
					timer = window.setTimeout(() => {
						if (getPrefs().copyMode !== mode) return;
						if (mode === "auto") copySelection();
						else {
							const rect = selectionRect();
							if (rect !== null) {
								const askInSideChat = getPrefs().sideChat ? () => {
									const selection = document.getSelection();
									const text = selection !== null && !selection.isCollapsed ? selection.toString() : "";
									if (text.trim() === "") return;
									sendToSideChat(quoteBlock(text));
								} : void 0;
								showSelectionToolbar(rect, quoteSelection, askInSideChat);
							}
						}
					}, 150);
				};
				const onKeyDown = (e) => {
					if (e.key === "Escape") hideSelectionToolbar();
				};
				const onPointerDown = (e) => {
					if (e.target instanceof Element && e.target.closest(".dsh-ph-toolbar") !== null) return;
					hideSelectionToolbar();
				};
				const onScroll = () => {
					hideSelectionToolbar();
				};
				document.addEventListener("selectionchange", onSelectionChange);
				document.addEventListener("mousedown", onMouseDown, true);
				document.addEventListener("keydown", onKeyDown, true);
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("scroll", onScroll, true);
				window.addEventListener("resize", hideSelectionToolbar);
				console.info("[dsh-prompt-history] copy modes active (toolbar/auto)");
				return () => {
					document.removeEventListener("selectionchange", onSelectionChange);
					document.removeEventListener("mousedown", onMouseDown, true);
					document.removeEventListener("keydown", onKeyDown, true);
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("scroll", onScroll, true);
					window.removeEventListener("resize", hideSelectionToolbar);
					window.clearTimeout(timer);
					hideSelectionToolbar();
				};
			}, [prefs.copyMode]);
			return prefs.tocVisible ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChatToc, {
				texts: tocTexts,
				onWiden: requestWiden
			}) : null;
		}
		//#endregion
		//#region src/client/SettingsSection.tsx
		/**
		* The settings-page section for dsh-prompt-history: grouped toggles for the two
		* composer completion sources, the clipboard behaviors and the session
		* navigation helpers, plus a bridge status line so a broken host link is
		* visible without opening the console.
		*/
		/** Copy-mode options in display order (keys resolve through the locale seat). */
		const COPY_MODES = [
			{
				value: "toolbar",
				label: "copyMode.toolbar"
			},
			{
				value: "auto",
				label: "copyMode.auto"
			},
			{
				value: "off",
				label: "copyMode.off"
			}
		];
		/** Section entry: grouped preferences plus the prediction-bridge status. */
		function SettingsSection({ t }) {
			const prefs = (0, react.useSyncExternalStore)(subscribePrefs, getPrefs);
			const bridgeReady = (0, react.useSyncExternalStore)(subscribeBridge, () => getActiveBridge() !== null);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-ph-settings",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h4", {
						className: "dsh-ph-title",
						children: [
							t("settings.title"),
							"（dsh-prompt-history v",
							PLUGIN_VERSION,
							"）"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-ph-group",
						children: t("settings.groupInput")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-ph-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: prefs.contextSuggest,
							onChange: (e) => {
								setPref("contextSuggest", e.target.checked);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("suggest.toggle") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-ph-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: prefs.promptCompletion,
							onChange: (e) => {
								setPref("promptCompletion", e.target.checked);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("completion.toggle") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-ph-group",
						children: t("settings.groupClipboard")
					}),
					COPY_MODES.map((mode) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-ph-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "radio",
							name: "dsh-ph-copy-mode",
							checked: prefs.copyMode === mode.value,
							onChange: () => {
								setPref("copyMode", mode.value);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(mode.label) })]
					}, mode.value)),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-ph-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: prefs.rightClickPaste,
							onChange: (e) => {
								setPref("rightClickPaste", e.target.checked);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("paste.toggle") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-ph-group",
						children: t("settings.groupNav")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-ph-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: prefs.tocVisible,
							onChange: (e) => {
								setPref("tocVisible", e.target.checked);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("toc.toggle") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-ph-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: prefs.globalHistory,
							onChange: (e) => {
								setPref("globalHistory", e.target.checked);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("history.global") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-ph-group",
						children: t("sideChat.group")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-ph-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: prefs.sideChat,
							onChange: (e) => {
								setPref("sideChat", e.target.checked);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("sideChat.toggle") })]
					}),
					prefs.sideChat && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ph-row",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-ph-button",
							onClick: () => {
								openSideChat();
							},
							children: t("sideChat.open")
						})
					}),
					prefs.sideChat && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-ph-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: prefs.writeGuard,
							onChange: (e) => {
								setPref("writeGuard", e.target.checked);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("sideChat.guardToggle") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-ph-note",
						children: t("sideChat.note")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "dsh-ph-note",
						children: [
							t("bridge.label"),
							"：",
							bridgeReady ? t("bridge.on") : t("bridge.off")
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-ph-note",
						children: t("suggest.keys")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-ph-note",
						children: t("settings.note")
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services: the slot registry, the locale service. */
		const inject = ["slots", "locale"];
		/** One-time style tag for the settings section (theme tokens adapt to light/dark). */
		const SETTINGS_CSS = [
			".dsh-ph-settings{padding:4px 2px;}",
			".dsh-ph-title{margin:0 0 10px;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);}",
			".dsh-ph-row{display:flex;align-items:flex-start;gap:8px;margin:8px 0;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary);cursor:pointer;}",
			".dsh-ph-row input{margin-top:3px;accent-color:var(--dsw-static-blue-900);}",
			".dsh-ph-note{margin:10px 0 0;font-size:12px;color:var(--dsw-alias-label-tertiary);}",
			".dsh-ph-group{margin:8px 0 4px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);}",
			".dsh-ph-toc-grip{position:fixed;z-index:2147483000;width:20px;height:52px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-specific-menu);background:color-mix(in srgb,var(--dsw-specific-menu) 88%,#000);box-shadow:0 1px 4px rgba(0,0,0,.18);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1;cursor:pointer;opacity:.65;transition:opacity .15s;display:flex;align-items:center;justify-content:center;padding:0;}",
			".dsh-ph-toc-grip:hover{opacity:1;background:var(--dsw-alias-bg-layer-2);}",
			".dsh-ph-toc{position:fixed;z-index:2147483000;width:300px;max-height:min(60vh,480px);display:flex;flex-direction:column;padding:8px;border-radius:12px;background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 8px 28px rgba(0,0,0,.25);box-sizing:border-box;}",
			".dsh-ph-toc-title{margin:0 4px 6px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);flex-shrink:0;}",
			".dsh-ph-toc-list{overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;box-sizing:border-box;min-height:0;flex:1 1 auto;overscroll-behavior:contain;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);}",
			".dsh-ph-toc-item{flex-shrink:0;display:flex;align-items:center;gap:8px;width:100%;height:28px;text-align:left;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;cursor:pointer;box-sizing:border-box;}",
			".dsh-ph-toc-item:hover{background:var(--dsw-alias-bg-layer-2);}",
			".dsh-ph-toc-idx{flex:none;min-width:24px;text-align:right;font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;line-height:1;}",
			".dsh-ph-toc-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.4;}",
			".dsh-ph-toc-tip{position:fixed;z-index:2147483001;max-width:min(420px,calc(100vw - 24px));max-height:min(40vh,300px);overflow-y:auto;padding:8px 10px;border-radius:8px;background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 6px 20px rgba(0,0,0,.22);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;pointer-events:none;box-sizing:border-box;}",
			".dsh-ph-toc-resize{position:absolute;right:3px;bottom:3px;width:14px;height:14px;cursor:se-resize;border-radius:3px;opacity:.55;background:linear-gradient(135deg,transparent 0 50%,var(--dsw-alias-label-tertiary) 50% 58%,transparent 58%),linear-gradient(135deg,transparent 0 66%,var(--dsw-alias-label-tertiary) 66% 74%,transparent 74%);}",
			".dsh-ph-toc-resize:hover{opacity:1;}",
			".dsh-ph-button{border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:4px 12px;font-size:12px;line-height:1.4;cursor:pointer;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}",
			".dsh-ph-button:hover{background:var(--dsw-alias-bg-layer-3);}",
			".dsh-ph-sidechat{display:flex;flex-direction:column;height:100%;min-height:0;gap:8px;padding:10px;}",
			".dsh-ph-sidechat-strip{display:flex;gap:6px;flex-wrap:wrap;flex:0 0 auto;}",
			".dsh-ph-sidechat-chip{border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:2px 10px;font-size:12px;cursor:pointer;background:transparent;color:var(--dsw-alias-label-secondary);}",
			".dsh-ph-sidechat-chip--on{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);}",
			".dsh-ph-sidechat-log{flex:1 1 auto;min-height:0;overflow-y:auto;border-radius:8px;border:1px dashed var(--dsw-alias-border-l1);padding:10px;}",
			".dsh-ph-sidechat-empty{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary);}",
			".dsh-ph-sidechat-chipLabel{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:0;}",
			".dsh-ph-sidechat-chipClose{border:0;background:transparent;color:inherit;cursor:pointer;opacity:.6;font-size:12px;padding:0 0 0 6px;}",
			".dsh-ph-sidechat-chipClose:hover{opacity:1;}",
			".dsh-ph-sidechat-row{display:flex;gap:8px;padding:6px 2px;border-bottom:1px solid var(--dsw-alias-border-l1);}",
			".dsh-ph-sidechat-row:last-child{border-bottom:0;}",
			".dsh-ph-sidechat-role{flex:0 0 62px;font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--dsw-alias-label-tertiary);}",
			".dsh-ph-sidechat-text{flex:1 1 auto;min-width:0;white-space:pre-wrap;word-break:break-word;font-size:12px;color:var(--dsw-alias-label-primary);}",
			".dsh-ph-sidechat-row--tool .dsh-ph-sidechat-text{color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;}",
			".dsh-ph-sidechat-row--user .dsh-ph-sidechat-text{color:var(--dsw-alias-label-primary);}",
			".dsh-ph-sidechat-compose{display:flex;gap:6px;align-items:flex-end;flex:0 0 auto;}",
			".dsh-ph-guard{flex:0 0 auto;border-radius:6px;padding:6px 8px;font-size:11px;line-height:1.5;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);}",
			".dsh-ph-guard--clash{background:color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);color:var(--dsw-alias-label-primary);}",
			".dsh-ph-guardList{margin:4px 0 0;padding-left:16px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;}",
			".dsh-ph-sidechat-head{display:flex;gap:4px;justify-content:flex-end;flex:0 0 auto;}",
			".dsh-ph-iconButton{border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:4px;font-size:12px;line-height:1;padding:3px 6px;}",
			".dsh-ph-iconButton:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);}",
			".dsh-ph-sidechat-title{display:inline-flex;align-items:center;gap:4px;}",
			".dsh-ph-sidechat-badge{display:inline-flex;align-items:center;justify-content:center;min-width:15px;height:15px;padding:0 4px;border-radius:999px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-2);font-size:10px;font-weight:600;line-height:1;}",
			".dsh-ph-sidechat-running{font-size:10px;opacity:.7;}",
			".dsh-ph-panelComposer{display:flex;flex-direction:column;gap:4px;flex:1 1 auto;min-width:0;}",
			".dsh-ph-panelHint{font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
			".dsh-ph-panelHintText{color:var(--dsw-alias-label-secondary);}",
			".dsh-ph-sidechat-input{flex:1 1 auto;min-width:0;resize:vertical;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);",
			"background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:12px system-ui,sans-serif;padding:6px 8px;}"
		].join("");
		/**
		* Client plugin body: register the dictionaries, the composer input-history
		* entry, and the settings section (locale-aware label). Declarations live in
		* other packages whose apply order is unconstrained — slots.inject waits on
		* each declaration and retires the contribution with this plugin's fiber.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const style = document.createElement("style");
			style.dataset.pluginCss = "dsh-ph-settings";
			style.textContent = SETTINGS_CSS;
			document.head.appendChild(style);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-prompt-history: dictionaries");
			setTranslator(ctx.locale.bind(NS));
			bindRootContext(ctx);
			installSuggestStyle();
			ctx.inject([
				"sidebarRightTabs",
				"sidebarRight",
				"slots"
			], (sideCtx) => {
				bindSideChat(sideCtx);
			});
			ctx.inject(["remote"], (remoteCtx) => {
				mountContribution(remoteCtx).then((mounted) => {
					if (!mounted) return;
					setActiveBridge(createBridge(remoteCtx));
				});
			});
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "dsh-prompt-history"
			}, InputHistory));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "dsh-prompt-history",
				order: 60,
				locale: NS,
				label: () => T("settings.nav")
			}, SettingsSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map