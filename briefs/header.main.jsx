// Dashboard R26 — main-layout page header: greeting + actions
// Adapté au Radar : « Nouveau projet » ouvre le ticket, le soleil bascule le
// thème clair/sombre (tokens dark de colors_and_type.css), pas de badge factice.

function SearchField() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, width: 280,
      background: 'var(--paper-0)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-pill)', padding: '10px 16px',
      color: 'var(--fg3)', boxShadow: 'var(--shadow-xs)',
    }}>
      <Icon name="search" size={16} />
      <input
        placeholder="Rechercher…"
        style={{
          border: 'none', outline: 'none', background: 'transparent', flex: 1,
          fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg1)',
        }}
      />
    </div>
  );
}

// Thème clair par défaut, sombre opt-in, persistant (clé historique radar:theme).
function ThemeBtn() {
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark');
  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('radar:theme', next ? 'dark' : 'light'); } catch (e) {}
  };
  return <IconBtn name={dark ? 'sun' : 'moon'} variant="light" size={42} onClick={toggle} />;
}

function Header({ name }) {
  return (
    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 26 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 34, letterSpacing: '-0.01em', color: 'var(--fg1)' }}>
          {name ? `Bonjour, ${name}` : 'Bonjour'}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--fg3)' }}>Voici l'activité créative de l'agence aujourd'hui.</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button variant="dark" icon="plus" style={{ flexDirection: 'row-reverse' }} onClick={() => window.appNavigate && window.appNavigate('Nouveau ticket')}>Nouveau projet</Button>
        <SearchField></SearchField>
        <IconBtn name="bell" variant="light" size={42} />
        <ThemeBtn />
      </div>
    </header>
  );
}

Object.assign(window, { Header });
