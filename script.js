// ==========================================================================
// LEETVERSE MINUTES OF MEETING GENERATOR
// Executive Client-Side JavaScript
// Features: Real-time Live Sync, Official Background Templates (first-page / other-pages)
// ==========================================================================

const momForm = document.getElementById("momForm");
const previewContent = document.getElementById("previewContent");
const downloadPdf = document.getElementById("downloadPdf");
const saveStatus = document.getElementById("saveStatus");
const saveDot = document.getElementById("saveDot");

// Controls
const resetBtn = document.getElementById("resetBtn");
const printDocBtn = document.getElementById("printDocBtn");
const liveClockTime = document.getElementById("liveClockTime");
const liveClockDate = document.getElementById("liveClockDate");

const STORAGE_KEY = "leetverse_mom_data_v5";

let meetingData = null;

// Form field IDs
const fieldIds = [
    "meetingTitle",
    "domain",
    "meetingDate",
    "meetingTime",
    "meetingMode",
    "venue",
    "attendance",
    "agenda",
    "discussion",
    "actionItems",
    "preparedBy"
];

// ==========================================================================
// 1. LIVE DIGITAL CLOCK
// ==========================================================================
function updateLiveClock() {
    const now = new Date();

    if (liveClockTime) {
        liveClockTime.textContent = now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });
    }

    if (liveClockDate) {
        liveClockDate.textContent = now.toLocaleDateString("en-US", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }
}

setInterval(updateLiveClock, 1000);
updateLiveClock();

// ==========================================================================
// 2. HELPER UTILITIES
// ==========================================================================
function getValue(id) {
    const field = document.getElementById(id);
    return field ? field.value.trim() : "";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };
        return entities[character];
    });
}

function getDocRefNumber(dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const year = d.getFullYear() || 2026;
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `LV-MOM-${year}${month}${day}`;
}

// Estimate rendered pixel height of a section block
function estimateBlockHeight(content) {
    if (!content || !content.trim()) return 0;
    const lines = content.trim().split("\n");
    let visualLines = 0;
    lines.forEach(function (line) {
        visualLines += Math.max(1, Math.ceil(line.trim().length / 80));
    });
    return 34 + (visualLines * 20);
}

// Estimate rendered pixel height of attendees pills
function estimateAttendanceHeight(rawAttendance) {
    if (!rawAttendance || !rawAttendance.trim()) return 0;
    const attendees = rawAttendance.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (attendees.length === 0) return 0;
    const rows = Math.ceil(attendees.length / 5);
    return 34 + (rows * 28);
}

// Estimate rendered pixel height of meta table
function estimateMetaTableHeight(data) {
    let rows = 0;
    if (data.title) rows++;
    if (data.domain || data.mode) rows++;
    if (data.date || data.time) rows++;
    if (data.venue) rows++;
    if (rows === 0) return 0;
    return 16 + (rows * 28);
}

// Clean Section Block Builder (No trailing/leading template spaces)
function createSectionBlock(title, content) {
    if (!content || !content.trim()) return "";
    return `<div class="doc-block"><div class="doc-block-header"><span class="doc-block-title">${escapeHTML(title)}</span><div class="doc-block-line"></div></div><div class="doc-block-body">${escapeHTML(content.trim())}</div></div>`;
}

// Clean Attendance Block Builder
function createAttendanceBlock(rawAttendance) {
    if (!rawAttendance || !rawAttendance.trim()) return "";
    const attendees = rawAttendance.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (attendees.length === 0) return "";
    const pills = attendees.map(a => `<span class="attendee-pill">${escapeHTML(a)}</span>`).join("");
    return `<div class="doc-block"><div class="doc-block-header"><span class="doc-block-title">Attendance</span><div class="doc-block-line"></div></div><div class="doc-block-body attendance-body"><div class="attendees-pills-wrap">${pills}</div></div></div>`;
}

