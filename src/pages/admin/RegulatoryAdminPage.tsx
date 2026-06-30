import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AccountTree as TreeIcon,
} from "@mui/icons-material";

import apiService from "../../services/api";
import {
  RegCountry,
  RegAuthority,
  RegIndustry,
  RegRegulation,
  RegSubmissionType,
  RegSubmissionProfile,
  RegTemplateVersion,
} from "../../types";
import SubmissionProfileFormDialog from "../../components/admin/SubmissionProfileFormDialog";
import TemplateVersionFormDialog from "../../components/admin/TemplateVersionFormDialog";

const RegulatoryAdminPage: React.FC = () => {
  // Cascade option lists.
  const [countries, setCountries] = useState<RegCountry[]>([]);
  const [authorities, setAuthorities] = useState<RegAuthority[]>([]);
  const [industries, setIndustries] = useState<RegIndustry[]>([]);
  const [regulations, setRegulations] = useState<RegRegulation[]>([]);
  const [submissionTypes, setSubmissionTypes] = useState<RegSubmissionType[]>([]);

  // Cascade selections.
  const [countryId, setCountryId] = useState("");
  const [authorityId, setAuthorityId] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [regulationId, setRegulationId] = useState("");
  const [submissionTypeId, setSubmissionTypeId] = useState("");

  // Children.
  const [profiles, setProfiles] = useState<RegSubmissionProfile[]>([]);
  const [selectedProfile, setSelectedProfile] =
    useState<RegSubmissionProfile | null>(null);
  const [templateVersions, setTemplateVersions] = useState<
    RegTemplateVersion[]
  >([]);

  const [error, setError] = useState<string | null>(null);

  // Dialog state.
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [tvDialogOpen, setTvDialogOpen] = useState(false);
  const [editingTv, setEditingTv] = useState<RegTemplateVersion | null>(null);

  const safe = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Request failed");
      return undefined;
    }
  };

  // Initial load: countries + industries (industries are global master data).
  useEffect(() => {
    (async () => {
      const [c, i] = await Promise.all([
        apiService.getRegulatoryCountries(),
        apiService.getRegulatoryIndustries(),
      ]);
      setCountries(c);
      setIndustries(i);
    })().catch(() =>
      setError("Failed to load regulatory reference data"),
    );
  }, []);

  // Cascade resets + loads.
  const onCountry = async (id: string) => {
    setCountryId(id);
    setAuthorityId("");
    setRegulationId("");
    setSubmissionTypeId("");
    setAuthorities([]);
    setRegulations([]);
    setSubmissionTypes([]);
    resetChildren();
    if (id) setAuthorities((await safe(() => apiService.getRegulatoryAuthorities(id))) ?? []);
  };

  const onAuthority = async (id: string) => {
    setAuthorityId(id);
    setRegulationId("");
    setSubmissionTypeId("");
    setRegulations([]);
    setSubmissionTypes([]);
    resetChildren();
    await loadRegulations(id, industryId);
  };

  const onIndustry = async (id: string) => {
    setIndustryId(id);
    setRegulationId("");
    setSubmissionTypeId("");
    setRegulations([]);
    setSubmissionTypes([]);
    resetChildren();
    await loadRegulations(authorityId, id);
  };

  const loadRegulations = async (authId: string, indId: string) => {
    if (authId && indId) {
      setRegulations(
        (await safe(() => apiService.getRegulatoryRegulations(authId, indId))) ?? [],
      );
    }
  };

  const onRegulation = async (id: string) => {
    setRegulationId(id);
    setSubmissionTypeId("");
    setSubmissionTypes([]);
    resetChildren();
    if (id)
      setSubmissionTypes(
        (await safe(() => apiService.getRegulatorySubmissionTypes(id))) ?? [],
      );
  };

  const onSubmissionType = async (id: string) => {
    setSubmissionTypeId(id);
    resetChildren();
    if (id) await loadProfiles(id);
  };

  const resetChildren = () => {
    setProfiles([]);
    setSelectedProfile(null);
    setTemplateVersions([]);
  };

  const loadProfiles = useCallback(async (typeId: string) => {
    setProfiles(
      (await safe(() => apiService.getRegulatorySubmissionProfiles(typeId))) ?? [],
    );
  }, []);

  const loadTemplateVersions = useCallback(async (profileId: string) => {
    setTemplateVersions(
      (await safe(() => apiService.getProfileTemplateVersions(profileId))) ?? [],
    );
  }, []);

  const selectProfile = async (p: RegSubmissionProfile) => {
    setSelectedProfile(p);
    await loadTemplateVersions(p.id);
  };

  // Profile CRUD handlers.
  const openCreateProfile = () => {
    setEditingProfileId(null);
    setProfileDialogOpen(true);
  };
  const openEditProfile = (id: string) => {
    setEditingProfileId(id);
    setProfileDialogOpen(true);
  };
  const onProfileSaved = async () => {
    if (submissionTypeId) await loadProfiles(submissionTypeId);
    if (selectedProfile) await loadTemplateVersions(selectedProfile.id);
  };
  const deleteProfile = async (p: RegSubmissionProfile) => {
    if (!window.confirm(`Delete submission profile "${p.name}"? This also removes its template versions.`)) return;
    await safe(() => apiService.deleteSubmissionProfile(p.id));
    if (selectedProfile?.id === p.id) {
      setSelectedProfile(null);
      setTemplateVersions([]);
    }
    if (submissionTypeId) await loadProfiles(submissionTypeId);
  };

  // Template version CRUD handlers.
  const openCreateTv = () => {
    setEditingTv(null);
    setTvDialogOpen(true);
  };
  const openEditTv = (tv: RegTemplateVersion) => {
    setEditingTv(tv);
    setTvDialogOpen(true);
  };
  const onTvSaved = async () => {
    if (selectedProfile) await loadTemplateVersions(selectedProfile.id);
  };
  const deleteTv = async (tv: RegTemplateVersion) => {
    if (!window.confirm(`Delete template version "${tv.version}"?`)) return;
    await safe(() => apiService.deleteTemplateVersion(tv.id));
    if (selectedProfile) await loadTemplateVersions(selectedProfile.id);
  };
  const setLatestTv = async (tv: RegTemplateVersion) => {
    await safe(() => apiService.setLatestTemplateVersion(tv.id));
    if (selectedProfile) await loadTemplateVersions(selectedProfile.id);
  };

  const renderSelect = (
    label: string,
    value: string,
    options: { id: string; primary: string; secondary?: string }[],
    onChange: (id: string) => void,
    disabled = false,
  ) => (
    <FormControl fullWidth size="small" disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <MenuItem key={o.id} value={o.id}>
            {o.primary}
            {o.secondary ? ` (${o.secondary})` : ""}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <TreeIcon color="primary" />
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Regulatory Configuration
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Cascade navigation */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Navigate the regulatory hierarchy
        </Typography>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ flexWrap: "wrap" }}
        >
          {renderSelect(
            "Country",
            countryId,
            countries.map((c) => ({ id: c.id, primary: c.name, secondary: c.code })),
            onCountry,
          )}
          {renderSelect(
            "Authority",
            authorityId,
            authorities.map((a) => ({ id: a.id, primary: a.name, secondary: a.abbreviation || undefined })),
            onAuthority,
            !countryId,
          )}
          {renderSelect(
            "Industry",
            industryId,
            industries.map((i) => ({ id: i.id, primary: i.name, secondary: i.code })),
            onIndustry,
            !authorityId,
          )}
          {renderSelect(
            "Regulation",
            regulationId,
            regulations.map((r) => ({ id: r.id, primary: r.name, secondary: r.code })),
            onRegulation,
            !authorityId || !industryId,
          )}
          {renderSelect(
            "Submission Type",
            submissionTypeId,
            submissionTypes.map((s) => ({ id: s.id, primary: s.name, secondary: s.code })),
            onSubmissionType,
            !regulationId,
          )}
        </Stack>
      </Paper>

      {/* Submission Profiles */}
      {submissionTypeId && (
        <Paper variant="outlined" sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Submission Profiles
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={openCreateProfile}
            >
              Add Profile
            </Button>
          </Stack>
          {profiles.length === 0 ? (
            <Box p={3} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                No submission profiles yet for this submission type.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow
                      key={p.id}
                      hover
                      selected={selectedProfile?.id === p.id}
                      sx={{ cursor: "pointer" }}
                      onClick={() => selectProfile(p)}
                    >
                      <TableCell>{p.name}</TableCell>
                      <TableCell>
                        <Chip label={p.code} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={p.is_active ? "Active" : "Inactive"}
                          size="small"
                          color={p.is_active ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditProfile(p.id)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => deleteProfile(p)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Template Versions (children of selected profile) */}
      {selectedProfile && (
        <Paper variant="outlined">
          <Stack direction="row" alignItems="center" sx={{ p: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">Template Versions</Typography>
              <Typography variant="body2" color="text.secondary">
                Child records of profile{" "}
                <strong>{selectedProfile.name}</strong>
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={openCreateTv}
            >
              Add Version
            </Button>
          </Stack>
          {templateVersions.length === 0 ? (
            <Box p={3} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                No template versions yet for this profile.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Version</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Effective</TableCell>
                    <TableCell>Latest</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templateVersions.map((tv) => (
                    <TableRow key={tv.id} hover>
                      <TableCell>{tv.version}</TableCell>
                      <TableCell>
                        <Chip
                          label={tv.status}
                          size="small"
                          color={tv.status === "Active" ? "primary" : "default"}
                        />
                      </TableCell>
                      <TableCell>{tv.effective_date || "—"}</TableCell>
                      <TableCell>
                        <Tooltip title={tv.is_latest ? "Latest" : "Set as latest"}>
                          <IconButton size="small" onClick={() => setLatestTv(tv)}>
                            {tv.is_latest ? (
                              <StarIcon fontSize="small" color="warning" />
                            ) : (
                              <StarBorderIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditTv(tv)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => deleteTv(tv)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Dialogs */}
      {profileDialogOpen && (
        <SubmissionProfileFormDialog
          open={profileDialogOpen}
          submissionTypeId={submissionTypeId}
          profileId={editingProfileId}
          onClose={() => setProfileDialogOpen(false)}
          onSaved={onProfileSaved}
        />
      )}
      {tvDialogOpen && selectedProfile && (
        <TemplateVersionFormDialog
          open={tvDialogOpen}
          submissionProfileId={selectedProfile.id}
          templateVersion={editingTv}
          onClose={() => setTvDialogOpen(false)}
          onSaved={onTvSaved}
        />
      )}
    </Box>
  );
};

export default RegulatoryAdminPage;
