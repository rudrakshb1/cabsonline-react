import { NavLink } from 'react-router-dom';

/**
 * Layout component - wraps all pages with a persistent navbar.
 */
export default function Layout({ children }) {
  return (
    <div className="layout">
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">
          <div className="logo-icon">🚕</div>
          <span>CabsOnline</span>
        </NavLink>
        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Book</NavLink>
          <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>Admin</NavLink>
          <NavLink to="/drivers" className={({ isActive }) => isActive ? 'active' : ''}>Drivers</NavLink>
          <NavLink to="/track" className={({ isActive }) => isActive ? 'active' : ''}>Track</NavLink>
          <NavLink to="/payment" className={({ isActive }) => isActive ? 'active' : ''}>Payment</NavLink>
        </div>
      </nav>
      <main className="page-content">{children}</main>
    </div>
  );
}