// Compact Metadata Table Builder (Only renders rows with content)
function createMetaTable(data) {
    const rows = [];
    if (data.title) {
        rows.push(`<div class="meta-row full"><span class="meta-label">Meeting Title:</span><span class="meta-val">${escapeHTML(data.title)}</span></div>`);
    }
    if (data.domain) {
        rows.push(`<div class="meta-row"><span class="meta-label">Department:</span><span class="meta-val">${escapeHTML(data.domain)}</span></div>`);
    }
    if (data.mode) {
        rows.push(`<div class="meta-row"><span class="meta-label">Mode:</span><span class="meta-val">${escapeHTML(data.mode)}</span></div>`);
    }
    if (data.date) {
        const formattedDate = new Date(data.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        });
        rows.push(`<div class="meta-row"><span class="meta-label">Date:</span><span class="meta-val">${escapeHTML(formattedDate)}</span></div>`);
    }
    if (data.time) {
        const formattedTime = new Date("2000-01-01T" + data.time).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
        rows.push(`<div class="meta-row"><span class="meta-label">Time:</span><span class="meta-val">${escapeHTML(formattedTime)}</span></div>`);
    }
    if (data.venue) {
        rows.push(`<div class="meta-row full"><span class="meta-label">Venue / Link:</span><span class="meta-val">${escapeHTML(data.venue)}</span></div>`);
    }
    if (rows.length === 0) return "";
    return `<div class="doc-meta-table"><div class="meta-table-grid">${rows.join("")}</div></div>`;
}

// Clean Sign-off Row Builder
function createSignoffRow(preparedBy) {
    return `<div class="doc-signoff-row"><div class="signoff-box"><span class="signoff-label">Prepared By</span><span class="signoff-name">${escapeHTML(preparedBy || "Not specified")}</span><div class="signoff-line"></div></div><div class="signoff-box" style="text-align: right; align-items: flex-end;"><span class="signoff-label">Verified By</span><span class="signoff-name">Leetverse</span><div class="signoff-line"></div></div></div>`;
}

// Clean Page Footer
function createPageFooter(currentPage, totalPages) {
    return `<footer class="doc-footer-meta"><span>Leetverse • Minutes of Meeting</span><span>Page ${currentPage} of ${totalPages}</span></footer>`;
}

// ==========================================================================
// 3. PERSISTENCE & AUTOSAVE
// ==========================================================================
function saveFormData() {
    const data = {};

    fieldIds.forEach(function (id) {
        const field = document.getElementById(id);
        if (field) {
            data[id] = field.value;
        }
    });

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        if (saveStatus) {
            saveStatus.textContent = "Auto-saved";
        }
        if (saveDot) {
            saveDot.style.background = "#10b981";
        }
    } catch (error) {
        console.warn("Storage warning:", error);
    }
}

function restoreFormData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (!savedData) return false;

        const data = JSON.parse(savedData);
        let hasContent = false;

        fieldIds.forEach(function (id) {
            const field = document.getElementById(id);
            if (field && data[id] !== undefined) {
                field.value = data[id];
                if (data[id].trim()) hasContent = true;
            }
        });

        return hasContent;
    } catch (error) {
        console.error("Restore error:", error);
        return false;
    }
}

