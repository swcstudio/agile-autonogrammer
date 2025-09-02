/**
 * TextAgent
 * Specialized agent for text generation, analysis, and natural language processing
 */

import { BaseAgent } from '../core/BaseAgent';
import type {
  AgentConfig,
  Task,
  AgentCapability,
  CollaborationMode,
} from '../types/agents';
import type { InferenceRequest, InferenceResponse } from '@agile/ai-core';

export interface TextAgentConfig extends Omit<AgentConfig, 'role' | 'capabilities'> {
  // Text-specific configuration
  text_capabilities?: {
    summarization?: boolean;
    translation?: boolean;
    sentiment_analysis?: boolean;
    entity_extraction?: boolean;
    classification?: boolean;
    question_answering?: boolean;
    creative_writing?: boolean;
    technical_writing?: boolean;
  };
  
  // Language configuration
  supported_languages?: string[];
  default_language?: string;
  
  // Quality settings
  min_confidence_threshold?: number;
  fact_checking_enabled?: boolean;
  grammar_checking_enabled?: boolean;
  style_guide?: 'academic' | 'business' | 'casual' | 'technical' | 'creative';
}

export class TextAgent extends BaseAgent {
  private textCapabilities: TextAgentConfig['text_capabilities'];
  private supportedLanguages: string[];
  private defaultLanguage: string;
  private minConfidenceThreshold: number;
  
  constructor(config: TextAgentConfig, dependencies: any) {
    // Build complete agent config with text-specific defaults
    const fullConfig: AgentConfig = {
      ...config,
      role: 'analyst',
      capabilities: TextAgent.buildCapabilities(config.text_capabilities),
    };
    
    super(fullConfig, dependencies);
    
    // Initialize text-specific properties
    this.textCapabilities = config.text_capabilities || {
      summarization: true,
      translation: true,
      sentiment_analysis: true,
      entity_extraction: true,
      classification: true,
      question_answering: true,
      creative_writing: true,
      technical_writing: true,
    };
    
    this.supportedLanguages = config.supported_languages || ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'];
    this.defaultLanguage = config.default_language || 'en';
    this.minConfidenceThreshold = config.min_confidence_threshold || 0.7;
  }
  
  private static buildCapabilities(textCaps?: TextAgentConfig['text_capabilities']): AgentCapability[] {
    const capabilities: AgentCapability[] = ['text_generation', 'data_analysis'];
    
    if (textCaps?.creative_writing || textCaps?.technical_writing) {
      capabilities.push('collaboration');
    }
    
    return capabilities;
  }
  
  protected async processTask(task: Task): Promise<any> {
    const taskType = task.type.toLowerCase();
    
    switch (taskType) {
      case 'summarize':
        return this.summarizeText(task);
      case 'translate':
        return this.translateText(task);
      case 'analyze_sentiment':
        return this.analyzeSentiment(task);
      case 'extract_entities':
        return this.extractEntities(task);
      case 'classify':
        return this.classifyText(task);
      case 'answer_question':
        return this.answerQuestion(task);
      case 'generate_text':
        return this.generateText(task);
      case 'write_content':
        return this.writeContent(task);
      case 'analyze_text':
        return this.analyzeText(task);
      case 'proofread':
        return this.proofreadText(task);
      default:
        return this.handleGenericTextTask(task);
    }
  }
  
  protected async makeDecision(context: any): Promise<any> {
    // Analyze context to determine best text processing approach
    const analysis = await this.analyzeContext(context);
    
    return {
      approach: analysis.recommended_approach,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      alternatives: analysis.alternatives,
    };
  }
  
  protected async generateResponse(input: any): Promise<any> {
    // Generate text response using the configured model
    const request: InferenceRequest = {
      model: this.config.primary_model,
      prompt: this.formatPrompt(input),
      max_tokens: this.config.max_tokens,
      temperature: this.config.temperature,
      stream: false,
    };
    
    const response = await this.dependencies.inferenceHook.infer(request);
    
    // Post-process the response
    return this.postProcessTextResponse(response, input);
  }
  
