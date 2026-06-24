import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  PersonOff as DeactivateIcon,
  LockReset as LockResetIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";

import apiService from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

interface Organization {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  username: string;
  full_name: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
  is_active: boolean;
  must_change_password?: boolean;
  organization_id: string;
  organization?: Organization | null;
}

const PLATFORM_ORG_NAME = "__platform__";
const ALL_ORGS = "__all__";

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = Boolean(currentUser?.is_super_admin);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState<string>(ALL_ORGS);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    is_admin: false,
    organization_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [pendingDeactivate, setPendingDeactivate] = useState<UserRow | null>(
    null,
  );
  const [deactivating, setDeactivating] = useState(false);

  const [pendingReset, setPendingReset] = useState<UserRow | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{
    username: string;
    temporary_password: string;
  } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const visibleOrgs = useMemo(
    () => organizations.filter((o) => o.name !== PLATFORM_ORG_NAME),
    [organizations],
  );

  const orgById = useMemo(() => {
    const map = new Map<string, Organization>();
    organizations.forEach((o) => map.set(o.id, o));
    return map;
  }, [organizations]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSuperAdmin) {
        const [orgsData, usersData] = await Promise.all([
          apiService.listOrganizations(),
          apiService.listAllUsers(
            orgFilter !== ALL_ORGS ? orgFilter : undefined,
          ),
        ]);
        setOrganizations(orgsData);
        setUsers(usersData);
      } else {
        const usersData = await apiService.listOrganizationUsers();
        setUsers(usersData);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err?.message || "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, orgFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreateDialog = () => {
    setForm({
      username: "",
      password: "",
      full_name: "",
      is_admin: false,
      organization_id:
        isSuperAdmin && visibleOrgs.length > 0 ? visibleOrgs[0].id : "",
    });
    setSubmitError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
    setSubmitError(null);
  };

  const handleCreate = async () => {
    const username = form.username.trim();
    if (!username || form.password.length < 8) return;
    if (isSuperAdmin && !form.organization_id) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (isSuperAdmin) {
        await apiService.createUserInOrganization({
          organization_id: form.organization_id,
          username,
          password: form.password,
          full_name: form.full_name.trim() || undefined,
          is_admin: form.is_admin,
        });
      } else {
        await apiService.createOrganizationUser({
          username,
          password: form.password,
          full_name: form.full_name.trim() || undefined,
          is_admin: form.is_admin,
        });
      }
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.detail || err?.message || "Failed to create user",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!pendingDeactivate) return;
    setDeactivating(true);
    try {
      if (isSuperAdmin) {
        await apiService.deactivateAnyUser(pendingDeactivate.id);
      } else {
        await apiService.deactivateOrganizationUser(pendingDeactivate.id);
      }
      setPendingDeactivate(null);
      await load();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to deactivate user",
      );
    } finally {
      setDeactivating(false);
    }
  };

  const confirmReset = async () => {
    if (!pendingReset) return;
    setResetting(true);
    try {
      const result = isSuperAdmin
        ? await apiService.resetAnyUserPassword(pendingReset.id)
        : await apiService.resetOrganizationUserPassword(pendingReset.id);
      setPendingReset(null);
      setResetResult({
        username: result.username,
        temporary_password: result.temporary_password,
      });
      setCopyState("idle");
      await load();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to reset password",
      );
      setPendingReset(null);
    } finally {
      setResetting(false);
    }
  };

  const handleCopyTempPassword = async () => {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.temporary_password);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      // Clipboard API can fail (insecure context). Ignore silently; user can
      // still select the text manually.
    }
  };

  const renderOrgName = (row: UserRow) => {
    if (row.organization?.name) return row.organization.name;
    const org = orgById.get(row.organization_id);
    return org?.name || row.organization_id;
  };

  const canSubmit =
    form.username.trim().length > 0 &&
    form.password.length >= 8 &&
    (!isSuperAdmin || Boolean(form.organization_id));

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <PeopleIcon color="primary" />
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Users
        </Typography>
        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={load} disabled={loading} aria-label="refresh">
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Add User
        </Button>
      </Stack>

      {isSuperAdmin && (
        <Stack direction="row" spacing={2} mb={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="org-filter-label">Organization</InputLabel>
            <Select
              labelId="org-filter-label"
              label="Organization"
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
            >
              <MenuItem value={ALL_ORGS}>All organizations</MenuItem>
              {visibleOrgs.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={160}
          >
            <CircularProgress />
          </Box>
        ) : users.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No users yet. Click <strong>Add User</strong> to create one.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Full name</TableCell>
                  {isSuperAdmin && <TableCell>Organization</TableCell>}
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((row) => {
                  const isSelf = row.id === currentUser?.id;
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {row.username}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.full_name || "—"}</TableCell>
                      {isSuperAdmin && (
                        <TableCell>{renderOrgName(row)}</TableCell>
                      )}
                      <TableCell>
                        {row.is_super_admin ? (
                          <Chip
                            label="super admin"
                            size="small"
                            color="secondary"
                          />
                        ) : row.is_admin ? (
                          <Chip label="admin" size="small" color="primary" />
                        ) : (
                          <Chip label="user" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        {row.is_active ? (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            <Chip
                              label="active"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                            {row.must_change_password && (
                              <Chip
                                label="must change password"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        ) : (
                          <Chip
                            label="inactive"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip
                          title={
                            row.is_super_admin && !isSuperAdmin
                              ? "Super admins must reset their own password"
                              : isSelf
                                ? "Use Change password to reset your own"
                                : !row.is_active
                                  ? "User is inactive"
                                  : "Reset password"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              disabled={
                                isSelf ||
                                !row.is_active ||
                                (row.is_super_admin && !isSuperAdmin)
                              }
                              onClick={() => setPendingReset(row)}
                              aria-label="reset password"
                            >
                              <LockResetIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            isSelf
                              ? "You cannot deactivate yourself"
                              : !row.is_active
                                ? "Already inactive"
                                : "Deactivate user"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              disabled={isSelf || !row.is_active}
                              onClick={() => setPendingDeactivate(row)}
                              aria-label="deactivate"
                            >
                              <DeactivateIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Create User dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add User</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="Username"
              helperText="Any string. Examples: jdoe, admin@company.com"
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              disabled={submitting}
            />
            <TextField
              fullWidth
              label="Full name"
              value={form.full_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
              disabled={submitting}
            />
            <TextField
              fullWidth
              type="password"
              label="Password"
              helperText="At least 8 characters"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              disabled={submitting}
            />
            {isSuperAdmin ? (
              <FormControl fullWidth>
                <InputLabel id="org-select-label">Organization</InputLabel>
                <Select
                  labelId="org-select-label"
                  label="Organization"
                  value={form.organization_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      organization_id: e.target.value as string,
                    }))
                  }
                  disabled={submitting}
                >
                  {visibleOrgs.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                fullWidth
                label="Organization"
                value={currentUser?.organization?.name || ""}
                disabled
                helperText="New users are added to your organization"
              />
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_admin}
                  onChange={(_, checked) =>
                    setForm((f) => ({ ...f, is_admin: checked }))
                  }
                  disabled={submitting}
                />
              }
              label="Organization admin"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Create"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate confirm */}
      <Dialog
        open={Boolean(pendingDeactivate)}
        onClose={() => !deactivating && setPendingDeactivate(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Deactivate user?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            <strong>{pendingDeactivate?.username}</strong> will no longer be
            able to log in. This is a soft delete and can be reversed in the
            database.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPendingDeactivate(null)}
            disabled={deactivating}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeactivate}
            color="error"
            variant="contained"
            disabled={deactivating}
          >
            {deactivating ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Deactivate"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset password confirm */}
      <Dialog
        open={Boolean(pendingReset)}
        onClose={() => !resetting && setPendingReset(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reset password?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            A new temporary password will be generated for{" "}
            <strong>{pendingReset?.username}</strong>. They will be required to
            change it on their next sign-in. Their current password will stop
            working immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingReset(null)} disabled={resetting}>
            Cancel
          </Button>
          <Button
            onClick={confirmReset}
            variant="contained"
            disabled={resetting}
          >
            {resetting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Reset password"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset password result */}
      <Dialog
        open={Boolean(resetResult)}
        onClose={() => setResetResult(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Temporary password</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This password is shown only once. Copy it now and share it securely
            with the user.
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            User: <strong>{resetResult?.username}</strong>
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              fontFamily: "monospace",
              backgroundColor: "action.hover",
            }}
          >
            <Box sx={{ flexGrow: 1, wordBreak: "break-all" }}>
              {resetResult?.temporary_password}
            </Box>
            <Tooltip title={copyState === "copied" ? "Copied" : "Copy"}>
              <IconButton
                size="small"
                onClick={handleCopyTempPassword}
                aria-label="copy temporary password"
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetResult(null)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
