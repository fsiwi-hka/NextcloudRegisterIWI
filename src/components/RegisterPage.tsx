import React, { useState, type FormEvent } from 'react';
import { apiService, type RegisterData } from '../services/api';
import { logger } from '../utils/logger';
import './RegisterPage.css';
import iwiLogo from '../assets/iwi-logo.png';

interface FormErrors {
    rzUsername?: string;
    email?: string;
    rzPassword?: string;
    displayName?: string;
}

export const RegisterPage: React.FC = () => {
    const [formData, setFormData] = useState<RegisterData>({
        rzUsername: '',
        email: '',
        rzPassword: '',
        displayName: '',
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // RZ Username validation
        if (!formData.rzUsername) {
            newErrors.rzUsername = 'RZ Username is required';
        }

        // Email validation
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // RZ Password validation
        if (!formData.rzPassword) {
            newErrors.rzPassword = 'RZ Password is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear error for this field when user starts typing
        if (errors[name as keyof FormErrors]) {
            setErrors((prev) => ({
                ...prev,
                [name]: undefined,
            }));
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitMessage(null);

        logger.info('Form submission started', { rzUsername: formData.rzUsername });

        if (!validateForm()) {
            logger.warn('Form validation failed', errors);
            return;
        }

        setIsLoading(true);

        try {
            const response = await apiService.register(formData);

            if (response.success) {
                logger.info('Registration successful', { rzUsername: formData.rzUsername });
                setSubmitMessage({
                    type: 'success',
                    text: response.message || 'Registration successful! You can now log in.',
                });
                // Reset form
                setFormData({
                    rzUsername: '',
                    email: '',
                    rzPassword: '',
                    displayName: '',
                });
            } else {
                logger.error('Registration failed', response.error);
                setSubmitMessage({
                    type: 'error',
                    text: response.error || 'Registration failed. Please try again.',
                });
            }
        } catch (error) {
            logger.error('Unexpected error during registration', error);
            setSubmitMessage({
                type: 'error',
                text: 'An unexpected error occurred. Please try again later.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <div className="register-header">
                    <div className="logo">
                        <img src={iwiLogo} alt="IWI HKA Logo" className="logo-img" />
                    </div>
                    <h1>Nextcloud Account erstellen</h1>
                    <p className="subtitle">Registrieren Sie sich mit Ihren RZ-Zugangsdaten</p>
                </div>

                <form onSubmit={handleSubmit} className="register-form">
                    {submitMessage && (
                        <div className={`message message-${submitMessage.type}`}>
                            {submitMessage.text}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="rzUsername">
                            RZ Username <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            id="rzUsername"
                            name="rzUsername"
                            value={formData.rzUsername}
                            onChange={handleInputChange}
                            placeholder="Enter your RZ username"
                            disabled={isLoading}
                            className={errors.rzUsername ? 'error' : ''}
                        />
                        {errors.rzUsername && <span className="error-text">{errors.rzUsername}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="rzPassword">
                            RZ Password <span className="required">*</span>
                        </label>
                        <input
                            type="password"
                            id="rzPassword"
                            name="rzPassword"
                            value={formData.rzPassword}
                            onChange={handleInputChange}
                            placeholder="Enter your RZ password"
                            disabled={isLoading}
                            className={errors.rzPassword ? 'error' : ''}
                        />
                        {errors.rzPassword && <span className="error-text">{errors.rzPassword}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="displayName">Anzeigename (Optional)</label>
                        <input
                            type="text"
                            id="displayName"
                            name="displayName"
                            value={formData.displayName}
                            onChange={handleInputChange}
                            placeholder="Enter your display name"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">
                            Email <span className="required">*</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter your email"
                            disabled={isLoading}
                            className={errors.email ? 'error' : ''}
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="register-footer">
                    <p>
                        Already have an account? <a href="https://cloud.iwi-hka.de">Log in</a>
                    </p>
                </div>
            </div>
        </div>
    );
};
