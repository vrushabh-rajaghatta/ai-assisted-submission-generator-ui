import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Chip,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  FolderOpen as ProjectsIcon,
  Assignment as SubmissionsIcon,
  Description as DossierIcon,
  // CloudUpload as FilesIcon, // File Manager — not implemented for demo
  Psychology as AIIcon,
  AdminPanelSettings as AdminIcon,
  Business as OrgIcon,
  People as UsersIcon,
  AccountTree as RegulatoryIcon,
  Tune as ConfigurationIcon,
  Article as TemplatesIcon,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";

import { NavItem } from "../../types";
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  onItemClick?: () => void;
}

const navigationItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: DashboardIcon,
  },
  {
    id: "projects",
    label: "Projects",
    path: "/projects",
    icon: ProjectsIcon,
  },
  {
    id: "submissions",
    label: "Submissions",
    path: "/submissions",
    icon: SubmissionsIcon,
  },
];

const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useApp();
  const { user } = useAuth();

  const isAdmin = Boolean(user?.is_admin || user?.is_super_admin);
  const isSuperAdmin = Boolean(user?.is_super_admin);

  const adminChildren: NavItem[] = [
    ...(isSuperAdmin
      ? [
          {
            id: "admin-orgs",
            label: "Organizations",
            path: "/admin/organizations",
            icon: OrgIcon,
          } as NavItem,
        ]
      : []),
    {
      id: "admin-users",
      label: "Users",
      path: "/admin/users",
      icon: UsersIcon,
    },
    {
      id: "admin-regulatory",
      label: "Regulatory",
      path: "/admin/regulatory",
      icon: RegulatoryIcon,
    },
    {
      id: "admin-templates",
      label: "Templates",
      path: "/admin/templates",
      icon: TemplatesIcon,
    },
    {
      id: "admin-configuration",
      label: "Configuration",
      path: "/admin/configuration",
      icon: ConfigurationIcon,
    },
  ];

  const [adminOpen, setAdminOpen] = useState(() =>
    location.pathname.startsWith("/admin"),
  );

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      setAdminOpen(true);
    }
  }, [location.pathname]);

  const handleNavigation = (path: string) => {
    navigate(path);
    if (onItemClick) {
      onItemClick();
    }
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem, nested = false) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <ListItem key={item.id} disablePadding>
        <ListItemButton
          onClick={() => handleNavigation(item.path)}
          selected={active}
          sx={{
            borderRadius: 1,
            mx: 1,
            mb: 0.5,
            pl: nested ? 4 : 2,
            "&.Mui-selected": {
              backgroundColor: "primary.main",
              color: "primary.contrastText",
              "&:hover": {
                backgroundColor: "primary.dark",
              },
              "& .MuiListItemIcon-root": {
                color: "primary.contrastText",
              },
            },
          }}
        >
          {Icon && (
            <ListItemIcon sx={{ minWidth: nested ? 36 : 56 }}>
              <Icon fontSize={nested ? "small" : "medium"} />
            </ListItemIcon>
          )}
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              fontWeight: active ? 600 : 400,
              fontSize: nested ? "0.9rem" : undefined,
            }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  const renderAdminSection = () => {
    if (!isAdmin) return null;
    const adminActive = location.pathname.startsWith("/admin");
    return (
      <>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => setAdminOpen((o) => !o)}
            selected={adminActive && !adminOpen}
            sx={{
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              "&.Mui-selected": {
                backgroundColor: "primary.main",
                color: "primary.contrastText",
                "& .MuiListItemIcon-root": {
                  color: "primary.contrastText",
                },
              },
            }}
          >
            <ListItemIcon>
              <AdminIcon />
            </ListItemIcon>
            <ListItemText
              primary="Admin"
              primaryTypographyProps={{ fontWeight: adminActive ? 600 : 400 }}
            />
            {adminOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={adminOpen} timeout="auto" unmountOnExit>
          <List disablePadding>
            {adminChildren.map((child) => renderNavItem(child, true))}
          </List>
        </Collapse>
      </>
    );
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Toolbar>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AIIcon color="primary" />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ fontWeight: 600 }}
          >
            RegSub AI
          </Typography>
        </Box>
      </Toolbar>

      <Divider />

      {/* Current Context */}
      {(state.currentProject || state.currentSubmission) && (
        <Box sx={{ p: 2 }}>
          {state.currentProject && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Current Project
              </Typography>
              <Chip
                label={state.currentProject.name}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mt: 0.5, maxWidth: "100%" }}
              />
            </Box>
          )}
          {state.currentSubmission && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Current Submission
              </Typography>
              <Chip
                label={`#${state.currentSubmission.sequence_number}`}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ mt: 0.5, maxWidth: "100%" }}
              />
            </Box>
          )}
        </Box>
      )}

      {(state.currentProject || state.currentSubmission) && <Divider />}

      {/* Main Navigation */}
      <Box sx={{ flexGrow: 1, overflow: "auto" }}>
        <List sx={{ pt: 1 }}>
          {navigationItems.map((item) => renderNavItem(item))}
          {renderAdminSection()}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          align="center"
          display="block"
        >
          Health Canada IMDRF
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          align="center"
          display="block"
        >
          Submission Builder v1.0
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar;
