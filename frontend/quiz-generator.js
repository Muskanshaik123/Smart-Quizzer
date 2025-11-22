// Enhanced Quiz Generator State
let quizState = {
    currentMethod: 'topic',
    content: '',
    quizConfig: {
        title: '',
        questionCount: 10,
        timeLimit: 45,
        difficulty: 'medium',
        questionTypes: ['MCQ', 'TrueFalse'],
        language: 'en',
        bloomLevel: 'mixed',
        enableExplanations: true,
        passingScore: 70,
        maxOptions: 4,
        feedbackLevel: 'standard',
        shuffleQuestions: true,
        shuffleOptions: true
    },
    generatedQuestions: [],
    recentTopics: JSON.parse(localStorage.getItem('recentTopics')) || []
};

// Initialize the quiz generator
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Enhanced Quiz Generator - Initialized');
    
    initUploadMethods();
    initConfigControls();
    initEventListeners();
    initTemplates();
    initModalEvents();
    updateQuizSummary();
    loadRecentTopics();
    updateProgressIndicator(1);
    checkServerHealth();
});

// Initialize upload method selection
function initUploadMethods() {
    const methods = document.querySelectorAll('.upload-method');
    const areas = document.querySelectorAll('.upload-area');
    
    methods.forEach(method => {
        method.addEventListener('click', function() {
            const methodType = this.dataset.method;
            
            // Remove active class from all methods
            methods.forEach(m => m.classList.remove('active'));
            // Add active class to clicked method
            this.classList.add('active');
            
            // Hide all areas
            areas.forEach(area => area.classList.remove('active'));
            // Show corresponding area
            document.getElementById(`${methodType}Area`).classList.add('active');
            
            quizState.currentMethod = methodType;
            updateQuizSummary();
            updateProgressIndicator(1);
        });
    });
    
    // Initialize file upload with drag and drop
    const pdfUploadBox = document.getElementById('pdfUploadBox');
    const pdfFileInput = document.getElementById('pdfFile');
    
    if (pdfUploadBox && pdfFileInput) {
        pdfUploadBox.addEventListener('click', () => pdfFileInput.click());
        pdfUploadBox.addEventListener('dragover', handleDragOver);
        pdfUploadBox.addEventListener('drop', handleFileDrop);
        pdfFileInput.addEventListener('change', handlePDFUpload);
    }
    
    // Initialize text input with enhanced features
    const textContent = document.getElementById('textContent');
    const clearText = document.getElementById('clearText');
    const formatText = document.getElementById('formatText');
    
    if (textContent) {
        textContent.addEventListener('input', handleTextInput);
    }
    if (clearText) {
        clearText.addEventListener('click', clearTextInput);
    }
    if (formatText) {
        formatText.addEventListener('click', formatTextContent);
    }
    
    // Initialize URL input
    const fetchUrlBtn = document.getElementById('fetchUrl');
    if (fetchUrlBtn) {
        fetchUrlBtn.addEventListener('click', handleURLFetch);
    }
    
    // Initialize topic selection with enhanced features
    initTopicSelection();
}

// Enhanced PDF upload with drag and drop
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    const uploadBox = document.getElementById('pdfUploadBox');
    if (uploadBox) uploadBox.classList.add('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const uploadBox = document.getElementById('pdfUploadBox');
    if (uploadBox) uploadBox.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const pdfFileInput = document.getElementById('pdfFile');
        if (pdfFileInput) {
            // Create a new DataTransfer to set files
            const dt = new DataTransfer();
            dt.items.add(files[0]);
            pdfFileInput.files = dt.files;
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            pdfFileInput.dispatchEvent(event);
        }
    }
}

// Enhanced PDF upload handler with real text extraction
async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileInfo = document.getElementById('pdfFileInfo');
    const preview = document.getElementById('pdfPreview');
    
    if (file.type !== 'application/pdf') {
        showNotification('Please upload a valid PDF file', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showNotification('File size must be less than 10MB', 'error');
        return;
    }
    
    if (fileInfo) {
        fileInfo.innerHTML = `
            <div class="file-details">
                <i class="fas fa-file-pdf"></i>
                <div>
                    <strong>${file.name}</strong>
                    <span>${(file.size / 1024 / 1024).toFixed(2)} MB • ${new Date().toLocaleDateString()}</span>
                </div>
                <button class="btn-icon" onclick="clearPDFUpload()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    showEnhancedLoading(true, 'Analyzing PDF content...', 'Extracting text and identifying key concepts from your document.');
    
    try {
        // Method 1: Try server-side PDF extraction first
        const formData = new FormData();
        formData.append('pdf', file);
        
        const response = await fetch('/api/extract-pdf-text', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.content) {
                quizState.content = data.content;
                
                if (preview) {
                    preview.innerHTML = createPDFPreview(data.content, file.name, data.metadata || {});
                }
                
                showEnhancedLoading(false);
                showNotification('PDF analyzed successfully! Ready to generate questions.', 'success');
                updateQuizSummary();
                updateProgressIndicator(2);
                return;
            }
        }
        
        // Method 2: Fallback to client-side PDF.js extraction
        await extractPDFWithPDFJS(file, preview);
        
    } catch (error) {
        console.error('PDF extraction failed:', error);
        showEnhancedLoading(false);
        
        // Method 3: Ultimate fallback - simulate extraction
        console.log('Using fallback PDF extraction...');
        simulateProgress('pdf', () => {
            quizState.content = `PDF Content: ${file.name}`;
            if (preview) {
                preview.innerHTML = `
                    <div class="preview-content">
                        <h4>📄 PDF Analysis Complete (Fallback)</h4>
                        <div class="analysis-results">
                            <div class="analysis-item">
                                <span>Document:</span>
                                <span>${file.name}</span>
                            </div>
                            <div class="analysis-item">
                                <span>Status:</span>
                                <span>Using filename as content</span>
                            </div>
                            <div class="analysis-item">
                                <span>Note:</span>
                                <span>Install PDF.js for full extraction</span>
                            </div>
                        </div>
                        <p><strong>Status:</strong> Ready for quiz generation</p>
                    </div>
                `;
            }
            showEnhancedLoading(false);
            showNotification('PDF processed! Ready to generate questions.', 'success');
            updateQuizSummary();
            updateProgressIndicator(2);
        });
    }
}

// Client-side PDF text extraction using PDF.js
async function extractPDFWithPDFJS(file, previewElement) {
    try {
        // Load PDF.js library dynamically
        if (typeof pdfjsLib === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        const pageTexts = [];
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            pageTexts.push(pageText);
            fullText += pageText + '\n\n';
            
            // Update progress
            updateProgressBar(Math.round((pageNum / pdf.numPages) * 100), `Extracting page ${pageNum} of ${pdf.numPages}`);
        }
        
        quizState.content = fullText;
        
        // Analyze content
        const analysis = analyzePDFContent(fullText, pageTexts, pdf.numPages);
        
        if (previewElement) {
            previewElement.innerHTML = createPDFPreview(fullText, file.name, analysis);
        }
        
        showEnhancedLoading(false);
        showNotification(`PDF extracted successfully! ${pdf.numPages} pages processed.`, 'success');
        updateQuizSummary();
        updateProgressIndicator(2);
        
    } catch (error) {
        console.error('PDF.js extraction failed:', error);
        throw new Error('PDF extraction failed');
    }
}

function analyzePDFContent(fullText, pageTexts, totalPages) {
    const words = fullText.split(/\s+/).filter(word => word.length > 0);
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Extract key topics (simple keyword extraction)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const wordFreq = {};
    
    words.forEach(word => {
        const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanWord.length > 3 && !commonWords.has(cleanWord)) {
            wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        }
    });
    
    // Get top 5 keywords
    const topKeywords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
    
    return {
        totalPages,
        wordCount: words.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        topKeywords,
        contentQuality: words.length > 500 ? 'Excellent' : words.length > 200 ? 'Good' : 'Fair'
    };
}

function createPDFPreview(content, fileName, analysis) {
    const previewContent = content.length > 300 ? content.substring(0, 300) + '...' : content;
    
    return `
        <div class="preview-content">
            <h4>📄 PDF Analysis Complete</h4>
            <div class="analysis-results">
                <div class="analysis-item">
                    <span>Document:</span>
                    <span>${fileName}</span>
                </div>
                <div class="analysis-item">
                    <span>Pages:</span>
                    <span>${analysis.totalPages}</span>
                </div>
                <div class="analysis-item">
                    <span>Words:</span>
                    <span>${analysis.wordCount}</span>
                </div>
                <div class="analysis-item">
                    <span>Key Topics:</span>
                    <span>${analysis.topKeywords.join(', ')}</span>
                </div>
                <div class="analysis-item">
                    <span>Content Quality:</span>
                    <span class="${analysis.contentQuality.toLowerCase()}">${analysis.contentQuality}</span>
                </div>
            </div>
            <div class="content-preview">
                <h5>Content Preview:</h5>
                <p>${previewContent}</p>
            </div>
            <p><strong>Status:</strong> Ready for quiz generation</p>
        </div>
    `;
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function clearPDFUpload() {
    const pdfFile = document.getElementById('pdfFile');
    const fileInfo = document.getElementById('pdfFileInfo');
    const preview = document.getElementById('pdfPreview');
    
    if (pdfFile) pdfFile.value = '';
    if (fileInfo) fileInfo.innerHTML = '';
    if (preview) {
        preview.innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-file-pdf"></i>
                <p>PDF preview will appear here</p>
            </div>
        `;
    }
    quizState.content = '';
    updateQuizSummary();
}