  // Text Processing Methods
  
  private async summarizeText(task: Task): Promise<any> {
    if (!this.textCapabilities?.summarization) {
      throw new Error('Summarization capability is not enabled for this agent');
    }
    
    const text = task.input.text || task.input.content;
    const maxLength = task.input.max_length || 150;
    const style = task.input.style || 'concise';
    
    const prompt = this.buildSummarizationPrompt(text, maxLength, style);
    const response = await this.generateResponse({ prompt, task_type: 'summarization' });
    
    return {
      summary: response.text,
      original_length: text.length,
      summary_length: response.text.length,
      compression_ratio: response.text.length / text.length,
      key_points: this.extractKeyPoints(response.text),
      confidence: response.confidence || this.minConfidenceThreshold,
    };
  }
  
  private async translateText(task: Task): Promise<any> {
    if (!this.textCapabilities?.translation) {
      throw new Error('Translation capability is not enabled for this agent');
    }
    
    const text = task.input.text || task.input.content;
    const sourceLang = task.input.source_language || 'auto';
    const targetLang = task.input.target_language || this.defaultLanguage;
    
    if (!this.supportedLanguages.includes(targetLang)) {
      throw new Error(`Target language ${targetLang} is not supported`);
    }
    
    const prompt = this.buildTranslationPrompt(text, sourceLang, targetLang);
    const response = await this.generateResponse({ prompt, task_type: 'translation' });
    
    return {
      translated_text: response.text,
      source_language: sourceLang,
      target_language: targetLang,
      confidence: response.confidence || this.minConfidenceThreshold,
      alternatives: response.alternatives || [],
    };
  }
  
  private async analyzeSentiment(task: Task): Promise<any> {
    if (!this.textCapabilities?.sentiment_analysis) {
      throw new Error('Sentiment analysis capability is not enabled for this agent');
    }
    
    const text = task.input.text || task.input.content;
    const granularity = task.input.granularity || 'document'; // document, sentence, aspect
    
    const prompt = this.buildSentimentAnalysisPrompt(text, granularity);
    const response = await this.generateResponse({ prompt, task_type: 'sentiment_analysis' });
    
    return {
      sentiment: response.sentiment || 'neutral',
      score: response.score || 0,
      confidence: response.confidence || this.minConfidenceThreshold,
      emotions: response.emotions || {},
      aspects: response.aspects || [],
      explanation: response.explanation,
    };
  }
  
  private async extractEntities(task: Task): Promise<any> {
    if (!this.textCapabilities?.entity_extraction) {
      throw new Error('Entity extraction capability is not enabled for this agent');
    }
    
    const text = task.input.text || task.input.content;
    const entityTypes = task.input.entity_types || ['person', 'organization', 'location', 'date', 'money'];
    
    const prompt = this.buildEntityExtractionPrompt(text, entityTypes);
    const response = await this.generateResponse({ prompt, task_type: 'entity_extraction' });
    
    return {
      entities: response.entities || [],
      relationships: response.relationships || [],
      confidence: response.confidence || this.minConfidenceThreshold,
      metadata: {
        total_entities: response.entities?.length || 0,
        entity_types: this.countEntityTypes(response.entities),
      },
    };
  }
  
  private async classifyText(task: Task): Promise<any> {
    if (!this.textCapabilities?.classification) {
      throw new Error('Classification capability is not enabled for this agent');
    }
    
    const text = task.input.text || task.input.content;
    const categories = task.input.categories || [];
    const multiLabel = task.input.multi_label || false;
    
    const prompt = this.buildClassificationPrompt(text, categories, multiLabel);
    const response = await this.generateResponse({ prompt, task_type: 'classification' });
    
    return {
      categories: response.categories || [],
      scores: response.scores || {},
      primary_category: response.primary_category,
      confidence: response.confidence || this.minConfidenceThreshold,
      explanation: response.explanation,
    };
  }
  
