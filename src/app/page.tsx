import {requestRoom,subscribeRoom,remoteRooms} from '../room-service';
import { DefensePanel, PictureRoom } from '../components/game/defense';
import { CircuitBoard } from '../components/game/circuit-board';
'use client';
import { GearSocket } from '../components/game/gear-socket';
import { useState, useEffect, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { act, connections, trees, puzzles, puzzleFor, puzzleKind, puzzleState, compatible, upgrade, readyToSolve, filledSockets, requiredPieces, traceBeam, solveLights, lightNeighbors, circuitReadings } from '../lib/game';
function symbol(it: any) { return it.type === 'pipe' ? (it.n === 3 || it.n === 4 || it.n === 6 || it.n === 7 ? '┗' : '━') : it.type === 'tile' ? it.n : it.type === 'switch' ? '☀' : it.type === 'tent' ? '⛺' : it.type === 'mirror' ? '◇' : it.type === 'gear' ? '⚙' : it.type === 'battery' ? 'ϟ' : it.type === 'wire' ? '∿' : it.n; }
export default function Page() {
    const [s, S] = useState<any>(null), [room, R] = useState(''), [token, T] = useState(''), [me, M] = useState(1), [name, N] = useState(''), [code, C] = useState(''), [activeRoom, ActiveRoom] = useState(-1), [mode, Mode] = useState('explore'), [board, B] = useState(0), [selected, Sel] = useState(''), [msg, Msg] = useState(''), [rejected, Rejected] = useState(''), [clock, Clock] = useState(Date.now()), [busy, Busy] = useState(false), [remove, Remove] = useState(false), [sessions, Sessions] = useState<any[]>([]);
    const [packageId,SetPackage]=useState('');
    const [showLightHints,ShowLightHints]=useState(false),[hoverLight,HoverLight]=useState(-1);
    const [lineup, SetLineup] = useState<string[]>(() => puzzles.map(p => p.kind));
    const definitions = s ? s.lineup.map((_: any, i: number) => puzzleFor(s, i)) : puzzles;
    const names = definitions.map((p: any) => p.name), icons = definitions.map((p: any) => p.icon), types = definitions.map((p: any) => p.kind), descriptions = definitions.map((p: any) => p.rules);
    const kind = s ? puzzleKind(s, board) : 0, state = s ? puzzleState(s, board) : null;
    const lightHints=s&&kind===2&&showLightHints&&readyToSolve(s,board)?solveLights(state.lights):[];
    function moveRoom(index: number, direction: number) {
        SetLineup(current => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
    }
    const ref = useRef<any>(null);
    const pending = useRef(0), latest = useRef<any>(null);
    useEffect(() => { const t = setInterval(() => Clock(Date.now()), 250); return () => clearInterval(t); }, []);
    useEffect(() => { try {
        let saved = JSON.parse(sessionStorage.getItem('workshop') || 'null');
        if (saved) {
            R(saved.room);
            T(saved.token);
            M(saved.me);
            Sessions(saved.sessions || []);
        }
    }
    catch { } }, []);
    useEffect(() => { if (!room)
        return; let stopped = false; const apply = (d: any) => { if (!stopped && pending.current === 0)
                S((old: any) => !old || d.version >= old.version ? upgrade(d) : old); };
    const poll = async () => { try {
        let r = await requestRoom('/api/room?code=' + room), d: any = await r.json();
        if (r.ok)
            apply(d);
    }
    catch {
        Msg('Connection interrupted. Retrying…');
    } }; poll();
    // A hosted room pushes state down a socket, so the poll only has to be
    // slow enough not to waste requests and fast enough to heal a missed push.
    let i = setInterval(poll, remoteRooms ? 15000 : 900);
    const unsubscribe = subscribeRoom(room, token, apply);
    return () => { stopped = true; clearInterval(i); unsubscribe(); }; }, [room, token]);
    async function send(a: any) { const placing = a.type === 'place' || a.type === 'assist'; if (busy && !placing)
        return; if (!placing)
        Busy(true); pending.current++; if (placing) {
        S((old: any) => { try {
            let next = structuredClone(old);
            next.players = next.players.map((p: any) => ({ ...p, token: p.id === me ? token : '' }));
            return act(next, token, a);
        }
        catch {
            return old;
        } });
    } try {
        let r = await requestRoom('/api/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...a, code: a.code || room, token }) }), d: any = await r.json();
        if (!r.ok)
            throw Error(d.error);
        if (d.state && (!latest.current || d.state.version >= latest.current.version))
            latest.current = d.state;
        if (a.type === 'create' || a.type === 'join') {
            let rr = d.code || a.code || room;
            R(rr);
            T(d.token);
            M(d.player);
            let list = a.type === 'create' ? [{ token: d.token, me: d.player }] : [...sessions, { token: d.token, me: d.player }];
            Sessions(list);
            sessionStorage.setItem('workshop', JSON.stringify({ room: rr, token: d.token, me: d.player, sessions: list }));
        }
        Msg('');
        if (a.type === 'stash' || a.type === 'dropAll') Sel('');
        if (a.type === 'drop' || a.type === 'carry' || a.type === 'deliver' || a.type === 'place')
            Sel(current => current === a.item ? '' : current);
    }
    catch (e: any) {
        Msg(e.message);
        if (a.type === 'place') {
            const key = a.board + ':' + a.cell;
            Rejected(key);
            setTimeout(() => Rejected(current => current === key ? '' : current), 1200);
        }
    }
    finally {
        pending.current--;
        if (pending.current === 0 && latest.current) {
            S(upgrade(latest.current));
            latest.current = null;
        }
        if (!placing)
            Busy(false);
    } }
    const carried = s?.items.filter((i: any) => i.owner === me && i.cell === null) || [], tray = s?.items.filter((i: any) => i.owner === 'tray:' + board && i.cell === null) || [], inv = mode === 'puzzle' ? tray : carried, partner = s?.players.find((p: any) => p.id !== me), done = s?.completed?.length || 0;
    useEffect(() => { const selectSlot = (e: KeyboardEvent) => { const target = e.target as HTMLElement | null; if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || target?.isContentEditable || target?.closest('input, textarea, select'))
        return; if (!s || !['1', '2', '3', '4', '5'].includes(e.key))
        return; const item = inv[Number(e.key) - 1]; if (!item)
        return; e.preventDefault(); Sel(item.id); Remove(false); }; window.addEventListener('keydown', selectSlot); return () => window.removeEventListener('keydown', selectSlot); }, [s, me, mode, board]);
    const cooldown = Math.max(0, Math.ceil((5000 - (clock - (s?.players.find((p: any) => p.id === me)?.assistAt?.[board] || 0))) / 1000));
    const beamPreview = s && kind===5 && readyToSolve(s,board) ? traceBeam(s,board) : null;
    const waterFlowing = !!state?.waterTest && clock < state.waterTest.startedAt + state.waterTest.duration;
    const circuitWin = !!s && kind === 7 && circuitReadings(s,board).every((r: any) => r.matched);
    const roomCompleted = !!s && activeRoom >= 0 && s.completed.includes(activeRoom);
    const nextRoom = s?.unlocked.find((i: number) => !s.completed.includes(i));
    useEffect(() => {
        if (activeRoom === board && kind === 0 && waterFlowing) return;
        if (activeRoom === board && kind === 7 && circuitWin) {
            const hold = setTimeout(() => {
                ActiveRoom(-1); Mode('explore'); Sel(''); Remove(false);
                if (nextRoom !== undefined) B(nextRoom);
            }, 3200);
            return () => clearTimeout(hold);
        }
        if (roomCompleted) {
            ActiveRoom(-1); Mode('explore'); Sel(''); Remove(false);
            if (nextRoom !== undefined) B(nextRoom);
        }
    }, [activeRoom, board, kind, waterFlowing, circuitWin, roomCompleted, nextRoom]);
    function openPuzzle(i: number) { if (!s.unlocked.includes(i) || s.completed.includes(i)) {
        Msg('Complete an open room to unlock this one.');
        return;
    } ActiveRoom(i); B(i); Mode('puzzle'); Sel(''); Remove(false); send({ type: 'load', board: i }); }
    function stationClick(i: number) { if (!s.unlocked.includes(i) || s.completed.includes(i))
        return; if (mode === 'explore' && selected) {
        B(i);
        send({ type: 'deliver', board: i, item: selected });
    }
    else
        openPuzzle(i); }
    function newRoom() {
        SetLineup(s.lineup.map((entry: any) => entry.kind));
        N(s.players.find((p: any) => p.id === me)?.name || name);
        ActiveRoom(-1); B(0); Mode('explore'); Sel(''); Remove(false);
        S(null); R(''); T(''); Sessions([]);
        sessionStorage.removeItem('workshop');
    }
    function cell(c: number) { if (mode !== 'puzzle' || (kind === 0 && waterFlowing))
        return; if (remove)
        send({ type: 'remove', board, cell: c, tray: true });
    else if (selected)
        send({ type: 'place', board, cell: c, item: selected });
    else if (readyToSolve(s, board))
        send({ type: 'use', board, cell: c });
    else Msg('Fill every required socket before solving this puzzle.'); }
    const inventoryPanel = (<div className="inventory"><div className="sectionbar"><span>{mode === 'puzzle' ? names[board].toUpperCase() + ' / SHARED PIECE TRAY' : 'CARRIED ITEMS / FIVE POCKETS'}</span><span>{inv.length}{mode === 'explore' ? '/5' : ''} ITEMS</span></div><div className={'slots ' + (mode === 'puzzle' ? 'traySlots' : '')}>{Array.from({ length: mode === 'puzzle' ? Math.max(inv.length, 1) : 5 }, (_, i) => { let it = inv[i]; return <button key={i} className={it ? 'filled ' + it.type + (selected === it.id ? ' chosen' : '') : ''} onClick={() => { if (it) {
        Sel(selected === it.id ? '' : it.id);
        Remove(false);
    } }}><small>{i + 1}</small><strong>{it ? symbol(it) : '+'}</strong><span>{it ? it.type : 'Empty'}</span></button>; })}</div><div className="inventoryFoot"><span>{selected ? 'Selected: ' + selected + (mode === 'puzzle' ? ' · tap any highlighted empty socket' : ' · click its puzzle to deliver') : (mode === 'puzzle' ? 'Select a tray piece, then place it in the puzzle.' : 'Select a carried piece, then click its puzzle to deliver it.')}</span><button disabled={!selected || busy} onClick={() => send({ type: mode === 'puzzle' ? 'carry' : 'drop', ...(mode === 'puzzle' ? {board} : {floorRoom: activeRoom}), item: selected })}>{mode === 'puzzle' ? 'Carry item ↑' : 'Drop ↓'}</button>{mode === 'explore' && <button disabled={busy || carried.length === 0} onClick={() => send({ type: 'dropAll', floorRoom: activeRoom })}>Drop all ↓</button>}</div></div>);
    return <main><header><a className="brand" href="./">◈ <span>THE PUZZLE<br /><b>WORKSHOP</b></span></a><div className="topnote">COOPERATIVE ZOMBIE DEFENSE <span className="pill">DEMO 01</span></div><div className="connection"><i /> {room ? (remoteRooms ? 'ROOM ' : 'LOCAL ROOM ') + room : '2 PLAYERS · '+lineup.length+' ROOMS'}</div></header>
    {!s ? <section className="lobby"><div><p className="eyebrow">TWO MINDS. ONE WAY OUT.</p><h1>Some things are<br />better solved <em>together.</em></h1><p className="intro">A room full of curious machines. Solve rooms to activate defenses against zombies outside. Earn fighter packages, complete their picture puzzles, and recruit your team. Five pockets each — share the pieces and hold the perimeter.</p><div className="miniStations">{names.map((n: string, i: number) => <div key={i}><span>{icons[i]}</span>{n}</div>)}</div></div><div className="joinbox"><span className="eyebrow">ENTER THE WORKSHOP</span><h2>Let’s make a little progress.</h2><label>Your name<input value={name} onChange={e => N(e.target.value)} placeholder="Player name" maxLength={20}/></label>
        <fieldset className="lineupPicker" disabled={busy}>
            <legend>Room lineup · {lineup.length}/16</legend>
            <p id="lineupPolicy">Choose 1–16 rooms in order, including repeats. The first up to 3 rooms open immediately; each completion unlocks the next. Every room instance awards a fighter package and a system bonus.</p>
            <ol aria-describedby="lineupPolicy">{lineup.map((entry, index) => <li key={index}>
                <label><span>Room {index + 1}</span><select aria-label={'Puzzle for room '+(index+1)} value={entry} onChange={e => SetLineup(current => current.map((kind, i) => i === index ? e.target.value : kind))}>{puzzles.map(p => <option key={p.kind} value={p.kind}>{p.name}</option>)}</select></label>
                <div className="lineupControls">
                    <button type="button" disabled={index===0} aria-label={'Move room '+(index+1)+' up'} onClick={() => moveRoom(index,-1)}>↑</button>
                    <button type="button" disabled={index===lineup.length-1} aria-label={'Move room '+(index+1)+' down'} onClick={() => moveRoom(index,1)}>↓</button>
                    <button type="button" disabled={lineup.length===1} aria-label={'Remove room '+(index+1)} onClick={() => SetLineup(current => current.filter((_,i) => i!==index))}>Remove</button>
                </div>
            </li>)}</ol>
            <div className="lineupActions"><button type="button" disabled={lineup.length===16} onClick={() => SetLineup(current => [...current,puzzles[0].kind])}>Add room +</button><button type="button" onClick={() => SetLineup(puzzles.map(p => p.kind))}>Restore default eight</button></div>
        </fieldset>
        <button className="primary" disabled={busy} onClick={() => { B(0); ActiveRoom(-1); Mode('explore'); send({ type: 'create', name, lineup }); }}>Create a room <span>↗</span></button><div className="divider">or join your partner</div><label>Room code<input value={code} onChange={e => C(e.target.value.toUpperCase())} placeholder="8-character code" maxLength={8}/></label><button disabled={busy || code.length !== 8} onClick={() => send({ type: 'join', code, name })}>Join room →</button><small>{remoteRooms ? 'Up to two players share one room. Enter the code on any device to join.' : 'Offline edition: local play, or tabs in this same browser. Room codes do not connect different devices.'}</small></div></section> : <><div className="gameHeading"><div><p className="eyebrow">WORKSHOP / ROOM {room}</p><h1>{done === names.length ? 'You found your way out.' : 'A little teamwork goes a long way.'}</h1></div><div className="progress"><strong>{done}<span>/{names.length}</span></strong><small>ROOMS COMPLETED</small></div></div><nav className="roomNav" aria-label="Workshop rooms"><button className={activeRoom===-2?'chosen':''} onClick={()=>{ActiveRoom(-2);Mode('explore');Sel('');}}><span>Earn fighters</span><b>Picture Recruitment Room</b></button><button className={activeRoom===-1?'chosen':''} onClick={()=>{ActiveRoom(-1);Mode('explore');Sel('');Remove(false);}}><span>Shared items</span><b>Main room</b></button>{names.map((n: string, i: number) => <button key={i} disabled={!s.unlocked.includes(i) || s.completed.includes(i)} className={activeRoom === i ? 'chosen' : ''} onClick={() => { ActiveRoom(i); B(i); Mode('explore'); Sel(''); Remove(false); }}><span>{s.completed.includes(i) ? '🔒' : s.unlocked.includes(i) ? '○' : '🔒'} Room {i + 1}</span><b>{n}</b></button>)}</nav><p className="progressHint">The first {Math.min(3,names.length)} rooms start open. Complete a room to unlock the next and earn a fighter package plus a system bonus. Solved rooms close. Used pieces go into the main room box; spare pieces return to the floor.</p><div className="playlayout"><section className="roomSection"><div className="sectionbar"><span>01 / THE ROOM</span><span>{partner ? partner.name + ' is your partner' : 'Waiting for your partner'}</span></div><div className="room" ref={ref} onClick={e => { if (e.target !== e.currentTarget)
        return; let r = e.currentTarget.getBoundingClientRect(); send({ type: 'move', x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 }); }}><div className="roomLabel">{activeRoom===-2?'PICTURE RECRUITMENT ROOM':activeRoom===-1?'MAIN ROOM / SHARED ITEMS':names[activeRoom].toUpperCase()+' / ROOM '+(activeRoom+1)}</div><div className={'exit ' + (done === names.length ? 'open' : '')}>{s.completed.includes(activeRoom) ? 'ROOM COMPLETE ✓' : 'COMPLETE PUZZLE TO UNLOCK A ROOM'}</div>{names.map((n: string, i: number) => (i === activeRoom || (activeRoom === -1 && s.unlocked.includes(i) && !s.completed.includes(i))) && <button key={i} className={'station s'+(activeRoom===-1?s.unlocked.filter((b:number)=>!s.completed.includes(b)).indexOf(i):0) + (board === i ? ' active' : '') + (s.solved[i] ? ' complete' : '')} onClick={() => stationClick(i)}><span className="stationIcon">{s.solved[i] ? '✓' : icons[i]}</span><b>{n}</b><small>{s.completed.includes(i) ? 'RESTORED' : 'STATION ' + (i + 1)}</small></button>)}{s.items.filter((i: any) => i.owner === null && i.cell === null && activeRoom!==-2 && (activeRoom===-1 || i.floorRoom===activeRoom)).map((it: any) => <button key={it.id} title={'Pick up ' + it.type + ' ' + it.n} className={'pickup ' + it.type} style={{ left: it.x + '%', top: it.y + '%' }} onClick={() => (() => { Mode('explore'); Sel(''); send({ type: 'pickup', item: it.id }); })()}>{symbol(it)}</button>)}{s.players.map((p: any) => <div className={'player player' + p.id} key={p.id} style={{ left: p.x + '%', top: p.y + '%' }}><span>{p.id === me ? 'YOU' : 'P' + p.id}</span><b>{p.name}</b></div>)}<div className="roomHint">Tap pieces to collect · Tap the floor to move</div></div>
        {activeRoom===-1&&<DefensePanel state={s} busy={busy} send={send} onPackage={(id)=>{SetPackage(id);ActiveRoom(-2);Mode('explore');Sel('');}}/>}{activeRoom===-1&&<section className="partsBox" aria-label="Shared box of solved puzzle pieces"><div className="sectionbar"><span>MAIN ROOM / USED PIECES BOX</span><span>{s.items.filter((it:any)=>it.owner==='box').length} PIECES</span></div><p>Pieces used in completed puzzles are stored here. Tap one to carry it for another puzzle.</p><div className="boxPieces">{s.items.filter((it:any)=>it.owner==='box').map((it:any)=><button key={it.id} disabled={busy||carried.length>=5} aria-label={'Take '+it.type+' '+it.n+' from the box'} onClick={()=>{Mode('explore');Sel('');send({type:'pickup',item:it.id});}}><strong>{symbol(it)}</strong><span>{it.type} {it.n}</span></button>)}</div>{!s.items.some((it:any)=>it.owner==='box')&&<small>The box fills when you solve a puzzle.</small>}{carried.length>=5&&<small>Your pockets are full. Deliver or drop an item to make space.</small>}</section>}
        {<div className="announcements" role="status" aria-live="polite"><p className="eyebrow">WORKSHOP ANNOUNCEMENTS</p>{s.announcements.length?s.announcements.map((text:string,i:number)=><p key={i}>{text}</p>):<p>The first {Math.min(3,names.length)} rooms are open. Solve one to open the next.</p>}</div>}
        {mode === 'explore' && activeRoom!==-2 && <><div className="roomTray"><div className="sectionbar"><span>{names[board].toUpperCase()} / SHARED TRAY</span><span>{tray.length} PIECES</span></div><div className="roomTrayPieces">{tray.length ? tray.map((it: any) => <span className={it.type} key={it.id} title={it.type + ' ' + it.n}>{symbol(it)}</span>) : <small>Select a carried item and click its puzzle to deliver it here.</small>}</div>{(kind===1||kind===3) && <div className="assistRow"><button className="primary" disabled={cooldown > 0 || s.solved[board] || tray.length === 0} onClick={() => { Sel(''); send({ type: 'assist', board }); }}>{cooldown > 0 ? 'Ready in ' + cooldown + 's' : 'Place & lock 🔒'}</button><small>Uses one tray piece · 5-second test cooldown</small></div>}<button className="solveTray" disabled={busy || s.completed.includes(board) || !carried.some((it: any) => compatible(board, it, s))} onClick={() => send({ type: 'stash', board })}>Load tray from pockets ↓</button><button className="solveTray testRoomLoad" title="Testing shortcut: collect matching loose room pieces into this tray" disabled={busy||s.completed.includes(board)||filledSockets(s,board)+tray.length+carried.filter((it:any)=>compatible(board,it,s)).length>=requiredPieces(board,s)||!s.items.some((it:any)=>it.owner===null&&it.cell===null&&it.floorRoom===board&&compatible(board,it,s))} onClick={()=>send({type:'stashRoom',board})}>Load tray from room ↓ <small>TEST</small></button><button className="solveTray" disabled={busy || s.completed.includes(board)} onClick={() => openPuzzle(board)}>Solve puzzle · load matching pieces →</button></div>{inventoryPanel}</>}
        {mode === 'puzzle' && <div className="trayNavigation"><button onClick={() => { Mode('explore'); Sel(''); Remove(false); }}>← Back to exploring</button><small>Shared tray · your backpack holds {carried.length}/5</small></div>}
        <div className="partnerbar"><span className="dot"/><span>{s.players.find((p: any) => p.id === me)?.name} <small>PLAYER {me}</small></span>{sessions.length === 2 ? <button onClick={() => { let other = sessions.find(p => p.me !== me); T(other.token); M(other.me); Sel(''); sessionStorage.setItem('workshop', JSON.stringify({ room, token: other.token, me: other.me, sessions })); }}>Switch player ⇄</button> : s.players.length === 1 ? <button onClick={() => send({ type: 'join', name: 'Player 2', code: room })}>Add local player</button> : <span>{partner?.name} · {s.items.filter((i: any) => i.owner === partner?.id).length}/5 items</span>}</div></section>
        <aside>{activeRoom===-2?<PictureRoom state={s} packageId={packageId} setPackage={SetPackage} send={send} busy={busy}/>:<><div className="sectionbar"><span>02 / PUZZLE FRAME</span><span className="pill">{s.solved[board] ? 'COMPLETE' : 'IN PROGRESS'}</span></div><div className="puzzleHead"><span className={'bigicon ' + types[board]}>{icons[board]}</span><div><p className="eyebrow">STATION 0{board + 1}</p><h2>{names[board]}</h2></div></div><p className="rules">{descriptions[board]}</p>
        {kind===6&&<div className="machineGuide"><h3>Get every gear to the right speed</h3><ol><li>Fill the nine sockets with gears, weights, or pipes.</li><li>Tap a gear to cycle: <b>Stopped → Slow → Medium → Fast → Stopped</b>.</li><li>Match <b>Now</b> to <b>Need</b>. Green gears are correct.</li></ol><p>Example: <b>Now: Stopped (0)</b>, <b>Need: Medium (2)</b> — tap twice.</p><div className="machineMeter"><strong>{state.gears.filter((id:any,i:number)=>id&&s.settings[board][i]===i%3+1).length}/9 gears matched</strong><progress max="9" value={state.gears.filter((id:any,i:number)=>id&&s.settings[board][i]===i%3+1).length}/></div></div>}{kind===1&&<p className="progressHint">{state.assembled?'Tap a highlighted tile to slide it into the gap. Moves: '+(state.sliderMoves||0):'Place any numbered tile in an empty socket. The GAP stays empty.'}</p>}<p className="progressHint">{s.completed.includes(board)?'Room closed':filledSockets(s,board)+'/'+requiredPieces(board,s)+' sockets filled · '+(readyToSolve(s,board)?'Ready to solve':'Fill all sockets to begin solving')}</p>{mode === 'puzzle' && inventoryPanel}{mode === 'explore' && <button className="primary openPuzzle" disabled={busy || s.completed.includes(board)} onClick={() => openPuzzle(board)}>Solve puzzle →</button>}{kind === 3 && <div className="colCounts"><span />{[2, 0, 1, 0, 2].map((v, i) => <b key={i}>{v}</b>)}</div>}
        {kind===7?<CircuitBoard state={s} board={board} send={send} busy={busy} selected={selected} mode={mode} rejected={rejected} onCell={cell} onNewRoom={newRoom}/>:<div className={'puzzleGrid ' + (kind === 3 ? 'forest' : '') + (kind === 0 ? ' waterGrid' : '')+(kind===5?' beamGrid':'')+(kind===6?' machineGrid':'')}>{kind===5&&<><div className="beamEmitter">EMITTER →</div><div className="beamReceiver">→ RECEIVER</div>{beamPreview&&<svg className="beamOverlay" viewBox="0 0 300 300" aria-label="Light beam route">{beamPreview.segments.map((v:number[],i:number)=><line key={i} x1={50+v[0]*100} y1={50+v[1]*100} x2={50+v[2]*100} y2={50+v[3]*100}/>)}</svg>}</>}{kind === 0 && <><div className="waterPort inlet" aria-label="Water inlet aligned with the first tile"><span>IN</span><svg viewBox="0 0 100 100"><path d="M0 50 H100"/><path className="arrow" d="M55 32 L75 50 L55 68"/></svg></div><div className="waterPort outlet" aria-label="Water outlet aligned with the last tile"><svg viewBox="0 0 100 100"><path d="M0 50 H100"/><path className="arrow" d="M55 32 L75 50 L55 68"/></svg><span>OUT</span></div></>}
        {Array.from({ length: puzzleFor(s,board).size }, (_, i) => { let id = kind===0&&state.waterTest?state.waterTest.pipes[i]:state[puzzleFor(s,board).field][i]; const item = s.items.find((it: any) => it.id===id); let tree = kind === 3 && trees.includes(i); return <button key={i} aria-label={kind===6&&id?'Gear '+(i+1)+', current speed '+s.settings[board][i]+', required speed '+(i%3+1)+'. Tap to change speed.':names[board] + ' cell ' + (i + 1)} aria-invalid={rejected === board + ':' + i}
        className={(kind===2&&lightHints.includes(i)?'lightHint ':'')+(kind===2&&hoverLight>=0&&lightNeighbors(hoverLight).includes(i)?'neighborPreview ':'')+(kind===5&&beamPreview?.blocked===i?'beamBlocked ':'')+(kind===1&&state.assembled&&id&&Math.abs(Math.floor(state.tiles.indexOf(null)/3)-Math.floor(i/3))+Math.abs(state.tiles.indexOf(null)%3-i%3)===1?'movableTile ':'')+(kind===0&&selected&&!id?'placementTarget ':'')+(kind===0&&state.waterTest?.path.includes(i)&&clock>=state.waterTest.startedAt+state.waterTest.path.indexOf(i)*300?'waterWet ':'')+(kind===0&&state.waterTest?.leak===i&&!waterFlowing?'waterLeak ':'')+(kind === 2 && id && !state.lights[i] ? 'lightOff ' : '') + (rejected === board + ':' + i ? 'rejected ' : '') + (id ? 'occupied ' : '') + (kind === 2 && state.lights[i] ? 'lit ' : '') + (tree ? 'tree ' : '') + (kind === 3 ? 'forestcell' : '')} disabled={(kind===0&&waterFlowing) || mode !== 'puzzle' || (busy && !selected) || (s.solved[board] && !remove)} onMouseEnter={()=>{if(kind===2)HoverLight(i);}} onMouseLeave={()=>HoverLight(-1)} onFocus={()=>{if(kind===2)HoverLight(i);}} onBlur={()=>HoverLight(-1)} onClick={() => cell(i)}>
        {kind === 0 && id ? <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="13"/>{connections(item.n-1, (state.waterTest?.rot||state.rot)[i]).map(d => <path key={d} d={'M50 50 L' + [[50, 0], [100, 50], [50, 100], [0, 50]][d].join(' ')}/>)}</svg>
        : kind === 1 ? (id ? item.n : state.assembled ? 'GAP' : i === 8 ? 'GAP' : '+')
        : kind === 2 ? (id ? <span>{state.lights[i]?'☀':'○'}<small className="socketLabel">{state.lights[i]?'ON':'OFF'}{lightHints.includes(i)?' · PRESS':''}</small></span> : '+')
        : kind === 3 ? (tree ? '♧' : id ? '⛺' : '·')
        : kind===6&&id?<GearSocket speed={s.settings[board][i]} target={i%3+1}/>
        : (id ? <span>{kind === 4 ? item?.n : kind === 5 ? ['·','/','\\'][s.settings[board][i]%3] : kind === 6 ? s.settings[board][i] : s.settings[board][i] ? '🟢' : '○'}<small className="socketLabel">{kind === 4 ? (i < 3 ? 'LEFT' : 'RIGHT') : kind === 6 ? 'Target ' + (i % 3 + 1) : item?.type}</small></span>
        : <span>+<small className="socketLabel">{kind === 0 ? (selected?'Place pipe':'Empty socket') : kind === 6 ? 'Target ' + (i % 3 + 1) : 'Socket ' + (i + 1)}</small></span>)}{s.locked?.[board]?.includes(i) && <span className="lockedBadge">🔒</span>}{kind === 3 && i % 5 === 4 && <span className="rowCount">1</span>}</button>; })}</div>}
        {kind===2&&<div className="lightControls"><p>{readyToSolve(s,board)?state.lights.filter(Boolean).length+' lights on · '+(state.lightMoves||0)+' moves':'Install all nine switches or batteries to begin.'}</p><button disabled={!readyToSolve(s,board)||s.completed.includes(board)} onClick={()=>ShowLightHints(!showLightHints)}>{showLightHints?'Hide hints':'Show solution hints'}</button><small>{showLightHints?'Press each marked light once, in any order. Hints update after every move.':'Each press toggles this light plus its up, down, left and right neighbors.'}</small></div>}{kind===5&&<div className="waterControls"><button className="primary" disabled={busy||mode!=='puzzle'||!readyToSolve(s,board)||s.completed.includes(board)} onClick={()=>send({type:'testBeam',board})}>Test beam · light the receiver →</button><p role="status">{beamPreview?beamPreview.reason:'Fill all nine sockets to switch on the beam preview.'}</p></div>}{kind===0&&<div className="waterControls"><button className="primary" disabled={busy||mode!=='puzzle'||!readyToSolve(s,board)||waterFlowing||s.completed.includes(board)} onClick={()=>{Sel('');send({type:'testWater',board});}}>Done · turn on water →</button><p role="status">{waterFlowing?'Water is flowing…':state.waterTest?(state.waterTest.passed?'Outlet reached! Room complete.':'Leak at socket '+(state.waterTest.leak+1)+': '+state.waterTest.reason):'Fill all sockets, rotate the pipes, then test the flow.'}</p></div>}
        {kind!==7&&<div className="resetRow"><button disabled={busy || s.completed.includes(board)} onClick={() => { Sel(''); Remove(false); send({ type: 'reset', board }); }}>Reset puzzle ↺</button><small>Returns placed pieces to this tray and clears locks.</small></div>}
        <div className="frameActions"><button className={remove ? 'toggled' : ''} onClick={() => { Remove(!remove); Sel(''); }}>{remove ? 'Retrieval mode ✓' : 'Retrieve a piece'}</button><small>{kind === 1 && state.assembled ? 'Tap a tile beside the gap.' : remove ? 'Tap a placed piece to return it to the shared tray.' : selected ? 'Tap an empty frame to place your piece.' : 'Tap a placed piece to interact.'}</small></div>
        <div className="checklist">{names.map((n: string, i: number) => <button key={i} disabled={!s.unlocked.includes(i) || s.completed.includes(i)} onClick={() => { openPuzzle(i); }}><span className={s.solved[i] ? 'checkDone' : 'check'}>{s.solved[i] ? '✓' : ('0' + (i + 1))}</span><span>{n}</span><small>{s.completed.includes(i) ? 'Closed' : s.unlocked.includes(i) ? 'Open' : 'Locked'}</small></button>)}</div></>}</aside></div><div className="share"><span>Bring your partner: <b>{room}</b> · Local players can use different stations. {remoteRooms ? 'Enter this code on any device to join.' : 'Room codes work in tabs sharing this browser’s storage.'}</span><button onClick={async () => { try {
        await navigator.clipboard.writeText(room);
        Msg('Room code copied.');
    }
    catch {
        Msg('Room code: ' + room);
    } }}>Copy room code ↗</button></div>{done === names.length && <div className="victory"><h2>All defense systems online. Keep recruiting fighters.</h2><p>The workshop is restored. Complete your fighter packages and defend the perimeter.</p><button onClick={newRoom}>Start a new adventure →</button></div>}</>}{msg && <div role="status" className="toast" onClick={() => Msg('')}>{msg} <span>×</span></div>}<footer><span>THE PUZZLE WORKSHOP</span><span>Find a piece. Share an idea. Make it work.</span><span>CO-OP / 01</span></footer>{(import.meta as any).env?.VITE_VERCEL_ANALYTICS && <Analytics />}</main>;
}
