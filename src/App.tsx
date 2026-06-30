import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Box } from "@mui/material";

// Contexts
import { AppProvider } from "./contexts/AppContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";

// Layout components
import Layout from "./components/layout/Layout";
import RequireAuth from "./components/auth/RequireAuth";

// Page components
import Dashboard from "./pages/dashboard/Dashboard";
import ProjectsPage from "./pages/projects/ProjectsPage";
import ProjectDetailsPage from "./pages/projects/ProjectDetailsPage";
import SubmissionsPage from "./pages/submissions/SubmissionsPage";
import SubmissionDetailsPage from "./pages/submissions/SubmissionDetailsPage";
import DossierPage from "./pages/dossier/DossierPage";
import FilesPage from "./pages/files/FilesPage";
import AIPage from "./pages/ai/AIPage";
import LoginPage from "./pages/auth/LoginPage";
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";
import AdminPage from "./pages/admin/AdminPage";
import UsersPage from "./pages/admin/UsersPage";
import RegulatoryAdminPage from "./pages/admin/RegulatoryAdminPage";
import ConfigurationRegistryPage from "./pages/admin/ConfigurationRegistryPage";

// Error boundary
import ErrorBoundary from "./components/common/ErrorBoundary";

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <AppProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/change-password"
                  element={
                    <RequireAuth>
                      <ChangePasswordPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/*"
                  element={
                    <RequireAuth>
                      <Box sx={{ display: "flex", minHeight: "100vh" }}>
                        <Layout>
                          <Routes>
                            {/* Dashboard */}
                            <Route
                              path="/"
                              element={<Navigate to="/dashboard" replace />}
                            />
                            <Route path="/dashboard" element={<Dashboard />} />

                            {/* Projects */}
                            <Route
                              path="/projects"
                              element={<ProjectsPage />}
                            />
                            <Route
                              path="/projects/:projectId"
                              element={<ProjectDetailsPage />}
                            />

                            {/* Submissions */}
                            <Route
                              path="/submissions"
                              element={<SubmissionsPage />}
                            />
                            <Route
                              path="/submissions/:submissionId"
                              element={<SubmissionDetailsPage />}
                            />

                            {/* Dossier */}
                            <Route
                              path="/dossier/:submissionId"
                              element={<DossierPage />}
                            />

                            {/* Files */}
                            <Route path="/files" element={<FilesPage />} />
                            <Route
                              path="/files/:projectId"
                              element={<FilesPage />}
                            />

                            {/* AI */}
                            <Route path="/ai" element={<AIPage />} />

                            {/* Admin */}
                            <Route
                              path="/admin"
                              element={
                                <RequireAuth requireAdmin>
                                  <Navigate to="/admin/users" replace />
                                </RequireAuth>
                              }
                            />
                            <Route
                              path="/admin/organizations"
                              element={
                                <RequireAuth requireSuperAdmin>
                                  <AdminPage />
                                </RequireAuth>
                              }
                            />
                            <Route
                              path="/admin/users"
                              element={
                                <RequireAuth requireAdmin>
                                  <UsersPage />
                                </RequireAuth>
                              }
                            />
                            <Route
                              path="/admin/regulatory"
                              element={
                                <RequireAuth requireAdmin>
                                  <RegulatoryAdminPage />
                                </RequireAuth>
                              }
                            />
                            <Route
                              path="/admin/configuration"
                              element={
                                <RequireAuth requireAdmin>
                                  <ConfigurationRegistryPage />
                                </RequireAuth>
                              }
                            />

                            {/* Catch all */}
                            <Route
                              path="*"
                              element={<Navigate to="/dashboard" replace />}
                            />
                          </Routes>
                        </Layout>
                      </Box>
                    </RequireAuth>
                  }
                />
              </Routes>
            </AppProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
