// components/spendwise/chatbot/SpendWiseChatbot.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Building2, Factory, Cpu, ShoppingCart, Package, Sparkles, ArrowRight, Check, X } from 'lucide-react';
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
        return `Excellent! I know the ${answer} industry well. What's your role in the supply chain?`;
      }
    },
    role: {
      nextState: 'spendRange',
      processAnswer: (answer: string) => {
        setBusinessData(prev => ({ ...prev, role: answer }));
        return `As a ${answer}, what's your typical annual spend range?`;
      }
    },
    spendRange: {
      nextState: 'supplierCount',
      processAnswer: (answer: string) => {
        setBusinessData(prev => ({ ...prev, annualSpendRange: answer }));
        return `${answer} in annual spend - that's a substantial portfolio! How many suppliers do you typically work with?`;
      }
    },
    supplierCount: {
      nextState: 'complete',
      processAnswer: (answer: string) => {
        setBusinessData(prev => ({ ...prev, supplierCount: answer }));
        generateSpendData();
        return `Perfect! Working with ${answer} suppliers. Let me generate your spend analysis data based on the ${businessData.industry} industry...`;
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
      type: 'spend_options'
    };

    setMessages(prev => [...prev, botMessage]);

    const nextMessage = conversationFlow.role.processAnswer(role);
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
    
    // Generate the data based on configuration
    const generatedData = {
      products: roleConfig.products,
      sourceMix: config.supplierCountries,
      industry: businessData.industry,
      role: businessData.role,
      categories: config.categories,
      homeCountry: businessData.homeCountry,
      spendRange: businessData.annualSpendRange,
      supplierCount: businessData.supplierCount
    };

    setBusinessData(prev => ({ ...prev, generatedData }));
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

                {/* Spend Range Options */}
                {message.type === 'spend_options' && (
                  <div className="scope-options-container">
                    {['$10M - $50M', '$50M - $100M', '$100M - $500M', '$500M+'].map((range) => (
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
                    {['10-20', '20-50', '50-100', '100+'].map((count) => (
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
                            type: 'text'
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

                {/* Data Preview */}
                {message.type === 'preview' && showPreview && businessData.generatedData && (
                  <div className="data-preview">
                    <div className="preview-section">
                      <h4>📦 Products ({businessData.generatedData.products.length})</h4>
                      <div className="preview-list">
                        {businessData.generatedData.products.slice(0, 3).map((product: any, idx: number) => (
                          <div key={idx} className="preview-item">
                            • {product.name} - ${product.baseCost.toLocaleString()}
                          </div>
                        ))}
                        {businessData.generatedData.products.length > 3 && (
                          <div className="preview-item more">
                            +{businessData.generatedData.products.length - 3} more products...
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="preview-section">
                      <h4>🌍 Global Sourcing Mix</h4>
                      <div className="preview-list">
                        {Object.entries(businessData.generatedData.sourceMix).map(([country, data]: [string, any]) => (
                          <div key={country} className="preview-item">
                            <span className="country-flag">
                              {country === 'USA' ? '🇺🇸' : country === 'China' ? '🇨🇳' : 
                               country === 'Mexico' ? '🇲🇽' : country === 'Vietnam' ? '🇻🇳' : 
                               country === 'Canada' ? '🇨🇦' : country === 'Germany' ? '🇩🇪' : 
                               country === 'Japan' ? '🇯🇵' : country === 'India' ? '🇮🇳' : '🌍'}
                            </span>
                            <span>{country}: {data.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button className="load-data-button" onClick={handleLoadData}>
                      <Check size={18} />
                      Load This Data Into Spend Analysis
                    </button>
                  </div>
                )}
                
                <p className="message-time">{formatTime(message.timestamp)}</p>
              </div>
              {!message.isBot && (
                <div className="avatar user-avatar">You</div>
              )}
            </div>
          ))}
          
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