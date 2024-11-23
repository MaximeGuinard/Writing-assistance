export class SEOAnalyzer {
    constructor() {
        this.keywords = new Set();
        this.OPTIMAL_DENSITY = {
            min: 0.5,
            max: 2.0
        };
        this.SPAM_THRESHOLD = {
            density: 2.5,
            consecutive: 2
        };
    }

    addKeyword(keyword) {
        this.keywords.add(keyword.toLowerCase());
    }

    removeKeyword(keyword) {
        this.keywords.delete(keyword.toLowerCase());
    }

    hasKeyword(keyword) {
        return this.keywords.has(keyword.toLowerCase());
    }

    countWords(text) {
        const strippedText = text.replace(/<[^>]*>/g, ' ');
        return strippedText.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    analyzeContent({ title, description, body }) {
        const wordCount = this.countWords(body);
        const keywordAnalysis = this.analyzeKeywords(body);
        const suggestions = this.generateSuggestions({ title, description, body, keywordAnalysis });
        const score = this.calculateScore({ title, description, body, keywordAnalysis });
        const dangerScore = this.calculateSpamScore(keywordAnalysis);

        return {
            score,
            dangerScore,
            wordCount,
            suggestions,
            keywordAnalysis
        };
    }

    analyzeKeywords(text) {
        const cleanText = text.replace(/<[^>]*>/g, ' ').toLowerCase();
        const words = cleanText.split(/\s+/);
        const totalWords = words.length;
        const densities = {};

        this.keywords.forEach(keyword => {
            const keywordCount = this.countKeywordOccurrences(cleanText, keyword);
            const density = (keywordCount * 100) / totalWords;
            densities[keyword] = {
                count: keywordCount,
                density: parseFloat(density.toFixed(2))
            };
        });

        const totalDensity = Object.values(densities)
            .reduce((sum, { density }) => sum + density, 0);

        return {
            densities,
            totalDensity: parseFloat(totalDensity.toFixed(2))
        };
    }

    countKeywordOccurrences(text, keyword) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        return (text.match(regex) || []).length;
    }

    calculateScore({ title, description, body, keywordAnalysis }) {
        if (this.keywords.size === 0) return 0;
        
        let score = 0;
        const maxScore = 100;

        // Score de base pour le contenu
        if (body) {
            score += 20;
            const wordCount = this.countWords(body);
            if (wordCount >= 300) score += 10;
            if (wordCount >= 600) score += 10;
        }

        // Score pour les métadonnées
        if (title) score += 10;
        if (description) score += 10;

        // Score pour l'utilisation des mots-clés
        for (const [keyword, data] of Object.entries(keywordAnalysis.densities)) {
            if (data.density >= this.OPTIMAL_DENSITY.min && data.density <= this.OPTIMAL_DENSITY.max) {
                score += 20 / this.keywords.size;
            }
        }

        // Score pour la structure
        const h2Count = (body.match(/<h2/g) || []).length;
        const linkCount = (body.match(/<a[^>]*>/g) || []).length;
        const imgCount = (body.match(/<img/g) || []).length;

        if (h2Count > 0) score += 10;
        if (linkCount > 0) score += 10;
        if (imgCount > 0) score += 10;

        return Math.min(Math.round(score), maxScore);
    }

    generateSuggestions({ title, description, body, keywordAnalysis }) {
        const suggestions = [];
        const h2Count = (body.match(/<h2/g) || []).length;
        const h3Count = (body.match(/<h3/g) || []).length;
        const linkCount = (body.match(/<a[^>]*>/g) || []).length;
        const imgCount = (body.match(/<img/g) || []).length;
        const wordCount = this.countWords(body);
        const paragraphs = body.split('</p>').length - 1;

        if (wordCount === 0) {
            suggestions.push("📝 Commencez à rédiger votre contenu");
            return suggestions;
        }

        // Structure du contenu
        if (h2Count === 0) {
            suggestions.push("📚 Ajoutez des sous-titres H2 pour structurer votre contenu");
        }
        if (wordCount > 300 && h2Count < 2) {
            suggestions.push("🔍 Augmentez le nombre de sous-titres pour une meilleure structure");
        }

        // Médias et liens
        if (imgCount === 0) {
            suggestions.push("🖼️ Ajoutez des images pertinentes avec des attributs alt");
        }
        if (linkCount === 0) {
            suggestions.push("🔗 Ajoutez des liens internes et externes pertinents");
        }

        // Longueur du contenu
        if (wordCount < 300) {
            suggestions.push("📈 Développez votre contenu (minimum 300 mots)");
        }

        // Enrichissement du contenu
        if (!body.includes('<ul') && !body.includes('<ol')) {
            suggestions.push("📋 Utilisez des listes pour structurer l'information");
        }

        // Métadonnées
        if (!title || title.length < 30) {
            suggestions.push("📏 Optimisez votre titre (50-60 caractères)");
        }
        if (!description || description.length < 120) {
            suggestions.push("📏 Optimisez votre meta description (150-160 caractères)");
        }

        return suggestions;
    }

    calculateSpamScore(keywordAnalysis) {
        if (this.keywords.size === 0) return 0;
        
        let spamScore = 0;
        const maxSpamScore = 100;

        for (const [keyword, data] of Object.entries(keywordAnalysis.densities)) {
            if (data.density > this.SPAM_THRESHOLD.density) {
                spamScore += (data.density - this.SPAM_THRESHOLD.density) * 25;
            }
            if (data.density > this.SPAM_THRESHOLD.density * 0.8) {
                spamScore += 10;
            }
        }

        if (keywordAnalysis.totalDensity > this.SPAM_THRESHOLD.density * this.keywords.size) {
            spamScore += 20;
        }

        return Math.min(Math.round(spamScore), maxSpamScore);
    }
}