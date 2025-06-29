// components/spendwise/chatbot/SpendWiseChatbot.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Building2, Factory, Cpu, ShoppingCart, Package, Sparkles, ArrowRight, Check, X, Edit2, Save, TrendingUp, AlertTriangle, Globe, DollarSign, BarChart3, Target, History, Trash2, FileText, Plus } from 'lucide-react';
import { spendWiseIndustryConfigs } from './industryConfigs';
import { transformChatbotData } from './dataTransformers';

interface SpendWiseChatbotProps {
  onDataGenerated: (data: any) => void;
}

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
  isComplete: boolean;
  type: string;
  showIndustryCards?: boolean;
  roleOptions?: any;
  showAnalyticsOptions?: boolean;
}

interface ChatSession {
  id: string;
  timestamp: Date;
  businessData: any;
  messages: Message[];
  conversationState: string;
  generatedData?: any;
  showPreview?: boolean;
  showAnalytics?: boolean;
}

const PERPLEXITY_API_KEY = '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'; // Hardcoded for testing - move to backend for production

const SpendWiseChatbot: React.FC<SpendWiseChatbotProps> = ({ onDataGenerated }) => {
  const [conversationState, setConversationState] = useState('greeting');
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => 
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const [businessData, setBusinessData] = useState({
    userName: '',
    companyName: '',
    industry: '',
    industryKey: '',
    role: '',
    pricingStrategy: '',
    demandStrategy: '',
    annualSpendRange: '',
    supplierCount: '',
    homeCountry: 'USA',
    generatedData: null as any,
    loadedIntoApp: false
  });
  
  const [messages, setMessages] = useState<Message[]>([{
    id: 1,
    text: "👋 Hi! I'm your SpendWise assistant. I'll help you set up your spend analysis data in just a few minutes. First, what's your name?",
    isBot: true,
    timestamp: new Date(),
    isComplete: true,
    type: 'greeting',
    showIndustryCards: false
  }]);
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const [showIndustryCards, setShowIndustryCards] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState('');
  const [analysisAnswers, setAnalysisAnswers] = useState<any>({});
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('spendwise_chat_sessions');
    if (savedSessions) {
      setChatSessions(JSON.parse(savedSessions));
    }
    
    // Check if returning user with loaded data
    const lastSession = JSON.parse(localStorage.getItem('spendwise_last_session') || '{}');
    if (lastSession.loadedIntoApp && !lastSession.analyticsShown) {
      // User has loaded data but hasn't used analytics yet
      setBusinessData(lastSession.businessData || {});
      setConversationState('analytics_prompt');
      setCurrentSessionId(lastSession.sessionId || currentSessionId);
      
      const welcomeBackMessage: Message = {
        id: generateUniqueId(),
        text: `Welcome back! I see you've already loaded your ${lastSession.businessData?.industry || 'spend'} data. What else can I help you with today?`,
        isBot: true,
        timestamp: new Date(),
        isComplete: true,
        type: 'welcome_back'
      };
      
      const analyticsPromptMessage: Message = {
        id: generateUniqueId(),
        text: `I can provide advanced analytics on your loaded data. Would you like to explore any of these insights?`,
        isBot: true,
        timestamp: new Date(),
        isComplete: true,
        type: 'analytics_menu',
        showAnalyticsOptions: true
      };
      
      const startFreshMessage: Message = {
        id: generateUniqueId(),
        text: `Or would you prefer to start fresh with new data? Just type "new" or "start over".`,
        isBot: true,
        timestamp: new Date(),
        isComplete: true,
        type: 'prompt'
      };
      
      setMessages([welcomeBackMessage, analyticsPromptMessage, startFreshMessage]);
      setShowAnalytics(true);
    }
  }, []);

  // Save current session to localStorage whenever it changes
  useEffect(() => {
    // Only save if we have meaningful data and not during typing animation
    if (businessData.userName && messages.length > 1 && typingMessageId === null) {
      saveCurrentSession();
    }
  }, [messages.length, businessData.userName, businessData.companyName, businessData.industry, conversationState, typingMessageId]); // Use stable dependencies

  const saveCurrentSession = () => {
    // Clear any existing save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(() => {
      const currentSession: ChatSession = {
        id: currentSessionId,
        timestamp: new Date(),
        businessData,
        messages: messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        })),
        conversationState,
        generatedData: businessData.generatedData,
        showPreview,
        showAnalytics
      };

      const existingSessions = JSON.parse(localStorage.getItem('spendwise_chat_sessions') || '[]');
      const updatedSessions = existingSessions.filter((s: ChatSession) => s.id !== currentSessionId);
      updatedSessions.unshift(currentSession);
      
      // Keep only last 10 sessions
      const trimmedSessions = updatedSessions.slice(0, 10);
      
      localStorage.setItem('spendwise_chat_sessions', JSON.stringify(trimmedSessions));
      setChatSessions(trimmedSessions);
    }, 1000); // Save after 1 second of inactivity
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setBusinessData(session.businessData);
    
    // Convert timestamp strings back to Date objects
    const messagesWithDates = session.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    
    setMessages(messagesWithDates);
    setConversationState(session.conversationState);
    setShowSessionHistory(false);
    
    // Restore the appropriate state based on where the user left off
    if (session.businessData.loadedIntoApp) {
      // Data was already loaded, show analytics options
      setShowAnalytics(true);
      
      const welcomeBack: Message = {
        id: generateUniqueId(),
        text: `Welcome back! I have your ${session.businessData.industry} data loaded. What would you like to analyze?`,
        isBot: true,
        timestamp: new Date(),
        isComplete: true,
        type: 'analytics_menu',
        showAnalyticsOptions: true
      };
      
      setMessages(prev => [...prev, welcomeBack]);
      setConversationState('analytics');
    } else if (session.businessData.generatedData) {
      // Data was generated but not loaded, show preview again
      setEditedData(JSON.parse(JSON.stringify(session.businessData.generatedData)));
      setShowPreview(true);
      
      const welcomeBack: Message = {
        id: generateUniqueId(),
        text: `Welcome back! Your ${session.businessData.industry} data is ready. You can review it below and load it into the app, or edit it first.`,
        isBot: true,
        timestamp: new Date(),
        isComplete: true,
        type: 'welcome_back'
      };
      
      setMessages(prev => [...prev, welcomeBack]);
    } else if (session.conversationState === 'complete' || session.conversationState === 'generating') {
      // User left during generation, regenerate the data
      const regenerateMessage: Message = {
        id: generateUniqueId(),
        text: `Welcome back! Let me regenerate your ${session.businessData.industry} spend data...`,
        isBot: true,
        timestamp: new Date(),
        isComplete: true,
        type: 'regenerating'
      };
      
      setMessages(prev => [...prev, regenerateMessage]);
      
      // Regenerate the data
      setTimeout(() => {
        generateSpendData();
      }, 1000);
    }
  };

  const deleteSession = (sessionId: string) => {
    const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
    localStorage.setItem('spendwise_chat_sessions', JSON.stringify(updatedSessions));
    setChatSessions(updatedSessions);
  };

  // Analytics configurations with emojis
  const analyticsOptions = [
    { id: 'forecast', icon: TrendingUp, label: 'Demand Forecast', color: '#10b981', emoji: '📈' },
    { id: 'pricing', icon: DollarSign, label: 'Price Analysis', color: '#3b82f6', emoji: '💰' },
    { id: 'risk', icon: AlertTriangle, label: 'Risk Assessment', color: '#ef4444', emoji: '⚠️' },
    { id: 'supply', icon: Globe, label: 'Supply Chain', color: '#8b5cf6', emoji: '🌍' },
    { id: 'optimization', icon: Target, label: 'Cost Optimization', color: '#f59e0b', emoji: '🎯' },
    { id: 'trends', icon: BarChart3, label: 'Market Trends', color: '#06b6d4', emoji: '📊' }
  ];

  const analyticsQuestions = {
    forecast: [
      { id: 'timeframe', question: 'What forecast period?', options: ['Next 6 months', '1 year', '3 years', '5 years'] },
      { id: 'growth', question: 'Expected market growth?', options: ['Declining', 'Stable', 'Moderate growth', 'High growth'] },
      { id: 'confidence', question: 'Forecast confidence level?', options: ['Conservative', 'Moderate', 'Aggressive'] }
    ],
    pricing: [
      { id: 'timeframe', question: 'Analysis timeframe?', options: ['Q1 2025', '2025 Full Year', '2025-2027', '2025-2030'] },
      { id: 'factors', question: 'Key pricing factors?', options: ['Inflation only', 'Supply/demand', 'All factors', 'Custom'] },
      { id: 'strategy', question: 'Pricing strategy?', options: ['Cost-plus', 'Market-based', 'Value-based', 'Dynamic'] }
    ],
    risk: [
      { id: 'timeframe', question: 'Risk horizon?', options: ['Next 6 months', '1 year', '3 years'] },
      { id: 'concerns', question: 'Primary concerns?', options: ['Geopolitical', 'Supply shortage', 'Price volatility', 'All risks'] },
      { id: 'tolerance', question: 'Risk tolerance?', options: ['Conservative', 'Moderate', 'Aggressive'] }
    ],
    supply: [
      { id: 'focus', question: 'Supply chain focus?', options: ['Resilience', 'Cost efficiency', 'Sustainability', 'Balanced'] },
      { id: 'scope', question: 'Analysis scope?', options: ['Direct suppliers', 'Tier 1-2', 'Full chain', 'Critical parts only'] },
      { id: 'scenario', question: 'Scenario type?', options: ['Current state', 'Optimized', 'Disruption planning', 'All scenarios'] }
    ],
    optimization: [
      { id: 'target', question: 'Optimization target?', options: ['5% reduction', '10% reduction', '15% reduction', 'Maximum possible'] },
      { id: 'constraints', question: 'Key constraints?', options: ['Quality first', 'Supplier relationships', 'No constraints', 'Custom'] },
      { id: 'timeline', question: 'Implementation timeline?', options: ['Quick wins (3 months)', '1 year plan', 'Multi-year', 'Immediate'] }
    ],
    trends: [
      { id: 'scope', question: 'Trend analysis scope?', options: ['Industry-wide', 'Technology trends', 'Regional trends', 'Comprehensive'] },
      { id: 'timeframe', question: 'Trend horizon?', options: ['Current trends', '1-2 years', '3-5 years', 'Long-term'] },
      { id: 'impact', question: 'Impact focus?', options: ['Cost impact', 'Technology disruption', 'Market shifts', 'All impacts'] }
    ]
  };

  // Generate unique IDs for messages to avoid React key warnings
  const generateUniqueId = () => {
    return Date.now() + Math.random();
  };

  const conversationFlow = {
    greeting: {
      nextState: 'company',
      processAnswer: (answer: string) => {
        setBusinessData(prev => ({ ...prev, userName: answer }));
        return `Nice to meet you, ${answer}! What company are you with?`;
      }
    },
    company: {
      nextState: 'industry',
      processAnswer: (answer: string) => {
        setBusinessData(prev => ({ ...prev, companyName: answer }));
        return `Great! ${answer} sounds like an interesting company. What industry are you in? Select one below:`;
      }
    },
    industry: {
      nextState: 'role',
      processAnswer: (answer: string) => {
        const industryKey = Object.keys(spendWiseIndustryConfigs).find(
          key => spendWiseIndustryConfigs[key].name === answer
        ) || 'automotive';
        setBusinessData(prev => ({ ...prev, industry: answer, industryKey }));
        return `Excellent! I know the ${answer} industry well. What's your role in managing spend?`;
      }
    },
    role: {
      nextState: 'pricingStrategy',
      processAnswer: (answer: string) => {
        setBusinessData(prev => ({ ...prev, role: answer }));
        return `Got it! As a ${answer}, you'll need comprehensive data. Now, how would you like to set product pricing?`;
      }
    },
    pricingStrategy: {
      nextState: 'demandStrategy',
      processAnswer: (answer: string) => {
        setBusinessData(prev => ({ ...prev, pricingStrategy: answer }));
        const response = answer.includes('generate') 
          ? "Perfect! I'll use industry benchmarks for realistic pricing." 
          : answer.includes('custom')
          ? "Understood. You'll be able to edit the pricing in the preview."
          : "Great choice! We'll blend industry standards with your customizations.";
        return `${response} Now, for demand volumes, what's your preference?`;
      }
    },
    demandStrategy: {
      nextState: 'spendRange',
      processAnswer: (answer: string) => {
        setBusinessData(prev => ({ ...prev, demandStrategy: answer }));
        const response = answer.includes('generate')
          ? "I'll generate realistic demand volumes based on your company size."
          : "You'll be able to customize demand volumes in the preview.";
        return `${response} What's your annual spend range?`;
      }
    },
    spendRange: {
      nextState: 'supplierCount',
      processAnswer: (answer: string) => {
        setBusinessData(prev => ({ ...prev, annualSpendRange: answer }));
        return `${answer} in annual spend. How many suppliers do you typically work with?`;
      }
    },
    supplierCount: {
      nextState: 'complete',
      processAnswer: (answer: string) => {
        setBusinessData(prev => ({ ...prev, supplierCount: answer }));
        return `Working with ${answer} suppliers. Let me generate your spend analysis data based on the ${businessData.industry} industry...`;
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingMessageId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const typeMessage = (messageId: number, text: string, speed: number = 30, onComplete?: () => void) => {
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    setTypingMessageId(messageId);
    let charIndex = 0;

    const typeChar = () => {
      if (charIndex < text.length) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, text: text.slice(0, charIndex + 1) };
          }
          return msg;
        }));
        charIndex++;
        typingTimeoutRef.current = setTimeout(typeChar, speed);
      } else {
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, isComplete: true };
          }
          return msg;
        }));
        setTypingMessageId(null);
        typingTimeoutRef.current = null;
        if (onComplete) onComplete();
      }
    };

    typeChar();
  };

  const handleIndustrySelect = (industryKey: string) => {
    const industry = spendWiseIndustryConfigs[industryKey];
    if (!industry) return;

    const userMessage: Message = {
      id: generateUniqueId(),
      text: industry.name,
      isBot: false,
      timestamp: new Date(),
      isComplete: true,
      type: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setShowIndustryCards(false);
    
    const roleOptions = industry.roles;
    const botMessage: Message = {
      id: generateUniqueId(),
      text: '',
      isBot: true,
      timestamp: new Date(),
      isComplete: false,
      type: 'role_options',
      roleOptions
    };

    setMessages(prev => [...prev, botMessage]);

    const nextMessage = conversationFlow.industry.processAnswer(industry.name);
    setTimeout(() => {
      typeMessage(botMessage.id, nextMessage, 20, () => {
        setConversationState('role');
      });
    }, 500);
  };

  const handleRoleSelect = (role: string) => {
    const userMessage: Message = {
      id: generateUniqueId(),
      text: role,
      isBot: false,
      timestamp: new Date(),
      isComplete: true,
      type: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    
    const botMessage: Message = {
      id: generateUniqueId(),
      text: '',
      isBot: true,
      timestamp: new Date(),
      isComplete: false,
      type: 'pricing_options'
    };

    setMessages(prev => [...prev, botMessage]);

    const nextMessage = conversationFlow.role.processAnswer(role);
    setTimeout(() => {
      typeMessage(botMessage.id, nextMessage, 20, () => {
        setConversationState('pricingStrategy');
      });
    }, 500);
  };

  const handlePricingStrategySelect = (strategy: string) => {
    const userMessage: Message = {
      id: generateUniqueId(),
      text: strategy,
      isBot: false,
      timestamp: new Date(),
      isComplete: true,
      type: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    
    const botMessage: Message = {
      id: generateUniqueId(),
      text: '',
      isBot: true,
      timestamp: new Date(),
      isComplete: false,
      type: 'demand_options'
    };

    setMessages(prev => [...prev, botMessage]);

    const nextMessage = conversationFlow.pricingStrategy.processAnswer(strategy);
    setTimeout(() => {
      typeMessage(botMessage.id, nextMessage, 20, () => {
        setConversationState('demandStrategy');
      });
    }, 500);
  };

  const handleDemandStrategySelect = (strategy: string) => {
    const userMessage: Message = {
      id: generateUniqueId(),
      text: strategy,
      isBot: false,
      timestamp: new Date(),
      isComplete: true,
      type: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    
    const botMessage: Message = {
      id: generateUniqueId(),
      text: '',
      isBot: true,
      timestamp: new Date(),
      isComplete: false,
      type: 'spend_options'
    };

    setMessages(prev => [...prev, botMessage]);

    const nextMessage = conversationFlow.demandStrategy.processAnswer(strategy);
    setTimeout(() => {
      typeMessage(botMessage.id, nextMessage, 20, () => {
        setConversationState('spendRange');
      });
    }, 500);
  };

  const handleSpendRangeSelect = (range: string) => {
    const userMessage: Message = {
      id: generateUniqueId(),
      text: range,
      isBot: false,
      timestamp: new Date(),
      isComplete: true,
      type: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    
    const botMessage: Message = {
      id: generateUniqueId(),
      text: '',
      isBot: true,
      timestamp: new Date(),
      isComplete: false,
      type: 'supplier_options'
    };

    setMessages(prev => [...prev, botMessage]);

    const nextMessage = conversationFlow.spendRange.processAnswer(range);
    setTimeout(() => {
      typeMessage(botMessage.id, nextMessage, 20, () => {
        setConversationState('supplierCount');
      });
    }, 500);
  };

  const generateSpendData = () => {
    const config = spendWiseIndustryConfigs[businessData.industryKey];
    const roleConfig = config.roles[businessData.role] || config.roles[Object.keys(config.roles)[0]];
    
    // Parse the spend range to get target spend
    let targetSpend = 30000000; // Default $30M
    const spendRange = businessData.annualSpendRange;
    if (spendRange.includes('< $10M')) {
      targetSpend = 5000000; // $5M midpoint
    } else if (spendRange.includes('$10M - $50M')) {
      targetSpend = 30000000; // $30M midpoint
    } else if (spendRange.includes('$50M - $100M')) {
      targetSpend = 75000000; // $75M midpoint
    } else if (spendRange.includes('$100M - $500M')) {
      targetSpend = 300000000; // $300M midpoint
    } else if (spendRange.includes('$500M+')) {
      targetSpend = 750000000; // $750M
    }
    
    // Calculate current total spend from products
    const currentTotalSpend = roleConfig.products.reduce((sum: number, product: any) => {
      return sum + (product.baseCost * product.volume);
    }, 0);
    
    // Calculate scaling factor
    const scalingFactor = targetSpend / currentTotalSpend;
    
    // Scale products to match spend range
    const scaledProducts = roleConfig.products.map((product: any) => ({
      ...product,
      // Scale volume to achieve target spend, keeping costs relatively stable
      volume: Math.round(product.volume * scalingFactor),
      // Optionally adjust cost slightly for realism
      baseCost: product.baseCost * (0.9 + Math.random() * 0.2) // ±10% variation
    }));
    
    // Generate the data based on configuration
    const generatedData = {
      products: scaledProducts,
      sourceMix: config.supplierCountries,
      industry: businessData.industry,
      role: businessData.role,
      categories: config.categories,
      homeCountry: businessData.homeCountry,
      spendRange: businessData.annualSpendRange,
      supplierCount: businessData.supplierCount,
      pricingStrategy: businessData.pricingStrategy,
      demandStrategy: businessData.demandStrategy
    };

    setBusinessData(prev => ({ ...prev, generatedData }));
    setEditedData(JSON.parse(JSON.stringify(generatedData))); // Deep copy for editing
    setShowPreview(true);
    
    const previewMessage: Message = {
      id: generateUniqueId(),
      text: `Based on your ${businessData.role} role in ${businessData.industry}, here's what I've prepared:`,
      isBot: true,
      timestamp: new Date(),
      isComplete: true,
      type: 'preview'
    };
    
    setMessages(prev => [...prev, previewMessage]);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    // Validate that sourceMix percentages sum to 100
    const totalPercentage = Object.values(editedData.sourceMix).reduce((sum: number, country: any) => sum + country.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      alert('Source mix percentages must sum to 100%');
      return;
    }
    setBusinessData(prev => ({ ...prev, generatedData: editedData }));
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedData(JSON.parse(JSON.stringify(businessData.generatedData)));
    setIsEditing(false);
  };

  const handleProductEdit = (index: number, field: string, value: any) => {
    setEditedData((prev: any) => {
      const newData = { ...prev };
      newData.products[index][field] = field === 'baseCost' || field === 'volume' ? parseFloat(value) || 0 : value;
      return newData;
    });
  };

  const handleCountryEdit = (country: string, percentage: number) => {
    setEditedData((prev: any) => {
      const newData = { ...prev };
      newData.sourceMix[country].percentage = percentage;
      return newData;
    });
  };

  const handleLoadData = () => {
    if (businessData.generatedData) {
      const transformedData = transformChatbotData(businessData.generatedData);
      onDataGenerated(transformedData);
      
      // Mark as loaded
      setBusinessData(prev => ({ ...prev, loadedIntoApp: true }));
      
      // Save session state for when user returns
      const sessionState = {
        businessData: { ...businessData, loadedIntoApp: true },
        loadedIntoApp: true,
        analyticsShown: false,
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId
      };
      localStorage.setItem('spendwise_last_session', JSON.stringify(sessionState));
      
      // Save current session before closing
      saveCurrentSession();
      
      // Show success message briefly before closing
      const successMessage: Message = {
        id: generateUniqueId(),
        text: `✅ Data successfully loaded! The chatbot will now close. You can return anytime for advanced analytics.`,
        isBot: true,
        timestamp: new Date(),
        isComplete: true,
        type: 'success'
      };
      
      setMessages(prev => [...prev, successMessage]);
      
      // Note: The parent component should close the modal after this
      // If you have a close callback, call it here
      // For now, just set states for next time
      setShowPreview(false);
      setShowAnalytics(false);
    }
  };

  const handleAnalyticsSelect = (analysisType: string) => {
    setSelectedAnalysis(analysisType);
    setAnalysisAnswers({});
    
    const option = analyticsOptions.find(opt => opt.id === analysisType);
    const userMessage: Message = {
      id: generateUniqueId(),
      text: `${option?.label} Analysis`,
      isBot: false,
      timestamp: new Date(),
      isComplete: true,
      type: 'user'
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Start asking questions
    const questions = analyticsQuestions[analysisType as keyof typeof analyticsQuestions];
    if (questions && questions.length > 0) {
      askAnalyticsQuestion(analysisType, 0);
    }
  };

  const askAnalyticsQuestion = (analysisType: string, questionIndex: number) => {
    const questions = analyticsQuestions[analysisType as keyof typeof analyticsQuestions];
    const question = questions[questionIndex];
    
    const questionText = `${question.question}\n\n${question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
    
    const botMessage: Message = {
      id: generateUniqueId(),
      text: questionText,
      isBot: true,
      timestamp: new Date(),
      isComplete: true,
      type: 'analytics_question'
    };
    
    setMessages(prev => [...prev, botMessage]);
    setConversationState(`analytics_${analysisType}_${questionIndex}`);
  };

  const handleAnalyticsAnswer = (answer: string, questionId: string) => {
    setAnalysisAnswers((prev: any) => ({ ...prev, [questionId]: answer }));
    
    const userMessage: Message = {
      id: generateUniqueId(),
      text: answer,
      isBot: false,
      timestamp: new Date(),
      isComplete: true,
      type: 'user'
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Check if there are more questions
    const analysisType = selectedAnalysis;
    const questions = analyticsQuestions[analysisType as keyof typeof analyticsQuestions];
    const currentQuestionIndex = Object.keys(analysisAnswers).length;
    
    if (currentQuestionIndex < questions.length - 1) {
      // Ask next question
      askAnalyticsQuestion(analysisType, currentQuestionIndex + 1);
    } else {
      // All questions answered, generate report
      generateAnalyticsReport(analysisType);
    }
  };

  const generateAnalyticsReport = async (analysisType: string) => {
    setIsLoading(true);
    
    const loadingMessage: Message = {
      id: generateUniqueId(),
      text: `🔄 Analyzing your ${businessData.industry} data...`,
      isBot: true,
      timestamp: new Date(),
      isComplete: true,
      type: 'loading'
    };
    
    setMessages(prev => [...prev, loadingMessage]);
    
    try {
      // Prepare data for Perplexity
      const totalSpend = businessData.generatedData.products.reduce((sum: number, p: any) => 
        sum + (p.baseCost * p.volume), 0
      );
      
      const prompt = `Generate a comprehensive ${analysisType} analysis for spend data in the ${businessData.industry} industry.

Context:
- Company: ${businessData.companyName}
- Industry: ${businessData.industry}
- Total Annual Spend: ${(totalSpend / 1000000).toFixed(1)}M
- Number of Parts: ${businessData.generatedData.products.length}
- Supplier Countries: ${Object.keys(businessData.generatedData.sourceMix).join(', ')}
- Analysis Parameters: ${JSON.stringify(analysisAnswers)}

Products Sample (top 10):
${businessData.generatedData.products.slice(0, 10).map((p: any) => 
  `- ${p.name}: ${p.baseCost} × ${p.volume} units = ${(p.baseCost * p.volume).toLocaleString()}`
).join('\n')}

Geographic Distribution:
${Object.entries(businessData.generatedData.sourceMix).map(([country, data]: [string, any]) => 
  `- ${country}: ${data.percentage}%`
).join('\n')}

Please provide a detailed ${analysisType} report with:
1. Executive Summary
2. Key Findings (with specific numbers)
3. Data-driven insights
4. Risks and Opportunities
5. Actionable Recommendations
6. Implementation Roadmap

Make it specific to their spend data, not generic. Include charts/visualizations descriptions.`;

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content: "You are an expert spend analysis consultant. Provide detailed, data-driven analysis with specific recommendations based on the actual spend data provided."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.2,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const result = await response.json();
      const analysisContent = result.choices[0].message.content;

      // Format the report beautifully
      const formattedReport = formatAnalyticsReport(analysisType, analysisContent);
      
      const reportMessage: Message = {
        id: generateUniqueId(),
        text: formattedReport,
        isBot: true,
        timestamp: new Date(),
        isComplete: true,
        type: 'analytics_report'
      };
      
      setMessages(prev => prev.filter(msg => msg.type !== 'loading').concat(reportMessage));
      
      // Mark analytics as shown
      const sessionState = JSON.parse(localStorage.getItem('spendwise_last_session') || '{}');
      sessionState.analyticsShown = true;
      localStorage.setItem('spendwise_last_session', JSON.stringify(sessionState));
      
      // Show options for next analysis
      setTimeout(() => {
        const followUpMessage: Message = {
          id: generateUniqueId(),
          text: `\n📊 Would you like to run another analysis?`,
          isBot: true,
          timestamp: new Date(),
          isComplete: true,
          type: 'analytics_menu',
          showAnalyticsOptions: true
        };
        
        setMessages(prev => [...prev, followUpMessage]);
        setConversationState('analytics');
      }, 500);
      
    } catch (error) {
      console.error('Analytics generation error:', error);
      
      // Fallback report if API fails
      const fallbackReport = generateFallbackReport(analysisType);
      
      const reportMessage: Message = {
        id: generateUniqueId(),
        text: fallbackReport,
        isBot: true,
        timestamp: new Date(),
        isComplete: true,
        type: 'analytics_report'
      };
      
      setMessages(prev => prev.filter(msg => msg.type !== 'loading').concat(reportMessage));
      
      // Mark analytics as shown
      const sessionState = JSON.parse(localStorage.getItem('spendwise_last_session') || '{}');
      sessionState.analyticsShown = true;
      localStorage.setItem('spendwise_last_session', JSON.stringify(sessionState));
      
      // Show options for next analysis
      setTimeout(() => {
        const followUpMessage: Message = {
          id: generateUniqueId(),
          text: `\n📊 Would you like to run another analysis?`,
          isBot: true,
          timestamp: new Date(),
          isComplete: true,
          type: 'analytics_menu',
          showAnalyticsOptions: true
        };
        
        setMessages(prev => [...prev, followUpMessage]);
        setConversationState('analytics');
      }, 500);
      
    } finally {
      setIsLoading(false);
    }
  };

  const formatAnalyticsReport = (analysisType: string, content: string) => {
    const option = analyticsOptions.find(opt => opt.id === analysisType);
    const icon = option?.emoji || '📋';
    
    const totalSpend = businessData.generatedData.products.reduce((sum: number, p: any) => 
      sum + (p.baseCost * p.volume), 0
    );
    
    return `${icon} **${option?.label} Report**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 **Report Date**: ${new Date().toLocaleDateString()}
🏢 **Company**: ${businessData.companyName}
🏭 **Industry**: ${businessData.industry}
💵 **Total Spend**: ${(totalSpend / 1000000).toFixed(1)}M

${content}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 **Next Steps**:
• Review findings with stakeholders
• Prioritize recommendations
• Create implementation timeline
• Set up monitoring metrics

💡 *Report generated by SpendWise Analytics powered by TADA*`;
  };

  const generateFallbackReport = (analysisType: string) => {
    if (!businessData.generatedData) {
      return 'Error: No data available for analysis.';
    }
    
    const option = analyticsOptions.find(opt => opt.id === analysisType);
    const totalSpend = businessData.generatedData.products.reduce((sum: number, p: any) => 
      sum + (p.baseCost * p.volume), 0
    );
    
    const reports: any = {
      forecast: `📈 **Demand Forecast Report**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Executive Summary**
Based on your ${businessData.industry} spend data, demand is projected to grow ${Math.floor(Math.random() * 5 + 3)}% annually over the ${analysisAnswers.timeframe || 'next 3 years'}.

📊 **Key Findings**:
• **Current Demand**: ${businessData.generatedData.products.reduce((sum: number, p: any) => sum + p.volume, 0).toLocaleString()} units
• **Projected Growth**: ${analysisAnswers.growth === 'High growth' ? '8-12%' : analysisAnswers.growth === 'Moderate growth' ? '4-7%' : '1-3%'} CAGR
• **Top Growth Categories**: ${businessData.generatedData.categories.slice(0, 3).join(', ')}
• **Risk Factors**: Supply chain constraints, market saturation

📈 **Demand Projections by Category**:
${businessData.generatedData.categories.slice(0, 5).map((cat: string) => 
  `• ${cat}: +${(Math.random() * 10 + 2).toFixed(1)}% growth expected`
).join('\n')}

💡 **Recommendations**:
1. Increase safety stock for high-growth items
2. Negotiate volume agreements with key suppliers
3. Diversify supplier base in growth categories
4. Implement demand sensing capabilities`,

      pricing: `💰 **Price Analysis Report**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Executive Summary**
Pricing analysis reveals ${Math.floor(Math.random() * 3 + 2)}% average cost increase expected across your portfolio.

📊 **Key Findings**:
• **Current Spend**: $${(totalSpend / 1000000).toFixed(1)}M
• **Projected Impact**: +$${(totalSpend * 0.03 / 1000000).toFixed(1)}M to $${(totalSpend * 0.05 / 1000000).toFixed(1)}M
• **Inflation Impact**: ${analysisAnswers.factors === 'All factors' ? '60%' : '80%'} of increase
• **Top Risk Items**: ${businessData.generatedData.products.slice(0, 3).map((p: any) => p.name).join(', ')}

💲 **Price Trends by Region**:
${Object.keys(businessData.generatedData.sourceMix).slice(0, 5).map((country: string) => 
  `• ${country}: +${(Math.random() * 4 + 1).toFixed(1)}% expected`
).join('\n')}

💡 **Mitigation Strategies**:
1. Lock in pricing with strategic suppliers
2. Explore alternative materials/specifications
3. Implement should-cost models
4. Leverage volume for better pricing`,

      risk: `⚠️ **Risk Assessment Report**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Executive Summary**
Risk analysis identifies ${Math.floor(Math.random() * 5 + 3)} critical risks requiring immediate attention.

🚨 **Critical Risks Identified**:
• **Supply Concentration**: ${Math.floor(Math.random() * 20 + 15)}% single-sourced parts
• **Geographic Risk**: ${Math.floor(Math.random() * 30 + 20)}% from high-risk regions
• **Price Volatility**: $${(totalSpend * 0.08 / 1000000).toFixed(1)}M exposure
• **Quality Risk**: ${Math.floor(Math.random() * 10 + 5)} suppliers below threshold

📊 **Risk Matrix**:
${['High Impact/High Probability', 'High Impact/Low Probability', 'Low Impact/High Probability'].map(risk => 
  `• ${risk}: ${Math.floor(Math.random() * 10 + 5)} items`
).join('\n')}

🛡️ **Mitigation Actions**:
1. Dual-source critical components
2. Build strategic inventory buffers
3. Implement supplier monitoring
4. Create contingency plans`,

      supply: `🌍 **Supply Chain Analysis**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Executive Summary**
Supply chain optimization can deliver ${Math.floor(Math.random() * 5 + 3)}% cost reduction while improving resilience.

📊 **Current State Analysis**:
• **Supplier Count**: ${businessData.supplierCount}
• **Geographic Spread**: ${Object.keys(businessData.generatedData.sourceMix).length} countries
• **Lead Time Average**: ${Math.floor(Math.random() * 30 + 45)} days
• **On-Time Delivery**: ${Math.floor(Math.random() * 10 + 85)}%

🌐 **Regional Distribution**:
${Object.entries(businessData.generatedData.sourceMix).map(([country, data]: [string, any]) => 
  `• ${country}: ${data.percentage}% (${data.typicalProducts[0]})`
).join('\n')}

🎯 **Optimization Opportunities**:
1. Consolidate to ${Math.floor(parseInt(businessData.supplierCount) * 0.7)} strategic suppliers
2. Nearshore ${Math.floor(Math.random() * 20 + 10)}% of spend
3. Implement supplier collaboration platform
4. Create regional supply hubs`,

      optimization: `🎯 **Cost Optimization Report**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 **Executive Summary**
Identified $${(totalSpend * 0.12 / 1000000).toFixed(1)}M in savings opportunities (${analysisAnswers.target || '10%'} of spend).

📊 **Savings Breakdown**:
• **Volume Consolidation**: $${(totalSpend * 0.04 / 1000000).toFixed(1)}M
• **Specification Optimization**: $${(totalSpend * 0.03 / 1000000).toFixed(1)}M
• **Sourcing Strategy**: $${(totalSpend * 0.025 / 1000000).toFixed(1)}M
• **Process Improvement**: $${(totalSpend * 0.025 / 1000000).toFixed(1)}M

🎯 **Quick Wins** (${analysisAnswers.timeline === 'Quick wins (3 months)' ? '3 months' : '6 months'}):
${businessData.generatedData.categories.slice(0, 4).map((cat: string) => 
  `• ${cat}: ${(Math.random() * 5 + 3).toFixed(1)}% reduction possible`
).join('\n')}

📋 **Implementation Roadmap**:
1. **Month 1-2**: Supplier negotiations
2. **Month 3-4**: Specification reviews
3. **Month 5-6**: Process optimization
4. **Ongoing**: Performance tracking`,

      trends: `📊 **Market Trends Analysis**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Executive Summary**
${businessData.industry} market experiencing significant shifts driven by technology and sustainability.

🌟 **Key Trends Impacting Your Spend**:
• **Digital Transformation**: ${Math.floor(Math.random() * 30 + 40)}% of suppliers adopting AI/ML
• **Sustainability**: ${Math.floor(Math.random() * 40 + 30)}% increase in green products
• **Supply Chain**: Shift to regional sourcing (+${Math.floor(Math.random() * 20 + 10)}%)
• **Technology**: Automation reducing costs by ${Math.floor(Math.random() * 15 + 5)}%

📈 **Market Dynamics**:
${['Raw Material Prices', 'Labor Costs', 'Transportation', 'Technology Adoption'].map(factor => 
  `• ${factor}: ${Math.random() > 0.5 ? '↑' : '↓'} ${(Math.random() * 5 + 1).toFixed(1)}% YoY`
).join('\n')}

🔮 **Future Outlook** (${analysisAnswers.timeframe || '3-5 years'}):
1. Consolidation of supplier base expected
2. Increased focus on sustainability metrics
3. Technology-driven cost reductions
4. Shift to outcome-based contracts`
    };
    
    return reports[analysisType] || reports.forecast;
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || typingMessageId) return;

    const userMessage: Message = {
      id: generateUniqueId(),
      text: inputText,
      isBot: false,
      timestamp: new Date(),
      isComplete: true,
      type: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    // Check for start over commands
    if (currentInput.toLowerCase().includes('new') || currentInput.toLowerCase().includes('start over') || currentInput.toLowerCase().includes('fresh')) {
      // Clear last session and start fresh
      localStorage.removeItem('spendwise_last_session');
      
      // Reset everything
      setBusinessData({
        userName: '',
        companyName: '',
        industry: '',
        industryKey: '',
        role: '',
        pricingStrategy: '',
        demandStrategy: '',
        annualSpendRange: '',
        supplierCount: '',
        homeCountry: 'USA',
        generatedData: null,
        loadedIntoApp: false
      });
      
      setConversationState('greeting');
      setShowAnalytics(false);
      setShowPreview(false);
      
      const freshStartMessage: Message = {
        id: generateUniqueId(),
        text: `Perfect! Let's start fresh. What's your name?`,
        isBot: true,
        timestamp: new Date(),
        isComplete: true,
        type: 'greeting'
      };
      
      setMessages([freshStartMessage]);
      setIsLoading(false);
      return;
    }

    // Handle analytics state (when options are shown)
    if ((conversationState === 'analytics' || conversationState === 'analytics_prompt') && showAnalytics) {
      // If user types instead of clicking an analytics option
      const lowerInput = currentInput.toLowerCase();
      
      // Check if they typed an analytics type name
      const matchedOption = analyticsOptions.find(opt => 
        opt.label.toLowerCase().includes(lowerInput) || 
        lowerInput.includes(opt.label.toLowerCase()) ||
        lowerInput.includes(opt.id) ||
        (lowerInput.includes('forecast') && opt.id === 'forecast') ||
        (lowerInput.includes('price') && opt.id === 'pricing') ||
        (lowerInput.includes('risk') && opt.id === 'risk') ||
        (lowerInput.includes('supply') && opt.id === 'supply') ||
        (lowerInput.includes('cost') && opt.id === 'optimization') ||
        (lowerInput.includes('trend') && opt.id === 'trends')
      );
      
      if (matchedOption) {
        handleAnalyticsSelect(matchedOption.id);
      } else {
        // Prompt them to click an option
        const clarifyMessage: Message = {
          id: generateUniqueId(),
          text: `Please click one of the analytics options above to proceed, or type "new" to start fresh with new data.`,
          isBot: true,
          timestamp: new Date(),
          isComplete: true,
          type: 'clarification'
        };
        
        setMessages(prev => [...prev, clarifyMessage]);
      }
      setIsLoading(false);
      return;
    }

    // Handle analytics answers
    if (conversationState.startsWith('analytics_')) {
      const parts = conversationState.split('_');
      if (parts.length >= 3) {
        const analysisType = parts[1];
        const questionIndex = parseInt(parts[2]);
        const questions = analyticsQuestions[analysisType as keyof typeof analyticsQuestions];
        
        if (questions && questions[questionIndex]) {
          const question = questions[questionIndex];
          
          // Process the answer - accept number or text
          let answer = currentInput.trim();
          const optionIndex = parseInt(currentInput) - 1;
          
          // If user typed a number, convert to the option
          if (!isNaN(optionIndex) && optionIndex >= 0 && optionIndex < question.options.length) {
            answer = question.options[optionIndex];
          } else {
            // Check if the typed text matches any option (case insensitive)
            const matchedOption = question.options.find(opt => 
              opt.toLowerCase().includes(answer.toLowerCase()) || 
              answer.toLowerCase().includes(opt.toLowerCase())
            );
            if (matchedOption) {
              answer = matchedOption;
            } else {
              // If no match, prompt user to select from options
              const clarifyMessage: Message = {
                id: generateUniqueId(),
                text: `Please select one of the numbered options (1-${question.options.length}) or click an option above.`,
                isBot: true,
                timestamp: new Date(),
                isComplete: true,
                type: 'clarification'
              };
              
              setMessages(prev => [...prev, clarifyMessage]);
              setIsLoading(false);
              return;
            }
          }
          
          handleAnalyticsAnswer(answer, question.id);
          setIsLoading(false);
          return;
        }
      }
    }

    const currentFlow = conversationFlow[conversationState as keyof typeof conversationFlow];
    if (currentFlow) {
      const nextMessage = currentFlow.processAnswer(currentInput);

      const botMessage: Message = {
        id: generateUniqueId(),
        text: '',
        isBot: true,
        timestamp: new Date(),
        isComplete: false,
        type: 'text',
        showIndustryCards: false
      };

      setMessages(prev => [...prev, botMessage]);

      setTimeout(() => {
        typeMessage(botMessage.id, nextMessage, 20, () => {
          // Special handling for company -> industry transition
          if (conversationState === 'company') {
            setMessages(prev => prev.map(msg => 
              msg.id === botMessage.id 
                ? { ...msg, showIndustryCards: true }
                : msg
            ));
            setShowIndustryCards(true);
          }
          setConversationState(currentFlow.nextState);
          setIsLoading(false);
        });
      }, 500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: Date) => {
    // Ensure timestamp is a Date object
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="spendwise-chatbot">
      {/* Session History Sidebar */}
      {showSessionHistory && (
        <div className="session-history-overlay" onClick={() => setShowSessionHistory(false)}>
          <div className="session-history-panel" onClick={(e) => e.stopPropagation()}>
            <div className="session-history-header">
              <h3>Chat History</h3>
              <button onClick={() => setShowSessionHistory(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="session-history-list">
              {chatSessions.length === 0 ? (
                <p className="no-sessions">No saved sessions</p>
              ) : (
                chatSessions.map((session) => (
                  <div key={session.id} className="session-item">
                    <div className="session-info" onClick={() => loadSession(session)}>
                      <h4>{session.businessData.companyName || 'Unnamed Session'}</h4>
                      <p>{session.businessData.industry} • {new Date(session.timestamp).toLocaleDateString()}</p>
                    </div>
                    <button 
                      className="delete-session-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="chat-container">
        <div className="chat-header">
          <button 
            className="new-chat-button" 
            onClick={() => {
              if (window.confirm('Start a new chat? Current progress will be saved in history.')) {
                // Save current session
                saveCurrentSession();
                
                // Reset everything for new chat
                const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                setCurrentSessionId(newSessionId);
                setBusinessData({
                  userName: '',
                  companyName: '',
                  industry: '',
                  industryKey: '',
                  role: '',
                  pricingStrategy: '',
                  demandStrategy: '',
                  annualSpendRange: '',
                  supplierCount: '',
                  homeCountry: 'USA',
                  generatedData: null,
                  loadedIntoApp: false
                });
                setConversationState('greeting');
                setShowAnalytics(false);
                setShowPreview(false);
                setShowIndustryCards(false);
                setSelectedAnalysis('');
                setAnalysisAnswers({});
                
                const freshStartMessage: Message = {
                  id: generateUniqueId(),
                  text: "👋 Hi! I'm your SpendWise assistant. I'll help you set up your spend analysis data in just a few minutes. First, what's your name?",
                  isBot: true,
                  timestamp: new Date(),
                  isComplete: true,
                  type: 'greeting'
                };
                
                setMessages([freshStartMessage]);
              }
            }}
          >
            <Plus size={20} />
            New
          </button>
          <button className="history-button" onClick={() => setShowSessionHistory(true)}>
            <History size={20} />
            History
          </button>
        </div>

        <div className="messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}>
              {message.isBot && (
                <div className="avatar bot-avatar">
                  <Sparkles size={16} />
                </div>
              )}
              <div className={`message-bubble ${message.isBot ? 'bot-bubble' : 'user-bubble'}`}>
                <p className="message-text" style={{ whiteSpace: 'pre-wrap' }}>
                  {message.text}
                  {message.isBot && !message.isComplete && <span className="typing-cursor"></span>}
                </p>
                
                {/* Industry Cards - Show only on the specific message that has showIndustryCards=true */}
                {message.isBot && message.showIndustryCards && showIndustryCards && message.isComplete && (
                  <div className="industry-cards-container">
                    {Object.entries(spendWiseIndustryConfigs).map(([key, config]) => (
                      <div
                        key={key}
                        className="industry-card"
                        onClick={() => handleIndustrySelect(key)}
                        style={{ background: config.gradient }}
                      >
                        <div className="industry-icon">
                          {React.createElement(config.icon, { size: 32 })}
                        </div>
                        <div className="industry-name">{config.name}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Analytics Options */}
                {message.showAnalyticsOptions && (
                  <div className="analytics-options-container">
                    {analyticsOptions.map((option, index) => (
                      <div
                        key={option.id}
                        className="analytics-option-card"
                        data-type={option.id}
                        onClick={() => handleAnalyticsSelect(option.id)}
                        style={{ 
                          borderColor: option.color, 
                          color: option.color
                        }}
                      >
                        <div 
                          className="analytics-icon" 
                          style={{ 
                            background: `linear-gradient(135deg, ${option.color} 0%, ${option.color}cc 100%)`,
                            boxShadow: `0 4px 16px ${option.color}33`,
                            '--index': index
                          } as React.CSSProperties}
                        >
                          {React.createElement(option.icon, { 
                            size: 30, 
                            color: '#ffffff', 
                            stroke: '#ffffff',
                            strokeWidth: 2.5,
                            fill: 'none'
                          })}
                          {/* Fallback emoji in center if icon fails */}
                          <span style={{
                            position: 'absolute',
                            fontSize: '24px',
                            zIndex: 0,
                            opacity: 0.8
                          }}>
                            {option.emoji}
                          </span>
                        </div>
                        <span className="analytics-label">{option.label}</span>
                        <span style={{ 
                          position: 'absolute', 
                          top: '8px', 
                          right: '8px', 
                          fontSize: '20px',
                          opacity: 0.4
                        }}>
                          {option.emoji}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Role Options */}
                {message.type === 'role_options' && message.roleOptions && (
                  <div className="scope-options-container">
                    {Object.keys(message.roleOptions).map((role) => (
                      <button
                        key={role}
                        className="scope-option-button"
                        onClick={() => handleRoleSelect(role)}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                )}

                {/* Pricing Strategy Options */}
                {message.type === 'pricing_options' && (
                  <div className="scope-options-container">
                    <button
                      className="scope-option-button recommended"
                      onClick={() => handlePricingStrategySelect('Generate based on industry benchmarks')}
                    >
                      <Sparkles size={14} />
                      Generate based on industry benchmarks
                      <span className="recommended-badge">Recommended</span>
                    </button>
                    <button
                      className="scope-option-button"
                      onClick={() => handlePricingStrategySelect('I\'ll provide custom pricing')}
                    >
                      I'll provide custom pricing
                    </button>
                    <button
                      className="scope-option-button"
                      onClick={() => handlePricingStrategySelect('Mix of both')}
                    >
                      Mix of both
                    </button>
                  </div>
                )}

                {/* Demand Strategy Options */}
                {message.type === 'demand_options' && (
                  <div className="scope-options-container">
                    <button
                      className="scope-option-button recommended"
                      onClick={() => handleDemandStrategySelect('Generate industry-standard volumes')}
                    >
                      <Sparkles size={14} />
                      Generate industry-standard volumes
                      <span className="recommended-badge">Based on company size</span>
                    </button>
                    <button
                      className="scope-option-button"
                      onClick={() => handleDemandStrategySelect('Custom volumes I\'ll specify')}
                    >
                      Custom volumes I'll specify
                    </button>
                  </div>
                )}

                {/* Spend Range Options */}
                {message.type === 'spend_options' && (
                  <div className="scope-options-container">
                    {['< $10M', '$10M - $50M', '$50M - $100M', '$100M - $500M', '$500M+'].map((range) => (
                      <button
                        key={range}
                        className="scope-option-button"
                        onClick={() => handleSpendRangeSelect(range)}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                )}

                {/* Supplier Count Options */}
                {message.type === 'supplier_options' && (
                  <div className="scope-options-container">
                    {['10-25', '26-50', '50-100', '100+'].map((count) => (
                      <button
                        key={count}
                        className="scope-option-button"
                        onClick={() => {
                          const userMsg: Message = {
                            id: generateUniqueId(),
                            text: count,
                            isBot: false,
                            timestamp: new Date(),
                            isComplete: true,
                            type: 'user'
                          };
                          setMessages(prev => [...prev, userMsg]);
                          
                          const botMsg: Message = {
                            id: generateUniqueId(),
                            text: '',
                            isBot: true,
                            timestamp: new Date(),
                            isComplete: false,
                            type: 'completion'
                          };
                          setMessages(prev => [...prev, botMsg]);
                          
                          const nextMsg = conversationFlow.supplierCount.processAnswer(count);
                          setTimeout(() => {
                            typeMessage(botMsg.id, nextMsg, 20, () => {
                              generateSpendData();
                            });
                          }, 500);
                        }}
                      >
                        {count} suppliers
                      </button>
                    ))}
                  </div>
                )}
                
                <p className="message-time">{formatTime(message.timestamp)}</p>
              </div>
              {!message.isBot && (
                <div className="avatar user-avatar">You</div>
              )}
            </div>
          ))}

          {/* Data Preview - Show only once, outside of messages */}
          {showPreview && businessData.generatedData && (
            <div className={`data-preview ${isEditing ? 'editing' : ''}`}>
              <div className="preview-header">
                <h3>Generated Data Preview</h3>
                {!isEditing ? (
                  <button className="edit-button" onClick={handleEdit}>
                    <Edit2 size={16} />
                    Edit Data
                  </button>
                ) : (
                  <div className="edit-controls">
                    <button className="save-button" onClick={handleSaveEdit}>
                      <Save size={16} />
                      Save Changes
                    </button>
                    <button className="cancel-button" onClick={handleCancelEdit}>
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="preview-content">
                {/* Products Section */}
                <div className="preview-section">
                  <h4>📦 Products ({editedData?.products.length || businessData.generatedData.products.length})</h4>
                  <div className={isEditing ? "products-edit-list" : "preview-list"}>
                    {(isEditing ? editedData?.products : businessData.generatedData.products)?.map((product: any, idx: number) => (
                      <div key={idx} className="editable-item">
                        {!isEditing ? (
                          <>
                            <span className="product-name">{product.name}</span>
                            <span className="product-cost">${product.baseCost.toLocaleString()}</span>
                            <span className="product-volume">Vol: {product.volume.toLocaleString()}</span>
                          </>
                        ) : (
                          <>
                            <div>
                              <div className="input-label">Product Name</div>
                              <input
                                type="text"
                                value={product.name}
                                onChange={(e) => handleProductEdit(idx, 'name', e.target.value)}
                                className="edit-input"
                                placeholder="Product name"
                              />
                            </div>
                            <div>
                              <div className="input-label">Cost ($)</div>
                              <input
                                type="number"
                                value={product.baseCost}
                                onChange={(e) => handleProductEdit(idx, 'baseCost', e.target.value)}
                                className="edit-input"
                                placeholder="0.00"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <div className="input-label">Volume</div>
                              <input
                                type="number"
                                value={product.volume}
                                onChange={(e) => handleProductEdit(idx, 'volume', e.target.value)}
                                className="edit-input"
                                placeholder="0"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Global Sourcing Mix Section */}
                <div className="preview-section">
                  <h4>🌍 Global Sourcing Mix</h4>
                  <div className={isEditing ? "source-mix-edit-grid" : "source-mix-grid"}>
                    {Object.entries(isEditing ? editedData?.sourceMix || {} : businessData.generatedData.sourceMix).map(([country, data]: [string, any]) => (
                      <div key={country} className={isEditing ? "source-mix-edit-item" : "source-mix-item"}>
                        {!isEditing ? (
                          <>
                            <span className="country-flag">
                              {country === 'USA' ? '🇺🇸' : country === 'China' ? '🇨🇳' : 
                               country === 'Mexico' ? '🇲🇽' : country === 'Vietnam' ? '🇻🇳' : 
                               country === 'Canada' ? '🇨🇦' : country === 'Germany' ? '🇩🇪' : 
                               country === 'Japan' ? '🇯🇵' : country === 'India' ? '🇮🇳' : 
                               country === 'South Korea' ? '🇰🇷' : country === 'Czech Republic' ? '🇨🇿' :
                               country === 'Poland' ? '🇵🇱' : country === 'Romania' ? '🇷🇴' :
                               country === 'Morocco' ? '🇲🇦' : '🌍'}
                            </span>
                            <span className="country-name">{country}</span>
                            <span className="country-percentage">{data.percentage}%</span>
                          </>
                        ) : (
                          <>
                            <div className="country-edit-header">
                              <span className="country-flag">
                                {country === 'USA' ? '🇺🇸' : country === 'China' ? '🇨🇳' : 
                                 country === 'Mexico' ? '🇲🇽' : country === 'Vietnam' ? '🇻🇳' : 
                                 country === 'Canada' ? '🇨🇦' : country === 'Germany' ? '🇩🇪' : 
                                 country === 'Japan' ? '🇯🇵' : country === 'India' ? '🇮🇳' : 
                                 country === 'South Korea' ? '🇰🇷' : country === 'Czech Republic' ? '🇨🇿' :
                                 country === 'Poland' ? '🇵🇱' : country === 'Romania' ? '🇷🇴' :
                                 country === 'Morocco' ? '🇲🇦' : '🌍'}
                              </span>
                              <span className="country-name">{country}</span>
                            </div>
                            <div className="percentage-input-wrapper">
                              <input
                                type="number"
                                value={data.percentage}
                                onChange={(e) => handleCountryEdit(country, parseFloat(e.target.value) || 0)}
                                className="edit-input percentage-input"
                                min="0"
                                max="100"
                                step="1"
                              />
                              <span className="percentage-symbol">%</span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Section */}
                <div className="preview-section">
                  <h4>📊 Summary</h4>
                  <div className={isEditing ? "summary-edit-grid" : "preview-summary"}>
                    <div className="summary-item">
                      <span className="summary-label">Industry</span>
                      <span className="summary-value">{businessData.industry}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Role</span>
                      <span className="summary-value">{businessData.role}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Annual Spend Range</span>
                      <span className="summary-value">{businessData.annualSpendRange}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Generated Total Spend</span>
                      <span className="summary-value">
                        ${((isEditing ? editedData?.products : businessData.generatedData.products)?.reduce((sum: number, p: any) => sum + (p.baseCost * p.volume), 0) / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Suppliers</span>
                      <span className="summary-value">{businessData.supplierCount}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Pricing Strategy</span>
                      <span className="summary-value">{businessData.pricingStrategy}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Demand Strategy</span>
                      <span className="summary-value">{businessData.demandStrategy}</span>
                    </div>
                  </div>
                </div>
              </div>

              {!isEditing && (
                <div className="preview-actions">
                  <button className="load-data-button" onClick={handleLoadData}>
                    <Check size={18} />
                    Load This Data Into Spend Analysis
                  </button>
                </div>
              )}
            </div>
          )}
          
          {isLoading && !typingMessageId && (
            <div className="message bot-message loading-message">
              <div className="avatar bot-avatar">
                <Sparkles size={16} />
              </div>
              <div className="message-bubble bot-bubble">
                <div className="typing-indicator">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Quick action buttons if stuck */}
          {!isLoading && !showPreview && !showAnalytics && businessData.generatedData && messages.length > 0 && (
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center', 
              marginTop: '20px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => {
                  setEditedData(JSON.parse(JSON.stringify(businessData.generatedData)));
                  setShowPreview(true);
                }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={16} />
                Show Data Preview
              </button>
              
              {businessData.loadedIntoApp && (
                <button
                  onClick={() => {
                    setShowAnalytics(true);
                    const analyticsMessage: Message = {
                      id: generateUniqueId(),
                      text: `Let's analyze your ${businessData.industry} spend data. What would you like to explore?`,
                      isBot: true,
                      timestamp: new Date(),
                      isComplete: true,
                      type: 'analytics_menu',
                      showAnalyticsOptions: true
                    };
                    setMessages(prev => [...prev, analyticsMessage]);
                    setConversationState('analytics');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <BarChart3 size={16} />
                  Show Analytics Options
                </button>
              )}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="input-area">
        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                conversationState === 'greeting' ? 'Enter your name...' : 
                conversationState.startsWith('analytics_') ? 'Type your answer or number...' :
                conversationState === 'analytics_prompt' ? 'Click an option above or type "new" to start fresh...' :
                'Type your message...'
              }
              className="message-input"
              rows={1}
              disabled={isLoading || showIndustryCards || showPreview}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading || showIndustryCards || showPreview}
            className="send-button"
          >
            <Send size={20} />
          </button>
        </div>
        
        {/* Show analytics button if data is generated but analytics not shown */}
        {businessData.generatedData && !showPreview && !showAnalytics && businessData.loadedIntoApp && (
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button
              onClick={() => {
                setShowAnalytics(true);
                const analyticsMessage: Message = {
                  id: generateUniqueId(),
                  text: `Let's analyze your ${businessData.industry} spend data. What would you like to explore?`,
                  isBot: true,
                  timestamp: new Date(),
                  isComplete: true,
                  type: 'analytics_menu',
                  showAnalyticsOptions: true
                };
                setMessages(prev => [...prev, analyticsMessage]);
                setConversationState('analytics');
              }}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <BarChart3 size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Show Analytics Options
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpendWiseChatbot;