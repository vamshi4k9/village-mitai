import "../styles/StaticPages.css";
import useAgentId from "./useAgentId";

// Shown for any address that is not one of the app's routes.
const NotFound = () => {
  const { getUrlWithAgentId } = useAgentId();

  return (
    <div className="static-page">
      <header className="static-hero not-found">
        <span className="static-eyebrow">Error 404</span>
        <h1 className="page-title">Page Not Found</h1>
        <p className="static-lead">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>

        <div className="not-found-actions">
          <a href={getUrlWithAgentId("/")} className="static-btn">
            <i className="bi bi-house" aria-hidden="true"></i>
            Go to Home
          </a>
          <a href={getUrlWithAgentId("/items")} className="static-btn secondary">
            Shop All Items
          </a>
        </div>
      </header>
    </div>
  );
};

export default NotFound;
