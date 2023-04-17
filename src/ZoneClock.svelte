<script>
	import {onMount} from 'svelte';
	
	let hrs = 12;
	let selectedZoneIdx = 0;
	let dt = new Date();
	let zoneDt = new Date();
	let localHandClr = 'silver';
	let zoneHandClr = 'cyan';

	const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	const zones = [
		{name: 'Los Angeles', val: 'America/Los_Angeles'},
		{name: 'US-Central', val: 'US/Central'},
		{name: 'New York', val: 'America/New_York'},
		{name: 'London', val: 'Europe/London'},
		{name: 'Paris', val: 'Europe/Paris'},
		{name: 'Lisbon', val: 'Europe/Lisbon'},
		{name: 'Moscow', val: 'Europe/Moscow'},
		{name: 'Kolkata', val: 'Asia/Kolkata'},
		{name: 'Tokyo', val: 'Asia/Tokyo'},
		{name: 'Sydney', val: 'Australia/Sydney'},
		{name: 'Perth', val: 'Australia/Perth'},
		{name: 'Auckland', val: 'Pacific/Auckland'}
	];

	let zone = zones[0];

	let hrsang = {12: 30, 24: 15};
	let zonePos = 41.5;
	let miPos = 31
	let hrPos = 20;

	$: dtHr = dt.getHours()
	$: dtMi = dt.getMinutes()
	$: dtSe = dt.getSeconds()

	$: zoneHr = zoneDt.getHours();
	$: zoneMi = zoneDt.getMinutes();

	$: hourAngle = (dtHr * hrsang[hrs] + dtMi / 2) - 90;
	$: minuteAngle = (dtMi * 6 + dtSe / 10) - 90;
	$: secondsAngle = (dtSe * 6) - 90;
	// zone angles
	$: zoneHrAngle = (zoneHr * hrsang[hrs] + zoneMi / 2) - 90;
	$: zoneMinuteAngle = (zoneMi * 6 + dtSe / 10) - 90;
	
	const zfill = (n,m=2) => (n+Math.pow(10,m)).toString().slice(1);

	const dtFmt = (d) => `${weekdays[d.getDay()]} ${zfill(d.getDate())}-${months[d.getMonth()]} ${zfill(d.getHours())}:${zfill(d.getMinutes())}:${zfill(d.getSeconds())}`
	
	$: zoneAngle = (360 / zones.length);
	
	$: currentTime = dtFmt(dt);
	
	$: zoneTime = dtFmt(zoneDt)

	const zX = (zi) => {
		const rad = ((zi * zoneAngle) - 90) * Math.PI / 180;
		return Math.cos(rad) * zonePos;
	}
	const zY = (zi) => {
		const rad = ((zi * zoneAngle) - 90) * Math.PI / 180;
		return Math.sin(rad) * zonePos;
	}
	
	// return zone name after the '/'
	const zoneName = (idx) => zones[idx].slice(zones[idx].indexOf('/')+1).replaceAll('_', ' ');
	
	const point = (p, ang, len) => {
		const rad = (p * ang - 90) * Math.PI / 180;
		return {x: Math.cos(rad) * len, y: (Math.sin(rad) * len) + 1}
	}
	const hrpointX = (p,len=hrPos) => {
		const rad = (p * hrsang[hrs] - 90) * Math.PI / 180;
		return Math.cos(rad) * len
	}
	const hrpointY = (p, len=hrPos) => {
		const rad = (p * hrsang[hrs] - 90) * Math.PI / 180;
		return Math.sin(rad) * len
	}
	
	const setZone = (z) => {
		zone = z;
	}
	
	onMount(() => {
		setInterval(() => {
			dt = new Date();
			zoneDt = new Date(dt.toLocaleString('en-US', {timeZone: zone.val}));
		},1000);
	})
</script>

<style>
	.hand {
		transition: all 0.5s;
	}
	.current-time {
		font-size: 1.5rem;
	}
</style>

