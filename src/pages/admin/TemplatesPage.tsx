import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  AccountTree as TreeIcon,
  Star as StarIcon,
  ExpandLess,
  ExpandMore,
  ChevronRight as LeafIcon,
} from "@mui/icons-material";

import apiService from "../../services/api";
import { RegTemplateCatalogEntry, RegTemplateSectionNode } from "../../types";

const statusColor = (
  status: string,
): "success" | "default" | "warning" => {
  const s = status.toLowerCase();
  if (s === "active") return "success";
  if (s === "deprecated") return "warning";
  return "default";
};

// One node in the section tree. Self-managed expand/collapse; expanded by default.
const SectionTreeNode: React.FC<{
  node: RegTemplateSectionNode;
  depth: number;
}> = ({ node, depth }) => {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          py: 0.75,
          pl: depth * 3,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {hasChildren ? (
          <IconButton size="small" onClick={() => setOpen((o) => !o)} sx={{ mt: -0.25 }}>
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        ) : (
          <LeafIcon fontSize="small" sx={{ color: "text.disabled", mt: 0.25 }} />
        )}

        <Typography
          component="span"
          sx={{ fontFamily: "monospace", fontWeight: 600, minWidth: 56 }}
        >
          {node.section_number}
        </Typography>

        <Box sx={{ flex: 1 }}>
          <Typography component="span" sx={{ fontWeight: hasChildren ? 600 : 400 }}>
            {node.title}
          </Typography>
          {node.description && (
            <Typography variant="body2" color="text.secondary">
              {node.description}
            </Typography>
          )}
        </Box>

        <Chip
          size="small"
          label={node.is_required ? "Required" : "Optional"}
          color={node.is_required ? "primary" : "default"}
          variant={node.is_required ? "filled" : "outlined"}
        />
      </Box>

      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          {node.children.map((child) => (
            <SectionTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </Collapse>
      )}
    </Box>
  );
};

const TemplatesPage: React.FC = () => {
  const [catalog, setCatalog] = useState<RegTemplateCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tree, setTree] = useState<RegTemplateSectionNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await apiService.getTemplateCatalog();
        if (active) setCatalog(data);
      } catch (e: any) {
        if (active)
          setError(
            e?.response?.data?.detail || "Failed to load templates.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectTemplate = useCallback(async (id: string) => {
    setSelectedId(id);
    setTreeError(null);
    setTreeLoading(true);
    try {
      const data = await apiService.getTemplateVersionTree(id);
      setTree(data);
    } catch (e: any) {
      setTreeError(
        e?.response?.data?.detail || "Failed to load template sections.",
      );
      setTree([]);
    } finally {
      setTreeLoading(false);
    }
  }, []);

  // Group templates by country for the left list.
  const grouped = useMemo(() => {
    const map = new Map<string, RegTemplateCatalogEntry[]>();
    for (const t of catalog) {
      const key = t.country_name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [catalog]);

  const selected = catalog.find((t) => t.template_version_id === selectedId);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <TreeIcon color="primary" />
        <Typography variant="h4">Templates</Typography>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Browse the regulatory submission templates available in the platform.
        Select a template to view its full section structure.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!error && catalog.length === 0 && (
        <Alert severity="info">
          No templates found. Seed the regulatory data to populate templates.
        </Alert>
      )}

      {catalog.length > 0 && (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "flex-start",
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          {/* Left: template list */}
          <Paper
            variant="outlined"
            sx={{ width: { xs: "100%", md: 380 }, flexShrink: 0, maxHeight: "75vh", overflow: "auto" }}
          >
            {grouped.map(([country, items]) => (
              <Box key={country}>
                <Typography
                  variant="overline"
                  sx={{ px: 2, pt: 1.5, display: "block", color: "text.secondary" }}
                >
                  {country}
                </Typography>
                <List dense disablePadding>
                  {items.map((t) => (
                    <ListItemButton
                      key={t.template_version_id}
                      selected={t.template_version_id === selectedId}
                      onClick={() => selectTemplate(t.template_version_id)}
                      sx={{ alignItems: "flex-start", py: 1 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }} noWrap>
                          {t.submission_type_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {t.authority_abbreviation || t.authority_name} ·{" "}
                          {t.submission_profile_code} · v{t.version}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} alignItems="center">
                          <Chip size="small" label={t.status} color={statusColor(t.status)} />
                          {t.is_latest && (
                            <Chip
                              size="small"
                              icon={<StarIcon />}
                              label="Latest"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {t.sections_count} sections
                          </Typography>
                        </Stack>
                      </Box>
                    </ListItemButton>
                  ))}
                </List>
                <Divider />
              </Box>
            ))}
          </Paper>

          {/* Right: section tree */}
          <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, minHeight: 240 }}>
            {!selected ? (
              <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
                <TreeIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                <Typography>Select a template to view its sections.</Typography>
              </Box>
            ) : (
              <Box>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6">{selected.submission_type_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selected.country_name} · {selected.authority_name} ·{" "}
                    {selected.regulation_name} · {selected.submission_profile_name} · v
                    {selected.version}
                  </Typography>
                </Box>
                <Divider />
                {treeError && (
                  <Alert severity="error" sx={{ m: 2 }}>
                    {treeError}
                  </Alert>
                )}
                {treeLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                  </Box>
                ) : tree.length === 0 && !treeError ? (
                  <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
                    <Typography>This template has no sections defined.</Typography>
                  </Box>
                ) : (
                  <Box>
                    {tree.map((node) => (
                      <SectionTreeNode key={node.id} node={node} depth={0} />
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default TemplatesPage;
