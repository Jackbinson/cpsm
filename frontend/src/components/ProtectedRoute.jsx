import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  // Nếu không có token, chuyển hướng về login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có token, hiển thị component
  return children;
};

export default ProtectedRoute;
