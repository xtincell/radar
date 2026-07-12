// Dashboard R26 — shared primitives
// Exposed on window for use by other Babel scripts.

const { useState, useEffect, useRef } = React;

// Lucide icon wrapper. Renders a placeholder <i> that lucide.createIcons()
// upgrades to an SVG. Re-runs on mount.
function Icon({ name, size = 20, color, strokeWidth = 1.9, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = '';
      const i = document.createElement('i');
      i.setAttribute('data-lucide', name);
      ref.current.appendChild(i);
      window.lucide.createIcons({
        attrs: { width: size, height: size, 'stroke-width': strokeWidth },
        nameAttr: 'data-lucide',
      });
    }
  }, [name, size, strokeWidth]);
  return <span ref={ref} className="r26-icon" style={{ display: 'inline-flex', color, ...style }} />;
}

function Button({ variant = 'primary', children, icon, onClick, style }) {
  const base = {
    fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 15, cursor: 'pointer',
    border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '11px 20px', borderRadius: 'var(--radius-pill)',
    transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast), box-shadow var(--dur-med)',
  };
  const variants = {
    primary: { background: 'var(--orange-500)', color: 'var(--fg-on-orange)', boxShadow: 'var(--shadow-orange)' },
    dark: { background: 'var(--ink-950)', color: 'var(--fg-on-dark)' },
    ghost: { background: 'var(--paper-100)', color: 'var(--fg1)', border: '1px solid var(--border)' },
  };
  return (
    <button
      style={{ ...base, ...variants[variant], ...style }}
      onClick={onClick}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
      {icon && <Icon name={icon} size={17} />}
    </button>
  );
}

function IconBtn({ name, variant = 'light', size = 44, onClick, active }) {
  const styles = {
    light: { background: 'var(--paper-0)', color: 'var(--fg1)', boxShadow: 'var(--shadow-sm)' },
    dark: { background: 'var(--ink-950)', color: '#fff' },
    cream: { background: 'var(--paper-100)', color: 'var(--fg2)' },
    orange: { background: 'var(--orange-500)', color: 'var(--fg-on-orange)' },
  };
  return (
    <button
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: '50%', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform var(--dur-fast) var(--ease-out)',
        ...(active ? styles.orange : styles[variant]),
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <Icon name={name} size={size * 0.42} />
    </button>
  );
}

function Chip({ children, variant = 'soft', style }) {
  const v = {
    solid: { background: 'var(--orange-500)', color: 'var(--fg-on-orange)' },
    ink: { background: 'var(--ink-950)', color: '#fff' },
    soft: { background: 'var(--orange-50)', color: 'var(--orange-700)' },
    outline: { background: 'transparent', color: 'var(--fg2)', border: '1.5px solid var(--border-strong)' },
    hatch: { background: 'transparent', color: 'var(--fg2)', border: '1.5px solid var(--border-strong)',
      backgroundImage: 'repeating-linear-gradient(135deg, var(--paper-200) 0 6px, transparent 6px 12px)' },
  };
  return (
    <span style={{ padding: '7px 15px', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', ...v[variant], ...style }}>
      {children}
    </span>
  );
}

// Avatar with initials on a warm tint (no external image needed)
function Avatar({ initials, size = 36, tint = 'var(--orange-200)', img, style }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: img ? `center/cover url(${img})` : tint,
      color: 'var(--ink-900)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36, fontFamily: 'var(--font-sans)',
      border: '2px solid var(--paper-0)', ...style,
    }}>
      {!img && initials}
    </div>
  );
}

// Bento card shell
function Card({ tone = 'white', radius = 'var(--radius-xl)', pad = 24, children, style, onClick }) {
  const tones = {
    white: { background: 'var(--surface)', color: 'var(--fg1)' },
    cream: { background: 'var(--surface-cream)', color: 'var(--fg1)' },
    dark: { background: 'var(--surface-dark)', color: 'var(--fg-on-dark)' },
  };
  return (
    <div onClick={onClick} style={{
      borderRadius: radius, padding: pad, boxShadow: tone === 'dark' ? 'var(--shadow-lg)' : 'var(--shadow-md)',
      ...tones[tone], ...style,
    }}>
      {children}
    </div>
  );
}

// Card header: title + open-arrow action
function CardHead({ title, dark }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, color: dark ? 'var(--fg-on-dark)' : 'var(--fg1)' }}>{title}</span>
      <IconBtn name="arrow-up-right" variant={dark ? 'dark' : 'light'} size={36} />
    </div>
  );
}

Object.assign(window, { Icon, Button, IconBtn, Chip, Avatar, Card, CardHead });
