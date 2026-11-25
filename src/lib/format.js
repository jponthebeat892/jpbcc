import moment from 'moment';

export function formatClock(value) {
  if (!value) return '--:--';
  const stamp = moment(value);
  if (!stamp.isValid()) return '--:--';
  if (stamp.isSame(moment(), 'day')) return stamp.format('HH:mm');
  if (stamp.isSame(moment().subtract(1, 'day'), 'day')) return 'YESTERDAY';
  return stamp.format('DD MMM').toUpperCase();
}

export function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function kindLabel(kind) {
  return (
    {
      text: 'TEXT BLOCK',
      image: 'PICTURE',
      video: 'VIDEO',
      audio: 'AUDIO',
      document: 'DOCUMENT',
    }[kind] || 'BLOCK'
  );
}

export function initialsOf(handle) {
  const clean = String(handle || '??').replace(/[^a-zA-Z0-9]/g, '');
  return (clean.slice(0, 2) || '??').toUpperCase();
}

export function usernameErrorMessage(username) {
  const value = String(username || '').trim();
  if (value.length < 3) return 'A handle needs at least 3 characters.';
  if (value.length > 20) return 'A handle can be at most 20 characters.';
  if (!/^[a-z0-9_]+$/.test(value)) return 'Use lowercase letters, numbers and underscores only.';
  return '';
}

export function passwordStrength(password) {
  const value = String(password || '');
  const checks = {
    length: value.length >= 12,
    lower: /[a-z]/.test(value),
    upper: /[A-Z]/.test(value),
    digit: /[0-9]/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const levels = ['CRITICAL', 'WEAK', 'FAIR', 'GOOD', 'STRONG', 'FORTIFIED'];
  return { checks, score, label: levels[score] };
}