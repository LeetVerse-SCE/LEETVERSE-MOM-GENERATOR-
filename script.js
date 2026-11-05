
// ==========================================
// MINUTES OF MEETING GENERATOR
// Main JavaScript
// ==========================================

const momForm = document.getElementById("momForm");
const previewContent = document.getElementById("previewContent");
const downloadPdf = document.getElementById("downloadPdf");
const saveStatus = document.getElementById("saveStatus");

const STORAGE_KEY = "momGeneratorData";

let meetingData = null;

// All form field IDs
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

// ==========================================
// GET FIELD VALUE
// ==========================================

function getValue(id) {
    const field = document.getElementById(id);
    return field ? field.value.trim() : "";
}

// ==========================================
// ESCAPE HTML
// ==========================================

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

// ==========================================
// AUTOMATICALLY SAVE FORM DATA
// ==========================================

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
            saveStatus.textContent = "✓ Changes saved automatically";
        }
    } catch (error) {
        console.error("Unable to save data:", error);

        if (saveStatus) {
            saveStatus.textContent =
                "Unable to save data in this browser.";
        }
    }
}

// ==========================================
// RESTORE PREVIOUSLY SAVED DATA
// ==========================================

function restoreFormData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) return;

        const data = JSON.parse(savedData);

        fieldIds.forEach(function (id) {
            const field = document.getElementById(id);

            if (field && data[id] !== undefined) {
                field.value = data[id];
            }
        });

        if (saveStatus) {
            saveStatus.textContent =
                "✓ Previously saved data restored";
        }

    } catch (error) {
        console.error("Unable to restore data:", error);
    }
}

// ==========================================
// LISTEN FOR FORM CHANGES
// ==========================================

fieldIds.forEach(function (id) {
    const field = document.getElementById(id);

    if (field) {
        field.addEventListener("input", saveFormData);
        field.addEventListener("change", saveFormData);
    }
});

// ==========================================
// PREVIEW SECTION CREATOR
// ==========================================

function addPreviewBlock(title, value) {
    if (!value) return "";

    return `
        <div class="document-section">
            <h3>${escapeHTML(title)}</h3>
            <p>${escapeHTML(value)}</p>
        </div>
    `;
}

// ==========================================
// GENERATE MEETING PREVIEW
// ==========================================

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

    const formattedDate = meetingData.date
        ? new Date(meetingData.date + "T00:00:00")
            .toLocaleDateString("en-IN")
        : "Not specified";

    const formattedTime = meetingData.time
        ? new Date("2000-01-01T" + meetingData.time)
            .toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit"
            })
        : "Not specified";

    const infoCards = [
        ["Meeting Title", meetingData.title],
        ["Department / Domain", meetingData.domain || "Not specified"],
        ["Date", formattedDate],
        ["Time", formattedTime],
        ["Meeting Mode", meetingData.mode || "Not specified"],
        ["Venue / Link", meetingData.venue || "Not specified"]
    ];

    const infoHTML = infoCards.map(function (item) {
        return `
            <div class="info-card">
                <span>${escapeHTML(item[0])}</span>
                <strong>${escapeHTML(item[1])}</strong>
            </div>
        `;
    }).join("");

    previewContent.innerHTML = `

        <div class="mom-document-header">

            <div class="document-label">
                OFFICIAL MEETING RECORD
            </div>

            <h2>Minutes of Meeting</h2>

            <p>Meeting Summary & Documentation</p>

        </div>

        <div class="meeting-info-grid">
            ${infoHTML}
        </div>

        ${addPreviewBlock("Attendance", meetingData.attendance)}

        ${addPreviewBlock("Meeting Agenda", meetingData.agenda)}

        ${addPreviewBlock("Discussed Points", meetingData.discussion)}

        ${addPreviewBlock("Action Items", meetingData.actionItems)}

        ${
            meetingData.preparedBy
                ? `
                    <div class="prepared-by-box">
                        <span>PREPARED BY</span>
                        <strong>${escapeHTML(meetingData.preparedBy)}</strong>
                    </div>
                `
                : ""
        }

        <div class="document-footer">
            Minutes of Meeting | Meeting Documentation
        </div>
    `;

    document.getElementById("previewSection").scrollIntoView({
        behavior: "smooth"
    });
}

// ==========================================
// GENERATE PREVIEW WHEN FORM IS SUBMITTED
// ==========================================

momForm.addEventListener("submit", function (event) {
    event.preventDefault();

    saveFormData();
    generatePreview();
});

// ==========================================
// CLEAR FORM AND SAVED DATA
// ==========================================

