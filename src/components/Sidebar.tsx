import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'upload', label: 'Upload', icon: '📤' },
    { id: 'config', label: 'Config', icon: '⚙️' },
    { id: 'clips', label: 'Clips', icon: '📋' },
    { id: 'video-feed', label: 'Video Feed', icon: '🎬' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Instalearn</h2>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onPageChange(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar; 