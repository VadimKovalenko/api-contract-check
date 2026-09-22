import { ExternalLink, Loader2, Play, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { colorVariables } from '../../colors';
import { MetricCard } from '../MetricCard';
import { RequestForm } from '../RequestForm';
import { ResultsPanel } from '../ResultsPanel';
import { metricCards } from './constants';
import { useSchemaCheck } from './hooks';
import './styles.css';

export function App() {
  const { error, form, health, loading, result, runCheck, updateField } = useSchemaCheck();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(true);

  function dismissPrivacyNotice() {
    setPrivacyVisible(false);
  }

  return (
    <main className="app-shell" style={colorVariables}>
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
      <section className="topbar">
        <div>
          <p className="eyebrow">Contract monitor</p>
          <h1>API Schema Coverage</h1>
        </div>
        <button className="run-button" onClick={runCheck} disabled={loading} type="button">
          {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
          Run GET Check
        </button>
      </section>

      <section className="metric-grid" aria-label="Check summary">
        {metricCards.map(({ getMeter, getTone, getValue, icon: Icon, label }) => (
          <MetricCard
            icon={<Icon />}
            key={label}
            label={label}
            meter={getMeter?.(result)}
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
