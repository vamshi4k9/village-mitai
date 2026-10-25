import "../styles/Dashboard.css";
import { getStaffToken, getStaffUser, staffLogout } from "../utils/staffAuth";

// Page frame for the staff and agent pages, which are shown without the site
// header: a sticky top bar (logo, title, action buttons) above the content.
export default function DashboardShell({ title, subtitle, actions, children }) {
  const loggedIn = !!getStaffToken();
  const user = getStaffUser();
  const name = user ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username : "";

  return (
    <div className="dash-page">
      <header className="dash-topbar">
        <div className="dash-topbar-inner">
          {/* staff and agent pages start from the catalogue, not the shop */}
          <a href="/catalogue" className="dash-brand" aria-label="Catalogue of staff pages">
            <img
              src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`}
              alt="Village Mitai"
            />
          </a>

          <div className="dash-heading">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          {(actions || loggedIn) && (
            <div className="dash-actions">
              {actions}
              {loggedIn && (
                <button
                  type="button"
                  className="dash-btn dash-logout"
                  onClick={staffLogout}
                  title={name ? `Logged in as ${name}${user?.role ? ` (${user.role})` : ""}` : "Log out"}
                >
                  <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
                  <span>Log out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="dash-main">{children}</main>
    </div>
  );
}
