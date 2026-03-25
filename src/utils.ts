export const toLocalDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const todayStr = () => toLocalDateStr(new Date());

export const formatDate = (ds: string) => {
  if (!ds) return '';
  const d = new Date(ds + 'T00:00:00');
  const today = todayStr();
  const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
  const tmrwS = toLocalDateStr(tmrw);
  
  if (ds === today) return 'Today';
  if (ds === tmrwS) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
};

export const formatTime = (ts: string) => {
  if (!ts) return '';
  const [h, m] = ts.split(':').map(Number);
  const am = h < 12;
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
};

export const ACCENTS = {
  tiffany: { main: '#0ABAB5', light: '#e6f7f7', hover: '#099b95' },
  blue: { main: '#0078d4', light: '#e8f3fc', hover: '#106ebe' },
  teal: { main: '#007c7c', light: '#e0f5f5', hover: '#006666' },
  purple: { main: '#6b35c8', light: '#f0eafc', hover: '#5a2aac' },
  green: { main: '#107c10', light: '#e8f5e8', hover: '#0a6b0a' },
  rose: { main: '#c42b45', light: '#fde8ec', hover: '#a82339' },
  orange: { main: '#d15000', light: '#fdf0e8', hover: '#b54400' }
};

export const updateThemeIcon = (theme: string) => {
  if (typeof document === 'undefined') return;

  const faviconHref = theme === 'dark' ? '/Logo/snabbb-white.png' : '/Logo/snabbb-teal.png';
  let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/png';
    document.head.appendChild(favicon);
  }

  favicon.href = faviconHref;
};

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
