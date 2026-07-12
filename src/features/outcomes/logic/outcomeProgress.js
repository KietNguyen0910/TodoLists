import { OUTCOME_PHASES } from '../config/outcomeConfig';

export function getOutcomeProgress(outcomes = []) {
  const selected = Array.isArray(outcomes) ? outcomes : outcomes ? [outcomes] : [];
  const highestPhaseIndex = OUTCOME_PHASES.reduce((highest, phase, index) => (
    phase.items.some((item) => selected.includes(item)) ? Math.max(highest, index) : highest
  ), -1);
  const completedPhases = highestPhaseIndex + 1;
  const totalPhases = OUTCOME_PHASES.length;
  const percent = totalPhases ? Math.round((completedPhases / totalPhases) * 100) : 0;

  return {
    completedPhases,
    totalPhases,
    percent,
    label: `${completedPhases}/${totalPhases} phases (${percent}%)`,
  };
}
