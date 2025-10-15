import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { logger } from '../utils/logger';

/**
 * API service for handling HTTP requests
 */

export interface RegisterData {
    rzUsername: string;
    email: string;
    rzPassword: string;
    displayName?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface AuthCheckData {
    rzUsername: string;
    rzPassword: string;
}

export interface NextcloudUserData {
    rzUsername: string;
    email: string;
    displayName?: string;
}

class ApiService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: import.meta.env.VITE_API_BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                // Don't log sensitive data (passwords)
                const safeData = config.data ? { ...config.data } : {};
                if (safeData.rzPassword) {
                    safeData.rzPassword = '[REDACTED]';
                }

                logger.logApiRequest(
                    config.method?.toUpperCase() || 'GET',
                    config.url || '',
                    safeData
                );
                return config;
            },
            (error) => {
                logger.logApiError('REQUEST', 'interceptor', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                logger.logApiResponse(
                    response.config.method?.toUpperCase() || 'GET',
                    response.config.url || '',
                    response.status,
                    response.data
                );
                return response;
            },
            (error: AxiosError) => {
                logger.logApiError(
                    error.config?.method?.toUpperCase() || 'UNKNOWN',
                    error.config?.url || '',
                    error
                );
                return Promise.reject(error);
            }
        );
    }

    /**
     * Check user eligibility with rzUsername and rzPassword
     */
    private async checkUserEligibility(authData: AuthCheckData): Promise<ApiResponse> {
        try {
            const response = await this.client.post<ApiResponse>('/auth', authData);
            return {
                success: true,
                data: response.data,
                message: 'User is eligible'
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    success: false,
                    error: error.response?.data?.message || error.message || 'User eligibility check failed',
                };
            }
            return {
                success: false,
                error: 'An unexpected error occurred during eligibility check',
            };
        }
    }

    /**
     * Create Nextcloud user
     */
    private async createNextcloudUser(userData: NextcloudUserData): Promise<ApiResponse> {
        try {
            const response = await this.client.post<ApiResponse>('/nextcloud/user', userData);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    success: false,
                    error: error.response?.data?.message || error.message || 'Nextcloud user creation failed',
                };
            }
            return {
                success: false,
                error: 'An unexpected error occurred during user creation',
            };
        }
    }

    /**
     * Register a new user (two-step process)
     */
    async register(data: RegisterData): Promise<ApiResponse> {
        // Step 1: Check user eligibility
        const eligibilityCheck = await this.checkUserEligibility({
            rzUsername: data.rzUsername,
            rzPassword: data.rzPassword
        });

        if (!eligibilityCheck.success) {
            return eligibilityCheck;
        }

        // Step 2: Create Nextcloud user if eligible
        const userCreation = await this.createNextcloudUser({
            rzUsername: data.rzUsername,
            email: data.email,
            displayName: data.displayName
        });

        return userCreation;
    }
}

export const apiService = new ApiService();
