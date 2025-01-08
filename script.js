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
                name: "712 East 211th Street, NY",
                pdfUrl: "assets/712 East 211th Street.pdf"
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
                name: "1567 Broadway, NY",
                pdfUrl: "assets/1567 Broadway.pdf"
            }
        ]
    },
    {
        name: "Sample Drawings",
        projects: [
            {
                id: 6,
                name: "608 West 48th Street Drawing",
                pdfUrl: "assets/608 West 48th Street.pdf"
            },
            {
                id: 7,
                name: "228 FARMINGDALE ROAD, NY",
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

        // Create projects under this category
        category.projects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.textContent = project.name;
            projectItem.addEventListener('click', () => {
                if (!isLoading) {
                    homepage.classList.remove('active');
                    pdfViewer.classList.remove('hidden');
                    loadPDF(project);
                }
            });
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

// Load PDF function
async function loadPDF(project) {
    if (isLoading) return;
    
    try {
        await cleanup();

        // Update active project in sidebar
        document.querySelectorAll('.project-item').forEach(item => {
            item.classList.remove('active');
            if (item.textContent === project.name) {
                item.classList.add('active');
            }
        });

        // Start loading new PDF
        pdfContainer.style.display = 'flex';
        
        // Create loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        document.body.appendChild(loadingDiv);

        // Load PDF with streaming enabled
        currentLoadingTask = pdfjsLib.getDocument(project.pdfUrl);
        currentPDF = await currentLoadingTask.promise;
        
        // Get total pages
        const totalPages = currentPDF.numPages;
        loadingDiv.textContent = `Loading pages (0 of ${totalPages})`;
        
        // Get the first page to determine scaling
        const firstPage = await currentPDF.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 });
        const containerWidth = pdfContainer.clientWidth - 40;
        const scale = containerWidth / viewport.width;

        // Load pages in batches of 2
        const batchSize = 2;
        for (let i = 0; i < totalPages; i += batchSize) {
            const batch = [];
            for (let j = 0; j < batchSize && i + j < totalPages; j++) {
                const pageNum = i + j + 1;
                batch.push(renderPage(pageNum, scale));
            }
            
            // Update loading indicator
            loadingDiv.textContent = `Loading pages (${Math.min(i + batchSize, totalPages)} of ${totalPages})`;
            
            // Render batch
            await Promise.all(batch);
            
            // Small delay between batches
            if (i + batchSize < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        // Remove loading indicator
        document.body.removeChild(loadingDiv);
        
    } catch (error) {
        console.error('PDF error:', error);
    } finally {
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
        
        // Remove stars after 10 seconds
        setTimeout(() => {
            const starsToRemove = document.querySelector('.stars');
            if (starsToRemove) {
                starsToRemove.style.opacity = '0';
                setTimeout(() => starsToRemove.remove(), 300); // Wait for fade out
            }
        }, 10000);
    }
}

// Add theme toggle event listener
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

// Initialize theme before other code
initializeTheme();

// Initialize the application
initializeProjects();