// Enhanced text input handler
function handleTextInput(event) {
    const text = event.target.value;
    const wordCount = document.getElementById('wordCount');
    const charCount = document.getElementById('charCount');
    const paragraphCount = document.getElementById('paragraphCount');
    const qualityScore = document.getElementById('qualityScore');
    
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).length : 0;
    
    if (wordCount) wordCount.textContent = `${words} words`;
    if (charCount) charCount.textContent = `${chars} characters`;
    if (paragraphCount) paragraphCount.textContent = `${paragraphs} paragraphs`;
    
    // Calculate content quality score
    let quality = 'Poor';
    if (words >= 200) quality = 'Excellent';
    else if (words >= 100) quality = 'Good';
    else if (words >= 50) quality = 'Fair';
    
    if (qualityScore) {
        qualityScore.textContent = quality;
        qualityScore.className = quality.toLowerCase();
    }
    
    quizState.content = text;
    updateQuizSummary();
    
    if (words >= 50) {
        updateProgressIndicator(2);
    }
}

function clearTextInput() {
    const textContent = document.getElementById('textContent');
    if (textContent) {
        textContent.value = '';
        handleTextInput({ target: { value: '' } });
    }
    showNotification('Text content cleared', 'info');
}

function formatTextContent() {
    const textarea = document.getElementById('textContent');
    if (!textarea) return;
    
    let text = textarea.value;
    
    // Basic formatting rules
    text = text
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple newlines
        .replace(/([.!?])\s*(?=[A-Z])/g, '$1\n') // New line after sentences
        .trim();
    
    textarea.value = text;
    handleTextInput({ target: { value: text } });
    showNotification('Text formatted successfully', 'success');
}

// Enhanced URL fetch handler with REAL content extraction
async function handleURLFetch() {
    const urlInput = document.getElementById('urlInput');
    const url = urlInput ? urlInput.value.trim() : '';
    const preview = document.getElementById('urlPreview');
    
    if (!url) {
        showNotification('Please enter a URL', 'error');
        return;
    }
    
    // Validate URL format and add protocol if missing
    let validUrl;
    try {
        // Add https:// if no protocol is specified
        let processedUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            processedUrl = 'https://' + url;
        }
        validUrl = new URL(processedUrl);
    } catch {
        showNotification('Please enter a valid URL', 'error');
        return;
    }
    
    showEnhancedLoading(true, 'Fetching URL content...', 'Extracting content from the webpage...');
    
    try {
        // Method 1: Try server-side URL content extraction first
        console.log('🔄 Attempting server-side URL extraction...');
        const response = await fetch('/api/fetch-url-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: validUrl.href })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Server response:', data);
            
            if (data.success && data.content) {
                quizState.content = data.content;
                
                if (preview) {
                    preview.innerHTML = createURLPreview(data.content, validUrl.hostname, data.metadata || {});
                }
                
                showEnhancedLoading(false);
                showNotification('URL content extracted successfully!', 'success');
                updateQuizSummary();
                updateProgressIndicator(2);
                return;
            } else {
                throw new Error(data.error || 'Server returned no content');
            }
        } else {
            throw new Error(`Server error: ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Server-side URL extraction failed:', error);
        
        // Method 2: Try client-side extraction with multiple approaches
        try {
            await extractURLContentClientSide(validUrl.href, preview);
        } catch (clientError) {
            console.error('❌ Client-side extraction failed:', clientError);
            
            // Method 3: Ultimate fallback - use a reliable CORS proxy
            try {
                await extractWithCorsProxy(validUrl.href, preview);
            } catch (proxyError) {
                console.error('❌ CORS proxy extraction failed:', proxyError);
                
                // Final fallback: topic extraction from URL
                showEnhancedLoading(false);
                useURLFallbackExtraction(validUrl, preview);
            }
        }
    }
}

// Client-side URL content extraction with multiple CORS proxies
async function extractURLContentClientSide(url, previewElement) {
    console.log('🔄 Attempting client-side URL extraction...');
    
    // List of CORS proxies to try
    const corsProxies = [
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://corsproxy.io/?'
    ];
    
    for (const proxy of corsProxies) {
        try {
            console.log(`🔄 Trying CORS proxy: ${proxy}`);
            const proxyUrl = proxy + encodeURIComponent(url);
            const response = await fetchWithTimeout(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }, 10000);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            console.log('✅ Successfully fetched HTML, length:', html.length);
            
            if (html.length < 100) {
                throw new Error('HTML content too short');
            }
            
            // Extract text content from HTML
            const content = extractTextFromHTML(html);
            
            if (content.length < 50) {
                throw new Error('Extracted content too short');
            }
            
            quizState.content = content;
            
            // Analyze content
            const analysis = analyzeURLContent(content, url);
            
            if (previewElement) {
                previewElement.innerHTML = createURLPreview(content, new URL(url).hostname, analysis);
            }
            
            showEnhancedLoading(false);
            showNotification('URL content extracted successfully!', 'success');
            updateQuizSummary();
            updateProgressIndicator(2);
            return;
            
        } catch (error) {
            console.log(`❌ CORS proxy ${proxy} failed:`, error.message);
            continue; // Try next proxy
        }
    }
    
    throw new Error('All CORS proxies failed');
}

// Alternative CORS proxy method
async function extractWithCorsProxy(url, previewElement) {
    console.log('🔄 Trying alternative CORS proxy method...');
    
    // Alternative approach: use a different CORS solution
    const alternativeProxies = [
        `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(url)}`,
        `https://jsonp.afeld.me/?url=${encodeURIComponent(url)}`,
        `https://api.cors.workers.dev/?url=${encodeURIComponent(url)}`
    ];
    
    for (const proxyUrl of alternativeProxies) {
        try {
            console.log(`🔄 Trying alternative proxy: ${proxyUrl}`);
            const response = await fetchWithTimeout(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            }, 10000);
            
            if (response.ok) {
                const html = await response.text();
                const content = extractTextFromHTML(html);
                
                if (content.length > 50) {
                    quizState.content = content;
                    const analysis = analyzeURLContent(content, url);
                    
                    if (previewElement) {
                        previewElement.innerHTML = createURLPreview(content, new URL(url).hostname, analysis);
                    }
                    
                    showEnhancedLoading(false);
                    showNotification('URL content extracted via proxy!', 'success');
                    updateQuizSummary();
                    updateProgressIndicator(2);
                    return;
                }
            }
        } catch (error) {
            console.log(`❌ Alternative proxy failed:`, error.message);
            continue;
        }
    }
    
    throw new Error('All alternative proxies failed');
}

