import { Preset, color } from "apply";

const newPreprocessor = `sveltePreprocess({
			defaults: {
				style: "postcss",
			},
			postcss: true
		})`

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
			"autoprefixer": "^10.2.5",
			"cssnano": "^4.1.10",
			"postcss": "^8.2.9",
			"postcss-load-config": "^3.0.1",
			"svelte-preprocess": "^4.7.0",
		},
	});
}).withTitle("Adding needed dependencies");

Preset.group((preset) => {
	preset.extract("svelte.config.cjs").whenConflict("skip").withTitle("Adding `svelte.config.cjs`").if((preset) => [VITE].includes(preset.context[SETUP]));

	preset.edit("svelte.config.cjs").update((content) => {
		let result = content;

		const matchEmptySveltePreprocess = /sveltePreprocess\(\)/m;
		result = result.replace(matchEmptySveltePreprocess, (_match) => `[${newPreprocessor}]`);

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
	preset.edit(["src/routes/index.svelte", "src/App.svelte", "src/lib/Counter.svelte"]).update((match) => {
		let result = match;
		result = result.replace(`<style>`, `<style style lang="postcss">`);
		return result;
	});
}).withTitle("Marking <style> blocks as explicitly PostCSS").ifNotOption(EXCLUDE_EXAMPLES);

Preset.instruct(`Run ${color.magenta("npm install")}, ${color.magenta("pnpm install")}, or ${color.magenta("yarn")} to install dependencies`);
