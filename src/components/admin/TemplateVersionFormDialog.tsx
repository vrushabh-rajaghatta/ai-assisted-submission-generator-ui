import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import { RegTemplateVersion } from "../../types";

interface TemplateVersionFormDialogProps {
  open: boolean;
  submissionProfileId: string;
  // The version being edited, or null when creating.
  templateVersion: RegTemplateVersion | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES = ["Draft", "Active", "Deprecated"];

const TemplateVersionFormDialog: React.FC<TemplateVersionFormDialogProps> = ({
  open,
  submissionProfileId,
  templateVersion,
  onClose,
  onSaved,
}) => {
  const isEdit = Boolean(templateVersion);
  const [version, setVersion] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [statusValue, setStatusValue] = useState("Draft");
  const [isLatest, setIsLatest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setVersion(templateVersion?.version ?? "");
    setEffectiveDate(templateVersion?.effective_date ?? "");
    setExpiryDate(templateVersion?.expiry_date ?? "");
    setReleaseNotes(templateVersion?.release_notes ?? "");
    setStatusValue(templateVersion?.status ?? "Draft");
    setIsLatest(templateVersion?.is_latest ?? false);
  }, [open, templateVersion]);

  const handleSave = async () => {
    setError(null);
    if (!version.trim()) {
      setError("Version is required.");
      return;
    }
    const payload: any = {
      version: version.trim(),
      effective_date: effectiveDate || null,
      expiry_date: expiryDate || null,
      release_notes: releaseNotes.trim() || null,
      status: statusValue,
      is_latest: isLatest,
    };
    setSaving(true);
    try {
      if (isEdit && templateVersion) {
        await apiService.updateTemplateVersion(templateVersion.id, payload);
      } else {
        await apiService.createTemplateVersion({
          ...payload,
          submission_profile_id: submissionProfileId,
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to save template version");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? "Edit Template Version" : "New Template Version"}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Version"
            required
            fullWidth
            placeholder="2025.1"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
          <TextField
            label="Effective Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
          <TextField
            label="Expiry Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
          <TextField
            label="Release Notes"
            fullWidth
            multiline
            minRows={3}
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusValue}
              label="Status"
              onChange={(e) => setStatusValue(e.target.value)}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={isLatest}
                onChange={(e) => setIsLatest(e.target.checked)}
              />
            }
            label="Mark as latest version for this profile"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Version"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateVersionFormDialog;