momForm.addEventListener("reset", function () {

    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error("Unable to clear data:", error);
    }

    meetingData = null;

    previewContent.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">M</div>
            <h3>Your meeting preview will appear here</h3>
            <p>Fill in the meeting details and click Generate Preview.</p>
        </div>
    `;

    if (saveStatus) {
        saveStatus.textContent = "Form cleared.";
    }
});

// ==========================================
// LOAD PDF LIBRARY IF NOT AVAILABLE
// ==========================================

function loadExternalScript(src) {
    return new Promise(function (resolve, reject) {

        const script = document.createElement("script");

        script.src = src;

        script.onload = function () {
            if (window.jspdf && window.jspdf.jsPDF) {
                resolve();
            } else {
                reject(new Error("jsPDF was not found after loading."));
            }
        };

        script.onerror = function () {
            reject(new Error("Unable to load: " + src));
        };

        document.head.appendChild(script);
    });
}

// ==========================================
// ENSURE JSPDF IS AVAILABLE
// ==========================================

async function ensureJsPDF() {

    if (window.jspdf && window.jspdf.jsPDF) {
        return window.jspdf.jsPDF;
    }

    const backupCDNs = [
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
            console.warn("PDF library loading attempt failed:", error);
        }
    }

    throw new Error("Unable to load the PDF library from available CDNs.");
}

// ==========================================
// LOAD PDF BACKGROUND IMAGES
// ==========================================

function loadBackgroundImage(src) {

    return new Promise(function (resolve, reject) {

        const image = new Image();

        image.onload = function () {
            resolve(image);
        };

        image.onerror = function () {
            reject(new Error("Unable to load background image: " + src));
        };

        image.src = src;
    });
}

// ==========================================
// PDF DOWNLOAD
// ==========================================

downloadPdf.addEventListener("click", async function () {

    if (!meetingData) {
        alert("Please generate the meeting preview first.");
        return;
    }

    downloadPdf.disabled = true;
    downloadPdf.textContent = "Generating PDF...";

    try {

        // Load PDF library
        const jsPDF = await ensureJsPDF();

        // Load background images
        const firstPageBackground =
            await loadBackgroundImage("IMAGES/first-page.png");

        const otherPagesBackground =
            await loadBackgroundImage("IMAGES/other-pages.png");

        // Create PDF
        const pdf = new jsPDF("p", "mm", "a4");

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const margin = 18;
        const contentWidth = pageWidth - margin * 2;

        // ======================================
        // FIXED CONTENT POSITION
        // ======================================

        // First page: Start BELOW the LEETVERSE banner
        const firstPageStartY = 65;

        // Other pages: Normal starting position
        const otherPageStartY = 25;

        let y = firstPageStartY;

        // ======================================
        // ADD PAGE BACKGROUND
        // ======================================

        function addPageBackground(image) {
            pdf.addImage(
                image,
                "PNG",
                0,
                0,
                pageWidth,
                pageHeight
            );
        }

        // First page background
        addPageBackground(firstPageBackground);

        // ======================================
        // CHECK PAGE SPACE
        // ======================================

        function checkPageSpace(height) {

            if (y + height > pageHeight - 18) {

                pdf.addPage();

                // Add background to subsequent pages
                addPageBackground(otherPagesBackground);

                // Reset position for subsequent pages
                y = otherPageStartY;
            }
        }

        // ======================================
        // ADD SECTION TO PDF
        // ======================================

        function addSection(title, content) {

            if (!content) return;

            const lines = pdf.splitTextToSize(
                content,
                contentWidth
            );

            // Keep heading with some content
            checkPageSpace(22);

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12);
            pdf.setTextColor(49, 88, 201);

            pdf.text(title, margin, y);

            y += 7;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            pdf.setTextColor(40, 40, 40);

            lines.forEach(function (line) {

                checkPageSpace(6);

                pdf.text(line, margin, y);

                y += 5;
            });

            y += 7;
        }

        // ======================================
        // PDF TITLE
        // ======================================

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(19);
        pdf.setTextColor(24, 36, 59);

        pdf.text(
            "MINUTES OF MEETING",
            pageWidth / 2,
            y,
            { align: "center" }
        );

        y += 15;

        // ======================================
        // MEETING DETAILS
        // ======================================

        const formattedDate = meetingData.date
            ? new Date(meetingData.date + "T00:00:00")
                .toLocaleDateString("en-IN")
            : "Not specified";

        const formattedTime = meetingData.time
            ? new Date("2000-01-01T" + meetingData.time)
                .toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            : "Not specified";

        const details = [
            ["Meeting Title", meetingData.title],
            ["Department / Domain", meetingData.domain || "Not specified"],
            ["Date", formattedDate],
            ["Time", formattedTime],
            ["Meeting Mode", meetingData.mode || "Not specified"],
            ["Venue / Link", meetingData.venue || "Not specified"]
        ];

        details.forEach(function (item) {

            const lines = pdf.splitTextToSize(
                item[0] + ": " + item[1],
                contentWidth
            );

            checkPageSpace(lines.length * 6 + 2);

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            pdf.setTextColor(40, 40, 40);

            pdf.text(lines, margin, y);

            y += lines.length * 6 + 2;
        });

        y += 7;

        // ======================================
        // MEETING SECTIONS
        // ======================================

        addSection("Attendance", meetingData.attendance);

        addSection("Meeting Agenda", meetingData.agenda);

        addSection("Discussed Points", meetingData.discussion);

        addSection("Action Items", meetingData.actionItems);

        addSection("Prepared By", meetingData.preparedBy);

        // ======================================
        // ADD FOOTER AND PAGE NUMBERS
        // ======================================

        const totalPages = pdf.internal.getNumberOfPages();

        for (let page = 1; page <= totalPages; page++) {

            pdf.setPage(page);

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            pdf.setTextColor(120, 120, 120);

            pdf.text(
                "Minutes of Meeting",
                margin,
                pageHeight - 9
            );

            pdf.text(
                `Page ${page} of ${totalPages}`,
                pageWidth - margin,
                pageHeight - 9,
                { align: "right" }
            );
        }

        // ======================================
        // SAVE PDF
        // ======================================

        pdf.save("Meeting-Minutes.pdf");

    } catch (error) {

        console.error("PDF generation error:", error);

        alert(
            "Unable to generate PDF.\n\n" +
            error.message +
            "\n\nPlease check the PDF library and IMAGES folder."
        );

    } finally {

        downloadPdf.disabled = false;
        downloadPdf.textContent = "Download PDF";
    }
});

// ==========================================
// RESTORE SAVED DATA WHEN PAGE OPENS
// ==========================================

restoreFormData();