<div class="d-flex align-items-center justify-content-center m-3">
	<div class="section-title mx-2">
		Zone Clock &raquo;
	</div> 
	<h5 class="mx-4">Select hrs &raquo;</h5>
	<div class="btn-group">
		<input type="radio" class="btn-check" name="options" id="option1" autocomplete="off" bind:group={hrs} value={12} />
		<label class="btn btn-secondary" for="option1">12</label>
		<input type="radio" class="btn-check" name="options" id="option2" autocomplete="off" bind:group={hrs} value={24}/>
		<label class="btn btn-secondary" for="option2">24</label>
	</div>
</div>

<div class="row">
	<div class="col col-md-6 offset-2">
		<h4 class="text-center">{zone.name}: {zoneTime}</h4>
		<svg width={600} viewBox="-50 -50 100 100">
			<circle r={49} fill="#003" />
			<!-- second circle -->
			<circle r={35}  />
			<!-- innermost circle -->
			<circle r={25} fill="darkslategrey" />
		
			<!-- display zones -->
			{#each zones as z,zi}
				<text x={zX(zi)} y={zY(zi)} cursor="pointer" on:keyup={() => setZone(z)} on:click={() => setZone(z)} text-anchor="middle" font-size={zone.name==z.name ? 3.8 :3} fill={zone.name==z.name ? 'lightblue': 'darkgrey'}>{z.name}</text>
			{/each}
			<!-- display minute marks -->
			{#each Array(60) as _, p}}
				<text x={point(p,6,miPos).x} y={point(p,6,miPos).y} fill={p%5?'#888':'#eee'} font-size={p%5?2.2:3} text-anchor="middle">{p}</text>
			{/each}
			<!-- display hour marks -->
			{#each Array(hrs) as _, p}}
				<text x={hrpointX(p,hourAngle[hrs])} y={hrpointY(p,hourAngle[hrs])} font-size={p%3?3:3.5} text-anchor="middle" fill={p%3 ? 'silver' : 'white'}>{p}</text>
			{/each}
			<!-- second hand-->
			<line x1="-4" x2="28" class="hand" stroke="lightblue" stroke-width="0.4" transform={`rotate(${secondsAngle})`} />
			<!-- zone time -->
			<!-- hour hand -->
			<polyline class="hand" points="-6,0 4,-0.5 {hrPos-2},0 4,0.5 -6,0" fill="transparent" stroke={zoneHandClr} stroke-width="0.3" transform={`rotate(${zoneHrAngle})`} />
			<!-- minute hand-->
			<polyline class="hand" points="-8,0 4,-0.5 {miPos-2},0 4,0.5 -8,0" fill="transparent" stroke={zoneHandClr} stroke-width="0.4" transform={`rotate(${zoneMinuteAngle})`} />
		</svg>
	</div>
	<div class="col col-md-2">
		<h6 style="color: #999">Local: {currentTime}</h6>
		<svg viewBox="-50 -50 100 100">
			<circle r={49} fill="" />
			<!-- display minute marks -->
			{#each Array(60) as _, p}}
				<text x={point(p,6,46).x} y={point(p,6,46).y} fill={p%5?'#888':'#eee'} font-size={p%5?3:4} text-anchor="middle">{p}</text>
			{/each}
			<!-- display hour marks -->
			{#each Array(hrs) as _, p}}
				<text x={hrpointX(p,30)} y={hrpointY(p,30)} font-size={p%3?3:3.5} text-anchor="middle" fill={'silver'}>{p}</text>
			{/each}
			<!-- hour hand -->
			<rect rx={4} class="hand" x="-8" width={30} height={1} fill="transparent" stroke={localHandClr} stroke-width={0.4} stroke-linecap="round" transform={`rotate(${hourAngle})`} />
			<!-- minute hand-->
			<rect rx={4} class="hand" x="-8" width={46} height={1} fill="transparent" stroke={localHandClr} stroke-width={0.3} stroke-linecap="round" transform={`rotate(${minuteAngle})`} />
		</svg>
	</div>
</div>