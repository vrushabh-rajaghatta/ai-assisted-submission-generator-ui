import React, { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { LockReset as LockResetIcon } from "@mui/icons-material";

import apiService from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

const ChangePasswordPage: React.FC = () => {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();

  const isForced = Boolean(user?.must_change_password);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const newPasswordTooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const sameAsCurrent =
    newPassword.length > 0 && newPassword === currentPassword;

  const canSubmit =
    !submitting &&
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !sameAsCurrent;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiService.changePassword(currentPassword, newPassword);
      await refresh();
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Send the user to the dashboard after a short success state.
      setTimeout(() => navigate("/dashboard", { replace: true }), 600);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to change password",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="flex-start"
      minHeight="100vh"
      sx={{ pt: { xs: 4, md: 8 }, backgroundColor: "background.default" }}
    >
      <Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 480 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
          <LockResetIcon color="primary" />
          <Typography variant="h5" component="h1">
            {isForced ? "Set a new password" : "Change password"}
          </Typography>
        </Stack>

        {isForced && (
          <Alert severity="info" sx={{ mb: 2 }}>
            For security, you must change your password before using the
            application.
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Password updated. Redirecting…
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <TextField
            label={isForced ? "Temporary password" : "Current password"}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoFocus
            autoComplete="current-password"
            disabled={submitting}
          />
          <TextField
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={submitting}
            error={newPasswordTooShort || sameAsCurrent}
            helperText={
              sameAsCurrent
                ? "New password must be different from the current one"
                : newPasswordTooShort
                  ? "At least 8 characters"
                  : "At least 8 characters"
            }
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={submitting}
            error={mismatch}
            helperText={mismatch ? "Passwords do not match" : " "}
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {isForced ? (
              <Button onClick={logout} disabled={submitting} color="inherit">
                Sign out
              </Button>
            ) : (
              <Button
                onClick={() => navigate(-1)}
                disabled={submitting}
                color="inherit"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={!canSubmit}
              startIcon={
                submitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
            >
              {submitting ? "Saving…" : "Update password"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChangePasswordPage;