// Improved HTML text extraction
function extractTextFromHTML(html) {
    console.log('🔄 Extracting text from HTML...');
    
    try {
        // Create a temporary DOM element
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Remove unwanted elements
        const unwantedSelectors = [
            'script', 'style', 'nav', 'header', 'footer', 
            '.nav', '.header', '.footer', '.menu', '.sidebar',
            '.advertisement', '.ad', '.ads', '.popup', '.modal',
            '.cookie-banner', '.newsletter', '.social-share',
            '.comments', '.related-posts', '.pagination'
        ];
        
        unwantedSelectors.forEach(selector => {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // Priority content areas (in order of preference)
        const contentSelectors = [
            'article', 'main', '[role="main"]', '.content', 
            '#content', '.post', '.article', '.entry-content',
            '.main-content', '.story-content', '.post-content',
            '.body', '.text', '.page-content'
        ];
        
        let contentElement = null;
        for (const selector of contentSelectors) {
            contentElement = doc.querySelector(selector);
            if (contentElement && contentElement.textContent.trim().length > 100) {
                console.log(`✅ Found content in: ${selector}`);
                break;
            }
        }
        
        // Fallback to body if no specific content found
        if (!contentElement || contentElement.textContent.trim().length < 100) {
            contentElement = doc.body;
            console.log('🔄 Using body as fallback content source');
        }
        
        // Get text content and clean it
        let content = contentElement.textContent;
        
        // Clean up the content
        content = content
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
            .replace(/(\r\n|\r|\n){2,}/g, '\n\n') // Limit consecutive newlines
            .trim();
        
        // Remove common unwanted patterns
        content = content
            .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
            .replace(/\[.*?\]/g, '') // Remove square bracket content
            .replace(/\{.*?\}/g, '') // Remove curly bracket content
            .replace(/See also:.*$/gmi, '') // Remove "See also" sections
            .replace(/References:.*$/gmi, '') // Remove reference sections
            .replace(/Continue reading.*$/gmi, '') // Remove "Continue reading"
            .replace(/Share this:.*$/gmi, '') // Remove social sharing text
            .replace(/Advertisement.*$/gmi, '') // Remove advertisements
            .replace(/Copyright.*$/gmi, '') // Remove copyright notices
            .replace(/All rights reserved.*$/gmi, ''); // Remove rights notices
        
        console.log('✅ Extracted content length:', content.length);
        return content;
        
    } catch (error) {
        console.error('❌ HTML parsing failed:', error);
        return 'Unable to extract content from this webpage. Please try another URL or method.';
    }
}

// Final fallback: URL analysis
function useURLFallbackExtraction(validUrl, previewElement) {
    console.log('🔄 Using URL fallback extraction...');
    
    const extractedContent = extractTopicFromURL(validUrl.href);
    quizState.content = extractedContent;
    
    if (previewElement) {
        previewElement.innerHTML = `
            <div class="preview-content">
                <h4>🌐 URL Analysis Complete</h4>
                <div class="analysis-results">
                    <div class="analysis-item">
                        <span>Source:</span>
                        <span>${validUrl.hostname}</span>
                    </div>
                    <div class="analysis-item">
                        <span>Method:</span>
                        <span>URL Analysis</span>
                    </div>
                    <div class="analysis-item">
                        <span>Extracted Topic:</span>
                        <span>${extractedContent}</span>
                    </div>
                    <div class="analysis-item">
                        <span>Note:</span>
                        <span>Using URL structure analysis</span>
                    </div>
                </div>
                <div class="content-preview">
                    <h5>How it works:</h5>
                    <p>We analyzed the URL structure to identify the main topic. For better results, try:</p>
                    <ul style="text-align: left; margin: 10px 0; padding-left: 20px;">
                        <li>Using a different URL</li>
                        <li>Pasting text content directly</li>
                        <li>Using PDF upload instead</li>
                        <li>Selecting from predefined topics</li>
                    </ul>
                </div>
                <p><strong>Status:</strong> Ready for quiz generation</p>
            </div>
        `;
    }
    
    showNotification('Topic extracted from URL analysis!', 'success');
    updateQuizSummary();
    updateProgressIndicator(2);
}

// Enhanced URL topic extraction
function extractTopicFromURL(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const pathname = urlObj.pathname;
        
        console.log('🔍 Analyzing URL:', { hostname, pathname });
        
        // Wikipedia URLs
        if (hostname.includes('wikipedia.org')) {
            const topic = pathname.split('/wiki/')[1];
            if (topic) {
                return `Wikipedia: ${decodeURIComponent(topic).replace(/_/g, ' ')}`;
            }
        }
        
        // Medium and blog URLs
        if (hostname.includes('medium.com') || hostname.includes('blog.') || 
            hostname.includes('.medium.com') || hostname.includes('towardsdatascience.com')) {
            const segments = pathname.split('/').filter(seg => seg.length > 0 && !seg.includes('@'));
            if (segments.length > 0) {
                const lastSegment = segments[segments.length - 1];
                const topic = lastSegment.split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                return `Blog: ${topic}`;
            }
        }
        
        // News websites
        if (hostname.includes('news.') || hostname.includes('.com/news/') || 
            hostname.includes('bbc.com') || hostname.includes('cnn.com')) {
            const segments = pathname.split('/').filter(seg => seg.length > 2);
            if (segments.length > 0) {
                const contentSegment = segments[segments.length - 1];
                return `News: ${contentSegment.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}`;
            }
        }
        
        // GitHub URLs
        if (hostname.includes('github.com')) {
            const parts = pathname.split('/').filter(part => part.length > 0);
            if (parts.length >= 2) {
                return `GitHub: ${parts[0]}/${parts[1]} - Programming Project`;
            }
        }
        
        // Stack Overflow
        if (hostname.includes('stackoverflow.com')) {
            if (pathname.includes('/questions/')) {
                const questionId = pathname.split('/questions/')[1]?.split('/')[0];
                return `Stack Overflow: Programming Question ${questionId || ''}`;
            }
        }
        
        // Generic URL analysis
        const domainParts = hostname.split('.');
        if (domainParts.length > 2) {
            const subdomain = domainParts[0];
            if (subdomain !== 'www' && subdomain !== 'app') {
                return `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Content`;
            }
        }
        
        // Extract from pathname
        const pathSegments = pathname.split('/')
            .filter(seg => seg.length > 2 && !seg.includes('.'))
            .map(seg => seg.replace(/-/g, ' '));
        
        if (pathSegments.length > 0) {
            const mainTopic = pathSegments[pathSegments.length - 1]
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            return `${mainTopic} - Web Content`;
        }
        
        // Fallback based on domain
        const domainName = domainParts[domainParts.length - 2];
        return `${domainName.charAt(0).toUpperCase() + domainName.slice(1)} Website Content`;
        
    } catch (error) {
        console.error('URL analysis error:', error);
        return 'Web Content from URL';
    }
}

// Enhanced URL content analysis
function analyzeURLContent(content, url) {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Extract key topics using improved keyword extraction
    const commonWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
        'of', 'with', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
        'from', 'about', 'into', 'through', 'during', 'before', 'after'
    ]);
    
    const wordFreq = {};
    words.forEach(word => {
        const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanWord.length > 3 && !commonWords.has(cleanWord)) {
            wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        }
    });
    
    const topKeywords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
    
    // Determine content quality
    let contentQuality = 'Poor';
    if (words.length > 500) contentQuality = 'Excellent';
    else if (words.length > 200) contentQuality = 'Good';
    else if (words.length > 50) contentQuality = 'Fair';
    
    return {
        wordCount: words.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        topKeywords: topKeywords.length > 0 ? topKeywords : ['General', 'Content'],
        contentQuality: contentQuality,
        sourceType: classifyURLType(url)
    };
}

// Enhanced URL type classification
function classifyURLType(url) {
    const hostname = new URL(url).hostname;
    
    if (hostname.includes('wikipedia')) return 'Wikipedia';
    if (hostname.includes('medium') || hostname.includes('blog') || hostname.includes('substack')) return 'Blog';
    if (hostname.includes('news') || hostname.includes('reuters') || hostname.includes('apnews')) return 'News';
    if (hostname.includes('github') || hostname.includes('stackoverflow') || hostname.includes('gitlab')) return 'Technical';
    if (hostname.includes('research') || hostname.includes('academic') || hostname.includes('arxiv')) return 'Academic';
    if (hostname.includes('docs') || hostname.includes('documentation')) return 'Documentation';
    if (hostname.includes('edu') || hostname.includes('school') || hostname.includes('university')) return 'Educational';
    
    return 'Web Content';
}

// Enhanced URL preview creation
function createURLPreview(content, hostname, analysis) {
    const previewContent = content.length > 300 ? content.substring(0, 300) + '...' : content;
    
    return `
        <div class="preview-content">
            <h4>🌐 Content Extracted Successfully</h4>
            <div class="analysis-results">
                <div class="analysis-item">
                    <span>Source:</span>
                    <span>${hostname}</span>
                </div>
                <div class="analysis-item">
                    <span>Content Type:</span>
                    <span>${analysis.sourceType}</span>
                </div>
                <div class="analysis-item">
                    <span>Words:</span>
                    <span>${analysis.wordCount.toLocaleString()}</span>
                </div>
                <div class="analysis-item">
                    <span>Sentences:</span>
                    <span>${analysis.sentenceCount}</span>
                </div>
                <div class="analysis-item">
                    <span>Key Topics:</span>
                    <span>${analysis.topKeywords.join(', ')}</span>
                </div>
                <div class="analysis-item">
                    <span>Content Quality:</span>
                    <span class="quality-score ${analysis.contentQuality.toLowerCase()}">${analysis.contentQuality}</span>
                </div>
            </div>
            <div class="content-preview">
                <h5>Content Preview:</h5>
                <p>${previewContent}</p>
            </div>
            <p><strong>Status:</strong> Ready for quiz generation</p>
        </div>
    `;
}

