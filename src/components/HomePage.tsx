import React from 'react';
import './HomePage.css';

interface CoinData {
  totalCoins: number;
  earnedToday: number;
  date: string;
  history: {
    date: string;
    coins: number;
  }[];
}

interface HomePageProps {
  coinData: CoinData;
  onLoadCoinDataFromFile: () => void;
  onSaveCoinDataToFile: () => void;
  onCreateSampleCoinDataFile: () => void;
  onStartApp: () => void;
  canStartApp: boolean;
}

const HomePage: React.FC<HomePageProps> = ({
  coinData,
  onLoadCoinDataFromFile,
  onSaveCoinDataToFile,
  onCreateSampleCoinDataFile,
  onStartApp,
  canStartApp
}) => {
  return (
    <div className="home-page">
      {/* Coin Display */}
      <div className="home-coin-display">
        <div className="coin-info">
          <div className="coin-count">
            🪙 {coinData.totalCoins} Coins
          </div>
          <div className="coin-earned-today">
            Today: +{coinData.earnedToday}
          </div>
        </div>
        <div className="coin-history">
          {coinData.history.slice(-3).map((entry, index) => (
            <div key={index} className="history-entry">
              {entry.date}: +{entry.coins}
            </div>
          ))}
        </div>
        
        {/* Coin Management Buttons */}
        <div className="coin-file-buttons">
          <button 
            className="load-coin-btn"
            onClick={onLoadCoinDataFromFile}
            title="Load coin data from file"
          >
            🪙 Load Coins
          </button>
          <button 
            className="save-coin-btn"
            onClick={onSaveCoinDataToFile}
            title="Save coin data to file"
          >
            💾 Save Coins
          </button>
          <button 
            className="create-coin-sample-btn"
            onClick={onCreateSampleCoinDataFile}
            title="Create a sample coins_earned.json file"
          >
            📝 Create Coin Sample
          </button>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="welcome-section">
        <h1>Welcome to YouInsta</h1>
        <p>Your personalized video learning experience</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3>Study Mode</h3>
            <p>Focus on educational content with intelligent clip generation</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎬</div>
            <h3>Relax Mode</h3>
            <p>Enjoy entertainment content for breaks and relaxation</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3>Memory Tracking</h3>
            <p>Track your progress and memorize important clips</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🪙</div>
            <h3>Reward System</h3>
            <p>Earn coins for completing clips and answering quizzes</p>
          </div>
        </div>
      </div>

      {/* Quick Start Button */}
      <div className="quick-start-section">
        <button 
          className="start-button"
          onClick={onStartApp}
          disabled={!canStartApp}
        >
          🚀 Start Scrolling Experience
        </button>
        {!canStartApp && (
          <p className="start-hint">
            Upload some videos first to get started!
          </p>
        )}
      </div>
    </div>
  );
};

export default HomePage; 