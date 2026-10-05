import "../styles/Dashboard.css";

// Page frame for the staff and agent pages, which are shown without the site
// header: a sticky top bar (logo, title, action buttons) above the content.
export default function DashboardShell({ title, subtitle, actions, children }) {
  return (
    <div className="dash-page">
      <header className="dash-topbar">
        <div className="dash-topbar-inner">
          <a href="/" className="dash-brand" aria-label="Village Mitai home">
            <img
              src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`}
              alt="Village Mitai"
            />
          </a>

          <div className="dash-heading">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          {actions && <div className="dash-actions">{actions}</div>}
        </div>
      </header>

      <main className="dash-main">{children}</main>
    </div>
  );
}