// Add fetch timeout utility
function fetchWithTimeout(url, options = {}, timeout = 10000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

// Enhanced topic selection with categories and recent topics
function initTopicSelection() {
    const topics = {
        technology: [
            'Machine Learning', 'Artificial Intelligence', 'Data Science', 'Web Development',
            'Programming', 'Algorithms', 'Data Structures', 'Computer Networks',
            'Cybersecurity', 'Cloud Computing', 'Mobile Development', 'Database Systems'
        ],
        science: [
            'Mathematics', 'Physics', 'Chemistry', 'Biology',
            'Astronomy', 'Geology', 'Environmental Science', 'Neuroscience'
        ],
        humanities: [
            'History', 'Literature', 'Philosophy', 'Psychology',
            'Sociology', 'Political Science', 'Art History', 'Linguistics'
        ],
        business: [
            'Economics', 'Marketing', 'Finance', 'Management',
            'Entrepreneurship', 'Accounting', 'Business Strategy', 'Human Resources'
        ]
    };
    
    const topicsGrid = document.getElementById('topicsGrid');
    const searchInput = document.getElementById('topicSearch');
    const customTopic = document.getElementById('customTopic');
    const categoryTabs = document.querySelectorAll('.category-tab');
    const clearSearch = document.getElementById('clearSearch');
    const addCustomTopic = document.getElementById('addCustomTopic');
    
    if (!topicsGrid) return;
    
    let currentCategory = 'all';
    
    function populateTopics(category = 'all', filter = '') {
        let topicsToShow = [];
        
        if (category === 'all') {
            Object.values(topics).forEach(cat => topicsToShow.push(...cat));
        } else {
            topicsToShow = topics[category] || [];
        }
        
        const filteredTopics = topicsToShow.filter(topic => 
            topic.toLowerCase().includes(filter.toLowerCase())
        );
        
        topicsGrid.innerHTML = filteredTopics.map(topic => `
            <div class="topic-option" data-topic="${topic}" data-category="${getTopicCategory(topic)}">
                <i class="fas fa-book"></i>
                <span>${topic}</span>
            </div>
        `).join('');
        
        // Add click event listeners to topic options
        document.querySelectorAll('.topic-option').forEach(option => {
            option.addEventListener('click', function() {
                const selectedTopic = this.dataset.topic;
                selectTopic(selectedTopic);
            });
        });
    }
    
    function getTopicCategory(topic) {
        for (const [category, topicsList] of Object.entries(topics)) {
            if (topicsList.includes(topic)) return category;
        }
        return 'other';
    }
    
    function selectTopic(topic) {
        // Remove active class from all options
        document.querySelectorAll('.topic-option').forEach(opt => 
            opt.classList.remove('active')
        );
        // Add active class to clicked option
        const selectedOption = document.querySelector(`[data-topic="${topic}"]`);
        if (selectedOption) selectedOption.classList.add('active');
        
        quizState.content = topic;
        if (customTopic) customTopic.value = '';
        
        // Add to recent topics
        addToRecentTopics(topic);
        
        updateQuizSummary();
        updateProgressIndicator(2);
        showNotification(`Topic "${topic}" selected`, 'success');
    }
    
    // Initial population
    populateTopics();
    
    // Category tabs
    if (categoryTabs) {
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                categoryTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.dataset.category;
                populateTopics(currentCategory, searchInput ? searchInput.value : '');
            });
        });
    }
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            populateTopics(currentCategory, this.value);
        });
    }
    
    // Clear search
    if (clearSearch) {
        clearSearch.addEventListener('click', function() {
            if (searchInput) searchInput.value = '';
            populateTopics(currentCategory, '');
        });
    }
    
    // Custom topic
    if (addCustomTopic) {
        addCustomTopic.addEventListener('click', function() {
            const customTopicValue = customTopic ? customTopic.value.trim() : '';
            if (customTopicValue) {
                selectTopic(customTopicValue);
                addToRecentTopics(customTopicValue);
            }
        });
    }
    
    if (customTopic) {
        customTopic.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (addCustomTopic) addCustomTopic.click();
            }
        });
    }
}

function loadRecentTopics() {
    const recentTopicsContainer = document.getElementById('recentTopics');
    if (!recentTopicsContainer) return;
    
    if (quizState.recentTopics.length === 0) {
        recentTopicsContainer.innerHTML = '<p style="color: var(--text-light); font-style: italic;">No recent topics</p>';
        return;
    }
    
    recentTopicsContainer.innerHTML = quizState.recentTopics.map(topic => `
        <div class="recent-tag" onclick="selectRecentTopic('${topic}')">
            ${topic}
        </div>
    `).join('');
}

function addToRecentTopics(topic) {
    // Remove if already exists
    quizState.recentTopics = quizState.recentTopics.filter(t => t !== topic);
    // Add to beginning
    quizState.recentTopics.unshift(topic);
    // Keep only last 5
    quizState.recentTopics = quizState.recentTopics.slice(0, 5);
    
    // Save to localStorage
    localStorage.setItem('recentTopics', JSON.stringify(quizState.recentTopics));
    loadRecentTopics();
}

function selectRecentTopic(topic) {
    const customTopic = document.getElementById('customTopic');
    const addCustomTopic = document.getElementById('addCustomTopic');
    
    if (customTopic) customTopic.value = topic;
    if (addCustomTopic) addCustomTopic.click();
}

// Enhanced configuration controls
function initConfigControls() {
    // Question count range
    const questionCount = document.getElementById('questionCount');
    const questionCountValue = document.getElementById('questionCountValue');
    
    if (questionCount && questionCountValue) {
        questionCount.addEventListener('input', function() {
            const value = this.value;
            questionCountValue.textContent = value;
            quizState.quizConfig.questionCount = parseInt(value);
            updateQuizSummary();
            updateQuestionDistribution();
        });
    }
    
    // Quiz title
    const quizTitle = document.getElementById('quizTitle');
    if (quizTitle) {
        quizTitle.addEventListener('input', function() {
            quizState.quizConfig.title = this.value;
            updateQuizSummary();
        });
    }
    
    // Time limit
    const timeLimit = document.getElementById('timeLimit');
    if (timeLimit) {
        timeLimit.addEventListener('change', function() {
            quizState.quizConfig.timeLimit = parseInt(this.value);
            updateQuizSummary();
        });
    }
    
    // Passing score
    const passingScore = document.getElementById('passingScore');
    if (passingScore) {
        passingScore.addEventListener('input', function() {
            quizState.quizConfig.passingScore = parseInt(this.value);
            updateQuizSummary();
        });
    }
    
    // Question types with distribution
    const questionTypeCheckboxes = document.querySelectorAll('input[name="questionTypes"]');
    if (questionTypeCheckboxes.length > 0) {
        questionTypeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const selectedTypes = Array.from(document.querySelectorAll('input[name="questionTypes"]:checked'))
                    .map(cb => cb.value);
                quizState.quizConfig.questionTypes = selectedTypes;
                updateQuestionDistribution();
                updateQuizSummary();
            });
        });
    }
    
    // Difficulty level
    const difficultyLevel = document.getElementById('difficultyLevel');
    if (difficultyLevel) {
        difficultyLevel.addEventListener('change', function() {
            quizState.quizConfig.difficulty = this.value;
            updateQuizSummary();
        });
    }
    
    // Bloom's level
    const bloomLevel = document.getElementById('bloomLevel');
    if (bloomLevel) {
        bloomLevel.addEventListener('change', function() {
            quizState.quizConfig.bloomLevel = this.value;
        });
    }
    
    // Language
    const language = document.getElementById('language');
    if (language) {
        language.addEventListener('change', function() {
            quizState.quizConfig.language = this.value;
            updateQuizSummary();
        });
    }
    
    // Advanced options
    const advancedOptions = ['enableExplanations', 'shuffleQuestions', 'shuffleOptions'];
    advancedOptions.forEach(option => {
        const element = document.getElementById(option);
        if (element) {
            element.addEventListener('change', function() {
                quizState.quizConfig[option] = this.checked;
            });
        }
    });
    
    // Initialize question distribution
    updateQuestionDistribution();
}

