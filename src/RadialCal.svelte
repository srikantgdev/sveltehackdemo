<script>
	import {onMount} from 'svelte';
	
	let dt =  new Date();
	let currentYear = dt.getFullYear();
	let currentMonth = dt.getMonth();
	let days = [];
	let canShowYears = false;

	
	let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	let weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	let monthPos = 36;
	let datePos = 26;
	
	let startYear = currentYear - currentYear % 10;
	
	const lastDate = () => {
		const ldt = new Date(currentYear, currentMonth+1, 0).getDate();
		return ldt;
	}

	$: dayAng = (m) => parseFloat((360 / lastDate(m)).toFixed(4))
	$: weekdayAng = parseFloat((360 / 7).toFixed(4))
	$: monthAng = (currentMonth * 30) - 90;
	$: dateAng = (dt.getDate()-1) * dayAng(currentMonth) - 90;
	$: weekAng = (dt.getDay() * weekdayAng - 90);
	
	const showYears = () => {
		canShowYears = !canShowYears;
	}

	const setCurrentMonth = (idx) => {
		currentMonth = idx;
		const d = dt.getDate();
		dt = new Date(currentYear,idx, d);
		setDays();
	}
	
	const setCurrentDay = (d) => {
		dt = new Date(currentYear, currentMonth, d);
	}
	
	const textPos = (len, numpoints) => {
		let arr = [];
	
		let ang = 360 / numpoints;
		for (let i=0; i < numpoints; i++) {
			const rad = (i*ang - 90) * Math.PI / 180;
			const x = Math.cos(rad) * len;
			const y = 1 + Math.sin(rad) * len;
			arr = [
				...arr,
				{
					val: i,
					x,
					y
				}
			]
		}
		return arr
	}
	
	const setDays = () => {
		const ldt = lastDate();
		days = [];
		setTimeout(() => {
			days = textPos(datePos, ldt);
		},200);
	}

	const setToday = () => {
		dt = new Date();
		currentMonth = dt.getMonth();
		currentYear = dt.getFullYear();
		startYear = currentYear - currentYear % 10;
		setDays();
	}
	
	const setStartYear = (delta) => {
		startYear += delta;
		currentMonth = 0;
		setCurrentYear(startYear);
	}
	
	const setCurrentYear = (y) => {
		currentYear = y;
		currentMonth = 0;
		startYear = currentYear - currentYear % 10;
		setDays();
		setCurrentDay(1);
	}
	setDays();

</script>

<style>
	.mm-yy {
		font-size: 1.5rem;
	}
	.txt {
		transition: all 1s;
		text-anchor: middle;
		cursor: pointer;
	}
</style>

<div class="container w-50">
	<div class="section-title text-center">
		Radial Calendar: <span style="font-size:1.4rem;">{months[currentMonth]} {currentYear}</span>
	</div>
	
	<div class="mm-yy p-1 text-center">
		<button class="btn btn-secondary bg-gradient" data-mdb-ripple-color="info" on:click={() => setToday()}>Today</button>
		<button class="btn btn-secondary bg-gradient" data-mdb-ripple-color="info" on:click={() => setStartYear(-20)}><i class="fas fa-angle-double-left fa-lg"></i> Back 20 years</button>
		<button class="btn btn-secondary bg-gradient" data-mdb-ripple-color="info" on:click={() => setStartYear(20)}>Next 20 years <i class="fas fa-angle-double-right fa-lg"></i></button>
	</div>
	<div>
		<svg viewBox="-50 -50 100 100">
			<circle r={50} />
			<circle r={39} fill="darkslategrey" />
			<circle r={31} fill="#666" />
			<circle r={20} />
			<!-- show years -->
			{#each textPos(44,20) as y,yi}
				<g cursor="pointer" on:keyup={() => setCurrentYear(1,1)} on:click={() => setCurrentYear(yi+startYear)}>
					<rect x={y.x-4} y={y.y-3} rx={1} width={8} height={4} fill="aliceblue" stroke="cyan" stroke-width="0.3" />
					<text x={y.x} y={y.y} font-size={currentYear===yi+startYear ? 3:2.2} fill={currentYear===yi+startYear ? 'blue' : 'darkslate'} text-anchor="middle">{startYear+yi}</text>
				</g>
			{/each}

			<!-- display month names -->
			{#each textPos(monthPos, 12) as m, mIdx}
			<text class="txt" x={m.x} y={m.y}
						on:click={() => {setCurrentMonth(mIdx)}}
						on:keyup={() => {setCurrentMonth(mIdx)}}
						font-size={mIdx===currentMonth ? 4 : 3}
						font-weight={mIdx===currentMonth ? 600 : 400}
						fill={mIdx===currentMonth ? 'skyblue' : '#ddd'}
						>{months[m.val]}</text>
			{/each}
			<!-- display days of current month -->
			{#each days as d, di}
			<text class="txt" x={d.x} y={d.y}
						on:click={() => setCurrentDay(di)}
						on:keyup={() => setCurrentDay(di)}
						text-anchor="middle"
						font-size={di+1 === dt.getDate() ? 5 : 3}
						font-weight={di+1 === dt.getDate() ? 600 : 400}
						fill={di+1 === dt.getDate() ? 'cyan' : 'lightblue'}
						>{d.val+1}</text>
			{/each}
			<!-- mark date -->
			<polyline class="hand" fill="lightblue" points="18,-2 22,0 18,2 20,0" transform={`rotate(${dateAng})`} />
			<!-- mark month -->
			<polyline class="hand" fill="cyan" points="28,-2 32, 0 28,2 30,0" transform={`rotate(${monthAng})`} />
			<!-- display week day names -->
			{#each textPos(14,7) as w, wi}
			<text x={w.x} y={w.y} fill="skyblue" text-anchor="middle" font-weight={wi===dt.getDay()?600:400} font-size={wi===dt.getDay() ? 4 :3}>{weekdays[w.val]}</text>
			{/each}
			<!-- <text x={0} y={0} fill="aliceblue" class="txt" on:keyup={() => setToday()} on:click={() => setToday()} text-anchor="middle" font-size={3}>[Today]</text> -->
			<!-- mark week day -->
			<polyline class="hand" fill="skyblue" points="6,-2 10, 0 6,2 7,0" transform={`rotate(${weekAng})`} />
		</svg>
	</div>
</div>
