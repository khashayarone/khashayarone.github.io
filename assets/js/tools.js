/**
 * ========================================================
 * KHASHAYAR.ONE
 * Tools Engine v1
 * ========================================================
 */

(() => {

    class ToolsEngine {

        constructor() {

            this.tools = [];

            this.currentPage = 1;

            this.perPage = 9;

            this.historyKey =
                "download_history";

        }

        /* =====================================
           Init
        ===================================== */

        async init() {

            await this.loadTools();

            this.renderTools();

        }

        /* =====================================
           Load JSON
        ===================================== */

        async loadTools() {

            try {

                const response =
                    await fetch(
                        "/data/tools.json",
                        {
                            cache: "no-cache"
                        }
                    );

                this.tools =
                    await response.json();

            }

            catch (error) {

                console.error(
                    "Tools Load Error",
                    error
                );

                this.tools = [];

            }

        }

        /* =====================================
           Tool Lookup
        ===================================== */

        getTool(id) {

            return this.tools.find(
                tool =>
                    tool.id === id
            );

        }

        /* =====================================
           Render Tools
        ===================================== */

        renderTools() {

            const grid =
                document.getElementById(
                    "tools-grid"
                );

            if (!grid) {

                return;

            }

            const start =
                (
                    this.currentPage - 1
                ) * this.perPage;

            const end =
                start + this.perPage;

            const pageTools =
                this.tools.slice(
                    start,
                    end
                );

            grid.innerHTML =
                pageTools
                    .map(tool => {

                        return `
                        <article
                            class="tool-card glass-card"

                            data-route="${tool.route}">

                            <div class="tool-icon">

                                <i
                                    data-lucide="${tool.icon}">
                                </i>

                            </div>

                            <h3>
                                ${tool.title}
                            </h3>

                            <p>
                                ${tool.description}
                            </p>

                            ${
                                !tool.enabled
                                ?

                                `
                                <span
                                class="tool-badge">

                                    Coming Soon

                                </span>
                                `
                                :

                                ""
                            }

                        </article>
                        `;

                    })
                    .join("");

            this.renderPagination();

            lucide.createIcons();

        }

        /* =====================================
           Pagination
        ===================================== */

        renderPagination() {

            const container =
                document.getElementById(
                    "tools-pagination"
                );

            if (!container) {

                return;

            }

            const totalPages =
                Math.ceil(
                    this.tools.length /
                    this.perPage
                );

            if (
                totalPages <= 1
            ) {

                container.innerHTML =
                    "";

                return;

            }

            let html = "";

            for (
                let i = 1;
                i <= totalPages;
                i++
            ) {

                html += `
                <button
                    class="${
                        i === this.currentPage
                        ? "active"
                        : ""
                    }"

                    data-page="${i}">

                    ${i}

                </button>
                `;

            }

            container.innerHTML =
                html;

            container
                .querySelectorAll(
                    "[data-page]"
                )
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () => {

                            this.currentPage =
                                Number(
                                    button.dataset.page
                                );

                            this.renderTools();

                            window.scrollTo({

                                top: 0,

                                behavior:
                                    "smooth"

                            });

                        }
                    );

                });

        }

        /* =====================================
           History
        ===================================== */

        getHistory() {

            return Storage.get(
                this.historyKey,
                []
            );

        }

        addHistory(item) {

            const history =
                this.getHistory();

            history.unshift({

                ...item,

                timestamp:
                    Date.now()

            });

            Storage.set(

                this.historyKey,

                history.slice(
                    0,
                    20
                )

            );

        }

        clearHistory() {

            Storage.set(

                this.historyKey,

                []

            );

        }

    }

    window.Tools =
        new ToolsEngine();

})();
