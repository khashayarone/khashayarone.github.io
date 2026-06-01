/**
 * ========================================================
 * KHASHAYAR.ONE
 * Router Engine v1
 * ========================================================
 */

(() => {

    class Router {

        constructor() {

            this.view =
                document.getElementById("view");

            this.routes = {

                home: "/pages/home.html",

                settings:
                    "/pages/settings.html"

            };

        }

        init() {

            window.addEventListener(
                "popstate",
                () => {

                    this.loadFromURL();

                }
            );

            document.addEventListener(
                "click",
                (event) => {

                    const link =
                        event.target.closest(
                            "[data-route]"
                        );

                    if (!link) return;

                    event.preventDefault();

                    const route =
                        link.dataset.route;

                    this.navigate(route);

                }
            );

            this.loadFromURL();

        }

        getCurrentRoute() {

            const params =
                new URLSearchParams(
                    window.location.search
                );

            const page =
                params.get("page");

            if (!page) {

                return "home";

            }

            return page;

        }

        navigate(route) {

            const url =
                route === "home"
                    ? "/"
                    : `?page=${route}`;

            history.pushState(
                {},
                "",
                url
            );

            this.load(route);

        }

        loadFromURL() {

            const route =
                this.getCurrentRoute();

            this.load(route);

        }

        resolveRoute(route) {

            if (
                this.routes[route]
            ) {

                return this.routes[route];

            }

            if (
                route.startsWith(
                    "tool-"
                )
            ) {

                const toolId =
                    route.replace(
                        "tool-",
                        ""
                    );

                return `/pages/tools/${toolId}.html`;

            }

            return null;

        }

        showSkeleton() {

            this.view.innerHTML = `
                <section class="page-skeleton">

                    <div class="skeleton hero"></div>

                    <div class="skeleton card"></div>
                    <div class="skeleton card"></div>
                    <div class="skeleton card"></div>

                </section>
            `;

        }

        async load(route) {

            const file =
                this.resolveRoute(
                    route
                );

            if (!file) {

                this.show404();

                return;

            }

            this.showSkeleton();

            try {

                const response =
                    await fetch(file, {
                        cache: "no-cache"
                    });

                if (
                    !response.ok
                ) {

                    throw new Error(
                        "Page Not Found"
                    );

                }

                const html =
                    await response.text();

                this.render(html);

            }

            catch (error) {

                console.error(
                    error
                );

                this.show404();

            }

        }

        render(html) {

            this.view.innerHTML =
                html;

            if (
                window.lucide
            ) {

                lucide.createIcons();

            }

            document.dispatchEvent(

                new CustomEvent(
                    "page:loaded"
                )

            );

        }

        show404() {

            this.view.innerHTML = `
                <section class="container">

                    <div class="glass-card"
                        style="
                        padding:40px;
                        text-align:center;
                        margin-top:40px">

                        <h2>
                            صفحه پیدا نشد
                        </h2>

                        <p>
                            محتوای درخواستی
                            وجود ندارد.
                        </p>

                    </div>

                </section>
            `;

        }

        register(name, path) {

            this.routes[name] =
                path;

        }

    }

    window.Router =
        new Router();

})();
