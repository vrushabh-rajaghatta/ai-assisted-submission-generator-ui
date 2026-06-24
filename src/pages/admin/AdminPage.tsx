import React, { useCallback, useEffect, useState } from "react";
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
  IconButton,
  Paper,
  Stack,
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
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";

import apiService from "../../services/api";

interface Organization {
  id: string;
  name: string;
}

const PLATFORM_ORG_NAME = "__platform__";

const AdminPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.listOrganizations();
      setOrganizations(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to load organizations",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    const name = newOrgName.trim();
    if (!name) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiService.createOrganization(name);
      setNewOrgName("");
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to create organization",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
    setNewOrgName("");
    setSubmitError(null);
  };

  const visibleOrgs = organizations.filter((o) => o.name !== PLATFORM_ORG_NAME);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <AdminIcon color="primary" />
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Platform Administration
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
          onClick={() => setDialogOpen(true)}
        >
          Add Organization
        </Button>
      </Stack>

      <Typography variant="h6" gutterBottom>
        Organizations
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Customers using the platform. The internal "{PLATFORM_ORG_NAME}" org is
        hidden.
      </Typography>

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
        ) : visibleOrgs.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No organizations yet. Click <strong>Add Organization</strong> to
              create the first one.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell sx={{ width: 320 }}>ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleOrgs.map((org) => (
                  <TableRow key={org.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {org.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={org.id}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: "monospace" }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add Organization</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Organization name"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            disabled={submitting}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newOrgName.trim() && !submitting) {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!newOrgName.trim() || submitting}
          >
            {submitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Create"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPage;