function updateQuestionDistribution() {
    const distributionChart = document.getElementById('distributionChart');
    if (!distributionChart) return;
    
    const selectedTypes = quizState.quizConfig.questionTypes;
    const totalQuestions = quizState.quizConfig.questionCount;
    
    if (selectedTypes.length === 0) {
        distributionChart.innerHTML = '<div class="distribution-bar" style="width: 100%; background: #e2e8f0;"></div>';
        return;
    }
    
    // Calculate distribution (simple equal distribution for now)
    const questionsPerType = Math.floor(totalQuestions / selectedTypes.length);
    const remainder = totalQuestions % selectedTypes.length;
    
    let distributionHTML = '';
    selectedTypes.forEach((type, index) => {
        let questions = questionsPerType;
        if (index < remainder) questions++;
        
        const width = (questions / totalQuestions) * 100;
        distributionHTML += `<div class="distribution-bar ${type.toLowerCase()}" style="width: ${width}%"></div>`;
    });
    
    distributionChart.innerHTML = distributionHTML;
}

// Initialize templates
function initTemplates() {
    const templateCards = document.querySelectorAll('.template-card');
    
    templateCards.forEach(card => {
        const applyButton = card.querySelector('.btn-outline');
        if (applyButton) {
            applyButton.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent card click event
                const template = card.dataset.template;
                applyTemplate(template);
            });
        }
        
        // Also allow clicking anywhere on the card
        card.addEventListener('click', function(e) {
            if (!e.target.classList.contains('btn-outline')) {
                const template = this.dataset.template;
                applyTemplate(template);
            }
        });
    });
}

function applyTemplate(template) {
    console.log('Applying template:', template);
    
    const templates = {
        'exam-prep': {
            questionCount: 25,
            difficulty: 'mixed',
            timeLimit: 60,
            questionTypes: ['MCQ', 'TrueFalse', 'FillBlank'],
            enableExplanations: true,
            passingScore: 75,
            bloomLevel: 'mixed'
        },
        'quick-review': {
            questionCount: 10,
            difficulty: 'easy',
            timeLimit: 30,
            questionTypes: ['MCQ', 'TrueFalse'],
            enableExplanations: false,
            passingScore: 60,
            bloomLevel: 'remember'
        },
        'deep-learning': {
            questionCount: 15,
            difficulty: 'hard',
            timeLimit: 90,
            questionTypes: ['MCQ', 'ShortAnswer', 'FillBlank'],
            enableExplanations: true,
            passingScore: 80,
            bloomLevel: 'analyze'
        },
        'fun-quiz': {
            questionCount: 12,
            difficulty: 'easy',
            timeLimit: 45,
            questionTypes: ['MCQ', 'TrueFalse'],
            enableExplanations: true,
            passingScore: 60,
            bloomLevel: 'understand'
        }
    };
    
    const config = templates[template];
    if (!config) {
        console.error('Template not found:', template);
        showNotification('Template not found', 'error');
        return;
    }
    
    // Apply template configuration to quizState
    Object.keys(config).forEach(key => {
        quizState.quizConfig[key] = config[key];
    });
    
    // Update UI elements
    const questionCount = document.getElementById('questionCount');
    const questionCountValue = document.getElementById('questionCountValue');
    const difficultyLevel = document.getElementById('difficultyLevel');
    const timeLimit = document.getElementById('timeLimit');
    const passingScore = document.getElementById('passingScore');
    const bloomLevel = document.getElementById('bloomLevel');
    const enableExplanations = document.getElementById('enableExplanations');
    
    if (questionCount) questionCount.value = config.questionCount;
    if (questionCountValue) questionCountValue.textContent = config.questionCount;
    if (difficultyLevel) difficultyLevel.value = config.difficulty;
    if (timeLimit) timeLimit.value = config.timeLimit;
    if (passingScore) passingScore.value = config.passingScore;
    if (bloomLevel) bloomLevel.value = config.bloomLevel;
    
    // Update checkboxes for question types
    const questionTypeCheckboxes = document.querySelectorAll('input[name="questionTypes"]');
    questionTypeCheckboxes.forEach(checkbox => {
        checkbox.checked = config.questionTypes.includes(checkbox.value);
    });
    
    if (enableExplanations) enableExplanations.checked = config.enableExplanations;
    
    updateQuizSummary();
    updateQuestionDistribution();
    showNotification(`"${template.replace('-', ' ')}" template applied successfully!`, 'success');
    
    console.log('Template applied successfully:', quizState.quizConfig);
}

// Initialize event listeners
function initEventListeners() {
    // Generate quiz button
    const generateBtn = document.getElementById('generateQuiz');
    if (generateBtn) {
        generateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Generate Quiz button clicked');
            generateQuiz();
        });
    } else {
        console.error('Generate Quiz button not found!');
    }
    
    // Start quiz button
    const startQuizBtn = document.getElementById('startQuiz');
    if (startQuizBtn) {
        startQuizBtn.addEventListener('click', function(e) {
            e.preventDefault();
            startQuiz();
        });
    }
    
    // Save template button
    const saveTemplateBtn = document.getElementById('saveTemplate');
    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveCurrentConfig();
        });
    }
    
    // Export questions button
    const exportQuestionsBtn = document.getElementById('exportQuestions');
    if (exportQuestionsBtn) {
        exportQuestionsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportQuestions();
        });
    }
    
    // Print questions button
    const printQuestionsBtn = document.getElementById('printQuestions');
    if (printQuestionsBtn) {
        printQuestionsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            printQuestions();
        });
    }
    
    // Preview quiz button
    const previewQuizBtn = document.getElementById('previewQuiz');
    if (previewQuizBtn) {
        previewQuizBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (quizState.generatedQuestions.length > 0) {
                openQuestionsModal();
            } else {
                showNotification('Please generate questions first', 'warning');
            }
        });
    }
}

// Initialize modal events
function initModalEvents() {
    const modal = document.getElementById('questionsModal');
    const closeModal = document.getElementById('closeQuestionsModal');
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            if (modal) modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Regenerate questions button
    const regenerateBtn = document.getElementById('regenerateQuestions');
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to regenerate all questions? This will replace the current questions.')) {
                generateQuiz();
                if (modal) modal.style.display = 'none';
            }
        });
    }
}

// Update quiz summary with enhanced information
function updateQuizSummary() {
    const sourceMap = {
        'pdf': 'PDF Document',
        'text': 'Text Content',
        'url': 'Website URL',
        'topic': 'Topic'
    };
    
    const summarySource = document.getElementById('summarySource');
    const summaryQuestions = document.getElementById('summaryQuestions');
    const summaryTime = document.getElementById('summaryTime');
    const summaryDifficulty = document.getElementById('summaryDifficulty');
    const summaryPassing = document.getElementById('summaryPassing');
    const summaryLanguage = document.getElementById('summaryLanguage');
    
    // Update source
    if (summarySource) {
        summarySource.textContent = quizState.content ? 
            `${sourceMap[quizState.currentMethod]}: ${quizState.content.substring(0, 30)}${quizState.content.length > 30 ? '...' : ''}` : 
            'Not selected';
    }
    
    // Update questions
    if (summaryQuestions) {
        summaryQuestions.textContent = `${quizState.quizConfig.questionCount} questions`;
    }
    
    // Update time
    if (summaryTime) {
        summaryTime.textContent = quizState.quizConfig.timeLimit === 0 ? 
            'No time limit' : `${quizState.quizConfig.timeLimit}s per question`;
    }
    
    // Update difficulty
    if (summaryDifficulty) {
        summaryDifficulty.textContent = quizState.quizConfig.difficulty.charAt(0).toUpperCase() + 
            quizState.quizConfig.difficulty.slice(1);
    }
    
    // Update passing score
    if (summaryPassing) {
        summaryPassing.textContent = `${quizState.quizConfig.passingScore}%`;
    }
    
    // Update language
    if (summaryLanguage) {
        const languageNames = {
            'en': 'English', 'es': 'Spanish', 'fr': 'French', 
            'de': 'German', 'hi': 'Hindi', 'zh': 'Chinese', 'ja': 'Japanese'
        };
        summaryLanguage.textContent = languageNames[quizState.quizConfig.language] || 'English';
    }
    
    // Update estimated stats
    updateEstimatedStats();
}

