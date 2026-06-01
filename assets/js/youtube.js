(() => {

    class YoutubeDownloader {

        constructor() {

            this.jobId = null;

            this.pollTimer = null;

            this.storageKey =
                "youtube_active_job";

        }

        init() {

            this.bindEvents();

            this.loadHistory();

            this.resumeJob();

        }

        bindEvents() {

            const button =
                document.getElementById(
                    "start-download"
                );

            if (!button) {

                return;

            }

            button.addEventListener(
                "click",
                () => {

                    this.start();

                }
            );

        }

        async start() {

            const url =
                document
                    .getElementById("yt-url")
                    .value
                    .trim();

            const quality =
                document
                    .getElementById("yt-quality")
                    .value;

            const mediaType =
                document
                    .getElementById(
                        "yt-media-type"
                    )
                    .value;

            if (!url) {

                UI.toast(
                    "لینک را وارد کنید"
                );

                return;

            }

            this.showStatus();

            this.updateStep(
                "queued",
                "درخواست ثبت شد..."
            );

            try {

                const response =
                    await this.dispatchJob({

                        url,

                        quality,

                        mediaType

                    });

                this.jobId =
                    response.job_id;

                Storage.set(

                    this.storageKey,

                    this.jobId

                );

                this.startPolling();

            }

            catch (error) {

                console.error(error);

                UI.toast(
                    "خطا در ارسال درخواست"
                );

            }

        }

        async dispatchJob(data) {

            return {

                success: true,

                job_id:
                    crypto.randomUUID()

            };

        }

        startPolling() {

            clearInterval(
                this.pollTimer
            );

            this.pollTimer =
                setInterval(
                    () => {

                        this.checkStatus();

                    },
                    5000
                );

        }

        async checkStatus() {

            if (!this.jobId) {

                return;

            }

            const result =
                await this.fetchJobStatus(
                    this.jobId
                );

            this.updateStep(

                result.status,

                result.message

            );

            if (
                result.status ===
                "completed"
            ) {

                clearInterval(
                    this.pollTimer
                );

                this.renderResult(
                    result
                );

                Tools.addHistory({

                    title:
                        result.title,

                    url:
                        result.file_url

                });

                Storage.remove(
                    this.storageKey
                );

            }

        }

        async fetchJobStatus() {

            return {

                status:
                    "completed",

                message:
                    "دانلود آماده است",

                title:
                    "Sample Video",

                creator:
                    "YouTube",

                duration:
                    320,

                file_url:
                    "#"

            };

        }

        showStatus() {

            document
                .getElementById(
                    "job-status-card"
                )
                .classList
                .remove(
                    "hidden"
                );

        }

        updateStep(
            status,
            message
        ) {

            const steps =
                document.querySelectorAll(
                    ".job-step"
                );

            steps.forEach(
                step => {

                    step.classList.remove(
                        "active"
                    );

                }
            );

            const current =
                document.querySelector(
                    `[data-step="${status}"]`
                );

            if (current) {

                current.classList.add(
                    "active"
                );

            }

            const msg =
                document.getElementById(
                    "job-message"
                );

            if (msg) {

                msg.textContent =
                    message;

            }

        }

        renderResult(data) {

            const card =
                document.getElementById(
                    "result-card"
                );

            const content =
                document.getElementById(
                    "result-content"
                );

            card.classList.remove(
                "hidden"
            );

            content.innerHTML = `

                <div class="result-meta">

                    <h3>
                        ${data.title}
                    </h3>

                    <p>
                        ${data.creator}
                    </p>

                    <p>
                        ${data.duration}s
                    </p>

                </div>

                <div class="result-actions">

                    <a
                        href="${data.file_url}"
                        target="_blank"
                        class="btn-primary">

                        دانلود فایل

                    </a>

                    <button
                        id="copy-link"
                        class="btn-secondary">

                        کپی لینک

                    </button>

                </div>

            `;

            const copyBtn =
                document.getElementById(
                    "copy-link"
                );

            if (copyBtn) {

                copyBtn.addEventListener(
                    "click",
                    async () => {

                        await navigator
                            .clipboard
                            .writeText(
                                data.file_url
                            );

                        UI.toast(
                            "لینک کپی شد"
                        );

                    }
                );

            }

        }

        loadHistory() {

            const container =
                document.getElementById(
                    "history-list"
                );

            if (!container) {

                return;

            }

            const history =
                Tools.getHistory();

            if (
                history.length === 0
            ) {

                container.innerHTML =
                    `
                    <p>
                    هنوز دانلودی ثبت نشده
                    </p>
                    `;

                return;

            }

            container.innerHTML =
                history
                    .map(item => {

                        return `
                        <div
                        class="history-item">

                            <strong>
                                ${item.title}
                            </strong>

                        </div>
                        `;

                    })
                    .join("");

        }

        resumeJob() {

            const activeJob =
                Storage.get(
                    this.storageKey
                );

            if (
                !activeJob
            ) {

                return;

            }

            this.jobId =
                activeJob;

            this.showStatus();

            this.startPolling();

        }

    }

    window.Youtube =
        new YoutubeDownloader();

})();
