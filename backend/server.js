const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, 'latest.log');

// Logger utility with file writing
const logger = {
    writeToFile: (logEntry) => {
        try {
            fs.appendFileSync(logFilePath, logEntry + '\n', 'utf8');
        } catch (err) {
            console.error('Failed to write to log file:', err);
        }
    },

    // Sanitize sensitive data before logging
    sanitize: (data) => {
        if (!data || typeof data !== 'object') return data;
        const sanitized = { ...data };

        // Remove sensitive fields
        const sensitiveFields = ['rzPassword', 'password', 'token', 'secret', 'apiKey', 'authorization'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    },

    info: (message, data = {}) => {
        const safeData = logger.sanitize(data);
        const logEntry = `[INFO] ${new Date().toISOString()} - ${message} ${JSON.stringify(safeData)}`;
        console.log(logEntry);
        logger.writeToFile(logEntry);
    },

    error: (message, error = {}) => {
        const safeError = logger.sanitize(error);
        const logEntry = `[ERROR] ${new Date().toISOString()} - ${message} ${JSON.stringify(safeError)}`;
        console.error(logEntry);
        logger.writeToFile(logEntry);
    },

    warn: (message, data = {}) => {
        const safeData = logger.sanitize(data);
        const logEntry = `[WARN] ${new Date().toISOString()} - ${message} ${JSON.stringify(safeData)}`;
        console.warn(logEntry);
        logger.writeToFile(logEntry);
    },

    debug: (message, data = {}) => {
        if (process.env.NODE_ENV === 'development') {
            const safeData = logger.sanitize(data);
            const logEntry = `[DEBUG] ${new Date().toISOString()} - ${message} ${JSON.stringify(safeData)}`;
            console.debug(logEntry);
            logger.writeToFile(logEntry);
        }
    }
};// Middleware
app.use(cors());
app.use(express.json());

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Request logging middleware
app.use((req, res, next) => {
    // Don't log passwords
    const safeBody = req.body ? { ...req.body } : {};
    if (safeBody.rzPassword) {
        safeBody.rzPassword = '[REDACTED]';
    }

    logger.info(`Incoming ${req.method} request`, {
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        body: safeBody
    });
    next();
});

// Nextcloud configuration
const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL;
const NEXTCLOUD_ADMIN_USER = process.env.NEXTCLOUD_ADMIN_USER;
const NEXTCLOUD_ADMIN_PASSWORD = process.env.NEXTCLOUD_ADMIN_PASSWORD;

const RAUMZEIT_URL = process.env.RAUMZEIT_URL;

// Custom API endpoint
app.post('/api/auth', async (req, res) => {
    try {
        const { rzUsername, rzPassword } = req.body;

        // Validate input
        if (!rzUsername || !rzPassword) {
            logger.warn('Missing credentials', { rzUsername: rzUsername ? 'provided' : 'missing' });
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Input validation - prevent injection attacks
        if (typeof rzUsername !== 'string' || typeof rzPassword !== 'string') {
            logger.warn('Invalid credential types', { rzUsername: typeof rzUsername });
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials format'
            });
        }

        // Sanitize username (allow only alphanumeric and common chars)
        if (!/^[a-zA-Z0-9._-]+$/.test(rzUsername)) {
            logger.warn('Invalid username format', { rzUsername });
            return res.status(400).json({
                success: false,
                message: 'Invalid username format'
            });
        }

        // Check password length (basic validation)
        if (rzPassword.length < 1 || rzPassword.length > 256) {
            logger.warn('Invalid password length');
            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });
        }

        logger.info('Authentication attempt', { rzUsername });

        // Use HTTPS for Raumzeit API
        const raumzeitResponse = await axios.post(
            `${RAUMZEIT_URL}/api/v1/persons`,
            {
                login: rzUsername,
                password: rzPassword
            },
            {
                timeout: 10000, // 10 second timeout
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'NextcloudRegistration/1.0'
                }
            }
        );

        logger.debug('Raumzeit API response', {
            status: raumzeitResponse.status,
            success: raumzeitResponse.data.success
        });

        // Check if response contains user data (no explicit success field in actual response)
        if (raumzeitResponse.status === 200 && raumzeitResponse.data) {
            const userData = raumzeitResponse.data;

            // Check if user has IWI in departments array
            const hasIWI = userData.departments &&
                Array.isArray(userData.departments) &&
                userData.departments.includes('IWI');

            const isStudent = userData.personType === 'STUDENT';

            logger.debug('User validation', {
                rzUsername,
                hasIWI,
                isStudent,
                departments: userData.departments,
                personType: userData.personType
            });

            if (!isStudent) {
                logger.warn('Access denied: Not a student', { rzUsername, personType: userData.personType });
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Person is not a student'
                });
            }

            if (!hasIWI) {
                logger.warn('Access denied: Not part of IWI', {
                    rzUsername,
                    departments: userData.departments
                });
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Student is not part of IWI Fakultät'
                });
            }

            logger.info('Authentication successful', { rzUsername, hasIWI, isStudent });
            res.status(200).json({
                success: true,
                message: 'Authentication successful',
                hasIWI: hasIWI,
                isStudent: isStudent
            });
        } else {
            logger.warn('Authentication failed: Invalid credentials', { rzUsername, data: raumzeitResponse.data });
            res.status(401).json({
                success: false,
                message: 'Authentication failed'
            });
        }
    } catch (error) {
        logger.error('Authentication API error', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status
        });

        // More specific error messages
        if (error.code === 'ENOTFOUND') {
            return res.status(503).json({
                success: false,
                message: 'Authentication service unavailable. Please check your VPN connection or contact support.'
            });
        }

        if (error.response?.status === 401 || error.response?.status === 403) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Nextcloud user creation endpoint
