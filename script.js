let selectedFolder = null;


// ================================
// CHOOSE FOLDER
// ================================
async function chooseFolder() {

    try {

        selectedFolder =
            await window.showDirectoryPicker();

        document.getElementById("selectedFolder").textContent =
            "📁 Selected: " + selectedFolder.name;

        document.getElementById("scanButton").disabled = false;

        document.getElementById("message").textContent =
            "Folder selected. Click Scan for Duplicates.";

        document.getElementById("message").style.color =
            "green";

    } catch (error) {

        console.log("Folder selection cancelled.");

    }
}


// ================================
// GET ALL FILES
// ================================
async function getFiles(directoryHandle) {

    const files = [];

    for await (const entry of directoryHandle.values()) {

        if (entry.kind === "file") {

            const file = await entry.getFile();

            files.push(file);

        }

        else if (entry.kind === "directory") {

            const subFiles =
                await getFiles(entry);

            files.push(...subFiles);
        }
    }

    return files;
}


// ================================
// CALCULATE SHA-256
// ================================
async function calculateHash(file) {

    const buffer =
        await file.arrayBuffer();

    const hashBuffer =
        await crypto.subtle.digest(
            "SHA-256",
            buffer
        );

    const hashArray =
        Array.from(
            new Uint8Array(hashBuffer)
        );

    return hashArray
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");
}


// ================================
// SCAN FOLDER
// ================================
async function scanFolder() {

    if (!selectedFolder) {

        alert("Please select a folder first.");

        return;
    }

    const message =
        document.getElementById("message");

    const results =
        document.getElementById("resultsContainer");

    const scanButton =
        document.getElementById("scanButton");

    scanButton.disabled = true;

    results.innerHTML = "";

    message.textContent =
        "⏳ Reading files...";

    message.style.color =
        "#2563eb";


    try {

        const files =
            await getFiles(selectedFolder);


        if (files.length === 0) {

            message.textContent =
                "No files found.";

            scanButton.disabled = false;

            return;
        }


        const hashGroups = {};


        // Process files
        for (let i = 0; i < files.length; i++) {

            const file = files[i];

            message.textContent =
                `⏳ Processing ${i + 1} / ${files.length}: ${file.name}`;


            /*
             * Files with different sizes
             * cannot be identical.
             */
            const key =
                `${file.size}-${file.lastModified}`;


            /*
             * We still calculate the hash
             * to confirm identical content.
             */
            const hash =
                await calculateHash(file);


            if (!hashGroups[hash]) {

                hashGroups[hash] = [];
            }


            hashGroups[hash].push(file);
        }


        const duplicateGroups =
            Object.values(hashGroups)
                .filter(
                    group =>
                        group.length > 1
                );


        const duplicateFiles =
            duplicateGroups.reduce(
                (total, group) =>
                    total + group.length - 1,
                0
            );


        // Statistics
        document.getElementById("totalFiles")
            .textContent =
            files.length;


        document.getElementById("duplicateFiles")
            .textContent =
            duplicateFiles;


        document.getElementById("duplicateGroups")
            .textContent =
            duplicateGroups.length;


        message.textContent =
            "✅ Scan completed successfully!";


        message.style.color =
            "green";


        showResults(duplicateGroups);

    }

    catch (error) {

        console.error(error);

        message.textContent =
            "❌ Error: " + error.message;

        message.style.color =
            "red";
    }


    scanButton.disabled = false;
}


// ================================
// DISPLAY RESULTS
// ================================
function showResults(groups) {

    const container =
        document.getElementById(
            "resultsContainer"
        );


    if (groups.length === 0) {

        container.innerHTML = `
            <div class="empty">
                <p>🎉 No duplicate files found!</p>
            </div>
        `;

        return;
    }


    container.innerHTML = "";


    groups.forEach(
        (group, groupIndex) => {

            const groupDiv =
                document.createElement(
                    "div"
                );

            groupDiv.className =
                "duplicate-group";


            groupDiv.innerHTML = `
                <div class="group-title">
                    Duplicate Group ${groupIndex + 1}
                    (${group.length} files)
                </div>
            `;


            group.forEach(
                (file, fileIndex) => {

                    const fileDiv =
                        document.createElement(
                            "div"
                        );

                    fileDiv.className =
                        "file-item";


                    const status =
                        fileIndex === 0
                            ? "ORIGINAL"
                            : "DUPLICATE";


                    const statusClass =
                        fileIndex === 0
                            ? "original"
                            : "duplicate";


                    fileDiv.innerHTML = `
                        <div class="file-name">

                            📄
                            <strong>
                                ${escapeHtml(file.name)}
                            </strong>

                            <br>

                            <small>
                                ${formatSize(file.size)}
                            </small>

                        </div>

                        <span class="${statusClass}">
                            ${status}
                        </span>
                    `;


                    groupDiv.appendChild(
                        fileDiv
                    );
                }
            );


            container.appendChild(
                groupDiv
            );
        }
    );
}


// ================================
// FILE SIZE
// ================================
function formatSize(bytes) {

    if (bytes === 0) {
        return "0 Bytes";
    }


    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB",
        "TB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    return (
        parseFloat(
            (
                bytes /
                Math.pow(
                    1024,
                    index
                )
            ).toFixed(2)
        )
        +
        " " +
        units[index]
    );
}


// ================================
// SECURITY
// ================================
function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}