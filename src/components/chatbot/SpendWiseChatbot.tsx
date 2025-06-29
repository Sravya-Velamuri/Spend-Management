// components/spendwise/chatbot/SpendWiseChatbot.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Building2, Factory, Cpu, ShoppingCart, Package, Sparkles, ArrowRight, Check, X, Edit2, Save } from 'lucide-react';
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
}

const SpendWiseChatbot: React.FC<SpendWiseChatbotProps> = ({ onDataGenerated }) => {
  const [conversationState, setConversationState] = useState('greeting');
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
    generatedData: null as any
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingMessageId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const typeMessage = (messageId: number, text: string, speed: number = 30, onComplete?: () => void) => {
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
    }
  };

  const sendMessage = () => {
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
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="spendwise-chatbot">
      <div className="chat-container">
        <div className="messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}>
              {message.isBot && (
                <div className="avatar bot-avatar">
                  <Sparkles size={16} />
                </div>
              )}
              <div className={`message-bubble ${message.isBot ? 'bot-bubble' : 'user-bubble'}`}>
                <p className="message-text">
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
              placeholder={conversationState === 'greeting' ? 'Enter your name...' : 'Type your message...'}
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
      </div>
    </div>
  );
};

export default SpendWiseChatbot;