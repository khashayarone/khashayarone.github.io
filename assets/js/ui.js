/**
 * ========================================================
 * KHASHAYAR.ONE
 * UI Engine v1
 * ========================================================
 */

(() => {

    class UIEngine {

        constructor() {

            this.mobileMenu =
                document.getElementById(
                    "mobile-menu"
                );

            this.themeButton =
                document.getElementById(
                    "theme-toggle"
                );

            this.menuButton =
                document.getElementById(
                    "mobile-menu-toggle"
                );

        }

        init() {

            this.initTheme();

            this.initMenu();

            this.initLenis();

            this.bindEvents();

        }

        bindEvents() {

            document.addEventListener(
                "page:loaded",
                () => {

                    this.animatePage();

                    this.refreshIcons();

                }
            );

        }

        /* =====================================
           Theme
        ===================================== */

        initTheme() {

            const theme =
                Storage.get(
                    "theme",
                    "dark"
                );

            document.documentElement
                .setAttribute(
                    "data-theme",
                    theme
                );

            this.themeButton?.addEventListener(
                "click",
                () => {

                    const current =
                        Storage.get(
                            "theme",
                            "dark"
                        );

                    const next =
                        current === "dark"
                            ? "light"
                            : "dark";

                    Storage.set(
                        "theme",
                        next
                    );

                    document.documentElement
                        .setAttribute(
                            "data-theme",
                            next
                        );

                    this.toast(
                        `Theme: ${next}`
                    );

                }
            );

        }

        /* =====================================
           Mobile Menu
        ===================================== */

        initMenu() {

            if (
                !this.menuButton ||
                !this.mobileMenu
            ) {

                return;

            }

            this.menuButton.addEventListener(
                "click",
                () => {

                    this.mobileMenu
                        .classList.toggle(
                            "active"
                        );

                }
            );

            document.addEventListener(
                "click",
                (event) => {

                    if (
                        !this.mobileMenu.classList.contains(
                            "active"
                        )
                    ) {

                        return;

                    }

                    const insideMenu =
                        event.target.closest(
                            "#mobile-menu"
                        );

                    const menuButton =
                        event.target.closest(
                            "#mobile-menu-toggle"
                        );

                    if (
                        !insideMenu &&
                        !menuButton
                    ) {

                        this.mobileMenu
                            .classList.remove(
                                "active"
                            );

                    }

                }
            );

        }

        closeMenu() {

            this.mobileMenu?.classList.remove(
                "active"
            );

        }

        /* =====================================
           Lenis
        ===================================== */

        initLenis() {

            if (
                typeof Lenis ===
                "undefined"
            ) {

                return;

            }

            this.lenis =
                new Lenis();

            const raf = (time) => {

                this.lenis.raf(
                    time
                );

                requestAnimationFrame(
                    raf
                );

            };

            requestAnimationFrame(
                raf
            );

        }

        /* =====================================
           Animations
        ===================================== */

        animatePage() {

            if (
                typeof gsap ===
                "undefined"
            ) {

                return;

            }

            gsap.from(
                "#view > *",
                {
                    opacity: 0,
                    y: 20,
                    duration: .45,
                    ease: "power2.out"
                }
            );

        }

        /* =====================================
           Icons
        ===================================== */

        refreshIcons() {

            if (
                window.lucide
            ) {

                lucide.createIcons();

            }

        }

        /* =====================================
           Toast
        ===================================== */

        toast(
            message,
            type = "default"
        ) {

            let color =
                "#7c3aed";

            if (
                type === "success"
            ) {

                color =
                    "#22c55e";

            }

            if (
                type === "error"
            ) {

                color =
                    "#ef4444";

            }

            if (
                typeof Toastify ===
                "undefined"
            ) {

                console.log(
                    message
                );

                return;

            }

            Toastify({

                text: message,

                duration: 3000,

                gravity: "bottom",

                position: "center",

                close: true,

                style: {
                    background: color
                }

            }).showToast();

        }

        /* =====================================
           Loader Helpers
        ===================================== */

        showLoader() {

            document.body.classList.add(
                "loading"
            );

        }

        hideLoader() {

            document.body.classList.remove(
                "loading"
            );

        }

    }

    window.UI =
        new UIEngine();

})();