function updateEstimatedStats() {
    const estimatedTime = document.getElementById('estimatedTime');
    const questionTypesCount = document.getElementById('questionTypesCount');
    const coverageScore = document.getElementById('coverageScore');
    
    if (estimatedTime) {
        const totalSeconds = quizState.quizConfig.questionCount * (quizState.quizConfig.timeLimit || 45);
        const minutes = Math.floor(totalSeconds / 60);
        estimatedTime.textContent = minutes > 0 ? `${minutes} min` : '<5 min';
    }
    
    if (questionTypesCount) {
        const typeCount = quizState.quizConfig.questionTypes.length;
        questionTypesCount.textContent = `${typeCount} type${typeCount !== 1 ? 's' : ''}`;
    }
    
    if (coverageScore) {
        // Simple coverage calculation based on content length and question count
        let coverage = 70;
        if (quizState.quizConfig.questionCount >= 20) coverage = 90;
        else if (quizState.quizConfig.questionCount >= 15) coverage = 85;
        else if (quizState.quizConfig.questionCount >= 10) coverage = 75;
        coverageScore.textContent = `${coverage}%`;
    }
}

function updateProgressIndicator(step) {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((stepElement, index) => {
        if (index + 1 <= step) {
            stepElement.classList.add('active');
        } else {
            stepElement.classList.remove('active');
        }
    });
}

// Enhanced quiz generation with REAL Gemini API - NO FALLBACK TO DEFAULT
async function generateQuiz() {
    console.log('=== QUIZ GENERATION START ===');
    
    if (!quizState.content) {
        showNotification('❌ Please provide content first', 'error');
        return;
    }
    
    if (!quizState.quizConfig.title) {
        showNotification('❌ Please enter a quiz title', 'error');
        const quizTitle = document.getElementById('quizTitle');
        if (quizTitle) quizTitle.focus();
        return;
    }
    
    console.log('Starting quiz generation with:', {
        content: quizState.content,
        config: quizState.quizConfig
    });
    
    showEnhancedLoading(true, 'Generating personalized quiz...', 'AI is analyzing your content and creating tailored questions.');
    
    try {
        // Prepare request data for Gemini API
        const requestData = {
            content: quizState.content,
            config: {
                questionCount: quizState.quizConfig.questionCount,
                difficulty: quizState.quizConfig.difficulty,
                questionTypes: quizState.quizConfig.questionTypes,
                title: quizState.quizConfig.title,
                language: quizState.quizConfig.language,
                bloomLevel: quizState.quizConfig.bloomLevel
            }
        };
        
        console.log('📤 Sending to Gemini API:', requestData);
        
        // Call your backend API endpoint that connects to Gemini
        const response = await fetch('/api/generate-quiz-ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Server error' }));
            console.error('❌ Server error:', response.status, errorData);
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Gemini API Response:', data);
        
        if (data.success && data.questions && data.questions.length > 0) {
            console.log('🎉 Success! Received', data.questions.length, 'questions from Gemini API');
            
            // Use the REAL questions from Gemini API
            quizState.generatedQuestions = data.questions;
            
            showEnhancedLoading(false);
            showNotification(`✅ Quiz generated successfully with ${data.questions.length} AI questions!`, 'success');
            updateProgressIndicator(3);
            
            // AUTO-REDIRECT to quiz engine after successful generation
            console.log('🎯 AUTO-REDIRECTING to quiz engine...');
            setTimeout(() => {
                startQuiz(); // This will redirect to quiz-engine.html
            }, 1500);
            
        } else {
            console.error('❌ No questions in response:', data);
            throw new Error(data.error || '❌ No questions generated by AI. Please try again with different content.');
        }
        
    } catch (error) {
        console.error('❌ Quiz generation failed:', error);
        showEnhancedLoading(false);
        
        // Show specific error message - NO FALLBACK TO DEFAULT QUESTIONS
        let errorMessage = '❌ Failed to generate quiz. ';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = '❌ Cannot connect to AI server. Please check if the server is running and try again.';
        } else if (error.message.includes('Server error: 500')) {
            errorMessage = '❌ Server error. Please check your API configuration and try again.';
        } else if (error.message.includes('Server error: 401')) {
            errorMessage = '❌ API key error. Please check your Gemini API configuration.';
        } else if (error.message.includes('No questions generated')) {
            errorMessage = `${error.message}`;
        } else {
            errorMessage = `❌ ${error.message}`;
        }
        
        showNotification(errorMessage, 'error');
        
        // DISABLED FALLBACK - No default questions
        // User must fix the issue and try again
        
        // Reset progress
        updateProgressIndicator(2);
    }
    
    console.log('=== QUIZ GENERATION END ===');
}

