const UNASSIGNED_EVENT_COLORS = {
  backgroundColor: '#F2F2F2',
  borderColor: '#D0D0D0',
  color: '#303030'
};

function hexToRgb(hex) {
  const normalized = String(hex ?? '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function mixWithWhite(rgb, amount) {
  const mix = (channel) => Math.round(channel + (255 - channel) * amount);
  return `rgb(${mix(rgb.red)} ${mix(rgb.green)} ${mix(rgb.blue)})`;
}

function darken(rgb, amount) {
  const shade = (channel) => Math.round(channel * (1 - amount));
  return `rgb(${shade(rgb.red)} ${shade(rgb.green)} ${shade(rgb.blue)})`;
}

export function eventColorsForProject(project) {
  const rgb = hexToRgb(project?.color);
  if (!rgb) return UNASSIGNED_EVENT_COLORS;

  return {
    backgroundColor: mixWithWhite(rgb, 0.82),
    borderColor: project.color,
    color: darken(rgb, 0.52)
  };
}

export function taskColorsForProject(project) {
  const colors = eventColorsForProject(project);
  return {
    backgroundColor: colors.backgroundColor,
    borderColor: colors.borderColor
  };
}

export const PROJECT_COLOR_PRESETS = [
  '#2D6A57',
  '#2B6CB0',
  '#6B5CB8',
  '#A64D79',
  '#B45309',
  '#B4534A',
  '#3F7A6B',
  '#64748B'
];
