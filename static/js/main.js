// Fetch and display notes
async function loadNotes() {
    try {
        const response = await fetch("/api/notes");
        const notes = await response.json();
        const notesList = document.getElementById("notesList");
        notesList.innerHTML = "";

        notes.forEach((note) => {
            const noteElement = createNoteElement(note);
            notesList.appendChild(noteElement);
        });

        updateGraph(notes);
    } catch (error) {
        console.error("Error loading notes:", error);
    }
}

let noteToDelete = null;

function showDeleteModal(noteId) {
    noteToDelete = noteId;
    const modal = document.getElementById("deleteModal");
    modal.classList.remove("hidden");
}

function closeDeleteModal() {
    const modal = document.getElementById("deleteModal");
    modal.classList.add("hidden");
    noteToDelete = null;
}

function confirmDelete() {
    if (!noteToDelete) return;

    fetch(`/api/notes/${noteToDelete}`, {
        method: "DELETE",
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message === "Note deleted successfully") {
                // Remove the note element from the DOM
                const noteElement = document.querySelector(
                    `[data-note-id="${noteToDelete}"]`
                );
                if (noteElement) {
                    noteElement.remove();
                }

                // Close the overlay if it's open
                const overlay = document.getElementById("noteDetailsOverlay");
                if (!overlay.classList.contains("hidden")) {
                    closeNoteDetails();
                }

                // Fetch updated notes and update the graph
                return fetch("/api/notes");
            } else {
                throw new Error(data.error || "Failed to delete note");
            }
        })
        .then((response) => response.json())
        .then((notes) => {
            // Update the graph with the new data
            updateGraph(notes);

            // Clear any selected or similar notes highlighting
            const selectedNote = document.querySelector(".selected");
            if (selectedNote) {
                selectedNote.classList.remove("selected");
            }
            const similarNotes = document.querySelectorAll(".similar");
            similarNotes.forEach((note) => note.classList.remove("similar"));
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("Failed to delete note: " + error.message);
        })
        .finally(() => {
            closeDeleteModal();
        });
}

