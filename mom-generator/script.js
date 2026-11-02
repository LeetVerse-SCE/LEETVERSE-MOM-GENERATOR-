const momForm = document.getElementById("momForm");
const previewContent = document.getElementById("previewContent");
const downloadPdf = document.getElementById("downloadPdf");
const saveStatus = document.getElementById("saveStatus");

const STORAGE_KEY = "momGeneratorData";

let meetingData = null;

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
  "preparedBy",
];

// Get field value
function getValue(id) {
  return document.getElementById(id).value.trim();
}

// Escape HTML
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character];
  });
}

// Save form data
function saveFormData() {
  const data = {};

  fieldIds.forEach(function (id) {
    data[id] = document.getElementById(id).value;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (saveStatus) {
      saveStatus.textContent = "✓ Changes saved automatically";
    }
  } catch (error) {
    console.error("Unable to save data:", error);

    if (saveStatus) {
      saveStatus.textContent = "Unable to save data in this browser.";
    }
  }
}

// Restore saved data
function restoreFormData() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) return;

  try {
    const data = JSON.parse(savedData);

    fieldIds.forEach(function (id) {
      if (data[id] !== undefined) {
        document.getElementById(id).value = data[id];
      }
    });

    if (saveStatus) {
      saveStatus.textContent = "✓ Previously saved data restored";
    }
  } catch (error) {
    console.error("Unable to restore data:", error);
  }
}

// Automatically save form changes
fieldIds.forEach(function (id) {
  const field = document.getElementById(id);

  field.addEventListener("input", saveFormData);
  field.addEventListener("change", saveFormData);
});

// Preview section creator
function addPreviewBlock(title, value) {
  if (!value) return "";

  return ` <div class="document-section"> <h3>${escapeHTML(title)}</h3> <p>${escapeHTML(value)}</p> </div> `;
}

// Generate meeting preview
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
    preparedBy: getValue("preparedBy"),
  };

  const formattedDate = meetingData.date
    ? new Date(meetingData.date + "T00:00:00").toLocaleDateString("en-IN")
    : "Not specified";

  const formattedTime = meetingData.time
    ? new Date("2000-01-01T" + meetingData.time).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not specified";

  const infoCards = [
    ["Meeting Title", meetingData.title],
    ["Department / Domain", meetingData.domain || "Not specified"],
    ["Date", formattedDate],
    ["Time", formattedTime],
    ["Meeting Mode", meetingData.mode || "Not specified"],
    ["Venue / Link", meetingData.venue || "Not specified"],
  ];

  const infoHTML = infoCards
    .map(function (item) {
      return ` <div class="info-card"> <span>${escapeHTML(item[0])}</span> <strong>${escapeHTML(item[1])}</strong> </div> `;
    })
    .join("");

  previewContent.innerHTML = ` <div class="mom-document-header"> <div class="document-label"> OFFICIAL MEETING RECORD </div> <h2>Minutes of Meeting</h2> <p>Meeting Summary & Documentation</p> </div> <div class="meeting-info-grid"> ${infoHTML} </div> ${addPreviewBlock("Attendance", meetingData.attendance)} ${addPreviewBlock("Meeting Agenda", meetingData.agenda)} ${addPreviewBlock("Discussed Points", meetingData.discussion)} ${addPreviewBlock("Action Items", meetingData.actionItems)} ${ meetingData.preparedBy ? ` <div class="prepared-by-box"> <span>PREPARED BY</span> <strong>${escapeHTML(meetingData.preparedBy)}</strong> </div> ` : "" } <div class="document-footer"> Minutes of Meeting | Meeting Documentation </div> `;

  document.getElementById("previewSection").scrollIntoView({
    behavior: "smooth",
  });
}

// Submit form
momForm.addEventListener("submit", function (event) {
  event.preventDefault();

  saveFormData();
  generatePreview();
});

// Clear form and saved data
momForm.addEventListener("reset", function () {
  localStorage.removeItem(STORAGE_KEY);

  meetingData = null;

  previewContent.innerHTML = ` <div class="empty-state"> <div class="empty-icon">M</div> <h3>Your meeting preview will appear here</h3> <p>Fill in the meeting details and click Generate Preview.</p> </div> `;

  if (saveStatus) {
    saveStatus.textContent = "Form cleared.";
  }
});

// PDF Download
downloadPdf.addEventListener("click", function () {
  if (!meetingData) {
    alert("Please generate the meeting preview first.");
    return;
  }

  if (!window.jspdf) {
    alert("PDF library could not load. Please check your internet connection.");
    return;
  }

  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  let y = 20;

  // Check space before adding content
  function checkPageSpace(height) {
    if (y + height > pageHeight - 18) {
      pdf.addPage();
      y = 20;
    }
  }

  // Add PDF section
  function addSection(title, content) {
    if (!content) return;

    const lines = pdf.splitTextToSize(content, contentWidth);

    checkPageSpace(16);

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

  // PDF title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.setTextColor(24, 36, 59);

  pdf.text("MINUTES OF MEETING", pageWidth / 2, y, { align: "center" });

  y += 15;

  // Meeting details
  const formattedDate = meetingData.date
    ? new Date(meetingData.date + "T00:00:00").toLocaleDateString("en-IN")
    : "Not specified";

  const formattedTime = meetingData.time
    ? new Date("2000-01-01T" + meetingData.time).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not specified";

  const details = [
    ["Meeting Title", meetingData.title],
    ["Department / Domain", meetingData.domain || "Not specified"],
    ["Date", formattedDate],
    ["Time", formattedTime],
    ["Meeting Mode", meetingData.mode || "Not specified"],
    ["Venue / Link", meetingData.venue || "Not specified"],
  ];

  details.forEach(function (item) {
    const lines = pdf.splitTextToSize(item[0] + ": " + item[1], contentWidth);

    checkPageSpace(lines.length * 6 + 2);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(40, 40, 40);

    pdf.text(lines, margin, y);

    y += lines.length * 6 + 2;
  });

  y += 7;

  // Meeting sections
  addSection("Attendance", meetingData.attendance);
  addSection("Meeting Agenda", meetingData.agenda);
  addSection("Discussed Points", meetingData.discussion);
  addSection("Action Items", meetingData.actionItems);
  addSection("Prepared By", meetingData.preparedBy);

  // Page numbers and footer
  const totalPages = pdf.internal.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    pdf.setPage(page);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);

    pdf.text("Minutes of Meeting", margin, pageHeight - 9);

    pdf.text(
      `Page ${page} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 9,
      { align: "right" }
    );
  }

  pdf.save("Meeting-Minutes.pdf");
});

// Restore saved data when page opens
restoreFormData();