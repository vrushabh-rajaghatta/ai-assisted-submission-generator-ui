import React, { useState } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Tooltip,
  // useMediaQuery,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from "@mui/icons-material";

import Sidebar from "./Sidebar";
import { useTheme as useCustomTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

const drawerWidth = 280;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const { mode, toggleMode } = useCustomTheme();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
    null,
  );

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const initials = (user?.full_name || user?.username || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <Box sx={{ display: "flex", width: "100%" }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            AI-Assisted Regulatory Submission Builder
          </Typography>

          <IconButton
            color="inherit"
            onClick={toggleMode}
            aria-label="toggle theme"
          >
            {mode === "dark" ? <Brightness7 /> : <Brightness4 />}
          </IconButton>

          {user && (
            <>
              <Tooltip title={user.full_name || user.username}>
                <IconButton
                  color="inherit"
                  onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                  sx={{ ml: 1 }}
                  aria-label="user menu"
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: 14,
                      bgcolor: "secondary.main",
                    }}
                  >
                    {initials || <PersonIcon fontSize="small" />}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2" noWrap>
                    {user.full_name || user.username}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    display="block"
                  >
                    {user.username}
                  </Typography>
                  {user.organization?.name && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      display="block"
                    >
                      {user.organization.name}
                      {user.is_admin ? " \u00b7 admin" : ""}
                    </Typography>
                  )}
                </Box>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    logout();
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Sign out
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          <Sidebar onItemClick={() => setMobileOpen(false)} />
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          <Sidebar />
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Toolbar /> {/* Spacer for app bar */}
        <Box sx={{ p: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default Layout;
