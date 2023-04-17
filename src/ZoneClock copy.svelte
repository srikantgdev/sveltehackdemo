<script>
	import {onMount} from 'svelte';

	let hrs = 12;
	let selectedZoneIdx = 0;
	
	let hrsang = {12: 30, 24: 15};
	const zones = [
		'America/Los_Angeles',
		'US/Central',
		'America/New_York',
		'Europe/London',
		'Europe/Paris',
		'Europe/Lisbon',
		'Europe/Moscow',
		'Asia/Kolkata',
		'Asia/Tokyo',
		'Australia/Sydney',
		'Australia/Perth',
		'Pacific/Auckland'
	];
	
	let dt = new Date();
	let zonePos = 41.5;
	let miPos = 30
	let hrPos = 20;
	let angMis = 0;
	
	$: dtHr = dt.getHours()
	$: dtMi = dt.getMinutes()
	$: dtSe = dt.getSeconds()
	
	$: hrang = (dtHr * hrsang[hrs] + dtMi / 2) - 90;
	$: miang = (dtMi * 6 + dtSe / 10) - 90;
	$: seang = (dtSe * 6) - 90;
	
	$: zoneAngle = (360 / zones.length);
	$: currentTime = dt.toString().slice(0, dt.toString().indexOf('G'));
	
	const zX = (zi) => {
		const rad = ((zi * zoneAngle) - 90) * Math.PI / 180;
		return Math.cos(rad) * zonePos;
	}
	const zY = (zi) => {
		const rad = ((zi * zoneAngle) - 90) * Math.PI / 180;
		return Math.sin(rad) * zonePos;
	}
	
	// return zone name after the '/'
	const zoneName = (idx) => zones[idx].slice(zones[idx].indexOf('/')+1);
	
	const point = (p, ang, len) => {
		const rad = (p * ang - 90) * Math.PI / 180;
		return {x: Math.cos(rad) * len, y: Math.sin(rad) * len}
	}
	const hrpointX = (p) => {
		const rad = (p * hrsang[hrs] - 90) * Math.PI / 180;
		return Math.cos(rad) * hrPos
	}
	const hrpointY = (p) => {
		const rad = (p * hrsang[hrs] - 90) * Math.PI / 180;
		return Math.sin(rad) * hrPos
	}
	
	const setZoneTime = (idx) => {
		selectedZoneIdx = idx;
		const zone = zones[idx];
		dt = new Date(new Date().toLocaleString('en-US', {timeZone: zone}));
	}

	$: setInterval(() => {
		dt = new Date();
		const ms = dt.getMilliseconds();
		for (let i=0; i < ms; i++) {
			angMis = (i * 0.36 - 90);
		}
	},1000);
</script>

<style>
	.current-time {
		font-size: 1.5rem;
	}
</style>

<div class="d-flex align-items-center gap-1 m-3">
	<div class="section-title">
		Zone Clock &raquo;
	</div> 
	<div>Select hrs &raquo;</div>
	<div class="btn-group">
		<input type="radio" class="btn-check" name="options" id="option1" autocomplete="off" bind:group={hrs} value={12} />
		<label class="btn btn-secondary" for="option1">12</label>
		<input type="radio" class="btn-check" name="options" id="option2" autocomplete="off" bind:group={hrs} value={24}/>
		<label class="btn btn-secondary" for="option2">24</label>
	</div>
	<div class="current-time">
		{currentTime}
	</div>
	<div>
		<svg width="85%" viewBox="-50 -50 100 100">
			<circle r={49} stroke="cadetblue" />
			<circle r={35} fill="yellow" stroke="cadetblue" />
			{#each Array(60) as _, p}}
				<text x={point(p,6,miPos).x} y={point(p,6,miPos).y} fill={p%5?'#888':'#eee'} font-size={p%5?2.2:3} text-anchor="middle">{p}</text>
			{/each}
			{#each Array(hrs) as _, p}}
				<text x={hrpointX(p,hrang[hrs])} y={hrpointY(p,hrang[hrs])} font-size={p%3?3:3.5} text-anchor="middle" fill={p%3 ? 'grey' : '#eee'}>{p}</text>
			{/each}
			{#each zones as z,zi}
			<text x={zX(zi)} y={zY(zi)} cursor="pointer" on:keyup={() => setZoneTime(zi)} on:click={() => setZoneTime(zi)} text-anchor="middle" font-size={selectedZoneIdx==zi ? 3.8 :3} fill={selectedZoneIdx==zi ? 'blue': 'drkgrey'}>{zoneName(zi)}</text>
			{/each}
			<polyline class="hand" points="-6,0 4,-0.5 {hrPos-2},0 4,0.5 -6,0" fill="transparent" stroke="cadetblue" stroke-width="0.5" transform={`rotate(${hrang})`} />
			<polyline class="hand" points="-8,0 4,-0.5 {miPos-2},0 4,0.5 -8,0" fill="transparent" stroke="cadetblue" stroke-width="0.8" transform={`rotate(${miang})`} />
			<line class="hand" x1={-4} x2={miPos-2} fill="transparent" stroke="cadetblue" stroke-width="0.3" transform={`rotate(${seang})`} />
			<line class="hand" x1={-4} x2={miPos-2} fill="transparent" stroke="yellow" stroke-width="0.2" transform={`rotate(${angMis})`} />
		</svg>
	</div>
</div>
