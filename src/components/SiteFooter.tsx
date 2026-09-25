import React from 'react';
import { Shield } from 'lucide-react';
import { LegalPageRoute } from './PrivacyLegalHub';

interface SiteFooterProps {
  onOpenLegalRoute: (route: LegalPageRoute) => void;
  onOpenRulesTab: () => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  onOpenLegalRoute,
  onOpenRulesTab,
}) => {
  return (
    <footer className="dpdp-site-footer" aria-label="Site Legal, Privacy & Support Footer">
      <div className="dpdp-footer-inner">
        {/* Column 1: Game */}
        <div className="dpdp-footer-col">
          <span className="dpdp-footer-heading">Game</span>
          <button
            type="button"
            className="dpdp-footer-link"
            onClick={onOpenRulesTab}
          >
            Rules
          </button>
        </div>

        {/* Column 2: Privacy */}
        <div className="dpdp-footer-col">
          <span className="dpdp-footer-heading">Privacy</span>
          <button
            type="button"
            className="dpdp-footer-link"
            onClick={() => onOpenLegalRoute('privacy-policy')}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            className="dpdp-footer-link"
            onClick={() => onOpenLegalRoute('privacy-settings')}
          >
            Privacy Settings
          </button>
          <button
            type="button"
            className="dpdp-footer-link"
            onClick={() => onOpenLegalRoute('cookie-policy')}
          >
            Cookie Policy
          </button>
          <button
            type="button"
            className="dpdp-footer-link"
            onClick={() => onOpenLegalRoute('terms')}
          >
            Terms
          </button>
          <button
            type="button"
            className="dpdp-footer-link"
            onClick={() => onOpenLegalRoute('community-guidelines')}
          >
            Community Guidelines
          </button>
        </div>

        {/* Column 3: Data & Security */}
        <div className="dpdp-footer-col">
          <span className="dpdp-footer-heading">Data &amp; Security</span>
          <button
            type="button"
            className="dpdp-footer-link"
            onClick={() => onOpenLegalRoute('delete-account')}
          >
            Delete Account
          </button>
          <button
            type="button"
            className="dpdp-footer-link"
            onClick={() => onOpenLegalRoute('download-data')}
          >
            Download My Data
          </button>
          <button
            type="button"
            className="dpdp-footer-link"
            onClick={() => onOpenLegalRoute('security')}
          >
            Security
          </button>
        </div>

        {/* Column 4: Support */}
        <div className="dpdp-footer-col">
          <span className="dpdp-footer-heading">Support</span>
          <button
            type="button"
            className="dpdp-footer-link"
            onClick={() => onOpenLegalRoute('report-player')}
          >
            Report Player
          </button>
          <button
            type="button"
            className="dpdp-footer-link"
            onClick={() => onOpenLegalRoute('contact')}
          >
            Contact
          </button>
        </div>

        {/* Quick Privacy Settings Pill */}
        <div className="dpdp-footer-badge-col">
          <button
            type="button"
            className="dpdp-footer-shield-pill"
            onClick={() => onOpenLegalRoute('privacy-settings')}
          >
            <Shield size={13} />
            <span>DPDP Data &amp; Privacy Controls</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
