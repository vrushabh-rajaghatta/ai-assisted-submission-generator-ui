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
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from "@mui/material";
import apiService from "../../services/api";
import { RegConfigurationProfileDetail, RegConfigurationType } from "../../types";

interface ConfigurationProfileFormDialogProps {
  open: boolean;
  configurationTypes: RegConfigurationType[];
  // When editing, the existing profile id; null when creating.
  profileId: string | null;
  // Optional prefilled values for create mode (used by Duplicate / Clone version).
  seed?: Partial<RegConfigurationProfileDetail> | null;
  // Title override for seeded create modes.
  titleOverride?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  configuration_type_id: string;
  name: string;
  code: string;
  description: string;
  version: string;
  configuration: string; // JSON text
  is_active: boolean;
}

const EMPTY: FormState = {
  configuration_type_id: "",
  name: "",
  code: "",
  description: "",
  version: "",
  configuration: "",
  is_active: true,
};

const toForm = (
  p: Partial<RegConfigurationProfileDetail>,
): FormState => ({
  configuration_type_id: p.configuration_type_id ?? "",
  name: p.name ?? "",
  code: p.code ?? "",
  description: p.description ?? "",
  version: p.version ?? "",
  configuration: p.configuration
    ? JSON.stringify(p.configuration, null, 2)
    : "",
  is_active: p.is_active ?? true,
});

const ConfigurationProfileFormDialog: React.FC<
  ConfigurationProfileFormDialogProps
> = ({
  open,
  configurationTypes,
  profileId,
  seed,
  titleOverride,
  onClose,
  onSaved,
}) => {
  const isEdit = Boolean(profileId);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (profileId) {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const p = await apiService.getConfigurationProfile(profileId);
          if (!cancelled) setForm(toForm(p));
        } catch (e: any) {
          if (!cancelled)
            setError(e.response?.data?.detail || "Failed to load profile");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    // Create mode (optionally seeded for duplicate / clone-version).
    setForm(seed ? toForm(seed) : EMPTY);
  }, [open, profileId, seed]);

  const set = (key: keyof FormState, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setError(null);
    if (!form.configuration_type_id) {
      setError("Configuration Type is required.");
      return;
    }
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and Code are required.");
      return;
    }
    let configuration: Record<string, any> | null = null;
    if (form.configuration.trim()) {
      try {
        configuration = JSON.parse(form.configuration);
      } catch {
        setError("Configuration must be valid JSON.");
        return;
      }
    }

    const payload: any = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      version: form.version.trim() || null,
      configuration,
      is_active: form.is_active,
    };

    setSaving(true);
    try {
      if (isEdit && profileId) {
        await apiService.updateConfigurationProfile(profileId, {
          ...payload,
          configuration_type_id: form.configuration_type_id,
        });
      } else {
        await apiService.createConfigurationProfile({
          ...payload,
          configuration_type_id: form.configuration_type_id,
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

  const title =
    titleOverride ??
    (isEdit ? "Edit Configuration Profile" : "New Configuration Profile");

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
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
            <FormControl fullWidth required>
              <InputLabel>Configuration Type</InputLabel>
              <Select
                value={form.configuration_type_id}
                label="Configuration Type"
                onChange={(e) => set("configuration_type_id", e.target.value)}
              >
                {configurationTypes.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
              label="Version"
              fullWidth
              placeholder="1.0"
              helperText="Code + version must be unique within a configuration type"
              value={form.version}
              onChange={(e) => set("version", e.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
            <TextField
              label="Configuration (JSON)"
              fullWidth
              multiline
              minRows={8}
              placeholder={'{\n  "package": "zip",\n  "compression": true\n}'}
              value={form.configuration}
              onChange={(e) => set("configuration", e.target.value)}
              helperText="Business configuration only — validated as JSON on save"
              sx={{ "& textarea": { fontFamily: "monospace" } }}
            />
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

export default ConfigurationProfileFormDialog;
