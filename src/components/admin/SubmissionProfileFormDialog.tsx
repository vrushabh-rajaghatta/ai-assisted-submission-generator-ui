import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import apiService from "../../services/api";
import {
  RegConfigurationProfile,
  RegConfigurationType,
  RegSubmissionProfileDetail,
} from "../../types";

interface SubmissionProfileFormDialogProps {
  open: boolean;
  submissionTypeId: string;
  // When editing, the existing profile id; null when creating.
  profileId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

// The four configuration dimensions, each backed by a ConfigurationType code.
const DIMENSIONS = [
  { key: "export_profile_id", label: "Export Profile", typeCode: "EXPORT" },
  { key: "workflow_profile_id", label: "Workflow Profile", typeCode: "WORKFLOW" },
  {
    key: "validation_profile_id",
    label: "Validation Profile",
    typeCode: "VALIDATION",
  },
  {
    key: "ai_pipeline_profile_id",
    label: "AI Pipeline Profile",
    typeCode: "AI_PIPELINE",
  },
] as const;

type DimensionKey = (typeof DIMENSIONS)[number]["key"];

interface FormState {
  name: string;
  code: string;
  description: string;
  export_profile_id: string;
  workflow_profile_id: string;
  validation_profile_id: string;
  ai_pipeline_profile_id: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  name: "",
  code: "",
  description: "",
  export_profile_id: "",
  workflow_profile_id: "",
  validation_profile_id: "",
  ai_pipeline_profile_id: "",
  is_active: true,
};

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <>
    <Divider sx={{ my: 1 }} />
    <Typography variant="overline" color="text.secondary">
      {children}
    </Typography>
  </>
);

const SubmissionProfileFormDialog: React.FC<SubmissionProfileFormDialogProps> = ({
  open,
  submissionTypeId,
  profileId,
  onClose,
  onSaved,
}) => {
  const isEdit = Boolean(profileId);
  const [form, setForm] = useState<FormState>(EMPTY);
  // Configuration profile options per dimension type code.
  const [optionsByType, setOptionsByType] = useState<
    Record<string, RegConfigurationProfile[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // Load configuration types, then the active profiles for each dimension.
        const types = await apiService.getAllConfigurationTypes();
        const byCode: Record<string, RegConfigurationType | undefined> = {};
        types.forEach((t) => {
          byCode[t.code] = t;
        });

        const entries = await Promise.all(
          DIMENSIONS.map(async (d) => {
            const type = byCode[d.typeCode];
            const opts = type
              ? await apiService.getConfigurationProfilesByType(type.id)
              : [];
            return [d.typeCode, opts] as const;
          }),
        );
        if (cancelled) return;
        setOptionsByType(Object.fromEntries(entries));

        if (profileId) {
          const p = await apiService.getSubmissionProfile(profileId);
          if (cancelled) return;
          setForm({
            name: p.name ?? "",
            code: p.code ?? "",
            description: p.description ?? "",
            export_profile_id: p.export_profile_id ?? "",
            workflow_profile_id: p.workflow_profile_id ?? "",
            validation_profile_id: p.validation_profile_id ?? "",
            ai_pipeline_profile_id: p.ai_pipeline_profile_id ?? "",
            is_active: p.is_active,
          });
        } else {
          setForm(EMPTY);
        }
      } catch (e: any) {
        if (!cancelled)
          setError(e.response?.data?.detail || "Failed to load profile data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, profileId]);

  const set = (key: keyof FormState, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and Code are required.");
      return;
    }

    const payload: any = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      export_profile_id: form.export_profile_id || null,
      workflow_profile_id: form.workflow_profile_id || null,
      validation_profile_id: form.validation_profile_id || null,
      ai_pipeline_profile_id: form.ai_pipeline_profile_id || null,
      is_active: form.is_active,
    };

    setSaving(true);
    try {
      if (isEdit && profileId) {
        await apiService.updateSubmissionProfile(profileId, payload);
      } else {
        await apiService.createSubmissionProfile({
          ...payload,
          submission_type_id: submissionTypeId,
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const renderDimension = (d: (typeof DIMENSIONS)[number]) => {
    const opts = optionsByType[d.typeCode] ?? [];
    const value = form[d.key as DimensionKey] as string;
    return (
      <FormControl fullWidth key={d.key}>
        <InputLabel>{d.label}</InputLabel>
        <Select
          value={value}
          label={d.label}
          onChange={(e) => set(d.key as keyof FormState, e.target.value)}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {opts.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.name}
              {o.version ? ` (v${o.version})` : ""}
            </MenuItem>
          ))}
        </Select>
        {opts.length === 0 && (
          <FormHelperText>
            No active {d.typeCode} profiles — create them in the Configuration
            Registry.
          </FormHelperText>
        )}
      </FormControl>
    );
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit ? "Edit Submission Profile" : "New Submission Profile"}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <SectionHeading>General</SectionHeading>
            <TextField
              label="Name"
              required
              fullWidth
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <TextField
              label="Code"
              required
              fullWidth
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />

            <SectionHeading>Configuration Profiles</SectionHeading>
            {DIMENSIONS.map(renderDimension)}

            <SectionHeading>Status</SectionHeading>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                />
              }
              label="Active"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Profile"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubmissionProfileFormDialog;
