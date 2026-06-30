import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
} from "@mui/material";
import apiService from "../../services/api";
import { RegConfigurationType } from "../../types";

interface ConfigurationTypeFormDialogProps {
  open: boolean;
  // The type being edited, or null when creating.
  configurationType: RegConfigurationType | null;
  onClose: () => void;
  onSaved: () => void;
}

const ConfigurationTypeFormDialog: React.FC<ConfigurationTypeFormDialogProps> = ({
  open,
  configurationType,
  onClose,
  onSaved,
}) => {
  const isEdit = Boolean(configurationType);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCode(configurationType?.code ?? "");
    setName(configurationType?.name ?? "");
    setDescription(configurationType?.description ?? "");
    setIsActive(configurationType?.is_active ?? true);
  }, [open, configurationType]);

  const handleSave = async () => {
    setError(null);
    if (!code.trim() || !name.trim()) {
      setError("Code and Name are required.");
      return;
    }
    const payload = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
    };
    setSaving(true);
    try {
      if (isEdit && configurationType) {
        await apiService.updateConfigurationType(configurationType.id, payload);
      } else {
        await apiService.createConfigurationType(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to save configuration type");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? "Edit Configuration Type" : "New Configuration Type"}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Code"
            required
            fullWidth
            placeholder="EXPORT"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            helperText="Unique identifier, e.g. EXPORT, WORKFLOW, VALIDATION, AI_PIPELINE"
          />
          <TextField
            label="Name"
            required
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            }
            label="Active"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Type"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfigurationTypeFormDialog;
