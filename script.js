// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Projects data organized by categories
const projectCategories = [
    {
        name: "Preconstruction Survey Reports",
        projects: [
            {
                id: 1,
                name: "604 West 48th Street, NY",
                pdfUrl: "assets/604 West 48th Street.pdf"
            },
            {
                id: 2,
                name: "1567 Broadway, NY",
                pdfUrl: "assets/1567 Broadway.pdf"
            },
            {
                id: 3,
                name: "1352 Broadway, NY",
                pdfUrl: "assets/1352 Broadway.pdf"
            },
            {
                id: 4,
                name: "3733 Riverdale Avenue, NY",
                pdfUrl: "assets/3733 Riverdale Avenue.pdf"
            },
            {
                id: 5,
                name: "712 East 211th Street, NY",
                pdfUrl: "assets/712 East 211th Street.pdf"
            },
        ]
    },
    {
        name: "Sample Drawings",
        projects: [
            {
                id: 6,
                name: "608 West 48th Street, NY",
                pdfUrl: "assets/608 West 48th Street.pdf"
            },
            {
                id: 7,
                name: "228 Farmingdale Road, NY",
                pdfUrl: "assets/228 FARMINGDALE ROAD.pdf"
            },
            {
                id: 8,
                name: "1351 Jerome Avenue, NY",
                pdfUrl: "assets/1351 Jerome Avenue.pdf"
            }
        ]
    }
];

let currentPDF = null;
let currentLoadingTask = null;
let isLoading = false;

// DOM Elements
const projectList = document.getElementById('projectList');
const pdfViewer = document.getElementById('pdfViewer');
const pdfContainer = document.getElementById('pdfContainer');
const homepage = document.getElementById('homepage');

// Initialize project list with categories
function initializeProjects() {
    projectCategories.forEach(category => {
        // Create category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.textContent = category.name;
        projectList.appendChild(categoryHeader);

        // Create project items
        category.projects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.textContent = project.name;
            projectItem.dataset.projectId = project.id;
            
            // Add click handler
            projectItem.addEventListener('click', () => handleProjectClick(project));
            
            projectList.appendChild(projectItem);
        });
    });
}

