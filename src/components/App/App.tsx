import { ExternalLink, Loader2, Moon, Play, Save, ShieldCheck, Sun, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { MetricCard } from '../MetricCard';
import { MyYamls } from '../MyYamls';
import { RequestForm } from '../RequestForm';
import { ResultsPanel } from '../ResultsPanel';
import { useModalAccessibility } from '../useModalAccessibility';
import apiCheckerLogo from '../../assets/api-checker-logo.png';
import { vantaFogColors } from '../../colors';
import { metricCards } from './constants';
import {
  useAppUiState,
  useSavedYamlLibrary,
  useSchemaCheck,
  useThemeController,
  useWorkspaceResize,
} from './hooks';
import type { FieldHighlight, FieldHighlightTarget, SavedYaml, StyleVars } from '../../types';
import './styles.css';

const navItems: ReadonlyArray<{ end?: boolean; label: string; to: string }> = [
  { end: true, label: 'Check', to: '/' },
  { label: 'My Yamls', to: '/yamls' },
];

export function App() {
  const { applySavedYaml, error, form, health, loading, result, runCheck, updateField } = useSchemaCheck();
  const { featureFlags } = useAppUiState();
  const { createSavedYaml, removeSavedYaml, savedYamls } = useSavedYamlLibrary();
  const { isLightTheme, theme, themeStyle, toggleTheme } = useThemeController();
  const {
    handleResizeKeyDown,
    requestPanelPercent,
    resizing,
    startResize,
    workspaceRef,
    workspaceStyle,
  } = useWorkspaceResize();
  const fogRef = useRef<HTMLDivElement | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [responseHighlight, setResponseHighlight] = useState<FieldHighlight | null>(null);
  const [schemaHighlight, setSchemaHighlight] = useState<FieldHighlight | null>(null);
  const privacyModal = useModalAccessibility(privacyOpen, () => setPrivacyOpen(false));
  const saveYamlModal = useModalAccessibility(saveDialogOpen, () => setSaveDialogOpen(false));
  const location = useLocation();
  const navigate = useNavigate();
  const isCheckPage = location.pathname === '/';
  const activeNavIndex = Math.max(
    0,
    navItems.findIndex((item) => (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))),
  );
  const navTabsStyle: StyleVars = {
    '--nav-count': String(navItems.length),
    '--nav-index': String(activeNavIndex),
  };

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

  function openPrivacyNotice() {
    privacyModal.rememberOpener();
    setPrivacyOpen(true);
  }

  function openSaveDialog() {
    saveYamlModal.rememberOpener();
    setSaveDialogOpen(true);
  }

  function saveCurrentYaml(event: FormEvent) {
    event.preventDefault();
    createSavedYaml({
      title: saveTitle,
      url: form.url,
      yamlSpec: form.yamlSpec,
    });
    setSaveTitle('');
    setSaveDialogOpen(false);
    navigate('/yamls');
  }

  function useSavedYaml(savedYaml: SavedYaml) {
    applySavedYaml(savedYaml);
    navigate('/');
  }

  function highlightField(path: string, target: FieldHighlightTarget) {
    const highlight: FieldHighlight = { path };

    if (target === 'schema') {
      setSchemaHighlight(highlight);
    } else {
      setResponseHighlight(highlight);
    }
  }

  const modalLayer = (
    <>
      {privacyOpen ? (
        <div className="privacy-modal-backdrop" role="presentation">
          <section
            aria-describedby="privacy-modal-description"
            aria-labelledby="privacy-modal-title"
            aria-modal="true"
            className="privacy-modal"
            data-accessible-modal
            role="dialog"
            tabIndex={-1}
          >
            <div className="privacy-modal-heading">
              <div>
                <p className="eyebrow">Privacy notice</p>
                <h2 id="privacy-modal-title">Sensitive data stays out of our logs</h2>
              </div>
              <button
                aria-label="Close privacy notice"
                className="privacy-icon-button"
                data-dialog-initial-focus
                onClick={() => setPrivacyOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="privacy-modal-body">
              <p id="privacy-modal-description">
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
      {saveDialogOpen ? (
        <div className="privacy-modal-backdrop" role="presentation">
          <form
            aria-describedby="save-yaml-description"
            aria-labelledby="save-yaml-title"
            aria-modal="true"
            className="privacy-modal save-yaml-modal"
            onSubmit={saveCurrentYaml}
            data-accessible-modal
            role="dialog"
            tabIndex={-1}
          >
            <div className="privacy-modal-heading">
              <div>
                <p className="eyebrow">Save YAML</p>
                <h2 id="save-yaml-title">Add this request to My Yamls</h2>
              </div>
              <button
                aria-label="Cancel save"
                className="privacy-icon-button"
                onClick={() => setSaveDialogOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <label className="field">
              <span>Name</span>
              <input
                autoFocus
                data-dialog-initial-focus
                onChange={(event) => setSaveTitle(event.target.value)}
                placeholder="User profile schema"
                aria-describedby="save-yaml-description"
                value={saveTitle}
              />
            </label>
            <p className="sr-only" id="save-yaml-description">Choose a name for the current request and YAML schema.</p>
            <div className="save-yaml-preview">
              <span>Request</span>
              <code>{form.url}</code>
            </div>
            <div className="privacy-modal-actions">
              <button className="privacy-link-button" onClick={() => setSaveDialogOpen(false)} type="button">
                Cancel
              </button>
              <button className="run-button" disabled={!form.url.trim() || !form.yamlSpec.trim()} type="submit">
                <Save size={17} />
                <span>Save</span>
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <main aria-hidden={privacyOpen || saveDialogOpen} className="app-shell" data-theme={theme} inert={privacyOpen || saveDialogOpen} style={themeStyle}>
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
              <button className="privacy-link-button" onClick={openPrivacyNotice} type="button">
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
        <NavLink className="brand-mark" to="/">
          <span className="brand-icon" aria-hidden="true">
            <img alt="" className="brand-logo" src={apiCheckerLogo} />
          </span>
          <span>API Checker</span>
        </NavLink>
        {featureFlags.showTopNavigation ? (
          <div className="nav-tabs" aria-label="Sections" style={navTabsStyle}>
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) => (isActive ? 'active' : '')}
                end={item.end}
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ) : null}
        <div className="nav-actions">
          <button
            aria-checked={isLightTheme}
            aria-label={isLightTheme ? 'Switch to dark theme' : 'Switch to light theme'}
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
          <button
            className="run-button"
            disabled={loading}
            form={isCheckPage ? 'request-form' : undefined}
            onClick={isCheckPage ? undefined : () => void runCheck()}
            type={isCheckPage ? 'submit' : 'button'}
          >
            {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            <span>Run Check</span>
          </button>
        </div>
      </nav>

      <Routes>
        <Route
          path="/"
          element={(
            <>
              <section className="hero">
                <div>
                  <h1>API Schema Coverage</h1>
                  <p>Make sure your API responses match the contract.</p>
                </div>
                <div className="hero-status" aria-label="Environment status">
                  <span>ENV</span>
                  <strong>prod</strong>
                  <span title={`Release ${__APP_RELEASE_VERSION__}`}>{__APP_RELEASE_VERSION__}</span>
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

              <section
                className={`workspace-grid ${resizing ? 'is-resizing' : ''}`}
                ref={workspaceRef}
                style={workspaceStyle}
              >
                <RequestForm
                  form={form}
                  highlightRequest={schemaHighlight}
                  onRunCheck={runCheck}
                  onSaveCurrentYaml={openSaveDialog}
                  onUpdateField={updateField}
                />
                <button
                  aria-label="Resize request and results panels"
                  aria-orientation="vertical"
                  aria-valuemax={68}
                  aria-valuemin={32}
                  aria-valuenow={Math.round(requestPanelPercent)}
                  className="workspace-resize-handle"
                  onKeyDown={handleResizeKeyDown}
                  onPointerDown={startResize}
                  role="separator"
                  type="button"
                />
                <ResultsPanel
                  error={error}
                  onHighlightField={highlightField}
                  responseHighlight={responseHighlight}
                  result={result}
                />
              </section>
            </>
          )}
        />
        <Route
          path="/yamls"
          element={(
            <MyYamls
              onCreateYaml={createSavedYaml}
              onRemoveYaml={removeSavedYaml}
              onUseYaml={useSavedYaml}
              savedYamls={savedYamls}
            />
          )}
        />
        </Routes>
      </main>
      {createPortal(modalLayer, document.body)}
    </>
  );
}