  private async answerQuestion(task: Task): Promise<any> {
    if (!this.textCapabilities?.question_answering) {
      throw new Error('Question answering capability is not enabled for this agent');
    }
    
    const question = task.input.question;
    const context = task.input.context || '';
    const answerType = task.input.answer_type || 'short'; // short, detailed, yes_no
    
    const prompt = this.buildQuestionAnsweringPrompt(question, context, answerType);
    const response = await this.generateResponse({ prompt, task_type: 'question_answering' });
    
    return {
      answer: response.answer,
      confidence: response.confidence || this.minConfidenceThreshold,
      sources: response.sources || [],
      reasoning: response.reasoning,
      follow_up_questions: response.follow_up_questions || [],
    };
  }
  
  private async generateText(task: Task): Promise<any> {
    const prompt = task.input.prompt || task.input.instruction;
    const style = task.input.style || 'neutral';
    const tone = task.input.tone || 'professional';
    const length = task.input.length || 'medium';
    
    const formattedPrompt = this.buildGenerationPrompt(prompt, style, tone, length);
    const response = await this.generateResponse({ prompt: formattedPrompt, task_type: 'generation' });
    
    return {
      generated_text: response.text,
      metadata: {
        style,
        tone,
        length,
        word_count: this.countWords(response.text),
        readability_score: this.calculateReadability(response.text),
      },
      confidence: response.confidence || this.minConfidenceThreshold,
    };
  }
  
  private async writeContent(task: Task): Promise<any> {
    const contentType = task.input.content_type; // blog, article, report, email, etc.
    const topic = task.input.topic;
    const audience = task.input.audience || 'general';
    const outline = task.input.outline || null;
    
    const isCreative = this.textCapabilities?.creative_writing && 
                      ['blog', 'article', 'story'].includes(contentType);
    const isTechnical = this.textCapabilities?.technical_writing && 
                       ['report', 'documentation', 'whitepaper'].includes(contentType);
    
    if (!isCreative && !isTechnical) {
      throw new Error(`Writing capability for ${contentType} is not enabled`);
    }
    
    const prompt = this.buildWritingPrompt(contentType, topic, audience, outline);
    const response = await this.generateResponse({ prompt, task_type: 'writing' });
    
    // Structure the content appropriately
    const structuredContent = this.structureContent(response.text, contentType);
    
    return {
      content: structuredContent,
      metadata: {
        content_type: contentType,
        audience,
        word_count: this.countWords(response.text),
        sections: this.identifySections(structuredContent),
        keywords: this.extractKeywords(response.text),
      },
      confidence: response.confidence || this.minConfidenceThreshold,
    };
  }
  
  private async analyzeText(task: Task): Promise<any> {
    const text = task.input.text || task.input.content;
    const analysisTypes = task.input.analysis_types || ['readability', 'complexity', 'tone', 'structure'];
    
    const analyses: Record<string, any> = {};
    
    for (const analysisType of analysisTypes) {
      switch (analysisType) {
        case 'readability':
          analyses.readability = {
            score: this.calculateReadability(text),
            level: this.getReadabilityLevel(text),
            suggestions: this.getReadabilitySuggestions(text),
          };
          break;
        case 'complexity':
          analyses.complexity = {
            lexical_diversity: this.calculateLexicalDiversity(text),
            sentence_complexity: this.analyzeSentenceComplexity(text),
            vocabulary_level: this.analyzeVocabularyLevel(text),
          };
          break;
        case 'tone':
          analyses.tone = await this.analyzeTone(text);
          break;
        case 'structure':
          analyses.structure = {
            paragraphs: this.countParagraphs(text),
            sentences: this.countSentences(text),
            average_sentence_length: this.calculateAverageSentenceLength(text),
            structure_quality: this.assessStructureQuality(text),
          };
          break;
      }
    }
    
    return {
      analyses,
      overall_quality_score: this.calculateOverallQuality(analyses),
      recommendations: this.generateRecommendations(analyses),
      confidence: this.minConfidenceThreshold,
    };
  }
  
