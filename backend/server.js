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

    info: (message, data = {}) => {
        const logEntry = `[INFO] ${new Date().toISOString()} - ${message} ${JSON.stringify(data)}`;
        console.log(logEntry);
        logger.writeToFile(logEntry);
    },

    error: (message, error = {}) => {
        const logEntry = `[ERROR] ${new Date().toISOString()} - ${message} ${JSON.stringify(error)}`;
        console.error(logEntry);
        logger.writeToFile(logEntry);
    },

    warn: (message, data = {}) => {
        const logEntry = `[WARN] ${new Date().toISOString()} - ${message} ${JSON.stringify(data)}`;
        console.warn(logEntry);
        logger.writeToFile(logEntry);
    },

    debug: (message, data = {}) => {
        if (process.env.NODE_ENV === 'development') {
            const logEntry = `[DEBUG] ${new Date().toISOString()} - ${message} ${JSON.stringify(data)}`;
            console.debug(logEntry);
            logger.writeToFile(logEntry);
        }
    }
};

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`Incoming ${req.method} request`, {
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
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
        logger.info('Authentication attempt', { rzUsername });

        const raumzeitResponse = await axios.post(`${RAUMZEIT_URL}/api/v1/persons`, {
            login: rzUsername,
            password: rzPassword
        });

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

        // Check if user already exists
        logger.debug('Checking if user exists in Nextcloud', { rzUsername });
        try {
            const userCheckResponse = await axios.get(
                `${NEXTCLOUD_URL}/ocs/v1.php/cloud/users/${rzUsername}`,
                {
                    headers: {
                        'OCS-APIRequest': 'true'
                    },
                    auth: {
                        username: NEXTCLOUD_ADMIN_USER,
                        password: NEXTCLOUD_ADMIN_PASSWORD
                    }
                }
            );

            if (userCheckResponse.status === 200) {
                logger.warn('User already exists in Nextcloud', { rzUsername });
                return res.status(409).json({
                    success: false,
                    message: 'User already exists in Nextcloud',
                    username: rzUsername
                });
            }
        } catch (checkError) {
            // If user doesn't exist, the API returns 404, which is expected
            if (checkError.response && checkError.response.status !== 404) {
                logger.error('Error checking user existence', {
                    rzUsername,
                    status: checkError.response?.status,
                    message: checkError.message
                });
                throw checkError;
            }
            logger.debug('User does not exist (404), proceeding with creation', { rzUsername });
        }

        logger.debug('Creating user in Nextcloud', { rzUsername, email });
        const nextcloudResponse = await axios.post(
            `${NEXTCLOUD_URL}/ocs/v1.php/cloud/users`,
            {
                userid: rzUsername,
                email: email,
                displayName: displayName || rzUsername
            },
            {
                headers: {
                    'OCS-APIRequest': 'true',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                auth: {
                    username: NEXTCLOUD_ADMIN_USER,
                    password: NEXTCLOUD_ADMIN_PASSWORD
                }
            }
        );

        if (nextcloudResponse.status === 200) {
            logger.info('User created successfully in Nextcloud', { rzUsername, email });
            res.status(201).json({
                success: true,
                message: 'User created successfully in Nextcloud',
                username: rzUsername
            });
        } else {
            logger.error('Failed to create user in Nextcloud', {
                rzUsername,
                status: nextcloudResponse.status
            });
            throw new Error('Failed to create user in Nextcloud');
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