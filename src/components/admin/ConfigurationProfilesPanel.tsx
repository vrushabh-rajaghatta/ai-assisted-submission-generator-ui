import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ContentCopy as DuplicateIcon,
  CallSplit as CloneVersionIcon,
} from "@mui/icons-material";

import apiService from "../../services/api";
import {
  RegConfigurationProfile,
  RegConfigurationProfileDetail,
  RegConfigurationType,
} from "../../types";
import ConfigurationProfileFormDialog from "./ConfigurationProfileFormDialog";

// Bump the trailing numeric component of a version label ("1.0" -> "1.1").
const bumpVersion = (v?: string | null): string => {
  if (!v) return "1.1";
  const m = v.match(/^(.*?)(\d+)$/);
  if (m) return `${m[1]}${parseInt(m[2], 10) + 1}`;
  return `${v}.1`;
};

const ConfigurationProfilesPanel: React.FC = () => {
  const [types, setTypes] = useState<RegConfigurationType[]>([]);
  const [profiles, setProfiles] = useState<RegConfigurationProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dialog state.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seed, setSeed] = useState<Partial<RegConfigurationProfileDetail> | null>(
    null,
  );
  const [dialogTitle, setDialogTitle] = useState<string | undefined>(undefined);

  const typeName = (id: string) => {
    const t = types.find((x) => x.id === id);
    return t ? `${t.name}` : "—";
  };

  // Load configuration types once (filter dropdown + form dialog).
  useEffect(() => {
    apiService
      .getAllConfigurationTypes()
      .then(setTypes)
      .catch((e) =>
        setError(e.response?.data?.detail || "Failed to load configuration types"),
      );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items, total: t } = await apiService.getConfigurationProfiles({
        search: search.trim() || undefined,
        configuration_type_id: typeFilter || undefined,
        page: page + 1,
        page_size: rowsPerPage,
      });
      setProfiles(items);
      setTotal(t);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to load configuration profiles");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, page, rowsPerPage]);

  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setSeed(null);
    setDialogTitle(undefined);
    setDialogOpen(true);
  };
  const openEdit = (p: RegConfigurationProfile) => {
    setEditingId(p.id);
    setSeed(null);
    setDialogTitle(undefined);
    setDialogOpen(true);
  };

  // Duplicate: a brand-new sibling profile (new code), same type/version/config.
  const duplicate = async (p: RegConfigurationProfile) => {
    try {
      const detail = await apiService.getConfigurationProfile(p.id);
      setEditingId(null);
      setSeed({ ...detail, code: `${detail.code}-COPY`, is_active: true });
      setDialogTitle("Duplicate Configuration Profile");
      setDialogOpen(true);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to load profile for duplication");
    }
  };

  // Clone as a new version: same code, bumped version, copied configuration.
  const cloneVersion = async (p: RegConfigurationProfile) => {
    try {
      const detail = await apiService.getConfigurationProfile(p.id);
      setEditingId(null);
      setSeed({ ...detail, version: bumpVersion(detail.version), is_active: true });
      setDialogTitle("Clone as New Version");
      setDialogOpen(true);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to load profile for cloning");
    }
  };

  const toggleActive = async (p: RegConfigurationProfile) => {
    try {
      await apiService.updateConfigurationProfile(p.id, { is_active: !p.is_active });
      await load();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to update profile");
    }
  };

  const remove = async (p: RegConfigurationProfile) => {
    if (
      !window.confirm(
        `Delete configuration profile "${p.name}"${p.version ? ` (v${p.version})` : ""}?`,
      )
    )
      return;
    try {
      await apiService.deleteConfigurationProfile(p.id);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to delete profile");
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ sm: "center" }}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          placeholder="Search by name or code"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          sx={{ flexGrow: 1, maxWidth: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Filter by Configuration Type</InputLabel>
          <Select
            value={typeFilter}
            label="Filter by Configuration Type"
            onChange={(e) => {
              setPage(0);
              setTypeFilter(e.target.value);
            }}
          >
            <MenuItem value="">
              <em>All types</em>
            </MenuItem>
            {types.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name} ({t.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Profile
        </Button>
      </Stack>

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? "Loading…" : "No configuration profiles found."}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      <Chip label={p.code} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{typeName(p.configuration_type_id)}</TableCell>
                    <TableCell>{p.version || "—"}</TableCell>
                    <TableCell>
                      <Tooltip title={p.is_active ? "Disable" : "Enable"}>
                        <Switch
                          size="small"
                          checked={p.is_active}
                          onChange={() => toggleActive(p)}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton size="small" onClick={() => duplicate(p)}>
                          <DuplicateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Clone as new version">
                        <IconButton size="small" onClick={() => cloneVersion(p)}>
                          <CloneVersionIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => remove(p)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      {dialogOpen && (
        <ConfigurationProfileFormDialog
          open={dialogOpen}
          configurationTypes={types}
          profileId={editingId}
          seed={seed}
          titleOverride={dialogTitle}
          onClose={() => setDialogOpen(false)}
          onSaved={load}
        />
      )}
    </Box>
  );
};

export default ConfigurationProfilesPanel;
