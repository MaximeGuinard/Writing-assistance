import { SEOAnalyzer } from './seo-analyzer.js';

const analyzer = new SEOAnalyzer();
let lastAnalysis = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    setupKeywordHandling();
    setupEditor();
    setupFormatButtons();
    setupTooltips();
    analyzeSEO();
});

function initializeEventListeners() {
    ['page-title', 'page-description', 'content-editor'].forEach(id => {
        document.getElementById(id).addEventListener('input', debounce(analyzeSEO, 500));
    });
}

function setupKeywordHandling() {
    const keywordInput = document.getElementById('keyword-input');
    const addButton = document.getElementById('add-keyword');

    keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addKeyword();
        }
    });

    addButton.addEventListener('click', (e) => {
        e.preventDefault();
        addKeyword();
    });
}

function setupTooltips() {
    const scoreCircle = document.getElementById('seo-score');
    const dangerCircle = document.getElementById('danger-circle');

    [scoreCircle, dangerCircle].forEach(element => {
        element.parentElement.classList.add('tooltip');
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip-content';
        element.parentElement.appendChild(tooltip);

        element.parentElement.addEventListener('click', function() {
            const wasActive = this.classList.contains('active');
            // Ferme tous les tooltips
            document.querySelectorAll('.tooltip').forEach(t => t.classList.remove('active'));
            // Ouvre ce tooltip si il n'était pas actif
            if (!wasActive) {
                this.classList.add('active');
                updateTooltipContent(this, element.id);
            }
        });
    });

    // Ferme les tooltips quand on clique ailleurs
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.tooltip')) {
            document.querySelectorAll('.tooltip').forEach(t => t.classList.remove('active'));
        }
    });
}

function updateTooltipContent(tooltipContainer, elementId) {
    if (!lastAnalysis) return;

    const tooltip = tooltipContainer.querySelector('.tooltip-content');
    
    if (elementId === 'seo-score') {
        const missingElements = [];
        const { score, keywordAnalysis } = lastAnalysis;
        
        if (score < 100) {
            if (!document.getElementById('page-title').value) {
                missingElements.push("• Ajoutez un titre de page");
            }
            if (!document.getElementById('page-description').value) {
                missingElements.push("• Ajoutez une meta description");
            }
            if (lastAnalysis.wordCount < 300) {
                missingElements.push("• Atteignez au moins 300 mots");
            }
            if (!document.getElementById('content-editor').innerHTML.includes('<h2')) {
                missingElements.push("• Ajoutez des sous-titres H2");
            }
            if (!document.getElementById('content-editor').innerHTML.includes('<a ')) {
                missingElements.push("• Ajoutez des liens");
            }
            if (!document.getElementById('content-editor').innerHTML.includes('<img ')) {
                missingElements.push("• Ajoutez des images");
            }
        }

        tooltip.innerHTML = `
            <strong>Pour atteindre 100% :</strong>
            ${missingElements.length > 0 ? missingElements.join('<br>') : 'Excellent travail ! Votre contenu est bien optimisé.'}
        `;
    } else if (elementId === 'danger-circle') {
        const { keywordAnalysis } = lastAnalysis;
        const spammedKeywords = Object.entries(keywordAnalysis.densities)
            .filter(([_, data]) => data.density > analyzer.SPAM_THRESHOLD.density * 0.8)
            .map(([keyword, data]) => ({
                keyword,
                density: data.density
            }));

        tooltip.innerHTML = `
            <strong>Mots-clés suroptimisés :</strong>
            ${spammedKeywords.length > 0 ? 
                `<div class="keyword-status">
                    ${spammedKeywords.map(k => `
                        <div class="keyword-status-item">
                            <span>${k.keyword}</span>
                            <span class="density">${k.density.toFixed(1)}%</span>
                        </div>
                    `).join('')}
                </div>
                <small>Densité recommandée : 0.5% - 2%</small>`
                : 
                '<div class="keyword-status">Aucun mot-clé n\'est suroptimisé</div>'}
        `;
    }
}

function addKeyword() {
    const input = document.getElementById('keyword-input');
    const keywords = input.value.split(',').map(k => k.trim()).filter(k => k);
    
    keywords.forEach(keyword => {
        if (keyword && !analyzer.hasKeyword(keyword)) {
            analyzer.addKeyword(keyword);
            createKeywordTag(keyword);
        }
    });

    input.value = '';
    analyzeSEO();
}

function createKeywordTag(keyword) {
    const tag = document.createElement('div');
    tag.className = 'keyword-tag';
    tag.innerHTML = `
        ${keyword}
        <button onclick="removeKeyword('${keyword}')">&times;</button>
    `;
    document.getElementById('keywords-list').appendChild(tag);
}

window.removeKeyword = function(keyword) {
    analyzer.removeKeyword(keyword);
    const tags = document.getElementById('keywords-list');
    const tag = Array.from(tags.children).find(t => t.textContent.trim().includes(keyword));
    if (tag) {
        tags.removeChild(tag);
    }
    analyzeSEO();
};

function setupEditor() {
    const editor = document.getElementById('content-editor');
    
    editor.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text');
        document.execCommand('insertHTML', false, text);
    });
}

function setupFormatButtons() {
    window.formatText = function(command) {
        document.execCommand(command, false, null);
        document.getElementById('content-editor').focus();
    };
}

function analyzeSEO() {
    const title = document.getElementById('page-title').value;
    const description = document.getElementById('page-description').value;
    const body = document.getElementById('content-editor').innerHTML;

    lastAnalysis = analyzer.analyzeContent({ title, description, body });
    updateInterface(lastAnalysis);
}

function updateInterface(analysis) {
    // Score SEO
    const scoreElement = document.getElementById('seo-score');
    scoreElement.textContent = analysis.score;
    scoreElement.className = 'score-circle';
    if (analysis.score < 50) {
        scoreElement.classList.add('low');
    } else if (analysis.score < 80) {
        scoreElement.classList.add('medium');
    } else {
        scoreElement.classList.add('high');
    }

    // Score de danger
    const dangerCircle = document.getElementById('danger-circle');
    dangerCircle.textContent = analysis.dangerScore;
    dangerCircle.className = 'danger-circle';
    if (analysis.dangerScore < 30) {
        dangerCircle.classList.add('low');
    } else if (analysis.dangerScore < 60) {
        dangerCircle.classList.add('medium');
    } else {
        dangerCircle.classList.add('high');
    }

    // Statistiques
    document.getElementById('word-count').textContent = analysis.wordCount;
    document.getElementById('reading-time').textContent = `${Math.ceil(analysis.wordCount / 200)} min`;

    // Suggestions
    const suggestionsContainer = document.getElementById('suggestions');
    suggestionsContainer.innerHTML = `
        <h3>Suggestions d'amélioration</h3>
        ${analysis.suggestions.map(s => `<div class="suggestion-item">${s}</div>`).join('')}
    `;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}