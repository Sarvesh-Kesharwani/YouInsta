import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './HomePage.css';

interface WatchTimeData {
  totalMinutes: number;
  date: string;
  history: {
    date: string;
    minutes: number;
  }[];
}

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
  watchTimeData: WatchTimeData;
  onLoadWatchTimeDataFromFile: () => void;
  onSaveWatchTimeDataToFile: () => void;
  onCreateSampleWatchTimeDataFile: () => void;
  onStartApp: () => void;
  canStartApp: boolean;
  watchingProgress: {
    minutesWatchedToday: number;
    totalMinutesAvailable: number;
    progressPercentage: number;
  };
}

const HomePage: React.FC<HomePageProps> = ({
  coinData,
  onLoadCoinDataFromFile,
  onSaveCoinDataToFile,
  onCreateSampleCoinDataFile,
  watchTimeData,
  onLoadWatchTimeDataFromFile,
  onSaveWatchTimeDataToFile,
  onCreateSampleWatchTimeDataFile,
  onStartApp,
  canStartApp,
  watchingProgress
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
        
        {/* Coin Earnings Chart */}
        <div className="coin-chart-container">
          <h3>📈 Daily Coin Earnings</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={coinData.history.slice(-7)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255, 255, 255, 0.7)"
                fontSize={12}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis 
                stroke="rgba(255, 255, 255, 0.7)"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white'
                }}
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                }}
              />
              <Line 
                type="monotone" 
                dataKey="coins" 
                stroke="#4ade80" 
                strokeWidth={3}
                dot={{ fill: '#4ade80', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#4ade80', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
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

      {/* Watch Time Display */}
      <div className="home-watch-time-display">
        <div className="watch-time-info">
          <div className="watch-time-count">
            ⏱️ {watchTimeData.totalMinutes.toFixed(1)} Study Minutes Total
          </div>
          <div className="watch-time-today">
            Today: {watchTimeData.history.find(entry => entry.date === new Date().toDateString())?.minutes.toFixed(1) || '0'} min
          </div>
        </div>
        <div className="watch-time-history">
          {watchTimeData.history.slice(-3).map((entry, index) => (
            <div key={index} className="history-entry">
              {entry.date}: {entry.minutes.toFixed(1)} min
            </div>
          ))}
        </div>
        
        {/* Watch Time Chart */}
        <div className="watch-time-chart-container">
          <h3>📊 Daily Study Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={watchTimeData.history.slice(-7)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255, 255, 255, 0.7)"
                fontSize={12}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis 
                stroke="rgba(255, 255, 255, 0.7)"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white'
                }}
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                }}
              />
              <Line 
                type="monotone" 
                dataKey="minutes" 
                stroke="#60a5fa" 
                strokeWidth={3}
                dot={{ fill: '#60a5fa', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#60a5fa', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Watch Time Management Buttons */}
        <div className="watch-time-file-buttons">
          <button 
            className="load-watch-time-btn"
            onClick={onLoadWatchTimeDataFromFile}
            title="Load watch time data from file"
          >
            ⏱️ Load Watch Time
          </button>
          <button 
            className="save-watch-time-btn"
            onClick={onSaveWatchTimeDataToFile}
            title="Save watch time data to file"
          >
            💾 Save Watch Time
          </button>
          <button 
            className="create-watch-time-sample-btn"
            onClick={onCreateSampleWatchTimeDataFile}
            title="Create a sample watch_time.json file"
          >
            📝 Create Watch Time Sample
          </button>
        </div>
      </div>

      {/* Daily Watching Progress */}
      <div className="watching-progress-section">
        <h3>📊 Daily Study Progress</h3>
        <div className="progress-info">
          <div className="progress-stats">
            <div className="progress-stat">
              <span className="stat-label">Study Time Today:</span>
              <span className="stat-value">{watchingProgress.minutesWatchedToday} min</span>
            </div>
            <div className="progress-stat">
              <span className="stat-label">Total Study Content:</span>
              <span className="stat-value">{watchingProgress.totalMinutesAvailable} min</span>
            </div>
            <div className="progress-stat">
              <span className="stat-label">Progress:</span>
              <span className="stat-value">{watchingProgress.progressPercentage}%</span>
            </div>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill"
              style={{ width: `${Math.min(watchingProgress.progressPercentage, 100)}%` }}
            ></div>
          </div>
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