  private async proofreadText(task: Task): Promise<any> {
    const text = task.input.text || task.input.content;
    const checkTypes = task.input.check_types || ['grammar', 'spelling', 'punctuation', 'style'];
    
    const corrections: any[] = [];
    
    if (checkTypes.includes('grammar') && this.config.security_level !== 'low') {
      const grammarIssues = await this.checkGrammar(text);
      corrections.push(...grammarIssues);
    }
    
    if (checkTypes.includes('spelling')) {
      const spellingIssues = await this.checkSpelling(text);
      corrections.push(...spellingIssues);
    }
    
    if (checkTypes.includes('punctuation')) {
      const punctuationIssues = await this.checkPunctuation(text);
      corrections.push(...punctuationIssues);
    }
    
    if (checkTypes.includes('style')) {
      const styleIssues = await this.checkStyle(text);
      corrections.push(...styleIssues);
    }
    
    const correctedText = this.applyCorrections(text, corrections);
    
    return {
      corrected_text: correctedText,
      corrections,
      total_issues: corrections.length,
      confidence: this.minConfidenceThreshold,
      improvement_score: this.calculateImprovement(text, correctedText),
    };
  }
  
  private async handleGenericTextTask(task: Task): Promise<any> {
    // Fallback for unknown task types
    const prompt = `Process the following text task:\nType: ${task.type}\nInput: ${JSON.stringify(task.input)}`;
    const response = await this.generateResponse({ prompt, task_type: 'generic' });
    
    return {
      result: response.text,
      task_type: task.type,
      confidence: response.confidence || this.minConfidenceThreshold,
    };
  }
  
  // Helper Methods
  
  private formatPrompt(input: any): string {
    if (typeof input === 'string') return input;
    if (input.prompt) return input.prompt;
    return JSON.stringify(input);
  }
  
  private buildSummarizationPrompt(text: string, maxLength: number, style: string): string {
    return `Summarize the following text in ${maxLength} words or less with a ${style} style:\n\n${text}`;
  }
  
  private buildTranslationPrompt(text: string, source: string, target: string): string {
    return `Translate the following text from ${source} to ${target}:\n\n${text}`;
  }
  
  private buildSentimentAnalysisPrompt(text: string, granularity: string): string {
    return `Analyze the sentiment of the following text at the ${granularity} level:\n\n${text}`;
  }
  
  private buildEntityExtractionPrompt(text: string, entityTypes: string[]): string {
    return `Extract the following entity types from the text: ${entityTypes.join(', ')}\n\nText: ${text}`;
  }
  
  private buildClassificationPrompt(text: string, categories: string[], multiLabel: boolean): string {
    const instruction = multiLabel ? 'Classify into one or more categories' : 'Classify into exactly one category';
    return `${instruction} from: ${categories.join(', ')}\n\nText: ${text}`;
  }
  
  private buildQuestionAnsweringPrompt(question: string, context: string, answerType: string): string {
    const contextPart = context ? `\n\nContext: ${context}` : '';
    return `Answer the following question with a ${answerType} answer:\n\nQuestion: ${question}${contextPart}`;
  }
  
  private buildGenerationPrompt(prompt: string, style: string, tone: string, length: string): string {
    return `Generate text with the following parameters:\nStyle: ${style}\nTone: ${tone}\nLength: ${length}\n\nPrompt: ${prompt}`;
  }
  
  private buildWritingPrompt(contentType: string, topic: string, audience: string, outline: any): string {
    const outlinePart = outline ? `\n\nOutline: ${JSON.stringify(outline)}` : '';
    return `Write a ${contentType} about ${topic} for a ${audience} audience${outlinePart}`;
  }
  
