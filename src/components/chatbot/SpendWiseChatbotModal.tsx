// components/spendwise/chatbot/SpendWiseChatbotModal.tsx
import React, { useEffect } from 'react';
import { X, Sparkles, RotateCcw, MessageSquare } from 'lucide-react';
import SpendWiseChatbot from './SpendWiseChatbot';
import './SpendWiseChatbot.css';

interface SpendWiseChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  onDataGenerated: (data: any) => void;
}

const SpendWiseChatbotModal: React.FC<SpendWiseChatbotModalProps> = ({ 
  isOpen, 
  onClose, 
  isDarkMode = false, 
  onDataGenerated 
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDataGenerated = (data: any) => {
    onDataGenerated(data);
    onClose();
  };

  return (
    <div className={`spendwise-modal-overlay ${isDarkMode ? 'dark-mode' : ''} ${isOpen ? 'open' : ''}`}>
      <div className={`spendwise-modal-container ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="spendwise-modal-header">
          <div className="spendwise-modal-title">
            <MessageSquare size={24} className="sparkle-icon" />
            <h2>SpendWise Assistant</h2>
            <span className="spendwise-badge">Powered BY TADA Gen AI</span>
          </div>
          <div className="spendwise-modal-controls">
            <button 
              className="spendwise-control-btn"
              onClick={() => window.location.reload()}
              title="Reset Conversation"
            >
              <RotateCcw size={18} />
            </button>
            <button 
              className="spendwise-close-btn"
              onClick={onClose}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="spendwise-modal-body">
          <SpendWiseChatbot onDataGenerated={handleDataGenerated} />
        </div>
      </div>
    </div>
  );
};

export default SpendWiseChatbotModal;

/* Modal-specific styles */
const modalStyles = `
.spendwise-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.spendwise-modal-overlay.open {
  opacity: 1;
  visibility: visible;
}

.spendwise-modal-container {
  width: 90%;
  max-width: 1200px;
  height: 85vh;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  transform: scale(0.9);
  opacity: 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.spendwise-modal-overlay.open .spendwise-modal-container {
  transform: scale(1);
  opacity: 1;
}

.spendwise-modal-container.dark-mode {
  background: #1a1a2e;
  border: 1px solid #2d2d4f;
}

/* Modal Header */
.spendwise-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e5e7eb;
}

.dark-mode .spendwise-modal-header {
  background: rgba(26, 26, 46, 0.9);
  border-bottom: 1px solid #2d2d4f;
}

.spendwise-modal-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.spendwise-modal-title h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sparkle-icon {
  color: #3b82f6;
  animation: sparkle-rotate 3s linear infinite;
}

@keyframes sparkle-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spendwise-badge {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.spendwise-modal-controls {
  display: flex;
  gap: 0.5rem;
}

.spendwise-control-btn,
.spendwise-close-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: rgba(0, 0, 0, 0.05);
  color: #6b7280;
}

.spendwise-control-btn:hover,
.spendwise-close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.dark-mode .spendwise-control-btn,
.dark-mode .spendwise-close-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #e5e7eb;
}

/* Modal Body */
.spendwise-modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .spendwise-modal-container {
    width: 100%;
    height: 100vh;
    border-radius: 0;
    max-width: none;
  }
  
  .spendwise-modal-header {
    padding: 1rem;
  }
  
  .spendwise-modal-title h2 {
    font-size: 1.25rem;
  }
  
  .spendwise-badge {
    display: none;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('spendwise-modal-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'spendwise-modal-styles';
  styleSheet.textContent = modalStyles;
  document.head.appendChild(styleSheet);
}