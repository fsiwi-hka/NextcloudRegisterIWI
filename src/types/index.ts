/**
 * Shared TypeScript types and interfaces for the application
 */

// User registration data
export interface RegisterData {
    rzUsername: string;
    email: string;
    rzPassword: string;
    anzeigename?: string;
}

// Form validation errors
export interface FormErrors {
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    fullName?: string;
}

// API response structure
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

// User data (from API)
export interface User {
    id: number;
    rzUsername: string;
    email: string;
    anzeigename?: string;
    createdAt?: string;
}

// Message types for user feedback
export type MessageType = 'success' | 'error' | 'warning' | 'info';

export interface Message {
    type: MessageType;
    text: string;
}

// Log levels
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
