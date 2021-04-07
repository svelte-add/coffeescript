import { Preset, color } from "apply";

const preProcessorOptions = { coffeescript: { bare: true } }

const makePreprocessor = (oldOptions, indent) => {
	if (oldOptions.match(/^\s*$/)) oldOptions = '{}';

	// Ugly hack because JSON.parse may fail: old options property names may not be quoted.
	oldOptions = eval(`(${oldOptions})`);

	let options = JSON.stringify(Object.assign(preProcessorOptions, oldOptions), null, '\t');
	options = options.replace(/\n/g, `\n\t${indent}`);
	return `sveltePreprocess(${options})`;
}

let newPreprocessor = makePreprocessor('', '\t');

const addPreprocessor = (otherPreprocessors) => {
	if (otherPreprocessors) {
		// otherPreprocessors includes captured whitespace at the end.
		// So, this will match the existing formatting, putting the closing ] 
		// bracket on a new line only if it already was
		return `preprocess: [\n\t\t${newPreprocessor},\n\t\t${otherPreprocessors}]`;
	} else {
		return `preprocess: [\n\t\t${newPreprocessor},\n\t]`;
	}
}

Preset.setName("svelte-add/coffeescript");

const SNOWPACK_SVELTEKIT = "snowpack-sveltekit";
const VITE = "vite";
const VITE_SVELTEKIT = "vite-sveltekit";
const UNKNOWN_SETUP = "unknown";
const SETUP = "setup";

const EXCLUDE_EXAMPLES = "excludeExamples"
Preset.option(EXCLUDE_EXAMPLES, false);

Preset.hook((preset) => { preset.context[SETUP] = UNKNOWN_SETUP }).withoutTitle();
Preset.edit("package.json").update((content, preset) => {
	const pkg = JSON.parse(content);

	const dependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

	if (dependencies["@sveltejs/kit"]) {
		if (dependencies["vite"]) preset.context[SETUP] = VITE_SVELTEKIT;
		else if (dependencies["snowpack"]) preset.context[SETUP] = SNOWPACK_SVELTEKIT;
	} else if (dependencies["vite"]) {
		preset.context[SETUP] = VITE;
	}
	return content;
}).withoutTitle();

Preset.group((preset) => {
	preset.editJson("package.json").merge({
		devDependencies: {
			"coffeescript": "^2.5.1",
			"svelte-preprocess": "next",
		},
	});
}).withTitle("Adding needed dependencies");

Preset.group((preset) => {
	preset.extract("svelte.config.cjs").whenConflict("skip").withTitle("Adding `svelte.config.cjs`").if((preset) => [VITE].includes(preset.context[SETUP]));

	preset.edit("svelte.config.cjs").update((content) => {
		let result = content;

		// TODO: Parse out options better.
		// This regex assumes there are no ')' char inside the options.
		const matchSveltePreprocess = /^(\s*)(.*)sveltePreprocess\(([^)]*)\)/m;
		if (matches = result.match(matchSveltePreprocess)) {
			newPreprocessor = makePreprocessor(matches[3], matches[1]);
			result = result.replace(matchSveltePreprocess, (_match, indent, preprocess, _oldOptions) => `${indent}${preprocess}[${newPreprocessor}]`);
		}

		const matchPreprocessors = /preprocess:[\s\r\n]\[[\s\r\n]*((?:.|\r|\n)+)[\s\r\n]*\]/m;
		result = result.replace(matchPreprocessors, (_match, otherPreprocessors) => {
			if (otherPreprocessors.includes("sveltePreprocess")) return addPreprocessor("");
			return addPreprocessor(otherPreprocessors);
		});

		if (!result.includes("svelte-preprocess")) result = `const sveltePreprocess = require("svelte-preprocess");\n${result}`;
		if (!result.includes("sveltePreprocess(")) result = result.replace("module.exports = {", `module.exports = {\n\t${addPreprocessor("")},`);

		return result;
	}).withTitle("Configuring it in svelte.config.cjs")
}).withTitle("Setting up Svelte preprocessor");


Preset.group((preset) => {
	preset.extract("example-files");
	preset.edit('src/routes/index.svelte').update((content) => {
		let result = content;

		if (!result.includes('href="/coffeescript-example"')) {
		   result = result.replace(`<main>`, `<main>\n\t<br><a href="examples/coffeescript" class="button is-primary">CoffeeScript Example</a>`);
		}
		return result;
	});
}).withTitle("Adding CoffeeScript example").ifNotOption(EXCLUDE_EXAMPLES);

Preset.instruct(`Run ${color.magenta("npm install")}, ${color.magenta("pnpm install")}, or ${color.magenta("yarn")} to install dependencies`);
