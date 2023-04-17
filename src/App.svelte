<svelte:head>
  <!-- Font Awesome -->
<link
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
  rel="stylesheet"
/>
<!-- Google Fonts -->
<link
  href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
  rel="stylesheet"
/>
<!-- MDB -- -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/6.2.0/mdb.min.css" rel="stylesheet" />

</svelte:head>
<script>
	import {onMount} from 'svelte';
	import TopNav from './TopNav.svelte';
	import ZoneClock from './ZoneClock.svelte';
	import RadialCal from './RadialCal.svelte';
  import Todos from './Todos.svelte';

	let currentCompIdx = 0;

	const components = [
		{name: 'Zone Clock', comp: ZoneClock},
		{name: 'Radial Calendar', comp: RadialCal},
		{name: 'Todos', comp: Todos},
	];
</script>

<style>
	:global(.section-title) {
		color: cadetblue;
		font-size: 2rem;
		font-family: "Arial Rounded MT Bold";
	}
	:global(.hand) {
		transition: all 0.5s;
	}
</style>

<div class="jumbotron text-center bg-dark text-white">
	<TopNav />
</div>
<div class="my-2 text-center d-flex gap-1 justify-content-center">
	{#each components as comp, compIdx}
		<button on:click={() => currentCompIdx=compIdx} class="btn btn-dark btn-lg bg-gradient">{comp.name}</button>
	{/each}
</div>
<div class="container">
	<div class="vstack" style="height:80vh;">
		<svelte:component this={components[currentCompIdx].comp} />
	</div>
</div>