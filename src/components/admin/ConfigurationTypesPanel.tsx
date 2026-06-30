import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
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
} from "@mui/icons-material";

import apiService from "../../services/api";
import { RegConfigurationType } from "../../types";
import ConfigurationTypeFormDialog from "./ConfigurationTypeFormDialog";

const ConfigurationTypesPanel: React.FC = () => {
  const [types, setTypes] = useState<RegConfigurationType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RegConfigurationType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items, total: t } = await apiService.getConfigurationTypes({
        search: search.trim() || undefined,
        page: page + 1,
        page_size: rowsPerPage,
      });
      setTypes(items);
      setTotal(t);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to load configuration types");
    } finally {
      setLoading(false);
    }
  }, [search, page, rowsPerPage]);

  // Debounce search; reload on page/size change.
  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (t: RegConfigurationType) => {
    setEditing(t);
    setDialogOpen(true);
  };
  const toggleActive = async (t: RegConfigurationType) => {
    try {
      await apiService.updateConfigurationType(t.id, { is_active: !t.is_active });
      await load();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to update configuration type");
    }
  };
  const remove = async (t: RegConfigurationType) => {
    if (
      !window.confirm(
        `Delete configuration type "${t.name}"? This also deletes its configuration profiles.`,
      )
    )
      return;
    try {
      await apiService.deleteConfigurationType(t.id);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to delete configuration type");
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
          sx={{ flexGrow: 1, maxWidth: 360 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Type
        </Button>
      </Stack>

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Profiles</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {types.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? "Loading…" : "No configuration types found."}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                types.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>
                      <Chip label={t.code} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 320,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.description || "—"}
                    </TableCell>
                    <TableCell>{t.profiles_count ?? "—"}</TableCell>
                    <TableCell>
                      <Tooltip title={t.is_active ? "Disable" : "Enable"}>
                        <Switch
                          size="small"
                          checked={t.is_active}
                          onChange={() => toggleActive(t)}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(t)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => remove(t)}>
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
        <ConfigurationTypeFormDialog
          open={dialogOpen}
          configurationType={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={load}
        />
      )}
    </Box>
  );
};

export default ConfigurationTypesPanel;