  private async postProcessTextResponse(response: InferenceResponse, input: any): Promise<any> {
    // Extract and structure the response based on task type
    const processedResponse: any = {
      text: response.content || '',
      confidence: this.calculateConfidence(response),
    };
    
    // Add task-specific processing
    if (input.task_type === 'sentiment_analysis') {
      processedResponse.sentiment = this.extractSentiment(response.content);
      processedResponse.score = this.extractSentimentScore(response.content);
    } else if (input.task_type === 'entity_extraction') {
      processedResponse.entities = this.parseEntities(response.content);
    } else if (input.task_type === 'classification') {
      processedResponse.categories = this.parseCategories(response.content);
    }
    
    return processedResponse;
  }
  
  private async analyzeContext(context: any): Promise<any> {
    // Analyze the context to determine the best approach
    return {
      recommended_approach: 'standard',
      confidence: 0.85,
      reasoning: 'Based on context analysis',
      alternatives: ['detailed', 'quick'],
    };
  }
  
  // Text Analysis Utilities
  
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
  
  private countSentences(text: string): number {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }
  
  private countParagraphs(text: string): number {
    return text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
  }
  
  private calculateReadability(text: string): number {
    // Simplified Flesch Reading Ease score
    const words = this.countWords(text);
    const sentences = this.countSentences(text);
    const syllables = this.countSyllables(text);
    
    if (sentences === 0 || words === 0) return 0;
    
    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    return Math.max(0, Math.min(100, score));
  }
  
  private countSyllables(text: string): number {
    // Simplified syllable counting
    return text.toLowerCase().replace(/[^a-z]/g, '').replace(/[aeiou]{2,}/g, 'a').match(/[aeiou]/g)?.length || 0;
  }
  
  private getReadabilityLevel(text: string): string {
    const score = this.calculateReadability(text);
    if (score >= 90) return 'very easy';
    if (score >= 80) return 'easy';
    if (score >= 70) return 'fairly easy';
    if (score >= 60) return 'standard';
    if (score >= 50) return 'fairly difficult';
    if (score >= 30) return 'difficult';
    return 'very difficult';
  }
  
  private getReadabilitySuggestions(text: string): string[] {
    const suggestions: string[] = [];
    const avgSentenceLength = this.calculateAverageSentenceLength(text);
    
    if (avgSentenceLength > 20) {
      suggestions.push('Consider breaking up long sentences');
    }
    
    const readabilityScore = this.calculateReadability(text);
    if (readabilityScore < 60) {
      suggestions.push('Simplify vocabulary and sentence structure');
    }
    
    return suggestions;
  }
  
  private calculateAverageSentenceLength(text: string): number {
    const words = this.countWords(text);
    const sentences = this.countSentences(text);
    return sentences > 0 ? words / sentences : 0;
  }
  
  private calculateLexicalDiversity(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    return words.length > 0 ? uniqueWords.size / words.length : 0;
  }
  
  private analyzeSentenceComplexity(text: string): string {
    const avgLength = this.calculateAverageSentenceLength(text);
    if (avgLength < 10) return 'simple';
    if (avgLength < 20) return 'moderate';
    return 'complex';
  }
  
  private analyzeVocabularyLevel(text: string): string {
    // Simplified vocabulary analysis
    const words = text.toLowerCase().split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    if (avgWordLength < 4) return 'basic';
    if (avgWordLength < 6) return 'intermediate';
    return 'advanced';
  }
  
  private async analyzeTone(text: string): Promise<any> {
    // Simplified tone analysis
    return {
      primary_tone: 'neutral',
      secondary_tones: ['professional'],
      confidence: 0.75,
    };
  }
  
  private assessStructureQuality(text: string): string {
    const paragraphs = this.countParagraphs(text);
    const sentences = this.countSentences(text);
    
    if (paragraphs === 0 || sentences === 0) return 'poor';
    
    const avgSentencesPerParagraph = sentences / paragraphs;
    if (avgSentencesPerParagraph >= 3 && avgSentencesPerParagraph <= 7) return 'good';
    if (avgSentencesPerParagraph >= 2 && avgSentencesPerParagraph <= 10) return 'fair';
    return 'poor';
  }
  
