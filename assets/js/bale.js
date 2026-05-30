/**
 * Khashayar One — Bale Connection Manager
 * Connection code generation, polling, state management
 * Part of Khashayar One Tool Platform
 */

const Bale = (() => {
    'use strict';

    const STORAGE_KEY = 'bale-connection';
    const CONNECTIONS_PATH = 'data/bale-connections';
    const BOT_USERNAME = 'githubdlrobot'; // Test bot — change to 'khashayarbot' for production
    const POLL_INTERVAL = 3000; // 3 seconds
    const POLL_MAX_ATTEMPTS = 40; // 2 minutes

    let pollTimer = null;

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
            // Corrupted data
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
        return connection && connection.status === 'connected';
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
        const code = generateCode();
        
        saveConnection({
            code: code,
            status: 'pending',
            chat_id: null,
            username: '',
            first_name: '',
            created_at: Date.now()
        });

        // Start polling for confirmation
        startPolling(code);
        
        // Emit event
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

        const poll = async () => {
            attempts++;

            if (attempts > POLL_MAX_ATTEMPTS) {
                console.log('[Bale] Polling timed out');
                stopPolling();
                return;
            }

            try {
                const url = `${CONNECTIONS_PATH}/${code}.json`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();

                    if (data.status === 'connected') {
                        // Connection confirmed!
                        stopPolling();
                        
                        const connectionData = {
                            code: code,
                            status: 'connected',
                            chat_id: data.chat_id,
                            username: data.username || '',
                            first_name: data.first_name || '',
                            connected_at: data.connected_at || new Date().toISOString()
                        };

                        saveConnection(connectionData);

                        // Update UI
                        UI.updateConnectionBadge('connected', 'متصل');

                        // Emit event
                        EventBus.emit(EventBus.Events.BALE_CONNECTED, connectionData);

                        console.log('[Bale] Connection confirmed:', data.first_name);
                        return;
                    }
                }
            } catch (e) {
                // File not ready yet — continue polling
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
     * Disconnect from Bale bot
     */
    const disconnect = () => {
        stopPolling();
        localStorage.removeItem(STORAGE_KEY);
        UI.updateConnectionBadge('disconnected', 'قطع');
        EventBus.emit(EventBus.Events.BALE_DISCONNECTED, {});
    };

    /**
     * Resume polling for existing pending connection
     * Called on page load
     */
    const resumePolling = () => {
        const connection = getConnection();
        if (connection && connection.status === 'pending') {
            startPolling(connection.code);
        }
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
        updatePreference,
        getPreference,
        getBotUsername
    };
})();

Object.freeze(Bale);
