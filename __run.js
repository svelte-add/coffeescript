import { updateSveltePreprocessArgs, updateViteConfig } from "../../adder-tools.js";
import { addImport, setDefault } from "../../ast-tools.js";

/** @type {import("../..").AdderRun<import("./__info.js").Options>} */
export const run = async ({ folderInfo, install, updateJavaScript }) => {
	await updateSveltePreprocessArgs({
		folderInfo,
		mutateSveltePreprocessArgs(sveltePreprocessArgs) {
			const coffeescriptOptions = setDefault({
				default: {
					type: "ObjectExpression",
					properties: [],
				},
				object: sveltePreprocessArgs,
				property: "coffeescript",
			});
			if (coffeescriptOptions.type !== "ObjectExpression") throw new Error("CoffeeScript config in svelte-preprocess options must be an object");

			setDefault({
				default: {
					type: "Literal",
					value: true,
				},
				object: coffeescriptOptions,
				property: "bare",
			});
		},
		updateJavaScript,
	});

	await updateViteConfig({
		mutateViteConfig(viteConfig, containingFile, cjs) {
			let vitePluginCoffeeImportedAs = "coffee";
			addImport({ require: vitePluginCoffeeImportedAs, cjs, default: vitePluginCoffeeImportedAs, package: "vite-plugin-coffee", typeScriptEstree: containingFile });

			const pluginsList = setDefault({
				object: viteConfig,
				default: {
					type: "ArrayExpression",
					elements: [],
				},
				property: "plugins",
			});
			if (pluginsList.type !== "ArrayExpression") throw new Error("`plugins` in Vite config needs to be an array");

			/** @type {import("estree").CallExpression | undefined} */
			let vitePluginCoffeeFunctionCall;
			for (const element of pluginsList.elements) {
				if (!element) continue;
				if (element.type !== "CallExpression") continue;
				if (element.callee.type !== "Identifier") continue;
				if (element.callee.name !== vitePluginCoffeeImportedAs) continue;
				vitePluginCoffeeFunctionCall = element;
			}

			// Add an vite-plugin-coffee() call to the Vite plugins list if missing
			if (!vitePluginCoffeeFunctionCall) {
				vitePluginCoffeeFunctionCall = {
					type: "CallExpression",
					callee: {
						type: "Identifier",
						name: vitePluginCoffeeImportedAs,
					},
					arguments: [
						{
							type: "ObjectExpression",
							properties: [],
						},
					],
					optional: false,
				};

				pluginsList.elements.push(vitePluginCoffeeFunctionCall);
			}

			let vitePluginCoffeeArgs = vitePluginCoffeeFunctionCall.arguments[0];
			if (!vitePluginCoffeeArgs) {
				vitePluginCoffeeArgs = {
					type: "ObjectExpression",
					properties: [],
				};

				vitePluginCoffeeFunctionCall.arguments.push(vitePluginCoffeeArgs);
			}
			if (vitePluginCoffeeArgs.type !== "ObjectExpression") throw new Error("vite-plugin-coffee arguments must be an object");
			setDefault({
				object: vitePluginCoffeeArgs,
				property: "jsx",
				default: {
					type: "Literal",
					value: false,
				},
			});
		},
		updateJavaScript,
		folderInfo,
	});

	await install({ package: "svelte-preprocess" });
	await install({ package: "coffeescript" });
	await install({ package: "vite-plugin-coffee" });
};
