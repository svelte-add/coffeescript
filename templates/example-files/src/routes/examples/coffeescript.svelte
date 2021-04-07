<script lang="coffee">
	count = 0

	# Svelte $: reactive syntax is illegal in CoffeeScript.
    # The following trick sandwiches reactive CoffeeScript
	# between two bits of escaped JS that start/stop the
	# reactive block.

	`$: {`  ## Start Svelte reactive block.
	console.log {count}
	if count >= 10
		alert 'count is dangerously high!'
		count = 9
	`}`     ## End reactive block.


	# This statement is outside the reactive block,
	# so it will only be executed once.
	console.log "Hello CoffeeScript! No parentheses/semicolons needed!"


	handleClick = () ->
		count += 1

</script>

<main>
	<h1>CoffeeScript+Svelte: Reactivity</h1>

	<button on:click={handleClick}>
		Clicked {count} {count === 1 ? 'time' : 'times'}
	</button>

	<p>Compare to the 
	<a href="https://svelte.dev/tutorial/reactive-statements">
	original example in JavaScript</a></p>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		margin: 0 auto;
	}
</style>
