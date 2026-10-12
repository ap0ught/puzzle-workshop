const labels = ['Stopped', 'Slow', 'Medium', 'Fast'];
export function GearSocket({speed,target}:{speed:number;target:number}) {
 const matched = speed===target;
 return <span className={'gearSocket '+(matched?'gearMatched':'')}>
  <svg className="gearDrawing" viewBox="0 0 100 100" aria-hidden="true">
   <g className={speed?'gearRotor spinningGear':'gearRotor'} style={{animationDuration:(speed?6/speed:6)+'s'}}>
    {Array.from({length:12},(_,i)=><rect key={i} x="44" y="6" width="12" height="16" rx="2" transform={'rotate('+i*30+' 50 50)'}/>)}
    <circle className="gearRim" cx="50" cy="50" r="32"/>
    {Array.from({length:6},(_,i)=><path className="gearSpoke" key={i} d="M50 50 L50 22" transform={'rotate('+i*60+' 50 50)'}/>)}
   </g>
   <circle className="gearHub" cx="50" cy="50" r="12"/>
   <text x="50" y="55" textAnchor="middle">{speed}</text>
  </svg>
  <span className="gearCurrent">Now: {labels[speed]} ({speed})</span>
  <span className="gearRequired">Need: {labels[target]} ({target})</span>
  <span className="gearStatus">{matched?'✓ Correct speed':'Tap to change speed'}</span>
 </span>;
}