app.post('/api/nextcloud/user', async (req, res) => {
    try {
        const { rzUsername, email, displayName } = req.body;
        logger.info('Nextcloud user creation attempt', { rzUsername, email, displayName });

        if (!rzUsername || !email) {
            logger.warn('Missing required fields', { rzUsername, email });
            return res.status(400).json({
                success: false,
                message: 'Username and email are required'
            });
        }

        // Validate Nextcloud admin credentials
        if (!NEXTCLOUD_ADMIN_USER || !NEXTCLOUD_ADMIN_PASSWORD) {
            logger.error('Nextcloud admin credentials not configured', {
                hasUser: !!NEXTCLOUD_ADMIN_USER,
                hasPassword: !!NEXTCLOUD_ADMIN_PASSWORD
            });
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: Nextcloud admin credentials not set'
            });
        }

        // Check if user already exists
        logger.debug('Checking if user exists in Nextcloud', { rzUsername });
        try {
            const userCheckResponse = await axios.get(
                `${NEXTCLOUD_URL}/ocs/v2.php/cloud/users/${rzUsername}`,
                {
                    headers: {
                        'OCS-APIRequest': 'true',
                        'Accept': 'application/json',
                        'Authorization': 'Basic ' + Buffer.from(`${NEXTCLOUD_ADMIN_USER}:${NEXTCLOUD_ADMIN_PASSWORD}`).toString('base64')
                    },
                    validateStatus: (status) => status < 500 // Don't throw on 4xx errors
                }
            );

            // Check HTTP status first
            if (userCheckResponse.status === 401) {
                logger.error('Nextcloud authentication failed - invalid admin credentials', {
                    rzUsername,
                    httpStatus: userCheckResponse.status,
                    adminUser: NEXTCLOUD_ADMIN_USER
                });
                return res.status(500).json({
                    success: false,
                    message: 'Server configuration error: Invalid Nextcloud admin credentials'
                });
            }

            // Nextcloud OCS API check the OCS status code
            const ocsStatusCode = userCheckResponse.data?.ocs?.meta?.statuscode;
            const ocsStatus = userCheckResponse.data?.ocs?.meta?.status;
            const ocsMessage = userCheckResponse.data?.ocs?.meta?.message;

            logger.debug('User check response', {
                rzUsername,
                httpStatus: userCheckResponse.status,
                ocsStatus,
                ocsStatusCode,
                ocsMessage
            });

            // If OCS status code is 100 or 200, user exists
            if (ocsStatusCode === 100 || ocsStatusCode === 200 || ocsStatus === 'ok') {
                logger.warn('User already exists in Nextcloud', { rzUsername });
                return res.status(409).json({
                    success: false,
                    message: 'User already exists in Nextcloud',
                    username: rzUsername
                });
            }

            // If OCS status code is 404 or 998, user doesn't exist - proceed with creation
            if (ocsStatusCode === 404 || ocsStatusCode === 998 || ocsStatus === 'failure') {
                logger.debug('User does not exist, proceeding with creation', { rzUsername });
            }
        } catch (checkError) {
            // Network or other errors
            logger.error('Error checking user existence', {
                rzUsername,
                status: checkError.response?.status,
                statusCode: checkError.response?.data?.ocs?.meta?.statuscode,
                message: checkError.message,
                code: checkError.code
            });

            // Only throw if it's not a network/connection error or expected 404
            if (checkError.code !== 'ECONNREFUSED' && checkError.code !== 'ENOTFOUND') {
                // If it's a 401, return configuration error
                if (checkError.response?.status === 401) {
                    return res.status(500).json({
                        success: false,
                        message: 'Server configuration error: Invalid Nextcloud admin credentials'
                    });
                }
                throw checkError;
            }
        }

        logger.debug('Creating user in Nextcloud', { rzUsername, email });

        // Create URLSearchParams for form data
        const formData = new URLSearchParams();
        formData.append('userid', rzUsername);
        formData.append('email', email);
        if (displayName) {
            formData.append('displayName', displayName);
        }

        const nextcloudResponse = await axios.post(
            `${NEXTCLOUD_URL}/ocs/v2.php/cloud/users`,
            formData.toString(),
            {
                headers: {
                    'OCS-APIRequest': 'true',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Authorization': 'Basic ' + Buffer.from(`${NEXTCLOUD_ADMIN_USER}:${NEXTCLOUD_ADMIN_PASSWORD}`).toString('base64')
                },
                validateStatus: (status) => status < 500 // Don't throw on 4xx errors
            }
        );

        // Check HTTP status first
        if (nextcloudResponse.status === 401) {
            logger.error('Nextcloud authentication failed during user creation', {
                rzUsername,
                httpStatus: nextcloudResponse.status,
                adminUser: NEXTCLOUD_ADMIN_USER
            });
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: Invalid Nextcloud admin credentials'
            });
        }

        // Check OCS status code
        const ocsStatusCode = nextcloudResponse.data?.ocs?.meta?.statuscode;
        const ocsStatus = nextcloudResponse.data?.ocs?.meta?.status;
        const ocsMessage = nextcloudResponse.data?.ocs?.meta?.message;

        logger.debug('User creation response', {
            rzUsername,
            httpStatus: nextcloudResponse.status,
            ocsStatus,
            ocsStatusCode,
            ocsMessage
        });

        // OCS status code 100 or 200 means success
        if (ocsStatusCode === 100 || ocsStatusCode === 200 || ocsStatus === 'ok') {
            logger.info('User created successfully in Nextcloud', { rzUsername, email });
            res.status(201).json({
                success: true,
                message: 'User created successfully in Nextcloud - Check your email for finishing the registration.',
                username: rzUsername
            });
        } else if (ocsStatusCode === 997) {
            logger.error('Nextcloud authentication failed (OCS 997)', {
                rzUsername,
                adminUser: NEXTCLOUD_ADMIN_USER
            });
            res.status(500).json({
                success: false,
                message: 'Server configuration error: Invalid Nextcloud admin credentials'
            });
        } else {
            logger.error('Failed to create user in Nextcloud', {
                rzUsername,
                ocsStatus,
                ocsStatusCode,
                ocsMessage
            });
            res.status(400).json({
                success: false,
                message: ocsMessage || 'Failed to create user in Nextcloud',
                ocsStatusCode
            });
        }

    } catch (error) {
        logger.error('Nextcloud API error', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data,
            status: error.response?.status
        });

        if (error.response) {
            res.status(error.response.status).json({
                success: false,
                message: 'Failed to create user in Nextcloud',
                error: error.response.data
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    logger.debug('Health check');
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        message: err.message,
        stack: err.stack,
        path: req.path
    });
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    logger.info(`Server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nextcloudUrl: NEXTCLOUD_URL ? 'configured' : 'NOT configured',
        raumzeitUrl: RAUMZEIT_URL ? 'configured' : 'NOT configured'
    });
});

module.exports = app;