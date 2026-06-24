import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";

interface RequireAuthProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

const RequireAuth: React.FC<RequireAuthProps> = ({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force first-login / post-reset password change. Allow users to reach the
  // change-password screen itself; everything else redirects there.
  if (user.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (requireSuperAdmin && !user.is_super_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin && !user.is_admin && !user.is_super_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
