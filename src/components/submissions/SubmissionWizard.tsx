import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import apiService from "../../services/api";
import {
  Product,
  RegCountry,
  RegAuthority,
  RegIndustry,
  RegRegulation,
  RegSubmissionType,
  RegRiskClassification,
  RegSubmissionProfile,
  RegTemplateVersion,
  RegRequiredDocument,
  RegTemplateSection,
  RegValidationRule,
} from "../../types";

interface SubmissionWizardProps {
  open: boolean;
  projectId: string;
  products: Product[];
  onClose: () => void;
  onCreated: () => void;
}

const STEPS = [
  "Country",
  "Authority",
  "Industry",
  "Regulation",
  "Submission Type",
  "Risk Class",
  "Submission Profile",
  "Review",
];

const REVIEW_STEP = 7;

const SubmissionWizard: React.FC<SubmissionWizardProps> = ({
  open,
  projectId,
  products,
  onClose,
  onCreated,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  // Selections (full objects so the stepper can show labels).
  const [country, setCountry] = useState<RegCountry | null>(null);
  const [authority, setAuthority] = useState<RegAuthority | null>(null);
  const [industry, setIndustry] = useState<RegIndustry | null>(null);
  const [regulation, setRegulation] = useState<RegRegulation | null>(null);
  const [submissionType, setSubmissionType] =
    useState<RegSubmissionType | null>(null);
  const [riskClass, setRiskClass] = useState<RegRiskClassification | null>(null);
  const [submissionProfile, setSubmissionProfile] =
    useState<RegSubmissionProfile | null>(null);

  // Step option lists.
  const [countries, setCountries] = useState<RegCountry[]>([]);
  const [authorities, setAuthorities] = useState<RegAuthority[]>([]);
  const [industries, setIndustries] = useState<RegIndustry[]>([]);
  const [regulations, setRegulations] = useState<RegRegulation[]>([]);
  const [submissionTypes, setSubmissionTypes] = useState<RegSubmissionType[]>(
    [],
  );
  const [riskClasses, setRiskClasses] = useState<RegRiskClassification[]>([]);
  const [submissionProfiles, setSubmissionProfiles] = useState<
    RegSubmissionProfile[]
  >([]);

  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review (auto-resolved template) state.
  const [templateVersion, setTemplateVersion] =
    useState<RegTemplateVersion | null>(null);
  const [requiredDocuments, setRequiredDocuments] = useState<
    RegRequiredDocument[]
  >([]);
  const [sections, setSections] = useState<RegTemplateSection[]>([]);
  const [validationRules, setValidationRules] = useState<RegValidationRule[]>(
    [],
  );
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Final submission fields gathered at review.
  const [productId, setProductId] = useState("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const resetAll = useCallback(() => {
    setActiveStep(0);
    setCountry(null);
    setAuthority(null);
    setIndustry(null);
    setRegulation(null);
    setSubmissionType(null);
    setRiskClass(null);
    setSubmissionProfile(null);
    setAuthorities([]);
    setRegulations([]);
    setSubmissionTypes([]);
    setRiskClasses([]);
    setSubmissionProfiles([]);
    setTemplateVersion(null);
    setRequiredDocuments([]);
    setSections([]);
    setValidationRules([]);
    setReviewError(null);
    setError(null);
    setProductId("");
    setTargetDate("");
  }, []);

  const handleClose = () => {
    if (creating) return;
    resetAll();
    onClose();
  };

  // Load the option list for the current step from its parent selection.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setError(null);
      try {
        if (activeStep === 0 && countries.length === 0) {
          setOptionsLoading(true);
          const data = await apiService.getRegulatoryCountries();
          if (!cancelled) setCountries(data);
        } else if (activeStep === 1 && country) {
          setOptionsLoading(true);
          const data = await apiService.getRegulatoryAuthorities(country.id);
          if (!cancelled) setAuthorities(data);
        } else if (activeStep === 2 && industries.length === 0) {
          setOptionsLoading(true);
          const data = await apiService.getRegulatoryIndustries();
          if (!cancelled) setIndustries(data);
        } else if (activeStep === 3 && authority && industry) {
          setOptionsLoading(true);
          const data = await apiService.getRegulatoryRegulations(
            authority.id,
            industry.id,
          );
          if (!cancelled) setRegulations(data);
        } else if (activeStep === 4 && regulation) {
          setOptionsLoading(true);
          const data = await apiService.getRegulatorySubmissionTypes(
            regulation.id,
          );
          if (!cancelled) setSubmissionTypes(data);
        } else if (activeStep === 5 && submissionType) {
          setOptionsLoading(true);
          const data = await apiService.getRegulatoryRiskClasses(
            submissionType.id,
          );
          if (!cancelled) setRiskClasses(data);
        } else if (activeStep === 6 && submissionType) {
          setOptionsLoading(true);
          const data = await apiService.getRegulatorySubmissionProfiles(
            submissionType.id,
          );
          if (!cancelled) setSubmissionProfiles(data);
        }
      } catch (e: any) {
        if (!cancelled)
          setError(e.response?.data?.detail || "Failed to load options");
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeStep]);

  // Resolve the latest active template version + preview when entering Review.
  useEffect(() => {
    if (!open || activeStep !== REVIEW_STEP || !submissionProfile) return;
    let cancelled = false;

    const loadReview = async () => {
      setReviewLoading(true);
      setReviewError(null);
      setTemplateVersion(null);
      try {
        const tv = await apiService.getLatestTemplateVersion(
          submissionProfile.id,
        );
        if (cancelled) return;
        setTemplateVersion(tv);
        const [docs, secs, rules] = await Promise.all([
          apiService.getTemplateVersionRequiredDocuments(tv.id),
          apiService.getTemplateVersionSections(tv.id),
          apiService.getTemplateVersionValidationRules(tv.id),
        ]);
        if (cancelled) return;
        setRequiredDocuments(docs);
        setSections(secs);
        setValidationRules(rules);
      } catch (e: any) {
        if (cancelled) return;
        if (e.response?.status === 404) {
          setReviewError(
            "No active template version is configured for this Submission Profile. A submission cannot be created until an administrator publishes one.",
          );
        } else {
          setReviewError(
            e.response?.data?.detail || "Failed to resolve the template version",
          );
        }
      } finally {
        if (!cancelled) setReviewLoading(false);
      }
    };

    loadReview();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeStep]);

  // Selection handlers reset everything downstream, then advance.
  const pick = {
    country: (c: RegCountry) => {
      setCountry(c);
      setAuthority(null);
      setIndustry(null);
      setRegulation(null);
      setSubmissionType(null);
      setRiskClass(null);
      setAuthorities([]);
      setActiveStep(1);
    },
    authority: (a: RegAuthority) => {
      setAuthority(a);
      setRegulation(null);
      setSubmissionType(null);
      setRiskClass(null);
      setActiveStep(2);
    },
    industry: (i: RegIndustry) => {
      setIndustry(i);
      setRegulation(null);
      setSubmissionType(null);
      setRiskClass(null);
      setRegulations([]);
      setActiveStep(3);
    },
    regulation: (r: RegRegulation) => {
      setRegulation(r);
      setSubmissionType(null);
      setRiskClass(null);
      setSubmissionTypes([]);
      setActiveStep(4);
    },
    submissionType: (s: RegSubmissionType) => {
      setSubmissionType(s);
      setRiskClass(null);
      setRiskClasses([]);
      setActiveStep(5);
    },
    riskClass: (rc: RegRiskClassification) => {
      setRiskClass(rc);
      setSubmissionProfile(null);
      setSubmissionProfiles([]);
      setActiveStep(6);
    },
    submissionProfile: (p: RegSubmissionProfile) => {
      setSubmissionProfile(p);
      setActiveStep(REVIEW_STEP);
    },
  };

  const handleCreate = async () => {
    if (!submissionProfile || !productId) return;
    setCreating(true);
    setError(null);
    try {
      // The backend resolves the chain from the profile + latest active template
      // version and creates everything (submission, dossier, placeholders,
      // checklist) atomically.
      await apiService.createSubmissionGuided({
        project_id: projectId,
        product_id: productId,
        submission_profile_id: submissionProfile.id,
        risk_classification_id: riskClass?.id,
        target_submission_date: targetDate || undefined,
      });
      onCreated();
      resetAll();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to create submission");
    } finally {
      setCreating(false);
    }
  };

  const renderOptionList = <T extends { id: string }>(
    items: T[],
    getPrimary: (item: T) => string,
    getSecondary: (item: T) => string | undefined,
    onSelect: (item: T) => void,
    selectedId?: string,
    emptyText = "No options available.",
  ) => {
    if (optionsLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (items.length === 0) {
      return (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {emptyText}
        </Alert>
      );
    }
    return (
      <List sx={{ maxHeight: 320, overflow: "auto" }}>
        {items.map((item) => (
          <ListItemButton
            key={item.id}
            selected={selectedId === item.id}
            onClick={() => onSelect(item)}
          >
            <ListItemText
              primary={getPrimary(item)}
              secondary={getSecondary(item)}
            />
          </ListItemButton>
        ))}
      </List>
    );
  };

  const renderStepBody = () => {
    switch (activeStep) {
      case 0:
        return renderOptionList(
          countries,
          (c) => c.name,
          (c) => c.code,
          pick.country,
          country?.id,
          "No active countries found.",
        );
      case 1:
        return renderOptionList(
          authorities,
          (a) => a.name,
          (a) => a.abbreviation || undefined,
          pick.authority,
          authority?.id,
          "No authorities found for this country.",
        );
      case 2:
        return renderOptionList(
          industries,
          (i) => i.name,
          (i) => i.code,
          pick.industry,
          industry?.id,
          "No active industries found.",
        );
      case 3:
        return renderOptionList(
          regulations,
          (r) => r.name,
          (r) => r.code,
          pick.regulation,
          regulation?.id,
          "No active regulations for this authority and industry.",
        );
      case 4:
        return renderOptionList(
          submissionTypes,
          (s) => s.name,
          (s) => s.code,
          pick.submissionType,
          submissionType?.id,
          "No submission types for this regulation.",
        );
      case 5:
        return renderOptionList(
          riskClasses,
          (rc) => rc.name,
          (rc) => rc.code,
          pick.riskClass,
          riskClass?.id,
          "No risk classes are mapped to this submission type.",
        );
      case 6:
        return renderOptionList(
          submissionProfiles,
          (p) => p.name,
          (p) => p.code,
          pick.submissionProfile,
          submissionProfile?.id,
          "No active submission profiles for this submission type.",
        );
      case REVIEW_STEP:
        return renderReview();
      default:
        return null;
    }
  };

  const renderReview = () => {
    if (reviewLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (reviewError) {
      return (
        <Alert severity="error" sx={{ mt: 1 }}>
          {reviewError}
        </Alert>
      );
    }
    if (!templateVersion) return null;

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
        <Alert severity="success">
          A template was determined automatically — you don't need to pick one.
        </Alert>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Template Version
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 0.5 }}
          >
            <Typography variant="h6">{templateVersion.version}</Typography>
            <Chip size="small" label={templateVersion.status} color="primary" />
            {templateVersion.is_latest && (
              <Chip size="small" label="Latest" variant="outlined" />
            )}
          </Stack>
          {templateVersion.effective_date && (
            <Typography variant="body2" color="text.secondary">
              Effective {templateVersion.effective_date}
            </Typography>
          )}
          {templateVersion.release_notes && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {templateVersion.release_notes}
            </Typography>
          )}
        </Paper>

        <Stack direction="row" spacing={2}>
          <Paper variant="outlined" sx={{ p: 2, flex: 1, textAlign: "center" }}>
            <Typography variant="h4">{sections.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Sections
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, flex: 1, textAlign: "center" }}>
            <Typography variant="h4">{requiredDocuments.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Required Documents
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, flex: 1, textAlign: "center" }}>
            <Typography variant="h4">{validationRules.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Validation Rules
            </Typography>
          </Paper>
        </Stack>

        {requiredDocuments.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Required Documents
            </Typography>
            <List dense disablePadding>
              {requiredDocuments.map((doc) => (
                <ListItemText
                  key={doc.id}
                  sx={{ my: 0.5 }}
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{doc.name}</span>
                      <Chip
                        size="small"
                        label={doc.required ? "Required" : "Optional"}
                        color={doc.required ? "error" : "default"}
                        variant="outlined"
                      />
                    </Stack>
                  }
                  secondary={`Files: min ${doc.minimum_files}${
                    doc.maximum_files ? `, max ${doc.maximum_files}` : ""
                  }`}
                />
              ))}
            </List>
          </Paper>
        )}

        {validationRules.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Validation Rules
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {validationRules.map((rule) => (
                <Chip
                  key={rule.id}
                  size="small"
                  label={`${rule.target_type}: ${rule.rule_type} (${rule.severity})`}
                  variant="outlined"
                />
              ))}
            </Stack>
          </Paper>
        )}

        <Divider sx={{ my: 1 }} />

        <Alert severity="info">
          A submission number will be auto-generated for the selected product
          (e.g. 0000, 0001, 0002...).
        </Alert>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <FormControl fullWidth required>
            <InputLabel>Product</InputLabel>
            <Select
              value={productId}
              label="Product"
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name} ({product.device_type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <DatePicker
            label="Target Submission Date"
            value={targetDate ? new Date(targetDate) : null}
            onChange={(date) =>
              setTargetDate(date ? date.toISOString().split("T")[0] : "")
            }
            slotProps={{ textField: { fullWidth: true, sx: { mt: 2 } } }}
          />
        </LocalizationProvider>
      </Box>
    );
  };

  const selectionLabel = (index: number): string | undefined => {
    switch (index) {
      case 0:
        return country?.name;
      case 1:
        return authority?.name;
      case 2:
        return industry?.name;
      case 3:
        return regulation?.code;
      case 4:
        return submissionType?.name;
      case 5:
        return riskClass?.name;
      case 6:
        return submissionProfile?.name;
      default:
        return undefined;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>New Submission</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3, mt: 1 }}>
          {STEPS.map((label, index) => (
            <Step key={label}>
              <StepLabel optional={
                selectionLabel(index) ? (
                  <Typography variant="caption">{selectionLabel(index)}</Typography>
                ) : undefined
              }>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepBody()}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={creating}>
          Cancel
        </Button>
        <Button
          onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
          disabled={activeStep === 0 || creating}
        >
          Back
        </Button>
        {activeStep === REVIEW_STEP && (
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={
              !templateVersion ||
              !productId ||
              reviewLoading ||
              creating ||
              !!reviewError
            }
          >
            {creating ? "Creating..." : "Create Submission"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SubmissionWizard;
