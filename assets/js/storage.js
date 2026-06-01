/**
 * ========================================================
 * KHASHAYAR.ONE
 * Storage Engine v1
 * ========================================================
 */

(() => {

    const STORAGE_KEY = "khashayar_one";

    const DEFAULT_STATE = {

        version: 1,

        theme: "dark",

        language: "fa",

        animations: true,

        tokens: {

            github: "",

            cloudflare: "",

            telegram: ""

        },

        settings: {

        },

        tools: {

        }

    };

    class StorageEngine {

        constructor() {

            this.init();

        }

        init() {

            try {

                const existing =
                    localStorage.getItem(STORAGE_KEY);

                if (!existing) {

                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(DEFAULT_STATE)
                    );

                }

            } catch (error) {

                console.error(
                    "[Storage] Init Error",
                    error
                );

            }

        }

        getState() {

            try {

                const raw =
                    localStorage.getItem(STORAGE_KEY);

                if (!raw) {

                    return {
                        ...DEFAULT_STATE
                    };

                }

                return JSON.parse(raw);

            } catch (error) {

                console.error(
                    "[Storage] Read Error",
                    error
                );

                return {
                    ...DEFAULT_STATE
                };

            }

        }

        saveState(state) {

            try {

                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(state)
                );

                return true;

            } catch (error) {

                console.error(
                    "[Storage] Save Error",
                    error
                );

                return false;

            }

        }

        get(path, fallback = null) {

            try {

                const state =
                    this.getState();

                const keys =
                    path.split(".");

                let current = state;

                for (const key of keys) {

                    if (
                        current === undefined ||
                        current === null
                    ) {

                        return fallback;

                    }

                    current =
                        current[key];

                }

                return current ?? fallback;

            } catch {

                return fallback;

            }

        }

        set(path, value) {

            try {

                const state =
                    this.getState();

                const keys =
                    path.split(".");

                let current =
                    state;

                for (
                    let i = 0;
                    i < keys.length - 1;
                    i++
                ) {

                    const key =
                        keys[i];

                    if (
                        typeof current[key] !== "object" ||
                        current[key] === null
                    ) {

                        current[key] = {};

                    }

                    current =
                        current[key];

                }

                current[
                    keys[keys.length - 1]
                ] = value;

                return this.saveState(state);

            } catch (error) {

                console.error(
                    "[Storage] Set Error",
                    error
                );

                return false;

            }

        }

        remove(path) {

            try {

                const state =
                    this.getState();

                const keys =
                    path.split(".");

                let current =
                    state;

                for (
                    let i = 0;
                    i < keys.length - 1;
                    i++
                ) {

                    current =
                        current[keys[i]];

                    if (!current) {

                        return false;

                    }

                }

                delete current[
                    keys[keys.length - 1]
                ];

                return this.saveState(state);

            } catch {

                return false;

            }

        }

        reset() {

            return this.saveState(
                structuredClone(DEFAULT_STATE)
            );

        }

        export() {

            try {

                return JSON.stringify(
                    this.getState(),
                    null,
                    2
                );

            } catch {

                return "{}";

            }

        }

        import(json) {

            try {

                const parsed =
                    JSON.parse(json);

                return this.saveState(
                    parsed
                );

            } catch (error) {

                console.error(
                    "[Storage] Import Error",
                    error
                );

                return false;

            }

        }

    }

    window.Storage =
        new StorageEngine();

})();