  private calculateOverallQuality(analyses: Record<string, any>): number {
    // Combine different analysis scores
    let totalScore = 0;
    let count = 0;
    
    if (analyses.readability?.score) {
      totalScore += analyses.readability.score;
      count++;
    }
    
    if (analyses.structure?.structure_quality) {
      const structureScore = analyses.structure.structure_quality === 'good' ? 100 : 
                            analyses.structure.structure_quality === 'fair' ? 70 : 40;
      totalScore += structureScore;
      count++;
    }
    
    return count > 0 ? totalScore / count : 50;
  }
  
  private generateRecommendations(analyses: Record<string, any>): string[] {
    const recommendations: string[] = [];
    
    if (analyses.readability?.suggestions) {
      recommendations.push(...analyses.readability.suggestions);
    }
    
    if (analyses.complexity?.sentence_complexity === 'complex') {
      recommendations.push('Consider simplifying sentence structure');
    }
    
    if (analyses.structure?.structure_quality === 'poor') {
      recommendations.push('Improve paragraph organization');
    }
    
    return recommendations;
  }
  
  private extractKeyPoints(text: string): string[] {
    // Extract key points from summary
    return text.split(/[.!?]/).filter(s => s.trim().length > 20).slice(0, 5);
  }
  
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};
    
    words.forEach(word => {
      if (word.length > 4) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  private structureContent(text: string, contentType: string): any {
    // Structure content based on type
    if (contentType === 'email') {
      return {
        subject: text.split('\n')[0],
        body: text.split('\n').slice(1).join('\n'),
      };
    }
    
    return {
      title: text.split('\n')[0],
      content: text,
      sections: this.identifySections(text),
    };
  }
  
  private identifySections(text: any): string[] {
    if (typeof text === 'string') {
      return text.split('\n\n').filter(s => s.trim().length > 0).map(s => s.split('\n')[0]);
    }
    return [];
  }
  
  private countEntityTypes(entities: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    entities?.forEach(entity => {
      counts[entity.type] = (counts[entity.type] || 0) + 1;
    });
    return counts;
  }
  
  private calculateConfidence(response: InferenceResponse): number {
    // Calculate confidence based on response metadata
    if (response.metadata?.confidence) {
      return response.metadata.confidence;
    }
    return this.minConfidenceThreshold;
  }
  
  private extractSentiment(content: string): string {
    // Parse sentiment from response
    const sentiments = ['positive', 'negative', 'neutral'];
    const lower = content.toLowerCase();
    
    for (const sentiment of sentiments) {
      if (lower.includes(sentiment)) {
        return sentiment;
      }
    }
    return 'neutral';
  }
  
  private extractSentimentScore(content: string): number {
    // Extract numerical sentiment score
    const match = content.match(/score[:\s]+([0-9.]+)/i);
    return match ? parseFloat(match[1]) : 0;
  }
  
  private parseEntities(content: string): any[] {
    // Parse entities from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.entities || [];
      }
    } catch (e) {
      // Fallback to simple parsing
    }
    return [];
  }
  
  private parseCategories(content: string): string[] {
    // Parse categories from response
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback to simple parsing
    }
    return [];
  }
  
  private async checkGrammar(text: string): Promise<any[]> {
    // Grammar checking implementation
    return [];
  }
  
  private async checkSpelling(text: string): Promise<any[]> {
    // Spelling checking implementation
    return [];
  }
  
  private async checkPunctuation(text: string): Promise<any[]> {
    // Punctuation checking implementation
    return [];
  }
  
  private async checkStyle(text: string): Promise<any[]> {
    // Style checking implementation
    return [];
  }
  
  private applyCorrections(text: string, corrections: any[]): string {
    // Apply corrections to text
    let corrected = text;
    corrections.forEach(correction => {
      if (correction.replacement) {
        corrected = corrected.replace(correction.original, correction.replacement);
      }
    });
    return corrected;
  }
  
  private calculateImprovement(original: string, corrected: string): number {
    // Calculate improvement score
    const originalScore = this.calculateReadability(original);
    const correctedScore = this.calculateReadability(corrected);
    return Math.max(0, correctedScore - originalScore);
  }
}