// Cleanup function
async function cleanup() {
    isLoading = true;
    pdfContainer.style.display = 'none';
    pdfContainer.innerHTML = '';
    document.querySelector('.empty-state').style.display = 'none';

    if (currentPDF) {
        try {
            await currentPDF.cleanup();
            await currentPDF.destroy();
        } catch (error) {
            console.log('PDF cleanup:', error);
        }
        currentPDF = null;
    }

    if (currentLoadingTask) {
        try {
            await currentLoadingTask.destroy();
        } catch (error) {
            console.log('Loading task cleanup:', error);
        }
        currentLoadingTask = null;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
}

// Function to load and render PDF
async function loadPDF(project) {
    try {
        // Create loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        pdfViewer.appendChild(loadingDiv);

        // Start loading the PDF
        currentLoadingTask = pdfjsLib.getDocument(project.pdfUrl);
        currentPDF = await currentLoadingTask.promise;
        
        // Show PDF container
        pdfContainer.style.display = 'flex';
        
        // Calculate initial scale
        const firstPage = await currentPDF.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        let baseScale = Math.min(
            (window.innerWidth * 0.7) / viewport.width,
            (window.innerHeight * 0.8) / viewport.height
        );

        // Apply category-specific scaling
        const category = projectCategories.find(cat => 
            cat.projects.some(p => p.id === project.id)
        );
        if (category.name === "Preconstruction Survey Reports") {
            baseScale *= 1.6; // 20% larger for precon surveys
        } else if (category.name === "Sample Drawings") {
            baseScale *= 1.1; // 10% larger for drawings
        }

        // Render all pages
        for (let pageNum = 1; pageNum <= currentPDF.numPages; pageNum++) {
            loadingDiv.textContent = `Loading page ${pageNum} of ${currentPDF.numPages}`;
            await renderPage(pageNum, baseScale);
        }

        // Remove loading indicator
        loadingDiv.remove();
    } catch (error) {
        console.error('Error loading PDF:', error);
        isLoading = false;
    }
}

// Function to render a single page
async function renderPage(pageNum, scale) {
    try {
        const page = await currentPDF.getPage(pageNum);
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page';
        
        const scaledViewport = page.getViewport({ scale: scale });
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: scaledViewport
        };

        // Create container for page and watermark
        const container = document.createElement('div');
        container.className = 'pdf-page-container';
        
        // Add watermark div
        const watermark = document.createElement('div');
        watermark.className = 'watermark';
        
        container.appendChild(canvas);
        container.appendChild(watermark);

        // Add blur overlay for page 2 of precon surveys
        const category = projectCategories.find(cat => 
            cat.projects.some(p => currentLoadingTask.docId.includes(p.pdfUrl))
        );
        if (pageNum === 2 && category?.name === "Preconstruction Survey Reports") {
            const blurOverlay = document.createElement('div');
            blurOverlay.className = 'blur-overlay';
            blurOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 30%;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                background-color: rgba(255, 255, 255, 0.3);
                pointer-events: none;
            `;
            container.appendChild(blurOverlay);
        }

        pdfContainer.appendChild(container);

        await page.render(renderContext).promise;
        page.cleanup();
    } catch (error) {
        console.error(`Error rendering page ${pageNum}:`, error);
    }
}

// Add click handler for branding to return to homepage
document.querySelector('.branding').addEventListener('click', async () => {
    if (isLoading) return;
    
    try {
        await cleanup();
        homepage.classList.add('active');
        pdfViewer.classList.add('hidden');
        document.getElementById('resumeViewer').classList.remove('active');
        document.querySelectorAll('.project-item').forEach(item => {
            item.classList.remove('active');
        });
    } catch (error) {
        console.log('Homepage error:', error);
    } finally {
        isLoading = false;
    }
});

// Create stars for the branding section
function createStars() {
    const branding = document.querySelector('.branding');
    const starsContainer = document.createElement('div');
    starsContainer.className = 'stars';
    
    // Create 30 stars (reduced from 50)
    for (let i = 0; i < 30; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Random position with some padding from edges
        star.style.left = `${5 + Math.random() * 90}%`;  // Keep stars 5% away from edges
        star.style.top = `${5 + Math.random() * 90}%`;
        
        // Shorter animation duration and delay
        const delay = Math.random() * 3;  // Reduced from 5s to 3s
        star.style.animation = `twinkle ${0.5 + Math.random()}s ease-in-out ${delay}s`;  // Reduced duration
        
        starsContainer.appendChild(star);
    }
    
    branding.appendChild(starsContainer);
}

// Initialize stars
createStars();

// Theme handling
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // If switching to dark mode, handle star animation
    if (newTheme === 'dark') {
        const stars = document.querySelector('.stars');
        if (stars) {
            // Remove existing stars
            stars.remove();
        }
        // Create new stars
        createStars();
        
        // Remove stars after 1.5 seconds (changed from 10 seconds)
        setTimeout(() => {
            const starsToRemove = document.querySelector('.stars');
            if (starsToRemove) {
                starsToRemove.style.opacity = '0';
                setTimeout(() => starsToRemove.remove(), 300); // Wait for fade out
            }
        }, 1500);  // Changed from 10000 to 3500 milliseconds
    }
}

// Add theme toggle event listener
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

// Initialize theme before other code
initializeTheme();

// Initialize the application
initializeProjects();

// Add click handler for resume link
document.querySelector('.resume-link').addEventListener('click', async () => {
    if (isLoading) return;
    
    try {
        await cleanup();
        document.getElementById('resumeViewer').classList.add('active');
        document.getElementById('homepage').classList.remove('active');
        document.getElementById('pdfViewer').classList.add('hidden');
        // Remove active state from all project items
        document.querySelectorAll('.project-item').forEach(item => {
            item.classList.remove('active');
        });
    } catch (error) {
        console.log('Resume view error:', error);
    } finally {
        isLoading = false;
    }
});

// Function to handle project clicks
async function handleProjectClick(project) {
    if (isLoading) return;
    isLoading = true;
    
    try {
        await cleanup();
        homepage.classList.remove('active');
        document.getElementById('resumeViewer').classList.remove('active');  // Hide resume viewer
        pdfViewer.classList.remove('hidden');
        
        // Update active states
        document.querySelectorAll('.project-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-project-id="${project.id}"]`).classList.add('active');
        
        // Load and render PDF
        await loadPDF(project);
    } catch (error) {
        console.error('Error handling project click:', error);
    } finally {
        isLoading = false;
    }
}

// Add image loading verification
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('.gallery-image');
    images.forEach(img => {
        img.onerror = function() {
            console.error('Failed to load image:', img.src);
            // Try reloading with absolute path
            const newSrc = window.location.origin + '/' + img.src.replace(/^\.\//, '');
            if (img.src !== newSrc) {
                img.src = newSrc;
            }
        };
        
        img.onload = function() {
            console.log('Successfully loaded image:', img.src);
        };
    });
});
