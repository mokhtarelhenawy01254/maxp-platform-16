import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, MessageSquare, TrendingUp } from 'lucide-react';

const PostsManagement = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Mock data for demonstration - replace with actual API calls
  const mockPosts = [
    {
      id: '123456789',
      content: 'Sample post content about product tracking...',
      engagement: 45,
      comments: 12,
      shares: 8,
      createdAt: '2026-02-18T10:30:00Z'
    }
  ];

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setPosts(mockPosts);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading posts:', error);
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      // Simulate update API call
      setTimeout(() => {
        loadPosts();
        setIsUpdating(false);
      }, 1500);
    } catch (error) {
      console.error('Error updating posts:', error);
      setIsUpdating(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.id.includes(searchTerm) || 
    post.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="posts-management">
      {/* Header */}
      <div className="header-section">
        <div className="title-section">
          <MessageSquare className="header-icon" size={32} />
          <div>
            <h1 className="main-title">{t('posts.management.title')}</h1>
            <p className="subtitle">{t('posts.management.subtitle')}</p>
          </div>
        </div>
        
        <button 
          onClick={handleUpdate}
          disabled={isUpdating}
          className="update-button"
        >
          <RefreshCw className={`icon ${isUpdating ? 'spinning' : ''}`} size={16} />
          {t('posts.update.button')}
        </button>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder={t('posts.search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Posts Content */}
      <div className="posts-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>{t('common.loading')}</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <MessageSquare size={64} />
            </div>
            <p className="empty-message">{t('posts.empty.message')}</p>
          </div>
        ) : (
          <div className="posts-grid">
            {filteredPosts.map(post => (
              <div key={post.id} className="post-card">
                <div className="post-header">
                  <span className="post-id">ID: {post.id}</span>
                  <div className="post-engagement">
                    <TrendingUp size={16} />
                    <span>{post.engagement}</span>
                  </div>
                </div>
                <div className="post-content">
                  <p>{post.content}</p>
                </div>
                <div className="post-stats">
                  <div className="stat">
                    <MessageSquare size={14} />
                    <span>{post.comments}</span>
                  </div>
                  <div className="stat">
                    <span>{post.shares} shares</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostsManagement;
