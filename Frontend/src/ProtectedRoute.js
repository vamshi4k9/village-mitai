import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const userRole = localStorage.getItem('user_role');
  console.log('User Role:', userRole, 'Allowed Roles:', allowedRoles);
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
};

export default ProtectedRoute;