// ==========================================================================
// 4. LIVE DOCUMENT PREVIEW (ZERO OVERLAPPING, CLEAN MULTI-PAGE FLOW)
// ==========================================================================
function generatePreview() {
    meetingData = {
        title: getValue("meetingTitle"),
        domain: getValue("domain"),
        date: getValue("meetingDate"),
        time: getValue("meetingTime"),
        mode: getValue("meetingMode"),
        venue: getValue("venue"),
        attendance: getValue("attendance"),
        agenda: getValue("agenda"),
        discussion: getValue("discussion"),
        actionItems: getValue("actionItems"),
        preparedBy: getValue("preparedBy")
    };

    const isEmpty = !meetingData.title &&
                    !meetingData.domain &&
                    !meetingData.date &&
                    !meetingData.time &&
                    !meetingData.venue &&
                    !meetingData.attendance &&
                    !meetingData.agenda &&
                    !meetingData.discussion &&
                    !meetingData.actionItems;

    if (isEmpty) {
        previewContent.innerHTML = `
            <div class="a4-page first-page">
                <div class="empty-preview-placeholder">
                    <div class="empty-logo-preview">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                    </div>
                    <h3>Meeting Preview</h3>
                    <p>Enter meeting details above to populate the document.</p>
                </div>
            </div>
        `;
        return;
    }

    const metaTableHTML = createMetaTable(meetingData);
    const attendanceBlockHTML = createAttendanceBlock(meetingData.attendance);
    const agendaBlockHTML = createSectionBlock("Agenda", meetingData.agenda);
    const discussionBlockHTML = createSectionBlock("Discussed Points & Outcomes", meetingData.discussion);
    const actionItemsBlockHTML = createSectionBlock("Action Items", meetingData.actionItems);
    const signoffHTML = createSignoffRow(meetingData.preparedBy);

    const metaTableHeight = estimateMetaTableHeight(meetingData);
    const attendanceHeight = estimateAttendanceHeight(meetingData.attendance);
    const agendaHeight = estimateBlockHeight(meetingData.agenda);
    const discussionHeight = estimateBlockHeight(meetingData.discussion);
    const actionItemsHeight = estimateBlockHeight(meetingData.actionItems);

    const titleBarHTML = `<div class="doc-title-bar"><h1 class="doc-main-title">MINUTES OF THE MEETING</h1></div>`;
    const titleBarHeight = 40;
    const signoffHeight = 75;
    const footerHeight = 25;

    // Available content budget on Page 1 before any risk of overlap: 820px
    const PAGE_1_CAPACITY = 820;
    const PAGE_OTHER_CAPACITY = 920;

    const totalEstimatedHeight = titleBarHeight +
                                 metaTableHeight +
                                 attendanceHeight +
                                 agendaHeight +
                                 discussionHeight +
                                 actionItemsHeight +
                                 signoffHeight +
                                 footerHeight;

    if (totalEstimatedHeight <= PAGE_1_CAPACITY) {
        // Fits comfortably on Page 1 (standard 1-page document, zero overlapping)
        previewContent.innerHTML = `
            <div class="a4-page first-page">
                ${titleBarHTML}
                ${metaTableHTML}
                ${attendanceBlockHTML}
                ${agendaBlockHTML}
                ${discussionBlockHTML}
                ${actionItemsBlockHTML}
                ${signoffHTML}
                ${createPageFooter(1, 1)}
            </div>
        `;
    } else {
        // Multi-page document:
        let p1ContentHeight = titleBarHeight + metaTableHeight + attendanceHeight + agendaHeight + footerHeight;
        let p1HasDiscussion = false;

        // Can Page 1 also comfortably fit the discussion section?
        if (discussionHeight > 0 && (p1ContentHeight + discussionHeight <= PAGE_1_CAPACITY - 40)) {
            p1HasDiscussion = true;
            p1ContentHeight += discussionHeight;
        }

        // Check if discussion + actionItems exceed Page 2
        const p2ContentHeight = (p1HasDiscussion ? 0 : discussionHeight) + actionItemsHeight + signoffHeight + footerHeight;
        const needsPage3 = p2ContentHeight > PAGE_OTHER_CAPACITY;

        if (!needsPage3) {
            // 2 Page Flow
            previewContent.innerHTML = `
                <div class="a4-page first-page">
                    ${titleBarHTML}
                    ${metaTableHTML}
                    ${attendanceBlockHTML}
                    ${agendaBlockHTML}
                    ${p1HasDiscussion ? discussionBlockHTML : ""}
                    ${createPageFooter(1, 2)}
                </div>
                <div class="a4-page other-page">
                    ${!p1HasDiscussion ? discussionBlockHTML : ""}
                    ${actionItemsBlockHTML}
                    ${signoffHTML}
                    ${createPageFooter(2, 2)}
                </div>
            `;
        } else {
            // 3 Page Flow for massive documents
            previewContent.innerHTML = `
                <div class="a4-page first-page">
                    ${titleBarHTML}
                    ${metaTableHTML}
                    ${attendanceBlockHTML}
                    ${agendaBlockHTML}
                    ${createPageFooter(1, 3)}
                </div>
                <div class="a4-page other-page">
                    ${discussionBlockHTML}
                    ${createPageFooter(2, 3)}
                </div>
                <div class="a4-page other-page">
                    ${actionItemsBlockHTML}
                    ${signoffHTML}
                    ${createPageFooter(3, 3)}
                </div>
            `;
        }
    }
}

