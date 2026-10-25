import { Navigate } from 'react-router-dom';
import { getStaffRole } from './utils/staffAuth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const userRole = getStaffRole();
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
};

export default ProtectedRoute;