/**
 * Khashayar One — Bale Connection Manager
 * Connection code generation, polling, state management
 * Enhanced: retry logic, connection check on load, better error handling
 * Part of Khashayar One Tool Platform
 */

const Bale = (() => {
    'use strict';

    const STORAGE_KEY = 'bale-connection';
    const CONNECTIONS_PATH = 'https://fozogame.com/bale-bot/connections';
    const BOT_USERNAME = 'githubdlrobot'; // Change to 'khashayarbot' for production
    const POLL_INTERVAL = 3000; // 3 seconds
    const POLL_MAX_ATTEMPTS = 60; // 3 minutes
    const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds — periodic check

    let pollTimer = null;
    let connectionCheckTimer = null;

    /**
     * Load connection state from localStorage
     * @returns {Object|null} Connection data or null
     */
    const getConnection = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (data && data.code) {
                    return data;
                }
            }
        } catch (e) {
            // Corrupted data — reset
            localStorage.removeItem(STORAGE_KEY);
        }
        return null;
    };

    /**
     * Save connection state to localStorage
     * @param {Object} data - Connection data
     */
    const saveConnection = (data) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('[Bale] Failed to save connection state');
        }
    };

    /**
     * Check if user is connected to Bale bot
     * @returns {boolean}
     */
    const isConnected = () => {
        const connection = getConnection();
        return connection && connection.status === 'connected' && connection.chat_id;
    };

    /**
     * Check if there's a pending connection
     * @returns {boolean}
     */
    const isPending = () => {
        const connection = getConnection();
        return connection && connection.status === 'pending';
    };

    /**
     * Generate a unique connection code
     * Format: XXXX-XXXX-XXXX
     * @returns {string} Connection code
     */
    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
    };

    /**
     * Create a new connection code and start polling
     * @returns {string} The generated code
     */
    const createConnection = () => {
        stopPolling();
        
        const code = generateCode();
        console.log('[Bale] Generated code:', code);
        
        saveConnection({
            code: code,
            status: 'pending',
            chat_id: null,
            username: '',
            first_name: '',
            created_at: Date.now()
        });

        console.log('[Bale] Starting polling...');
        startPolling(code);
        
        EventBus.emit(EventBus.Events.BALE_CODE_GENERATED, { code });

        return code;
    };

    /**
     * Start polling for connection confirmation
     * @param {string} code - Connection code to poll for
     */
    const startPolling = (code) => {
        // Clear existing poll
        stopPolling();
        
        let attempts = 0;
        let consecutiveFailures = 0;

        const poll = async () => {
            attempts++;

            if (attempts > POLL_MAX_ATTEMPTS) {
                console.log('[Bale] Polling timed out after', POLL_MAX_ATTEMPTS, 'attempts');
                stopPolling();
                
                // Mark connection as failed
                const connection = getConnection();
                if (connection && connection.status === 'pending') {
                    connection.status = 'timeout';
                    saveConnection(connection);
                }
                return;
            }

            try {
                const url = `${CONNECTIONS_PATH}/${code}.json`;
                const response = await fetch(url, { cache: 'no-store' });

                if (response.ok) {
                    const data = await response.json();
                    consecutiveFailures = 0;

                    if (data.status === 'connected') {
                        // Connection confirmed!
                        stopPolling();
                        
                        const connectionData = {
                            code: code,
                            status: 'connected',
                            chat_id: data.chat_id,
                            username: data.username || '',
                            first_name: data.first_name || '',
                            output_preference: data.output_preference || 'file',
                            connected_at: data.connected_at || new Date().toISOString()
                        };

                        saveConnection(connectionData);

                        // Update UI badge
                        if (typeof UI !== 'undefined') {
                            UI.updateConnectionBadge('connected', 'متصل');
                        }

                        // Emit event
                        EventBus.emit(EventBus.Events.BALE_CONNECTED, connectionData);

                        console.log('[Bale] ✅ Connection confirmed:', data.first_name);
                        
                        // Start periodic connection check
                        startConnectionCheck();
                        return;
                    }
                } else if (response.status === 404) {
                    // File not created yet — normal during pending
                    consecutiveFailures = 0;
                } else {
                    consecutiveFailures++;
                    if (consecutiveFailures > 10) {
                        console.warn('[Bale] Too many consecutive failures, slowing down...');
                        stopPolling();
                        // Restart with longer interval
                        pollTimer = setTimeout(() => startPolling(code), 10000);
                        return;
                    }
                }
            } catch (e) {
                consecutiveFailures++;
                // Network error — continue polling
                if (consecutiveFailures > 10) {
                    console.warn('[Bale] Network issues, slowing down polling...');
                    stopPolling();
                    pollTimer = setTimeout(() => startPolling(code), 10000);
                    return;
                }
            }

            // Continue polling
            pollTimer = setTimeout(poll, POLL_INTERVAL);
        };

        // Start first poll immediately
        poll();
    };

    /**
     * Stop polling
     */
    const stopPolling = () => {
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
    };

    /**
     * Start periodic connection check
     * Verifies connection file still exists and is valid
     */
    const startConnectionCheck = () => {
        stopConnectionCheck();
        
        connectionCheckTimer = setInterval(async () => {
            const connection = getConnection();
            if (!connection || connection.status !== 'connected') {
                stopConnectionCheck();
                return;
            }

            try {
                const url = `${CONNECTIONS_PATH}/${connection.code}.json`;
                const response = await fetch(url, { cache: 'no-store' });
                
                if (!response.ok) {
                    // Connection file deleted — user may have disconnected
                    console.warn('[Bale] Connection file not found — marking as disconnected');
                    disconnect(true); // Silent disconnect
                }
            } catch (e) {
                // Network error — ignore, check again next interval
            }
        }, CONNECTION_CHECK_INTERVAL);
    };

    /**
     * Stop periodic connection check
     */
    const stopConnectionCheck = () => {
        if (connectionCheckTimer) {
            clearInterval(connectionCheckTimer);
            connectionCheckTimer = null;
        }
    };

    /**
     * Disconnect from Bale bot
     * @param {boolean} silent - If true, don't emit event or show UI changes
     */
    const disconnect = (silent = false) => {
        stopPolling();
        stopConnectionCheck();
        localStorage.removeItem(STORAGE_KEY);
        
        if (!silent) {
            if (typeof UI !== 'undefined') {
                UI.updateConnectionBadge('disconnected', 'قطع');
            }
            EventBus.emit(EventBus.Events.BALE_DISCONNECTED, {});
        }
    };

    /**
     * Resume polling for existing pending connection
     * Called on page load
     */
    const resumePolling = () => {
        const connection = getConnection();
        
        if (!connection) return;
        
        if (connection.status === 'pending') {
            startPolling(connection.code);
        } else if (connection.status === 'connected') {
            startConnectionCheck();
        }
        // If timeout or other status, do nothing — user needs to create new code
    };

    /**
     * Check connection status on page load
     * @returns {Promise<string>} 'connected' | 'pending' | 'disconnected' | 'timeout'
     */
    const checkStatus = async () => {
        const connection = getConnection();
        
        if (!connection) return 'disconnected';
        
        if (connection.status === 'connected') {
            // Verify connection still valid
            try {
                const url = `${CONNECTIONS_PATH}/${connection.code}.json`;
                const response = await fetch(url, { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'connected') {
                        return 'connected';
                    }
                }
                // Connection invalid — clean up
                disconnect(true);
                return 'disconnected';
            } catch (e) {
                // Can't verify — assume connected (offline mode)
                return 'connected';
            }
        }
        
        return connection.status;
    };

    /**
     * Update output preference
     * @param {string} preference - 'file' | 'link' | 'both'
     */
    const updatePreference = (preference) => {
        const connection = getConnection();
        if (connection) {
            connection.output_preference = preference;
            saveConnection(connection);
            EventBus.emit(EventBus.Events.BALE_PREFERENCE_UPDATED, { preference });
        }
    };

    /**
     * Get output preference
     * @returns {string} 'file' | 'link' | 'both'
     */
    const getPreference = () => {
        const connection = getConnection();
        return (connection && connection.output_preference) ? connection.output_preference : 'file';
    };

    /**
     * Get bot username
     * @returns {string}
     */
    const getBotUsername = () => BOT_USERNAME;

    return {
        getConnection,
        isConnected,
        isPending,
        generateCode,
        createConnection,
        startPolling,
        stopPolling,
        disconnect,
        resumePolling,
        checkStatus,
        updatePreference,
        getPreference,
        getBotUsername
    };
})();

Object.freeze(Bale);