// ==========================================================================
// 5. EVENT LISTENERS
// ==========================================================================

fieldIds.forEach(function (id) {
    const field = document.getElementById(id);
    if (field) {
        field.addEventListener("input", function () {
            saveFormData();
            generatePreview();
        });
        field.addEventListener("change", function () {
            saveFormData();
            generatePreview();
        });
    }
});

momForm.addEventListener("submit", function (e) {
    e.preventDefault();
    saveFormData();
    generatePreview();

    document.getElementById("previewSection")?.scrollIntoView({
        behavior: "smooth"
    });
});

function clearAllFields() {
    if (confirm("Clear all meeting fields?")) {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}

        momForm.reset();
        meetingData = null;
        generatePreview();

        if (saveStatus) {
            saveStatus.textContent = "Cleared";
        }
    }
}

momForm.addEventListener("reset", function (e) {
    e.preventDefault();
    clearAllFields();
});

if (resetBtn) {
    resetBtn.addEventListener("click", clearAllFields);
}

if (printDocBtn) {
    printDocBtn.addEventListener("click", function () {
        saveFormData();
        generatePreview();
        setTimeout(function () {
            window.print();
        }, 80);
    });
}

// ==========================================================================
// 6. PDF EXPORT (MATCHING EXACT MULTI-PAGE FLOW)
// ==========================================================================

function loadExternalScript(src) {
    return new Promise(function (resolve, reject) {
        const script = document.createElement("script");
        script.src = src;
        script.onload = function () {
            resolve();
        };
        script.onerror = function () {
            reject(new Error("Unable to load: " + src));
        };
        document.head.appendChild(script);
    });
}

async function ensureJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) {
        return window.jspdf.jsPDF;
    }

    const backupCDNs = [
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
        "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js"
    ];

    for (const url of backupCDNs) {
        try {
            await loadExternalScript(url);
            if (window.jspdf && window.jspdf.jsPDF) {
                return window.jspdf.jsPDF;
            }
        } catch (error) {
            console.warn("CDN fallback attempt:", error);
        }
    }

    throw new Error("Unable to load the PDF engine.");
}

async function ensureHtml2Canvas() {
    if (window.html2canvas) {
        return window.html2canvas;
    }

    const backupCDNs = [
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
        "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.js"
    ];

    for (const url of backupCDNs) {
        try {
            await loadExternalScript(url);
            if (window.html2canvas) {
                return window.html2canvas;
            }
        } catch (error) {
            console.warn("html2canvas fallback attempt:", error);
        }
    }

    return null;
}

let cachedFirstPageData = null;
let cachedOtherPagesData = null;

function loadOptimizedBackgroundImage(src, maxWidth = 1488, quality = 0.82) {
    return new Promise(function (resolve) {
        const image = new Image();
        image.crossOrigin = "Anonymous";
        image.onload = function () {
            try {
                // Downsample large image to crisp 180 DPI A4 (1488 x 2105)
                const scale = Math.min(1, maxWidth / image.naturalWidth);
                const targetW = Math.round(image.naturalWidth * scale);
                const targetH = Math.round(image.naturalHeight * scale);

                const canvas = document.createElement("canvas");
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext("2d");

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, targetW, targetH);
                ctx.drawImage(image, 0, 0, targetW, targetH);

                const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(jpegDataUrl);
            } catch (err) {
                console.warn("Canvas compression fallback:", err);
                resolve(src);
            }
        };
        image.onerror = function () {
            resolve(null);
        };
        image.src = src;
    });
}

