import { Fragment } from 'react';

interface StepperProps {
  steps: string[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <Fragment key={s}>
          <div className={'step' + (current === i ? ' active' : '') + (current > i ? ' done' : '')}>
            <div className="num">{current > i ? '✓' : i + 1}</div>
            <span className="lbl">{s}</span>
          </div>
          {i < steps.length - 1 && <div className={'step-line' + (current > i ? ' done' : '')} />}
        </Fragment>
      ))}
    </div>
  );
}
