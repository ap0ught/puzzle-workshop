import { circuitReadings } from '../../lib/game';
import { voltages, resistances } from '../../lib/circuit';
import { CircuitSymbol } from './circuit-readout';

const rowNames = ['Floodlights', 'Turret control', 'Electric fence'];

export function CircuitBoard({ state, send, busy, selected, mode, rejected, onCell, onNewRoom }: any) {
    const readings = circuitReadings(state);
    const ready = state.circuit.every(Boolean);
    const won = readings.every((r: any) => r.matched);
    const locked = !!state.solved[7] || !!state.completed?.includes(7);
    return <div className="circuitBoard">
        {readings.map((r: any, row: number) => {
            const base = row * 3;
            return <div key={row} className={'circuitRow' + (r.matched ? ' rowMatched' : '')}>
                <div className="circuitRowHead">
                    <b>{rowNames[row]}</b>
                    <span className={'circuitReading' + (r.matched ? ' matched' : '')}>
                        {r.current.toFixed(1)} mA <small>· target {r.target} mA</small> {r.matched ? '✓ matched' : r.closed ? '' : '· switch open'}
                    </span>
                </div>
                <div className="circuitCells">
                    {[0, 1, 2].map(i => {
                        const c = base + i, id = state.circuit[c];
                        return <button key={c}
                            aria-label={rowNames[row] + ' socket ' + (i + 1) + (id ? ', wired' : ', empty')}
                            aria-invalid={rejected === '7:' + c}
                            className={'circuitCell' + (id ? ' filled' : '') + (selected && !id ? ' placementTarget' : '') + (rejected === '7:' + c ? ' rejected' : '')}
                            disabled={mode !== 'puzzle' || (busy && !selected) || locked}
                            onClick={() => onCell(c)}>
                            {id ? <CircuitSymbol column={i} value={state.settings[7][c]} /> : <span>+<small className="socketLabel">{selected ? 'Place wire' : 'Empty socket'}</small></span>}
                        </button>;
                    })}
                </div>
                <div className="circuitControls">
                    <div className="circuitControl">
                        <small>Voltage</small>
                        <div className="circuitChoices">
                            {voltages.map((v, vi) => <button key={v} className={state.settings[7][base] % 4 === vi ? 'chosen' : ''} disabled={!ready || locked || busy} onClick={() => send({ type: 'setCircuit', board: 7, cell: base, value: vi })}>{v} V</button>)}
                        </div>
                    </div>
                    <div className="circuitControl">
                        <small>Resistance</small>
                        <div className="circuitChoices">
                            {resistances.map((v, ri) => <button key={v} className={state.settings[7][base + 1] % 4 === ri ? 'chosen' : ''} disabled={!ready || locked || busy} onClick={() => send({ type: 'setCircuit', board: 7, cell: base + 1, value: ri })}>{v} Ω</button>)}
                        </div>
                    </div>
                    <div className="circuitControl">
                        <small>Switch</small>
                        <div className="circuitChoices">
                            {[0, 1].map(v => <button key={v} className={state.settings[7][base + 2] % 2 === v ? 'chosen' : ''} disabled={!ready || locked || busy} onClick={() => send({ type: 'setCircuit', board: 7, cell: base + 2, value: v })}>{v ? 'Closed' : 'Open'}</button>)}
                        </div>
                    </div>
                </div>
                {!ready && <small className="circuitRowHint">Fill all three sockets to power this row.</small>}
            </div>;
        })}
        {won && <div className="circuitWin" role="status"><h3>All three circuits match!</h3><p>Defense power supply restored — every row delivers its target current.</p></div>}
        <div className="circuitActions">
            {won || locked
                ? <button className="primary" disabled={busy} onClick={onNewRoom}>New room ↗</button>
                : <button disabled={busy} onClick={() => send({ type: 'reset', board: 7 })}>Reset circuit ↺</button>}
            <small>{won || locked ? 'Room solved — start a fresh room or keep exploring.' : 'Reset returns the wires to the tray and clears every setting.'}</small>
        </div>
    </div>;
}