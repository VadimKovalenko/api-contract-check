import { Box, ExternalLink, Loader2, Moon, Play, ShieldCheck, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MetricCard } from '../MetricCard';
import { RequestForm } from '../RequestForm';
import { ResultsPanel } from '../ResultsPanel';
import { vantaFogColors } from '../../colors';
import { metricCards } from './constants';
import { useAppUiState, useSchemaCheck, useThemeController } from './hooks';
import './styles.css';

export function App() {
  const { error, form, health, loading, result, runCheck, updateField } = useSchemaCheck();
  const { featureFlags } = useAppUiState();
  const { isLightTheme, theme, themeStyle, toggleTheme } = useThemeController();
  const fogRef = useRef<HTMLDivElement | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(true);

  useEffect(() => {
    const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (theme !== 'dark' || shouldReduceMotion || !fogRef.current) {
      return undefined;
    }

    let effect: { destroy: () => void } | undefined;
    let cancelled = false;

    void Promise.all([
      import('three'),
      import('vanta/dist/vanta.fog.min'),
    ]).then(([THREE, { default: FOG }]) => {
      if (cancelled || !fogRef.current) {
        return;
      }

      effect = FOG({
        THREE,
        el: fogRef.current,
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
        minHeight: 260,
        minWidth: 320,
        highlightColor: vantaFogColors.highlight,
        midtoneColor: vantaFogColors.midtone,
        lowlightColor: vantaFogColors.lowlight,
        baseColor: vantaFogColors.base,
        blurFactor: 0.64,
        speed: 0.85,
        zoom: 0.72,
      });
    });

    return () => {
      cancelled = true;
      effect?.destroy();
    };
  }, [theme]);

  function dismissPrivacyNotice() {
    setPrivacyVisible(false);
  }

  return (
    <main className="app-shell" data-theme={theme} style={themeStyle}>
      <div className="background-fog" ref={fogRef} aria-hidden="true" />
      {privacyVisible ? (
        <section className="privacy-banner" aria-label="Privacy notice">
          <div className="privacy-banner-copy">
            <ShieldCheck size={19} />
            <p>
              We do not collect or log sensitive data. You can run this app locally from the
              GitHub repository.
            </p>
          </div>
          <div className="privacy-banner-actions">
            <button className="privacy-link-button" onClick={() => setPrivacyOpen(true)} type="button">
              Details
            </button>
            <button
              aria-label="Dismiss privacy notice"
              className="privacy-icon-button"
              onClick={dismissPrivacyNotice}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </section>
      ) : null}
      <nav className="app-nav" aria-label="Primary navigation">
        <div className="brand-mark">
          <span className="brand-icon" aria-hidden="true">
            <Box size={18} />
          </span>
          <span>Contract Monitor</span>
        </div>
        {featureFlags.showTopNavigation ? (
          <div className="nav-tabs" aria-label="Sections">
            <button className="active" type="button">Check</button>
            <button type="button">History</button>
            <button type="button">Environments</button>
            <button type="button">Settings</button>
          </div>
        ) : null}
        <div className="nav-actions">
          <button
            aria-checked={isLightTheme}
            aria-label="Switch light theme"
            className="theme-toggle"
            onClick={toggleTheme}
            role="switch"
            type="button"
          >
            <span className="theme-toggle-track">
              <span className="theme-toggle-icon">
                <Moon size={15} />
              </span>
              <span className="theme-toggle-icon">
                <Sun size={15} />
              </span>
              <span className="theme-toggle-thumb" />
            </span>
          </button>
          <button className="run-button" onClick={() => void runCheck()} disabled={loading} type="button">
            {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            <span>Run Check</span>
          </button>
        </div>
      </nav>

      <section className="hero">
        <div>
          <h1>API Schema Coverage</h1>
          <p>Make sure your API responses match the contract.</p>
        </div>
        <div className="hero-status" aria-label="Environment status">
          <span>ENV</span>
          <strong>prod</strong>
          <span>v1.0.0</span>
        </div>
      </section>

      <section className="metric-grid" aria-label="Check summary">
        {metricCards.map(({ getMeter, getTone, getValue, icon: Icon, label, meterVariant }) => (
          <MetricCard
            icon={<Icon />}
            key={label}
            label={label}
            meter={getMeter?.(result)}
            meterVariant={meterVariant}
            tone={getTone(result, health)}
            value={getValue(result)}
          />
        ))}
      </section>

      <section className="workspace-grid">
        <RequestForm form={form} onRunCheck={runCheck} onUpdateField={updateField} />
        <ResultsPanel error={error} result={result} />
      </section>

      {privacyOpen ? (
        <div className="privacy-modal-backdrop" role="presentation">
          <section
            aria-labelledby="privacy-modal-title"
            aria-modal="true"
            className="privacy-modal"
            role="dialog"
          >
            <div className="privacy-modal-heading">
              <div>
                <p className="eyebrow">Privacy notice</p>
                <h2 id="privacy-modal-title">Sensitive data stays out of our logs</h2>
              </div>
              <button
                aria-label="Close privacy notice"
                className="privacy-icon-button"
                onClick={() => setPrivacyOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="privacy-modal-body">
              <p>
                This app is designed for endpoint schema checks. It does not intentionally collect,
                store, or log sensitive request data, authorization values, cookies, or response
                payloads.
              </p>
              <p>
                For the most private workflow, install and run the app locally from the public
                repository instead of sending internal API details to a hosted deployment.
              </p>
            </div>
            <div className="privacy-modal-actions">
              <a
                className="privacy-repo-link"
                href="https://github.com/VadimKovalenko/api-contract-check"
                rel="noreferrer"
                target="_blank"
              >
                Open GitHub repo
                <ExternalLink size={16} />
              </a>
              <button className="privacy-link-button" onClick={() => setPrivacyOpen(false)} type="button">
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
