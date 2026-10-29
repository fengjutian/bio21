import { useId, useState } from 'react';
import type { CSSProperties } from 'react';

const DEFAULTS = { temperature: 37, ph: 6.8, oxygen: 65 } as const;

type Reading = {
  key: 'temperature' | 'ph' | 'oxygen';
  label: string;
  value: string;
  score: number;
  weight: number;
  loss: number;
};

function getReadings(temperature: number, ph: number, oxygen: number): Reading[] {
  const temperatureScore = Math.max(0, 100 - Math.abs(temperature - 30) * 2.8);
  const phScore = Math.max(0, 100 - Math.abs(ph - 6.8) * 19);
  return [
    { key: 'temperature', label: '温度', value: `${temperature}°C`, score: temperatureScore, weight: 35, loss: 35 - temperatureScore * 0.35 },
    { key: 'ph', label: 'pH', value: ph.toFixed(1), score: phScore, weight: 40, loss: 40 - phScore * 0.4 },
    { key: 'oxygen', label: '溶氧', value: `${oxygen}%`, score: oxygen, weight: 25, loss: 25 - oxygen * 0.25 },
  ];
}

function SliderControl({ label, value, min, max, step, suffix, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const display = `${value.toFixed(step < 1 ? 1 : 0)}${suffix}`;
  return (
    <div className="slider-field compact">
      <div>
        <label htmlFor={id}>{label}</label>
        <strong>{display}</strong>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={display}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="slider-ends">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );
}

export default function FermentationLab() {
  const [temperature, setTemperature] = useState<number>(DEFAULTS.temperature);
  const [ph, setPh] = useState<number>(DEFAULTS.ph);
  const [oxygen, setOxygen] = useState<number>(DEFAULTS.oxygen);

  const readings = getReadings(temperature, ph, oxygen);
  const total = Math.round(readings.reduce((sum, reading) => sum + reading.score * reading.weight / 100, 0));
  const status = total >= 80 ? '良好' : total >= 55 ? '一般' : '偏低';
  const statusColor = total >= 80 ? '#2f6b4a' : total >= 55 ? '#9a7838' : '#a55f4c';
  const rowColor = (score: number) => score >= 80 ? '#5b8f68' : score >= 55 ? '#b1914f' : '#b57a66';
  const limiting = readings.reduce((worst, reading) => reading.loss > worst.loss ? reading : worst, readings[0]);
  const hasGap = limiting.loss > 0.05;
  const isDefault = temperature === DEFAULTS.temperature && Math.abs(ph - DEFAULTS.ph) < 1e-9 && oxygen === DEFAULTS.oxygen;
  const vesselStyle = { '--do': oxygen } as CSSProperties;
  const temperatureScore = readings[0].score;
  const phScore = readings[1].score;

  function reset() {
    setTemperature(DEFAULTS.temperature);
    setPh(DEFAULTS.ph);
    setOxygen(DEFAULTS.oxygen);
  }

  return (
    <div className="lab-card fermentation-card">
      <div className="lab-card-heading">
        <div>
          <span className="eyebrow">MODEL 03</span>
          <h2>发酵过程参数探索</h2>
          <p>调节温度、pH 与溶氧，查看教学用的相对适宜度指标如何变化。</p>
        </div>
        <div className="lab-card-actions">
          <span className="lab-chip">教学模拟</span>
          <button type="button" className="lab-reset" onClick={reset} disabled={isDefault}>重置参数</button>
        </div>
      </div>

      <div className="fermentation-layout">
        <div className="ferment-vessel">
          <div className="vessel-head"><span>BIOREACTOR</span><small>SIMULATION</small></div>
          <div className="vessel-stage">
            <span className="vessel-probe probe-temp"><i />T {temperature}°C</span>
            <span className="vessel-probe probe-ph right"><i />pH {ph.toFixed(1)}</span>
            <span className="vessel-probe probe-do"><i />DO {oxygen}%</span>
            <div className="vessel" style={vesselStyle}>
              <div className="vessel-liquid" />
              <div className="vessel-bubbles"><i /><i /><i /><i /><i /><i /></div>
              <div className="vessel-shaft" />
              <div className="vessel-blade" />
            </div>
            <div className="vessel-base" />
          </div>
          <p className="vessel-caption"><strong>{oxygen}%</strong><span>相对溶氧 · 液位恒定，气泡密度表示溶氧</span></p>
        </div>

        <div className="ferment-controls">
          <div className="ferment-score">
            <div className="score-head">
              <div className="score-total">
                <small>相对适宜度</small>
                <div className="score-number"><strong style={{ color: statusColor }}>{total}</strong><span>/100</span></div>
              </div>
              <div
                className="score-ring"
                style={{ background: `conic-gradient(${statusColor} ${total * 3.6}deg,#e5ebe5 0deg)` }}
                aria-hidden="true"
              >
                <span style={{ color: statusColor }}>{status}</span>
              </div>
            </div>
            <div className="score-breakdown">
              {readings.map((reading) => (
                <div
                  key={reading.key}
                  className={`score-row${hasGap && reading.key === limiting.key ? ' is-limiting' : ''}`}
                  title={`${reading.label}小分 ${Math.round(reading.score)}，权重 ${reading.weight}%，丢 ${reading.loss.toFixed(1)} 分`}
                >
                  <span className="score-row-label">{reading.label}<small>{reading.value}</small></span>
                  <span className="score-track"><i style={{ width: `${reading.score}%`, background: rowColor(reading.score) }} /></span>
                  <strong>{Math.round(reading.score)}</strong>
                  <small className="score-loss">{reading.loss > 0.05 ? `−${reading.loss.toFixed(1)}` : '—'}</small>
                </div>
              ))}
              <p className="score-gap">
                {hasGap
                  ? <>主要差距：<b>{limiting.label}</b>（{Math.round(limiting.score)} 分，−{limiting.loss.toFixed(1)}）</>
                  : '三个参数都在模型设定的适宜点。'}
              </p>
            </div>
          </div>

          <SliderControl label="温度" value={temperature} min={10} max={45} step={1} suffix="°C" onChange={setTemperature} />
          <SliderControl label="pH 值" value={ph} min={4} max={9} step={0.1} suffix="" onChange={setPh} />
          <SliderControl label="相对溶氧" value={oxygen} min={0} max={100} step={1} suffix="%" onChange={setOxygen} />

          <details className="score-method">
            <summary>如何计算这个分数？</summary>
            <div>
              <p>相对适宜度 = 温度小分 × 35% + pH 小分 × 40% + 溶氧 × 25%。</p>
              <ul>
                <li>温度：30°C 为最适点，每偏离 1°C 扣 2.8 分。</li>
                <li>pH：6.8 为最适点，每偏离 0.1 扣 1.9 分。</li>
                <li>溶氧：0–100% 线性计分；本演示假定相对溶氧越高越好。</li>
              </ul>
              <p>当前：0.35 × {Math.round(temperatureScore)} + 0.40 × {Math.round(phScore)} + 0.25 × {oxygen} ≈ {total}。</p>
              <p>这是教学假设，不对应任何具体菌株或真实工艺；真实发酵中溶氧并非越高越好，还受剪切、泡沫与供气成本限制。</p>
            </div>
          </details>
        </div>
      </div>

      <div className="lab-explain">
        <strong>工程视角</strong>
        <p>生物反应器的实际表现取决于生物体、培养基、传质、混合与控制策略等多因素。真实工艺应依据目标系统的数据和验证结果设定参数。</p>
      </div>
      <p className="sr-only" aria-live="polite">
        相对适宜度 {total} 分，{status}。{hasGap ? `主要差距：${limiting.label}，丢 ${limiting.loss.toFixed(1)} 分。` : '三个参数均在模型设定的适宜点。'}
      </p>
    </div>
  );
}
