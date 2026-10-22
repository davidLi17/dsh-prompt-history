import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
//#region lib/types/suggest.js
/**
* Host half of the prompt-suggestion bridge.
*
* The browser cannot reach a model: the harness owns `ctx.llm` (provider
* routes, credentials, quota). This service exposes one Remote method to the
* plugin's client half through the Typert Gateway, so the composer can ask the
* host for a predicted next prompt.
*
* @module dsh-prompt-history/suggest
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) {
			if (kind === "field") initializers.unshift(_);
			else descriptor[key] = _;
		}
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/** Instruction for the prediction call: one line, nothing else. */
const SYSTEM = [
	"You predict the user's next message in a coding-assistant conversation.",
	"Reply with that message only: a single line, no quotes, no explanation, no code fence.",
	"Match the language the user writes in and keep it under 160 characters.",
	"Never mention UI mechanics such as pressing Tab or accepting a suggestion.",
	"If the conversation suggests no clear next step, reply with nothing at all."
].join(" ");
/** Longest accepted suggestion; longer answers are rejected as prose, not a prompt. */
const MAX_TEXT = 200;
/**
* Reduce model output to one plain line, or '' when it is not a usable prompt.
* @param raw - the accumulated assistant text.
* @returns the single-line suggestion, or ''.
*/
function sanitize(raw) {
	let text = raw.trim();
	if (text.startsWith("```")) text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
	text = text.replace(/^[\s"'“”「」]+/, "").replace(/[\s"'“”「」]+$/, "").trim();
	const line = text.split("\n").map((part) => part.trim()).find((part) => part !== "") ?? "";
	if (line === "" || line.length > MAX_TEXT) return "";
	if (/^(sure|okay|ok|here|the next|i think)\b/i.test(line)) return "";
	return line;
}
/** Prompt-suggestion Remote service: turns recent conversation into a next prompt. */
let PromptSuggestService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _suggest_decorators;
	return class PromptSuggestService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_suggest_decorators = [Remote("suggest")];
			__esDecorate(this, null, _suggest_decorators, {
				kind: "method",
				name: "suggest",
				static: false,
				private: false,
				access: {
					has: (obj) => "suggest" in obj,
					get: (obj) => obj.suggest
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		constructor(ctx) {
			super(ctx, "promptSuggest");
			__runInitializers(this, _instanceExtraInitializers);
		}
		/**
		* Predict the user's next prompt from the recent conversation.
		* @param request - conversation context plus optional model override.
		* @returns the predicted single-line prompt ('' when unavailable).
		*/
		async suggest(request) {
			const ctx = this.ctx;
			const context = typeof request?.context === "string" ? request.context.slice(-6e3) : "";
			if (context.trim() === "") return { text: "" };
			const llm = ctx.get?.("llm");
			if (llm === void 0 || typeof llm.stream !== "function") return { text: "" };
			let provider = request.provider;
			let model = request.model;
			if (provider === void 0 || model === void 0) {
				const selection = ctx.get?.("agentDefaultModel")?.currentSelection?.();
				provider = provider ?? selection?.provider;
				model = model ?? selection?.model;
			}
			if (provider === void 0 || model === void 0) return { text: "" };
			/**
			* Run one prediction call and return the raw assistant text.
			* @param effort - reasoning effort to request, or undefined for the default.
			* @param maxTokens - response budget for this attempt.
			* @returns the accumulated assistant text.
			*/
			const collect = async (effort, maxTokens) => {
				let out = "";
				const stream = llm.stream({
					provider,
					model,
					system: SYSTEM,
					messages: [{
						role: "user",
						content: [{
							type: "text",
							text: context
						}]
					}],
					maxTokens,
					temperature: .2,
					...effort === void 0 ? {} : { reasoningEffort: effort }
				});
				for await (const chunk of stream) {
					if (chunk?.type === "text-delta" && typeof chunk.text === "string") out += chunk.text;
					if (out.length > 400) break;
				}
				return out;
			};
			const effort = await pickLowEffort(llm, provider, model);
			try {
				const first = sanitize(await collect(effort, 1024));
				if (first !== "") return { text: first };
				return { text: sanitize(await collect(void 0, 3072)) };
			} catch (error) {
				console.warn("[dsh-prompt-history] prompt-suggestion call failed:", error);
				return { text: "" };
			}
		}
	};
})();
/**
* The cheapest reasoning effort the route offers, or undefined when unknown.
* @param llm - the host LLM service.
* @param provider - provider route.
* @param model - model id.
* @returns the effort id to request.
*/
async function pickLowEffort(llm, provider, model) {
	try {
		const efforts = (await llm.resolveModelInfo?.(provider, model))?.reasoning?.efforts ?? [];
		if (efforts.length === 0) return void 0;
		return (efforts.find((entry) => /minimal|none|off|low|basic/i.test(`${entry.id ?? ""} ${entry.name ?? ""}`)) ?? efforts[efforts.length - 1])?.id;
	} catch {
		return;
	}
}
//#endregion
//#region lib/types/index.js
/**
* Host plugin body: register the suggestion service so the Gateway can export
* `promptSuggest/suggest` to the plugin's own client half.
* @param ctx - the plugin's root Cordis context.
*/
function apply(ctx) {
	ctx.plugin(PromptSuggestService);
}
//#endregion
export { PromptSuggestService, apply };
