import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  Project,
  Product,
  Submission,
  DossierSection,
  UploadedFile,
  HumanReview,
  PaginatedResponse,
  MessageResponse,
  ProjectFormData,
  ProductFormData,
  SubmissionFormData,
  AIExtractionResponse,
  AIContentSuggestion,
  AIModelInfo,
  DashboardStats,
  BatchUploadResult,
  RegCountry,
  RegAuthority,
  RegIndustry,
  RegRegulation,
  RegSubmissionType,
  RegRiskClassification,
  RegSubmissionProfile,
  RegSubmissionProfileDetail,
  RegConfigurationType,
  RegConfigurationProfile,
  RegConfigurationProfileDetail,
  RegTemplateVersion,
  RegRequiredDocument,
  RegTemplateSection,
  RegTemplateSectionNode,
  RegTemplateCatalogEntry,
  RegValidationRule,
} from "../types";

// Strip empty-string optional fields so the backend (Pydantic) doesn't
// reject them as invalid values for typed fields like `date`.
function sanitizeSubmissionPayload<T extends Partial<SubmissionFormData>>(
  data: T,
): T {
  const cleaned: any = { ...data };
  const optionalFields: (keyof SubmissionFormData)[] = [
    "submission_type",
    "target_submission_date",
    "created_by",
  ];
  for (const field of optionalFields) {
    if (cleaned[field] === "") {
      delete cleaned[field];
    }
  }
  return cleaned;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || "http://localhost:8010/api",
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const internalApiKey = process.env.REACT_APP_INTERNAL_API_KEY;
        if (internalApiKey) {
          config.headers["X-API-Key"] = internalApiKey;
        }

        // Add auth token if available
        const token = localStorage.getItem("auth_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const url: string = error.config?.url || "";
          const onLoginPage =
            typeof window !== "undefined" &&
            window.location.pathname === "/login";
          // Don't bounce when the failure is the login attempt itself, or when
          // the user is already on the login page (e.g. the initial /auth/me probe).
          if (!url.includes("/auth/login") && !onLoginPage) {
            localStorage.removeItem("auth_token");
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      },
    );
  }

  // Auth API
  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    const response = await this.api.post("/auth/login", { username, password });
    return response.data;
  }

  async getCurrentUser(): Promise<any> {
    const response = await this.api.get("/auth/me");
    return response.data;
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.api.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  async listOrganizationUsers(): Promise<any[]> {
    const response = await this.api.get("/auth/admin/users");
    return response.data;
  }

  async createOrganizationUser(payload: {
    username: string;
    password: string;
    full_name?: string;
    is_admin?: boolean;
  }): Promise<any> {
    const response = await this.api.post("/auth/admin/users", payload);
    return response.data;
  }

  async deactivateOrganizationUser(userId: string): Promise<void> {
    await this.api.delete(`/auth/admin/users/${userId}`);
  }

  async resetOrganizationUserPassword(userId: string): Promise<{
    user_id: string;
    username: string;
    temporary_password: string;
    must_change_password: boolean;
  }> {
    const response = await this.api.post(
      `/auth/admin/users/${userId}/reset-password`,
    );
    return response.data;
  }

  // Super-admin: platform-wide organization and user management
  async listOrganizations(): Promise<any[]> {
    const response = await this.api.get("/auth/super-admin/organizations");
    return response.data;
  }

  async createOrganization(name: string): Promise<any> {
    const response = await this.api.post("/auth/super-admin/organizations", {
      name,
    });
    return response.data;
  }

  async listAllUsers(organizationId?: string): Promise<any[]> {
    const params = organizationId
      ? { organization_id: organizationId }
      : undefined;
    const response = await this.api.get("/auth/super-admin/users", { params });
    return response.data;
  }

  async createUserInOrganization(payload: {
    organization_id: string;
    username: string;
    password: string;
    full_name?: string;
    is_admin?: boolean;
  }): Promise<any> {
    const response = await this.api.post("/auth/super-admin/users", payload);
    return response.data;
  }

  async deactivateAnyUser(userId: string): Promise<void> {
    await this.api.delete(`/auth/super-admin/users/${userId}`);
  }

  async resetAnyUserPassword(userId: string): Promise<{
    user_id: string;
    username: string;
    temporary_password: string;
    must_change_password: boolean;
  }> {
    const response = await this.api.post(
      `/auth/super-admin/users/${userId}/reset-password`,
    );
    return response.data;
  }

  // Projects API
  async getProjects(
    page = 1,
    size = 10,
    search?: string,
  ): Promise<PaginatedResponse<Project>> {
    const params = { page, size, ...(search && { search }) };
    const response: AxiosResponse<PaginatedResponse<Project>> =
      await this.api.get("/projects/", { params });
    return response.data;
  }

  async getProject(id: string): Promise<Project> {
    const response: AxiosResponse<Project> = await this.api.get(
      `/projects/${id}`,
    );
    return response.data;
  }

  async createProject(data: ProjectFormData): Promise<Project> {
    const response: AxiosResponse<Project> = await this.api.post(
      "/projects/",
      data,
    );
    return response.data;
  }

  async updateProject(
    id: string,
    data: Partial<ProjectFormData>,
  ): Promise<Project> {
    const response: AxiosResponse<Project> = await this.api.put(
      `/projects/${id}`,
      data,
    );
    return response.data;
  }

  async deleteProject(id: string): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.delete(
      `/projects/${id}`,
    );
    return response.data;
  }

  async getProjectStats(id: string): Promise<any> {
    const response = await this.api.get(`/projects/${id}/stats`);
    return response.data;
  }

  // Products API
  async getProducts(
    projectId?: string,
    page = 1,
    size = 10,
  ): Promise<PaginatedResponse<Product>> {
    const params = { page, size, ...(projectId && { project_id: projectId }) };
    const response: AxiosResponse<PaginatedResponse<Product>> =
      await this.api.get("/products/", { params });
    return response.data;
  }

  async getProduct(id: string): Promise<Product> {
    const response: AxiosResponse<Product> = await this.api.get(
      `/products/${id}/`,
    );
    return response.data;
  }

  async createProduct(
    projectId: string,
    data: ProductFormData,
  ): Promise<Product> {
    const response: AxiosResponse<Product> = await this.api.post("/products/", {
      ...data,
      project_id: projectId,
    });
    return response.data;
  }

  async updateProduct(
    id: string,
    data: Partial<ProductFormData>,
  ): Promise<Product> {
    const response: AxiosResponse<Product> = await this.api.put(
      `/products/${id}/`,
      data,
    );
    return response.data;
  }

  async deleteProduct(id: string): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.delete(
      `/products/${id}/`,
    );
    return response.data;
  }

  // Submissions API
  async getSubmissions(
    projectId?: string,
    page = 1,
    size = 10,
  ): Promise<PaginatedResponse<Submission>> {
    const params = { page, size, ...(projectId && { project_id: projectId }) };
    const response: AxiosResponse<PaginatedResponse<Submission>> =
      await this.api.get("/submissions/", { params });
    return response.data;
  }

  async getSubmission(id: string): Promise<Submission> {
    const response: AxiosResponse<Submission> = await this.api.get(
      `/submissions/${id}`,
    );
    return response.data;
  }

  async createSubmission(
    projectId: string,
    data: SubmissionFormData,
  ): Promise<Submission> {
    const response: AxiosResponse<Submission> = await this.api.post(
      "/submissions/",
      { ...sanitizeSubmissionPayload(data), project_id: projectId },
    );
    return response.data;
  }

  async updateSubmission(
    id: string,
    data: Partial<SubmissionFormData>,
  ): Promise<Submission> {
    const response: AxiosResponse<Submission> = await this.api.put(
      `/submissions/${id}`,
      sanitizeSubmissionPayload(data),
    );
    return response.data;
  }

  async deleteSubmission(id: string): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.delete(
      `/submissions/${id}`,
    );
    return response.data;
  }

  async getSubmissionProgress(id: string): Promise<any> {
    const response = await this.api.get(`/submissions/${id}/progress/`);
    return response.data;
  }

  // Dossier API
  async getDossierSections(
    submissionId: string,
    parentSectionId?: string,
  ): Promise<PaginatedResponse<DossierSection>> {
    const params = {
      submission_id: submissionId,
      ...(parentSectionId && { parent_section_id: parentSectionId }),
    };
    const response: AxiosResponse<PaginatedResponse<DossierSection>> =
      await this.api.get("/dossier/sections", { params });
    return response.data;
  }

  async getDossierStructure(submissionId: string): Promise<any> {
    const response = await this.api.get(`/dossier/structure/${submissionId}`);
    return response.data;
  }

  async createDossierFromTemplate(
    submissionId: string,
    templateName: string,
    templateVersion?: string,
  ): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.post(
      "/dossier/template/create",
      {
        submission_id: submissionId,
        template_name: templateName,
        template_version: templateVersion,
      },
    );
    return response.data;
  }

  async autoCreateDossier(submissionId: string): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.post(
      `/dossier/auto-create/${submissionId}`,
    );
    return response.data;
  }

  async getAvailableTemplates(regulationType?: string): Promise<any[]> {
    const params = regulationType ? { regulation_type: regulationType } : {};
    const response = await this.api.get("/dossier/templates", { params });
    return response.data;
  }

  async validateDossier(submissionId: string): Promise<any> {
    const response = await this.api.get(`/dossier/validate/${submissionId}`);
    return response.data;
  }

  // Files API
  async uploadFile(
    file: File,
    projectId: string,
    productId?: string,
    submissionId?: string,
    uploadPurpose?: string,
    uploadedBy?: string,
    onProgress?: (progress: number) => void,
  ): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append("file", file);

    const config = {
      params: {
        project_id: projectId,
        ...(productId && { product_id: productId }),
        ...(submissionId && { submission_id: submissionId }),
        ...(uploadPurpose && { upload_purpose: uploadPurpose }),
        ...(uploadedBy && { uploaded_by: uploadedBy }),
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    };

    const response: AxiosResponse<UploadedFile> = await this.api.post(
      "/files/upload",
      formData,
      {
        ...config,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  }

  async uploadMultipleFiles(
    files: File[],
    projectId: string,
    productId?: string,
    submissionId?: string,
    onProgress?: (progress: number) => void,
  ): Promise<BatchUploadResult> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const config = {
      params: {
        project_id: projectId,
        ...(productId && { product_id: productId }),
        ...(submissionId && { submission_id: submissionId }),
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    };

    const response: AxiosResponse<BatchUploadResult> = await this.api.post(
      "/files/batch/upload",
      formData,
      {
        ...config,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  }

  async getFiles(
    projectId?: string,
    submissionId?: string,
    page = 1,
    size = 10,
  ): Promise<PaginatedResponse<UploadedFile>> {
    const params = {
      page,
      size,
      ...(projectId && { project_id: projectId }),
      ...(submissionId && { submission_id: submissionId }),
    };
    const response: AxiosResponse<PaginatedResponse<UploadedFile>> =
      await this.api.get("/files", { params });
    return response.data;
  }

  async getFile(id: string): Promise<UploadedFile> {
    const response: AxiosResponse<UploadedFile> = await this.api.get(
      `/files/${id}`,
    );
    return response.data;
  }

  async deleteFile(id: string): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.delete(
      `/files/${id}`,
    );
    return response.data;
  }

  async downloadFile(id: string): Promise<Blob> {
    const response: AxiosResponse<Blob> = await this.api.get(
      `/files/${id}/download`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  }

  async validateFileUpload(file: File, maxSizeMB?: number): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    const params = maxSizeMB ? { max_size_mb: maxSizeMB } : {};
    const response = await this.api.post("/files/validate", formData, {
      params,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  // AI API
  async extractContent(
    fileId: string,
    extractionOptions?: any,
  ): Promise<AIExtractionResponse> {
    const response: AxiosResponse<AIExtractionResponse> = await this.api.post(
      "/ai/extract",
      {
        file_id: fileId,
        extraction_options: extractionOptions,
        save_to_database: true,
      },
    );
    return response.data;
  }

  async extractContentEnhanced(
    fileId: string,
    extractionOptions?: any,
  ): Promise<any> {
    const response = await this.api.post("/ai/extract/enhanced", {
      file_id: fileId,
      extraction_options: extractionOptions,
    });
    return response.data;
  }

  async getExtractionStatus(
    extractionId: string,
  ): Promise<AIExtractionResponse> {
    const response: AxiosResponse<AIExtractionResponse> = await this.api.get(
      `/ai/extractions/${extractionId}`,
    );
    return response.data;
  }

  async getContentSuggestions(
    submissionId?: string,
    contentType?: string,
    minConfidence = 0.7,
    limit = 10,
  ): Promise<AIContentSuggestion[]> {
    const params = {
      ...(submissionId && { submission_id: submissionId }),
      ...(contentType && { content_type: contentType }),
      min_confidence: minConfidence,
      limit,
    };
    const response: AxiosResponse<AIContentSuggestion[]> = await this.api.get(
      "/ai/suggestions",
      { params },
    );
    return response.data;
  }

  async createProcessingJob(jobData: any): Promise<any> {
    const response = await this.api.post("/ai/jobs", jobData);
    return response.data;
  }

  async getProcessingJob(jobId: string): Promise<any> {
    const response = await this.api.get(`/ai/jobs/${jobId}`);
    return response.data;
  }

  async getAIModels(modelName?: string): Promise<Record<string, AIModelInfo>> {
    const params = modelName ? { model_name: modelName } : {};
    const response: AxiosResponse<Record<string, AIModelInfo>> =
      await this.api.get("/ai/models", { params });
    return response.data;
  }

  async generateQualityReport(submissionId: string): Promise<any> {
    const response = await this.api.get(`/ai/quality-report/${submissionId}`);
    return response.data;
  }

  async submitAIFeedback(feedbackData: any): Promise<any> {
    const response = await this.api.post("/ai/feedback", feedbackData);
    return response.data;
  }

  async getTrainingStats(): Promise<any> {
    const response = await this.api.get("/ai/training/stats");
    return response.data;
  }

  // Reviews API
  async getReviews(
    submissionId?: string,
    page = 1,
    size = 10,
  ): Promise<PaginatedResponse<HumanReview>> {
    const params = {
      page,
      size,
      ...(submissionId && { submission_id: submissionId }),
    };
    const response: AxiosResponse<PaginatedResponse<HumanReview>> =
      await this.api.get("/reviews", { params });
    return response.data;
  }

  async getReview(id: string): Promise<HumanReview> {
    const response: AxiosResponse<HumanReview> = await this.api.get(
      `/reviews/${id}`,
    );
    return response.data;
  }

  async createReview(reviewData: any): Promise<HumanReview> {
    const response: AxiosResponse<HumanReview> = await this.api.post(
      "/reviews",
      reviewData,
    );
    return response.data;
  }

  async submitReview(id: string, reviewData: any): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.post(
      `/reviews/${id}/submit`,
      reviewData,
    );
    return response.data;
  }

  // Dossier API
  async getSubmissionDossier(submissionId: string): Promise<any> {
    const response = await this.api.get(`/submissions/${submissionId}/dossier`);
    return response.data;
  }

  async regenerateSubmissionDossier(
    submissionId: string,
  ): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.post(
      `/submissions/${submissionId}/dossier/regenerate`,
    );
    return response.data;
  }

  async getDossierSection(
    submissionId: string,
    sectionId: string,
  ): Promise<any> {
    const response = await this.api.get(
      `/submissions/${submissionId}/dossier/sections/${sectionId}`,
    );
    return response.data;
  }

  async updateDossierSectionContent(
    submissionId: string,
    sectionId: string,
    content: string,
    updatedBy?: string,
  ): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.put(
      `/submissions/${submissionId}/dossier/sections/${sectionId}/content`,
      {
        content,
        updated_by: updatedBy,
      },
    );
    return response.data;
  }

  async markDossierSectionComplete(
    submissionId: string,
    sectionId: string,
    completedBy?: string,
  ): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.post(
      `/submissions/${submissionId}/dossier/sections/${sectionId}/complete`,
      {
        completed_by: completedBy,
      },
    );
    return response.data;
  }

  // Dashboard API
  async getDashboardStats(): Promise<DashboardStats> {
    const response: AxiosResponse<DashboardStats> =
      await this.api.get("/dashboard/stats");
    return response.data;
  }

  async getRecentActivity(limit = 10): Promise<any[]> {
    const response = await this.api.get("/dashboard/activity", {
      params: { limit },
    });
    return response.data;
  }

  // Regulatory API (guided submission wizard)
  async getRegulatoryCountries(): Promise<RegCountry[]> {
    const response: AxiosResponse<PaginatedResponse<RegCountry>> =
      await this.api.get("/regulatory/countries", {
        params: { is_active: true, page_size: 200 },
      });
    return response.data.items;
  }

  async getRegulatoryAuthorities(countryId: string): Promise<RegAuthority[]> {
    const response: AxiosResponse<PaginatedResponse<RegAuthority>> =
      await this.api.get("/regulatory/authorities", {
        params: { country_id: countryId, is_active: true, page_size: 200 },
      });
    return response.data.items;
  }

  async getRegulatoryIndustries(): Promise<RegIndustry[]> {
    const response: AxiosResponse<PaginatedResponse<RegIndustry>> =
      await this.api.get("/regulatory/industries", {
        params: { is_active: true, page_size: 200 },
      });
    return response.data.items;
  }

  async getRegulatoryRegulations(
    authorityId: string,
    industryId: string,
  ): Promise<RegRegulation[]> {
    const response: AxiosResponse<PaginatedResponse<RegRegulation>> =
      await this.api.get("/regulatory/regulations", {
        params: {
          authority_id: authorityId,
          industry_id: industryId,
          status: "Active",
          page_size: 200,
        },
      });
    return response.data.items;
  }

  async getRegulatorySubmissionTypes(
    regulationId: string,
  ): Promise<RegSubmissionType[]> {
    const response: AxiosResponse<PaginatedResponse<RegSubmissionType>> =
      await this.api.get("/regulatory/submission-types", {
        params: { regulation_id: regulationId, is_active: true, page_size: 200 },
      });
    return response.data.items;
  }

  async getRegulatoryRiskClasses(
    submissionTypeId: string,
  ): Promise<RegRiskClassification[]> {
    const response: AxiosResponse<RegRiskClassification[]> = await this.api.get(
      `/regulatory/submission-types/${submissionTypeId}/risk-classifications`,
    );
    return response.data;
  }

  async getRegulatorySubmissionProfiles(
    submissionTypeId: string,
  ): Promise<RegSubmissionProfile[]> {
    const response: AxiosResponse<RegSubmissionProfile[]> = await this.api.get(
      `/regulatory/submission-types/${submissionTypeId}/submission-profiles`,
    );
    return response.data;
  }

  // --- Submission Profile CRUD (admin) --- //
  async getSubmissionProfile(id: string): Promise<RegSubmissionProfileDetail> {
    const response: AxiosResponse<RegSubmissionProfileDetail> =
      await this.api.get(`/regulatory/submission-profiles/${id}`);
    return response.data;
  }

  async createSubmissionProfile(
    payload: Partial<RegSubmissionProfileDetail> & {
      submission_type_id: string;
      name: string;
      code: string;
    },
  ): Promise<RegSubmissionProfileDetail> {
    const response: AxiosResponse<RegSubmissionProfileDetail> =
      await this.api.post("/regulatory/submission-profiles", payload);
    return response.data;
  }

  async updateSubmissionProfile(
    id: string,
    payload: Partial<RegSubmissionProfileDetail>,
  ): Promise<RegSubmissionProfileDetail> {
    const response: AxiosResponse<RegSubmissionProfileDetail> =
      await this.api.put(`/regulatory/submission-profiles/${id}`, payload);
    return response.data;
  }

  async deleteSubmissionProfile(id: string): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.delete(
      `/regulatory/submission-profiles/${id}`,
    );
    return response.data;
  }

  // --- Configuration Registry: Types (admin) --- //
  async getConfigurationTypes(params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{ items: RegConfigurationType[]; total: number }> {
    const response: AxiosResponse<PaginatedResponse<RegConfigurationType>> =
      await this.api.get("/configuration/configuration-types", {
        params: { page_size: 20, ...params },
      });
    return { items: response.data.items, total: response.data.total };
  }

  // Convenience: all active configuration types (for dropdowns).
  async getAllConfigurationTypes(): Promise<RegConfigurationType[]> {
    const { items } = await this.getConfigurationTypes({
      is_active: true,
      page_size: 200,
    });
    return items;
  }

  async getConfigurationType(id: string): Promise<RegConfigurationType> {
    const response: AxiosResponse<RegConfigurationType> = await this.api.get(
      `/configuration/configuration-types/${id}`,
    );
    return response.data;
  }

  async createConfigurationType(
    payload: { code: string; name: string; description?: string | null; is_active?: boolean },
  ): Promise<RegConfigurationType> {
    const response: AxiosResponse<RegConfigurationType> = await this.api.post(
      "/configuration/configuration-types",
      payload,
    );
    return response.data;
  }

  async updateConfigurationType(
    id: string,
    payload: Partial<RegConfigurationType>,
  ): Promise<RegConfigurationType> {
    const response: AxiosResponse<RegConfigurationType> = await this.api.put(
      `/configuration/configuration-types/${id}`,
      payload,
    );
    return response.data;
  }

  async deleteConfigurationType(id: string): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.delete(
      `/configuration/configuration-types/${id}`,
    );
    return response.data;
  }

  // --- Configuration Registry: Profiles (admin) --- //
  async getConfigurationProfiles(params?: {
    search?: string;
    configuration_type_id?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{ items: RegConfigurationProfile[]; total: number }> {
    const response: AxiosResponse<PaginatedResponse<RegConfigurationProfile>> =
      await this.api.get("/configuration/configuration-profiles", {
        params: { page_size: 20, ...params },
      });
    return { items: response.data.items, total: response.data.total };
  }

  // Convenience: all active profiles for a configuration type (for dropdowns).
  async getConfigurationProfilesByType(
    configurationTypeId: string,
  ): Promise<RegConfigurationProfile[]> {
    const { items } = await this.getConfigurationProfiles({
      configuration_type_id: configurationTypeId,
      is_active: true,
      page_size: 200,
    });
    return items;
  }

  async getConfigurationProfile(
    id: string,
  ): Promise<RegConfigurationProfileDetail> {
    const response: AxiosResponse<RegConfigurationProfileDetail> =
      await this.api.get(`/configuration/configuration-profiles/${id}`);
    return response.data;
  }

  async createConfigurationProfile(
    payload: Partial<RegConfigurationProfileDetail> & {
      configuration_type_id: string;
      name: string;
      code: string;
    },
  ): Promise<RegConfigurationProfileDetail> {
    const response: AxiosResponse<RegConfigurationProfileDetail> =
      await this.api.post("/configuration/configuration-profiles", payload);
    return response.data;
  }

  async updateConfigurationProfile(
    id: string,
    payload: Partial<RegConfigurationProfileDetail>,
  ): Promise<RegConfigurationProfileDetail> {
    const response: AxiosResponse<RegConfigurationProfileDetail> =
      await this.api.put(`/configuration/configuration-profiles/${id}`, payload);
    return response.data;
  }

  async deleteConfigurationProfile(id: string): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.delete(
      `/configuration/configuration-profiles/${id}`,
    );
    return response.data;
  }

  // --- Template Version CRUD (admin; children of a submission profile) --- //
  async getProfileTemplateVersions(
    profileId: string,
  ): Promise<RegTemplateVersion[]> {
    const response: AxiosResponse<RegTemplateVersion[]> = await this.api.get(
      `/regulatory/submission-profiles/${profileId}/template-versions`,
    );
    return response.data;
  }

  async createTemplateVersion(
    payload: Partial<RegTemplateVersion> & {
      submission_profile_id: string;
      version: string;
    },
  ): Promise<RegTemplateVersion> {
    const response: AxiosResponse<RegTemplateVersion> = await this.api.post(
      "/regulatory/template-versions",
      payload,
    );
    return response.data;
  }

  async updateTemplateVersion(
    id: string,
    payload: Partial<RegTemplateVersion>,
  ): Promise<RegTemplateVersion> {
    const response: AxiosResponse<RegTemplateVersion> = await this.api.put(
      `/regulatory/template-versions/${id}`,
      payload,
    );
    return response.data;
  }

  async deleteTemplateVersion(id: string): Promise<MessageResponse> {
    const response: AxiosResponse<MessageResponse> = await this.api.delete(
      `/regulatory/template-versions/${id}`,
    );
    return response.data;
  }

  async setLatestTemplateVersion(id: string): Promise<RegTemplateVersion> {
    const response: AxiosResponse<RegTemplateVersion> = await this.api.post(
      `/regulatory/template-versions/${id}/set-latest`,
    );
    return response.data;
  }

  // Auto-resolves the latest active template version for a submission profile;
  // throws 404 if none exists.
  async getLatestTemplateVersion(
    submissionProfileId: string,
  ): Promise<RegTemplateVersion> {
    const response: AxiosResponse<RegTemplateVersion> = await this.api.get(
      "/regulatory/template-versions/latest",
      { params: { submission_profile_id: submissionProfileId } },
    );
    return response.data;
  }

  async getTemplateVersionRequiredDocuments(
    templateVersionId: string,
  ): Promise<RegRequiredDocument[]> {
    const response: AxiosResponse<RegRequiredDocument[]> = await this.api.get(
      `/regulatory/template-versions/${templateVersionId}/required-documents`,
    );
    return response.data;
  }

  async getTemplateVersionSections(
    templateVersionId: string,
  ): Promise<RegTemplateSection[]> {
    const response: AxiosResponse<RegTemplateSection[]> = await this.api.get(
      `/regulatory/template-versions/${templateVersionId}/sections`,
    );
    return response.data;
  }

  // Admin Templates browser: list every template version with its full
  // regulatory breadcrumb (one call), and fetch a single template's nested
  // section tree on demand.
  async getTemplateCatalog(): Promise<RegTemplateCatalogEntry[]> {
    const response: AxiosResponse<RegTemplateCatalogEntry[]> =
      await this.api.get("/regulatory/templates");
    return response.data;
  }

  async getTemplateVersionTree(
    templateVersionId: string,
  ): Promise<RegTemplateSectionNode[]> {
    const response: AxiosResponse<RegTemplateSectionNode[]> =
      await this.api.get(
        `/regulatory/template-versions/${templateVersionId}/section-tree`,
      );
    return response.data;
  }

  async getTemplateVersionValidationRules(
    templateVersionId: string,
  ): Promise<RegValidationRule[]> {
    const response: AxiosResponse<RegValidationRule[]> = await this.api.get(
      `/regulatory/template-versions/${templateVersionId}/validation-rules`,
    );
    return response.data;
  }

  // Guided (atomic) submission creation. The backend resolves the regulatory
  // chain + latest active template version and, in a single transaction, creates
  // the submission, dossier sections, required-document placeholders and the
  // validation checklist (rolling back entirely if any step fails).
  async createSubmissionGuided(payload: {
    project_id: string;
    product_id: string;
    submission_profile_id?: string;
    submission_type_id?: string;
    risk_classification_id?: string;
    target_submission_date?: string;
  }): Promise<any> {
    const response = await this.api.post("/submissions/guided", payload);
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.api.get("/health");
    return response.data;
  }

  // AI Service API
  async processFileWithAI(
    fileId: string,
    submissionId: string,
    options: any = {},
  ): Promise<any> {
    const response = await this.api.post("/ai/process-file", {
      file_id: fileId,
      submission_id: submissionId,
      processing_options: options,
    });
    return response.data;
  }

  async getSectionContentSuggestions(sectionId: string): Promise<any> {
    const response = await this.api.get(`/ai/suggestions/${sectionId}`);
    return response.data;
  }

  async analyzeSubmissionCompleteness(submissionId: string): Promise<any> {
    const response = await this.api.get(
      `/ai/analyze-submission/${submissionId}`,
    );
    return response.data;
  }

  async autoPopulateSubmission(submissionId: string): Promise<any> {
    const response = await this.api.post(`/ai/auto-populate/${submissionId}`);
    return response.data;
  }

  async getAIProcessingStats(): Promise<any> {
    const response = await this.api.get("/ai/stats");
    return response.data;
  }

  async extractTextFromFile(fileId: string): Promise<any> {
    const response = await this.api.post(`/ai/extract-text/${fileId}`);
    return response.data;
  }

  async generateSectionContent(sectionId: string): Promise<any> {
    const response = await this.api.post(
      `/ai/generate-section-content/${sectionId}`,
    );
    return response.data;
  }

  async analyzeDocumentCompleteness(submissionId: string): Promise<any> {
    const response = await this.api.post(
      `/ai/analyze-document-completeness/${submissionId}`,
    );
    return response.data;
  }

  async getAIServiceStatus(): Promise<any> {
    const response = await this.api.get("/ai/ai-status");
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
