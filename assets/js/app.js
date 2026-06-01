/**
 * ========================================================
 * KHASHAYAR.ONE
 * Bootstrap Engine v1
 * ========================================================
 */

(() => {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            try {

                if (
                    typeof Storage !==
                    "undefined"
                ) {

                    Storage.init?.();

                }

                if (
                    typeof UI !==
                    "undefined"
                ) {

                    UI.init();

                }

                if (
                    typeof Router !==
                    "undefined"
                ) {

                    Router.init();

                }

                if (
                    window.lucide
                ) {

                    lucide.createIcons();

                }

                console.log(
                    "🚀 Khashayar.one Ready"
                );

            }

            catch (error) {

                console.error(
                    "Bootstrap Error",
                    error
                );

            }

        }
    );

})();
