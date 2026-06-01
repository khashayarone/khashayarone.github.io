/**
 * ========================================================
 * KHASHAYAR.ONE
 * Bootstrap Engine v2 Production
 * ========================================================
 */

(() => {

    class App {

        init() {

            try {

                this.initStorage();

                this.initUI();

                this.initRouter();

                this.initEvents();

                this.initIcons();

                console.log(
                    "🚀 Khashayar.one Ready"
                );

            }

            catch (error) {

                console.error(
                    "[APP INIT ERROR]",
                    error
                );

            }

        }

        initStorage() {

            if (
                typeof Storage !==
                "undefined"
            ) {

                Storage.init?.();

            }

        }

        initUI() {

            if (
                typeof UI !==
                "undefined"
            ) {

                UI.init?.();

            }

        }

        initRouter() {

            if (
                typeof Router !==
                "undefined"
            ) {

                Router.init?.();

            }

        }

        initIcons() {

            if (
                window.lucide
            ) {

                lucide.createIcons();

            }

        }

        initEvents() {

            document.addEventListener(

                "page:loaded",

                () => {

                    this.onPageLoaded();

                }

            );

        }

        onPageLoaded() {

            try {

                this.initIcons();

                this.initTools();

                this.initToolPages();

            }

            catch (error) {

                console.error(
                    "[PAGE LOAD ERROR]",
                    error
                );

            }

        }

        initTools() {

            if (
                typeof Tools !==
                "undefined"
            ) {

                Tools.init?.();

            }

        }

        initToolPages() {

            const page =
                document.body.dataset.page ||
                "";

            switch (page) {

                case "youtube":

                    if (
                        typeof Youtube !==
                        "undefined"
                    ) {

                        Youtube.init?.();

                    }

                    break;

                case "instagram":

                    if (
                        typeof Instagram !==
                        "undefined"
                    ) {

                        Instagram.init?.();

                    }

                    break;

                case "telegram":

                    if (
                        typeof Telegram !==
                        "undefined"
                    ) {

                        Telegram.init?.();

                    }

                    break;

                case "github":

                    if (
                        typeof GithubTool !==
                        "undefined"
                    ) {

                        GithubTool.init?.();

                    }

                    break;

            }

        }

    }

const app =
    new App();

window.App =
    app;

document.addEventListener(

    "DOMContentLoaded",

    () => {

        app.init();

    }

);

})();