// Create a note element
function createNoteElement(note) {
    const noteElement = document.createElement("div");
    noteElement.className =
        "bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer relative group";
    noteElement.setAttribute("data-note-id", note.id);

    // Extract title from first line and content from rest
    const lines = note.text.split("\n");
    const title = lines[0].trim() || "Untitled Note";
    const content = lines.slice(1).join("\n").trim() || note.text;

    noteElement.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-grow" onclick="showNoteDetails('${note.id}')">
                <h3 class="font-medium text-gray-900">${title}</h3>
                <p class="text-sm text-gray-600 mt-1">${content.substring(
                    0,
                    100
                )}${content.length > 100 ? "..." : ""}</p>
            </div>
            <button onclick="showDeleteModal('${
                note.id
            }')" class="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity ml-4 p-2 rounded-full hover:bg-red-50">
                <i class="fas fa-trash text-lg"></i>
            </button>
        </div>
    `;
    return noteElement;
}

// Function to manage UI state during processing
function setUILoadingState(isLoading) {
    // Disable/enable all buttons
    const buttons = document.querySelectorAll("button");
    buttons.forEach((button) => {
        button.disabled = isLoading;
    });

    // Disable/enable text input
    const textArea = document.getElementById("noteText");
    if (textArea) {
        textArea.disabled = isLoading;
    }

    // Disable/enable file input
    const fileInput = document.getElementById("audioFile");
    if (fileInput) {
        fileInput.disabled = isLoading;
    }

    // Update upload button text
    const uploadButton = document.querySelector(
        'button[onclick="uploadAudio()"]'
    );
    if (uploadButton) {
        uploadButton.textContent = isLoading
            ? "Processing..."
            : "Process Audio";
    }

    // Add/remove loading overlay
    let overlay = document.getElementById("loading-overlay");
    if (isLoading && !overlay) {
        overlay = document.createElement("div");
        overlay.id = "loading-overlay";
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        overlay.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p>Processing audio...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    } else if (!isLoading && overlay) {
        overlay.remove();
    }
}

// Function to update file input display
function updateFileDisplay(file) {
    const fileDisplay = document.getElementById("fileDisplay");
    if (fileDisplay) {
        fileDisplay.innerHTML = `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center">
                    <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-900">${
                            file.name
                        }</p>
                        <p class="text-xs text-gray-500">${(
                            file.size /
                            (1024 * 1024)
                        ).toFixed(2)} MB</p>
                    </div>
                </div>
                <button onclick="clearFileSelection()" class="text-gray-400 hover:text-gray-500">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `;
    }
}

// Function to clear file selection
function clearFileSelection() {
    const fileInput = document.getElementById("audioFile");
    const fileDisplay = document.getElementById("fileDisplay");
    const processButton = document.querySelector(
        'button[onclick="uploadAudio()"]'
    );

    if (fileInput) {
        fileInput.value = "";
    }
    if (fileDisplay) {
        fileDisplay.innerHTML = "";
    }
    if (processButton) {
        processButton.disabled = true;
        processButton.classList.add("opacity-50", "cursor-not-allowed");
    }
}

// Function to handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        updateFileDisplay(file);
        // Enable the process button
        const processButton = document.querySelector(
            'button[onclick="uploadAudio()"]'
        );
        if (processButton) {
            processButton.disabled = false;
            processButton.classList.remove("opacity-50", "cursor-not-allowed");
        }
    }
}

// Show success dialog
function showSuccessDialog() {
    const dialog = document.getElementById("successDialog");
    if (dialog) {
        dialog.classList.remove("hidden");
    }
}

// Close success dialog
function closeSuccessDialog() {
    const dialog = document.getElementById("successDialog");
    if (dialog) {
        dialog.classList.add("hidden");
    }
    // Ensure the process button is disabled after closing the dialog
    const processButton = document.querySelector(
        'button[onclick="uploadAudio()"]'
    );
    if (processButton) {
        processButton.disabled = true;
        processButton.classList.add("opacity-50", "cursor-not-allowed");
    }
}

// Function to upload and process audio
async function uploadAudio() {
    const fileInput = document.getElementById("audioFile");
    const file = fileInput.files[0];
    if (!file) return;

    // Set loading state
    setUILoadingState(true);

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (response.ok) {
            // Clear the file input and display
            fileInput.value = "";
            const fileDisplay = document.getElementById("fileDisplay");
            if (fileDisplay) {
                fileDisplay.innerHTML = "";
            }

            // Show success dialog
            showSuccessDialog();

            // Refresh the notes list
            loadNotes();
        } else {
            throw new Error(data.error || "Failed to process audio");
        }
    } catch (error) {
        console.error("Error processing audio:", error);
        alert("Error processing audio: " + error.message);
    } finally {
        // Reset UI state
        setUILoadingState(false);
    }
}

// Show similar notes
async function showSimilarNotes(noteId) {
    try {
        const response = await fetch(`/api/similar?id=${noteId}`);
        const similarNotes = await response.json();

        // Highlight similar notes in the graph
        updateGraph(
            loadNotes(),
            noteId,
            similarNotes.map((n) => n.id)
        );
    } catch (error) {
        console.error("Error fetching similar notes:", error);
    }
}

// Update the graph visualization
function updateGraph(notes, selectedNoteId = null, similarNoteIds = []) {
    const container = document.getElementById("graph");
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous graph
    d3.select("#graph").selectAll("*").remove();

    // Create SVG with viewBox for proper scaling
    const svg = d3
        .select("#graph")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", [0, 0, width, height])
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Add zoom behavior with constraints
    const zoom = d3
        .zoom()
        .scaleExtent([0.5, 4]) // Limit zoom scale between 0.5x and 4x
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Create a group for all elements
    const g = svg.append("g");

    // Create a force simulation with boundary constraints
    const simulation = d3
        .forceSimulation()
        .force(
            "link",
            d3
                .forceLink()
                .id((d) => d.id)
                .distance(100)
        )
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(50))
        .force("x", d3.forceX(width / 2).strength(0.1))
        .force("y", d3.forceY(height / 2).strength(0.1));

    // Create links between notes based on similarity
    const links = [];
    notes.forEach((note, i) => {
        notes.slice(i + 1).forEach((otherNote) => {
            const similarity = computeSimilarity(
                note.embedding,
                otherNote.embedding
            );
            if (similarity > 0.5) {
                links.push({
                    source: note.id,
                    target: otherNote.id,
                    value: similarity,
                });
            }
        });
    });

    // Create the links
    const link = g
        .append("g")
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("stroke", (d) => {
            // Color gradient from blue to purple based on similarity
            const hue = 240 + d.value * 60; // 240 (blue) to 300 (purple)
            return `hsl(${hue}, 70%, 50%)`;
        })
        .attr("stroke-opacity", 0.8) // Increased opacity from 0.6 to 0.8
        .attr("stroke-width", (d) => Math.sqrt(d.value) * 4); // Increased base width from 2 to 4

    // Create the nodes
    const node = g
        .append("g")
        .selectAll("g")
        .data(notes)
        .enter()
        .append("g")
        .call(
            d3
                .drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended)
        );

    // Add circles to nodes
    node.append("circle")
        .attr("r", 20)
        .attr("fill", (d) => {
            if (d.id === selectedNoteId) return "#ff6b6b";
            if (similarNoteIds.includes(d.id)) return "#4ecdc4";
            return "#6c5ce7";
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            d3.select(this).transition().duration(200).attr("r", 25);

            // Show tooltip
            const tooltip = d3
                .select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "white")
                .style("padding", "10px")
                .style("border-radius", "5px")
                .style("box-shadow", "0 0 10px rgba(0,0,0,0.1)")
                .style("pointer-events", "none")
                .style("z-index", "1000");

            const title = d.text.split("\n")[0].trim() || "Untitled Note";
            tooltip
                .html(`<strong>${title}</strong>`)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
            d3.select(this).transition().duration(200).attr("r", 20);

            // Remove tooltip
            d3.selectAll(".tooltip").remove();
        })
        .on("click", (event, d) => {
            showRelatedNotes(d.id);
        });

    // Add text labels to nodes
    node.append("text")
        .text((d) => {
            const title = d.text.split("\n")[0].trim();
            return title.length > 10 ? title.substring(0, 10) + "..." : title;
        })
        .attr("text-anchor", "middle")
        .attr("dy", 35)
        .attr("fill", "#333")
        .style("font-size", "12px")
        .style("pointer-events", "none");

    // Update positions on each tick with boundary constraints
    simulation.nodes(notes).on("tick", () => {
        // Keep nodes within bounds
        notes.forEach((d) => {
            d.x = Math.max(30, Math.min(width - 30, d.x));
            d.y = Math.max(30, Math.min(height - 30, d.y));
        });

        link.attr("x1", (d) => d.source.x)
            .attr("y1", (d) => d.source.y)
            .attr("x2", (d) => d.target.x)
            .attr("y2", (d) => d.target.y);

        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    simulation.force("link").links(links);
}

function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    // Constrain dragging within bounds
    const container = document.getElementById("graph");
    const width = container.clientWidth;
    const height = container.clientHeight;

    d.fx = Math.max(30, Math.min(width - 30, event.x));
    d.fy = Math.max(30, Math.min(height - 30, event.y));
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// Helper function to compute similarity between embeddings
function computeSimilarity(embedding1, embedding2) {
    if (!embedding1 || !embedding2) return 0;

    const dotProduct = embedding1.reduce(
        (sum, val, i) => sum + val * embedding2[i],
        0
    );
    const magnitude1 = Math.sqrt(
        embedding1.reduce((sum, val) => sum + val * val, 0)
    );
    const magnitude2 = Math.sqrt(
        embedding2.reduce((sum, val) => sum + val * val, 0)
    );

    return dotProduct / (magnitude1 * magnitude2);
}

// Add a new note
async function addNote() {
    const noteText = document.getElementById("noteText").value;
    if (!noteText.trim()) return;

    // Set loading state
    setUILoadingState(true);

    try {
        const response = await fetch("/api/notes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: noteText }),
        });

        if (response.ok) {
            document.getElementById("noteText").value = "";
            loadNotes();
        }
    } catch (error) {
        console.error("Error adding note:", error);
        alert("Error adding note. Please try again.");
    } finally {
        // Reset UI state
        setUILoadingState(false);
    }
}

// Function to switch tabs
function switchTab(tabId) {
    // Hide all tab panes
    document.querySelectorAll(".tab-pane").forEach((pane) => {
        pane.classList.add("hidden");
    });

    // Remove active class from all tabs
    document.querySelectorAll('[role="tab"]').forEach((tab) => {
        tab.classList.remove("active", "border-blue-500", "text-blue-600");
        tab.classList.add("border-transparent");
        tab.setAttribute("aria-selected", "false");
    });

    // Show selected tab pane
    const selectedPane = document.getElementById(tabId);
    if (selectedPane) {
        selectedPane.classList.remove("hidden");
    }

    // Activate selected tab
    const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
    if (selectedTab) {
        selectedTab.classList.add("active", "border-blue-500", "text-blue-600");
        selectedTab.classList.remove("border-transparent");
        selectedTab.setAttribute("aria-selected", "true");
    }

    // If switching to graph tab, update the graph
    if (tabId === "graph") {
        loadNotes().then((notes) => {
            updateGraph(notes);
        });
    }
}

// Global variable to store current note ID
let currentNoteId = null;

// Function to show note details in overlay
function showNoteDetails(noteId) {
    currentNoteId = noteId;
    console.log("Fetching note details for ID:", currentNoteId);
    const overlay = document.getElementById("noteDetailsOverlay");
    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Prevent scrolling of background

    // Fetch note details
    fetch(`/api/notes/${noteId}`)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log("Received note details:", data);
            document.getElementById("noteDetailsTitle").textContent = data.name;
            document.getElementById("noteDetailsContent").textContent =
                data.content;

            // Handle summary
            const summaryDiv = document.getElementById("noteDetailsSummary");
            console.log("Summary:", data.summary);
            if (data.summary) {
                summaryDiv.classList.remove("hidden");
                summaryDiv.querySelector("div").textContent = data.summary;
            } else {
                summaryDiv.classList.add("hidden");
            }

            // Handle related notes
            const relatedDiv = document.getElementById("noteDetailsRelated");
            relatedDiv.innerHTML = "";
            if (data.related_notes && data.related_notes.length > 0) {
                data.related_notes.forEach((related) => {
                    const noteElement = document.createElement("div");
                    noteElement.className =
                        "bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer";
                    noteElement.innerHTML = `
                        <h3 class="font-medium text-gray-900">${
                            related.name
                        }</h3>
                        <p class="text-sm text-gray-600 mt-1">${related.content.substring(
                            0,
                            100
                        )}${related.content.length > 100 ? "..." : ""}</p>
                    `;
                    noteElement.onclick = () => showNoteDetails(related.id);
                    relatedDiv.appendChild(noteElement);
                });
            } else {
                relatedDiv.innerHTML =
                    '<p class="text-gray-500">No related notes found</p>';
            }
        })
        .catch((error) => {
            console.error("Error fetching note details:", error);
            alert("Error loading note details: " + error.message);
            closeNoteDetails(); // Close the overlay on error
        });
}

// Function to close note details overlay
function closeNoteDetails() {
    const overlay = document.getElementById("noteDetailsOverlay");
    overlay.classList.add("hidden");
    document.body.style.overflow = ""; // Restore scrolling
    currentNoteId = null;
}

// Function to delete current note
function deleteCurrentNote() {
    if (!currentNoteId) return;
    noteToDelete = currentNoteId; // Set the noteToDelete variable
    const modal = document.getElementById("deleteModal");
    modal.classList.remove("hidden");
}

// Load notes when page loads
document.addEventListener("DOMContentLoaded", function () {
    loadNotes();

    // Check for hash fragment to switch tabs
    if (window.location.hash === "#notes") {
        switchTab("notes");
    }

    // Add file input change listener
    const fileInput = document.getElementById("audioFile");
    if (fileInput) {
        console.log("Adding file input listener"); // Debug log
        fileInput.addEventListener("change", handleFileSelect);
    } else {
        console.log("File input not found"); // Debug log
    }

    // Initialize process button as disabled
    const processButton = document.querySelector(
        'button[onclick="uploadAudio()"]'
    );
    if (processButton) {
        processButton.disabled = true;
        processButton.classList.add("opacity-50", "cursor-not-allowed");
    }

    // Add tab click listeners
    document.querySelectorAll('[role="tab"]').forEach((tab) => {
        tab.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = tab.getAttribute("data-tab");
            switchTab(tabId);
        });
    });
});

// Recording functionality
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimer;

// Start recording
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            if (audioChunks.length === 0) {
                // If no audio data was collected, keep the button disabled
                const processButton =
                    document.getElementById("processRecording");
                processButton.disabled = true;
                processButton.classList.add("opacity-50", "cursor-not-allowed");
                return;
            }

            const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = document.getElementById("recordedAudio");
            audio.src = audioUrl;

            // Show preview and enable process button only if we have valid audio
            document
                .getElementById("recordingPreview")
                .classList.remove("hidden");
            const processButton = document.getElementById("processRecording");
            processButton.disabled = false;
            processButton.classList.remove("opacity-50", "cursor-not-allowed");
        };

        // Start recording
        mediaRecorder.start();
        recordingStartTime = Date.now();

        // Update UI
        document.getElementById("startRecording").classList.add("hidden");
        document.getElementById("stopRecording").classList.remove("hidden");
        document.getElementById("recordingStatus").textContent = "Recording...";
        document.getElementById("recordingTime").classList.remove("hidden");

        // Ensure process button is disabled while recording
        const processButton = document.getElementById("processRecording");
        processButton.disabled = true;
        processButton.classList.add("opacity-50", "cursor-not-allowed");

        // Start timer
        recordingTimer = setInterval(updateRecordingTime, 1000);
    } catch (error) {
        console.error("Error accessing microphone:", error);
        alert(
            "Error accessing microphone. Please ensure you have granted microphone permissions."
        );

        // Ensure button stays disabled on error
        const processButton = document.getElementById("processRecording");
        processButton.disabled = true;
        processButton.classList.add("opacity-50", "cursor-not-allowed");
    }
}

// Stop recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());

        // Update UI
        document.getElementById("startRecording").classList.remove("hidden");
        document.getElementById("stopRecording").classList.add("hidden");
        document.getElementById("recordingStatus").textContent =
            "Recording stopped";
        document.getElementById("recordingTime").classList.add("hidden");

        // Stop timer
        clearInterval(recordingTimer);
    }
}

// Update recording time display
function updateRecordingTime() {
    const elapsedTime = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (elapsedTime % 60).toString().padStart(2, "0");
    document.getElementById(
        "recordingTime"
    ).textContent = `${minutes}:${seconds}`;
}

// Process the recorded audio
async function processRecording() {
    const audio = document.getElementById("recordedAudio");
    const processButton = document.getElementById("processRecording");

    // Validate that we have a recording
    if (!audio.src || !audioChunks || audioChunks.length === 0) {
        processButton.disabled = true;
        processButton.classList.add("opacity-50", "cursor-not-allowed");
        return;
    }

    // Disable the process button immediately when processing starts
    processButton.disabled = true;
    processButton.classList.add("opacity-50", "cursor-not-allowed");

    // Set loading state
    setUILoadingState(true);

    try {
        // Convert audio blob to file
        const response = await fetch(audio.src);
        const blob = await response.blob();
        const file = new File([blob], "recording.wav", { type: "audio/wav" });

        // Create form data and send to server
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        const data = await uploadResponse.json();

        if (uploadResponse.ok) {
            // Clear recording
            audio.src = "";
            audioChunks = []; // Clear the audio chunks
            document.getElementById("recordingPreview").classList.add("hidden");

            // Keep process button disabled
            processButton.disabled = true;
            processButton.classList.add("opacity-50", "cursor-not-allowed");

            // Show success dialog
            showSuccessDialog();

            // Refresh notes
            loadNotes();
        } else {
            throw new Error(data.error || "Failed to process recording");
        }
    } catch (error) {
        console.error("Error processing recording:", error);
        alert("Error processing recording: " + error.message);

        // Keep the button disabled on error
        processButton.disabled = true;
        processButton.classList.add("opacity-50", "cursor-not-allowed");
    } finally {
        setUILoadingState(false);
    }
}