downloadPdf.addEventListener("click", async function () {
    saveFormData();
    generatePreview();

    if (!meetingData || (!meetingData.title && !meetingData.agenda && !meetingData.discussion)) {
        alert("Please fill in the meeting details before exporting the PDF.");
        return;
    }

    const originalText = downloadPdf.innerHTML;
    downloadPdf.disabled = true;
    downloadPdf.innerHTML = `
        <svg class="btn-icon" style="animation: spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        <span>Exporting...</span>
    `;

    try {
        const jsPDF = await ensureJsPDF();
        const html2canvasLib = await ensureHtml2Canvas();

        const pages = previewContent.querySelectorAll(".a4-page");
        const sanitizedTitle = (meetingData.title || "Meeting-Minutes")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 30);

        // =================================================================
        // METHOD 1: EXACT PREVIEW REPLICA (html2canvas -> jsPDF)
        // Captures metadata table, green attendee pills, borders & exact styling
        // =================================================================
        if (html2canvasLib && pages.length > 0) {
            const pdf = new jsPDF({
                orientation: "p",
                unit: "mm",
                format: "a4",
                compress: true
            });

            for (let i = 0; i < pages.length; i++) {
                if (i > 0) {
                    pdf.addPage("a4", "p");
                }

                // Render page element at 2x resolution for high print crispness
                const canvas = await html2canvasLib(pages[i], {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    logging: false
                });

                // Encode at high quality JPEG (quality 0.84 keeps file size ~150KB per page)
                const imgData = canvas.toDataURL("image/jpeg", 0.84);
                pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
            }

            pdf.save(`Leetverse-MOM-${sanitizedTitle}.pdf`);
            return;
        }

        // =================================================================
        // METHOD 2: HIGH-FIDELITY VECTOR FALLBACK (If html2canvas unavailable)
        // With minimal gap below top header banner and styled components
        // =================================================================
        if (!cachedFirstPageData) {
            cachedFirstPageData = await loadOptimizedBackgroundImage("IMAGES/first-page.png", 1488, 0.82);
        }
        if (!cachedOtherPagesData) {
            cachedOtherPagesData = await loadOptimizedBackgroundImage("IMAGES/other-pages.png", 1488, 0.82);
        }

        const firstPageBackground = cachedFirstPageData;
        const otherPagesBackground = cachedOtherPagesData;

        const pdf = new jsPDF({
            orientation: "p",
            unit: "mm",
            format: "a4",
            compress: true
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const margin = 16;
        const contentWidth = pageWidth - margin * 2;

        // Tight gap below banner: Banner ends at 33.8mm, so content starts at 38mm
        const firstPageStartY = firstPageBackground ? 38 : 32;
        const otherPageStartY = otherPagesBackground ? 18 : 16;

        let y = firstPageStartY;

        function addPageBackground(imageSource) {
            if (imageSource) {
                pdf.addImage(imageSource, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
            }
        }

        if (firstPageBackground) {
            addPageBackground(firstPageBackground);
        }

        function checkPageSpace(height) {
            if (y + height > pageHeight - 16) {
                pdf.addPage("a4", "p");
                if (otherPagesBackground) {
                    addPageBackground(otherPagesBackground);
                }
                y = otherPageStartY;
            }
        }

        // Title: Tight gap under the header banner
        pdf.setFont("times", "bold");
        pdf.setFontSize(15);
        pdf.setTextColor(15, 23, 42);
        pdf.text("MINUTES OF THE MEETING", pageWidth / 2, y, { align: "center" });

        y += 7;

        // Metadata Table Card
        const formattedDate = meetingData.date
            ? new Date(meetingData.date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
            })
            : "";

        const formattedTime = meetingData.time
            ? new Date("2000-01-01T" + meetingData.time).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            })
            : "";

        const details = [];
        if (meetingData.title) details.push(["MEETING TITLE", meetingData.title]);
        if (meetingData.domain) details.push(["DEPARTMENT", meetingData.domain]);
        if (meetingData.mode) details.push(["MEETING MODE", meetingData.mode]);
        if (formattedDate) details.push(["DATE & TIME", `${formattedDate}${formattedTime ? ' at ' + formattedTime : ''}`]);
        if (meetingData.venue) details.push(["VENUE / LINK", meetingData.venue]);

        if (details.length > 0) {
            const tableHeight = details.length * 6 + 4;
            checkPageSpace(tableHeight + 4);

            // Table background & border
            pdf.setFillColor(248, 250, 252);
            pdf.setDrawColor(203, 213, 225);
            pdf.roundedRect(margin, y, contentWidth, tableHeight, 2, 2, "FD");

            y += 4.5;
            details.forEach(function (item) {
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(8.5);
                pdf.setTextColor(71, 85, 105);
                pdf.text(`${item[0]}:`, margin + 4, y);

                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(15, 23, 42);
                pdf.text(item[1], margin + 38, y);

                y += 6;
            });

            y += 3;
        }

        // Attendance pills renderer
        if (meetingData.attendance && meetingData.attendance.trim()) {
            const attendees = meetingData.attendance.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
            if (attendees.length > 0) {
                checkPageSpace(18);

                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(9.5);
                pdf.setTextColor(6, 78, 59);
                pdf.text("ATTENDANCE", margin, y);

                pdf.setDrawColor(226, 232, 240);
                pdf.setLineWidth(0.3);
                pdf.line(margin + 28, y - 1, margin + contentWidth, y - 1);

                y += 4.5;

                // Render attendee badges
                let badgeX = margin + 3;
                attendees.forEach(function (name) {
                    const badgeW = pdf.getTextWidth(name) + 6;
                    if (badgeX + badgeW > margin + contentWidth - 4) {
                        badgeX = margin + 3;
                        y += 6.5;
                        checkPageSpace(12);
                    }
                    pdf.setFillColor(236, 253, 245);
                    pdf.setDrawColor(209, 250, 229);
                    pdf.roundedRect(badgeX, y - 3.5, badgeW, 5.2, 1, 1, "FD");

                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(8);
                    pdf.setTextColor(6, 78, 59);
                    pdf.text(name, badgeX + 3, y);

                    badgeX += badgeW + 3;
                });

                y += 6;
            }
        }

        // Styled Section Block Function
        function addStyledSection(title, content) {
            if (!content || !content.trim()) return;

            const lines = pdf.splitTextToSize(content.trim(), contentWidth - 8);
            const blockHeight = lines.length * 4.5 + 10;
            checkPageSpace(blockHeight);

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9.5);
            pdf.setTextColor(6, 78, 59);
            pdf.text(title.toUpperCase(), margin, y);

            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.3);
            pdf.line(margin + pdf.getTextWidth(title.toUpperCase()) + 4, y - 1, margin + contentWidth, y - 1);

            y += 4.5;

            // Green left accent border
            const startLineY = y - 1;
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8.5);
            pdf.setTextColor(30, 41, 59);

            lines.forEach(function (line) {
                checkPageSpace(5);
                pdf.text(line, margin + 4, y);
                y += 4.5;
            });

            pdf.setDrawColor(5, 150, 105);
            pdf.setLineWidth(0.8);
            pdf.line(margin, startLineY, margin, y - 1);

            y += 4;
        }

        addStyledSection("Agenda", meetingData.agenda);
        addStyledSection("Discussed Points & Outcomes", meetingData.discussion);
        addStyledSection("Action Items", meetingData.actionItems);

        // Signoff block
        if (meetingData.preparedBy) {
            checkPageSpace(18);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8);
            pdf.setTextColor(100, 116, 139);
            pdf.text("PREPARED BY", margin, y);
            pdf.text("VERIFIED BY", pageWidth - margin - 35, y);

            y += 4;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(15, 23, 42);
            pdf.text(meetingData.preparedBy, margin, y);
            pdf.text("Leetverse", pageWidth - margin - 35, y);

            y += 6;
            pdf.setDrawColor(148, 163, 184);
            pdf.setLineWidth(0.3);
            pdf.line(margin, y, margin + 40, y);
            pdf.line(pageWidth - margin - 40, y, pageWidth - margin, y);
        }

        // Number of pages
        const totalPages = pdf.internal.getNumberOfPages();
        for (let page = 1; page <= totalPages; page++) {
            pdf.setPage(page);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            pdf.setTextColor(148, 163, 184);

            pdf.text("Leetverse • Minutes of Meeting", margin, pageHeight - 7);
            pdf.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
        }

        pdf.save(`Leetverse-MOM-${sanitizedTitle}.pdf`);

    } catch (err) {
        console.error("PDF export error:", err);
        alert("Unable to generate PDF:\n" + err.message);
    } finally {
        downloadPdf.disabled = false;
        downloadPdf.innerHTML = originalText;
    }
});

// ==========================================================================
// 7. INITIALIZATION
// ==========================================================================
window.addEventListener("DOMContentLoaded", function () {
    restoreFormData();
    generatePreview();
});