// Show questions preview in the modal
function showQuestionsPreview() {
    const previewQuestions = document.getElementById('previewQuestions');
    if (!previewQuestions || quizState.generatedQuestions.length === 0) return;
    
    const existingPreview = previewQuestions.querySelector('.questions-preview-list');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Show first 3 questions in preview
    const previewHTML = quizState.generatedQuestions.slice(0, 3).map((question, index) => `
        <div class="preview-question">
            <div class="question-header">
                <span class="question-number">Q${index + 1}</span>
                <span class="question-type-badge ${question.type.toLowerCase()}">${question.type}</span>
                <span class="difficulty-badge ${question.difficulty}">${question.difficulty}</span>
            </div>
            <p class="question-text">${question.question}</p>
            ${question.options ? `
                <div class="preview-options">
                    ${question.options.map((option, optIndex) => `
                        <div class="preview-option ${option === question.correctAnswer ? 'correct' : ''}">
                            <span class="option-letter">${String.fromCharCode(65 + optIndex)}</span>
                            <span>${option}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
    
    const placeholder = previewQuestions.querySelector('.preview-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    previewQuestions.insertAdjacentHTML('beforeend', `
        <div class="questions-preview-list">
            ${previewHTML}
            <div class="preview-footer">
                <p>+ ${quizState.generatedQuestions.length - 3} more questions generated</p>
                <button class="btn-outline btn-small" onclick="openQuestionsModal()">
                    View All Questions
                </button>
            </div>
        </div>
    `);
}

// Open questions modal with all questions
function openQuestionsModal() {
    const modal = document.getElementById('questionsModal');
    const questionsList = document.getElementById('questionsList');
    
    if (!modal || !questionsList) return;
    
    // Populate the modal with all questions
    questionsList.innerHTML = quizState.generatedQuestions.map((question, index) => `
        <div class="question-modal-item" data-type="${question.type}" data-difficulty="${question.difficulty}">
            <div class="question-modal-header">
                <div class="question-meta">
                    <span class="question-number">Question ${index + 1}</span>
                    <span class="question-type-badge ${question.type.toLowerCase()}">${question.type}</span>
                    <span class="difficulty-badge ${question.difficulty}">${question.difficulty}</span>
                </div>
                <div class="question-actions">
                    <button class="btn-icon" onclick="editQuestion(${index})" title="Edit question">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
            
            <div class="question-modal-content">
                <p class="question-text">${question.question}</p>
                
                ${question.options ? `
                <div class="question-options-modal">
                    ${question.options.map((option, optIndex) => `
                        <div class="option-modal ${option === question.correctAnswer ? 'correct-answer' : ''}">
                            <span class="option-letter">${String.fromCharCode(65 + optIndex)}</span>
                            <span class="option-text">${option}</span>
                            ${option === question.correctAnswer ? '<i class="fas fa-check correct-indicator"></i>' : ''}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${question.explanation ? `
                <div class="question-explanation-modal">
                    <h5>Explanation:</h5>
                    <p>${question.explanation}</p>
                </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    // Update stats
    updateQuestionsStats();
    
    // Show modal
    modal.style.display = 'block';
}

// Update questions statistics in modal
function updateQuestionsStats() {
    const totalQuestions = document.getElementById('totalQuestions');
    const totalTime = document.getElementById('totalTime');
    const avgDifficulty = document.getElementById('avgDifficulty');
    const typeDistribution = document.getElementById('typeDistribution');
    
    if (totalQuestions) totalQuestions.textContent = quizState.generatedQuestions.length;
    if (totalTime) {
        const totalSeconds = quizState.generatedQuestions.length * (quizState.quizConfig.timeLimit || 45);
        const minutes = Math.ceil(totalSeconds / 60);
        totalTime.textContent = `${minutes} min`;
    }
    if (avgDifficulty) {
        const difficulties = quizState.generatedQuestions.map(q => q.difficulty);
        const difficultyCount = difficulties.reduce((acc, diff) => {
            acc[diff] = (acc[diff] || 0) + 1;
            return acc;
        }, {});
        
        const mostCommon = Object.keys(difficultyCount).reduce((a, b) => 
            difficultyCount[a] > difficultyCount[b] ? a : b
        );
        avgDifficulty.textContent = mostCommon.charAt(0).toUpperCase() + mostCommon.slice(1);
    }
    if (typeDistribution) {
        const typeCount = new Set(quizState.generatedQuestions.map(q => q.type)).size;
        typeDistribution.textContent = `${typeCount} type${typeCount !== 1 ? 's' : ''}`;
    }
}

// Edit question function
function editQuestion(index) {
    const question = quizState.generatedQuestions[index];
    showNotification(`Editing question ${index + 1} - Feature coming soon!`, 'info');
    // TODO: Implement question editing interface
}

// Export questions
function exportQuestions() {
    if (quizState.generatedQuestions.length === 0) {
        showNotification('❌ No questions to export. Please generate questions first.', 'warning');
        return;
    }
    
    try {
        const quizData = {
            title: quizState.quizConfig.title || 'Generated Quiz',
            questions: quizState.generatedQuestions,
            config: quizState.quizConfig,
            content: quizState.content,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(quizData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quiz-${quizState.quizConfig.title ? quizState.quizConfig.title.replace(/[^a-z0-9]/gi, '_') : 'questions'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification(`✅ Questions exported successfully! (${quizState.generatedQuestions.length} questions)`, 'success');
        console.log('Questions exported:', quizData);
    } catch (error) {
        console.error('Export failed:', error);
        showNotification('❌ Failed to export questions', 'error');
    }
}

// Print questions
function printQuestions() {
    if (quizState.generatedQuestions.length === 0) {
        showNotification('❌ No questions to print. Please generate questions first.', 'warning');
        return;
    }
    
    try {
        // Create a print-friendly version
        const printWindow = window.open('', '_blank');
        const quizTitle = quizState.quizConfig.title || 'Generated Quiz';
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${quizTitle}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        line-height: 1.6; 
                        margin: 20px; 
                        color: #333;
                    }
                    .quiz-header { 
                        text-align: center; 
                        margin-bottom: 30px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                    }
                    .question-item { 
                        margin-bottom: 30px; 
                        page-break-inside: avoid;
                        border: 1px solid #ddd;
                        padding: 15px;
                        border-radius: 5px;
                    }
                    .question-header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center;
                        margin-bottom: 10px;
                    }
                    .question-number { 
                        font-weight: bold; 
                        font-size: 1.2em;
                    }
                    .question-meta { 
                        display: flex; 
                        gap: 10px;
                    }
                    .badge { 
                        padding: 4px 8px; 
                        border-radius: 4px; 
                        font-size: 0.8em;
                        font-weight: bold;
                    }
                    .badge.mcq { background: #e3f2fd; color: #1976d2; }
                    .badge.truefalse { background: #e8f5e8; color: #2e7d32; }
                    .badge.fillblank { background: #fff3e0; color: #f57c00; }
                    .badge.shortanswer { background: #f3e5f5; color: #7b1fa2; }
                    .badge.easy { background: #e8f5e8; color: #2e7d32; }
                    .badge.medium { background: #fff3e0; color: #f57c00; }
                    .badge.hard { background: #ffebee; color: #c62828; }
                    .question-text { 
                        font-weight: bold; 
                        margin-bottom: 15px;
                        font-size: 1.1em;
                    }
                    .question-options { 
                        margin: 15px 0;
                    }
                    .option { 
                        margin: 8px 0; 
                        padding: 8px;
                        border-left: 3px solid #ddd;
                    }
                    .option.correct { 
                        border-left-color: #4caf50;
                        background: #f1f8e9;
                    }
                    .option-letter { 
                        font-weight: bold; 
                        margin-right: 10px;
                    }
                    .question-explanation { 
                        margin-top: 15px; 
                        padding: 15px;
                        background: #f5f5f5;
                        border-radius: 5px;
                    }
                    .quiz-stats {
                        margin: 20px 0;
                        padding: 15px;
                        background: #f8f9fa;
                        border-radius: 5px;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 15px;
                        text-align: center;
                    }
                    .stat {
                        padding: 10px;
                    }
                    .stat-value {
                        display: block;
                        font-size: 1.5em;
                        font-weight: bold;
                        color: #1976d2;
                    }
                    .stat-label {
                        font-size: 0.9em;
                        color: #666;
                    }
                    @media print {
                        body { margin: 0; }
                        .question-item { border: none; padding: 10px 0; }
                        .quiz-header { border-bottom: 1px solid #000; }
                    }
                </style>
            </head>
            <body>
                <div class="quiz-header">
                    <h1>${quizTitle}</h1>
                    <p>Generated on ${new Date().toLocaleDateString()} • ${quizState.generatedQuestions.length} questions</p>
                </div>
                
                <div class="quiz-stats">
                    <div class="stats-grid">
                        <div class="stat">
                            <span class="stat-value">${quizState.generatedQuestions.length}</span>
                            <span class="stat-label">Total Questions</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${Math.ceil(quizState.generatedQuestions.length * (quizState.quizConfig.timeLimit || 45) / 60)} min</span>
                            <span class="stat-label">Estimated Time</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${Object.keys(quizState.generatedQuestions.reduce((acc, q) => { acc[q.type] = true; return acc; }, {})).length}</span>
                            <span class="stat-label">Question Types</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${quizState.quizConfig.passingScore}%</span>
                            <span class="stat-label">Passing Score</span>
                        </div>
                    </div>
                </div>
                
                ${quizState.generatedQuestions.map((question, index) => `
                    <div class="question-item">
                        <div class="question-header">
                            <span class="question-number">Question ${index + 1}</span>
                            <div class="question-meta">
                                <span class="badge ${question.type.toLowerCase()}">${question.type}</span>
                                <span class="badge ${question.difficulty}">${question.difficulty}</span>
                                ${question.bloomLevel ? `<span class="badge bloom-${question.bloomLevel}">${question.bloomLevel}</span>` : ''}
                            </div>
                        </div>
                        
                        <div class="question-content">
                            <p class="question-text">${question.question}</p>
                            
                            ${question.options ? `
                            <div class="question-options">
                                ${question.options.map((option, optIndex) => `
                                    <div class="option ${option === question.correctAnswer ? 'correct' : ''}">
                                        <span class="option-letter">${String.fromCharCode(65 + optIndex)}</span>
                                        <span class="option-text">${option}</span>
                                    </div>
                                `).join('')}
                            </div>
                            ` : ''}
                            
                            ${question.explanation ? `
                            <div class="question-explanation">
                                <h5>Explanation:</h5>
                                <p>${question.explanation}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
                
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        showNotification('Opening print preview...', 'success');
        
    } catch (error) {
        console.error('Print failed:', error);
        showNotification('❌ Failed to open print preview', 'error');
    }
}

// Save current configuration
function saveCurrentConfig() {
    const configs = JSON.parse(localStorage.getItem('quizConfigs')) || [];
    const configName = prompt('Enter a name for this configuration:');
    
    if (configName) {
        const configToSave = {
            name: configName,
            config: { ...quizState.quizConfig },
            content: quizState.content,
            method: quizState.currentMethod,
            savedAt: new Date().toISOString()
        };
        
        configs.push(configToSave);
        localStorage.setItem('quizConfigs', JSON.stringify(configs));
        showNotification(`✅ Configuration "${configName}" saved successfully!`, 'success');
    }
}

// Start the quiz - FIXED REDIRECTION
function startQuiz() {
    console.log('🚀 Starting quiz function called');
    
    if (quizState.generatedQuestions.length === 0) {
        showNotification('❌ No questions available. Please generate questions first using the AI generator.', 'error');
        return;
    }
    
    console.log('🎯 Starting quiz with', quizState.generatedQuestions.length, 'questions');
    
    // Additional validation
    const validQuestions = quizState.generatedQuestions.filter(q => 
        q.question && 
        (q.type !== 'MCQ' || (q.options && q.options.length > 0)) &&
        q.correctAnswer
    );
    
    if (validQuestions.length === 0) {
        showNotification('❌ Invalid questions generated. Please try generating again.', 'error');
        return;
    }
    
    // Prepare quiz data
    const quizData = {
        questions: validQuestions,
        config: quizState.quizConfig,
        title: quizState.quizConfig.title || `Quiz about ${quizState.content}`,
        topic: quizState.content,
        generatedAt: new Date().toISOString(),
        source: 'gemini_ai',
        totalQuestions: validQuestions.length,
        timeLimit: quizState.quizConfig.timeLimit,
        passingScore: quizState.quizConfig.passingScore
    };
    
    // Save to localStorage for quiz engine
    try {
        localStorage.setItem('currentQuiz', JSON.stringify(quizData));
        console.log('✅ Quiz data saved to localStorage:', quizData);
        
        // Show immediate redirect message
        showNotification(`🎯 Redirecting to quiz with ${validQuestions.length} AI-generated questions...`, 'success');
        
        // Close modal if open
        const modal = document.getElementById('questionsModal');
        if (modal) modal.style.display = 'none';
        
        // IMMEDIATE REDIRECTION with error handling
        console.log('🎯 DIRECT REDIRECTION to quiz-engine.html');
        
        // Add a small delay to ensure notification is seen
        setTimeout(() => {
            try {
                window.location.href = 'quiz-engine.html';
            } catch (redirectError) {
                console.error('❌ Redirect error:', redirectError);
                // Fallback: create a link and click it
                const link = document.createElement('a');
                link.href = 'quiz-engine.html';
                link.click();
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error saving quiz data:', error);
        showNotification('❌ Error starting quiz. Please try again.', 'error');
    }
}

// Enhanced utility functions
function showEnhancedLoading(show, title = 'Processing...', message = 'Please wait while we process your request.') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingTitle = document.getElementById('loadingTitle');
    const loadingMessage = document.getElementById('loadingMessage');
    
    if (!overlay) return;
    
    if (show) {
        if (loadingTitle) loadingTitle.textContent = title;
        if (loadingMessage) loadingMessage.textContent = message;
        overlay.classList.add('show');
        
        // Start progress animation
        simulateAIGeneration();
    } else {
        overlay.classList.remove('show');
        // Reset progress
        updateProgressBar(0, 'Complete');
    }
}

function simulateAIGeneration() {
    const steps = [
        { percent: 10, text: 'Analyzing content structure...' },
        { percent: 30, text: 'Identifying key concepts...' },
        { percent: 50, text: 'Generating question ideas...' },
        { percent: 70, text: 'Creating answer options...' },
        { percent: 85, text: 'Writing explanations...' },
        { percent: 95, text: 'Final quality check...' },
        { percent: 100, text: 'Complete!' }
    ];
    
    steps.forEach((step, index) => {
        setTimeout(() => {
            updateProgressBar(step.percent, step.text);
        }, index * 800);
    });
}

function updateProgressBar(percent, text) {
    const progressFill = document.getElementById('aiProgress');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = text;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
}

function simulateProgress(type, callback) {
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        updateProgressBar(progress, `Processing ${type}...`);
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(callback, 500);
        }
    }, 200);
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    // Add icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Check server health
async function checkServerHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        const statusIndicator = document.getElementById('serverStatus');
        if (statusIndicator) {
            if (data.gemini === 'Configured') {
                statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i> AI Server Connected & Ready';
                statusIndicator.className = 'status-indicator connected';
                statusIndicator.style.display = 'block';
            } else {
                statusIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> AI Server: API Key Not Configured';
                statusIndicator.className = 'status-indicator';
                statusIndicator.style.display = 'block';
            }
        }
    } catch (error) {
        console.log('Server health check failed - AI server not available');
        const statusIndicator = document.getElementById('serverStatus');
        if (statusIndicator) {
            statusIndicator.innerHTML = '<i class="fas fa-unlink"></i> AI Server Not Available - Check Server Connection';
            statusIndicator.className = 'status-indicator';
            statusIndicator.style.display = 'block';
        }
    }
}

// Add CSS for the new styles
const style = document.createElement('style');
style.textContent = `
    .badge.bloom-remember { background: rgba(102, 126, 234, 0.1); color: var(--primary); }
    .badge.bloom-understand { background: rgba(74, 222, 128, 0.1); color: var(--success); }
    .badge.bloom-apply { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
    .badge.bloom-analyze { background: rgba(239, 68, 68, 0.1); color: var(--error); }
    .badge.bloom-evaluate { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
    .badge.bloom-create { background: rgba(6, 182, 212, 0.1); color: #06b6d4; }
    
    .status-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: 8px;
        margin: 1rem 0;
        background: rgba(245, 158, 11, 0.1);
        color: var(--warning);
        border: 1px solid rgba(245, 158, 11, 0.2);
    }
    
    .status-indicator.connected {
        background: rgba(74, 222, 128, 0.1);
        color: var(--success);
        border-color: rgba(74, 222, 128, 0.2);
    }
    
    .status-indicator i {
        font-size: 0.8rem;
    }
    
    .recent-tag {
        background: rgba(102, 126, 234, 0.1);
        color: var(--primary);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid transparent;
    }
    
    .recent-tag:hover {
        background: var(--primary);
        color: white;
    }
    
    .distribution-bar.mcq { background: var(--primary); }
    .distribution-bar.truefalse { background: var(--success); }
    .distribution-bar.fillblank { background: var(--warning); }
    .distribution-bar.shortanswer { background: var(--info); }
    
    .btn-disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .btn-disabled:hover {
        transform: none !important;
    }
    
    .questions-preview-list {
        margin-top: 1rem;
    }
    
    .preview-question {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
    }
    
    .question-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }
    
    .question-number {
        font-weight: bold;
        color: var(--primary);
    }
    
    .question-type-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: bold;
    }
    
    .question-type-badge.mcq { background: rgba(102, 126, 234, 0.1); color: var(--primary); }
    .question-type-badge.truefalse { background: rgba(74, 222, 128, 0.1); color: var(--success); }
    .question-type-badge.fillblank { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
    .question-type-badge.shortanswer { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
    
    .difficulty-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: bold;
    }
    
    .difficulty-badge.easy { background: rgba(74, 222, 128, 0.1); color: var(--success); }
    .difficulty-badge.medium { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
    .difficulty-badge.hard { background: rgba(239, 68, 68, 0.1); color: var(--error); }
    
    .preview-options {
        margin: 0.75rem 0;
    }
    
    .preview-option {
        padding: 0.5rem;
        margin: 0.25rem 0;
        border-left: 3px solid #e2e8f0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .preview-option.correct {
        border-left-color: var(--success);
        background: rgba(74, 222, 128, 0.05);
    }
    
    .option-letter {
        font-weight: bold;
        color: var(--primary);
    }
    
    .preview-footer {
        text-align: center;
        padding: 1rem;
        border-top: 1px solid #e2e8f0;
        margin-top: 1rem;
    }
    
    .question-modal-item {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1rem;
    }
    
    .question-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .question-meta {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .question-options-modal {
        margin: 1rem 0;
    }
    
    .option-modal {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        margin: 0.5rem 0;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        transition: all 0.3s ease;
    }
    
    .option-modal.correct-answer {
        border-color: var(--success);
        background: rgba(74, 222, 128, 0.05);
    }
    
    .correct-indicator {
        color: var(--success);
        margin-left: auto;
    }
    
    .question-explanation-modal {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 6px;
        margin-top: 1rem;
    }
    
    .question-explanation-modal h5 {
        margin: 0 0 0.5rem 0;
        color: var(--primary);
    }
    
    .content-preview {
        margin-top: 1rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 6px;
        border-left: 4px solid var(--primary);
    }
    
    .content-preview h5 {
        margin: 0 0 0.5rem 0;
        color: var(--primary);
    }
    
    .content-preview p {
        margin: 0;
        font-style: italic;
        color: #666;
    }
    
    .analysis-results {
        margin: 1rem 0;
    }
    
    .analysis-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid #f1f1f1;
    }
    
    .analysis-item:last-child {
        border-bottom: none;
    }
    
    .analysis-item span:first-child {
        font-weight: 600;
        color: var(--text);
    }
    
    .analysis-item span:last-child {
        color: var(--text-light);
    }
    
    .quality-score.excellent { color: var(--success); }
    .quality-score.good { color: var(--warning); }
    .quality-score.fair { color: var(--info); }
    .quality-score.poor { color: var(--error); }
`;
document.head.appendChild(style);

// Debug: Check if elements exist
console.log('Generate Quiz button:', document.getElementById('generateQuiz'));
console.log('Template cards:', document.querySelectorAll('.template-card'));
console.log('Export button:', document.getElementById('exportQuestions'));
console.log('Print button:', document.getElementById('printQuestions'));
console.log('Preview button:', document.getElementById('previewQuiz'));
console.log('Start Quiz button:', document.getElementById('startQuiz'));